<script lang="ts">
	import {Select, Combobox, Option} from "svelte-fluentui"

	let single = $state<string | string[] | undefined>("a")
	let singleLog = $state<string[]>([])
	let multi = $state<string | string[] | undefined>([])
	let multiLog = $state<string[]>([])
	let combo = $state<string[] | null | undefined>([])
	let comboLog = $state<string[]>([])
	let terms = $state<string[]>([])
	let filtered = $state<string[]>([])
	let currentText = $state<string | undefined>("")
</script>

<section id="select-single">
	<Select id="sel-single" bind:value={single} onChange={({value, option}) => singleLog.push(`${JSON.stringify(value)}:${option?.text}`)}>
		<Option value="a">Alpha</Option>
		<Option value="b" data={{n: 2}}>Bravo</Option>
	</Select>
	<output id="select-single-log">{singleLog.join(" | ")}</output>
</section>

<section id="select-multi">
	<Select id="sel-multi" multiple bind:value={multi} onChange={({value}) => multiLog.push(JSON.stringify(value))}>
		<Option value="x">Xray</Option>
		<Option value="y">Yankee</Option>
	</Select>
	<output id="select-multi-log">{multiLog.join(" | ")}</output>
</section>

<section id="combo">
	<Combobox
		id="combo-input"
		data-testid="combo-root"
		bind:value={combo}
		bind:currentValue={currentText}
		onChange={({value}) => comboLog.push(JSON.stringify(value))}
		filterCallback={({term, option}) => {
			filtered.push(`${term}:${option.label}`)
			return option.label.toLowerCase().startsWith(term.toLowerCase())
		}}
	>
		<Option value="c1">Charlie</Option>
		<Option value="c2">Delta</Option>
	</Combobox>
	<output id="combo-log">{comboLog.join(" | ")}</output>
	<output id="combo-current">{currentText}</output>
	<output id="combo-filtered">{filtered.length > 0 ? "called" : ""}</output>
</section>

<section id="search">
	<Combobox id="search-input" options={[]} onSearch={({term}) => terms.push(term)} searchDelay={0} />
	<output id="search-terms">{terms.join(",")}</output>
</section>
