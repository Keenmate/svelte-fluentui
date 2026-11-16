<script lang="ts">
	import {Select, Combobox, Autocomplete, Option, DatePicker, TimePicker} from "svelte-fluentui"

	const fruits = [
		{value: "apple", label: "Apple"},
		{value: "banana", label: "Banana"}
	]

	let sel = $state<string | string[] | undefined>("a")
	let selLog = $state<string[]>([])
	let plain = $state<string | string[] | undefined>("a")
	let combo = $state<string[] | null | undefined>(["c1"])
	let comboLog = $state<string[]>([])
	let comboMulti = $state<string[] | null | undefined>(["c1", "c2"])
	let ac = $state<string[]>(["apple"])
	let acLog = $state<string[]>([])
	let acMulti = $state<string[]>(["apple", "banana"])
	let date = $state<Date | null>(new Date(2026, 0, 15))
	let time = $state<string | null>("10:30")
	let def = $state<string | string[] | undefined>("a")
</script>

<p>Targeted by <code>e2e/show-clear.spec.ts</code>.</p>

<section id="sel">
	<Select id="sel-clear" showClear bind:value={sel} onChange={({value}) => selLog.push(JSON.stringify(value))}>
		<Option value="a">Alpha</Option>
		<Option value="b">Bravo</Option>
	</Select>
	<output id="sel-log">{selLog.join(" | ")}</output>
</section>

<section id="sel-plain">
	<Select id="sel-noclear" showClear={false} bind:value={plain}>
		<Option value="a">Alpha</Option>
	</Select>
</section>

<section id="sel-readonly">
	<Select id="sel-ro" showClear readonly value="a">
		<Option value="a">Alpha</Option>
	</Select>
</section>

<section id="combo">
	<Combobox id="combo-clear" showClear bind:value={combo} onChange={({value}) => comboLog.push(JSON.stringify(value))}>
		<Option value="c1">Charlie</Option>
		<Option value="c2">Delta</Option>
	</Combobox>
	<output id="combo-log">{comboLog.join(" | ")}</output>
</section>

<section id="combo-plain">
	<Combobox id="combo-noclear" showClear={false} value={["c1"]}>
		<Option value="c1">Charlie</Option>
	</Combobox>
</section>

<section id="combo-multi">
	<Combobox id="combo-multi-clear" multiple showClear bind:value={comboMulti}>
		<Option value="c1">Charlie</Option>
		<Option value="c2">Delta</Option>
	</Combobox>
	<output id="combo-multi-value">{JSON.stringify(comboMulti)}</output>
</section>

<section id="ac">
	<Autocomplete id="ac-clear" showClear options={fruits} maxSelectionCount={1} bind:value={ac} onChange={({value}) => acLog.push(JSON.stringify(value))} />
	<output id="ac-log">{acLog.join(" | ")}</output>
</section>

<section id="ac-plain">
	<Autocomplete id="ac-noclear" showClear={false} options={fruits} maxSelectionCount={1} value={["apple"]} />
</section>

<section id="ac-multi">
	<Autocomplete id="ac-multi-clear" showClear options={fruits} bind:value={acMulti} />
	<output id="ac-multi-value">{JSON.stringify(acMulti)}</output>
</section>

<section id="sel-default">
	<Select id="sel-def" bind:value={def}>
		<Option value="a">Alpha</Option>
	</Select>
</section>

<section id="combo-empty">
	<Combobox id="combo-typed">
		<Option value="c1">Charlie</Option>
	</Combobox>
</section>

<section id="dp">
	<DatePicker id="dp-clear" bind:value={date} />
	<output id="dp-value">{date ? "set" : "null"}</output>
</section>

<section id="tp">
	<TimePicker id="tp-clear" bind:value={time} />
	<output id="tp-value">{time ?? "null"}</output>
</section>

<button id="outside">outside</button>
