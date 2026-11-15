<script lang="ts">
	import {DatePicker, TimePicker, Calendar} from "svelte-fluentui"

	let date = $state<Date | null>(new Date(2026, 4, 10))
	let dateOpen = $state(false)
	let time = $state<string | null>("09:30")
	let timeOpen = $state(false)

	let calValue = $state(new Date(2026, 4, 10))
	let calMonth = $state(new Date(2026, 4, 10))
	let calChanges = $state(0)

	let todayValue = $state(new Date(2000, 0, 1))
	let strictValue = $state(new Date(2026, 4, 10))
	let strictChanges = $state(0)

	const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : ""
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 320px">
	<DatePicker id="dp" label="Start date" bind:value={date} bind:open={dateOpen} />
	<TimePicker id="tp" label="Start time" bind:value={time} bind:open={timeOpen} />

	<div id="cal">
		<Calendar bind:value={calValue} bind:pickerMonth={calMonth}
			getIsDateDisabledCallback={({date}) => date.getDate() === 15}
			disabledSelectable
			onChange={() => calChanges++} />
	</div>

	<div id="cal-today">
		<Calendar bind:value={todayValue} />
	</div>

	<div id="cal-strict">
		<Calendar bind:value={strictValue} pickerMonth={new Date(2026, 4, 1)} checkIfSelectedValueHasChanged
			onChange={() => strictChanges++} />
	</div>
</div>

<output id="dp-open">{dateOpen}</output>
<output id="dp-value">{fmt(date)}</output>
<output id="tp-open">{timeOpen}</output>
<output id="tp-value">{time ?? ""}</output>
<output id="cal-value">{fmt(calValue)}</output>
<output id="cal-month">{calMonth.getFullYear()}-{calMonth.getMonth() + 1}</output>
<output id="cal-changes">{calChanges}</output>
<output id="strict-changes">{strictChanges}</output>
