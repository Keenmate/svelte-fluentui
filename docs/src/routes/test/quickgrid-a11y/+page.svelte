<script lang="ts">
	import {QuickGrid, Dialog} from "svelte-fluentui"

	// QuickGrid Phase 6 — keyboard & accessibility. Spec: e2e/quickgrid-a11y.spec.ts

	type Row = {id: number; name: string; city: string}
	const names = ["Apple", "Banana", "Cherry", "Damson", "Elder", "Fig", "Grape", "Hazel", "Iris", "Juniper"]
	let rows = $state<Row[]>(names.map((name, i) => ({id: i + 1, name, city: `City ${i + 1}`})))
	const columns = [
		{field: "name" as const, title: "Name"},
		{field: "city" as const, title: "City"}
	]
	const editColumns = [
		{field: "name" as const, title: "Name", editable: true, editor: "text" as const},
		{field: "city" as const, title: "City", editable: true, editor: "text" as const}
	]
	const menu = [{id: "copy", text: "Copy"}, {id: "paste", text: "Paste"}]
	const toolbar = [{id: "star", text: "Star", icon: "star"}, {id: "flag", text: "Flag", icon: "copy"}]
	let actionLog = $state<string[]>([])

	// 6.4 tree
	const treeRows = [
		{path: "1", name: "Fruit"}, {path: "1.1", name: "Apple"}, {path: "1.2", name: "Pear"},
		{path: "2", name: "Veg"}, {path: "2.1", name: "Leek"}
	]

	// 6.6 server paging
	let serverPage = $state(1)
	const serverItems = $derived(Array.from({length: 5}, (_, i) => ({id: (serverPage - 1) * 5 + i + 1, name: `Item ${(serverPage - 1) * 5 + i + 1}`, city: "-"})))

	// D1 always-editors
	let alwaysRows = $state<Row[]>(names.slice(0, 2).map((name, i) => ({id: i + 1, name, city: `City ${i + 1}`})))
	let escLog = $state<string[]>([])

	// D2 hover toolbar inside a dialog
	let dialogOpen = $state(false)
</script>

<button id="before">Before</button>

<!-- 6.1 / 6.6 / 6.7: sorting, filtering, paging, labels -->
<div id="sort-wrap">
	<QuickGrid items={rows} {columns} sortMode="multiple" filterable pageable pageSize={3} ariaLabel="Fruit list" />
</div>

<div id="labels-wrap">
	<QuickGrid items={rows.slice(0, 4)} {columns} filterable pageable pageSize={2} ariaLabelledby="labels-caption"
		labels={{filterPlaceholder: "Filtrovat…", previousPage: "Předchozí", nextPage: "Další", pageInfo: "Strana {page} z {pageCount}"}} />
	<p id="labels-caption">Localised grid</p>
	<QuickGrid items={[]} {columns} labels={{empty: "Žádné položky"}} />
</div>

<!-- 6.2 / 6.3 / 6.5: navigate mode, context menu, hover toolbar -->
<div id="nav-wrap">
	<QuickGrid items={rows.slice(0, 3)} columns={editColumns} editable editTrigger="navigate" contextMenu={menu}
		showRowToolbar rowToolbar={toolbar} onAction={({id, rowKey}) => actionLog.push(`${id}:${rowKey}`)} />
</div>
<button id="after">After</button>
<output id="action-log">{actionLog.join(",")}</output>

<!-- 6.5 rows of a read-only hover-toolbar grid are focusable -->
<div id="row-wrap">
	<QuickGrid items={rows.slice(0, 3)} {columns} showRowToolbar rowToolbar={toolbar} onAction={({id, rowKey}) => actionLog.push(`${id}:${rowKey}`)} />
</div>

<div id="button-wrap">
	<QuickGrid items={rows.slice(0, 2)} {columns} showRowToolbar toolbarTrigger="button" rowToolbar={toolbar} />
</div>

<!-- 6.4 -->
<div id="tree-wrap">
	<QuickGrid items={treeRows} columns={[{field: "name", title: "Name", tree: true}]} treePathMember="path" defaultExpandDepth={0} />
</div>

<!-- 6.6 server paging -->
<div id="server-wrap">
	<QuickGrid items={serverItems} {columns} pageable pageSize={5} paginationMode="server" totalItems={23}
		bind:currentPage={serverPage} />
</div>

<!-- D1 -->
<div id="always-wrap">
	<QuickGrid items={alwaysRows} columns={[{field: "id", title: "Id"}, {field: "name", title: "Name", editable: true, editor: "text"}]}
		editable editTrigger="always" onRowChange={({itemIndex, field, newValue}) => {
			alwaysRows[itemIndex] = {...alwaysRows[itemIndex], [field]: newValue}
		}} />
</div>
<output id="always-names">{alwaysRows.map((r) => r.name).join(",")}</output>
<input id="esc-probe" onkeydown={(e) => { if (e.key === "Escape") escLog.push("esc") }} />
<output id="esc-log">{escLog.join(",")}</output>

<!-- D2 -->
<button id="open-dialog" onclick={() => (dialogOpen = true)}>Open dialog</button>
<Dialog bind:open={dialogOpen} title="Grid dialog">
	<div id="dialog-wrap">
		<QuickGrid items={rows.slice(0, 3)} {columns} showRowToolbar rowToolbar={toolbar} />
	</div>
</Dialog>
<output id="dialog-open">{dialogOpen}</output>
<div style="height: 400px"></div>
