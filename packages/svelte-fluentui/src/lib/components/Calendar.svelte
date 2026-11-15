<script lang="ts">
	import type {Snippet} from "svelte"
	import Calendar from "./Calendar.svelte"
	import {CalendarDay} from "../fluent-ui/calendar/calendar-day.js"
	import {CalendarMonth} from "../fluent-ui/calendar/calendar-month.js"
	import {CalendarYear} from "../fluent-ui/calendar/calendar-year.js"
	import type {CalendarSelectMode, CalendarView, IFluentCalendar, CalendarSelectionError} from "../fluent-ui/calendar/fluent-calendar.js"
	import {CalendarExtended} from "../fluent-ui/calendar/fluent-calendar-extended.js"
	import type DayFormat from "../fluent-ui/calendar/day-format.js"
	import {CalendarTitles} from "../fluent-ui/calendar/calendar-titles.js"
	import {RangeOfDates} from "../fluent-ui/calendar/range-of-dates.js"
	import {CalendarVerticalPosition} from "../fluent-ui/constants/calendar-vertical-position.js"
	import {tick} from "svelte"
	import {getLargest, getSmallest} from "../helpers/array.js"
	import {defaultLocale} from "../helpers/locale.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Selected date in single mode. Bindable. */
		value?: Date
		/** Selected dates in multiple/range mode. Bindable. */
		selectedDates?: Date[]
		/** Month currently shown. Bindable. */
		pickerMonth?: Date
		culture?: Intl.Locale
		/** First day of the week (0=Sunday, 1=Monday, …, 6=Saturday). Overrides culture's default when set. */
		firstDayOfWeek?: number | null
		view?: CalendarView
		selectMode?: CalendarSelectMode
		checkIfSelectedValueHasChanged?: boolean
		/** Return `true` to disable a date. */
		getIsDateDisabledCallback?: (ctx: {date: Date}) => boolean
		/** Inverse of `getIsDateDisabledCallback` — return `true` to allow a date. When both are set, a date must pass both. */
		getIsDateSelectableCallback?: (ctx: {date: Date}) => boolean
		disabledCheckAllDaysOfMonthYear?: boolean
		animatePeriodChanges?: boolean
		disabledSelectable?: boolean
		dayFormat?: typeof DayFormat["TwoDigit"] | null
		/** Day-cell edge length in CSS units (default 28px). Resizes the whole grid proportionally. */
		cellSize?: string | number
		/** Gap between cells in CSS units (default 2px). */
		gap?: string | number
		readonly?: boolean
		/** When true, the calendar is non-interactive AND visually de-emphasized (opacity, not-allowed cursor on interactive cells, `aria-disabled="true"` on the host). Stricter than `readonly`, which blocks interaction without visual treatment. */
		disabled?: boolean
		/** Hover preview: given the day under the cursor, returns the dates to highlight. Defaults to `[date]`. */
		getDatesToHighlightCallback?: (ctx: {date: Date}) => Date[]
		/** Click selection: given the clicked day, returns the dates to select. In multiple mode, the result is unioned with existing `selectedDates` (or removed wholesale if the clicked day was already selected). In range mode, the result replaces the range. Defaults to `[date]`. */
		getDatesToSelectCallback?: (ctx: {date: Date}) => Date[]
		/** Upper bound for the number of dates that can be selected in multiple mode. When exceeded, `onSelectionReject` fires and the selection is not modified. */
		maxSelectedDayCount?: number
		/** Fires when an attempted selection is rejected (exceeds `maxSelectedDayCount`). The selection is left untouched. */
		onSelectionReject?: (ctx: CalendarSelectionError) => void
		/** Fires when the user changes the selection: a `Date` in single mode (also bound to `value`), a `Date[]` in multiple/range mode (also bound to `selectedDates`). */
		onChange?: (ctx: {value: Date | Date[]}) => void
		/** Fires when the user navigates months/years (prev/next buttons). */
		onPickerMonthChange?: (ctx: {pickerMonth: Date}) => void
		/** Fires when the cursor enters a day cell (with that day) or leaves the day grid (with `null`). Pure observation — does not affect highlighting. */
		onDayHover?: (ctx: {date: Date | null}) => void
		day?: Snippet<[day: CalendarDay]>
		class?: string
		style?: string
	}

	/** Other native attributes and events go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    value                           = $bindable(new Date()),
		    selectedDates                   = $bindable([]),
		    pickerMonth                     = $bindable(new Date()),
		    view                            = "days",
		    culture                         = defaultLocale(),
		    firstDayOfWeek                  = undefined,
		    disabledCheckAllDaysOfMonthYear = undefined,
		    animatePeriodChanges            = undefined,
		    disabledSelectable              = undefined,
		    readonly                        = undefined,
		    disabled                        = undefined,
		    selectMode                      = "single",
		    checkIfSelectedValueHasChanged  = undefined,
		    dayFormat                       = undefined,
		    cellSize                        = undefined,
		    gap                             = undefined,
		    getIsDateDisabledCallback       = undefined,
		    getIsDateSelectableCallback     = undefined,
		    getDatesToHighlightCallback     = undefined,
		    getDatesToSelectCallback        = undefined,
		    maxSelectedDayCount               = undefined,
		    onSelectionReject               = undefined,
		    onChange                        = undefined,
		    onPickerMonthChange             = undefined,
		    onDayHover                      = undefined,
		    day: daySnippet                 = undefined,
		    class: className                = undefined,
		    style                           = undefined,
		    ...rest
	    }: Props = $props()

	let _rangeSelector                      = $state(new RangeOfDates())
	let _rangeSelectorMouseOver             = $state(new RangeOfDates())
	let _pickerView: OwnProps["view"] | null   = $state(null)
	let _selectedDatesMouseOver: Date[]             = $state([])
	let _animationRunning: CalendarVerticalPosition = $state(CalendarVerticalPosition.Unset)

	const canBeAnimated             = $derived(animatePeriodChanges ?? (view !== "days" && view !== "years"))
	const calendarExtended          = $derived(new CalendarExtended(culture, pickerMonth, firstDayOfWeek ?? undefined))
	// Merge the disabled callback with the inverse of the selectable one so the existing logic stays simple.
	const effectiveDisabledFunc = $derived<(date: Date) => boolean>((date) => {
		if (getIsDateDisabledCallback?.({date})) return true
		if (getIsDateSelectableCallback && !getIsDateSelectableCallback({date})) return true
		return false
	})
	const calendar: IFluentCalendar = $derived({
		view,
		calendarExtended,
		culture:                         culture,
		dayFormat,
		// Default to true so a month/year is only marked disabled when EVERY day in it is.
		// With false (Blazor parity), date-range restrictions like min/maxDate make Jan 1 of every
		// year fail the disabled-date check, blocking the year picker entirely.
		disabledCheckAllDaysOfMonthYear: disabledCheckAllDaysOfMonthYear ?? true,
		disabledSelectable:              disabledSelectable ?? false,
		// Treat `disabled` as effectively-readonly for the title/month/year selection gates.
		// The visual difference (opacity, not-allowed cursor) is layered via `aria-disabled` CSS.
		readOnly:                        (disabled || readonly) ?? false,
		selectMode,
		value:                           value,
		selectedDates:                   selectedDates,
		allDaysAreDisabled,
		disabledDateFunc:                effectiveDisabledFunc
	})
	const titles                    = $derived(new CalendarTitles(calendar))
	const multipleSelection         = $derived(getMultipleSelection())
	const year                      = $derived(pickerMonth.getFullYear())

	// CSS variable overrides for cell size / gap. Accepts a number (interpreted as px) or any CSS length string.
	const sizeStyle = $derived.by(() => {
		const parts: string[] = []
		if (cellSize !== undefined && cellSize !== null) {
			const v = typeof cellSize === "number" ? `${cellSize}px` : cellSize
			parts.push(`--fluent-calendar-day-cell-size: ${v}; --fluent-calendar-month-cell-size: ${v}; --fluent-calendar-year-cell-size: ${v}`)
		}
		if (gap !== undefined && gap !== null) {
			const v = typeof gap === "number" ? `${gap}px` : gap
			parts.push(`--fluent-calendar-gap: ${v}; --fluent-calendar-month-gap: ${v}; --fluent-calendar-year-gap: ${v}`)
		}
		return parts.join("; ")
	})

	function getMultipleSelection() {
		const inProgress = _selectedDatesMouseOver.length > 0

		if (selectedDates == null || !selectedDates.length) {
			return {
				isMultiple: false,
				min:        new Date(0),
				max:        new Date(0),
				inProgress
			}
		}

		return {
			isMultiple: (selectMode == "multiple" || selectMode == "range") && selectedDates.length > 1,
			min:        selectedDates.reduce((acc, x) => !acc || x < acc ? x : acc),
			max:        selectedDates.reduce((acc, x) => !acc || x > acc ? x : acc),
			inProgress
		}
	}

	function sameDay(a: Date, b: Date) {
		return a.getFullYear() === b.getFullYear()
			&& a.getMonth() === b.getMonth()
			&& a.getDate() === b.getDate()
	}

	function dedupeDates(dates: Date[]) {
		const seen = new Set<string>()
		const out: Date[] = []
		for (const d of dates) {
			const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
			if (!seen.has(key)) {
				seen.add(key)
				out.push(d)
			}
		}
		return out
	}

	function fireMaxExceeded(attempted: Date[]) {
		onSelectionReject?.({
			code:      "max-selected-day-count-exceeded",
			message:   `You can select a maximum of ${maxSelectedDayCount} day${maxSelectedDayCount === 1 ? "" : "s"}. Delete a day to select a new one.`,
			attempted,
			current:   selectedDates,
			max:       maxSelectedDayCount as number
		})
		_selectedDatesMouseOver = []
	}

	function getAnimationClass(existingClass: string) {
		if (!canBeAnimated) {
			return existingClass
		}

		switch (_animationRunning) {
			case CalendarVerticalPosition.Top:
				return `${existingClass} animation-running-up`
			case CalendarVerticalPosition.Bottom:
				return `${existingClass} animation-running-down`
			default:
				return `${existingClass} animation-none`
		}
	}

	function onTitleClicked(title: CalendarTitles) {
		if (title.readOnly) {
			return
		}

		switch (view) {
			// Days -> Months
			case "days":
				_pickerView = "months"
				break

			// Months -> Years
			case "months":
				_pickerView = "years"
				break
		}
	}

	async function onPreviousButtonClicked(e: MouseEvent) {
		await startNewAnimationAsync(CalendarVerticalPosition.Bottom)

		switch (view) {
			case "days":
				pickerMonth.setMonth(pickerMonth.getMonth() - 1)
				break

			case "months":
				pickerMonth.setFullYear(pickerMonth.getFullYear() - 1)
				break

			case "years":
				pickerMonth.setFullYear(pickerMonth.getFullYear() - 12)
				break
		}
		pickerMonth = new Date(pickerMonth)
		onPickerMonthChange?.({pickerMonth})
	}

	async function onNextButtonHandlerAsync(e: MouseEvent) {
		await startNewAnimationAsync(CalendarVerticalPosition.Top)

		switch (view) {
			case "days":
				pickerMonth.setMonth(pickerMonth.getMonth() + 1)
				break

			case "months":
				pickerMonth.setFullYear(pickerMonth.getFullYear() + 1)
				break

			case "years":
				pickerMonth.setFullYear(pickerMonth.getFullYear() + 12)
				break
		}
		pickerMonth = new Date(pickerMonth)
		onPickerMonthChange?.({pickerMonth})
	}

	async function onSelectDayHandlerAsync(value_: Date, dayDisabled: boolean) {
		if (dayDisabled) return

		switch (selectMode) {
			// Single selection
			case "single":
				value = value_
				onChange?.({value: value_})
				break

			// Multiple selection — toggle the clicked group (single day by default,
			// or whatever getDatesToSelectCallback returns). The clicked day determines the
			// toggle pivot: if it's already in selectedDates, the entire group is
			// removed; otherwise the group is unioned in.
			case "multiple": {
				const group     = getDatesToSelectCallback ? getDatesToSelectCallback({date: value_}) : [value_]
				const isRemoving = selectedDates.some(d => sameDay(d, value_))

				let newSelectedDates: Date[]
				if (isRemoving) {
					newSelectedDates = selectedDates.filter(d => !group.some(g => sameDay(g, d)))
				} else {
					newSelectedDates = dedupeDates([...selectedDates, ...group])
				}

				if (!isRemoving && maxSelectedDayCount !== undefined && newSelectedDates.length > maxSelectedDayCount) {
					fireMaxExceeded(group)
					return
				}

				selectDates(newSelectedDates)
				break
			}

			// Range of dates
			case "range": {
				// When getDatesToSelectCallback is provided, clicking any day defines the
				// entire range via the function. The result is taken verbatim —
				// callers control skip/jump-over behavior for disabled days.
				if (getDatesToSelectCallback) {
					const group = getDatesToSelectCallback({date: value_})
					if (maxSelectedDayCount !== undefined && group.length > maxSelectedDayCount) {
						fireMaxExceeded(group)
						return
					}
					_rangeSelector.start = getSmallest(group)
					_rangeSelector.end   = getLargest(group)
					selectDates(group)
					_selectedDatesMouseOver = []
					break
				}

				const resetRange = (_rangeSelector.isValid() || _rangeSelector.isSingle()) && _rangeSelector.includes(value_)

				// Reset the selection
				if (resetRange) {
					_rangeSelector.clear()
				}

				// End the selection
				else if (_rangeSelector.start !== null && _rangeSelector.end === null) {
					_rangeSelector.end = value_
				}

				// Start the selection
				else {
					_rangeSelector.start = value_
					_rangeSelector.end   = null

					await onSelectDayMouseOverAsync(value_, false)
				}

				// Emit [start] while end is null so the user sees their pivot day
				// highlighted between the first and second click of a new range —
				// otherwise the selection looks empty and they can't tell a new
				// range has been started.
				const newSelectedDates = _rangeSelector.end !== null
					? _rangeSelector.getAllDates()
					: (_rangeSelector.start ? [_rangeSelector.start] : [])

				if (maxSelectedDayCount !== undefined && newSelectedDates.length > maxSelectedDayCount) {
					fireMaxExceeded(newSelectedDates)
					_rangeSelector.clear()
					return
				}

				selectDates(newSelectedDates)
				break
			}
		}
	}

	async function onSelectDayMouseOverAsync(value: Date, dayDisabled: boolean) {
		// Pure-observation hover callback fires regardless of selectMode or
		// disabled state — consumers may want to react to inactive days too
		// (e.g., tooltip explaining why the day is disabled).
		onDayHover?.({date: value})

		if (dayDisabled || selectMode === "single") {
			return
		}

		// Highlight set is whatever getDatesToHighlightCallback returns (verbatim — no
		// internal disabled filtering). Falls back to the existing in-progress
		// range preview ([rangeStart, hovered]) for range mode when no
		// getDatesToHighlightCallback is provided.
		if (getDatesToHighlightCallback) {
			_selectedDatesMouseOver = getDatesToHighlightCallback({date: value})
			return
		}

		if (selectMode === "range" && _rangeSelector.start && !_rangeSelector.end) {
			_rangeSelectorMouseOver.start = _rangeSelector.start
			_rangeSelectorMouseOver.end   = value
			_selectedDatesMouseOver       = _rangeSelectorMouseOver.getAllDates()
			return
		}

		_selectedDatesMouseOver = []
	}

	async function onSelectMonthHandlerAsync(year: number, month: number, isReadOnly: boolean) {
		if (isReadOnly) {
			return
		}

		const newValue = new Date(year, month, 1, 0, 0, 0, 0)
		value = newValue
		onChange?.({value: newValue})
	}

	async function onSelectYearHandlerAsync(year: number, isReadOnly: boolean) {
		if (isReadOnly) {
			return
		}

		const newValue = new Date(year, 0, 1, 0, 0, 0, 0)
		value = newValue
		onChange?.({value: newValue})
	}

	function allDaysAreDisabled(start: Date, end: Date) {
		if (!getIsDateDisabledCallback && !getIsDateSelectableCallback) {
			return false
		}

		for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
			if (!effectiveDisabledFunc(day)) {
				return false
			}
		}

		return true
	}

	function getDayProperties(day: Date) {
		return new CalendarDay(calendar, day)
	}

	function getMonthProperties(year?: number, month?: number) {
		return new CalendarMonth(calendar, new Date(year ?? 0, month ?? 0))
	}

	function getYearProperties(year?: number) {
		return new CalendarYear(calendar, new Date(year ?? 0, 0, 1))
	}

	function selectDates(dates: Date[]) {
		selectedDates = dates
		onChange?.({value: dates})
	}

	function pickerMonthSelectAsync(month?: Date) {
		pickerMonth = month ?? new Date()
		_pickerView = "days"
	}

	function pickerYearSelectAsync(year?: Date) {
		pickerMonth = year ?? new Date()
		_pickerView = "days"
	}

	async function startNewAnimationAsync(position: CalendarVerticalPosition) {
		if (!canBeAnimated) {
			return
		}

		_animationRunning = CalendarVerticalPosition.Unset
		await tick()
		_animationRunning = position
	}
</script>

{#snippet arrowUp()}
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="var(--neutral-fill-strong-focus)"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M4.2 10.73a.75.75 0 001.1 1.04l5.95-6.25v14.73a.75.75 0 001.5 0V5.52l5.95 6.25a.75.75 0 001.1-1.04l-7.08-7.42a1 1 0 00-1.44 0L4.2 10.73z" />
	</svg>
{/snippet}
{#snippet arrowDown()}
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="var(--neutral-fill-strong-focus)"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M19.8 13.27a.75.75 0 00-1.1-1.04l-5.95 6.25V3.75a.75.75 0 10-1.5 0v14.73L5.3 12.23a.75.75 0 10-1.1 1.04l7.08 7.42a1 1 0 001.44 0l7.07-7.42z" />
	</svg>
{/snippet}

<div
	{...rest}
	class={className || null}
	class:fluent-calendar={view === "days"}
	class:fluent-month={view === "months"}
	class:fluent-year={view === "years"}
	aria-readonly={readonly ? "true" : null}
	aria-disabled={disabled ? "true" : null}
	style={[sizeStyle, style].filter(Boolean).join("; ") || null}
>
	{#if !_pickerView || _pickerView === "days"}
		<div>
			<!-- Title bar (label, previous and next buttons) -->
			<div class="title" part="title" aria-label="{titles.label}">
				<div
					part="label" class={getAnimationClass('label')}
					role="button" tabindex="0"
					onclick={() => onTitleClicked(titles)}
					onkeydown={(ev) => (ev.key === "Enter" || ev.key === " ") && onTitleClicked(titles)}
				>
					{titles.label}
				</div>
				<div part="move" class="change-period">
					{#if titles.previousDisabled}
						<div class="previous" aria-disabled="true"></div>
					{:else}
						<div
							class="previous" title="{titles.previousTitle}"
							role="button" tabindex="0"
							onclick={onPreviousButtonClicked}
							onkeydown={(ev) => ev.key === "Enter" || ev.key === " " ? onPreviousButtonClicked(ev as unknown as MouseEvent) : undefined}
						>
							{@render arrowUp()}
						</div>
					{/if}
					{#if titles.nextDisabled}
						<div class="next" aria-disabled="true"></div>
					{:else}
						<div
							class="next" title="{titles.nextTitle}"
							role="button" tabindex="0"
							onclick={onNextButtonHandlerAsync}
							onkeydown={(ev) => ev.key === "Enter" || ev.key === " " ? onNextButtonHandlerAsync(ev as unknown as MouseEvent) : undefined}
						>
							{@render arrowDown()}
						</div>
					{/if}
				</div>
			</div>

			{#if view === "days"}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="days" part="days" onmouseleave={ev => { _selectedDatesMouseOver = []; onDayHover?.({date: null}) }}>
					<!-- Titles: Mon, Tue, ... -->
					<div class="week-days" part="week-days">
						{#each calendarExtended.getDayNames() as weekDay}
							<div class="week-day" part="week-day" title={weekDay.name} data-abbr={weekDay.name}>
								{weekDay.shorted}
							</div>
						{/each}
					</div>

					{#each {length: 6} as _, i}
						<!-- A week of 7 days -->
						<div class="week">
							{#each calendarExtended.getDaysOfWeek(i) as day}
								{@const dayProperties = getDayProperties(day)}

								<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
								<!-- svelte-ignore a11y_mouse_events_have_key_events -->
								<div
									part="day"
									class={getAnimationClass('day')}
									role={dayProperties.isDisabled || dayProperties.isInactive ? undefined : 'button'}
									tabindex={dayProperties.isDisabled || dayProperties.isInactive ? undefined : 0}
									aria-disabled={dayProperties.isDisabled}
									data-inactive={dayProperties.isInactive}
									data-today={dayProperties.isToday}
									aria-selected={dayProperties.isSelected}
									data-multi-day={dayProperties.isMultiDaySelected}
									data-multi-day-over={multipleSelection.inProgress && _selectedDatesMouseOver.some(d => sameDay(d, day))}
									data-multi-start={multipleSelection.isMultiple && selectMode === "range" && sameDay(multipleSelection.min, day)}
									data-multi-end={multipleSelection.isMultiple && selectMode === "range" && sameDay(multipleSelection.max, day)}
									aria-label={dayProperties.title}
									data-value={dayProperties.dayIdentifier}
									onkeydown={ev => (ev.key === "Enter" || ev.key === " ") && onSelectDayHandlerAsync(day, dayProperties.isDisabled || dayProperties.isInactive || readonly || disabled || false)}
									onclick={ev => onSelectDayHandlerAsync(day, dayProperties.isDisabled || dayProperties.isInactive || readonly || disabled || false)}
									onmouseover={ev => onSelectDayMouseOverAsync(day, dayProperties.isDisabled || dayProperties.isInactive || readonly || disabled || false)}
								>
									{#if daySnippet}
										{@render daySnippet(dayProperties)}
									{:else}
										{dayProperties.dayNumber}
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{:else if view === "months"}
				<div class="months" part="months">
					{#each calendarExtended.getMonthNames() as month}
						{@const monthProperties = getMonthProperties(year, month.index)}

						<div
							class={getAnimationClass('month')}
							class:selected={monthProperties.isSelected}
							class:readonly={monthProperties.isReadOnly}
							aria-disabled={monthProperties.isDisabled}
							aria-pressed={monthProperties.isSelected}
							aria-label={monthProperties.title}
							title={monthProperties.title}
							data-value={monthProperties.monthIdentifier}
							role="button"
							tabindex={monthProperties.isDisabled || monthProperties.isReadOnly ? undefined : 0}
							onkeydown={ev => (ev.key === "Enter" || ev.key === " ") && onSelectMonthHandlerAsync(year, month.index, monthProperties.isReadOnly)}
							onclick={ev => onSelectMonthHandlerAsync(year, month.index, monthProperties.isReadOnly)}
						>
							{month.abbreviated}
						</div>
					{/each}
				</div>
			{:else if view === "years"}
				<div class="years" part="years">
					{#each calendarExtended.getYearsRange() as year}
						{@const yearProperties = getYearProperties(year.year)}

						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class={getAnimationClass('year')}
							class:selected={yearProperties.isSelected}
							class:readonly={yearProperties.isReadOnly}
							aria-disabled={yearProperties.isDisabled}
							aria-pressed={yearProperties.isSelected}
							aria-label={String(year.year)}
							title={String(year.year)}
							data-value={yearProperties.yearIdentifier}
							tabindex={yearProperties.isDisabled || yearProperties.isReadOnly ? undefined : 0}
							onkeydown={ev => (ev.key === "Enter" || ev.key === " ") && onSelectYearHandlerAsync(year.year, yearProperties.isReadOnly)}
							onclick={ev => onSelectYearHandlerAsync(year.year, yearProperties.isReadOnly)}
						>
							{year.year}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if _pickerView === "months"}
		<Calendar
			view="months"
			value={pickerMonth}
			onChange={({value: month}) => pickerMonthSelectAsync(month as Date)}
			checkIfSelectedValueHasChanged={false}
			{readonly}
			{disabled}
			{culture}
			{disabledSelectable}
			{animatePeriodChanges}
			disabledCheckAllDaysOfMonthYear={disabledCheckAllDaysOfMonthYear}
			{getIsDateDisabledCallback}
			{cellSize}
			{gap}
		/>
	{/if}

	{#if _pickerView === "years"}
		<Calendar
			view="years"
			value={pickerMonth}
			onChange={({value: year}) => pickerYearSelectAsync(year as Date)}
			checkIfSelectedValueHasChanged={false}
			{readonly}
			{disabled}
			{culture}
			disabledSelectable={disabledSelectable}
			{animatePeriodChanges}
			disabledCheckAllDaysOfMonthYear={disabledCheckAllDaysOfMonthYear}
			{getIsDateDisabledCallback}
			{cellSize}
			{gap}
		/>
	{/if}
</div>

<style>
	/* Days / months / years views (moved from the Blazor dump fluent-components.scss in 2.0). */
	/*
	    "Days" View
	*/
	.fluent-calendar {
		--fluent-calendar-day-cell-size: 28px;
		--fluent-calendar-gap: 2px;
		--fluent-calendar-multi-select-opacity: 0.2;
		font-family: var(--body-font);
		font-size: var(--type-ramp-base-font-size);
		line-height: var(--type-ramp-base-line-height);
		color: var(--neutral-foreground-rest);
		width: calc((var(--fluent-calendar-day-cell-size) + 2 * var(--fluent-calendar-gap)) * 7);
		user-select: none;
	}

	/* Header: month name and month navigation */
	.fluent-calendar .title {
		display: flex;
		padding: calc(var(--design-unit) * 2px);
		font-weight: 600;
		width: 100%;
		height: calc(var(--fluent-calendar-day-cell-size) + 4 * var(--fluent-calendar-gap));
		flex-direction: row;
		justify-content: space-between;
	}

	.fluent-calendar .title > .label {
		vertical-align: middle;
		cursor: pointer;
		width: 100%;
	}

	.fluent-calendar .change-period {
		float: inline-end;
		display: flex;
		margin-inline-end: -6px;
	}

	.fluent-calendar .change-period > .previous,
	.fluent-calendar .change-period > .next {
		width: var(--fluent-calendar-day-cell-size);
		height: var(--fluent-calendar-day-cell-size);
		margin-inline-start: calc(2 * var(--fluent-calendar-gap));
		text-align: center;
		cursor: pointer;
	}

	.fluent-calendar .change-period > .previous:not([aria-disabled="true"]):hover,
	.fluent-calendar .change-period > .next:not([aria-disabled="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-calendar .change-period > .previous svg,
	.fluent-calendar .change-period > .next svg {
		width: 16px;
		fill: var(--neutral-fill-strong-focus);
	}

	/* List of days */
	.fluent-calendar .days {
		text-align: center;
	}

	.fluent-calendar .week-days,
	.fluent-calendar .week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		grid-gap: var(--fluent-calendar-gap);
		border: 0px;
		padding: 0px;
	}

	.fluent-calendar .day,
	.fluent-calendar .week-day {
		border: 1px solid transparent;
		width: var(--fluent-calendar-day-cell-size);
		height: var(--fluent-calendar-day-cell-size);
		line-height: var(--fluent-calendar-day-cell-size);
		padding: 0px;
		box-sizing: initial;
	}

	/* Week names */
	.fluent-calendar .week-day {
		font-weight: 600;
	}

	/* Days */
	.fluent-calendar .day {
		border: calc(var(--stroke-width) * 1px) solid transparent;
		border-radius: calc(var(--control-corner-radius) * 1px);
		cursor: pointer;
	}

	.fluent-calendar[aria-readonly="true"] .day {
		cursor: default;
	}

	.fluent-calendar:not([aria-readonly="true"]) .day:not([aria-disabled="true"]):not([data-inactive="true"]):not([data-today="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	/* Inactive and Disabled */
	.fluent-calendar .day[data-inactive="true"] {
		color: var(--neutral-stroke-focus);
		cursor: default;
	}

	.fluent-calendar .day[aria-disabled="true"] {
		color: var(--neutral-stroke-focus);
		cursor: default;
	}

	.fluent-calendar .day[aria-disabled="true"]::before { /* strikethrough */
		transform: translate(-4px, 0px) rotate(45deg);
		content: "";
		display: inline-block;
		width: calc(var(--fluent-calendar-day-cell-size) * .8);
		height: calc(var(--stroke-width) * 1px);
		background: currentcolor;
		position: absolute;
		margin-top: calc(var(--fluent-calendar-day-cell-size) / 2);
		transform-origin: center center;
		z-index: var(--fluent-z-raised);
	}

	/* Today */
	.fluent-calendar .day:not([aria-selected="true"]):not([data-multi-day="true"])[data-today="true"] {
		color: var(--foreground-on-accent-rest);
		background: var(--accent-fill-rest);
		border-radius: 50%;
		position: relative;
	}

	/* Selected */
	.fluent-calendar .day[aria-selected="true"] {
		color: var(--accent-fill-rest);
		border: 1px solid var(--accent-fill-rest);
		background: var(--fill-color);
	}

	/* Selected Multiple Days */
	.fluent-calendar .day[data-multi-day="true"],
	.fluent-calendar .day[data-multi-start="true"],
	.fluent-calendar .day[data-multi-end="true"] {
		position: relative;
	}

	.fluent-calendar .day[data-multi-day="true"]::before,
	.fluent-calendar .day[data-multi-start="true"]::before,
	.fluent-calendar .day[data-multi-end="true"]::before {
		content: "";
		width: 100%;
		height: 100%;
		position: absolute;
		inset-inline-start: 0;
		background: var(--accent-fill-rest);
		opacity: var(--fluent-calendar-multi-select-opacity);
	}

	.fluent-calendar .day[data-multi-start="true"]::before {
		border-start-start-radius: 50%;
		border-end-start-radius: 50%;
	}

	.fluent-calendar .day[data-multi-end="true"]::before {
		border-start-end-radius: 50%;
		border-end-end-radius: 50%;
	}

	.fluent-calendar .day[data-multi-day-over="true"] {
		background: var(--neutral-fill-stealth-hover);
	}

	/* Animations */
	.fluent-calendar .animation-running-down {
		animation: 0.2s fluent-calendar-text-down ease-out;
	}

	.fluent-calendar .animation-running-up {
		animation: 0.2s fluent-calendar-text-up ease-out;
	}

	.fluent-calendar .animation-none {
		animation: none;
	}

	:global([dir="rtl"]) .fluent-calendar .day[aria-disabled="true"]::before {
		transform: translate(4px, 0px) rotate(45deg);
	}

	/*
	    "Months" View
	*/
	.fluent-month {
		--fluent-calendar-month-cell-size: 28px;
		--fluent-calendar-month-cell-height: 48px;
		--fluent-calendar-month-gap: 2px;
		font-family: var(--body-font);
		font-size: var(--type-ramp-base-font-size);
		line-height: var(--type-ramp-base-line-height);
		color: var(--neutral-foreground-rest);
		min-width: 220px;
		max-width: calc((var(--fluent-calendar-month-cell-size) + 2 * var(--fluent-calendar-month-gap)) * 7);
		user-select: none;
	}

	/* Header: Year name and navigation arrows */
	.fluent-month .title {
		display: flex;
		padding: calc(var(--design-unit) * 2px);
		font-weight: 600;
		width: 100%;
		height: calc(var(--fluent-calendar-month-cell-size) + 4 * var(--fluent-calendar-month-gap));
		flex-direction: row;
		justify-content: space-between;
	}

	.fluent-month .title > .label {
		vertical-align: middle;
		cursor: pointer;
		width: 100%;
	}

	.fluent-month .change-period {
		float: inline-end;
		display: flex;
		margin-inline-end: -6px;
	}

	.fluent-month .change-period > .previous,
	.fluent-month .change-period > .next {
		width: var(--fluent-calendar-month-cell-size);
		height: var(--fluent-calendar-month-cell-size);
		margin-inline-start: calc(2 * var(--fluent-calendar-month-gap));
		text-align: center;
		cursor: pointer;
	}

	.fluent-month .change-period > .previous:not([aria-disabled="true"]):hover,
	.fluent-month .change-period > .next:not([aria-disabled="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-month .change-period > .previous svg,
	.fluent-month .change-period > .next svg {
		width: 16px;
		fill: var(--neutral-fill-strong-focus);
	}

	/* List of months */
	.fluent-month .months {
		text-align: center;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-gap: var(--fluent-calendar-month-gap);
		width: 100%;
	}

	.fluent-month .month {
		display: flex;
		height: var(--fluent-calendar-month-cell-height);
		border: calc(var(--stroke-width) * 1px) solid transparent;
		border-radius: calc(var(--control-corner-radius) * 1px);
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.fluent-month[aria-readonly="true"] .month {
		cursor: default;
	}

	.fluent-month:not([aria-readonly="true"]) .month:not([aria-disabled="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-month .month.selected {
		color: var(--accent-fill-rest);
		border: 1px solid var(--accent-fill-rest);
		background: var(--fill-color);
	}

	.fluent-month .month[aria-disabled="true"] {
		color: var(--neutral-stroke-focus);
		cursor: default;
		position: relative;
	}

	.fluent-month .month[aria-disabled="true"]::before { /* strikethrough */
		transform: rotate(-12deg);
		content: "";
		display: inline-block;
		width: 60%;
		height: calc(var(--stroke-width) * 1px);
		background: currentcolor;
		position: absolute;
		inset-inline-start: 20%;
		top: 50%;
		transform-origin: center center;
		z-index: var(--fluent-z-raised);
	}

	/* Animations */
	.fluent-month .animation-running-down {
		animation: 0.2s fluent-calendar-text-down ease-out;
	}

	.fluent-month .animation-running-up {
		animation: 0.2s fluent-calendar-text-up ease-out;
	}

	.fluent-month .animation-none {
		animation: none;
	}

	/*
	    "Years" View
	*/
	.fluent-year {
		--fluent-calendar-year-cell-size: 28px;
		--fluent-calendar-year-cell-height: 48px;
		--fluent-calendar-year-gap: 2px;
		font-family: var(--body-font);
		font-size: var(--type-ramp-base-font-size);
		line-height: var(--type-ramp-base-line-height);
		color: var(--neutral-foreground-rest);
		min-width: 220px;
		max-width: calc((var(--fluent-calendar-year-cell-size) + 2 * var(--fluent-calendar-year-gap)) * 7);
		user-select: none;
	}

	/* Header: Multiple years and navigation arrows */
	.fluent-year .title {
		display: flex;
		padding: calc(var(--design-unit) * 2px);
		font-weight: 600;
		width: 100%;
		height: calc(var(--fluent-calendar-year-cell-size) + 4 * var(--fluent-calendar-year-gap));
		flex-direction: row;
		justify-content: space-between;
	}

	.fluent-year .title > .label {
		vertical-align: middle;
	}

	.fluent-year .change-period {
		float: inline-end;
		display: flex;
		margin-inline-end: -6px;
	}

	.fluent-year .change-period > .previous,
	.fluent-year .change-period > .next {
		width: var(--fluent-calendar-year-cell-size);
		height: var(--fluent-calendar-year-cell-size);
		margin-inline-start: calc(2 * var(--fluent-calendar-year-gap));
		text-align: center;
		cursor: pointer;
	}

	.fluent-year .change-period > .previous:not([aria-disabled="true"]):hover,
	.fluent-year .change-period > .next:not([aria-disabled="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-year .change-period > .previous svg,
	.fluent-year .change-period > .next svg {
		width: 16px;
		fill: var(--neutral-fill-strong-focus);
	}

	/* List of years */
	.fluent-year .years {
		text-align: center;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-gap: var(--fluent-calendar-year-gap);
		width: 100%;
	}

	.fluent-year .year {
		display: flex;
		height: var(--fluent-calendar-year-cell-height);
		border: calc(var(--stroke-width) * 1px) solid transparent;
		border-radius: calc(var(--control-corner-radius) * 1px);
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.fluent-year[aria-readonly="true"] .year {
		cursor: default;
	}

	.fluent-year:not([aria-readonly="true"]) .year:not([aria-disabled="true"]):hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-year .year.selected {
		color: var(--accent-fill-rest);
		border: 1px solid var(--accent-fill-rest);
		background: var(--fill-color);
	}

	.fluent-year .year[aria-disabled="true"] {
		color: var(--neutral-stroke-focus);
		cursor: default;
		position: relative;
	}

	.fluent-year .year[aria-disabled="true"]::before { /* strikethrough */
		transform: rotate(-12deg);
		content: "";
		display: inline-block;
		width: 60%;
		height: calc(var(--stroke-width) * 1px);
		background: currentcolor;
		position: absolute;
		inset-inline-start: 20%;
		top: 50%;
		transform-origin: center center;
		z-index: var(--fluent-z-raised);
	}

	/* Animations */
	.fluent-year .animation-running-down {
		animation: 0.2s fluent-calendar-text-down ease-out;
	}

	.fluent-year .animation-running-up {
		animation: 0.2s fluent-calendar-text-up ease-out;
	}

	.fluent-year .animation-none {
		animation: none;
	}

	@keyframes fluent-calendar-text-up {
		0% {
			opacity: 0;
			transform: translateY(80%);
		}

		20% {
			opacity: 0;
		}

		80% {
			opacity: 1;
			transform: translateY(0%);
		}

		100% {
			opacity: 1;
			transform: translateY(0%);
		}
	}

	@keyframes fluent-calendar-text-down {
		0% {
			opacity: 0;
			transform: translateY(-80%);
		}

		20% {
			opacity: 0;
		}

		80% {
			opacity: 1;
			transform: translateY(0%);
		}

		100% {
			opacity: 1;
			transform: translateY(0%);
		}
	}

	/* Host-level disabled state (consumer passes `disabled`). Per-cell `aria-disabled` (dates
	   filtered out by minDate/maxDate/getIsDateDisabledCallback) has its own strikethrough above. */
	.fluent-calendar[aria-disabled="true"],
	.fluent-month[aria-disabled="true"],
	.fluent-year[aria-disabled="true"] {
		opacity: var(--disabled-opacity, 0.5);
		cursor: not-allowed;
	}

	.fluent-calendar[aria-disabled="true"] .day,
	.fluent-calendar[aria-disabled="true"] .title > .label,
	.fluent-calendar[aria-disabled="true"] .change-period > .previous,
	.fluent-calendar[aria-disabled="true"] .change-period > .next,
	.fluent-month[aria-disabled="true"] .month,
	.fluent-month[aria-disabled="true"] .title > .label,
	.fluent-month[aria-disabled="true"] .change-period > .previous,
	.fluent-month[aria-disabled="true"] .change-period > .next,
	.fluent-year[aria-disabled="true"] .year,
	.fluent-year[aria-disabled="true"] .title > .label,
	.fluent-year[aria-disabled="true"] .change-period > .previous,
	.fluent-year[aria-disabled="true"] .change-period > .next {
		cursor: not-allowed;
		pointer-events: none;
	}
</style>
