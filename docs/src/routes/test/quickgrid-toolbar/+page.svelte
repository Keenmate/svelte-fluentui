<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"

	// QuickGrid Phase 5 — row toolbar, context menu, listeners. Spec: e2e/quickgrid-toolbar.spec.ts

	type Row = {id: number; name: string; city: string}
	const names = ["Apple", "Banana", "Cherry", "Damson", "Elder", "Fig", "Grape", "Hazel", "Iris", "Juniper"]
	let rows = $state<Row[]>(names.map((name, i) => ({id: i + 1, name, city: `City ${i + 1}`})))
	const columns = [
		{field: "name" as const, title: "Name", editable: true, editor: "text" as const},
		{field: "city" as const, title: "City"}
	]
	const wideColumns = [
		{field: "name" as const, title: "Name", minWidth: "260px"},
		{field: "city" as const, title: "City", minWidth: "260px"}
	]
	const menu = [{id: "copy", text: "Copy"}]
	const toolbar = [{id: "star", text: "Star", icon: "star"}]

	// 5.6 grids mounted on demand; the spec counts document / window listeners around them
	let showListenerGrids = $state(false)
	$effect(() => {
		;(window as unknown as {__unmountGrids: () => void}).__unmountGrids = () => (showListenerGrids = false)
	})
</script>

<p id="outside">Outside the grids</p>

<!-- 5.1 / 5.2 / 5.4: hover toolbar, editable, filter row, context menu -->
<div id="hover-wrap">
	<QuickGrid items={rows.slice(0, 3)} {columns} editable editTrigger="dblclick" filterable
		showRowToolbar rowToolbar={toolbar} contextMenu={menu} />
</div>

<div id="click-wrap">
	<QuickGrid items={rows.slice(0, 3)} {columns} showRowToolbar toolbarTrigger="click" rowToolbar={toolbar} />
</div>

<div id="button-wrap">
	<QuickGrid items={rows.slice(0, 3)} {columns} showRowToolbar toolbarTrigger="button" rowToolbar={toolbar} />
</div>

<!-- 5.3: the grid scrolls inside its own container, both ways -->
<div id="scroll-wrap" style="width: 320px; height: 160px; overflow: auto; margin-inline-start: 120px;">
	<QuickGrid items={rows} columns={wideColumns} showRowToolbar toolbarTrigger="click" rowToolbar={toolbar} contextMenu={menu} />
</div>

<!-- 5.5: a transformed ancestor (fixed positioning would be relative to it) -->
<div id="transformed-wrap" style="transform: translateX(0); margin-block-start: 40px; padding: 20px;">
	<QuickGrid items={rows.slice(0, 3)} {columns} contextMenu={menu} />
</div>

<!-- 5.6 -->
<button id="mount-grids" onclick={() => (showListenerGrids = !showListenerGrids)}>Toggle grids</button>
{#if showListenerGrids}
	<div id="listener-wrap">
		{#each [1, 2, 3] as n (n)}
			<QuickGrid items={rows.slice(0, 2)} {columns} showRowToolbar toolbarTrigger="click" rowToolbar={toolbar} contextMenu={menu} />
		{/each}
	</div>
{/if}
<div style="height: 600px"></div>
