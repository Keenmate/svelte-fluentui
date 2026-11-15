<!--
@component
Editable single- or multi-select combobox: a filtering text input plus a portalled listbox.
Options come from `options` or `<Option>` children; `value` is always an array.

```svelte
<Combobox label="City" bind:value options={[{value: "prg", label: "Prague"}, {value: "brn", label: "Brno"}]} />
```
-->
<!--
 * Combobox Component (rewrite)
 *
 * Custom single-select combobox that replaces the previous <fluent-combobox>
 * wrapper. Like Select, the dropdown is portalled out via PositioningRegion,
 * so it (a) never grows past the viewport — its max-height is capped to the
 * available space — and (b) escapes any ancestor with overflow clipping
 * (e.g. a Card). The old wrapper suffered both because the native listbox
 * rendered in place and measured against the window, not its container.
 *
 * Unlike Select, the trigger is an editable text input that filters the
 * options as you type. Options come from either the `options` prop or
 * <Option> children; both are rendered to the DOM and filtered uniformly by
 * toggling a per-option `data-filtered-out` attribute (diacritic-insensitive),
 * so children-based and array-based usage behave identically.
 *
 * <Option> children work unchanged via the 'selected-options' context — the
 * same contract Select and the old Combobox provided.
-->

<script lang="ts">
	import {selectedOptionsContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import {untrack, tick} from "svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import FieldLabel from "./FieldLabel.svelte"
	import Chip from "./Chip.svelte"
	import Option from "./Option.svelte"
	import OptionGroup from "./OptionGroup.svelte"
	import type {OptionItem, RestProps, SelectedValue} from "../types/index.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {debounce} from "../helpers/debounce.js"
	import {groupSegments} from "../helpers/option-groups.js"
	import {chipNavFromChip, chipNavFromInput, type ChipNavOptions} from "../helpers/chip-nav.js"
	import {defaultComboboxLabels, type ComboboxLabels} from "./Combobox.labels.js"
	import {normalizeForSearch, startsWithText, type SearchBehavior} from "../helpers/text.js"
	import {
		OPTION_SELECTOR,
		getOptionEls,
		optionValue,
		optionLabel,
		optionData,
		findOption,
		markHighlighted,
		listPageSize
	} from "../helpers/option-dom.js"
	import type {
		SelectedOptionSvelteContext,
		ValueType,
		ComboboxFilter,
		ComboboxFilterOption
	} from "../types/combobox.js"

	type OwnProps = {
		/** Id of the input (also the label's `for`). Generated when omitted. */
		id?: string
		/** Selected value(s), always an array (one item in single-select). Bindable. */
		value?: SelectedValue
		/** Options as data (`{value, label, disabled?, group?}`); alternative to `<Option>` children. Items with `group` render under an `OptionGroup` header. */
		options?: OptionItem[]
		/** `<Option>` / `<OptionGroup>` children. */
		children?: Snippet
		/** `list` filters the dropdown, `inline` completes the input to the first match, `both` does both, `none` neither. Default: `list`. */
		autocomplete?: "inline" | "list" | "both" | "none"
		/** Whether the dropdown is open. Bindable. */
		open?: boolean
		/** Read-only bindable mirror of the text currently in the input (the typed
		 * filter while searching, otherwise the selected option's label). Writes are ignored. */
		currentValue?: string
		/** Input placeholder text. */
		placeholder?: string
		/** Force the dropdown above (`top`) or below (`bottom`) the control. Default: auto (where it fits). */
		position?: "top" | "bottom"
		/** Disable the control. */
		disabled?: boolean
		/** Non-editable: the value shows but can't be changed (no typing, no opening,
		 * chips can't be removed). Unlike `disabled`, it stays focusable and un-dimmed. */
		readonly?: boolean
		/** Visual style of the control. Default: `outline`. */
		appearance?: "outline" | "filled"
		/** Mark the input as required (also shows the label's required marker). */
		required?: boolean
		/** Focus the input on mount. */
		autofocus?: boolean
		/** Form field name. */
		name?: string
		/** Extra class on the control. */
		class?: string
		/** Inline style on the control. */
		style?: string
		/** Text label rendered above the control. */
		label?: string
		/** Custom label content; replaces `label`. */
		labelTemplate?: Snippet
		/** Accessible name for the input. Default: `label`. */
		ariaLabel?: string
		/** Tooltip (`title`) on the control. */
		title?: string
		/** Width of the control (inline style, e.g. "240px"). */
		width?: string
		/** Explicit height of the control (inline style, e.g. "40px"). */
		height?: string
		/** Cap the dropdown listbox height (e.g. "300px", "50vh"). The listbox is
		 * always also capped to the space available to the viewport edge; this
		 * lets a shorter ceiling be set per-instance. */
		maxDropdownHeight?: string
		/** Width of the dropdown listbox (e.g. "360px", "24rem"). When unset the
		 * listbox matches the control width; when set it uses this width instead
		 * (and stops matching), so the list can be wider or narrower than the input. */
		dropdownWidth?: string
		/** Multi-select: render selected values as removable chips inside the control
		 * and keep the input as a filter (it never collapses to a single label).
		 * `value`/`onChange` carry the full array in both modes. */
		multiple?: boolean
		/** Close the dropdown after a pick. Defaults to `!multiple`: single-select closes,
		 * multi-select stays open so several values can be chosen in a row. Set `true`
		 * to close on each multi-select pick. Single-select always closes. */
		closeOnSelect?: boolean
		/** Multi-select only: where the selected-value chips render. `inline` (default)
		 * keeps them inside the control; `top`/`bottom` render them as a wrapping row
		 * outside the control (matching Autocomplete's `tagsPosition`). */
		tagsPosition?: "inline" | "top" | "bottom"
		/** Minimum typed characters before the dropdown opens / filters (and `onSearch` fires). Default: no minimum. */
		minSearchLength?: number
		/** Text shown inside the dropdown when the filter matches no options. Default: `labels.emptyText` ("No results found"). */
		emptyText?: string
		/** Custom content shown when the filter matches no options; overrides `emptyText`. */
		empty?: Snippet
		/** Debounced notification that the search term changed. When provided, the parent
		 * owns the data: update `options` with the results and the component skips
		 * its own client-side filtering (the server/parent already filtered). */
		onSearch?: (ctx: {term: string}) => void
		/** Debounce (ms) before `onSearch` fires. Ignored without `onSearch`. Default: 250. */
		searchDelay?: number
		/** How the built-in search compares text: `normalized` (default) ignores case and
		 * diacritics (`zurich` finds `Zürich`), `case-insensitive` ignores case only, `exact`
		 * matches both. Applies to filtering and inline completion; no effect on `filterCallback` or `onSearch`. */
		searchBehavior?: SearchBehavior
		/** Custom client-side matcher, replacing the built-in substring match. Return `true` to keep the option. Ignored when `onSearch` is set. */
		filterCallback?: ComboboxFilter
		/** Parent-controlled loading flag (for async `onSearch`). While true the
		 * dropdown shows `loadingText` instead of the empty-state message. */
		loading?: boolean
		/** Text shown while `loading` is true. Default: `labels.loadingText` ("Searching…"). */
		loadingText?: string
		/** User-facing strings; merged over `defaultComboboxLabels`. Explicit `emptyText` / `loadingText` props win. */
		labels?: Partial<ComboboxLabels>
		/** Single-select: text the input shows for a `value` no rendered option has (e.g. a
		 * result of an earlier async search). Default: empty. */
		valueText?: string
		/** Open the dropdown when the input receives focus from outside the control. */
		openOnFocus?: boolean
		/** Tab on the open list picks the highlighted option before focus moves on. */
		selectValueOnTab?: boolean
		/** Single-select free-text entry: when the list closes without a pick (an outside
		 * click, Tab, the indicator) the typed text stays in the input instead of reverting to
		 * the selected option's label; Escape still reverts it. Read it via `bind:currentValue`. */
		freeText?: boolean
		/** Extra class on the portalled dropdown listbox (it renders outside the component,
		 * so a parent's scoped styles can't reach it otherwise). */
		dropdownClass?: string
		/** For hosting the control inside a component that owns the keyboard and draws the
		 * frame, such as a QuickGrid cell. The control is borderless and transparent and fills
		 * its container; ArrowUp / ArrowDown on the closed list don't open it (they bubble to
		 * the host) and Enter does. Keys the control handles are `preventDefault`ed, so a host
		 * can skip those. */
		embedded?: boolean
		/** Fires when the user changes the selection; `value` is always an array. */
		onChange?: (ctx: {value: string[]}) => void
		/** Fires on every open/close transition of the dropdown after mount (user or `bind:open`); not on initial render. */
		onOpenChange?: (ctx: {open: boolean}) => void
	}

	/** Other native attributes and events go to the root `<div>` (`display: contents`); `id` goes to the input, `class`/`style`/`title` to the control. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		value = $bindable(),
		options = undefined,
		children = undefined,
		autocomplete = undefined,
		open = $bindable(undefined),
		currentValue = $bindable(),
		placeholder = undefined,
		position = undefined,
		disabled = false,
		readonly = false,
		appearance = "outline",
		required = false,
		autofocus = false,
		name = undefined,
		class: className = "",
		style = "",
		label = undefined,
		labelTemplate = undefined,
		ariaLabel = undefined,
		title = undefined,
		width = undefined,
		height = undefined,
		maxDropdownHeight = undefined,
		dropdownWidth = undefined,
		multiple = false,
		closeOnSelect = undefined,
		tagsPosition = "inline",
		minSearchLength = undefined,
		emptyText = undefined,
		empty = undefined,
		onSearch = undefined,
		searchDelay = 250,
		searchBehavior = "normalized",
		filterCallback = undefined,
		loading = undefined,
		loadingText = undefined,
		labels: labelsProp = undefined,
		valueText = undefined,
		openOnFocus = false,
		selectValueOnTab = false,
		freeText = false,
		dropdownClass = undefined,
		embedded = false,
		onChange = undefined,
		onOpenChange = undefined,
		...rest
	}: Props = $props()

	// ---------- Selection state (shared with <Option> via context) ----------
	// Single-select: clicking an option SETS the value (never deselects), which
	// is why we provide our own context instead of createSelectedOptions (whose
	// toggle would clear an already-selected option). Multi-select: `toggle` adds
	// or removes the value from the array (clicking a selected chip's row removes it).

	function normalize(v: SelectedValue): string[] {
		if (v == null) return []
		return Array.isArray(v) ? [...v] : [v]
	}

	let selectionState = $state<{value: string[]}>({value: normalize(value)})

	const ctx: SelectedOptionSvelteContext = {
		get value() {
			return selectionState.value.length ? selectionState.value : null
		},
		set value(v) {
			selectionState.value = v ?? []
		},
		set(v: ValueType) {
			selectionState.value = Array.isArray(v) ? [...v] : (v ? [v] : [])
		},
		toggle(val: string) {
			if (val == null) return
			if (multiple) {
				const cur = selectionState.value
				selectionState.value = cur.includes(val)
					? cur.filter(x => x !== val)
					: [...cur, val]
			} else {
				selectionState.value = [val]
			}
		}
	}

	selectedOptionsContext.set(ctx)

	// prop value -> internal state
	$effect(() => {
		const n = normalize(value)
		const cur = untrack(() => selectionState.value)
		if (n.length !== cur.length || n.some((v, i) => v !== cur[i])) {
			selectionState.value = n
		}
	})

	// internal state -> prop value (always array form, matching SelectedValue)
	$effect(() => {
		const sel = selectionState.value
		untrack(() => {
			const cur = Array.isArray(value) ? value : (value != null ? [value] : [])
			if (sel.length !== cur.length || sel.some((v, i) => v !== cur[i])) {
				value = [...sel]
			}
		})
	})

	const selectedSingle = $derived<string>(selectionState.value[0] ?? "")

	// ---------- Mode flags ----------
	// list / both / default(undefined): typing filters the dropdown.
	// inline / both: typing auto-completes the input text to the first match.
	// none: typing neither filters nor completes (plain dropdown you can focus-type into).
	const doListFilter = $derived(
		autocomplete === undefined || autocomplete === "list" || autocomplete === "both"
	)
	const doInline = $derived(autocomplete === "inline" || autocomplete === "both")

	// ---------- Open / filter state ----------
	let isOpen = $state(false)
	let isFiltering = $state(false)
	let typed = $state("")
	// Count of currently displayed option rows (not filtered out); drives the
	// empty-state message. Starts at -1 so the message never flashes before the
	// first applyFilter() has run.
	let displayedCount = $state(-1)
	// Label of the current selection, cached at selection time. In async mode the
	// option set churns with every query, so the selected option can leave the DOM;
	// this keeps the input showing the right text after it's gone.
	let selectedLabel = $state("")
	// Value -> label cache for multi-select chips: a picked option can scroll out
	// of the (async) option set, so we remember its label at pick time to keep the
	// chip labelled after its <Option> leaves the DOM.
	let labelCache = $state<Record<string, string>>({})
	// True from the moment a keystroke schedules an onSearch until the resulting
	// `options` update lands. Covers the debounce gap so the empty-state message
	// doesn't flash before results arrive — even if the parent doesn't drive `loading`.
	let searchPending = $state(false)

	const labels = $derived<ComboboxLabels>({...defaultComboboxLabels, ...(labelsProp ?? {})})

	let inputEl: HTMLInputElement | undefined = $state()
	let mainEl: HTMLElement | undefined = $state()
	let listEl: HTMLDivElement | undefined = $state()
	/** The popup surface around the listbox (scroll container; also holds the empty message). */
	let popupEl: HTMLDivElement | undefined = $state()
	// Hidden mirror of the options, always mounted, so display text resolves
	// from `value` even while the portalled listbox is closed/unmounted.
	let sourceEl: HTMLDivElement | undefined = $state()
	let controlEl: HTMLElement | undefined = $state()

	// Allow external control via `open` prop (binds both ways).
	$effect(() => {
		if (open !== undefined && open !== untrack(() => isOpen)) isOpen = open
	})
	$effect(() => {
		if (open !== undefined && isOpen !== untrack(() => open)) open = isOpen
	})

	// onOpenChange on every real open/close transition after mount (isOpen is set
	// from many paths: user interaction or a programmatic `bind:open` change). The
	// first run only records the initial state, so `open={true}` on mount is silent.
	let lastOpen: boolean | undefined = undefined
	$effect(() => {
		const next = isOpen
		if (lastOpen === undefined) {
			lastOpen = next
			return
		}
		if (next === lastOpen) return
		lastOpen = next
		untrack(() => onOpenChange?.({open: next}))
	})

	// ---------- Option text ----------
	function getOptionText(val: string): string {
		if (!val) return ""
		const el = findOption([listEl, sourceEl], val)
		if (el) return optionLabel(el)
		// Async fallback: the selected option may no longer be rendered (its query
		// scrolled past). Use the label cached when it was chosen.
		if (labelCache[val]) return labelCache[val]
		if (val === selectedSingle && valueText) return valueText
		if (val === selectedSingle && selectedLabel) return selectedLabel
		return ""
	}

	// Label for a selected chip — never blank (falls back to the raw value).
	function chipLabel(val: string): string {
		return getOptionText(val) || val
	}

	function toFilterOption(el: HTMLElement): ComboboxFilterOption {
		return {
			value: optionValue(el),
			label: optionLabel(el),
			disabled: el.hasAttribute("disabled"),
			data: optionData(el)
		}
	}

	// ---------- Display text (input value when not actively filtering) ----------
	let displayText = $state("")
	$effect(() => {
		const sel = selectedSingle // dep
		valueText // dep
		untrack(() => { displayText = getOptionText(sel) })
		// Re-resolve when options render asynchronously (the option text
		// may not exist yet at the moment `value` was first applied).
		if (!sourceEl) return
		const obs = new MutationObserver(() => {
			displayText = getOptionText(untrack(() => selectedSingle))
		})
		obs.observe(sourceEl, {childList: true, subtree: true})
		return () => obs.disconnect()
	})

	// Single-select: the input shows the selected label when idle. Multi-select:
	// the input is purely a filter — selected values live in chips — so it only
	// ever shows what's being typed (blank when idle).
	const inputDisplay = $derived(multiple ? typed : (isFiltering ? typed : displayText))

	// Mirror the input text out through `bind:currentValue`.
	$effect(() => {
		const text = inputDisplay
		untrack(() => {
			if (currentValue !== text) currentValue = text
		})
	})

	// Chips render inside the control only in inline tags mode; above/below push them
	// to a separate row outside, leaving the control as a plain single-line filter.
	const inlineTags = $derived(multiple && tagsPosition === "inline")
	const externalTags = $derived(multiple && tagsPosition !== "inline" && selectionState.value.length > 0)

	// Hide the placeholder once inline chips occupy the control (multi-select). With
	// external tags the control stays empty, so keep the placeholder visible.
	const effectivePlaceholder = $derived(
		inlineTags && selectionState.value.length > 0 ? "" : placeholder
	)

	// ---------- Filtering ----------
	function visibleOptionEls(): HTMLElement[] {
		return getOptionEls(listEl).filter(
			el => !el.hasAttribute("disabled") && !el.hasAttribute("data-filtered-out")
		)
	}

	// Keyboard cursor over the displayed, enabled options.
	const nav = new ListNav({
		count: () => visibleOptionEls().length,
		itemAt: i => visibleOptionEls()[i],
		pageSize: () => listPageSize(popupEl, visibleOptionEls())
	})

	// Highlights the option with `val`, else the first one.
	function highlightValue(val: string) {
		nav.set(Math.max(visibleOptionEls().findIndex(el => optionValue(el) === val), 0))
	}

	function applyFilter() {
		if (!listEl) return
		const q = normalizeForSearch(typed, searchBehavior)
		// In async mode (onSearch) the parent already filtered — show everything it
		// gave us. Otherwise filter client-side, via a custom `filter` if provided.
		const clientFilter = !onSearch && isFiltering && doListFilter && q.length > 0
		let shown = 0
		for (const el of getOptionEls(listEl)) {
			let match = true
			if (clientFilter) {
				match = filterCallback
					? filterCallback({term: typed, option: toFilterOption(el)})
					: normalizeForSearch(optionLabel(el), searchBehavior).includes(q)
			}
			el.toggleAttribute("data-filtered-out", !match)
			if (match) shown++ // displayed rows include disabled options (still visible)
		}
		displayedCount = shown
	}

	// Reflect the cursor onto the matching option so CSS can style the keyboard
	// cursor distinctly from hover/selected.
	// The row's id also feeds `aria-activedescendant` on the input, so screen
	// readers follow the cursor while focus stays in the input.
	let activeOptionId = $state<string | null>(null)
	$effect(() => {
		const _ = [nav.index, isOpen, typed] // dep tracking
		if (!isOpen) {
			activeOptionId = null
			return
		}
		const el = nav.index >= 0 ? visibleOptionEls()[nav.index] : undefined
		markHighlighted(listEl, el)
		activeOptionId = el?.id || null
	})

	// Inline autocomplete: complete the input to the first matching option's
	// text and select the appended remainder (so the next keystroke replaces it).
	function applyInlineCompletion() {
		if (!inputEl || !typed) return
		const visible = visibleOptionEls()
		const idx = visible.findIndex(el => startsWithText(optionLabel(el), typed, searchBehavior))
		if (idx < 0) return
		const full = optionLabel(visible[idx])
		// Set canonical text (restores diacritics) and select the remainder.
		inputEl.value = full
		inputEl.setSelectionRange(typed.length, full.length)
		nav.set(idx)
	}

	// ---------- Open / close ----------
	// minSearchLength gate: with a threshold set, the dropdown must not open
	// from a click / chevron / arrow key — only once enough text is typed.
	// Otherwise these "open the list now" affordances would dump the (often
	// large/async) option set the threshold exists to avoid.
	function meetsSearchThreshold(): boolean {
		if (!minSearchLength || minSearchLength <= 0) return true
		return typed.trim().length >= minSearchLength
	}

	function openDropdown() {
		if (disabled || readonly) return
		if (!meetsSearchThreshold()) return
		isOpen = true
		tick().then(() => { applyFilter(); highlightValue(selectedSingle) })
	}

	// Escape goes to the topmost open layer (helpers/layer-stack.ts), so inside a
	// Dialog/Panel it closes this dropdown first and leaves the container open.
	$effect(() => {
		if (isOpen) return pushLayer({onEscape: () => closeDropdown(true, true)})
	})

	// `escape`: the user backed out — free text reverts too.
	function closeDropdown(refocus = true, escape = false) {
		if (!isOpen) return
		isOpen = false
		nav.reset()
		// Free text: what was typed stays (a pick has already cleared it), except on Escape
		if (escape || !freeText || multiple) {
			isFiltering = false
			typed = ""
		}
		displayedCount = -1 // avoid a stale empty-state flash on next open
		searchPending = false
		if (refocus) inputEl?.focus()
	}

	function toggleDropdown() {
		if (isOpen) closeDropdown()
		else { inputEl?.focus(); openDropdown() }
	}

	// ---------- Selection ----------
	function emitChange() {
		onChange?.({value: [...selectionState.value]})
	}

	// Cache a value's label before its <Option> can leave the DOM (async churn).
	function cacheLabel(val: string, el?: HTMLElement | null) {
		const opt = el ?? findOption([listEl, sourceEl], val)
		if (opt) {
			const t = optionLabel(opt)
			selectedLabel = t
			labelCache = {...labelCache, [val]: t}
		}
	}

	// Shared post-pick side effects. Single-select closes; multi-select clears the
	// filter and (unless closeOnSelect) stays open so more can be picked in a row.
	function afterSelect(val: string) {
		isFiltering = false
		typed = ""
		emitChange()
		if (multiple && !closeOnSelect) {
			// Re-show the full list (filter cleared) and re-anchor the highlight on
			// the just-toggled row; keep focus in the input for continued typing.
			tick().then(() => { applyFilter(); highlightValue(val) })
			inputEl?.focus()
		} else {
			closeDropdown()
		}
	}

	// Keyboard path (Enter): we toggle selection ourselves, then run side effects.
	function selectByValue(val: string) {
		cacheLabel(val)
		ctx.toggle(val)
		afterSelect(val)
	}

	// Click path: Option.svelte already called ctx.toggle by the time this
	// bubble-phase handler runs. We only handle the side effects.
	function handleListClick(ev: MouseEvent) {
		const optEl = (ev.target as HTMLElement | null)?.closest(OPTION_SELECTOR) as HTMLElement | null
		if (!optEl) return
		if (optEl.hasAttribute("disabled")) { ev.preventDefault(); return }
		const val = optionValue(optEl)
		cacheLabel(val, optEl)
		afterSelect(val)
	}

	// Remove a selected value (chip × button, Backspace on an empty filter, or
	// Backspace / Delete on a focused chip — which keeps focus on the chips).
	function removeValue(val: string, ev?: MouseEvent, refocus = true) {
		ev?.stopPropagation()
		if (disabled || readonly) return
		selectionState.value = selectionState.value.filter(v => v !== val)
		emitChange()
		if (refocus) inputEl?.focus()
	}

	// Keyboard access to the inline chips (see helpers/chip-nav.ts).
	const chipNav: ChipNavOptions = {
		chips: () => inlineTags ? Array.from(mainEl?.querySelectorAll<HTMLElement>(".fluent-chip-remove") ?? []) : [],
		input: () => inputEl,
		remove: (index) => {
			const val = selectionState.value[index]
			if (val !== undefined) removeValue(val, undefined, false)
		}
	}

	// Debounced server-side search notification. The parent updates `options`
	// with the results; the options-change effect below re-syncs the list.
	const debouncedSearch = debounce((term: string) => onSearch?.({term}), () => searchDelay)
	function fireSearch(query: string) {
		if (!onSearch) return
		searchPending = true
		debouncedSearch(query)
	}

	// Re-sync the list when async results arrive (the `options` prop changed
	// while the dropdown is open). No-op for children-based options.
	$effect(() => {
		options // dependency
		searchPending = false // results landed
		if (!untrack(() => isOpen)) return
		tick().then(() => { applyFilter(); nav.first() })
	})

	// Cancel a pending debounce on unmount.
	$effect(() => () => debouncedSearch.cancel())

	// ---------- Input handlers ----------
	function handleInput(ev: Event & {inputType?: string}) {
		if (disabled || readonly) return
		const el = ev.target as HTMLInputElement
		isFiltering = true
		typed = el.value
		nav.reset()

		// Gate against large/async sets: below minSearchLength keep it closed and
		// don't fire a search.
		if (minSearchLength && typed.trim().length > 0 && typed.trim().length < minSearchLength) {
			isOpen = false
			return
		}

		fireSearch(typed)

		if (!isOpen) isOpen = true
		const isDelete = typeof ev.inputType === "string" && ev.inputType.startsWith("delete")
		tick().then(() => {
			applyFilter()
			nav.first()
			// Inline completion works off the local set; skip in async mode where
			// results arrive after this tick.
			if (doInline && !onSearch && !isDelete) applyInlineCompletion()
		})
	}

	function handleKeydown(ev: KeyboardEvent) {
		if (disabled || readonly) return
		// Multi-select: ArrowLeft at the start of the filter moves onto the chips.
		if (multiple && chipNavFromInput(ev, chipNav)) return
		// Multi-select: Backspace on an empty filter removes the last chip.
		if (ev.key === "Backspace" && multiple && typed === "" && selectionState.value.length > 0) {
			removeValue(selectionState.value[selectionState.value.length - 1])
			return
		}
		if (!isOpen) {
			// Arrow / Page keys on a closed combobox open it (Home/End stay with the caret).
			// Embedded: closed-list arrows belong to the host (a grid cell moves), Enter opens.
			const opens = embedded
				? ["Enter", "PageDown", "PageUp"]
				: ["ArrowDown", "ArrowUp", "PageDown", "PageUp"]
			if (opens.includes(ev.key)) {
				ev.preventDefault()
				openDropdown()
			}
			return
		}
		if (nav.handleKey(ev)) return
		switch (ev.key) {
			case "Enter": {
				ev.preventDefault()
				const el = visibleOptionEls()[nav.index]
				if (el) selectByValue(optionValue(el))
				break
			}
			case "Escape":
				ev.preventDefault()
				closeDropdown(true, true)
				break
			case "Tab": {
				// No preventDefault: focus still moves on after the pick
				const el = selectValueOnTab ? visibleOptionEls()[nav.index] : undefined
				if (el) selectByValue(optionValue(el))
				else closeDropdown(false)
				break
			}
		}
	}

	function handleFocus(ev: FocusEvent) {
		if (disabled || readonly) return
		// Single-select: select the display text so the first keystroke replaces it
		// instead of appending to the selected option's label. Multi-select: the
		// input is an empty filter, so there's nothing to select.
		if (!multiple) queueMicrotask(() => inputEl?.select())
		// Only focus arriving from outside: the indicator and a pick in the list hand
		// focus back to the input, and that must not reopen it.
		const from = ev.relatedTarget as Node | null
		if (openOnFocus && !isOpen && !controlEl?.contains(from) && !popupEl?.contains(from)) openDropdown()
	}

	// Clicking anywhere in the control's empty area — its own padding or the
	// wrapping main box around the chips/input — focuses the input and opens. The
	// input opens via its own handler; the indicator toggles via its own; and chip
	// remove buttons handle their own click. We exclude those so we don't double-fire
	// against the indicator's toggle or steal a chip removal.
	function handleControlClick(ev: MouseEvent) {
		if (disabled || readonly) return
		const target = ev.target as HTMLElement | null
		if (target?.closest(".combobox-indicator, .fluent-chip-remove")) return
		inputEl?.focus()
		if (!isOpen) openDropdown()
	}

	function handleInputClick() {
		if (disabled || readonly) return
		if (!isOpen) openDropdown()
	}

	// ---------- Close on outside pointerdown / focus move ----------
	// Focus moving outside (Tab-ing away, a modal dialog opening) closes too —
	// otherwise the popover floats above the modal. No refocus: that would yank
	// focus back out of whatever just opened.
	$effect(() => {
		if (!isOpen) return
		return dismissOnOutside(() => [controlEl, popupEl], () => closeDropdown(false))
	})

	// ---------- Computed ----------
	const forcedPlacement = $derived<"top" | "bottom" | undefined>(
		position
	)

	const controlStyle = $derived(() => {
		const parts: string[] = []
		if (width) parts.push(`width: ${width}`)
		if (height) parts.push(`height: ${height}`)
		return (parts.join("; ") + (parts.length && style ? "; " : "") + style)
	})

	// Stable fallback so the label/aria-controls wiring works without an explicit id.
	const uid = $props.id()
	const inputId = $derived(id ?? `fluent-combobox-${uid}`)
	const listboxId = $derived(`${inputId}-listbox`)

	// `options` sectioned by `group`, in source order (null when nothing is grouped).
	const segments = $derived(groupSegments(options ?? []))
</script>

{#snippet optionItem(item: OptionItem)}
	<Option value={item.value} label={item.label} disabled={item.disabled}>
		{item.label}
	</Option>
{/snippet}

{#snippet externalChips()}
	<div class="combobox-external-chips">
		{#each selectionState.value as val (val)}
			<Chip
				text={chipLabel(val)}
				variant="external"
				removeFocusable
				showRemove={!disabled && !readonly}
				removeLabel={labels.removeChip(chipLabel(val))}
				onRemove={({sourceEvent: e}) => removeValue(val, e)}
			/>
		{/each}
	</div>
{/snippet}

{#snippet optionList()}
	{#if children}
		{@render children()}
	{:else if segments}
		{#each segments as seg, si (si)}
			{#if seg.group}
				<OptionGroup label={seg.group}>
					{#each seg.items as item (item.value)}
						{@render optionItem(item)}
					{/each}
				</OptionGroup>
			{:else}
				{#each seg.items as item (item.value)}
					{@render optionItem(item)}
				{/each}
			{/if}
		{/each}
	{:else}
		{#each options ?? [] as item (item.value)}
			{@render optionItem(item)}
		{/each}
	{/if}
{/snippet}

<!-- display:contents root so consumers see one element, transparent to layout. -->
<div {...rest} class="combobox-root">

	<FieldLabel for={inputId} {label} {labelTemplate} {required} />

	<!-- Hidden mirror of options so the selected value's display text resolves
	     even when the dropdown is closed. aria-hidden — not a second listbox. -->
	<div bind:this={sourceEl} class="combobox-options-source" aria-hidden="true">
		{@render optionList()}
	</div>

	<!-- Tags above (multi-select, tagsPosition="top") -->
	{#if externalTags && tagsPosition === "top"}
		{@render externalChips()}
	{/if}

	<!-- Mouse convenience only: a press in the control's padding focuses the input,
	     which owns the keyboard. -->
	<div
		bind:this={controlEl}
		class="combobox-control fluent-field-control fluent-field-control--focus-within {appearance} {className}"
		class:open={isOpen}
		class:disabled
		class:readonly
		class:multiple
		class:embedded
		class:tags-inline={inlineTags}
		style={controlStyle()}
		{...attrs({title})}
		onclick={handleControlClick}
	>
		<!-- Wrapping main box: chips + input. Kept as its own flex:1 box (rather than
		     direct children of the control) so chips wrap INSIDE it while the
		     indicator stays a separate box at the end — that lets the indicator span
		     the control's full height once chips wrap onto multiple rows, matching
		     Autocomplete's toggle. -->
		<!-- Keydown here only handles the inline chips' × buttons (arrow keys,
		     Backspace / Delete); the input's own keys go to handleKeydown. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="combobox-main" bind:this={mainEl} onkeydown={(ev) => { if (ev.target !== inputEl && !disabled && !readonly) chipNavFromChip(ev, chipNav) }}>
			<!-- Inline tags: selected values render as removable chips before the input. -->
			{#if inlineTags}
				{#each selectionState.value as val (val)}
					<Chip
						text={chipLabel(val)}
						variant="inline"
						contrast={readonly || appearance === "filled"}
						showRemove={!disabled && !readonly}
						removeLabel={labels.removeChip(chipLabel(val))}
						onRemove={({sourceEvent: e}) => removeValue(val, e)}
					/>
				{/each}
			{/if}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:this={inputEl}
				id={inputId}
				type="text"
				class="combobox-input"
				role="combobox"
				aria-expanded={isOpen ? "true" : "false"}
				aria-controls={listboxId}
				aria-activedescendant={activeOptionId}
				aria-autocomplete={doInline ? (doListFilter ? "both" : "inline") : (doListFilter ? "list" : "none")}
				aria-label={ariaLabel ?? label}
				aria-required={required ? "true" : null}
				value={inputDisplay}
				placeholder={effectivePlaceholder}
				{disabled}
				{readonly}
				required={multiple ? false : required}
				{autofocus}
				autocomplete="off"
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={handleFocus}
				onclick={handleInputClick}
			/>
		</div>
		<button
			type="button"
			class="combobox-indicator"
			tabindex="-1"
			aria-hidden="true"
			disabled={disabled || readonly}
			onclick={toggleDropdown}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
				<path d="M2.22 4.47a.75.75 0 0 1 1.06 0L6 7.19l2.72-2.72a.75.75 0 1 1 1.06 1.06L6.53 8.78a.75.75 0 0 1-1.06 0L2.22 5.53a.75.75 0 0 1 0-1.06Z"/>
			</svg>
		</button>
	</div>

	<!-- Tags below (multi-select, tagsPosition="bottom") -->
	{#if externalTags && tagsPosition === "bottom"}
		{@render externalChips()}
	{/if}

	{#if isOpen && controlEl}
		<PositioningRegion
			anchor={controlEl}
			visible={isOpen}
			position={forcedPlacement}
			matchWidth={!dropdownWidth}
			availableHeight
		>
			<!-- The popup surface (and scroll container) holds the listbox plus, outside it,
			     the empty / loading message — a listbox may only contain options. -->
			<div
				bind:this={popupEl}
				class={["combobox-listbox fluent-popup-surface", dropdownClass]}
				style={[
					dropdownWidth ? `width: ${dropdownWidth}` : "",
					maxDropdownHeight ? `--_combobox-listbox-max-height: ${maxDropdownHeight}` : ""
				].filter(Boolean).join("; ") || undefined}
			>
				<!-- The keyboard stays on the input (aria-activedescendant); the list takes clicks only. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					bind:this={listEl}
					id={listboxId}
					role="listbox"
					aria-label={ariaLabel ?? label}
					aria-multiselectable={multiple ? "true" : null}
					tabindex="-1"
					class="combobox-options"
					onclick={handleListClick}
				>
					{@render optionList()}
				</div>
				{#if displayedCount === 0}
					<div class="combobox-no-data">
						{#if loading || searchPending}
							{loadingText ?? labels.loadingText}
						{:else if empty}
							{@render empty()}
						{:else}
							{emptyText ?? labels.emptyText}
						{/if}
					</div>
				{/if}
			</div>
		</PositioningRegion>
	{/if}

	<!-- Participate in HTML form submission. Multi-select emits one hidden input
	     per selected value (standard multi-value form encoding). -->
	{#if name}
		{#if multiple}
			{#each selectionState.value as val (val)}
				<input type="hidden" {name} value={val} />
			{/each}
		{:else}
			<input type="hidden" {name} {required} value={selectedSingle} />
		{/if}
	{/if}
</div>

<style>
	.combobox-root {
		display: contents;
	}

	/* ===== Control (bordered box wrapping input + indicator) =====
	 * Box, hover, focus underline (focus-within / open), filled, disabled,
	 * readonly and embedded come from the shared `.fluent-field-control`
	 * primitive (_primitives.scss). */
	.combobox-control {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		cursor: text;
		min-width: 200px;
	}

	/* Embedded (e.g. a QuickGrid cell): the primitive drops the frame. */
	.combobox-control.embedded {
		min-width: 0;
	}

	.combobox-control.embedded .combobox-input {
		font: inherit;
		color: inherit;
	}

	.combobox-control.embedded .combobox-indicator {
		width: auto;
		margin-inline-end: 0;
		padding-inline-start: 4px;
	}

	/* Wrapping main box: holds the chips + input and grows/wraps internally, while
	   the indicator stays a separate box at the control's end. This is what lets the
	   indicator span the full control height when chips wrap (see .combobox-indicator).
	   Single-line by default; wrapping + vertical padding are added only in inline-tags
	   mode below. */
	.combobox-main {
		display: flex;
		flex: 1 1 auto;
		min-width: 0;
		align-items: center;
		gap: 4px;
	}

	.combobox-input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
		color: var(--neutral-foreground-rest, #242424);
		padding: 0;
	}

	.combobox-input::placeholder {
		color: var(--neutral-foreground-hint, #717171);
	}

	.combobox-input:disabled {
		cursor: not-allowed;
	}

	/* ===== Multi-select control + chips ===== */
	/* Inline tags: let chips wrap onto multiple rows INSIDE the main box; a little
	 * vertical padding keeps them off the border once it grows past one line. The
	 * control itself stays nowrap (two boxes: wrapping main + indicator) so the
	 * indicator can span the full height. (External tags render outside the control,
	 * so it stays single-line and skips this.) */
	.combobox-control.multiple.tags-inline .combobox-main {
		flex-wrap: wrap;
		padding-block: calc(var(--design-unit, 4) * 1px);
	}

	/* In multi mode the input is just a filter — let it shrink but keep a usable
	 * typing width so it doesn't collapse to nothing between chips. */
	.combobox-control.multiple .combobox-input {
		flex: 1 1 60px;
		min-width: 60px;
	}

	/* Selection chips (inline + above/below) are rendered by the shared Chip
	   component (Chip.svelte); their styling and `--fluent-chip-*` tokens live
	   there. Inline chips pass contrast={readonly || filled} so they stay visible
	   when the control background matches the chip fill. */

	/* ===== External chips row (tagsPosition top/bottom) ===== */
	/* A wrapping row that sits outside the control; the chips themselves are the
	   shared Chip component with variant="external" (self-bordered). */
	.combobox-external-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--fluent-chip-gap, 0.25rem);
		padding-block: calc(var(--design-unit, 4) * 1px);
	}

	/* Full-height hitbox (Blazor-style) rather than a bare glyph, so the whole toggle
	 * area is clickable, not just the 12px chevron. `align-self: stretch` on the
	 * nowrap control makes it span the ENTIRE control height, including when the main
	 * box has grown to multiple wrapped chip rows — matching Autocomplete's toggle.
	 * The glyph stays centered via the flex centering. A negative inline-end margin
	 * pulls it flush to the control's end edge, reclaiming the control's end padding.
	 * No hover background — Microsoft's control doesn't have one. */
	.combobox-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: stretch;
		width: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		margin-inline-end: calc(var(--design-unit, 4) * -2 * 1px);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--neutral-foreground-hint, #717171);
		flex-shrink: 0;
	}

	.combobox-indicator:disabled {
		cursor: not-allowed;
	}

	/* ===== Dropdown (portalled) =====
	 * `.combobox-listbox` is the popup: surface (background, border, radius,
	 * shadow) from `.fluent-popup-surface`, padding, height cap and scrolling.
	 * The `role="listbox"` (`.combobox-options`) and the empty message sit in it. */
	:global(.combobox-listbox) {
		display: flex;
		flex-direction: column;
		padding: calc(var(--design-unit, 4) * 1px);
		/* Cap to the space PositioningRegion measured to the viewport edge, and
		 * (when set) to the per-instance `maxDropdownHeight` prop — whichever is smaller. */
		max-height: min(var(--_available-height, 280px), var(--_combobox-listbox-max-height, 100vh));
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
	}

	.combobox-options {
		display: flex;
		flex-direction: column;
	}

	/* Option row layout, hover, highlight, selected, disabled and the
	 * data-filtered-out hide rule now live in Option.svelte (scoped to the
	 * option element, so they apply wherever it renders). */

	/* Hide a whole group (its header included) once all of its options have
	 * filtered out, so no orphan headers remain. :has() is live, so this
	 * re-evaluates as data-filtered-out toggles. */
	:global(.combobox-listbox .option-group:not(:has(.fluent-option:not([data-filtered-out])))) {
		display: none;
	}

	/* Empty-state message shown when the filter matches no options. */
	:global(.combobox-listbox) .combobox-no-data {
		padding: 0.75rem 1rem;
		text-align: center;
		color: var(--neutral-foreground-hint, #717171);
		font-size: var(--type-ramp-base-font-size, 14px);
	}

	/* Hidden options mirror — text lookup only, never displayed. */
	.combobox-options-source {
		display: none;
	}
</style>
