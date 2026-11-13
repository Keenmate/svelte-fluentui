<script lang="ts">
	import PositioningRegion from "./PositioningRegion.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {AsyncSearch} from "../helpers/async-search.svelte.js"
	import {containsText, startsWithText} from "../helpers/text.js"

	import type {
		QuickGridEditorType as EditorType,
		QuickGridEditorOption as EditorOption,
		GridCellEditorOptions as EditorOptions
	} from "./QuickGrid.types.js"

	type Props = {
		type: EditorType
		value: unknown
		options?: EditorOptions
		/** Commits the edited value. */
		onCommit: (ctx: {value: unknown}) => void
		/** Abandons the edit. */
		onCancel: () => void
		skipBlurCommit?: boolean
		skipKeyboardCommit?: boolean
		initialSearchQuery?: string
	}

	let {
		type = "text",
		value,
		options = {},
		onCommit,
		onCancel,
		skipBlurCommit = false,
		skipKeyboardCommit = false,
		initialSearchQuery = ""
	}: Props = $props()

	// Internal state
	// svelte-ignore state_referenced_locally
	let internalValue = $state(value)

	// Sync value prop to internalValue when it changes (for always-editable checkboxes)
	// Only for checkbox type to avoid interfering with other editor types
	$effect(() => {
		if (type === "checkbox") {
			internalValue = value
		}
	})

	let editorElement: HTMLElement | undefined = $state()
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

	// Filtered options for combobox (filters based on filterText only when user is actively typing)
	let filteredOptions = $derived(() => {
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
		return type === "combobox" ? filteredOptions() : dropdownOptions
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
			const initialOpts = options.initialOptions || options.options || []
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
			return options.emptyLabel || "-- Select --"
		}
		const selectedOption = effectiveOptions.find(opt => getOptionValue(opt) === internalValue)
		return selectedOption ? getOptionLabel(selectedOption) : String(internalValue)
	}

	// Open dropdown and initialize options
	function openDropdown() {
		if (dropdownOpen) return
		dropdownOpen = true
		nav.reset()

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
			const initialOpts = options.initialOptions || options.options || []
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
		justSelected = true  // Prevent dropdown from reopening on refocus
		closeDropdown()
		onCommit({value: newValue})
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
					internalValue = filterText.trim()
					closeDropdown()
					onCommit({value: filterText.trim()})
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

	// Focus the editor when mounted
	$effect(() => {
		if (editorElement) {
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

	// Handle initialSearchQuery for dropdown types
	$effect(() => {
		if (initialSearchQuery && initialSearchQuery.length > 0) {
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
				dropdownOpen = true
				dropdownOptions = [] // Start empty - no flash of initial options
				nav.reset()
				search.schedule(initialSearchQuery)
			}
		}
	})

	// Handle dropdown-open loading for select
	async function handleDropdownFocus() {
		if (
			options.loadOptions &&
			options.optionsLoadTrigger === "dropdown-open" &&
			!hasLoadedOnDropdown
		) {
			isLoadingOptions = true
			try {
				loadedOptions = await options.loadOptions()
				hasLoadedOnDropdown = true
			} catch (error) {
				console.error("Failed to load options:", error)
			} finally {
				isLoadingOptions = false
			}
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
	// cancels the edit instead of closing the dialog.
	$effect(() => pushLayer({
		onEscape: () => {
			if (skipKeyboardCommit) return false
			if (dropdownOpen) {
				closeDropdown()
			} else {
				cancelledViaEscape = true
				onCancel()
			}
		}
	}))

	function handleBlur(e: FocusEvent) {
		if (skipBlurCommit || cancelledViaEscape) {
			return
		}

		const relatedTarget = e.relatedTarget as HTMLElement
		if (editorElement && !editorElement.contains(relatedTarget)) {
			commit()
		}
	}

	function commit() {
		let finalValue = internalValue

		// Apply decimal places for number
		if (type === "number" && options.decimalPlaces !== undefined && typeof finalValue === "number") {
			finalValue = Number(finalValue.toFixed(options.decimalPlaces))
		}

		if (finalValue !== value) {
			onCommit({value: finalValue})
		} else {
			onCancel()
		}
	}

	function handleCheckboxChange() {
		const trueVal = options.trueValue ?? true
		const falseVal = options.falseValue ?? false
		const currentIsTrue = internalValue === trueVal || internalValue === true
		internalValue = currentIsTrue ? falseVal : trueVal
		onCommit({value: internalValue})
	}

	function handleDateChange(e: Event) {
		const input = e.target as HTMLInputElement
		const dateStr = input.value

		if (!dateStr) {
			internalValue = null
			onCommit({value: null})
			return
		}

		const date = new Date(dateStr)
		const outputFormat = options.outputFormat || "date"

		switch (outputFormat) {
			case "iso":
				internalValue = date.toISOString()
				break
			case "timestamp":
				internalValue = date.getTime()
				break
			case "date":
			default:
				internalValue = date
				break
		}
		onCommit({value: internalValue})
	}

	// Format date value for input
	function formatDateValue(val: unknown): string {
		if (!val) return ""
		if (val instanceof Date) {
			return val.toISOString().split('T')[0]
		}
		if (typeof val === "number") {
			return new Date(val).toISOString().split('T')[0]
		}
		if (typeof val === "string") {
			// Try parsing as date
			const date = new Date(val)
			if (!isNaN(date.getTime())) {
				return date.toISOString().split('T')[0]
			}
		}
		return String(val)
	}

	// Format min/max date for input
	function formatConstraintDate(val: Date | string | undefined): string | undefined {
		if (!val) return undefined
		if (val instanceof Date) {
			return val.toISOString().split('T')[0]
		}
		return val
	}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={editorElement}
	class="grid-cell-editor"
	onkeydown={handleKeyDown}
	onfocusout={handleBlur}
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
				placeholder={options.placeholder || "Select..."}
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
			value={formatDateValue(internalValue)}
			min={formatConstraintDate(options.minDate)}
			max={formatConstraintDate(options.maxDate)}
			onchange={handleDateChange}
		/>
	{:else if type === "autocomplete"}
		<div class="cell-autocomplete-wrapper">
			<input
				bind:this={inputElement}
				type="text"
				class="cell-autocomplete-input"
				value={filterText}
				placeholder={options.placeholder || "Type to search..."}
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
					{@const opts = filteredOptions()}
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
						<div class="cell-dropdown-empty">No matching options</div>
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
							onclick={() => { internalValue = null; closeDropdown(); onCommit({value: null}); }}
						>
							{options.emptyLabel || "-- Select --"}
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
							{search.loading ? "Searching..." : "No options"}
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
		background: var(--neutral-layer-1, #ffffff);
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
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
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
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

	/* Dark mode */
	:global([data-theme="dark"]) .cell-input,
	:global([data-theme="dark"]) .cell-select-trigger,
	:global([data-theme="dark"]) .cell-combobox-input,
	:global([data-theme="dark"]) .cell-autocomplete-input {
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) .cell-input::placeholder,
	:global([data-theme="dark"]) .cell-autocomplete-input::placeholder {
		color: var(--neutral-foreground-hint, #a0a0a0);
	}

	:global([data-theme="dark"]) .cell-dropdown {
		background: var(--neutral-layer-1, #2d2d2d);
		border-color: var(--neutral-stroke-rest, #404040);
	}

	:global([data-theme="dark"]) .cell-dropdown-option {
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) .cell-dropdown-option:hover,
	:global([data-theme="dark"]) .cell-dropdown-option.highlighted {
		background: var(--neutral-fill-secondary-hover, #3d3d3d);
	}

	:global([data-theme="dark"]) .cell-dropdown-empty {
		color: var(--neutral-foreground-hint, #a0a0a0);
	}
</style>
