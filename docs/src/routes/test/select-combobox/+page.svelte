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
	let selOpen = $state(false)
	let selOpenLog = $state<boolean[]>([])
	let comboOpen = $state(false)
	let comboOpenLog = $state<boolean[]>([])
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

<section id="select-open">
	<Select id="sel-open" bind:open={selOpen} onOpenChange={({open}) => selOpenLog.push(open)}>
		<Option value="e">Echo</Option>
		<Option value="f">Foxtrot</Option>
	</Select>
	<button id="sel-open-set" type="button" onclick={() => (selOpen = true)}>open</button>
	<button id="sel-close-set" type="button" onclick={() => (selOpen = false)}>close</button>
	<output id="sel-open-log">{selOpenLog.join(",")}</output>
</section>

<section id="combo-open">
	<Combobox
		id="combo-open-input"
		height="48px"
		bind:open={comboOpen}
		onOpenChange={({open}) => comboOpenLog.push(open)}
	>
		<Option value="g">Golf</Option>
		<Option value="h">Hotel</Option>
	</Combobox>
	<button id="combo-open-set" type="button" onclick={() => (comboOpen = true)}>open</button>
	<button id="combo-close-set" type="button" onclick={() => (comboOpen = false)}>close</button>
	<output id="combo-open-log">{comboOpenLog.join(",")}</output>
</section>
