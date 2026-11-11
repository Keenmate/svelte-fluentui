<script lang="ts">
	import {Calendar} from "svelte-fluentui"

	let single = $state(new Date(2026, 5, 1))
	let singleLog = $state<string[]>([])
	let multiple = $state<Date[]>([])
	let multiLog = $state<number[]>([])
	let pickerMonth = $state(new Date(2026, 5, 1))
	let monthLog = $state<string[]>([])
	const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
</script>

<section id="single">
	<Calendar bind:value={single} bind:pickerMonth onChange={({value}) => singleLog.push(fmt(value as Date))}
		onPickerMonthChange={({pickerMonth: m}) => monthLog.push(fmt(m))} />
	<output id="single-value">{fmt(single)}</output>
	<output id="single-log">{singleLog.join(",")}</output>
	<output id="picker-month">{fmt(pickerMonth)}</output>
	<output id="month-log">{monthLog.join(",")}</output>
</section>

<section id="multi">
	<Calendar selectMode="multiple" pickerMonth={new Date(2026, 5, 1)} bind:selectedDates={multiple}
		onChange={({value}) => multiLog.push((value as Date[]).length)} />
	<output id="multi-count">{multiple.length}</output>
	<output id="multi-log">{multiLog.join(",")}</output>
</section>
