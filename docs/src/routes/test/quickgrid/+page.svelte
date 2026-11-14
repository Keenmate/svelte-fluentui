<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridCellValidationState, QuickGridCustomEditorContext, QuickGridRowChangeDetail} from "svelte-fluentui"

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
	let idRows = $state([{id: 7, name: "Alpha"}, {id: 8, name: "Bravo"}])
	let idLog = $state<string[]>([])

	// ---- Phase 2: editing state machine ----
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

	// Async validation on `name`, sync `city`; consumer writes back valid commits only.
	type AsyncRow = {id: number; name: string; city: string}
	let asyncRows = $state<AsyncRow[]>([{id: 1, name: "Alpha", city: "Oslo"}, {id: 2, name: "Bravo", city: "Bern"}])
	let asyncLog = $state<string[]>([])
	let asyncInvalid = $state<QuickGridCellValidationState[]>([])
	let asyncGrid: {discardDrafts: (rowKey?: string) => void} | undefined = $state()
	function logRowChange(d: QuickGridRowChangeDetail<AsyncRow>) {
		const inv = (d.invalidFields ?? []).map((f) => `${f.field}=${f.value}`).join(",")
		asyncLog.push(`${d.field}:${d.newValue}:${d.isValid} row:${d.isRowValid} inv:${inv} draft:${d.draftRow.name}/${d.draftRow.city}`)
		if (d.isValid) asyncRows[d.itemIndex] = {...d.row, [d.field]: d.newValue}
	}

	// Custom editor: commit synchronously, or keep ctx for the buttons below.
	let customRows = $state([{id: 1, name: "Alpha"}, {id: 2, name: "Bravo"}])
	let customLog = $state<string[]>([])
	let customSync = $state(false)
	let customCtx: QuickGridCustomEditorContext | null = null

	// Options loaded per row with different latencies.
	let optionRows = $state([{id: 1, team: "web"}, {id: 2, team: "api"}])
	let optionLog = $state<string[]>([])

	// Navigate-mode checkbox with a validator (Space toggle).
	let checkRows = $state([{id: 1, name: "Task", done: false}])
	let checkLog = $state<string[]>([])

	// ---- Phase 3: editors ----
	const pad = (n: number) => String(n).padStart(2, "0")
	const localDay = (v: unknown) => v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` : String(v)
	const json = (v: unknown) => v instanceof Date ? `date(${localDay(v)})` : JSON.stringify(v)

	let numRows = $state([{id: 1, price: 2.5}, {id: 2, price: 7}])
	let numLog = $state<string[]>([])

	// Local-midnight Date (created in the browser's timezone) + an ISO-output column.
	let dateRows = $state([{id: 1, start: new Date(2024, 2, 15) as Date | null, due: null as string | null}])
	let dateLog = $state<string[]>([])

	let boolRows = $state([{id: 1, name: "Task", status: "no"}])
	let boolLog = $state<string[]>([])

	let lazyRows = $state([{id: 1, team: "web"}])
	let lazyLog = $state<string[]>([])

	let immediateRows = $state([{id: 1, team: "web"}, {id: 2, team: "db"}])
	let immediateLog = $state<string[]>([])

	let queryRows = $state([{id: 1, fruit: "apple"}])

	const cities = [{value: "PRG", label: "Prague"}, {value: "BRN", label: "Brno"}, {value: "OSL", label: "Oslo"}]
	let acRows = $state([{id: 1, city: "PRG"}])
	let acLog = $state<string[]>([])

	let alwaysPagedRows = $state([{id: 1, name: "One"}, {id: 2, name: "Two"}, {id: 3, name: "Three"}, {id: 4, name: "Four"}, {id: 5, name: "Five"}])

	let orphanRows = $state([{name: "Alpha"}, {name: "Bravo"}])
	let orphanInvalid = $state<QuickGridCellValidationState[]>([])

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
	<button type="button" id="always-rename" onclick={() => (alwaysRows[1] = {...alwaysRows[1], name: "Robert"})}>Rename Bob</button>
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

<!-- No idMember, but the rows have `id`: it becomes the row key, so state survives immutable updates. -->
<div id="default-id-wrap">
	<QuickGrid items={idRows} columns={[nameColumn]} editable editTrigger="dblclick"
		onRowChange={({rowKey}) => idLog.push(rowKey)} />
	<button type="button" onclick={() => (idRows = idRows.map((r) => ({...r})))}>Replace rows</button>
	<output id="default-id-log">{idLog.join(" | ")}</output>
</div>

<!-- A toolbar wider than the space beside the grid: must go on top, not off-screen. -->
<div id="wide-toolbar-wrap" style="margin-inline-start: 150px; width: calc(100vw - 180px);">
	<QuickGrid items={bumpRows} idMember="id" showRowToolbar
		columns={[{field: "name", title: "Name"}, {field: "bumps", title: "Bumps"}]}
		rowToolbar={["add", "duplicate", "move-up", "move-down", "delete",
			...["star", "pin", "flash", "eye", "share", "search"].map((icon) => ({id: icon, text: icon, icon}))]} />
</div>

<!-- Phase 2: async validation, per-cell drafts, onRowChange ctx, discardDrafts. -->
<div id="async-wrap">
	<QuickGrid bind:this={asyncGrid} items={asyncRows} idMember="id" editable editTrigger="dblclick" bind:invalidCells={asyncInvalid}
		columns={[
			{field: "name", title: "Name", editable: true, editor: "text" as const,
				beforeCommitCallback: async ({value}) => { await sleep(400); return String(value).length < 2 ? "Too short" : null }},
			{field: "city", title: "City", editable: true, editor: "text" as const},
			{field: "label", title: "Label", renderCellCallback: ({row}) => `<b class="label-html">${row.name}</b>`}
		]}
		contextMenu={[{id: "copy", text: "Copy", onClick: ({cellValue}) => asyncLog.push(`copy:${cellValue}`)}]}
		onRowChange={logRowChange} />
	<button type="button" id="async-city" onclick={() => (asyncRows[0] = {...asyncRows[0], city: "Rome"})}>Set city</button>
	<button type="button" id="async-clear" onclick={() => (asyncInvalid = [])}>Clear invalid</button>
	<button type="button" id="async-discard" onclick={() => asyncGrid?.discardDrafts()}>Discard drafts</button>
	<output id="async-log">{asyncLog.join(" | ")}</output>
</div>

<div id="custom-wrap">
	<QuickGrid items={customRows} idMember="id" editable editTrigger="dblclick"
		columns={[{field: "name", title: "Name", editable: true, editor: "custom" as const,
			beforeCommitCallback: ({value}) => String(value).length < 2 ? "Too short" : null,
			editCallback: (ctx) => {
				customLog.push(`open:${ctx.value}`)
				if (customSync) ctx.commit(`${ctx.value}!`)
				else customCtx = ctx
			}}]}
		onEditStart={({field}) => customLog.push(`start:${field}`)}
		onEditCancel={({field}) => customLog.push(`cancel:${field}`)}
		onRowChange={({itemIndex, row, field, newValue, isValid}) => {
			customLog.push(`change:${newValue}:${isValid}`)
			if (isValid) customRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<button type="button" id="custom-sync" onclick={() => (customSync = true)}>Sync mode</button>
	<button type="button" id="custom-invalid" onclick={() => customCtx?.commit("A")}>Commit A</button>
	<button type="button" id="custom-twice" onclick={() => { customCtx?.commit("Bob"); customCtx?.commit("Rob"); customCtx?.cancel() }}>Commit twice</button>
	<button type="button" id="custom-cancel" onclick={() => customCtx?.cancel()}>Cancel</button>
	<button type="button" id="custom-reid" onclick={() => (customRows[0] = {...customRows[0], id: 99})}>Re-id</button>
	<output id="custom-log">{customLog.join(" | ")}</output>
</div>

<div id="options-wrap">
	<QuickGrid items={optionRows} idMember="id" editable editTrigger="dblclick"
		columns={[{field: "team", title: "Team", editable: true, editor: "select" as const,
			editorOptions: {loadOptionsCallback: async ({row}) => {
				await sleep(row.id === 1 ? 700 : 50)
				return [{value: "web", label: "web"}, {value: "api", label: "api"}]
			}}}]}
		onEditStart={({rowKey}) => optionLog.push(`start:${rowKey}`)} />
	<output id="options-log">{optionLog.join(" | ")}</output>
</div>

<div id="check-wrap">
	<QuickGrid items={checkRows} idMember="id" editable editTrigger="navigate"
		columns={[
			{field: "name", title: "Name"},
			{field: "done", title: "Done", editable: true, editor: "checkbox" as const,
				beforeCommitCallback: ({value}) => value === true ? "Not yet" : null}
		]}
		onRowChange={({itemIndex, row, field, newValue, isValid}) => {
			checkLog.push(`${field}:${newValue}:${isValid}`)
			if (isValid) checkRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="check-log">{checkLog.join(" | ")}</output>
</div>

<!-- Phase 3: editors -->
<div id="num-wrap">
	<QuickGrid items={numRows} idMember="id" editable editTrigger="navigate" onEditCancel={({field}) => numLog.push(`cancel:${field}`)}
		columns={[{field: "price", title: "Price", editable: true, editor: "number" as const, editorOptions: {decimalPlaces: 2}}]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			numLog.push(`${field}:${json(newValue)}`)
			numRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="num-log">{numLog.join(" | ")}</output>
</div>

<div id="date-wrap">
	<QuickGrid items={dateRows} idMember="id" editable editTrigger="navigate" onEditCancel={({field}) => dateLog.push(`cancel:${field}`)}
		columns={[
			{field: "start", title: "Start", editable: true, editor: "date" as const,
				editorOptions: {minDate: new Date(2024, 0, 10)}, getDisplayValueCallback: ({value}) => value ? localDay(value) : ""},
			{field: "due", title: "Due", editable: true, editor: "date" as const, editorOptions: {outputFormat: "iso" as const}},
			{field: "id", title: "Id"}
		]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			dateLog.push(`${field}:${json(newValue)}`)
			dateRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="date-log">{dateLog.join(" | ")}</output>
</div>

<div id="bool-wrap">
	<QuickGrid items={boolRows} idMember="id" editable editTrigger="navigate" onEditCancel={({field}) => boolLog.push(`cancel:${field}`)}
		columns={[
			{field: "name", title: "Name"},
			{field: "status", title: "Status", editable: true, editor: "checkbox" as const, editorOptions: {trueValue: "yes", falseValue: "no"}}
		]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			boolLog.push(`${field}:${json(newValue)}`)
			boolRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<output id="bool-log">{boolLog.join(" | ")}</output>
</div>

<div id="lazy-opts-wrap">
	<QuickGrid items={lazyRows} idMember="id" editable editTrigger="dblclick"
		columns={[{field: "team", title: "Team", editable: true, editor: "select" as const,
			editorOptions: {optionsLoadTrigger: "dropdown-open" as const, loadOptionsCallback: async ({row}) => {
				lazyLog.push(`load:${row.id}`)
				await sleep(300)
				return [{value: "web", label: "Web"}, {value: "api", label: "API"}]
			}}}, {field: "id", title: "Id"}]} />
	<output id="lazy-log">{lazyLog.join(" | ")}</output>
</div>

<div id="immediate-wrap">
	<QuickGrid items={immediateRows} idMember="id" editable editTrigger="dblclick"
		columns={[{field: "team", title: "Team", editable: true, editor: "select" as const,
			editorOptions: {optionsLoadTrigger: "immediate" as const, loadOptionsCallback: async ({row}) => {
				await sleep(100)
				immediateLog.push(`load:${row.id}`)
				return row.id === 1 ? [{value: "web", label: "web"}, {value: "api", label: "api"}] : [{value: "db", label: "db"}, {value: "ops", label: "ops"}]
			}}}, {field: "id", title: "Id"}]} />
	<output id="immediate-log">{immediateLog.join(" | ")}</output>
</div>

<div id="query-wrap">
	<QuickGrid items={queryRows} idMember="id" editable editTrigger="navigate" dropdownShowOnFocus={false}
		columns={[{field: "fruit", title: "Fruit", editable: true, editor: "select" as const,
			editorOptions: {options: [{value: "apple", label: "Apple"}, {value: "banana", label: "Banana"}, {value: "cherry", label: "Cherry"}]}}, {field: "id", title: "Id"}]} />
</div>

<div id="ac-wrap">
	<QuickGrid items={acRows} idMember="id" editable editTrigger="dblclick" onEditCancel={({field}) => acLog.push(`cancel:${field}`)}
		columns={[{field: "city", title: "City", editable: true, editor: "autocomplete" as const,
			getDisplayValueCallback: ({value}) => cities.find((c) => c.value === value)?.label ?? String(value ?? ""),
			editorOptions: {debounceMs: 50, searchCallback: async ({term}) => {
				await sleep(20)
				return cities.filter((c) => c.label.toLowerCase().includes(term.toLowerCase()))
			}}}]}
		onRowChange={({itemIndex, row, field, newValue}) => {
			acLog.push(`${field}:${json(newValue)}`)
			acRows[itemIndex] = {...row, [field]: newValue}
		}} />
	<button type="button" id="ac-outside">Outside</button>
	<output id="ac-log">{acLog.join(" | ")}</output>
</div>

<!-- "always" editors on a paged grid: paging mounts new editors. -->
<div id="always-paged-wrap">
	<QuickGrid items={alwaysPagedRows} idMember="id" editable editTrigger="always" pageable pageSize={2}
		columns={[{field: "name", title: "Name", editable: true, editor: "text" as const}]} />
</div>

<!-- Rows without any id: replacing them must drop their orphaned invalid cells. -->
<div id="orphan-wrap">
	<QuickGrid items={orphanRows} columns={[nameColumn]} editable editTrigger="dblclick" bind:invalidCells={orphanInvalid} />
	<button type="button" id="orphan-replace" onclick={() => (orphanRows = orphanRows.map((r) => ({...r})))}>Replace rows</button>
	<output id="orphan-count">{orphanInvalid.length}</output>
</div>

<output id="log">{log.join(" | ")}</output>
