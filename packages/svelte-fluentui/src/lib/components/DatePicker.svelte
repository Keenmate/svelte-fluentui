<!--
@component
Date input with a calendar popup; `value` is a `Date` (or `null`).

```svelte
<DatePicker label="Due date" bind:value={due} minDate={new Date()} />
```
-->
<!--
 * DatePicker Component
 * Inspired by FluentUI Blazor DatePicker component
 * https://www.fluentui-blazor.net/DateTime
 *
 * Combines TextField with Calendar popup for date selection
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {tick, untrack} from "svelte"
	import TextField from "./TextField.svelte"
	import Calendar from "./Calendar.svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import FieldLabel from "./FieldLabel.svelte"
	import type DayFormat from "../fluent-ui/calendar/day-format.js"
	import {defaultCulture} from "../helpers/locale.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {isAfterDay, isBeforeDay} from "../helpers/date.js"
	import type {CalendarDay} from "../fluent-ui/calendar/calendar-day.js"
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {DatePickerLabels} from "../i18n/labels.js"

	type OwnProps = {
		/** Id of the input (also the label's `for`). */
		id?: string
		/** Selected date (`null` when empty). Bindable. */
		value?: Date | null
		/** Input placeholder. Default: the `placeholder` text (`svelteFluentUI.datePicker.placeholder`, "Select a date"). */
		placeholder?: string
		/** Disable the input and the popup. */
		disabled?: boolean
		/** Show the value but don't allow changing it (no popup, no clear). */
		readonly?: boolean
		/** A clear (×) button before the picker icon while a value is set, shown while the field
		 * is hovered or focused; Delete / Backspace on the field clears too. Default: `true`. */
		showClear?: boolean
		/** Mark the input as required. */
		required?: boolean
		/** Focus the input on mount. */
		autofocus?: boolean
		/** Text label above the input. */
		label?: string
		/** Custom label content, rendered after `label`. */
		labelTemplate?: Snippet
		/** TextField appearance (`outline` / `filled`). */
		appearance?: string
		/** Locale for formatting and calendar names. Default: the i18n locale (`i18n.currentLocale`; the browser's region when it is the same language), following locale switches. */
		culture?: Intl.Locale
		/** How the date is shown in the input. Default: `{year: "numeric", month: "long", day: "numeric"}`. */
		dateFormat?: Intl.DateTimeFormatOptions
		/** Earliest selectable day (inclusive, compared by day). */
		minDate?: Date
		/** Latest selectable day (inclusive, compared by day). */
		maxDate?: Date
		/** Return `true` to disable a date (composes with minDate/maxDate and getIsDateSelectableCallback). */
		getIsDateDisabledCallback?: (ctx: {date: Date}) => boolean
		/** Inverse of `getIsDateDisabledCallback` — return `true` to allow a date. A date must pass both. */
		getIsDateSelectableCallback?: (ctx: {date: Date}) => boolean
		/** Apply disabled styling to unselectable dates. Default true. */
		disabledSelectable?: boolean
		/** When true, treat a month/year as disabled only if every contained day is disabled. */
		disabledCheckAllDaysOfMonthYear?: boolean
		/** Day cell format. "2-digit" renders "01" instead of "1". */
		dayFormat?: typeof DayFormat["TwoDigit"] | null
		/** Day-cell edge length for the calendar popup (default 28px). Resizes the whole grid proportionally. */
		cellSize?: string | number
		/** Gap between cells in the calendar popup (default 2px). */
		gap?: string | number
		/** Animate transitions between months/years. By default only the Months view animates. */
		animatePeriodChanges?: boolean
		/** First day of the week (0=Sunday…6=Saturday). Overrides culture default. */
		firstDayOfWeek?: number | null
		/** When true (default), the popup closes after a date is picked. */
		closeOnSelect?: boolean
		/** When true (default), clicking anywhere on the input area opens the calendar popup, matching FluentUI Blazor. Set false to require clicking the calendar icon. */
		openOnInputClick?: boolean
		/** Bindable open state of the calendar popup. */
		open?: boolean
		/** Overrides of the built-in text (`svelteFluentUI.datePicker.*` keys, plus the popup Calendar's `svelteFluentUI.calendar.*` keys) for this instance. An explicit `placeholder` prop wins. */
		labels?: DatePickerLabels
		/** Tooltip (`title`) on the input. */
		title?: string
		/** Extra class on the root. */
		class?: string
		/** Inline style on the root. */
		style?: string
		/** Custom render for each day cell in the calendar popup. Receives CalendarDay properties. */
		day?: Snippet<[day: CalendarDay]>
		/** Fires when the user picks, types or clears a date. */
		onChange?: (ctx: {value: Date | null}) => void
		/** Fires on every open/close of the calendar popup after mount (user or `bind:open`); not on initial render. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Fires when the user navigates months/years inside the calendar popup. */
		onPickerMonthChange?: (ctx: {pickerMonth: Date}) => void
	}

	/** Other native attributes and events go to the root `<div>` (`id` and `title` go to the input). */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		value = $bindable(null),
		placeholder = undefined,
		disabled = false,
		readonly = false,
		showClear = true,
		required = false,
		autofocus = undefined,
		label = undefined,
		labelTemplate = undefined,
		appearance = undefined,
		culture: cultureProp = undefined,
		dateFormat = { year: 'numeric', month: 'long', day: 'numeric' },
		minDate = undefined,
		maxDate = undefined,
		getIsDateDisabledCallback = undefined,
		getIsDateSelectableCallback = undefined,
		disabledSelectable = undefined,
		disabledCheckAllDaysOfMonthYear = undefined,
		dayFormat = undefined,
		cellSize = undefined,
		gap = undefined,
		animatePeriodChanges = undefined,
		firstDayOfWeek = undefined,
		closeOnSelect = true,
		openOnInputClick = true,
		open = $bindable(false),
		labels: labelsProp = undefined,
		title = undefined,
		class: className = "",
		style = "",
		day: daySnippet = undefined,
		onChange = undefined,
		onOpenChange = undefined,
		onPickerMonthChange = undefined,
		...rest
	}: Props = $props()

	const t = useTranslations("datePicker", () => labelsProp)
	const culture = $derived(cultureProp ?? defaultCulture())

	let inputValue = $state("")
	// Bridge `open` prop with internal logic so $effect and bindable prop stay consistent.
	let isOpen = $derived(open)
	function setOpen(next: boolean) {
		if (open === next) return
		// Closing with focus inside the popup (Escape, a pick) hands focus back to the
		// calendar button instead of dropping it on <body>.
		const returnFocus = !next && !!popupElement?.contains(document.activeElement)
		open = next
		if (returnFocus) void tick().then(() => calendarButton?.focus())
	}

	// Keyboard open (Enter / Space on the calendar button, ArrowDown on the input):
	// focus moves into the popup, onto the calendar's focused date.
	async function openAndFocusPopup() {
		setOpen(true)
		await tick()
		await tick() // PositioningRegion mounts its content a tick later
		popupElement?.querySelector<HTMLElement>(".days [tabindex='0']")?.focus()
	}

	function handleWrapperKeydown(event: KeyboardEvent) {
		if (disabled || readonly) return
		if ((event.target as HTMLElement | null)?.closest(".end-buttons")) return
		if ((event.key === "Delete" || event.key === "Backspace") && showClear && value) {
			event.preventDefault()
			handleClear()
			return
		}
		if (event.key !== "ArrowDown") return
		event.preventDefault()
		void openAndFocusPopup()
	}

	const uid = $props.id()
	const popupId = `fluent-datepicker-${uid}-popup`
	let calendarButton = $state<HTMLButtonElement | undefined>(undefined)
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
	let wrapperElement = $state<HTMLElement | undefined>(undefined)
	let popupElement = $state<HTMLElement | undefined>(undefined)

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

	// Format date for display
	function formatDate(date: Date | null): string {
		if (!date) return ""
		try {
			return new Intl.DateTimeFormat(culture.baseName, dateFormat).format(date)
		} catch {
			return date.toLocaleDateString()
		}
	}

	// Update input value when value changes
	$effect(() => {
		inputValue = formatDate(value)
	})

	// Check if date is disabled — composes minDate/maxDate and the two callbacks.
	function isDateDisabled(date: Date): boolean {
		// By calendar day: a minDate of today 14:00 must not disable today.
		if (minDate && isBeforeDay(date, minDate)) return true
		if (maxDate && isAfterDay(date, maxDate)) return true
		if (getIsDateDisabledCallback?.({date})) return true
		if (getIsDateSelectableCallback && !getIsDateSelectableCallback({date})) return true
		return false
	}

	// Handle calendar date selection
	function handleDateSelected(selectedDate: Date) {
		value = selectedDate
		if (closeOnSelect) setOpen(false)
		onChange?.({value: selectedDate})
	}

	// Handle input click to open calendar
	function handleInputClick(event?: MouseEvent) {
		event?.stopPropagation()
		if (!disabled && !readonly) {
			// detail 0 = activated from the keyboard (Enter / Space), not a pointer
			if (!isOpen && event?.detail === 0) void openAndFocusPopup()
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

	// Handle input change (manual text entry)
	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement
		inputValue = target.value

		// Try to parse the date
		try {
			const parsed = new Date(target.value)
			if (!isNaN(parsed.getTime()) && !isDateDisabled(parsed)) {
				value = parsed
				onChange?.({value: parsed})
			}
		} catch {
			// Invalid date, ignore
		}
	}

	// Handle clear
	function handleClear(event?: Event) {
		event?.stopPropagation()
		value = null
		inputValue = ""
		setOpen(false)
		onChange?.({value: null})
	}
</script>

<div {...rest} class="fluent-datepicker {className}" style={style}>
	<FieldLabel for={id} {label} {labelTemplate} {required} />

	<!-- Mouse convenience (a press anywhere on the field opens); keyboard users get
	     ArrowDown on the input and the calendar button. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="datepicker-wrapper fluent-field-clear-host" bind:this={wrapperElement} onclick={handleWrapperClick} onkeydown={handleWrapperKeydown}>
		<TextField
			{id}
			value={inputValue}
			placeholder={placeholder ?? t("placeholder")}
			{disabled}
			readonly={true}
			{required}
			{autofocus}
			{appearance}
			{title}
			oninput={handleInputChange}
			style={openOnInputClick && !disabled && !readonly ? "width: 100%; cursor: pointer;" : "width: 100%;"}
		>
			{#snippet end()}
				<span class="end-buttons">
				<!-- Clear (×): out of the Tab order (Delete / Backspace on the field clears) and
				     doesn't take focus; shown while the field is hovered or focused. -->
				{#if showClear && value && !disabled && !readonly}
					<button
						type="button"
						class="clear-button fluent-field-clear"
						tabindex="-1"
						onpointerdown={(e) => e.preventDefault()}
						onclick={handleClear}
						aria-label={t("clearAriaLabel")}
						title={t("clearTooltip")}
					>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
							<path d="M2.09 2.22a.75.75 0 011.06-.13L6 4.94l2.85-2.85a.75.75 0 111.06 1.06L7.06 6l2.85 2.85a.75.75 0 11-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 01-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 01-.13-1.06z"/>
						</svg>
					</button>
				{/if}
				<!-- Calendar icon -->
				<button
					bind:this={calendarButton}
					type="button"
					class="calendar-button"
					onclick={handleInputClick}
					disabled={disabled}
					aria-label={t("openPopupAriaLabel")}
					aria-haspopup="dialog"
					aria-expanded={isOpen ? "true" : "false"}
					aria-controls={isOpen ? popupId : null}
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
						<path d="M14 2a1 1 0 011 1v1h1.5A1.5 1.5 0 0118 5.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 16.5v-11A1.5 1.5 0 013.5 4H5V3a1 1 0 112 0v1h6V3a1 1 0 011-1zM5 6H3.5a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h13a.5.5 0 00.5-.5v-10a.5.5 0 00-.5-.5H15v1a1 1 0 11-2 0V6H7v1a1 1 0 01-2 0V6zm1.5 4a.5.5 0 110 1h-1a.5.5 0 110-1h1zm0 3a.5.5 0 110 1h-1a.5.5 0 110-1h1zm3.5-3a.5.5 0 110 1h-1a.5.5 0 110-1h1zm0 3a.5.5 0 110 1h-1a.5.5 0 110-1h1zm3.5-3a.5.5 0 110 1h-1a.5.5 0 110-1h1zm0 3a.5.5 0 110 1h-1a.5.5 0 110-1h1z"/>
					</svg>
				</button>

				</span>
			{/snippet}
		</TextField>

		{#if isOpen && wrapperElement}
			<PositioningRegion
				anchor={wrapperElement}
				visible={isOpen}
				matchWidth={false}
			>
				<!-- Surface + padding live here, not on the region, so a press anywhere on the popup is "inside". -->
				<div class="datepicker-popup fluent-popup-surface fluent-popup--layer" bind:this={popupElement} id={popupId} role="dialog" aria-label={t("popupAriaLabel")}>
					<Calendar
						value={value || new Date()}
						pickerMonth={value || new Date()}
						{culture}
						{firstDayOfWeek}
						{disabled}
						{readonly}
						{disabledSelectable}
						{disabledCheckAllDaysOfMonthYear}
						{dayFormat}
						{cellSize}
						{gap}
						{animatePeriodChanges}
						getIsDateDisabledCallback={({date}) => isDateDisabled(date)}
						onChange={({value}) => handleDateSelected(value as Date)}
						{onPickerMonthChange}
						day={daySnippet}
						labels={labelsProp}
					/>
				</div>
			</PositioningRegion>
		{/if}
	</div>
</div>

<style>
	.fluent-datepicker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.datepicker-wrapper {
		position: relative;
	}

	.datepicker-popup {
		padding: 1rem;
	}

	.end-buttons {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.calendar-button {
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

	.calendar-button:hover:not(:disabled) {
		background: var(--neutral-fill-secondary-hover);
	}

	.calendar-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
