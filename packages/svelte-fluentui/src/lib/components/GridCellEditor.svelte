<script lang="ts">
	import {untrack} from "svelte"
	import Select from "./Select.svelte"
	import Combobox from "./Combobox.svelte"
	import Option from "./Option.svelte"
	import OptionGroup from "./OptionGroup.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {AsyncSearch} from "../helpers/async-search.svelte.js"
	import {containsText} from "../helpers/text.js"
	import {groupSegments} from "../helpers/option-groups.js"
	import {optionValue} from "../helpers/option-dom.js"
	import {parseLocalDate, toLocalDateString} from "../helpers/date.js"
	import {useTranslations, type Translate} from "../i18n/translate.svelte.js"
	import {OptionKeys, EMPTY_KEY} from "./quickgrid/option-keys.js"
	import type {OptionItem} from "../types/index.js"
	import type {ComboboxFilter} from "../types/combobox.js"

	import type {
		QuickGridEditorType as EditorType,
		QuickGridEditorOption as EditorOption,
		GridCellEditorOptions as EditorOptions
	} from "./QuickGrid.types.js"

	type Props = {
		type: EditorType
		value: unknown
		options?: EditorOptions
		/** The QuickGrid edit this editor was opened for. Captured at mount and handed back to
		 * `onCommit` / `onCancel`: the grid's own token has moved on by the time a replaced
		 * editor's teardown blur fires. */
		editToken?: number
		/** Commits the edited value; may return the (validation) promise. */
		onCommit: (ctx: {value: unknown; editToken: number | undefined}) => void | Promise<void>
		/** Abandons the edit. */
		onCancel: (ctx: {editToken: number | undefined}) => void
		skipBlurCommit?: boolean
		skipKeyboardCommit?: boolean
		initialSearchQuery?: string
		/** Focus the editor on mount (an edit the user just started). Off for "always" editors. */
		autofocus?: boolean
		/** What the cell shows for `value` — the dropdown text when no option has the value. */
		displayText?: string
		/** Text lookup for the dropdown strings (`svelteFluentUI.quickGrid.editor*` keys); QuickGrid passes its own so its `labels` overrides apply. */
		t?: Translate<"quickGrid">
	}

	let {
		type = "text",
		value,
		options = {},
		editToken = undefined,
		onCommit,
		onCancel,
		skipBlurCommit = false,
		skipKeyboardCommit = false,
		initialSearchQuery = "",
		autofocus = false,
		displayText = undefined,
		t = useTranslations("quickGrid", () => undefined)
	}: Props = $props()

	// Internal state
	// svelte-ignore state_referenced_locally
	let internalValue = $state(value)
	// svelte-ignore state_referenced_locally
	const ownToken = editToken
	const cancel = () => onCancel({editToken: ownToken})

	let editorElement: HTMLElement | undefined = $state()

	// Follow the `value` prop while the user isn't in the editor ("always" editors live as
	// long as their cell: the consumer's updates, a transformed commit or a discarded draft
	// must show, and a later blur must not commit the stale text back). While focused, the
	// user's typing wins. Checkboxes always follow (one click = one commit).
	$effect(() => {
		const next = value
		untrack(() => {
			if (type === "checkbox" || !editorElement?.contains(document.activeElement)) {
				// The autocomplete's free text would outlive the new value: start it afresh
				if (type === "autocomplete" && next !== internalValue) comboGeneration++
				internalValue = next
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
	let hasLoadedOnDropdown = false

	// ===== Dropdown editors: the library's Select (select) and Combobox (combobox, autocomplete) =====
	// Both run `embedded` (borderless, closed-list arrows bubble to the grid) with their list
	// portalled as `.cell-dropdown`; the grid keeps Enter / Tab / Escape semantics (see handleKeyDown).
	const uid = $props.id()
	const controlId = `grid-cell-editor-${uid}`
	const listboxId = `${controlId}-listbox`
	let dropdownOpen = $state(false)
	let comboText = $state("") // the Combobox input's text (bind:currentValue)
	let comboGeneration = $state(0) // remounts the Combobox (drops its free text)
	let autocompleteTyped = false // the autocomplete input holds text the user typed (not a picked label)

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
	let effectiveOptions = $derived(loadedOptions.length > 0 ? loadedOptions : options.options || [])
	// What autocomplete lists before the user searches
	const autocompleteInitialOptions = () => options.initialOptions || effectiveOptions

	// Value ↔ key: the dropdowns work with string values, a cell value may be anything.
	const keys = new OptionKeys()
	// One row per key (first wins), `group` passed through for option groups.
	function keyed(list: readonly EditorOption[]): OptionItem[] {
		const seen = new Set<string>()
		const rows: OptionItem[] = []
		for (const opt of list) {
			const key = keys.keyOf(getOptionValue(opt))
			if (seen.has(key)) continue
			seen.add(key)
			rows.push({value: key, label: getOptionLabel(opt), group: typeof opt.group === "string" ? opt.group : undefined})
		}
		return rows
	}

	// Autocomplete: async results of the latest search; null = the initial options.
	let searchResults = $state<EditorOption[] | null>(null)
	const autocompleteList = $derived(searchResults ?? autocompleteInitialOptions())
	const dropdownOptions = $derived(keyed(type === "autocomplete" ? autocompleteList : effectiveOptions))
	const selectSegments = $derived(type === "select" ? groupSegments(dropdownOptions) : null)
	// "" = nothing selected (the dropdown shows its placeholder)
	const currentKey = $derived(
		internalValue === null || internalValue === undefined
			? type === "select" && options.allowEmpty
				? EMPTY_KEY
				: ""
			: keys.keyOf(internalValue)
	)
	// The text for a value no option has: what the cell shows (e.g. a value that came from
	// searchCallback, or options not loaded yet), else the value itself.
	const valueText = $derived(
		internalValue === null || internalValue === undefined
			? ""
			: internalValue === value && displayText !== undefined
				? displayText
				: String(internalValue)
	)

	// The text for a value: its option's label, else valueText's rule.
	function labelFor(v: unknown): string {
		if (v === null || v === undefined) return ""
		const option = [...autocompleteList, ...effectiveOptions, ...(options.initialOptions || [])].find(
			(opt) => getOptionValue(opt) === v
		)
		if (option) return getOptionLabel(option)
		return v === value && displayText !== undefined ? displayText : String(v)
	}

	// Autocomplete with `searchCallback`: below minSearchLength the initial options, else the
	// async search — Combobox debounces (`searchDelay`), this aborts superseded / closed
	// searches and drops stale responses.
	const search = new AsyncSearch<EditorOption>({
		search: (query, signal) => (options.onSearch ? options.onSearch(query, signal) : []),
		onResults: (results) => (searchResults = results),
		onError: (error) => {
			console.error("Autocomplete search failed:", error)
			searchResults = []
		}
	})

	$effect(() => () => search.cancel())

	function handleAutocompleteSearch({term}: {term: string}) {
		if (term.length < (options.minSearchLength ?? 1)) {
			search.cancel()
			searchResults = [...autocompleteInitialOptions()] // a new array: Combobox re-syncs on every change
		} else {
			search.run(term)
		}
	}

	// Autocomplete without `searchCallback` filters the initial options locally (Combobox's
	// own filter); below minSearchLength everything shows.
	const localFilter: ComboboxFilter | undefined = $derived(
		(options.minSearchLength ?? 1) > 1
			? ({term, option}) =>
					term.length < (options.minSearchLength ?? 1) || containsText(option.label, term, options.searchBehavior)
			: undefined
	)

	// A pick (click, Enter, Space, Tab) commits at once — also when it is the current value.
	function pick(key: string) {
		const next = keys.valueOf(key)
		internalValue = next
		autocompleteTyped = false
		void commitValue(next)
	}

	// Closing the list drops a pending / in-flight search; opening it may load the options.
	$effect(() => {
		if (dropdownOpen) untrack(() => void loadOnOpen())
		else untrack(() => search.cancel())
	})

	// A press in the list keeps focus in the editor (the list is portalled, outside it), so the
	// pick doesn't blur-commit / cancel first and focus never strands in the list.
	$effect(() => {
		if (!dropdownOpen) return
		const keepFocus = (e: MouseEvent) => {
			if (document.getElementById(listboxId)?.contains(e.target as Node)) e.preventDefault()
		}
		document.addEventListener("mousedown", keepFocus, true)
		return () => document.removeEventListener("mousedown", keepFocus, true)
	})

	// Focus the editor when mounted — only an edit the user just started, never "always"
	// editors (each would steal focus on load / page / sort, the last one winning).
	$effect(() => {
		if (editorElement && autofocus) {
			// The input, or the Select's trigger button
			const input = editorElement.querySelector("input, select, textarea, button") as HTMLElement | null
			if (input) {
				input.focus({preventScroll: true})
				// Select all text for text/number inputs
				if (input instanceof HTMLInputElement && (type === "text" || type === "number")) {
					input.select()
				}
			} else {
				editorElement.focus?.({preventScroll: true})
			}
		}
	})

	// The key that started the edit (QuickGrid swallowed it): replay it into the dropdown — a
	// keydown on the Select (type-ahead), typing into the Combobox (filter / search). Once per
	// edit: untracked, or closing the dropdown would re-run this and reopen it.
	$effect(() => {
		const query = initialSearchQuery
		const element = editorElement
		if (query && element)
			untrack(() => {
				if (type === "select") {
					element
						.querySelector("button")
						?.dispatchEvent(new KeyboardEvent("keydown", {key: query, bubbles: true, cancelable: true}))
				} else if (type === "combobox" || type === "autocomplete") {
					// After the focus handler's select-all, or the next key would replace the text
					setTimeout(() => {
						const input = element.querySelector("input")
						if (!input) return
						input.value = query
						input.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: query}))
					})
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
		)
			return
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

	// Select: the highlighted option when Enter / Space hits the open list. Select reports only
	// changes (onChange); picking the current value must still end the edit.
	let keyPick: string | null = null
	function handleKeyDownCapture(e: KeyboardEvent) {
		keyPick = null
		if (type !== "select" || (e.key !== "Enter" && e.key !== " ")) return
		const highlighted = document
			.getElementById(listboxId)
			?.querySelector<HTMLElement>(".fluent-option[data-highlighted]")
		if (highlighted) keyPick = optionValue(highlighted)
	}

	// Grid embedding: a key the dropdown handled (opening, list navigation, a pick — it calls
	// preventDefault) stays here; closed-list arrows, Tab and the rest go on to QuickGrid.
	function handleKeyDown(e: KeyboardEvent) {
		if (keyPick !== null) {
			const key = keyPick
			keyPick = null
			if (!hasCommitted) pick(key)
		}
		if (e.defaultPrevented) {
			// Enter on an autocomplete list with nothing to pick commits the typed text
			if (type === "autocomplete" && e.key === "Enter" && !hasCommitted && autocompleteTyped) void commitTypedText()
			e.stopPropagation()
			return
		}

		if (skipKeyboardCommit) {
			return
		}

		if (e.key === "Enter") {
			e.preventDefault()
			commit()
		}
	}

	// Inside the editor: its own DOM or its (portalled) dropdown list.
	function isInside(node: EventTarget | null): boolean {
		if (!(node instanceof Node)) return false
		return !!editorElement?.contains(node) || !!document.getElementById(listboxId)?.contains(node)
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
					// Normally the dropdown's own (higher) layer gets here first
					dropdownOpen = false
				} else {
					cancelledViaEscape = true
					// "always" editors stay mounted: show the value again
					internalValue = value
					autocompleteTyped = false
					cancel()
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
		lastCommit = onCommit({value: newValue, editToken: ownToken})
		return lastCommit
	}

	// Focus coming in from outside starts a new edit: "always" cells keep one editor
	// instance for life, so the one-commit guard must re-arm here, not only on mount.
	function handleFocusIn(e: FocusEvent) {
		hasFocus = true
		if (!isInside(e.relatedTarget)) {
			hasCommitted = false
			lastCommit = undefined
			cancelledViaEscape = false
		}
	}

	function handleBlur(e: FocusEvent) {
		const inside = isInside(e.relatedTarget)
		if (!inside) hasFocus = false
		if (hasCommitted || skipBlurCommit || cancelledViaEscape) {
			return
		}

		if (editorElement && !inside) {
			commit()
		}
	}

	function handleInput() {
		cancelledViaEscape = false
		if (type === "autocomplete") autocompleteTyped = true
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
			if (lastCommit === undefined) cancel()
			return lastCommit
		}
		if (type === "autocomplete" && autocompleteTyped) return commitTypedText()
		const finalValue = type === "number" ? parseNumber(internalValue) : internalValue
		if (isUnchanged(finalValue)) cancel()
		else return commitValue(finalValue)
	}

	// Autocomplete free text: the option whose label it is, else the text itself (empty → null).
	// The value's own label (also what Escape reverts the input to) is no change.
	function commitTypedText(): Promise<void> | void {
		const text = comboText.trim()
		const match = autocompleteList.find((opt) => getOptionLabel(opt) === text)
		const next = text === "" ? null : match ? getOptionValue(match) : text === labelFor(value) ? value : text
		autocompleteTyped = false
		dropdownOpen = false
		if (isUnchanged(next)) return cancel()
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

{#snippet selectOption(opt: OptionItem)}
	<Option value={opt.value} label={opt.label} onclick={() => pick(opt.value)}>{opt.label}</Option>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={editorElement}
	class="grid-cell-editor {type}"
	onkeydowncapture={handleKeyDownCapture}
	onkeydown={handleKeyDown}
	onfocusin={handleFocusIn}
	onfocusout={handleBlur}
	oninput={handleInput}
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
		<Select
			id={controlId}
			class="cell-select-trigger"
			embedded
			selectValueOnTab
			dropdownClass="cell-dropdown"
			maxDropdownHeight="200px"
			bind:open={dropdownOpen}
			value={currentKey}
			placeholder={options.emptyLabel || t("editorEmptyOption")}
			{valueText}
			searchBehavior={options.searchBehavior}
			onChange={({value: key}) => pick(key as string)}
		>
			{#if options.allowEmpty}
				<Option value={EMPTY_KEY} onclick={() => pick(EMPTY_KEY)}>
					{options.emptyLabel || t("editorEmptyOption")}
				</Option>
			{/if}
			{#if selectSegments}
				{#each selectSegments as segment, i (i)}
					{#if segment.group}
						<OptionGroup label={segment.group}>
							{#each segment.items as opt (opt.value)}{@render selectOption(opt)}{/each}
						</OptionGroup>
					{:else}
						{#each segment.items as opt (opt.value)}{@render selectOption(opt)}{/each}
					{/if}
				{/each}
			{:else}
				{#each dropdownOptions as opt (opt.value)}{@render selectOption(opt)}{/each}
			{/if}
			{#if dropdownOptions.length === 0}
				<div class="cell-dropdown-empty">{isLoadingOptions ? t("editorLoading") : t("editorEmpty")}</div>
			{/if}
		</Select>
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
	{:else if type === "combobox" || type === "autocomplete"}
		{@const autocomplete = type === "autocomplete"}
		{#key comboGeneration}
			<Combobox
				id={controlId}
				embedded
				openOnFocus
				selectValueOnTab
				freeText={autocomplete}
				dropdownClass="cell-dropdown"
				maxDropdownHeight="200px"
				bind:open={dropdownOpen}
				bind:currentValue={comboText}
				value={currentKey ? [currentKey] : []}
				options={dropdownOptions}
				{valueText}
				placeholder={options.placeholder ||
					(autocomplete ? t("editorSearchPlaceholder") : t("editorSelectPlaceholder"))}
				searchBehavior={options.searchBehavior}
				filterCallback={autocomplete ? localFilter : undefined}
				onSearch={autocomplete && options.onSearch ? handleAutocompleteSearch : undefined}
				searchDelay={options.searchDelay ?? 300}
				loading={isLoadingOptions || search.loading}
				labels={{loading: isLoadingOptions ? t("editorLoading") : t("editorSearching")}}
				emptyText={autocomplete ? t("editorEmpty") : t("editorNoMatches")}
				onChange={({value: picked}) => {
					if (picked.length) pick(picked[0])
				}}
			/>
		{/key}
		{#if search.loading}
			<span class="cell-loading-indicator">...</span>
		{/if}
	{/if}
</div>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
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

		/* Autocomplete: a search box, not a dropdown — no chevron (as before the Combobox reuse) */
		.grid-cell-editor.autocomplete :global(.combobox-indicator) {
			display: none;
		}

		.cell-loading-indicator {
			position: absolute;
			inset-inline-end: 4px;
			font-size: 10px;
			color: var(--neutral-foreground-hint, #707070);
			animation: fluent-pulse 1s infinite;
		}

		/* The dropdown list (Select / Combobox `dropdownClass`): portalled, so themed via
	   variables set on :root or a theme selector. Fallbacks = the shared listbox look. */
		:global(.select-listbox-popover.cell-dropdown),
		:global(.combobox-listbox.cell-dropdown) {
			background: var(--fluent-quickgrid-dropdown-bg, var(--neutral-layer-floating, #ffffff));
			border-color: var(--fluent-quickgrid-dropdown-border, var(--neutral-stroke-rest, #d1d1d1));
		}

		:global(
			.cell-dropdown:is(.select-listbox-popover, .combobox-listbox)
				.fluent-option[role="option"]:is(:hover, [data-highlighted]):not([disabled])
		) {
			background: var(--fluent-quickgrid-dropdown-highlight-bg, var(--neutral-fill-stealth-hover, #f0f0f0));
		}

		:global(
			.cell-dropdown:is(.select-listbox-popover, .combobox-listbox)
				.fluent-option[role="option"][aria-selected="true"]:is(:hover, [data-highlighted]):not([disabled])
		) {
			background: var(--fluent-quickgrid-dropdown-highlight-bg, var(--neutral-fill-secondary-hover, #ebebeb));
		}

		/* Status row of the select editor's list (no options / loading) */
		.cell-dropdown-empty {
			padding: 8px 12px;
			color: var(--neutral-foreground-hint, #707070);
			font-style: italic;
			text-align: center;
		}
	}
</style>
