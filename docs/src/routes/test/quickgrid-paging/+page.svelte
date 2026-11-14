<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridBeforePageChangeContext, QuickGridDataRequestDetail, QuickGridSortState} from "svelte-fluentui"

	// QuickGrid Phase 4 — sort, filter, paging, tree. Spec: e2e/quickgrid-paging.spec.ts

	// 4.1 deleting rows on the last page
	let delRows = $state(["A", "B", "C", "D", "E"].map((name, i) => ({id: i + 1, name})))
	let delPage = $state(1)

	// 4.2 sortMode: columns sortable unless they opt out; asc → desc → none; multiple
	let sortRows = $state([
		{id: 1, name: "Kim", team: "b"},
		{id: 2, name: "Amy", team: "a"},
		{id: 3, name: "Zed", team: "a"},
		{id: 4, name: "Bob", team: "b"}
	])
	let singleSort = $state<QuickGridSortState[]>([])
	let sortLog = $state<string[]>([])
	let multiSort = $state<QuickGridSortState[]>([{column: "team", direction: "desc"}])
	const fmtSort = (s: QuickGridSortState[]) => s.map((x) => `${x.column}:${x.direction}`).join(",") || "none"

	// 4.3 tree: siblings sorted within their parent
	let treeRows = $state([
		{path: "1", name: "B-team"},
		{path: "1.1", name: "Zed"},
		{path: "1.2", name: "Amy"},
		{path: "2", name: "A-team"},
		{path: "2.1", name: "Kim"}
	])

	// 4.4 comparator
	type CmpRow = {id: number; code: string | null; when: Date | null; prio: string}
	const cmpRows: CmpRow[] = [
		{id: 1, code: "item10", when: new Date(2024, 0, 1), prio: "low"},     // a Monday
		{id: 2, code: null, when: null, prio: "high"},
		{id: 3, code: "item2", when: new Date(2023, 5, 4), prio: "medium"},  // a Sunday
		{id: 4, code: "", when: new Date(2024, 0, 3), prio: "low"},
		{id: 5, code: "item1", when: new Date(2023, 11, 31), prio: "high"}
	]
	const pad = (n: number) => String(n).padStart(2, "0")
	const isoDay = (d: Date | null) => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "-"
	const rank: Record<string, number> = {high: 0, medium: 1, low: 2}

	// 4.5 filter on the display value
	const cityNames: Record<string, string> = {ZRH: "Zürich", PRG: "Praha", OSL: "Oslo"}
	const cityRows = [{id: 1, city: "ZRH", alias: "ZRH"}, {id: 2, city: "PRG", alias: "PRG"}, {id: 3, city: "OSL", alias: "OSL"}]

	// 4.6 / 4.1 tree paging counts visible rows; collapsing on the last page clamps
	let pagedTree = $state([
		{path: "1", name: "One"}, {path: "1.1", name: "One-a"}, {path: "1.2", name: "One-b"},
		{path: "2", name: "Two"}, {path: "2.1", name: "Two-a"},
		{path: "3", name: "Three"}
	])

	// 4.7 tree expansion: new parents, bind:expandedPaths, chevrons while filtering
	let growRows = $state([{path: "1", name: "Root"}, {path: "1.1", name: "Leaf"}])
	let expanded = $state<Set<string> | undefined>(undefined)
	let chevRows = $state([{path: "1", name: "Root"}, {path: "1.1", name: "Leaf"}])
	let showGrow = $state(false)  // mounted on demand: the pre-2.0 grid threw on `bind:expandedPaths={undefined}`

	// 4.8 server paging
	const serverData = Array.from({length: 23}, (_, i) => ({id: i + 1, name: `Row ${String(i + 1).padStart(2, "0")}`}))
	let serverRows = $state<{id: number; name: string}[]>([])
	let serverTotal = $state(23)
	let serverLimit = 23
	let serverPage = $state(1)
	let serverPageSize = $state(5)
	let serverLog = $state<string[]>([])
	let blockPaging = $state<"no" | "sync" | "async">("no")
	function loadServer(d: QuickGridDataRequestDetail) {
		serverLog.push(`${d.trigger}:p${d.page}/s${d.pageSize}/k${d.skip}/${fmtSort(d.sort)}/${JSON.stringify(d.filters)}`)
		setTimeout(() => {
			let rows = serverData.slice(0, serverLimit).filter((r) => !d.filters.name || r.name.includes(d.filters.name))
			if (d.sort[0]?.direction === "desc") rows = [...rows].reverse()
			serverTotal = rows.length
			serverRows = rows.slice(d.skip, d.skip + d.pageSize)
		}, 10)
	}
	function beforePage(ctx: QuickGridBeforePageChangeContext) {
		serverLog.push(`before:${ctx.trigger}:${ctx.fromPage}->${ctx.toPage}`)
		if (blockPaging === "sync") return false
		if (blockPaging === "async") return new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 300))
	}
</script>

