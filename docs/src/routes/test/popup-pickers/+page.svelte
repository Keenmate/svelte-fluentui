<script lang="ts">
	import {DatePicker, TimePicker, Dialog} from "svelte-fluentui"

	let date = $state<Date | null>(new Date(2026, 4, 10))
	let dateOpen = $state(false)
	let time = $state<string | null>(null)
	let timeOpen = $state(false)
	let dialogOpen = $state(false)
	let dialogDate = $state<Date | null>(new Date(2026, 4, 10))
	let dialogDateOpen = $state(false)

	const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : ""
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 320px">
	<DatePicker id="dp" bind:value={date} bind:open={dateOpen} />
	<TimePicker id="tp" bind:value={time} bind:open={timeOpen} />
	<input id="outside" placeholder="outside" />
	<button id="open-dialog" onclick={() => (dialogOpen = true)}>open dialog</button>
</div>

<Dialog bind:open={dialogOpen} title="Pickers">
	<DatePicker id="dialog-dp" bind:value={dialogDate} bind:open={dialogDateOpen} />
</Dialog>

<output id="dp-open">{dateOpen}</output>
<output id="dp-value">{fmt(date)}</output>
<output id="tp-open">{timeOpen}</output>
<output id="tp-value">{time ?? ""}</output>
<output id="dialog-open">{dialogOpen}</output>
<output id="dialog-dp-open">{dialogDateOpen}</output>
<output id="dialog-dp-value">{fmt(dialogDate)}</output>
