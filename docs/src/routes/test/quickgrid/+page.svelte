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

	// Row identity (no idMember): event indices must point into `items`, not the view.
	const nameColumn = {field: "name", title: "Name", editable: true, editor: "text" as const, sortable: true,
		beforeCommitCallback: ({value}: {value: unknown}) => String(value).length < 2 ? "Too short" : null}
	let pagedRows = $state([{name: "Alpha"}, {name: "Bravo"}, {name: "Charlie"}, {name: "Delta"}])
	let pagedLog = $state<string[]>([])
	let sortedRows = $state([{name: "Zed"}, {name: "Amy"}, {name: "Kim"}])
	let sortedLog = $state<string[]>([])
	let bumpRows = $state([{id: 1, name: "Apple", bumps: 0}, {id: 2, name: "Banana", bumps: 0}])
	let bumpLog = $state<string[]>([])

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
		onAction={({source, action, id, viewIndex, itemIndex, rowKey}) => log.push(`${source}:${action}:${id ?? "-"}@${viewIndex}/${itemIndex}/${rowKey}`)} />
</div>

<div id="grid-wrap">
	<QuickGrid {items} {columns} idMember="id" editable editTrigger="dblclick" filterable
		onEditStart={({field, viewIndex, itemIndex, rowKey}) => log.push(`start:${field}@${viewIndex}/${itemIndex}/${rowKey}`)}
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
		onRowChange={({itemIndex, field, oldValue, newValue, draftRow, isValid}) => {
			teamLog.push(`${field}:${oldValue}->${newValue}`)
			if (!isValid) return
			teamRows[itemIndex] = {...draftRow, component: field === "team" ? null : draftRow.component}
		}} />
	<output id="team-log">{teamLog.join(" | ")}</output>
</div>

<!-- editTrigger "always": one editor instance per cell for life. -->
<div id="always-wrap">
	<QuickGrid items={alwaysRows} idMember="id" editable editTrigger="always"
		columns={[{field: "name", title: "Name", editable: true, editor: "text" as const}]}
		onRowChange={({itemIndex, draftRow, newValue}) => { alwaysLog.push(String(newValue)); alwaysRows[itemIndex] = {...draftRow} }} />
	<output id="always-log">{alwaysLog.join(" | ")}</output>
</div>

<!-- Pageable grid without idMember: write-back via itemIndex; drafts must not leak across pages. -->
<div id="paged-wrap">
	<QuickGrid items={pagedRows} columns={[nameColumn]} pageable pageSize={2} editable editTrigger="dblclick"
		onRowChange={({itemIndex, viewIndex, rowKey, draftRow, isValid}) => {
			pagedLog.push(`${itemIndex}/${viewIndex}/${rowKey ? "key" : "nokey"}`)
			if (isValid) pagedRows[itemIndex] = {...draftRow}
		}} />
	<output id="paged-log">{pagedLog.join(" | ")}</output>
</div>

<!-- Sortable grid without idMember: itemIndex survives sorting (row toolbar + context menu too). -->
<div id="sorted-wrap">
	<QuickGrid items={sortedRows} columns={[nameColumn]} sortable editable editTrigger="dblclick"
		contextMenu={[{id: "pick", text: "Pick"}]}
		onAction={({viewIndex, itemIndex}) => sortedLog.push(`action:${itemIndex}/${viewIndex}`)}
		onRowChange={({itemIndex, viewIndex, draftRow, isValid}) => {
			sortedLog.push(`change:${itemIndex}/${viewIndex}`)
			if (isValid) sortedRows[itemIndex] = {...draftRow}
		}} />
	<output id="sorted-log">{sortedLog.join(" | ")}</output>
</div>

<!-- Row toolbar while the consumer replaces items immutably. -->
<div id="bump-wrap">
	<QuickGrid items={bumpRows} idMember="id" showRowToolbar
		columns={[{field: "name", title: "Name"}, {field: "bumps", title: "Bumps"}]}
		rowToolbar={[{id: "bump", text: "Bump", icon: "add", onClick: ({row, itemIndex}) => {
			const id = (row as {id: number}).id
			bumpLog.push(`${(row as {name: string}).name}@${itemIndex}`)
			bumpRows = bumpRows.map((r) => r.id === id ? {...r, bumps: r.bumps + 1} : r)
		}}]} />
	<output id="bump-log">{bumpLog.join(" | ")}</output>
</div>

<!-- A toolbar wider than the space beside the grid: must go on top, not off-screen. -->
<div id="wide-toolbar-wrap" style="margin-inline-start: 150px; width: calc(100vw - 180px);">
	<QuickGrid items={bumpRows} idMember="id" showRowToolbar
		columns={[{field: "name", title: "Name"}, {field: "bumps", title: "Bumps"}]}
		rowToolbar={["add", "duplicate", "move-up", "move-down", "delete",
			...["star", "pin", "flash", "eye", "share", "search"].map((icon) => ({id: icon, text: icon, icon}))]} />
</div>

<output id="log">{log.join(" | ")}</output>
