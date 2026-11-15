<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridColumn} from "svelte-fluentui"

	// QuickGrid `virtualize`. Spec: e2e/quickgrid-virtual.spec.ts

	type Row = {id: number; name: string; team: string}
	const teams = ["web", "api", "ops"]
	let rows = $state<Row[]>(Array.from({length: 1000}, (_, i) => ({id: i + 1, name: `Person ${i + 1}`, team: teams[i % 3]})))
	const columns: QuickGridColumn<Row>[] = [
		{field: "id", title: "Id"},
		{field: "name", title: "Name", editable: true},
		{field: "team", title: "Team", getDisplayValueCallback: ({value}) => String(value).toUpperCase()}
	]

	// Tree: 100 parents × 4 children
	type Node = {path: string; name: string}
	const treeRows: Node[] = []
	for (let p = 1; p <= 100; p++) {
		treeRows.push({path: String(p), name: `Group ${p}`})
		for (let c = 1; c <= 4; c++) treeRows.push({path: `${p}.${c}`, name: `Item ${p}.${c}`})
	}

	const small = Array.from({length: 60}, (_, i) => ({id: i + 1, name: `Row ${i + 1}`}))
</script>

<div id="nav-wrap">
	<QuickGrid items={rows} idMember="id" {columns} virtualize filterable sortMode="single" editable editTrigger="navigate"
		ariaLabel="People"
		onRowChange={({itemIndex, row, field, newValue}) => (rows[itemIndex] = {...row, [field]: newValue})} />
</div>

<div id="tree-wrap">
	<QuickGrid items={treeRows} treePathMember="path" virtualize ariaLabel="Groups"
		columns={[{field: "name", title: "Name", tree: true}]} />
</div>

<div id="rows-wrap">
	<QuickGrid items={small} idMember="id" virtualize showRowToolbar toolbarTrigger="hover" ariaLabel="Rows"
		style="--fluent-quickgrid-virtual-max-height: 300px"
		columns={[{field: "name", title: "Name"}]} />
</div>

<div id="paged-wrap">
	<QuickGrid items={small} idMember="id" virtualize pageable pageSize={10} columns={[{field: "name", title: "Name"}]} />
</div>