<div id="del-wrap">
	<QuickGrid items={delRows} idMember="id" columns={[{field: "name", title: "Name"}]} pageable pageSize={2} bind:currentPage={delPage} />
	<button type="button" id="del-last" onclick={() => (delRows = delRows.slice(0, -1))}>Delete last</button>
	<output id="del-page">{delPage}</output>
</div>

<div id="single-wrap">
	<QuickGrid items={sortRows} sortMode="single" bind:sort={singleSort}
		columns={[{field: "name", title: "Name"}, {field: "team", title: "Team", sortable: false}]}
		onSortChange={({sort}) => sortLog.push(fmtSort(sort))} />
	<output id="single-log">{sortLog.join(" | ")}</output>
	<output id="single-sort">{fmtSort(singleSort)}</output>
</div>

<div id="multi-wrap">
	<QuickGrid items={sortRows} sortMode="multiple" bind:sort={multiSort}
		columns={[{field: "team", title: "Team"}, {field: "name", title: "Name"}]} />
	<output id="multi-sort">{fmtSort(multiSort)}</output>
</div>

<div id="none-wrap">
	<QuickGrid items={sortRows} columns={[{field: "name", title: "Name", sortable: true}]} />
</div>

<div id="tree-sort-wrap">
	<QuickGrid items={treeRows} treePathMember="path" sortMode="single"
		columns={[{field: "name", title: "Name", tree: true}]} />
</div>

<div id="cmp-wrap">
	<QuickGrid items={cmpRows} sortMode="single"
		columns={[
			{field: "id", title: "Id"},
			{field: "code", title: "Code"},
			{field: "when", title: "When", getDisplayValueCallback: ({value}) => isoDay(value)},
			{field: "prio", title: "Prio", getSortValueCallback: ({value}) => rank[value]},
			{field: "rev", title: "Rev", getDisplayValueCallback: ({row}) => String(row.id),
				compareCallback: ({rowA, rowB}) => rowB.id - rowA.id}
		]} />
</div>

<div id="filter-wrap">
	<QuickGrid items={cityRows} filterable
		columns={[
			{field: "id", title: "Id", filterable: false},
			{field: "city", title: "City", getDisplayValueCallback: ({value}) => cityNames[value]},
			{field: "alias", title: "Alias", searchBehavior: "exact", getDisplayValueCallback: ({value}) => cityNames[value]}
		]} />
</div>

<div id="paged-tree-wrap">
	<QuickGrid items={pagedTree} treePathMember="path" pageable pageSize={2} defaultExpandDepth={0}
		columns={[{field: "name", title: "Name", tree: true}]} />
</div>

<div id="paged-tree2-wrap">
	<QuickGrid items={pagedTree} treePathMember="path" pageable pageSize={2} contextMenu={["collapse-tree"]}
		columns={[{field: "name", title: "Name", tree: true}]} />
</div>

<div id="grow-wrap">
	<button type="button" id="grow-show" onclick={() => (showGrow = true)}>Show</button>
	{#if showGrow}
		<QuickGrid items={growRows} treePathMember="path" bind:expandedPaths={expanded}
			columns={[{field: "name", title: "Name", tree: true}]} />
	{/if}
	<button type="button" id="grow-add" onclick={() => (growRows = [...growRows, {path: "2", name: "New root"}, {path: "2.1", name: "New leaf"}])}>Add branch</button>
	<output id="grow-expanded">{expanded ? [...expanded].sort().join(",") || "empty" : "undefined"}</output>
</div>

<div id="chev-wrap">
	<QuickGrid items={chevRows} treePathMember="path" filterable columns={[{field: "name", title: "Name", tree: true}]} />
	<button type="button" id="chev-add" onclick={() => (chevRows = [...chevRows, {path: "2", name: "New root"}, {path: "2.1", name: "New leaf"}])}>Add branch</button>
</div>

<div id="server-wrap">
	<QuickGrid items={serverRows} idMember="id" paginationMode="server" pageable sortMode="single" filterable
		totalItems={serverTotal} bind:currentPage={serverPage} bind:pageSize={serverPageSize} pageSizes={[5, 10]}
		beforePageChangeCallback={beforePage}
		onCurrentPageChange={({currentPage}) => serverLog.push(`page=${currentPage}`)}
		onDataRequest={loadServer}
		columns={[{field: "name", title: "Name"}]} />
	<label><input type="radio" name="block" value="no" bind:group={blockPaging} /> allow</label>
	<label><input type="radio" name="block" value="sync" id="block-sync" bind:group={blockPaging} /> block</label>
	<label><input type="radio" name="block" value="async" id="block-async" bind:group={blockPaging} /> block async</label>
	<button type="button" id="server-shrink" onclick={() => { serverLimit = 8; serverTotal = 8 }}>Shrink total</button>
	<output id="server-page">{serverPage}/{serverPageSize}</output>
	<output id="server-log">{serverLog.join(" | ")}</output>
</div>
