<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"

	// GridCellEditor's select / combobox / autocomplete editors render the library's Select and
	// Combobox. Spec: e2e/quickgrid-editors.spec.ts

	const json = (v: unknown) => JSON.stringify(v)

	// Option groups (`group` on the editor options), typed values (numbers).
	const produce = [
		{value: 1, label: "Apple", group: "Fruit"},
		{value: 2, label: "Banana", group: "Fruit"},
		{value: 3, label: "Carrot", group: "Vegetable"},
		{value: 4, label: "Leek", group: "Vegetable"}
	]
	let groupRows = $state([{id: 1, pick: 1 as number | null, combo: 3 as number | null}])
	let groupLog = $state<string[]>([])

	// Select type-ahead: a multi-letter prefix.
	const berries = [
		{value: "banana", label: "Banana"},
		{value: "blueberry", label: "Blueberry"},
		{value: "cherry", label: "Cherry"},
		{value: "zucchini", label: "Zucchini"}
	]
	let typeRows = $state([{id: 1, fruit: "cherry"}])

	// Navigate mode: the grid owns the keys while a dropdown editor is open / closed.
	let navRows = $state([
		{id: 1, fruit: "banana", city: "prg"},
		{id: 2, fruit: "cherry", city: "brn"},
		{id: 3, fruit: "zucchini", city: "prg"}
	])
	let navLog = $state<string[]>([])
	const cities = [{value: "prg", label: "Prague"}, {value: "brn", label: "Brno"}, {value: "ost", label: "Ostrava"}]

	// A combobox value no option has: the editor shows the cell's text.
	let missingRows = $state([{id: 1, city: "zlin"}])

	// Autocomplete (free text, async search): Escape backs out of the typed text.
	let acRows = $state([{id: 1, city: "prg"}])
	let acLog = $state<string[]>([])
</script>

<div id="groups-wrap" style="max-width: 500px">
	<QuickGrid items={groupRows} idMember="id" editable editTrigger="dblclick"
		columns={[
			{field: "id", title: "Id", width: "60px"},
			{field: "pick", title: "Pick", width: "160px", editable: true, editor: "select" as const,
				getDisplayValueCallback: ({value}) => produce.find((p) => p.value === value)?.label ?? "",
				editorOptions: {options: produce}},
			{field: "combo", title: "Combo", width: "160px", editable: true, editor: "combobox" as const,
				getDisplayValueCallback: ({value}) => produce.find((p) => p.value === value)?.label ?? "",
				editorOptions: {options: produce}}
		]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			groupLog.push(`${field}:${json(newValue)}`)
			groupRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="groups-log">{groupLog.join(" | ")}</output>
</div>

<div id="typeahead-wrap" style="max-width: 400px">
	<QuickGrid items={typeRows} idMember="id" editable editTrigger="dblclick"
		columns={[
			{field: "id", title: "Id", width: "60px"},
			{field: "fruit", title: "Fruit", width: "160px", editable: true, editor: "select" as const, editorOptions: {options: berries}}
		]} />
</div>

<div id="nav-wrap" style="max-width: 500px">
	<QuickGrid items={navRows} idMember="id" editable editTrigger="navigate"
		columns={[
			{field: "id", title: "Id", width: "60px"},
			{field: "fruit", title: "Fruit", width: "160px", editable: true, editor: "select" as const, editorOptions: {options: berries}},
			{field: "city", title: "City", width: "160px", editable: true, editor: "combobox" as const,
				getDisplayValueCallback: ({value}) => cities.find((c) => c.value === value)?.label ?? String(value ?? ""),
				editorOptions: {options: cities}}
		]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			navLog.push(`${row.id}.${field}:${json(newValue)}`)
			navRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="nav-log">{navLog.join(" | ")}</output>
</div>

<div id="missing-wrap" style="max-width: 400px">
	<QuickGrid items={missingRows} idMember="id" editable editTrigger="dblclick"
		columns={[
			{field: "id", title: "Id", width: "60px"},
			{field: "city", title: "City", width: "160px", editable: true, editor: "combobox" as const,
				getDisplayValueCallback: ({value}) => value === "zlin" ? "Zlín" : String(value ?? ""),
				editorOptions: {options: cities}}
		]} />
</div>

<div id="ac-wrap" style="max-width: 400px">
	<QuickGrid items={acRows} idMember="id" editable editTrigger="dblclick" onEditCancel={({field}) => acLog.push(`cancel:${field}`)}
		columns={[
			{field: "id", title: "Id", width: "60px"},
			{field: "city", title: "City", width: "160px", editable: true, editor: "autocomplete" as const,
				getDisplayValueCallback: ({value}) => cities.find((c) => c.value === value)?.label ?? String(value ?? ""),
				editorOptions: {initialOptions: cities, searchDelay: 50, searchCallback: async ({term}) =>
					cities.filter((c) => c.label.toLowerCase().includes(term.toLowerCase()))}}
		]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			acLog.push(`${field}:${json(newValue)}`)
			acRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<button type="button" id="ac-outside">Outside</button>
	<output id="ac-log">{acLog.join(" | ")}</output>
</div>
