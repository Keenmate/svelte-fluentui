<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"

	type Row = {id: number; name: string; qty: number}
	let items = $state<Row[]>([
		{id: 1, name: "Apple", qty: 5},
		{id: 2, name: "Banana", qty: 12},
		{id: 3, name: "Cherry", qty: 40}
	])
	let log = $state<string[]>([])

	const columns = [
		{field: "name", title: "Name", isEditable: true, editor: "text" as const,
			beforeCommitCallback: ({value}: {value: unknown}) => String(value).length < 2 ? "Too short" : null},
		{field: "qty", title: "Qty", filterable: true,
			getDisplayValueCallback: ({value}: {value: number}) => `${value} pcs`,
			filterCallback: ({term, row}: {term: string; row: Row}) => {
				const m = term.match(/^>(\d+)$/)
				return m ? row.qty > Number(m[1]) : null
			}}
	]
</script>

<div id="grid-wrap">
	<QuickGrid {items} {columns} idMember="id" editable editTrigger="dblclick" filterable
		onEditStart={({field, rowIndex}) => log.push(`start:${field}@${rowIndex}`)}
		onRowChange={({newValue, isValid}) => log.push(`change:${newValue}:${isValid}`)}
		onValidationError={({error}) => log.push(`error:${error}`)} />
</div>
<output id="log">{log.join(" | ")}</output>
