<!-- @component
Custom single / multi select. Single mode: a trigger button with a portalled dropdown listbox; multi mode: an always-expanded inline listbox. Options are `<Option>` children.

```svelte
<Select label="Country" bind:value placeholder="Pick one">
	<Option value="cz">Czechia</Option>
	<Option value="sk">Slovakia</Option>
</Select>
```
-->

<!--
 * Select Component (rewrite)
 *
 * Custom Select that replaces the previous <fluent-select> wrapper.
 *
 * Single mode: custom combobox-style trigger + portalled listbox via
 * PositioningRegion. The listbox is capped to `maxDropdownHeight` and to the
 * room PositioningRegion measured to the viewport edge, so it never runs off-screen.
 *
 * Multi mode: always-expanded inline listbox (matches Blazor
 * FluentSelect, which renders multi-select inline because the underlying
 * web component doesn't support a multi-select dropdown).
 *
 * <Option> children work unchanged — they read selection via the
 * 'selected-options' context, which this component provides.
-->

<script lang="ts">
	import {selectedOptionsContext} from "../contexts.js"
	import type {Snippet} from "svelte"
	import {untrack, tick} from "svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import {FIELD_POPUP_OFFSET} from "../helpers/floating.js"
	import FieldLabel from "./FieldLabel.svelte"
	import type {SelectedOptionSvelteContext} from "../types/combobox.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {startsWithText, type SearchBehavior} from "../helpers/text.js"
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
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {SelectLabels} from "../i18n/labels.js"

	/** The option the user picked, as passed to `onChange`. */
	type SelectChangeOption = {
		value: string
		text: string
		data?: Record<string, unknown>
	}

	type OwnProps = {
		/** Id of the trigger (single) or inline listbox (multi); also the label's `for`. */
		id?: string
		/** Extra CSS class on the trigger / inline listbox. */
		class?: string
		/** Inline style on the trigger / inline listbox. */
		style?: string
		/** Single mode: dropdown open state. Bindable. */
		open?: boolean
		/** Force the dropdown above/below the trigger. Default: auto (flip()). */
		position?: "top" | "bottom"
		/** Multi-select: renders an inline listbox and `value` becomes `string[]`. Default: `false`. */
		multiple?: boolean
		/** Disables the control. Default: `false`. */
		disabled?: boolean
		/** How type-ahead compares typed keys with option labels: `normalized` (default)
		 * ignores case and diacritics (`a` finds `Ávila`), `case-insensitive` ignores
		 * case only, `exact` matches both. */
		searchBehavior?: SearchBehavior
		/** Non-editable: the value shows but can't be changed (dropdown won't open,
		 * options can't be toggled). Unlike `disabled`, it stays focusable and un-dimmed. */
		readonly?: boolean
		/** Visual style of the trigger / listbox. Default: `outline`. */
		appearance?: "outline" | "filled"
		/** Adds `*` to the label and `required` to the hidden form input. Default: `false`. */
		required?: boolean
		/** Single mode: focus the trigger on mount. Default: `false`. */
		autofocus?: boolean
		/** Single mode: renders a hidden `<input name>` so the value takes part in form submission. */
		name?: string
		/** Selected value. String in single mode, string[] in multi mode. */
		value?: string | string[]
		/** Text rendered in a `<label>` above the control; also the default `aria-label`. */
		label?: string
		/** Accessible name; falls back to `label`. */
		ariaLabel?: string
		/** Tooltip text (`title`) on the trigger / inline listbox. */
		title?: string
		/** CSS width of the control. */
		width?: string
		/** Multi mode: explicit height for the inline listbox. */
		height?: string
		/** Single mode: cap the dropdown height (e.g. "200px", "50vh"; sets `--fluent-select-dropdown-max-height`).
		 * Default: `300px`. The dropdown is always also capped to the room left to the viewport edge. */
		maxDropdownHeight?: string
		/** Single mode: width of the dropdown listbox (e.g. "360px", "24rem").
		 * When unset the listbox matches the control width; when set it uses this
		 * width instead (and stops matching), so the list can be wider or narrower. */
		dropdownWidth?: string
		/** Multi mode: cap visible option rows, enables internal scroll. */
		maxVisibleOptionCount?: number
		/** Single mode: text shown in the trigger while nothing is selected. */
		placeholder?: string
		/** Single mode: text shown in the trigger when `value` is set but no option has it
		 * (e.g. options that load later). Default: nothing — the trigger shows `placeholder`. */
		valueText?: string
		/** Single mode: Tab on the open list picks the highlighted option before focus moves on. */
		selectValueOnTab?: boolean
		/** Single mode: a clear (×) button before the chevron while a value is selected, shown
		 * while the trigger is hovered or focused; Delete / Backspace on the trigger clears too.
		 * Default: `true`. */
		showClear?: boolean
		/** Overrides of the built-in text (`svelteFluentUI.select.*` keys) for this instance. */
		labels?: SelectLabels
		/** Single mode: extra class on the portalled dropdown listbox (it renders outside the
		 * component, so a parent's scoped styles can't reach it otherwise). */
		dropdownClass?: string
		/** Single mode: for hosting the control inside a component that owns the keyboard and
		 * draws the frame, such as a QuickGrid cell. The trigger is borderless and transparent
		 * and fills its container; ArrowUp / ArrowDown on the closed trigger don't open the list
		 * (they bubble to the host). Keys the control handles are `preventDefault`ed, so a host
		 * can skip those. */
		embedded?: boolean
		/** Custom label content, rendered after `label`. */
		labelTemplate?: Snippet
		/** Single mode: replaces the chevron icon in the trigger. */
		indicatorTemplate?: Snippet
		/** The `<Option>` / `<OptionGroup>` items. */
		children?: Snippet
		/** Fires when the user changes the selection. `value` is the new bound value (array when `multiple`). */
		onChange?: (ctx: {value: string | string[]; option?: SelectChangeOption}) => void
		/** Single mode: fires on every open/close transition of the dropdown after mount (user or `bind:open`); not on initial render. */
		onOpenChange?: (ctx: {open: boolean}) => void
	}

	/** Other native attributes and events go to the root `<div>` (`display: contents`); `id`, `class`, `style` and `title` go to the trigger / inline listbox. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		class: className = "",
		style = "",
		open = $bindable(undefined),
		position = undefined,
		multiple = false,
		disabled = false,
		searchBehavior = "normalized",
		readonly = false,
		appearance = "outline",
		required = false,
		autofocus = false,
		name = undefined,
		value = $bindable(),
		label = undefined,
		ariaLabel = undefined,
		title = undefined,
		width = undefined,
		height = undefined,
		maxDropdownHeight = undefined,
		dropdownWidth = undefined,
		maxVisibleOptionCount = undefined,
		placeholder = undefined,
		valueText = undefined,
		selectValueOnTab = false,
		showClear = true,
		labels: labelsProp = undefined,
		dropdownClass = undefined,
		embedded = false,
		labelTemplate = undefined,
		indicatorTemplate = undefined,
		children = undefined,
		onChange = undefined,
		onOpenChange = undefined,
		...rest
	}: Props = $props()

	// ---------- Selection state (shared with <Option> via context) ----------
	// We provide our own context instead of createSelectedOptions because the
	// single-mode UX is "click sets value", not "click toggles" — the existing
	// store would deselect when clicking the already-selected option.

	function normalize(v: typeof value): string[] {
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
		set(v) {
			selectionState.value = Array.isArray(v) ? [...v] : v ? [v] : []
		},
		toggle(val: string) {
			if (val == null) return
			if (readonly) return // readonly: block user-driven selection (Option click path)
			if (multiple) {
				const cur = selectionState.value
				selectionState.value = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]
			} else {
				selectionState.value = [val]
			}
		}
	}

	selectedOptionsContext.set(ctx)

	// prop value -> internal state
	$effect(() => {
		const normalized = normalize(value)
		const current = untrack(() => selectionState.value)
		if (normalized.length !== current.length || normalized.some((v, i) => v !== current[i])) {
			selectionState.value = normalized
		}
	})

	// internal state -> prop value
	$effect(() => {
		const sel = selectionState.value
		untrack(() => {
			if (multiple) {
				const cur = Array.isArray(value) ? value : value != null ? [value] : []
				if (sel.length !== cur.length || sel.some((v, i) => v !== cur[i])) {
					value = [...sel]
				}
			} else {
				const next = sel[0] ?? ""
				if (value !== next) value = next
			}
		})
	})

	const selectedSingle = $derived<string>(selectionState.value[0] ?? "")

	// ---------- Open / close (single mode) ----------
	let isOpen = $state(false)

	// Allow external control via `open` prop (binds both ways).
	$effect(() => {
		if (open !== undefined && open !== untrack(() => isOpen)) {
			isOpen = open
		}
	})
	$effect(() => {
		if (open !== undefined && isOpen !== untrack(() => open)) {
			open = isOpen
		}
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

	let triggerEl: HTMLButtonElement | undefined = $state()
	let listEl: HTMLDivElement | undefined = $state()
	let inlineListEl: HTMLDivElement | undefined = $state()
	// Single-mode hidden mirror of <Option> children. Stays mounted even when
	// the dropdown is closed, so getOptionText() can resolve the trigger's
	// display text from `value` (the portalled listEl unmounts on close).
	let sourceEl: HTMLDivElement | undefined = $state()
	let typeAheadBuffer = ""
	let typeAheadTimer: ReturnType<typeof setTimeout> | undefined

	function enabledOptionEls(root: HTMLElement | undefined): HTMLElement[] {
		return getOptionEls(root).filter((el) => !el.hasAttribute("disabled"))
	}

	// Keyboard cursor over the enabled options of the open dropdown.
	const nav = new ListNav({
		count: () => enabledOptionEls(listEl).length,
		itemAt: (i) => enabledOptionEls(listEl)[i],
		pageSize: () => listPageSize(listEl, enabledOptionEls(listEl))
	})

	// Multi mode: keyboard cursor over the inline listbox. Focus stays on the
	// listbox; the highlighted row is announced via aria-activedescendant.
	const inlineNav = new ListNav({
		count: () => enabledOptionEls(inlineListEl).length,
		itemAt: (i) => enabledOptionEls(inlineListEl)[i],
		pageSize: () => listPageSize(inlineListEl, enabledOptionEls(inlineListEl))
	})

	function getOptionText(val: string): string {
		const el = findOption(multiple ? [inlineListEl] : [listEl, sourceEl], val)
		return el ? optionLabel(el) : ""
	}

	function openDropdown() {
		if (disabled || multiple || readonly) return
		isOpen = true
		tick().then(() => {
			const i = enabledOptionEls(listEl).findIndex((el) => optionValue(el) === selectedSingle)
			nav.set(Math.max(i, 0))
		})
	}

	// Escape goes to the topmost open layer (helpers/layer-stack.ts), so inside a
	// Dialog/Panel it closes this dropdown first and leaves the container open.
	$effect(() => {
		if (isOpen) return pushLayer({onEscape: () => closeDropdown()})
	})

	function closeDropdown(refocus = true) {
		if (!isOpen) return
		isOpen = false
		nav.reset()
		typeAheadBuffer = ""
		if (refocus) triggerEl?.focus()
	}

	function toggleDropdown() {
		if (isOpen) closeDropdown()
		else openDropdown()
	}

	// Keyboard-path selection: explicit call from key handlers when there's no
	// click event to ride. Mutates selection via ctx.toggle (which has the right
	// mode-aware semantics), fires onchange, and closes in single mode.
	function selectByValue(val: string, el?: HTMLElement) {
		if (readonly) return
		const optEl = el ?? findOption([multiple ? inlineListEl : listEl], val)

		const before = [...selectionState.value]
		ctx.toggle(val)
		emitChange(before, optEl)

		if (!multiple) closeDropdown()
	}

	// Click-path: Option.svelte's own onclick already called ctx.toggle by the
	// time this bubble-phase handler runs (option is a descendant of the
	// listbox). We deliberately do NOT call ctx.toggle here — doing so would
	// double-toggle in multi mode and cancel the user's click. We only handle
	// the post-selection side effects: onchange + close-on-single.
	// Option.svelte toggles the selection in its own (delegated) click handler,
	// before handleListClick runs; capture the state first to detect a change.
	let selectionBeforeClick: string[] = []
	function snapshotSelection() {
		selectionBeforeClick = [...selectionState.value]
	}

	const t = useTranslations("select", () => labelsProp)

	// `showClear`: the × (or Delete / Backspace on the trigger) empties the value.
	const canClear = $derived(showClear && !disabled && !readonly && selectedSingle !== "")
	function clearValue(ev?: Event) {
		ev?.stopPropagation()
		if (!canClear) return
		const before = [...selectionState.value]
		selectionState.value = []
		emitChange(before, undefined)
		closeDropdown()
		triggerEl?.focus()
	}

	function emitChange(before: string[], optEl: HTMLElement | undefined) {
		const after = selectionState.value
		if (after.length === before.length && after.every((v, i) => v === before[i])) return
		onChange?.({
			value: multiple ? [...after] : (after[0] ?? ""),
			option: optEl ? {value: optionValue(optEl), text: optionLabel(optEl), data: optionData(optEl)} : undefined
		})
	}

	function handleListClick(ev: MouseEvent) {
		const target = ev.target as HTMLElement | null
		if (!target) return
		const optEl = target.closest(OPTION_SELECTOR) as HTMLElement | null
		if (!optEl) return
		// Multi mode: the clicked row becomes the keyboard cursor too.
		if (multiple && !optEl.hasAttribute("disabled")) {
			inlineNav.index = enabledOptionEls(inlineListEl).indexOf(optEl)
		}
		if (readonly) return
		if (optEl.hasAttribute("disabled")) {
			ev.preventDefault()
			return
		}

		emitChange(selectionBeforeClick, optEl)

		if (!multiple) closeDropdown()
	}

	// ---------- Keyboard (single mode) ----------
	function typeAheadJump(ch: string) {
		clearTimeout(typeAheadTimer)
		typeAheadBuffer += ch
		typeAheadTimer = setTimeout(() => {
			typeAheadBuffer = ""
		}, 750)

		const opts = enabledOptionEls(listEl)
		if (opts.length === 0) return
		const start = nav.index >= 0 ? nav.index : 0
		const n = opts.length
		const startsWith = (el: HTMLElement | undefined, needle: string) =>
			!!el && startsWithText(optionLabel(el), needle, searchBehavior)

		// Mode picking:
		// - "Repeat" (buffer="cc"|"ccc"): user is cycling — advance past current.
		// - "Single re-press" (buffer="c", current option already starts with "c"):
		//   treat like cycle too, so c-pause-c-pause-c advances through matches
		//   even when the buffer timed out between presses.
		// - "Prefix" (anything else): land on the first option matching the buffer
		//   from the current position.
		const isRepeat = typeAheadBuffer.length > 1 && typeAheadBuffer.split("").every((c) => c === typeAheadBuffer[0])
		const isSingleRepress = typeAheadBuffer.length === 1 && nav.index >= 0 && startsWith(opts[start], typeAheadBuffer)
		const advance = isRepeat || isSingleRepress
		const needle = isRepeat ? typeAheadBuffer[0] : typeAheadBuffer
		const startAt = advance ? (start + 1) % n : start

		for (let i = 0; i < n; i++) {
			const idx = (startAt + i) % n
			if (startsWith(opts[idx], needle)) {
				nav.set(idx)
				return
			}
		}
	}

	function handleTriggerKeydown(ev: KeyboardEvent) {
		if (disabled || readonly) return

		if (!isOpen) {
			switch (ev.key) {
				case "Delete":
				case "Backspace":
					if (!canClear) return
					ev.preventDefault()
					clearValue()
					return
				case "ArrowDown":
				case "ArrowUp":
					// Embedded: the host (a grid cell) moves on closed-list arrows
					if (embedded) return
					ev.preventDefault()
					openDropdown()
					return
				case "PageDown":
				case "PageUp":
				case "Enter":
				case " ":
					ev.preventDefault()
					openDropdown()
					return
			}
			// Type-ahead on the closed trigger: open + jump-highlight (no commit).
			if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
				ev.preventDefault()
				// With nothing selected the open highlight on row 0 isn't a pick, so the first
				// press must land on the first match rather than step past it.
				// (An empty value — a "Select…" placeholder row — counts as nothing selected.)
				const hasSelection = selectedSingle !== ""
				openDropdown()
				tick().then(() => {
					if (!hasSelection) nav.reset()
					typeAheadJump(ev.key)
				})
			}
			return
		}

		if (nav.handleKey(ev)) return
		switch (ev.key) {
			case "Enter":
			case " ": {
				ev.preventDefault()
				const el = enabledOptionEls(listEl)[nav.index]
				if (el) selectByValue(optionValue(el), el)
				break
			}
			case "Escape":
				ev.preventDefault()
				closeDropdown()
				break
			case "Tab": {
				// No preventDefault: focus still moves on after the pick
				const el = selectValueOnTab ? enabledOptionEls(listEl)[nav.index] : undefined
				if (el) selectByValue(optionValue(el), el)
				else closeDropdown(false)
				break
			}
			default:
				if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
					ev.preventDefault()
					typeAheadJump(ev.key)
				}
		}
	}

	// ---------- Visual highlight sync ----------
	// Reflects the cursor to a data-highlighted attribute on the corresponding
	// option element, so CSS can style the keyboard-cursor row distinctly from
	// hover and selected states.
	// The highlighted row's id feeds `aria-activedescendant` on the trigger, so
	// screen readers follow the cursor while focus stays on the trigger.
	let activeOptionId = $state<string | null>(null)
	$effect(() => {
		const el = enabledOptionEls(listEl)[nav.index]
		markHighlighted(listEl, el)
		activeOptionId = isOpen && el ? el.id || null : null
	})

	// Multi mode: same, on the inline listbox.
	let inlineActiveOptionId = $state<string | null>(null)
	$effect(() => {
		const el = enabledOptionEls(inlineListEl)[inlineNav.index]
		markHighlighted(inlineListEl, el)
		inlineActiveOptionId = el ? el.id || null : null
	})

	// Multi mode: focus lands on the first selected (else first) row.
	function handleInlineFocus() {
		if (inlineNav.index >= 0) return
		const opts = enabledOptionEls(inlineListEl)
		const i = opts.findIndex((el) => selectionState.value.includes(optionValue(el)))
		inlineNav.set(Math.max(i, 0))
	}

	// Multi mode keyboard: arrows / Page / Home / End move the cursor, Space / Enter toggle.
	function handleInlineKeydown(ev: KeyboardEvent) {
		if (disabled) return
		if (inlineNav.handleKey(ev)) return
		if (ev.key !== " " && ev.key !== "Enter") return
		ev.preventDefault()
		const el = enabledOptionEls(inlineListEl)[inlineNav.index]
		if (el) selectByValue(optionValue(el), el)
	}

	// ---------- Close on outside pointerdown / focus move ----------
	// Focus moving outside (Tab-ing away, a modal dialog opening) closes too —
	// otherwise the popover floats above the modal. No refocus: that would yank
	// focus back out of whatever just opened.
	$effect(() => {
		if (!isOpen) return
		return dismissOnOutside(
			() => [triggerEl, listEl],
			() => closeDropdown(false)
		)
	})

	// ---------- Multi-mode height calculation (maxVisibleOptionCount) ----------
	let multiCalcHeight: string | undefined = $state()
	$effect(() => {
		if (!multiple || !inlineListEl || height) {
			multiCalcHeight = undefined
			return
		}
		if (maxVisibleOptionCount === undefined) {
			multiCalcHeight = undefined
			return
		}
		queueMicrotask(() => {
			if (!inlineListEl) return
			const opts = getOptionEls(inlineListEl)
			if (opts.length === 0) return
			const first = opts[0]
			const rowH = parseInt(window.getComputedStyle(first).height) || first.offsetHeight || 32
			const visible = Math.min(opts.length, maxVisibleOptionCount)
			// + 8px for top/bottom padding of the listbox.
			multiCalcHeight = `${visible * rowH + 8}px`
		})
	})

	// ---------- Computed styles ----------
	const triggerStyle = $derived(() => {
		const parts: string[] = []
		if (width) parts.push(`width: ${width}`)
		return parts.join("; ")
	})

	const multiListStyle = $derived(() => {
		const parts: string[] = []
		if (width) parts.push(`width: ${width}`)
		if (height) parts.push(`height: ${height}`)
		else if (multiCalcHeight) parts.push(`height: ${multiCalcHeight}`)
		return parts.join("; ")
	})

	// Forced position support: prop -> Floating UI placement.
	const forcedPlacement = $derived<"top" | "bottom" | undefined>(position)

	const displayText = $derived(getOptionText(selectedSingle) || (selectedSingle ? (valueText ?? "") : ""))

	// Stable fallback so label / aria-controls wiring works without an explicit id.
	const uid = $props.id()
	const controlId = $derived(id ?? `fluent-select-${uid}`)
	const listboxId = $derived(`${controlId}-listbox`)
</script>

<!-- Single DOM root so consumers see one element, not 2–4 siblings. Uses
     display:contents so it's transparent to flex/grid layout in the parent. -->
<div {...rest} class="select-root">
	<FieldLabel for={controlId} {label} {labelTemplate} {required} />

	{#if multiple}
		<!-- ===== Multi mode: always-expanded inline listbox ===== -->
		<div
			bind:this={inlineListEl}
			id={controlId}
			role="listbox"
			tabindex={disabled ? -1 : 0}
			aria-multiselectable="true"
			aria-readonly={readonly ? "true" : null}
			aria-disabled={disabled ? "true" : null}
			aria-required={required ? "true" : null}
			aria-activedescendant={inlineActiveOptionId}
			aria-label={ariaLabel || label}
			class="select-listbox-inline {appearance} {className}"
			class:disabled
			class:readonly
			style={(multiListStyle() ? multiListStyle() + "; " : "") + style}
			{title}
			onclickcapture={snapshotSelection}
			onclick={handleListClick}
			onfocus={handleInlineFocus}
			onkeydown={handleInlineKeydown}
		>
			{@render children?.()}
		</div>
	{:else}
		<!-- ===== Single mode: trigger + portalled dropdown ===== -->

		<!-- Hidden mirror of <Option> children so getOptionText() can resolve the
	     selected value's display text when the dropdown is closed. Aria-hidden
	     so screen readers don't see two copies of the options. -->
		<div bind:this={sourceEl} class="select-options-source" aria-hidden="true">
			{@render children?.()}
		</div>

		<!-- svelte-ignore a11y_autofocus -->
		<button
			bind:this={triggerEl}
			type="button"
			id={controlId}
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={isOpen ? "true" : "false"}
			aria-controls={listboxId}
			aria-activedescendant={activeOptionId}
			aria-label={ariaLabel || label}
			aria-readonly={readonly ? "true" : null}
			aria-required={required ? "true" : null}
			{disabled}
			{autofocus}
			{title}
			class="select-trigger fluent-field-control fluent-field-clear-host {appearance} {className}"
			class:open={isOpen}
			class:readonly
			class:embedded
			style={(triggerStyle() ? triggerStyle() + "; " : "") + style}
			onclick={toggleDropdown}
			onkeydown={handleTriggerKeydown}
		>
			<span class="select-trigger-value" class:placeholder={!displayText}>
				{displayText || placeholder || ""}
			</span>
			<!-- A <button> can't nest another; the × is a pointer target only (the
		     trigger takes Delete / Backspace) and keeps focus on the trigger. -->
			{#if canClear}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<span
					class="select-clear fluent-field-clear"
					aria-hidden="true"
					title={t("clearTooltip")}
					onpointerdown={(ev) => ev.preventDefault()}
					onclick={clearValue}
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<path
							d="M2.09 2.22a.75.75 0 0 1 1.06-.13L6 4.94l2.85-2.85a.75.75 0 1 1 1.06 1.06L7.06 6l2.85 2.85a.75.75 0 1 1-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 0 1-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 0 1-.13-1.06z"
						/>
					</svg>
				</span>
			{/if}
			<span class="select-trigger-indicator" aria-hidden="true">
				{#if indicatorTemplate}
					{@render indicatorTemplate()}
				{:else}
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<path
							d="M2.22 4.47a.75.75 0 0 1 1.06 0L6 7.19l2.72-2.72a.75.75 0 1 1 1.06 1.06L6.53 8.78a.75.75 0 0 1-1.06 0L2.22 5.53a.75.75 0 0 1 0-1.06Z"
						/>
					</svg>
				{/if}
			</span>
		</button>

		{#if isOpen && triggerEl}
			<PositioningRegion
				anchor={triggerEl}
				offset={FIELD_POPUP_OFFSET}
				visible={isOpen}
				position={forcedPlacement}
				matchWidth={!dropdownWidth}
			>
				<!-- The keyboard stays on the trigger (aria-activedescendant); the list takes clicks only. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					bind:this={listEl}
					id={listboxId}
					role="listbox"
					tabindex="-1"
					aria-label={ariaLabel || label}
					class={["select-listbox-popover fluent-popup-surface", dropdownClass]}
					style={[
						dropdownWidth ? `width: ${dropdownWidth}` : "",
						maxDropdownHeight ? `--fluent-select-dropdown-max-height: ${maxDropdownHeight}` : ""
					]
						.filter(Boolean)
						.join("; ") || undefined}
					onclickcapture={snapshotSelection}
					onclick={handleListClick}
				>
					{@render children?.()}
				</div>
			</PositioningRegion>
		{/if}

		<!-- Hidden input to participate in HTML form submission. -->
		{#if name}
			<input type="hidden" {name} {required} value={selectedSingle} />
		{/if}
	{/if}
</div>

<style>
	/* Transparent to layout — wraps label + trigger + mirror + portal anchor
	 * so consumers only see one root, but parent flex/grid still lays out the
	 * inner elements directly. */
	.select-root {
		display: contents;
	}

	/* ===== Trigger button (single mode) ===== */
	.select-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-family: inherit;
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
		color: var(--neutral-foreground-rest, #242424);
		cursor: pointer;
		text-align: start;
		min-width: 200px;
	}

	/* Box, hover, focus underline, filled, disabled, readonly and embedded come
	 * from the shared `.fluent-field-control` primitive (_primitives.scss). */
	.select-trigger:focus-visible {
		outline: none;
	}

	/* Embedded (e.g. a QuickGrid cell): the primitive drops the frame; the
	 * trigger also inherits the host's text and tightens its gap. */
	.select-trigger.embedded {
		min-width: 0;
		gap: 4px;
		font: inherit;
		color: inherit;
	}

	.select-trigger-value {
		flex: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.select-trigger-value.placeholder {
		color: var(--neutral-foreground-hint, #717171);
	}

	.select-trigger-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral-foreground-hint, #717171);
		flex-shrink: 0;
	}

	/* Hidden mirror of options for trigger-text lookup (single mode). */
	.select-options-source {
		display: none;
	}

	/* ===== Dropdown listbox (single mode, portalled) ===== */
	:global(.select-listbox-popover) {
		display: flex;
		flex-direction: column;
		/* Surface (background, border, radius, shadow) = `.fluent-popup-surface`. */
		padding: calc(var(--design-unit, 4) * 1px);
		/* `maxDropdownHeight` (default 300px) or the room PositioningRegion measured, whichever is smaller. */
		max-height: min(var(--fluent-select-dropdown-max-height, 300px), var(--fluent-popup-available-height, 100vh));
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
	}

	/* Option row layout, hover, keyboard highlight (data-highlighted), selected
	 * and disabled styling now live in Option.svelte, scoped to the option
	 * element so they apply in both the portalled popover and the inline list. */

	/* ===== Inline listbox (multi mode) ===== */
	.select-listbox-inline {
		display: flex;
		flex-direction: column;
		background: var(--neutral-fill-input-rest, #ffffff);
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		padding: calc(var(--design-unit, 4) * 1px);
		overflow-y: auto;
		overscroll-behavior: contain;
		box-sizing: border-box;
	}

	.select-listbox-inline.filled {
		background: var(--neutral-fill-secondary-rest, #f5f5f5);
		border: none;
		border-bottom: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: calc(var(--control-corner-radius, 4) * 1px) calc(var(--control-corner-radius, 4) * 1px) 0 0;
	}

	.select-listbox-inline.disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	/* Readonly multi-select: value shows but options can't be toggled (blocked in
	   ctx.toggle). Keep it non-dimmed and scrollable, but make the rows read as
	   inert — no pointer cursor, no hover highlight. */
	.select-listbox-inline.readonly :global(.fluent-option) {
		cursor: default;
	}

	.select-listbox-inline.readonly :global(.fluent-option:hover:not([disabled])) {
		background: transparent;
	}

	.select-listbox-inline.readonly :global(.fluent-option[aria-selected="true"]:hover:not([disabled])) {
		background: var(--neutral-fill-secondary-rest, #f5f5f5);
	}
</style>
