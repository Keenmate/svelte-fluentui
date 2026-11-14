<script lang="ts">
	import {untrack} from "svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {AsyncSearch} from "../helpers/async-search.svelte.js"
	import {containsText, startsWithText} from "../helpers/text.js"
	import {parseLocalDate, toLocalDateString} from "../helpers/date.js"
	import {defaultQuickGridLabels} from "./quickgrid/labels.js"

	import type {
		QuickGridEditorType as EditorType,
		QuickGridEditorOption as EditorOption,
		GridCellEditorOptions as EditorOptions,
		QuickGridLabels
	} from "./QuickGrid.types.js"

	type EditorLabels = Pick<QuickGridLabels, "editorEmptyOption" | "editorSelectPlaceholder" | "editorSearchPlaceholder" |
		"editorLoading" | "editorSearching" | "editorNoOptions" | "editorNoMatches">

	type Props = {
		type: EditorType
		value: unknown
		options?: EditorOptions
		/** Commits the edited value; may return the (validation) promise. */
		onCommit: (ctx: {value: unknown}) => void | Promise<void>
		/** Abandons the edit. */
		onCancel: () => void
		skipBlurCommit?: boolean
		skipKeyboardCommit?: boolean
		initialSearchQuery?: string
		/** Focus the editor on mount (an edit the user just started). Off for "always" editors. */
		autofocus?: boolean
		/** What the cell shows for `value` — the autocomplete text when no option has the value. */
		displayText?: string
		/** Dropdown strings (QuickGrid passes its resolved `labels`). */
		labels?: EditorLabels
	}

	let {
		type = "text",
		value,
		options = {},
		onCommit,
		onCancel,
		skipBlurCommit = false,
		skipKeyboardCommit = false,
		initialSearchQuery = "",
		autofocus = false,
		displayText = undefined,
		labels = defaultQuickGridLabels
	}: Props = $props()

	// Internal state
	// svelte-ignore state_referenced_locally
	let internalValue = $state(value)

	let editorElement: HTMLElement | undefined = $state()

	// Follow the `value` prop while the user isn't in the editor ("always" editors live as
	// long as their cell: the consumer's updates, a transformed commit or a discarded draft
	// must show, and a later blur must not commit the stale text back). While focused, the
	// user's typing wins. Checkboxes always follow (one click = one commit).
	$effect(() => {
		const next = value
		untrack(() => {
			if (type === "checkbox" || !editorElement?.contains(document.activeElement)) {
				internalValue = next
				if (type === "autocomplete") filterText = labelFor(next)
			}
		})
	})
	// Set when Escape fires so the cascading blur (Esc removes focus from <input>
	// in most browsers) doesn't sneak in a commit of whatever was in the field.
	// Without this, clearing a number field then pressing Esc commits null instead
	// of canceling — the row gets mutated and onrowchange fires with the cleared value.
	let cancelledViaEscape = false
	let loadedOptions = $state<EditorOption[]>([])
	let isLoadingOptions = $state(false)
	let hasLoadedOnDropdown = $state(false)

	// Get the parent TD cell for dropdown positioning (to match cell width, not input width)
	let cellElement = $derived(editorElement?.closest('td') as HTMLElement | undefined)

	// Dropdown state (shared by select/combobox/autocomplete)
	let dropdownOpen = $state(false)
	let dropdownOptions = $state<EditorOption[]>([])
	let filterText = $state("")
	let isUserFiltering = $state(false)  // True when user is actively typing to filter (vs displaying selected value)
	let autocompleteTyped = false  // the autocomplete input holds text the user typed (not a picked label)
	let justSelected = $state(false)  // True briefly after selection to prevent dropdown reopening on refocus
	let inputElement: HTMLInputElement | undefined = $state()
	let dropdownElement: HTMLDivElement | undefined = $state()

	// Block page scroll when dropdown is open
	$effect(() => {
		if (!dropdownOpen) return

		function handleWheel(e: WheelEvent) {
			// Allow scroll inside dropdown, block elsewhere
			if (dropdownElement && dropdownElement.contains(e.target as Node)) {
				// Check if dropdown can scroll in the wheel direction
				const { scrollTop, scrollHeight, clientHeight } = dropdownElement
				const atTop = scrollTop === 0
				const atBottom = scrollTop + clientHeight >= scrollHeight

				if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
					e.preventDefault() // Block scroll at boundaries
				}
				// Otherwise allow scroll inside dropdown
			} else {
				e.preventDefault() // Block all scroll outside dropdown
			}
		}

		document.addEventListener('wheel', handleWheel, { passive: false })
		return () => document.removeEventListener('wheel', handleWheel)
	})

	// Helper functions for valueMember/displayMember
	function getOptionValue(option: EditorOption): unknown {
		const member = options.valueMember || "value"
		return option[member] ?? option.value
	}

	function getOptionLabel(option: EditorOption): string {
		const member = options.displayMember || "label"
		return String(option[member] ?? option.label)
	}

	// Get effective options (static or loaded)
	let effectiveOptions = $derived(loadedOptions.length > 0 ? loadedOptions : (options.options || []))
	// What autocomplete lists before the user searches
	const autocompleteInitialOptions = () => options.initialOptions || effectiveOptions

	// The text for a value: its option's label, else what the cell shows (e.g. a value that
	// came from searchCallback), else the value itself.
	function labelFor(v: unknown): string {
		if (v === null || v === undefined) return ""
		const option = [...effectiveOptions, ...(options.initialOptions || [])].find(opt => getOptionValue(opt) === v)
		if (option) return getOptionLabel(option)
		return v === value && displayText !== undefined ? displayText : String(v)
	}
	// svelte-ignore state_referenced_locally
	if (type === "autocomplete") filterText = labelFor(value)

	// Filtered options for combobox (filters based on filterText only when user is actively typing)
	let filteredOptions = $derived.by(() => {
		// Only filter when user is actively typing, not when displaying selected value
		if (!isUserFiltering || !filterText.trim()) {
			return effectiveOptions
		}
		return effectiveOptions.filter(opt =>
			containsText(getOptionLabel(opt), filterText, options.searchBehavior)
		)
	})

	// Rows the keyboard cursor walks: the filtered list for combobox, else the dropdown list.
	function navigableOptions(): EditorOption[] {
		return type === "combobox" ? filteredOptions : dropdownOptions
	}

	// Keyboard cursor; `-1` = none (for select with allowEmpty, the empty row).
	const nav = new ListNav({
		count: () => navigableOptions().length,
		itemAt: () => dropdownElement?.querySelector(".cell-dropdown-option.highlighted")
	})

	// Autocomplete search: below minSearchLength the initial options, without
	// `onSearch` a local filter, else the async `onSearch` (debounced, aborted
	// when superseded or the dropdown closes; stale responses dropped).
	const search = new AsyncSearch<EditorOption>({
		delay: () => options.debounceMs ?? 300,
		search: (query, signal) => {
			const initialOpts = autocompleteInitialOptions()
			if (query.length < (options.minSearchLength ?? 1)) return initialOpts
			if (!options.onSearch) {
				return initialOpts.filter(opt => containsText(getOptionLabel(opt), query, options.searchBehavior))
			}
			return options.onSearch(query, signal)
		},
		onResults: results => {
			dropdownOptions = results
			nav.first()
		},
		onError: error => {
			console.error("Autocomplete search failed:", error)
			dropdownOptions = []
			nav.reset()
		}
	})

	$effect(() => () => search.cancel())

	// Get display value for current selection (for select trigger)
	function getCurrentDisplayValue(): string {
		if (internalValue === null || internalValue === undefined) {
			return options.emptyLabel || labels.editorEmptyOption
		}
		const selectedOption = effectiveOptions.find(opt => getOptionValue(opt) === internalValue)
		return selectedOption ? getOptionLabel(selectedOption) : String(internalValue)
	}

	// Open dropdown and initialize options
	function openDropdown() {
		if (dropdownOpen) return
		dropdownOpen = true
		nav.reset()
		void loadOnOpen()
		showOptions()
	}

	// Fill the open list (on open, and again when "dropdown-open" options arrive).
	function showOptions() {
		if (type === "select" || type === "combobox") {
			dropdownOptions = effectiveOptions
			// Pre-select current value
			const currentIdx = effectiveOptions.findIndex(opt => getOptionValue(opt) === internalValue)
			if (currentIdx >= 0) {
				nav.index = currentIdx
				// For combobox, initialize filter text with current display value
				if (type === "combobox" && !filterText) {
					filterText = getOptionLabel(effectiveOptions[currentIdx])
				}
			}
		} else if (type === "autocomplete") {
			// For autocomplete, show initial options if available
			const initialOpts = autocompleteInitialOptions()
			dropdownOptions = initialOpts
			// Initialize filter text with current display value if exists
			if (!filterText && internalValue !== null && internalValue !== undefined) {
				const currentOpt = initialOpts.find(opt => getOptionValue(opt) === internalValue)
				if (currentOpt) {
					filterText = getOptionLabel(currentOpt)
				}
			}
		}
	}

	// Close dropdown
	function closeDropdown() {
		dropdownOpen = false
		nav.reset()
		// Drop a pending debounce and abort any in-flight search
		search.cancel()
	}

	// Select an option from dropdown
	function selectDropdownOption(option: EditorOption) {
		const newValue = getOptionValue(option)
		internalValue = newValue
		filterText = getOptionLabel(option)
		isUserFiltering = false  // Not filtering, just displaying selected value
		autocompleteTyped = false
		justSelected = true  // Prevent dropdown from reopening on refocus
		closeDropdown()
		commitValue(newValue)
	}

	// Handle keyboard navigation in dropdown
	function handleDropdownKeyDown(e: KeyboardEvent) {
		const opts = navigableOptions()

		switch (e.key) {
			case "ArrowDown":
				if (!dropdownOpen) {
					// Let it bubble to QuickGrid for cell navigation
					return
				}
				e.preventDefault()
				e.stopPropagation() // Prevent grid from handling
				nav.move(1)
				break
			case "ArrowUp":
				if (!dropdownOpen) {
					// Let it bubble to QuickGrid for cell navigation
					return
				}
				e.preventDefault()
				e.stopPropagation() // Prevent grid from handling
				nav.move(-1)
				break
			case "Enter":
				e.preventDefault()
				e.stopPropagation() // Prevent grid from handling
				if (!dropdownOpen) {
					// Open dropdown when Enter pressed and dropdown is closed
					openDropdown()
				} else if (opts[nav.index]) {
					selectDropdownOption(opts[nav.index])
				} else if (type === "autocomplete" && filterText.trim()) {
					// Autocomplete can commit freeform text
					void commitTypedText()
				}
				break
			case "Tab":
				if (dropdownOpen && opts[nav.index]) {
					selectDropdownOption(opts[nav.index])
				}
				// Let Tab propagate for navigation
				break
			case " ":
				// Space opens dropdown (like native select)
				if (type === "select" && !dropdownOpen) {
					e.preventDefault()
					e.stopPropagation()
					openDropdown()
				}
				break
		}
	}

	// === SELECT HANDLERS ===
	function handleSelectTriggerClick() {
		if (dropdownOpen) {
			closeDropdown()
		} else {
			openDropdown()
		}
	}

	function handleSelectTriggerKeyDown(e: KeyboardEvent) {
		// Letter jumping for select
		if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
			const startIdx = nav.index + 1
			const opts = effectiveOptions

			// Search from current position
			for (let i = 0; i < opts.length; i++) {
				const idx = (startIdx + i) % opts.length
				if (startsWithText(getOptionLabel(opts[idx]), e.key, options.searchBehavior)) {
					// Open first: openDropdown() re-highlights the current value.
					if (!dropdownOpen) {
						openDropdown()
					}
					nav.set(idx)
					break
				}
			}
			return
		}

		handleDropdownKeyDown(e)
	}

	// === COMBOBOX HANDLERS ===
	function handleComboboxInput(e: Event) {
		const input = e.target as HTMLInputElement
		filterText = input.value
		isUserFiltering = true  // User is actively typing/filtering
		if (!dropdownOpen) {
			openDropdown()
		}
		// Reset highlight when filtering
		nav.first()
	}

	function handleComboboxKeyDown(e: KeyboardEvent) {
		handleDropdownKeyDown(e)
	}

	function handleComboboxFocus() {
		// Don't reopen dropdown if we just selected a value (prevents immediate reopen after Enter)
		if (justSelected) {
			justSelected = false
			return
		}
		isUserFiltering = false  // Reset filtering on focus to show all options
		openDropdown()
	}

	// === AUTOCOMPLETE HANDLERS ===
	function handleAutocompleteInput(e: Event) {
		const input = e.target as HTMLInputElement
		filterText = input.value
		autocompleteTyped = true

		if (!dropdownOpen) {
			// Open dropdown but don't show initial options when user is typing
			dropdownOpen = true
			dropdownOptions = [] // Start empty to avoid FOAC
			nav.reset()
		}

		search.schedule(filterText)
	}

	function handleAutocompleteKeyDown(e: KeyboardEvent) {
		handleDropdownKeyDown(e)
	}

	function handleAutocompleteFocus() {
		// Don't reopen dropdown if we just selected a value (prevents immediate reopen after Enter)
		if (justSelected) {
			justSelected = false
			return
		}
		if (!dropdownOpen) {
			openDropdown()
		}
	}

	// Focus the editor when mounted — only an edit the user just started, never "always"
	// editors (each would steal focus on load / page / sort, the last one winning).
	$effect(() => {
		if (editorElement && autofocus) {
			const input = editorElement.querySelector('input, select, textarea') as HTMLElement
			if (input) {
				input.focus({ preventScroll: true })
				// Select all text for text/number inputs
				if (input instanceof HTMLInputElement && (type === "text" || type === "number")) {
					input.select()
				}
			} else {
				// For select trigger div, focus it directly
				const trigger = editorElement.querySelector('.cell-select-trigger') as HTMLElement
				if (trigger) {
					trigger.focus({ preventScroll: true })
				} else {
					(editorElement as HTMLElement).focus?.({ preventScroll: true })
				}
			}
		}
	})

	// Handle initialSearchQuery for dropdown types — once per edit: untracked, or closing the
	// dropdown (dropdownOpen / filterText change) would re-run this and reopen it.
	$effect(() => {
		const query = initialSearchQuery
		if (query) untrack(() => {
			if (type === "select") {
				// Jump to option starting with the letter
				const idx = effectiveOptions.findIndex(opt =>
					startsWithText(getOptionLabel(opt), initialSearchQuery, options.searchBehavior)
				)
				if (idx >= 0) {
					// Open first: openDropdown() re-highlights the current value.
					openDropdown()
					nav.set(idx)
				}
			} else if (type === "combobox") {
				// Open and filter with typed text
				filterText = initialSearchQuery
				openDropdown()
				nav.first()
			} else if (type === "autocomplete") {
				// Open with empty options and start debounced search
				// Don't show initial options when user started typing
				filterText = initialSearchQuery
				autocompleteTyped = true
				dropdownOpen = true
				dropdownOptions = [] // Start empty - no flash of initial options
				nav.reset()
				search.schedule(initialSearchQuery)
			}
		})
	})

	// optionsLoadTrigger "dropdown-open": load once per edit, when the list first opens
	async function loadOnOpen() {
		if (
			!options.loadOptions ||
			options.optionsLoadTrigger !== "dropdown-open" ||
			hasLoadedOnDropdown ||
			isLoadingOptions
		) return
		isLoadingOptions = true
		try {
			loadedOptions = await options.loadOptions()
			hasLoadedOnDropdown = true
			// Refresh the open list (autocomplete only while it lists its initial options)
			if (dropdownOpen && (type !== "autocomplete" || !autocompleteTyped)) showOptions()
		} catch (error) {
			console.error("Failed to load options:", error)
		} finally {
			isLoadingOptions = false
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (skipKeyboardCommit) {
			return
		}

		if (e.key === "Enter") {
			e.preventDefault()
			commit()
		}
	}

	// Escape goes to the topmost open layer (helpers/layer-stack.ts): the open
	// dropdown first, then the edit itself — so an editor inside a Dialog
	// cancels the edit instead of closing the dialog. Only while the editor is in use
	// (focused or its dropdown open): "always" editors live for the page, and an idle
	// one must not take Escape from everything else.
	let hasFocus = $state(false)
	$effect(() => {
		if (!hasFocus && !dropdownOpen) return
		return pushLayer({
			onEscape: () => {
				if (skipKeyboardCommit) return false
				if (dropdownOpen) {
					closeDropdown()
				} else {
					cancelledViaEscape = true
					// "always" editors stay mounted: show the value again
					internalValue = value
					if (type === "autocomplete") filterText = labelFor(value)
					autocompleteTyped = false
					onCancel()
				}
			}
		})
	})

	// One commit per edit. A dropdown pick commits at once, but QuickGrid's commit is async
	// (validation), so the editor is still mounted when focus returns to the cell — without
	// this its blur would commit the same value a second time. The checkbox is exempt:
	// with checkboxAlwaysEditable one editor instance takes many toggles.
	let hasCommitted = false
	let lastCommit: Promise<void> | void = undefined
	function commitValue(newValue: unknown): Promise<void> | void {
		if (hasCommitted) return lastCommit
		if (type !== "checkbox") hasCommitted = true
		lastCommit = onCommit({value: newValue})
		return lastCommit
	}

	// Focus coming in from outside starts a new edit: "always" cells keep one editor
	// instance for life, so the one-commit guard must re-arm here, not only on mount.
	function handleFocusIn(e: FocusEvent) {
		hasFocus = true
		if (!editorElement?.contains(e.relatedTarget as Node | null)) {
			hasCommitted = false
			lastCommit = undefined
			cancelledViaEscape = false
		}
	}

	function handleBlur(e: FocusEvent) {
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!editorElement?.contains(relatedTarget)) hasFocus = false
		if (hasCommitted || skipBlurCommit || cancelledViaEscape) {
			return
		}

		if (editorElement && !editorElement.contains(relatedTarget)) {
			commit()
		}
	}

	// Number input → number | null: empty / unparsable → null, decimalPlaces applied.
	function parseNumber(v: unknown): number | null {
		if (v === null || v === undefined || v === "") return null
		const n = typeof v === "number" ? v : Number(v)
		if (!Number.isFinite(n)) return null
		return options.decimalPlaces !== undefined ? Number(n.toFixed(options.decimalPlaces)) : n
	}

	function isUnchanged(next: unknown): boolean {
		if (next === value) return true
		if ((next === null || next === undefined) && (value === null || value === undefined || value === "")) return true
		// Dates compare by calendar day (a Date and its "yyyy-mm-dd" are the same value)
		return type === "date" && next !== null && toLocalDateString(next) === toLocalDateString(value)
	}

	/**
	 * Commits what the editor holds — the one commit path for blur, Enter and QuickGrid's
	 * Tab / arrow keys. An unchanged value cancels instead. Resolves when the grid's commit
	 * (validation) settles.
	 */
	export async function commit(): Promise<void> {
		if (hasCommitted) return lastCommit
		// A checkbox commits on every toggle; nothing is pending
		if (type === "checkbox") {
			if (lastCommit === undefined) onCancel()
			return lastCommit
		}
		if (type === "autocomplete" && autocompleteTyped) return commitTypedText()
		const finalValue = type === "number" ? parseNumber(internalValue) : internalValue
		if (isUnchanged(finalValue)) onCancel()
		else return commitValue(finalValue)
	}

	// Autocomplete free text: the option whose label it is, else the text itself (empty → null).
	function commitTypedText(): Promise<void> | void {
		const text = filterText.trim()
		const match = dropdownOptions.find(opt => getOptionLabel(opt) === text)
		const next = text === "" ? null : match ? getOptionValue(match) : text
		autocompleteTyped = false
		closeDropdown()
		if (isUnchanged(next)) {
			filterText = labelFor(value)
			return onCancel()
		}
		internalValue = next
		return commitValue(next)
	}

	function handleCheckboxChange() {
		const trueVal = options.trueValue ?? true
		const falseVal = options.falseValue ?? false
		const currentIsTrue = internalValue === trueVal || internalValue === true
		internalValue = currentIsTrue ? falseVal : trueVal
		commitValue(internalValue)
	}

	// Typing in a date input fires `change` per completed segment (year 0002 → 0020 → 0202 →
	// 2024), so typed dates wait for Enter / Tab / blur; a picker pick commits at once.
	let dateKeyDown = false

	function handleDateChange(e: Event) {
		const date = parseLocalDate((e.target as HTMLInputElement).value)
		if (!date) internalValue = null
		else if (options.outputFormat === "iso") internalValue = date.toISOString()
		else if (options.outputFormat === "timestamp") internalValue = date.getTime()
		else internalValue = date
		if (!dateKeyDown) void commit()
	}

	// min/max as the input's local "yyyy-mm-dd"
	function formatConstraintDate(val: Date | string | undefined): string | undefined {
		return toLocalDateString(val) || undefined
	}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={editorElement}
	class="grid-cell-editor"
	onkeydown={handleKeyDown}
	onfocusin={handleFocusIn}
	onfocusout={handleBlur}
	oninput={() => (cancelledViaEscape = false)}
