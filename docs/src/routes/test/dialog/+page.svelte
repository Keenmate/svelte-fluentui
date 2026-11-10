<script lang="ts">
	import {Dialog, Combobox, Select, DatePicker, Option} from "svelte-fluentui"

	let noTrapOpen = $state(false)
	let comboOpen = $state(false)
	let combo = $state<string[] | null | undefined>(null)
	let selectValue = $state<string | string[] | undefined>(undefined)
	let date = $state<Date | null>(null)
</script>

<button id="outside-button">outside</button>

<button id="open-notrap" onclick={() => (noTrapOpen = true)}>open no-trap</button>
<Dialog bind:visible={noTrapOpen} modal={false} trapFocus={false} title="No trap">
	<button id="inside-notrap">inside</button>
</Dialog>

<button id="open-combo" onclick={() => (comboOpen = true)}>open combo dialog</button>
<Dialog bind:visible={comboOpen} title="Combo">
	<Combobox id="dialog-combo" bind:value={combo}>
		<Option value="a">Alpha</Option>
		<Option value="b">Bravo</Option>
	</Combobox>
	<Select id="dialog-select" bind:value={selectValue}>
		<Option value="x">Xray</Option>
		<Option value="y">Yankee</Option>
	</Select>
	<DatePicker id="dialog-date" bind:value={date} />
</Dialog>
<output id="combo-open">{comboOpen}</output>
