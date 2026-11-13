<!--
 * Autocomplete Component
 * Inspired by FluentUI Blazor Autocomplete component
 * https://www.fluentui-blazor.net/Autocomplete
 *
 * Multiple selection autocomplete with tag/chip display and custom filtering
 * Supports three tag positions: inline (default), above, below
-->

<script lang="ts">
	import type { Snippet } from "svelte"
	import { untrack } from "svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import Chip from "./Chip.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {AsyncSearch} from "../helpers/async-search.svelte.js"
	import {containsText, type SearchBehavior} from "../helpers/text.js"
	import type {OptionItem, RestProps} from "../types/index.js"

	type OwnProps<T = any> = {
		/** Selected option values (bindable). */
		value?: T[]
		options?: OptionItem<T>[]
		placeholder?: string
		disabled?: boolean
		readonly?: boolean
		required?: boolean
		autofocus?: boolean
		label?: string
		labelTemplate?: Snippet
		appearance?: string
		autocomplete?: string
		maxSelectionCount?: number
		maxResultCount?: number
		minSearchLength?: number
		showOverlayOnEmptyResults?: boolean
		showInitialOptions?: boolean
		initialOptionsCount?: number
		/** Multi-select only: keep the dropdown open after each pick so several can
		 * be chosen in a row (default `true`). Set `false` to close on each pick. */
		keepOpen?: boolean
		width?: string
		height?: string
		/** Cap the dropdown listbox height (e.g. "300px", "50vh"). The listbox is
		 * always also capped to the space available to the viewport edge; this
		 * lets a shorter ceiling be set per-instance. Defaults to 300px. */
		maxDropdownHeight?: string
		/** Width of the dropdown listbox (e.g. "360px", "24rem"). When unset the
		 * listbox matches the control width; when set it uses this width instead
		 * (and stops matching), so the list can be wider or narrower than the input. */
		dropdownWidth?: string
		id?: string
		title?: string
		ariaLabel?: string
		multiple?: boolean
		loading?: boolean
		immediateDelay?: number
		selectValueOnTab?: boolean
		tagsPosition?: "inline" | "top" | "bottom"
		headerContent?: Snippet
		footerContent?: Snippet
		optionTemplate?: Snippet<[OptionItem<T>]>
		// Decorative slots inside the input. Render arbitrary content (typically icons or
		// small buttons) at the start (left) or end (right) of the input. The auto-rendered
		// clear button and loading spinner take precedence in the end slot — `end`
		// renders only when neither is active, so a search icon doesn't fight a clear button.
		start?: Snippet
		end?: Snippet
		/** Show a built-in accent-coloured magnifier in the end slot (FluentUI Blazor look).
		 * Renders by default when nothing higher-priority occupies the slot (clear button,
		 * loading spinner, or a custom `end` all take precedence). Set false to hide it. */
		showSearchIcon?: boolean
		class?: string
		style?: string
		initialSearchQuery?: string
		/** How the built-in search compares text: `normalized` (default) ignores case and
		 * diacritics (`ces` finds `Český`), `case-insensitive` ignores case only, `exact`
		 * matches both. Local search only; no effect on `searchCallback`. */
		searchBehavior?: SearchBehavior
		/** Provides options for a search term (server-side search). `signal` aborts when a newer search starts, the query is cleared, the dropdown closes or the component unmounts. */
		searchCallback?: (ctx: {term: string; signal: AbortSignal}) => Promise<OptionItem<T>[]> | OptionItem<T>[]
		/** Fires when the user adds or removes a selection. */
		onChange?: (ctx: {value: T[]}) => void
		/** Whether the options dropdown is open (bindable). Setting it to `true`
		 * opens the list the same way the dropdown toggle does; `false` closes it. */
		open?: boolean
		/** Fires on every open/close transition of the dropdown after mount (user
		 * interaction or `bind:open`); not on initial render. */
		onOpenChange?: (ctx: {open: boolean}) => void
	}

	/** Other native attributes and events go to the root `<div>`. */
	type Props<T = any> = OwnProps<T> & RestProps<OwnProps<T>>

	let {
		value: selectedOptions = $bindable([]),
		options = [],
		placeholder = "Type to search...",
		disabled = false,
		readonly = false,
		required = false,
		autofocus = undefined,
		label = undefined,
		labelTemplate = undefined,
		appearance = undefined,
		autocomplete = undefined,
		maxSelectionCount = undefined,
		maxResultCount = 9,
		minSearchLength = undefined,
		showOverlayOnEmptyResults = true,
		showInitialOptions = false,
		initialOptionsCount = undefined,
		keepOpen = true,
		width = undefined,
		height = undefined,
		maxDropdownHeight = undefined,
		dropdownWidth = undefined,
		id = undefined,
		title = undefined,
		ariaLabel = undefined,
		multiple = undefined,
		loading = undefined,
		immediateDelay = 0,
		selectValueOnTab = true,
		tagsPosition = "inline",
		headerContent = undefined,
		footerContent = undefined,
		optionTemplate = undefined,
		start = undefined,
		end = undefined,
		showSearchIcon = true,
		class: className = "",
		style = "",
		initialSearchQuery = "",
		searchBehavior = "normalized",
		searchCallback = undefined,
		onChange = undefined,
		open = $bindable(undefined),
		onOpenChange = undefined,
		...rest
	}: Props = $props()

	let searchText = $state("")
	let isOpen = $state(false)
	let filteredOptions = $state<OptionItem<any>[]>([])
	// Value -> label cache. A selected option can come from an async `searchCallback`
	// result set that isn't part of the local `options` prop; once selected, that
	// result set churns and the option's text is lost, so a chip would fall back to
	// the raw value id. We remember each picked option's text here so getOptionText
	// can resolve chips regardless of which source they came from.
	let labelCache = $state<Record<string, string>>({})
	let containerElement = $state<HTMLElement | undefined>(undefined)
	let inputElement = $state<HTMLInputElement | undefined>(undefined)
	let isFocused = $state(false)
	let optionsListElement = $state<HTMLElement | undefined>(undefined)

	// Keyboard cursor over the rendered option rows.
	const nav = new ListNav({
		count: () => filteredOptions.length,
		itemAt: i => optionsListElement?.querySelectorAll(".option-item")[i]
	})

	// Debounced search (`immediateDelay`), local or via `searchCallback`. Aborts the
	// in-flight request when a newer search starts, the search is cancelled (empty
	// query, dropdown closed) or the component unmounts; stale responses are dropped.
	const search = new AsyncSearch<OptionItem<any>>({
		delay: () => immediateDelay,
		search: (term, signal) => searchCallback
			? searchCallback({term, signal})
			: options.filter(opt => containsText(opt.label, term, searchBehavior)),
		onResults: results => showResults(results),
		onError: error => {
			console.error("[Autocomplete] searchCallback failed:", error)
			showResults([])
		}
	})

	$effect(() => () => search.cancel())

	// Compute effective multi/single select mode
	// If multiple is explicitly set, use it. Otherwise, infer from maxSelectionCount
	let effectiveMultiple = $derived(
		multiple !== undefined ? multiple : (maxSelectionCount === undefined || maxSelectionCount !== 1)
	)

	// Handle initial search query (used when typing to start editing in grid)
	$effect(() => {
		if (initialSearchQuery && initialSearchQuery.length > 0) {
			searchText = initialSearchQuery
			isOpen = true
			// Trigger search immediately (bypass debounce)
			performSearch(initialSearchQuery)
		}
	})

	// Show search results, excluding already-selected options so a picked value
	// can't reappear in the list and be selected twice.
	function showResults(results: OptionItem<any>[]) {
		filteredOptions = results.filter(r => !isSelected(r.value)).slice(0, maxResultCount)
		isOpen = filteredOptions.length > 0 || showOverlayOnEmptyResults
	}

	// Perform the actual search now (no debounce).
	function performSearch(text: string) {
		search.run(text)
	}

	// Filter options based on search text (with optional debounce)
	function filterOptions(text: string) {
		// Handle empty search text (no debounce needed)
		if (!text || !text.trim()) {
			search.cancel() // drop any pending / in-flight search for the previous text
			// Show initial options if enabled
			if (showInitialOptions && options.length > 0) {
				const limit = initialOptionsCount ?? maxResultCount
				const filtered = options.filter(opt => !isSelected(opt.value))
				filteredOptions = filtered.slice(0, limit)
				isOpen = filteredOptions.length > 0
			} else {
				filteredOptions = []
				if (!showOverlayOnEmptyResults) {
					isOpen = false
				}
			}
			return
		}

		// Gate: below minSearchLength, don't search or open the dropdown.
		// Why: against large/async option sets, searching on a single character
		// is wasteful (UX noise) or expensive (triggers consumer API calls).
		if (minSearchLength && text.trim().length < minSearchLength) {
			search.cancel()
			filteredOptions = []
			isOpen = false
			return
		}

		// Debounced when immediateDelay > 0 (loading shows immediately), else now.
		search.schedule(text)
	}

	// Check if an option is already selected
	function isSelected(value: any): boolean {
		return selectedOptions.some(v => v === value)
	}

	// Handle option selection
	function selectOption(option: OptionItem<any>) {
		if (disabled || readonly || option.disabled) return

		// Never add the same value twice in multi-select (would render a duplicate
		// chip). The list already excludes selected options, so this is a safety net
		// for any path that surfaces an already-picked value.
		if (effectiveMultiple && isSelected(option.value)) return

		if (effectiveMultiple && maxSelectionCount && selectedOptions.length >= maxSelectionCount) {
			return
		}

		// Remember this option's label before its (possibly async) source list
		// churns, so the chip stays named even when it's not in the `options` prop.
		labelCache = {...labelCache, [option.value]: option.label}

		// Single-select replaces the previous value; multi-select appends.
		selectedOptions = effectiveMultiple
			? [...selectedOptions, option.value]
			: [option.value]
		searchText = ""
		nav.reset()

		// Multi-select honors keepOpen / max-cap; single-select always closes.
		const stayOpen = effectiveMultiple && keepOpen &&
			!(maxSelectionCount && selectedOptions.length >= maxSelectionCount)

		if (stayOpen) {
			// Keep the dropdown open, but refresh the list so it shows the REMAINING
			// options (the just-picked one is now excluded) instead of the empty list —
			// otherwise it would render "No results found". The filter is cleared, so
			// reuse the same empty-query path as focus/toggle (initial options, async
			// re-query, or the full remaining list).
			refreshOpenList()
			// Sync sources: if nothing is left to pick (everything is selected), don't
			// leave an empty "No results found" dropdown hanging open — close it. (Async
			// results aren't known synchronously, so leave those to performSearch.)
			if (!searchCallback && filteredOptions.length === 0) {
				closeDropdown()
			}
		} else {
			filteredOptions = []
			closeDropdown()
		}

		onChange?.({value: selectedOptions})
	}

	// Refresh the currently-open dropdown list to reflect the current selection and
	// filter, via the same query-aware path as focus/toggle. Used after a keep-open
	// pick (to drop the just-selected option) and after removing a chip (to re-surface
	// the freed option and clear a stale "No results found").
	function refreshOpenList() {
		if (searchText.trim()) {
			filterOptions(searchText)
		} else if (showInitialOptions && options.length > 0) {
			filterOptions("")
		} else {
			showAllOptions()
		}
	}

	// Remove selected option
	function removeOption(value: any, event?: MouseEvent) {
		if (event) {
			event.stopPropagation()
		}
		if (disabled || readonly) return

		selectedOptions = selectedOptions.filter(v => v !== value)
		// If the dropdown is open, refresh it so the freed option reappears and any
		// stale "No results found" (from when everything was selected) is cleared.
		if (isOpen) {
			refreshOpenList()
		}
		onChange?.({value: selectedOptions})
	}

	// Get display text for a selected value. Prefer the local `options` prop, then
	// the label cached at selection time (covers async `searchCallback` results
	// that aren't in `options`), and only then fall back to the raw value.
	function getOptionText(value: any): string {
		const option = options.find(opt => opt.value === value)
		if (option) return option.label
		if (labelCache[value] != null) return labelCache[value]
		return String(value)
	}

	// Escape goes to the topmost open layer (helpers/layer-stack.ts), so inside a
	// Dialog/Panel it closes this dropdown first and leaves the container open.
	$effect(() => {
		if (!isOpen) return
		return pushLayer({
			onEscape: () => {
				closeDropdown()
				searchText = ""
				filteredOptions = []
			}
		})
	})

	// Closing also drops a pending / in-flight search, so late results can't reopen it.
	function closeDropdown() {
		isOpen = false
		search.cancel()
	}

	// Open the list using the same query-aware path as the dropdown toggle.
	function openDropdown() {
		if (searchText.trim()) {
			filterOptions(searchText)
		} else if (showInitialOptions && options.length > 0) {
			filterOptions("")
		} else {
			showAllOptions()
		}
	}

	// Allow external control via `open` prop (binds both ways).
	$effect(() => {
		if (open === undefined || open === untrack(() => isOpen)) return
		const next = open
		untrack(() => {
			if (next) {
				if (!disabled && !readonly) openDropdown()
			} else {
				closeDropdown()
			}
		})
	})
	$effect(() => {
		if (open !== undefined && isOpen !== untrack(() => open)) open = isOpen
	})

	// onOpenChange on every real open/close transition after mount (isOpen is set
	// from many paths: user interaction or a programmatic `bind:open` change). The
	// first run only records the initial state, so `open={true}` on mount is silent.
	let lastOpen: boolean | undefined = undefined
	$effect(() => {
		const open = isOpen
		if (lastOpen === undefined) {
			lastOpen = open
			return
		}
		if (open === lastOpen) return
		lastOpen = open
		untrack(() => onOpenChange?.({open}))
	})

	// Show all available options (minus already-selected) in the dropdown.
	// Used by Ctrl+Space and any caller that wants to force-open the list.
	function showAllOptions() {
		if (disabled || readonly) return
		if (searchCallback) {
			// Async mode: trigger a search with the current text (or empty)
			performSearch(searchText)
			return
		}
		const available = options.filter(opt => !isSelected(opt.value))
		filteredOptions = available.slice(0, maxResultCount)
		nav.set(0)
		isOpen = filteredOptions.length > 0 || showOverlayOnEmptyResults
	}

	// Toggle the dropdown from the search-icon button: close if open, otherwise
	// focus the input and open it using the SAME query-aware path as focus/typing.
	// stopPropagation keeps the container's click handler (which only focuses the
	// input) from also firing.
	//
	// Why not just showAllOptions(): with an empty query and showInitialOptions on,
	// focusing already shows the curated initial list. showAllOptions() would then
	// *also* fire an async searchCallback("") that replaces those initial items a
	// moment later — the "5 items flash then get swapped" bug. So when there's a
	// curated initial list to show, we don't kick off a search; we only force the
	// full "show everything" list when there's nothing better to display.
	function toggleDropdown(event: MouseEvent) {
		event.stopPropagation()
		if (disabled || readonly) return
		if (isOpen) {
			closeDropdown()
		} else {
			inputElement?.focus()
			openDropdown()
		}
	}

	// Handle keyboard navigation
	function handleKeyDown(event: KeyboardEvent) {
		// Ctrl+Space: open dropdown and show all available options
		if (event.key === " " && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()
			showAllOptions()
			return
		}

		// Handle backspace to remove last chip when input is empty
		if (event.key === "Backspace" && searchText === "" && effectiveMultiple && selectedOptions.length > 0) {
			const lastValue = selectedOptions[selectedOptions.length - 1]
			removeOption(lastValue)
			return
		}

		if (!isOpen) return

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault()
				nav.move(1)
				break
			case "ArrowUp":
				event.preventDefault()
				nav.move(-1)
				break
			case "Enter":
				event.preventDefault()
				if (filteredOptions[nav.index]) {
					selectOption(filteredOptions[nav.index])
				}
				break
			case "Escape":
				event.preventDefault()
				closeDropdown()
				searchText = ""
				filteredOptions = []
				break
			case "Tab":
				// Tab key behavior controlled by selectValueOnTab prop
				if (selectValueOnTab && filteredOptions[nav.index]) {
					event.preventDefault()
					selectOption(filteredOptions[nav.index])
				}
				break
		}
	}

	// Handle input focus
	function handleInputFocus() {
		isFocused = true
		if (!disabled && !readonly) {
			if (searchText.trim()) {
				filterOptions(searchText)
			} else if (showInitialOptions) {
				// Show initial options on focus when search is empty
				filterOptions("")
			}
		}
	}

	// Handle input blur
	function handleInputBlur() {
		isFocused = false
	}

	// Handle container click to focus input
	function handleContainerClick(event: MouseEvent) {
		// Don't focus if clicking remove button or clear button
		const target = event.target as HTMLElement
		if (target.closest('.fluent-chip-remove, .clear-button')) {
			return
		}
		inputElement?.focus()
	}

	// Light dismiss: an outside press (capture, so opening another control closes
	// this one first), focus moving out (Tab-ing away, a modal opening) or an outside
	// scroll — the dropdown doesn't follow its anchor on scroll. Our own control and
	// the portalled options list (its scroll container) count as inside.
	$effect(() => {
		if (!isOpen) return
		return dismissOnOutside(
			() => [containerElement, optionsListElement?.closest(".positioning-region") ?? optionsListElement],
			() => closeDropdown(),
			{scroll: true}
		)
	})

	// Check if max selections reached
	let isMaxReached = $derived(maxSelectionCount !== undefined && selectedOptions.length >= maxSelectionCount)

	// Single-select mode detection (uses effectiveMultiple for explicit control)
	let isSingleSelect = $derived(!effectiveMultiple)
	let hasSingleSelection = $derived(isSingleSelect && selectedOptions.length === 1)

	// Computed display value for input
	let displayValue = $derived(hasSingleSelection ? getOptionText(selectedOptions[0]) : searchText)

	// Computed loading state (external prop or internal state)
	let showLoading = $derived(loading !== undefined ? loading : search.pending)

	// Compute placeholder - hide when there are inline chips
	let effectivePlaceholder = $derived(
		(tagsPosition === 'inline' && selectedOptions.length > 0 && effectiveMultiple)
			? ''
			: placeholder
	)

	// Handle input change
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement

		// In single-select mode, clear selection when user starts typing
		if (hasSingleSelection) {
			selectedOptions = []
			onChange?.({value: selectedOptions})
		}

		searchText = target.value
		nav.reset()
		filterOptions(searchText)
	}

	// Clear selection for single-select mode
	function clearSingleSelection(event: MouseEvent) {
		event.stopPropagation()
		if (!disabled && !readonly) {
			selectedOptions = []
			searchText = ""
			onChange?.({value: selectedOptions})
		}
	}

	// Should show tags - only for multi-select with selections
	let showTags = $derived(selectedOptions.length > 0 && effectiveMultiple)

	// Auto-open the dropdown when initial options arrive asynchronously while the
	// input is already focused. Scenario: the control is autofocused (or the user
	// focuses it) before a background fetch has populated `options`; on focus the
	// list is still empty so nothing opens, and without this the loaded data stays
	// inaccessible until the user types (which needlessly re-runs the search).
	// Requires `showInitialOptions` (the opt-in for showing options on an empty
	// query). Gated on the empty→non-empty transition so manually closing the
	// dropdown (Escape) while focused doesn't immediately re-open it.
	let hadOptions = false
	$effect(() => {
		const hasOptions = options.length > 0
		const justLoaded = hasOptions && !hadOptions
		hadOptions = hasOptions
		if (
			justLoaded &&
			isFocused &&
			showInitialOptions &&
			!isOpen &&
			!disabled &&
			!readonly &&
			!searchText.trim() &&
			!hasSingleSelection
		) {
			filterOptions("")
		}
	})
