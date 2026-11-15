<!-- @component
Time input with a popup of hour / minute (/ second, AM/PM) columns. `bind:value` is a 24-hour `"HH:mm"` string or `null`.

```svelte
<TimePicker label="Start" minuteStep={15} hourCycle="h12" bind:value={start} />
```
-->
<!--
 * TimePicker Component
 * Inspired by FluentUI Blazor TimePicker component
 * https://www.fluentui-blazor.net/DateTime
 *
 * Provides time selection with hour, minute, and optional second/millisecond inputs
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {tick, untrack} from "svelte"
	import TextField from "./TextField.svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import Button from "./Button.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Id of the input (also the label's `for`). */
		id?: string
		/** Selected time, 24-hour `"HH:mm"` (or `"HH:mm:ss"` with `showSeconds`) regardless of `hourCycle`; `null` when empty. Bindable. */
		value?: string | null // HH:mm:ss or HH:mm format
		/** Hint text shown while empty. Default: `"Select time"`. */
		placeholder?: string
		/** Disables the input and the clock button. Default: `false`. */
		disabled?: boolean
		/** Shows the value but blocks opening the popup. Default: `false`. */
		readonly?: boolean
		/** Marks the field required and shows a `*` after the label. Default: `false`. */
		required?: boolean
		/** Focus the input on mount. */
		autofocus?: boolean
		/** Visible label text rendered above the input. */
		label?: string
		/** Custom label markup, rendered after `label` inside the `<label>`. */
		labelTemplate?: Snippet
		/** Input style, passed to the inner TextField: `"outline"` or `"filled"`. */
		appearance?: string
		/** `"h23"` = 24-hour clock (default), `"h12"` = 12-hour clock with AM/PM. Same values as `Intl.DateTimeFormat`'s `hourCycle`. */
		hourCycle?: "h12" | "h23"
		/** Adds a seconds column and includes seconds in `value`. Default: `false`. */
		showSeconds?: boolean
		/** Spacing of the minute options, in minutes. Default: `1`. */
		minuteStep?: number
		/** Spacing of the hour options, in hours. Default: `1`. */
		hourStep?: number
		/** Spacing of the second options, in seconds. Default: `1`. */
		secondStep?: number
		/** Minimum allowed time in HH:mm or HH:mm:ss format. */
		minTime?: string
		/** Maximum allowed time in HH:mm or HH:mm:ss format. */
		maxTime?: string
		/** Custom predicate marking a specific (h, m, s) triplet as disabled. Composes with minTime/maxTime/disabledTimes. */
		getIsTimeDisabledCallback?: (ctx: {hour: number; minute: number; second: number}) => boolean
		/** Convenience shorthand for booked / blocked time slots. Each entry in "HH:mm" or "HH:mm:ss" form. */
		disabledTimes?: string[]
		/** When true (default), the popup closes when the user clicks OK. */
		closeOnSelect?: boolean
		/** When true (default), clicking anywhere on the input area opens the popup, matching FluentUI Blazor. Set false to require clicking the clock icon. */
		openOnInputClick?: boolean
		/** Bindable popup open state. */
		open?: boolean
		/** Accessible name of the clock button. Default: `"Open time picker"`. */
		openClockIconAriaLabel?: string
		/** Accessible name of the time popup (`role="dialog"`). Default: `"Choose time"`. */
		popupAriaLabel?: string
		/** Tooltip text on the input (`title`). */
		title?: string
		/** Extra CSS class on the root element. */
		class?: string
		/** Inline style on the root element. */
		style?: string
		/** Fires when the user picks (OK) or clears a time; `value` is the new time or `null`. */
		onChange?: (ctx: {value: string | null}) => void
		/** Fires on every open/close of the clock popup after mount (user or `bind:open`); not on initial render. */
		onOpenChange?: (ctx: {open: boolean}) => void
	}

	/** Other native attributes and events go to the root `<div>` (`id` and `title` go to the input). */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		value = $bindable(null),
		placeholder = "Select time",
		disabled = false,
		readonly = false,
		required = false,
		autofocus = undefined,
		label = undefined,
		labelTemplate = undefined,
		appearance = undefined,
		hourCycle = "h23",
		showSeconds = false,
		minuteStep = 1,
		hourStep = 1,
		secondStep = 1,
		minTime = undefined,
		maxTime = undefined,
		getIsTimeDisabledCallback = undefined,
		disabledTimes = undefined,
		closeOnSelect = true,
		openOnInputClick = true,
		open = $bindable(false),
		openClockIconAriaLabel = "Open time picker",
		popupAriaLabel = "Choose time",
		title = undefined,
		class: className = "",
		style = "",
		onChange = undefined,
		onOpenChange = undefined,
		...rest
	}: Props = $props()

	const effective24h = $derived(hourCycle !== "h12")

	let wrapperElement = $state<HTMLElement | undefined>(undefined)
	let popupElement = $state<HTMLElement | undefined>(undefined)
	let isOpen = $derived(open)
	function setOpen(next: boolean) {
		if (open === next) return
		// Closing with focus inside the popup (Escape, OK) hands focus back to the
		// clock button instead of dropping it on <body>.
		const returnFocus = !next && !!popupElement?.contains(document.activeElement)
		open = next
		if (returnFocus) void tick().then(() => clockButton?.focus())
	}

	const uid = $props.id()
	const popupId = `fluent-timepicker-${uid}-popup`
	let clockButton = $state<HTMLButtonElement | undefined>(undefined)

	// Keyboard open (Enter / Space on the clock button, ArrowDown on the input):
	// focus moves into the popup, onto the hour column.
	async function openAndFocusPopup() {
		setOpen(true)
		await tick()
		await tick() // PositioningRegion mounts its content a tick later
		popupElement?.querySelector<HTMLElement>(".time-list [tabindex='0']")?.focus()
	}

	function handleWrapperKeydown(event: KeyboardEvent) {
		if (disabled || readonly || event.key !== "ArrowDown") return
		if ((event.target as HTMLElement | null)?.closest(".end-buttons")) return
		event.preventDefault()
		void openAndFocusPopup()
	}

	const PERIODS = ["AM", "PM"] as const

	// Each column is a radio group: one tab stop (the selected value, else the first
	// enabled one); ArrowUp / ArrowDown / Home / End move and select.
	function columnTabIndex<T>(values: readonly T[], selected: T, isDisabled: (v: T) => boolean, v: T): 0 | -1 {
		const stop = values.includes(selected) && !isDisabled(selected) ? selected : values.find(x => !isDisabled(x))
		return v === stop ? 0 : -1
	}

	function handleColumnKeydown(event: KeyboardEvent) {
		const list = event.currentTarget as HTMLElement
		const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>(".time-option:not(:disabled)"))
		const i = buttons.indexOf(event.target as HTMLButtonElement)
		if (i < 0) return
		let n: number
		switch (event.key) {
			case "ArrowDown": n = Math.min(i + 1, buttons.length - 1); break
			case "ArrowUp": n = Math.max(i - 1, 0); break
			case "Home": n = 0; break
			case "End": n = buttons.length - 1; break
			default: return
		}
		event.preventDefault()
		buttons[n].click()
		buttons[n].focus()
		buttons[n].scrollIntoView({block: "nearest"})
	}
	// onOpenChange on every real open/close transition after mount (user action or a
	// programmatic `bind:open` change). The first run only records the initial state,
	// so `open={true}` on mount is silent.
	let lastOpen: boolean | undefined = undefined
	$effect(() => {
		const next = open
		if (lastOpen === undefined) {
			lastOpen = next
			return
		}
		if (next === lastOpen) return
		lastOpen = next
		untrack(() => onOpenChange?.({open: next}))
	})

	// Parse min/max time into total minutes for easy comparison.
	function toTotalSeconds(s?: string): number | null {
		if (!s) return null
		const [h = "0", m = "0", sec = "0"] = s.split(":")
		const hh = parseInt(h, 10)
		const mm = parseInt(m, 10)
		const ss = parseInt(sec, 10)
		if (Number.isNaN(hh) || Number.isNaN(mm)) return null
		return hh * 3600 + mm * 60 + (Number.isNaN(ss) ? 0 : ss)
	}
	const minTotal = $derived(toTotalSeconds(minTime))
	const maxTotal = $derived(toTotalSeconds(maxTime))

	// Normalize "10:15" / "10:15:0" / "10:15:30" → "10:15:0" / "10:15:30" (no zero-padding) so a Set lookup hits.
	function normalizeTimeKey(s: string): string | null {
		const v = toTotalSeconds(s)
		if (v == null) return null
		return `${Math.floor(v / 3600)}:${Math.floor((v % 3600) / 60)}:${v % 60}`
	}
	const disabledTimesSet = $derived(
		new Set((disabledTimes ?? []).map(normalizeTimeKey).filter((s): s is string => s != null))
	)

	function isTimeDisabled(h: number, m: number, s: number): boolean {
		const total = h * 3600 + m * 60 + s
		if (minTotal != null && total < minTotal) return true
		if (maxTotal != null && total > maxTotal) return true
		if (getIsTimeDisabledCallback?.({hour: h, minute: m, second: s})) return true
		if (disabledTimesSet.has(`${h}:${m}:${s}`)) return true
		return false
	}

	// Convert a displayed hour + period to its effective 24h form for predicate evaluation.
	function toEffective24Hour(displayHour: number, period: "AM" | "PM" = selectedPeriod): number {
		if (effective24h) return displayHour
		let h = displayHour
		if (period === "PM" && h !== 12) h += 12
		else if (period === "AM" && h === 12) h = 0
		return h
	}

	// Column-aware disabled checks — each column evaluates the triplet using the other columns' current values.
	function isHourCellDisabled(hour: number): boolean {
		const h = toEffective24Hour(hour)
		const s = showSeconds ? selectedSecond : 0
		return isTimeDisabled(h, selectedMinute, s)
	}
	function isMinuteCellDisabled(minute: number): boolean {
		const h = toEffective24Hour(selectedHour)
		const s = showSeconds ? selectedSecond : 0
		return isTimeDisabled(h, minute, s)
	}
	function isSecondCellDisabled(second: number): boolean {
		const h = toEffective24Hour(selectedHour)
		return isTimeDisabled(h, selectedMinute, second)
	}
	function isPeriodCellDisabled(period: "AM" | "PM"): boolean {
		const h = toEffective24Hour(selectedHour, period)
		const s = showSeconds ? selectedSecond : 0
		return isTimeDisabled(h, selectedMinute, s)
	}
	const currentSelectionDisabled = $derived.by(() => {
		const h = toEffective24Hour(selectedHour)
		const s = showSeconds ? selectedSecond : 0
		return isTimeDisabled(h, selectedMinute, s)
	})

	// Light dismiss (outside press, focus moving away) + Escape while open. The popup
	// is portalled, so it is listed next to the wrapper as "inside".
	$effect(() => {
		if (!isOpen) return
		// Escape goes to the topmost open layer (helpers/layer-stack.ts)
		const popLayer = pushLayer({onEscape: () => setOpen(false)})
		const undismiss = dismissOnOutside(() => [wrapperElement, popupElement], () => setOpen(false))
		return () => {
			undismiss()
			popLayer()
		}
	})

	// When the popup opens, center each column's selected option (or the first enabled option if nothing
	// is selected) so the user doesn't land in a pile of disabled / out-of-range items. Uses manual
	// scrollTop math rather than scrollIntoView to avoid potentially scrolling the outer page.
	$effect(() => {
		if (!isOpen || !popupElement) return
		for (const list of popupElement.querySelectorAll<HTMLElement>(".time-list")) {
			const target =
				list.querySelector<HTMLElement>(".time-option.selected:not(:disabled)") ??
				list.querySelector<HTMLElement>(".time-option.selected") ??
				list.querySelector<HTMLElement>(".time-option:not(:disabled)")
			if (!target) continue
			list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2
		}
	})
	let selectedHour = $state(12)
	let selectedMinute = $state(0)
	let selectedSecond = $state(0)
	let selectedPeriod = $state<"AM" | "PM">("AM")

	// Parse time value
	function parseTime(timeStr: string | null) {
		if (!timeStr) return

		const parts = timeStr.split(":")
		if (parts.length >= 2) {
			let hour = parseInt(parts[0])
			const minute = parseInt(parts[1])
			const second = parts.length > 2 ? parseInt(parts[2]) : 0

			if (!effective24h) {
				selectedPeriod = hour >= 12 ? "PM" : "AM"
				hour = hour % 12 || 12
			}

			selectedHour = hour
			selectedMinute = minute
			selectedSecond = second
		}
	}

	// Format time for display
	function formatTime(): string {
		if (!value) return ""

		let displayHour = selectedHour

		if (!effective24h) {
			displayHour = selectedHour % 12 || 12
		}

		const hourStr = displayHour.toString().padStart(2, "0")
		const minuteStr = selectedMinute.toString().padStart(2, "0")
		const secondStr = selectedSecond.toString().padStart(2, "0")

		let formatted = `${hourStr}:${minuteStr}`
		if (showSeconds) {
			formatted += `:${secondStr}`
		}
		if (!effective24h) {
			formatted += ` ${selectedPeriod}`
		}

		return formatted
	}

	// Generate time value in HH:mm:ss format
	function generateTimeValue(): string {
		let hour = selectedHour

		if (!effective24h) {
			if (selectedPeriod === "PM" && hour !== 12) {
				hour += 12
			} else if (selectedPeriod === "AM" && hour === 12) {
				hour = 0
			}
		}

		const hourStr = hour.toString().padStart(2, "0")
		const minuteStr = selectedMinute.toString().padStart(2, "0")
		const secondStr = selectedSecond.toString().padStart(2, "0")

		return showSeconds ? `${hourStr}:${minuteStr}:${secondStr}` : `${hourStr}:${minuteStr}`
	}

	// Initialize from value
	$effect(() => {
		parseTime(value)
	})

	let displayValue = $derived(formatTime())

	// Handle clock-icon click — toggles the popup. Always available regardless of openOnInputClick.
	function handleInputClick(e: MouseEvent) {
		if (!disabled && !readonly) {
			// detail 0 = activated from the keyboard (Enter / Space), not a pointer
			if (!isOpen && e.detail === 0) void openAndFocusPopup()
			else setOpen(!isOpen)
		}
	}

	// Handle click anywhere on the input area — opens (does not toggle) so
	// clicking inside an already-open picker keeps it open. Matches Blazor.
	function handleWrapperClick() {
		if (!openOnInputClick) return
		if (disabled || readonly) return
		if (!isOpen) setOpen(true)
	}

	// The wrapper has its own onclick for "click anywhere in field to open"; without these the click bubbles
	// from the inner button → wrapper, toggling the popup twice (clock) or re-opening after clear (clear).
	function handleClockButtonClick(e: MouseEvent) {
		e.stopPropagation()
		handleInputClick(e)
	}
	function handleClearClick(e: MouseEvent) {
		e.stopPropagation()
		handleClear()
	}

	// Stop propagation to prevent closing when clicking inside popup
	function handlePopupClick(e: MouseEvent) {
		e.stopPropagation()
	}

	// Handle time selection
	function handleApply() {
		// Respect min/max — compute in 24h terms so AM/PM mode still works.
		let h = selectedHour
		if (!effective24h) {
			if (selectedPeriod === "PM" && h !== 12) h += 12
			else if (selectedPeriod === "AM" && h === 12) h = 0
		}
		if (isTimeDisabled(h, selectedMinute, showSeconds ? selectedSecond : 0)) return
		value = generateTimeValue()
		if (closeOnSelect) setOpen(false)
		onChange?.({value})
	}

	// Handle clear
	function handleClear() {
		value = null
		setOpen(false)
		onChange?.({value: null})
	}

	// Generate hour options
	const hours = $derived.by(() => {
		const max = effective24h ? 23 : 12
		const start = effective24h ? 0 : 1
		const result: number[] = []
		for (let i = start; i <= max; i += hourStep) {
			result.push(i)
		}
		return result
	})

	// Generate minute options
	const minutes = $derived.by(() => {
		const result: number[] = []
		for (let i = 0; i < 60; i += minuteStep) {
			result.push(i)
		}
		return result
	})

	// Generate second options
	const seconds = $derived.by(() => {
		const result: number[] = []
		for (let i = 0; i < 60; i += secondStep) {
			result.push(i)
		}
		return result
	})
