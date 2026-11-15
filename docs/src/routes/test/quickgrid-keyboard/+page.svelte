<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridColumn} from "svelte-fluentui"

	// QuickGrid navigate-mode keyboard: fast arrows, PageUp / PageDown, Home / End, Ctrl+Home / Ctrl+End.
	// Spec: e2e/quickgrid-keyboard.spec.ts

	type Row = {id: number; name: string; team: string; city: string}
	const rows: Row[] = Array.from({length: 1000}, (_, i) => ({id: i + 1, name: `Person ${i + 1}`, team: `T${i % 3}`, city: `C${i % 7}`}))
	const columns: QuickGridColumn<Row>[] = [
		{field: "id", title: "Id"},
		{field: "name", title: "Name", editable: true},
		{field: "team", title: "Team"},
		{field: "city", title: "City"}
	]
	const fifty = rows.slice(0, 50)
</script>

<!-- Not virtualised, in a scrolling box (PageUp / PageDown step = the rows that fit in it) -->
<div id="plain-wrap">
	<QuickGrid items={fifty} idMember="id" {columns} editable editTrigger="navigate" ariaLabel="Plain"
		style="max-height: 300px; overflow: auto" />
</div>

<div id="virtual-wrap">
	<QuickGrid items={rows} idMember="id" {columns} virtualize editable editTrigger="navigate" ariaLabel="Virtual"
		style="--fluent-quickgrid-virtual-max-height: 300px" />
</div>

<div id="paged-wrap">
	<QuickGrid items={fifty} idMember="id" {columns} pageable pageSize={10} editable editTrigger="navigate" ariaLabel="Paged" />
</div>