</script>

<!-- svelte-ignore a11y_label_has_associated_control -->
<div
	{...rest}
	class="fluent-autocomplete {className}"
	style="{style}{width ? ` width: ${width};` : ''}{height ? ` height: ${height};` : ''}"
	{...id ? { id } : {}}
	{...title ? { title } : {}}
	{...ariaLabel ? { 'aria-label': ariaLabel } : {}}
>
	{#if labelTemplate}
		{@render labelTemplate()}
	{:else if label}
		<label class="fluent-field-label">
			{label}
			{#if required}<span class="required-indicator">*</span>{/if}
		</label>
	{/if}

	<div class="autocomplete-container">
		<!-- Tags above the control (tagsPosition === 'top') -->
		{#if tagsPosition === 'top' && showTags}
			<div class="selected-options">
				{#each selectedOptions as value}
					<Chip
						text={getOptionText(value)}
						variant="external"
						showRemove={!disabled && !readonly}
						onRemove={({sourceEvent: e}) => removeOption(value, e)}
					/>
				{/each}
			</div>
		{/if}

		<!-- Input container -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_role_has_required_aria_props -->
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="autocomplete-input-container"
			class:inline-mode={tagsPosition === 'inline'}
			class:focused={isFocused}
			class:disabled
			class:readonly
			class:filled={appearance === 'filled'}
			bind:this={containerElement}
			onclick={handleContainerClick}
			role="combobox"
			aria-expanded={isOpen}
			aria-haspopup="listbox"
		>
			<!-- Main box: start icon + chips + input. In inline (tags) mode this is a
				 flex:1 wrapping box; the end slot below is a separate flex box always at
				 the end, so removing/adding chips only reflows here and never moves the
				 magnifier. In non-inline mode this wrapper is display:contents (transparent),
				 leaving the single-line input + absolutely-placed icons untouched. -->
			<div class="autocomplete-input-main">
				<!-- Start icon slot (e.g. search magnifying glass) -->
				{#if start}
					<div class="input-start">
						{@render start()}
					</div>
				{/if}

			<!-- Tags INLINE (if tagsPosition === 'inline') -->
			{#if tagsPosition === 'inline' && showTags}
				{#each selectedOptions as value}
					<Chip
						text={getOptionText(value)}
						variant="inline"
						contrast={readonly || appearance === 'filled'}
						showRemove={!disabled && !readonly}
						onRemove={({sourceEvent: e}) => removeOption(value, e)}
					/>
				{/each}
			{/if}

			<!-- Native input element -->
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="autocomplete-native-input"
				bind:this={inputElement}
				value={displayValue}
				placeholder={effectivePlaceholder}
				disabled={disabled}
				readonly={readonly}
				{required}
				autofocus={autofocus}
				autocomplete={(autocomplete || 'off') as AutoFill}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				/>
			</div>

			<!-- End slot: clear button OR loading indicator OR custom end OR the built-in
				 search magnifier (in that priority). Only renders when something will show
				 inside, so the `:has(.input-end)` padding rule on the input doesn't reserve
				 space for an empty slot. -->
			{#if (hasSingleSelection && !disabled && !readonly) || showLoading || end || showSearchIcon}
				<div class="input-end">
					{#if hasSingleSelection && !disabled && !readonly}
						<button
							type="button"
							class="clear-button"
							onclick={clearSingleSelection}
							aria-label="Clear selection"
							title="Clear selection"
						>
							<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
								<path d="M2.09 2.22a.75.75 0 0 1 1.06-.13L6 4.94l2.85-2.85a.75.75 0 1 1 1.06 1.06L7.06 6l2.85 2.85a.75.75 0 1 1-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 0 1-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 0 1-.13-1.06z"/>
							</svg>
						</button>
					{:else if showLoading}
						<div class="loading-indicator">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="spinner">
								<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
								<path d="M8 1a7 7 0 0 1 7 7" stroke="currentColor" stroke-width="2" fill="none"/>
							</svg>
						</div>
					{:else if end}
						{@render end()}
					{:else if showSearchIcon}
						<button
							type="button"
							class="search-button"
							tabindex="-1"
							onclick={toggleDropdown}
							aria-label={isOpen ? "Close options" : "Show options"}
							disabled={disabled || readonly}
						>
							<!-- FluentUI ic_fluent_search_16_regular -->
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<path d="M11.0195 11.7266C10.0658 12.5217 8.83875 13 7.5 13C4.46243 13 2 10.5376 2 7.5C2 4.46243 4.46243 2 7.5 2C10.5376 2 13 4.46243 13 7.5C13 8.83875 12.5217 10.0658 11.7266 11.0195L14.8535 14.1464C15.0488 14.3417 15.0488 14.6583 14.8535 14.8536C14.6583 15.0488 14.3417 15.0488 14.1464 14.8536L11.0195 11.7266ZM12 7.5C12 5.01472 9.98528 3 7.5 3C5.01472 3 3 5.01472 3 7.5C3 9.98528 5.01472 12 7.5 12C9.98528 12 12 9.98528 12 7.5Z"/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Tags below the control (tagsPosition === 'bottom') -->
		{#if tagsPosition === 'bottom' && showTags}
			<div class="selected-options">
				{#each selectedOptions as value}
					<Chip
						text={getOptionText(value)}
						variant="external"
						showRemove={!disabled && !readonly}
						onRemove={({sourceEvent: e}) => removeOption(value, e)}
					/>
				{/each}
			</div>
		{/if}

		<!-- Dropdown options -->
		{#if isOpen && containerElement}
			<PositioningRegion
				anchor={containerElement}
				visible={isOpen}
				availableHeight
				matchWidth={!dropdownWidth}
				style="z-index: var(--fluent-z-popover, 1060); background: var(--neutral-layer-1); border: 1px solid var(--neutral-stroke-rest); border-radius: var(--fluent-border-radius-md); box-shadow: 0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12); {dropdownWidth ? `width: ${dropdownWidth}; ` : ''}{maxDropdownHeight ? `--autocomplete-listbox-max-height: ${maxDropdownHeight}; ` : ''}max-height: min(var(--available-height, 100vh), var(--autocomplete-listbox-max-height, 300px)); overflow-y: auto; overscroll-behavior: contain;"
			>
				<div class="options-list" bind:this={optionsListElement}>
					{#if headerContent}
						<div class="options-header">
							{@render headerContent()}
						</div>
					{/if}
					{#if filteredOptions.length > 0}
						{#each filteredOptions as option, index}
							<button
								type="button"
								class="option-item"
								class:highlighted={index === nav.index}
								class:disabled={option.disabled}
								onclick={() => selectOption(option)}
								disabled={option.disabled}
							>
								{#if optionTemplate}
									{@render optionTemplate(option)}
								{:else}
									{option.label}
								{/if}
							</button>
						{/each}
					{:else if showOverlayOnEmptyResults}
						<div class="no-results">No results found</div>
					{/if}
					{#if footerContent}
						<div class="options-footer">
							{@render footerContent()}
						</div>
					{/if}
				</div>
			</PositioningRegion>
		{/if}

		<!-- Max selections message - Don't show for single-select -->
		{#if isMaxReached && !isSingleSelect}
			<div class="max-message">
				Maximum {maxSelectionCount} selection{maxSelectionCount !== 1 ? 's' : ''} reached
			</div>
		{/if}
	</div>
</div>

<style>
	.fluent-autocomplete {
		display: flex;
		flex-direction: column;
	}

	.required-indicator {
		color: var(--fluent-color-danger-foreground, #d13438);
		margin-inline-start: 0.25rem;
	}

	.autocomplete-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		position: relative;
	}

	/* ===== Input Container (base styles) ===== */
	.autocomplete-input-container {
		display: flex;
		align-items: center;
		position: relative;
		box-sizing: border-box;
		min-height: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
	}

	/* Main box (start icon + chips + input). Non-inline: transparent, so the
	   single-line input keeps its full-width layout and the absolutely-placed
	   start/end icons are unaffected. Inline: a flex:1 box whose chips + input
	   wrap internally, sitting beside the separate end-slot box. */
	.autocomplete-input-main {
		display: contents;
	}

	.autocomplete-input-container.inline-mode .autocomplete-input-main {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		/* Vertical padding lives here (not on the container) so wrapped chip rows get
		   breathing room off the top/bottom edges, while single-row height still lands
		   on the control height — padding the container instead would clash with the
		   fixed control-height end-slot square and grow the single-row control. */
		padding-block: calc(var(--design-unit, 4) * 1px);
	}

	/* ===== Input Container: Inline Mode (mimics fluent-text-field) ===== */
	/* Two side-by-side flex boxes: the wrapping main box (chips + input) and the
	   end slot (magnifier/clear/loading). nowrap here so the end slot stays a
	   separate box always at the end; the chips wrap inside the main box instead. */
	.autocomplete-input-container.inline-mode {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 4px;
		min-height: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		box-sizing: border-box;
		padding: 0 8px;
		background: var(--neutral-fill-input-rest, #ffffff);
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		cursor: text;
		transition: border-color 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
	}

	.autocomplete-input-container.inline-mode:hover:not(.disabled):not(.readonly) {
		background: var(--neutral-fill-input-hover, #f5f5f5);
	}

	.autocomplete-input-container.inline-mode.focused:not(.disabled) {
		/* FluentUI 2 textfield focus: thin gray border on top/sides stays put,
		   bottom edge becomes accent + visually 2px thick. We use an inset box-shadow
		   to add the 1px instead of bumping border-bottom-width — that would shift
		   the input's content by 1px on focus. */
		border-bottom-color: var(--accent-fill-rest, #0078d4);
		box-shadow: inset 0 -1px 0 0 var(--accent-fill-rest, #0078d4);
	}

	.autocomplete-input-container.inline-mode.disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background: var(--neutral-fill-input-rest, #ffffff);
	}

	.autocomplete-input-container.inline-mode.readonly {
		background: var(--neutral-fill-secondary-rest, #f5f5f5);
	}

	/* Filled appearance for inline mode */
	.autocomplete-input-container.inline-mode.filled {
		background: var(--neutral-fill-secondary-rest, #f5f5f5);
		border: none;
		border-bottom: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px) calc(var(--control-corner-radius, 4) * 1px) 0 0;
	}

	.autocomplete-input-container.inline-mode.filled:hover:not(.disabled):not(.readonly) {
		background: var(--neutral-fill-secondary-hover, #ebebeb);
	}

	.autocomplete-input-container.inline-mode.filled.focused:not(.disabled) {
		border-bottom-color: var(--accent-fill-rest, #0078d4);
		box-shadow: 0 1px 0 0 var(--accent-fill-rest, #0078d4);
	}

	/* Selection chips (inline + above/below) are rendered by the shared Chip
	   component (Chip.svelte); their styling and `--fluent-chip-*` tokens live
	   there. Inline chips pass contrast={readonly || filled} so they stay visible
	   when the field background matches the chip fill. */

	/* ===== Native Input ===== */
	.autocomplete-native-input {
		flex: 1;
		min-width: 60px;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 14px;
		line-height: 20px;
		color: var(--neutral-foreground-rest, #242424);
		padding: 0;
	}

	.autocomplete-input-container.inline-mode .autocomplete-native-input {
		align-self: stretch;
	}

	.autocomplete-native-input::placeholder {
		color: var(--neutral-foreground-hint, #717171);
	}

	.autocomplete-native-input:disabled {
		cursor: not-allowed;
	}

	/* Non-inline mode: make input full width */
	.autocomplete-input-container:not(.inline-mode) .autocomplete-native-input {
		padding: 4px 8px;
		height: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		box-sizing: border-box;
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		background: var(--neutral-fill-input-rest, #ffffff);
		width: 100%;
	}

	.autocomplete-input-container:not(.inline-mode) .autocomplete-native-input:hover:not(:disabled) {
		background: var(--neutral-fill-input-hover, #f5f5f5);
	}

	.autocomplete-input-container:not(.inline-mode) .autocomplete-native-input:focus {
		/* See comment on `.inline-mode.focused` — same FluentUI bottom-emphasis pattern. */
		border-bottom-color: var(--accent-fill-rest, #0078d4);
		box-shadow: inset 0 -1px 0 0 var(--accent-fill-rest, #0078d4);
	}

	.autocomplete-input-container:not(.inline-mode).filled .autocomplete-native-input {
		background: var(--neutral-fill-secondary-rest, #f5f5f5);
		border: none;
		border-bottom: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px) calc(var(--control-corner-radius, 4) * 1px) 0 0;
	}

	/* ===== Input Start Slot ===== */
	.input-start {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding-inline-end: 4px;
		color: var(--neutral-foreground-hint, #707070);
	}

	/* ===== Input End Slot ===== */
	/* A fixed control-height square that centers whatever it holds. The clear
	   button, loading spinner, custom end and the search magnifier are all
	   different sizes, so without a fixed centering box the glyph would land at a
	   slightly different spot for each — swapping between them (e.g. loading →
	   magnifier) then looks like the icon jumps. Centering inside a constant square
	   pins every variant to the same point. */
	.input-end {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		inline-size: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		block-size: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		color: var(--neutral-foreground-hint, #707070);
	}

	/* Inline (chips) mode: the end slot — and the toggle button inside it — stretch
	   to the full control height, so the toggle hitbox spans the whole input even
	   when it has grown taller from multiple wrapped chip rows. The glyph stays
	   centered via the flex centering below, but the clickable area is now full
	   height instead of a small centered square. */
	.autocomplete-input-container.inline-mode .input-end {
		align-self: stretch;
		block-size: auto;
		/* Reclaim the container's inline-end padding so the icon sits flush to the
		   control edge, matching Combobox's toggle (which uses the same negative
		   margin). Without this the icon is one padding-step (8px) farther in. */
		margin-inline-end: calc(var(--design-unit, 4) * -2 * 1px);
	}

	.autocomplete-input-container.inline-mode .search-button,
	.autocomplete-input-container.inline-mode .clear-button {
		height: 100%;
	}

	/* Non-inline mode: position end slot inside input, flush to the trailing edge so
	   the icon sits the same distance from the edge as Combobox's toggle (the icon is
	   centered in a control-height box, so flush ≈ 16px glyph inset). */
	.autocomplete-input-container:not(.inline-mode) .input-end {
		position: absolute;
		inset-inline-end: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.autocomplete-input-container:not(.inline-mode) .input-start {
		position: absolute;
		inset-inline-start: 8px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Non-inline mode: pad the input so its text doesn't sit underneath the icons */
	.autocomplete-input-container:not(.inline-mode):has(.input-start) .autocomplete-native-input {
		padding-inline-start: 32px;
	}

	/* The end slot is a control-height square pinned to the inline-end; reserve
	   enough room that the text never runs under it (same clearance for every
	   icon variant, since they now share one box). */
	.autocomplete-input-container:not(.inline-mode):has(.input-end) .autocomplete-native-input {
		padding-inline-end: 44px;
	}

	/* ===== Selected Options Container (above/below modes) ===== */
	.selected-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.25rem 0;
		max-height: 120px;
		overflow-y: auto;
	}

	/* ===== Built-in Search Icon (toggles the dropdown) =====
	   Full-height square hitbox so the whole toggle area is clickable, not just
	   the 16px glyph (matching the Combobox toggle). No hover — like Microsoft. */
	.search-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		height: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--accent-fill-rest, #0078d4);
	}

	.search-button:disabled {
		cursor: not-allowed;
	}

	/* ===== Clear Button ===== */
	.clear-button {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral-foreground-hint, #717171);
		border-radius: var(--fluent-border-radius-sm);
		transition: background 0.1s ease, color 0.1s ease;
	}

	.clear-button:hover {
		background: var(--neutral-fill-secondary-hover, #e0e0e0);
		color: var(--neutral-foreground-rest, #242424);
	}

	.clear-button:focus {
		outline: 1px solid var(--accent-fill-rest, #0078d4);
		outline-offset: 2px;
	}

	/* ===== Loading Indicator ===== */
	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ===== Dropdown Options ===== */
	.options-list {
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
		min-width: 200px;
	}

	.options-header {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		margin-bottom: 0.25rem;
	}

	.options-footer {
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		margin-top: 0.25rem;
	}

	.option-item {
		background: transparent;
		border: none;
		padding: 0.5rem 0.75rem;
		text-align: start;
		cursor: pointer;
		border-radius: var(--fluent-border-radius-md);
		color: var(--neutral-foreground-rest, #242424);
		font-size: 0.875rem;
	}

	.option-item:hover:not(.disabled) {
		background: var(--neutral-fill-secondary-hover, #e0e0e0);
	}

	.option-item.highlighted {
		background: var(--neutral-fill-secondary-hover, #e0e0e0);
	}

	.option-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-results {
		padding: 1rem;
		text-align: center;
		color: var(--neutral-foreground-hint, #717171);
		font-size: 0.875rem;
	}

	.max-message {
		font-size: 0.875rem;
		color: var(--neutral-foreground-hint, #717171);
		padding: 0.25rem 0.5rem;
	}
</style>