</script>

<div {...rest} class="fluent-timepicker {className}" style={style}>
	{#if label || labelTemplate}
		<label for={id} class="fluent-field-label">
			{#if label}{label}{/if}
			{#if labelTemplate}{@render labelTemplate?.()}{/if}
			{#if required}<span class="required-indicator">*</span>{/if}
		</label>
	{/if}

	<!-- Mouse convenience (a press anywhere on the field opens); keyboard users get
	     ArrowDown on the input and the clock button. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="timepicker-wrapper" bind:this={wrapperElement} onclick={handleWrapperClick} onkeydown={handleWrapperKeydown} style:cursor={openOnInputClick && !disabled && !readonly ? "pointer" : undefined}>
		<TextField
			{id}
			value={displayValue}
			{placeholder}
			{disabled}
			readonly={true}
			{required}
			{autofocus}
			{appearance}
			{title}
			style="width: 100%;"
		>
			{#snippet end()}
				<span class="end-buttons">
				<!-- Clock icon -->
				<button
					bind:this={clockButton}
					type="button"
					class="clock-button"
					onclick={handleClockButtonClick}
					disabled={disabled}
					aria-label={openClockIconAriaLabel}
					aria-haspopup="dialog"
					aria-expanded={isOpen ? "true" : "false"}
					aria-controls={isOpen ? popupId : null}
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
						<path d="M10 2a8 8 0 110 16 8 8 0 010-16zm0 1a7 7 0 100 14 7 7 0 000-14zm.5 2a.5.5 0 01.5.5V10h3a.5.5 0 010 1h-3.5a.5.5 0 01-.5-.5v-5a.5.5 0 01.5-.5z"/>
					</svg>
				</button>

				{#if value && !disabled && !readonly}
					<!-- Clear button -->
					<button
						type="button"
						class="clear-button"
						onclick={handleClearClick}
						aria-label="Clear time"
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
							<path d="M2.09 2.22a.75.75 0 011.06-.13L6 4.94l2.85-2.85a.75.75 0 111.06 1.06L7.06 6l2.85 2.85a.75.75 0 11-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 01-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 01-.13-1.06z"/>
						</svg>
					</button>
				{/if}
				</span>
			{/snippet}
		</TextField>

		{#if isOpen && wrapperElement}
			<PositioningRegion
				anchor={wrapperElement}
				visible={isOpen}
				matchWidth={false}
				style="z-index: var(--fluent-z-popover); background: var(--neutral-layer-1); border: 1px solid var(--neutral-stroke-rest); border-radius: var(--fluent-border-radius-md); box-shadow: 0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12); min-width: 280px;"
			>
				<!-- The click handler only stops propagation (keeps the field's open-on-click
				     from re-firing); it is not an interaction. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="time-picker-panel" bind:this={popupElement} id={popupId} role="dialog" tabindex="-1" aria-label={popupAriaLabel} onclick={handlePopupClick}>
					<div class="time-selectors">
						<!-- Hour selector -->
						<div class="time-column">
							<div class="column-label" id="{popupId}-hour">Hour</div>
							<div class="time-list" role="radiogroup" aria-labelledby="{popupId}-hour" tabindex="-1" onkeydown={handleColumnKeydown}>
								{#each hours as hour}
									{@const hourDisabled = isHourCellDisabled(hour)}
									<button
										type="button"
										class="time-option"
										role="radio"
										aria-checked={selectedHour === hour ? "true" : "false"}
										tabindex={columnTabIndex(hours, selectedHour, isHourCellDisabled, hour)}
										class:selected={selectedHour === hour}
										disabled={hourDisabled}
										onclick={() => { if (!hourDisabled) selectedHour = hour }}
									>
										{hour.toString().padStart(2, "0")}
									</button>
								{/each}
							</div>
						</div>

						<!-- Minute selector -->
						<div class="time-column">
							<div class="column-label" id="{popupId}-minute">Minute</div>
							<div class="time-list" role="radiogroup" aria-labelledby="{popupId}-minute" tabindex="-1" onkeydown={handleColumnKeydown}>
								{#each minutes as minute}
									{@const minuteDisabled = isMinuteCellDisabled(minute)}
									<button
										type="button"
										class="time-option"
										role="radio"
										aria-checked={selectedMinute === minute ? "true" : "false"}
										tabindex={columnTabIndex(minutes, selectedMinute, isMinuteCellDisabled, minute)}
										class:selected={selectedMinute === minute}
										disabled={minuteDisabled}
										onclick={() => { if (!minuteDisabled) selectedMinute = minute }}
									>
										{minute.toString().padStart(2, "0")}
									</button>
								{/each}
							</div>
						</div>

						<!-- Second selector (optional) -->
						{#if showSeconds}
							<div class="time-column">
								<div class="column-label" id="{popupId}-second">Second</div>
								<div class="time-list" role="radiogroup" aria-labelledby="{popupId}-second" tabindex="-1" onkeydown={handleColumnKeydown}>
									{#each seconds as second}
										{@const secondDisabled = isSecondCellDisabled(second)}
										<button
											type="button"
											class="time-option"
											role="radio"
											aria-checked={selectedSecond === second ? "true" : "false"}
											tabindex={columnTabIndex(seconds, selectedSecond, isSecondCellDisabled, second)}
											class:selected={selectedSecond === second}
											disabled={secondDisabled}
											onclick={() => { if (!secondDisabled) selectedSecond = second }}
										>
											{second.toString().padStart(2, "0")}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- AM/PM selector (12-hour format) -->
						{#if !effective24h}
							{@const amDisabled = isPeriodCellDisabled("AM")}
							{@const pmDisabled = isPeriodCellDisabled("PM")}
							<div class="time-column period-column">
								<div class="column-label" id="{popupId}-period">Period</div>
								<div class="time-list" role="radiogroup" aria-labelledby="{popupId}-period" tabindex="-1" onkeydown={handleColumnKeydown}>
									<button
										type="button"
										class="time-option"
										role="radio"
										aria-checked={selectedPeriod === "AM" ? "true" : "false"}
										tabindex={columnTabIndex(PERIODS, selectedPeriod, isPeriodCellDisabled, "AM")}
										class:selected={selectedPeriod === "AM"}
										disabled={amDisabled}
										onclick={() => { if (!amDisabled) selectedPeriod = "AM" }}
									>
										AM
									</button>
									<button
										type="button"
										class="time-option"
										role="radio"
										aria-checked={selectedPeriod === "PM" ? "true" : "false"}
										tabindex={columnTabIndex(PERIODS, selectedPeriod, isPeriodCellDisabled, "PM")}
										class:selected={selectedPeriod === "PM"}
										disabled={pmDisabled}
										onclick={() => { if (!pmDisabled) selectedPeriod = "PM" }}
									>
										PM
									</button>
								</div>
							</div>
						{/if}
					</div>

					<div class="time-actions">
						<Button appearance="accent" onclick={handleApply} disabled={currentSelectionDisabled} style="flex: 1;">
							OK
						</Button>
					</div>
				</div>
			</PositioningRegion>
		{/if}
	</div>
</div>

<style>
	.fluent-timepicker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		/* Keep the time input usable when squeezed by a flex/grid parent
		   (was a Blazor-dump rule before 2.0). */
		min-width: 110px;
	}

	.required-indicator {
		color: var(--fluent-color-danger-foreground, #d13438);
		margin-inline-start: 0.25rem;
	}

	.timepicker-wrapper {
		position: relative;
	}

	.end-buttons {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.clock-button,
	.clear-button {
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		color: var(--neutral-foreground-rest);
		border-radius: var(--fluent-border-radius-md);
	}

	.clock-button:hover:not(:disabled),
	.clear-button:hover {
		background: var(--neutral-fill-secondary-hover);
	}

	.clock-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.clear-button {
		margin-inline-start: 0.25rem;
	}

	/* Padding lives here, not on the region, so a press anywhere on the popup is "inside". */
	.time-picker-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.time-selectors {
		display: flex;
		gap: 0.5rem;
	}

	.time-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.period-column {
		flex: 0.7;
	}

	.column-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--neutral-foreground-rest);
		text-align: center;
		padding: 0.25rem;
	}

	.time-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 200px;
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--neutral-stroke-rest);
		border-radius: var(--fluent-border-radius-md);
		padding: 0.25rem;
	}

	.time-option {
		background: transparent;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: var(--fluent-border-radius-md);
		font-size: 0.875rem;
		color: var(--neutral-foreground-rest);
		text-align: center;
	}

	.time-option:not(:disabled):hover {
		background: var(--neutral-fill-secondary-hover);
	}

	.time-option.selected {
		background: var(--accent-fill-rest);
		color: var(--neutral-foreground-on-accent);
		font-weight: 600;
	}

	.time-option:disabled {
		color: var(--neutral-stroke-focus);
		cursor: default;
		text-decoration: line-through;
		opacity: 0.6;
	}

	.time-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
</style>
