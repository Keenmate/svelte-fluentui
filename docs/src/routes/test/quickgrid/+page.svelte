<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridCellValidationState} from "svelte-fluentui"

	type Row = {id: number; name: string; qty: number}
	let items = $state<Row[]>([
		{id: 1, name: "Apple", qty: 5},
		{id: 2, name: "Banana", qty: 12},
		{id: 3, name: "Cherry", qty: 40}
	])
	let log = $state<string[]>([])
	let teamRows = $state([{id: 1, team: "web", component: "auth-ui" as string | null}])
	let teamLog = $state<string[]>([])
	let alwaysRows = $state([{id: 1, name: "Alice"}, {id: 2, name: "Bob"}])
	let alwaysLog = $state<string[]>([])
	let teamInvalid = $state<QuickGridCellValidationState[]>([])

	const columns = [
		{field: "name", title: "Name", editable: true, editor: "text" as const,
			beforeCommitCallback: ({value}: {value: unknown}) => String(value).length < 2 ? "Too short" : null},
		{field: "qty", title: "Qty", filterable: true,
			getDisplayValueCallback: ({value}: {value: number}) => `${value} pcs`,
			filterCallback: ({term, row}: {term: string; row: Row}) => {
				const m = term.match(/^>(\d+)$/)
				return m ? row.qty > Number(m[1]) : null
			}}
	]
</script>

<div id="toolbar-wrap">
	<QuickGrid {items} columns={[{field: "id", title: "Id"}, {field: "name", title: "Name"}]} idMember="id"
		showRowToolbar
		rowToolbar={[
			{id: "star", text: "Star", icon: "star", onClick: ({row}) => log.push(`star:${(row as Row).name}`)},
			{divider: true},
			"delete"
		]}
		contextMenu={[
			{id: "copy", getTextCallback: ({column}) => `Copy ${column.title}`, onClick: ({cellValue}) => log.push(`copy:${cellValue}`)},
			{divider: true},
			{id: "never", text: "Never", isVisible: false}
		]}
		onAction={({source, action, id, rowIndex}) => log.push(`${source}:${action}:${id ?? "-"}@${rowIndex}`)} />
</div>

<div id="grid-wrap">
	<QuickGrid {items} {columns} idMember="id" editable editTrigger="dblclick" filterable
		onEditStart={({field, rowIndex}) => log.push(`start:${field}@${rowIndex}`)}
		onRowChange={({newValue, isValid}) => log.push(`change:${newValue}:${isValid}`)}
		onValidationError={({error}) => log.push(`error:${error}`)} />
</div>
<!-- Dependent fields: picking a team clears the row's component (consumer-side). -->
<div id="dependent-wrap">
	<QuickGrid items={teamRows} idMember="id" editable editTrigger="navigate" bind:invalidCells={teamInvalid}
		columns={[
			{field: "team", title: "Team", editable: true, editor: "select" as const,
				editorOptions: {options: [{value: "web", label: "Web"}, {value: "api", label: "API"}]}},
			{field: "component", title: "Component", getDisplayValueCallback: ({value}: {value: string | null}) => value ?? "none"}
		]}
		onRowChange={({rowIndex, field, oldValue, newValue, draftRow, isValid}) => {
			teamLog.push(`${field}:${oldValue}->${newValue}`)
			if (!isValid) return
			teamRows[rowIndex] = {...draftRow, component: field === "team" ? null : draftRow.component}
		}} />
	<output id="team-log">{teamLog.join(" | ")}</output>
</div>

<!-- editTrigger "always": one editor instance per cell for life. -->
<div id="always-wrap">
	<QuickGrid items={alwaysRows} idMember="id" editable editTrigger="always"
		columns={[{field: "name", title: "Name", editable: true, editor: "text" as const}]}
		onRowChange={({rowIndex, draftRow, newValue}) => { alwaysLog.push(String(newValue)); alwaysRows[rowIndex] = {...draftRow} }} />
	<output id="always-log">{alwaysLog.join(" | ")}</output>
</div>

<output id="log">{log.join(" | ")}</output>
