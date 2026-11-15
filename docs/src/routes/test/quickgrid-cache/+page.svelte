<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridColumn} from "svelte-fluentui"

	// QuickGrid render / filter caches: what must still update. Spec: e2e/quickgrid-perf.spec.ts

	type Row = {id: number; name: string; city: string; amount: number}
	const seed = (): Row[] => [
		{id: 1, name: "Anna", city: "ZRH", amount: 1234.5},
		{id: 2, name: "Bořek", city: "PRG", amount: 99},
		{id: 3, name: "Chloé", city: "OSL", amount: 5}
	]

	// Display-callback calls (a filter keystroke must not re-format rows it doesn't change)
	let calls = 0
	let callCount = $state(0)

	// Deep-reactive rows (in-place edits are tracked), and raw rows (only a new array is)
	let rows = $state(seed())
	let rawRows = $state.raw(seed())

	let cityNames = $state<Record<string, string>>({ZRH: "Zürich", PRG: "Praha", OSL: "Oslo"})
	let upperCity = $state(false)
	let culture = $state(new Intl.Locale("en-US"))
	let searchBehavior = $state<"normalized" | "exact">("normalized")
	let filters = $state<Record<string, string>>({})

	let columns = $derived<QuickGridColumn<Row>[]>([
		{field: "name", title: "Name", editable: true},
		{field: "city", title: "City", getDisplayValueCallback: upperCity
			? ({value}) => (calls++, (cityNames[value as string] ?? String(value)).toUpperCase())
			: ({value}) => (calls++, cityNames[value as string] ?? String(value))},
		{field: "amount", title: "Amount", getDisplayValueCallback: ({value}) => (calls++, (value as number).toLocaleString(culture.baseName))}
	])
</script>

<div id="deep-wrap">
	<QuickGrid items={rows} idMember="id" {columns} {culture} {searchBehavior} filterable bind:filters sortMode="single"
		editable editTrigger="dblclick"
		onRowChange={({itemIndex, row, field, newValue}) => (rows[itemIndex] = {...row, [field]: newValue})} />
</div>
<p>
	<button type="button" id="deep-mutate" onclick={() => (rows[0].city = "PRG")}>Mutate row 1 city in place</button>
	<button type="button" id="deep-mutate-name" onclick={() => (rows[1].name = "Zuzana")}>Mutate row 2 name in place</button>
	<button type="button" id="deep-replace" onclick={() => (rows = rows.map((r) => ({...r, name: r.name + "!"})))}>Replace items immutably</button>
	<button type="button" id="deep-push" onclick={() => rows.push({id: 4, name: "Dana", city: "ZRH", amount: 7})}>Push a row</button>
	<button type="button" id="lookup" onclick={() => (cityNames = {...cityNames, OSL: "Zürichberg"})}>Rename OSL</button>
	<button type="button" id="upper" onclick={() => (upperCity = !upperCity)}>Uppercase callback</button>
	<button type="button" id="culture-de" onclick={() => (culture = new Intl.Locale("de-DE"))}>de-DE</button>
	<button type="button" id="exact" onclick={() => (searchBehavior = "exact")}>Exact search</button>
	<button type="button" id="calls" onclick={() => (callCount = calls)}>Read calls</button>
	<output id="call-count">{callCount}</output>
</p>

<div id="raw-wrap">
	<QuickGrid items={rawRows} idMember="id" {columns} filterable />
</div>
<p>
	<button type="button" id="raw-mutate" onclick={() => { rawRows[0].city = "OSL"; rawRows = [...rawRows] }}>Mutate raw row 1 + new array</button>
</p>