>
	{#if type === "text"}
		<input
			type="text"
			class="cell-input"
			bind:value={internalValue}
			maxlength={options.maxLength}
			placeholder={options.placeholder}
			pattern={options.pattern}
			inputmode={options.inputMode}
		/>
	{:else if type === "number"}
		<input
			type="number"
			class="cell-input"
			bind:value={internalValue}
			min={options.allowNegative === false ? 0 : options.min}
			max={options.max}
			step={options.step ?? (options.decimalPlaces ? Math.pow(10, -options.decimalPlaces) : undefined)}
			placeholder={options.placeholder}
		/>
	{:else if type === "checkbox"}
		<input
			type="checkbox"
			class="cell-checkbox"
			checked={internalValue === (options.trueValue ?? true) || internalValue === true}
			onchange={handleCheckboxChange}
		/>
	{:else if type === "select"}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_role_has_required_aria_props -->
		<div
			class="cell-select-trigger"
			tabindex="0"
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={dropdownOpen}
			onclick={handleSelectTriggerClick}
			onkeydown={handleSelectTriggerKeyDown}
		>
			<span class="cell-select-value">{getCurrentDisplayValue()}</span>
			<span class="cell-select-arrow">▼</span>
		</div>
	{:else if type === "combobox"}
		<div class="cell-combobox-wrapper">
			<input
				bind:this={inputElement}
				type="text"
				class="cell-combobox-input"
				value={filterText}
				placeholder={options.placeholder || labels.editorSelectPlaceholder}
				oninput={handleComboboxInput}
				onkeydown={handleComboboxKeyDown}
				onfocus={handleComboboxFocus}
			/>
			<span class="cell-select-arrow">▼</span>
		</div>
	{:else if type === "date"}
		<input
			type="date"
			class="cell-input"
			value={toLocalDateString(internalValue)}
			min={formatConstraintDate(options.minDate)}
			max={formatConstraintDate(options.maxDate)}
			onchange={handleDateChange}
			onkeydown={() => (dateKeyDown = true)}
			onkeyup={() => (dateKeyDown = false)}
			onblur={() => (dateKeyDown = false)}
		/>
	{:else if type === "autocomplete"}
		<div class="cell-autocomplete-wrapper">
			<input
				bind:this={inputElement}
				type="text"
				class="cell-autocomplete-input"
				value={filterText}
				placeholder={options.placeholder || labels.editorSearchPlaceholder}
				oninput={handleAutocompleteInput}
				onkeydown={handleAutocompleteKeyDown}
				onfocus={handleAutocompleteFocus}
			/>
			{#if search.loading}
				<span class="cell-loading-indicator">...</span>
			{/if}
		</div>
	{/if}

	<!-- Dropdown overlay for select/combobox/autocomplete -->
	{#if dropdownOpen && (type === "select" || type === "combobox" || type === "autocomplete")}
		<PositioningRegion anchor={cellElement || editorElement} visible={dropdownOpen} position="bottom">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<div bind:this={dropdownElement} class="cell-dropdown" role="listbox" onmousedown={(e) => e.preventDefault()}>
				{#if type === "combobox"}
					{@const opts = filteredOptions}
					{#each opts as opt, index}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<div
							class="cell-dropdown-option"
							class:highlighted={index === nav.index}
							role="option"
							aria-selected={index === nav.index}
							onclick={() => selectDropdownOption(opt)}
						>
							{getOptionLabel(opt)}
						</div>
					{/each}
					{#if opts.length === 0}
						<div class="cell-dropdown-empty">{isLoadingOptions ? labels.editorLoading : labels.editorNoMatches}</div>
					{/if}
				{:else}
					{#if options.allowEmpty && type === "select"}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<!-- svelte-ignore a11y_role_has_required_aria_props -->
						<div
							class="cell-dropdown-option"
							class:highlighted={nav.index === -1 && (internalValue === null || internalValue === undefined)}
							role="option"
							aria-selected={nav.index === -1 && (internalValue === null || internalValue === undefined)}
							onclick={() => { internalValue = null; closeDropdown(); commitValue(null); }}
						>
							{options.emptyLabel || labels.editorEmptyOption}
						</div>
					{/if}
					{#each dropdownOptions as opt, index}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<div
							class="cell-dropdown-option"
							class:highlighted={index === nav.index}
							role="option"
							aria-selected={index === nav.index}
							onclick={() => selectDropdownOption(opt)}
						>
							{getOptionLabel(opt)}
						</div>
					{/each}
					{#if dropdownOptions.length === 0}
						<div class="cell-dropdown-empty">
							{isLoadingOptions ? labels.editorLoading : search.loading ? labels.editorSearching : labels.editorNoOptions}
						</div>
					{/if}
				{/if}
			</div>
		</PositioningRegion>
	{/if}
</div>

<style>
	.grid-cell-editor {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		position: relative;
	}

	.cell-input {
		width: 100%;
		height: 100%;
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--neutral-foreground-rest, #242424);
		font: inherit;
		line-height: inherit;
		letter-spacing: inherit;
		box-sizing: border-box;
		outline: none;
	}

	.cell-input:focus {
		outline: none;
	}

	.cell-input::placeholder {
		color: var(--neutral-foreground-hint, #707070);
		opacity: 0.7;
	}

	.cell-checkbox {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: var(--accent-fill-rest, #0078d4);
	}

	/* Select trigger */
	.cell-select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		cursor: pointer;
		padding: 0;
		background: transparent;
		color: var(--neutral-foreground-rest, #242424);
		font: inherit;
	}

	.cell-select-trigger:focus {
		outline: none;
	}

	.cell-select-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cell-select-arrow {
		font-size: 10px;
		opacity: 0.6;
		margin-inline-start: 4px;
		flex-shrink: 0;
	}

	/* Combobox wrapper */
	.cell-combobox-wrapper {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.cell-combobox-input {
		width: 100%;
		height: 100%;
		padding: 0;
		padding-inline-end: 16px;
		margin: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--neutral-foreground-rest, #242424);
		font: inherit;
		box-sizing: border-box;
		outline: none;
	}

	.cell-combobox-input:focus {
		outline: none;
	}

	.cell-combobox-wrapper .cell-select-arrow {
		position: absolute;
		inset-inline-end: 0;
	}

	/* Autocomplete wrapper */
	.cell-autocomplete-wrapper {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.cell-autocomplete-input {
		width: 100%;
		height: 100%;
		padding: 0;
		padding-inline-end: 20px;
		margin: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--neutral-foreground-rest, #242424);
		font: inherit;
		box-sizing: border-box;
		outline: none;
	}

	.cell-autocomplete-input:focus {
		outline: none;
	}

	.cell-autocomplete-input::placeholder {
		color: var(--neutral-foreground-hint, #707070);
		opacity: 0.7;
	}

	.cell-loading-indicator {
		position: absolute;
		inset-inline-end: 4px;
		font-size: 10px;
		color: var(--neutral-foreground-hint, #707070);
		animation: pulse 1s infinite;
	}

	/* Dropdown styles */
	.cell-dropdown {
		background: var(--fluent-quickgrid-dropdown-bg, var(--neutral-layer-1, #ffffff));
		border: 1px solid var(--fluent-quickgrid-dropdown-border, var(--neutral-stroke-rest, #d1d1d1));
		border-radius: var(--fluent-border-radius-md);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);
		max-height: 200px;
		overflow-y: auto;
		overscroll-behavior: contain;
		width: 100%;
		box-sizing: border-box;
		z-index: var(--fluent-z-popover, 1060);
	}

	.cell-dropdown-option {
		display: block;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: transparent;
		text-align: start;
		cursor: pointer;
		color: var(--neutral-foreground-rest, #242424);
		font: inherit;
		box-sizing: border-box;
	}

	.cell-dropdown-option:hover,
	.cell-dropdown-option.highlighted {
		background: var(--fluent-quickgrid-dropdown-highlight-bg, var(--neutral-fill-secondary-hover, #f0f0f0));
	}

	.cell-dropdown-empty {
		padding: 8px 12px;
		color: var(--neutral-foreground-hint, #707070);
		font-style: italic;
		text-align: center;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
