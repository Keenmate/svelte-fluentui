<script lang="ts">
	import {QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import type {QuickGridDataRequestDetail, QuickGridSortState} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "items", type: "T[]", default: "[]", description: "Array of data items to display"},
		{name: "columns", type: "QuickGridColumn<T>[]", default: "[]", description: "Column definitions"},
		{name: "sortMode", type: '"none" | "single" | "multiple"', default: '"none"', description: "Header-click sorting. A click cycles ascending → descending → unsorted; in \"multiple\" mode Ctrl / ⌘ + click adds the column to the sort. Every column is sortable unless it sets sortable: false"},
		{name: "sort", type: "QuickGridSortState[]", default: "[]", description: "Bindable. The sort, first entry first ({column, direction: \"asc\" | \"desc\"}); set it for an initial or server-side sort. Text sorts numeric-aware in culture's collation, Dates by time, empty values (null / undefined / \"\") always last"},
		{name: "filterable", type: "boolean", default: "false", description: "Show the filter row (every column has an input unless it sets filterable: false)"},
		{name: "filters", type: "Record<string, string>", default: "{}", description: "Bindable. Filter text per field"},
		{name: "filterMode", type: '"client" | "server"', default: '"client"', description: "\"server\": the grid doesn't filter items — it reports the filters (onFiltersChange / onDataRequest) and you replace items. paginationMode=\"server\" implies it"},
		{name: "searchBehavior", type: '"normalized" | "case-insensitive" | "exact"', default: '"normalized"', description: "How filter inputs match the cell's displayed text (getDisplayValueCallback): normalized ignores case and diacritics (zurich finds Zürich). A column can override it"},
		{name: "culture", type: "Intl.Locale", default: "browser locale", description: "Locale for sorting text and showing Date values"},
		{name: "pageable", type: "boolean", default: "false", description: "Show the pager"},
		{name: "pageSize", type: "number", default: "10", description: "Bindable. Rows per page"},
		{name: "pageSizes", type: "number[]", default: "undefined", description: "Page sizes offered in the pager (the pager then always shows)"},
		{name: "currentPage", type: "number", default: "1", description: "Bindable. 1-based. Brought back into range whenever the page count shrinks (rows removed, filtered, collapsed, smaller totalItems)"},
		{name: "paginationMode", type: '"client" | "server"', default: '"client"', description: "\"server\": items is the current page, already filtered and sorted — the grid neither filters, sorts nor slices it; load pages in onDataRequest"},
		{name: "totalItems", type: "number", default: "undefined", description: "Server mode: the total row count the pager shows and pages over. Leave it undefined until the first response — currentPage is only clamped against a known total"},
		{name: "virtualize", type: "boolean", default: "false", description: "Render only the rows in view (plus overscanCount above / below) inside a scrolling container with a sticky header — for large client-side grids. Sorting, filtering, tree, editing and keyboard navigation work over all rows (focus moves scroll the row into view; the row being edited and the row holding focus stay rendered while scrolled away); aria-rowcount / aria-rowindex count every displayed row. Ignored with pageable / server paging. Rows should be one line high (itemSize). The container scrolls up to --fluent-quickgrid-virtual-max-height (480px), or set height / max-height in style"},
		{name: "itemSize", type: "number", default: "37", description: "virtualize: row height in px (one line of text). Rows get it as their height and the actual row pitch is measured, so a small mismatch doesn't drift — but rows much taller than this (wrapping text) make the scroll position jump"},
		{name: "overscanCount", type: "number", default: "5", description: "virtualize: rows rendered beyond each edge of the view (smoother fast scrolling vs. fewer DOM rows)"},
		{name: "striped", type: "boolean", default: "true", description: "Alternate row background colors"},
		{name: "hoverable", type: "boolean", default: "true", description: "Highlight rows on mouse hover"},
		{name: "fillerColumn", type: "boolean", default: "false", description: "Append an empty trailing column that absorbs leftover horizontal space, so preceding columns keep their defined widths instead of stretching to justify"},
		{name: "idMember", type: "keyof T", default: "\"id\" if rows have it", description: "Field that uniquely identifies a row; becomes rowKey in every row context and keys drafts, invalid cells, the edited / focused cell and the row toolbar. Defaults to \"id\" when the rows have an id field (outside tree mode). Without either, rows are identified by object, so state resets for rows you replace with new objects (items.map). In events, write back with itemIndex (index in items), not viewIndex (position on screen)"},
		{name: "editable", type: "boolean", default: "false", description: "Enable inline cell editing"},
		{name: "editTrigger", type: '"click" | "dblclick" | "button" | "always" | "navigate"', default: '"dblclick"', description: "How to trigger cell editing"},
		{name: "dropdownShowOnFocus", type: "boolean", default: "true", description: "Auto-show dropdown editor when cell is focused (navigate mode)"},
		{name: "checkboxAlwaysEditable", type: "boolean", default: "false", description: "Make checkbox cells always interactive regardless of edit trigger"},
		{name: "invalidCells", type: "CellValidationState[]", default: "[]", description: "Bindable array of cells with validation errors"},
		{name: "showRowToolbar", type: "boolean", default: "false", description: "Show floating row toolbar with action buttons"},
		{name: "rowToolbar", type: "QuickGridRowToolbarConfig<T>[]", default: "undefined", description: 'Toolbar items — predefined strings ("add", "delete", "duplicate", "move-up", "move-down") or custom objects'},
		{name: "toolbarAlign", type: '"center" | "top"', default: '"center"', description: "Vertical alignment of the row toolbar"},
		{name: "toolbarTrigger", type: '"hover" | "click" | "button"', default: '"hover"', description: "How to reveal the row toolbar: hover (mouse / pen; a tap toggles it on touch), a row click, or a ⋮ button in the first column. A press outside the grid closes it, Escape too (in hover mode only while it holds keyboard focus, so Escape over a hovered row still reaches e.g. a dialog). Keyboard: Alt+F10 on a cell (rows of a hover / click grid are focusable — Enter works too) or Enter on the ⋮ button moves focus into it; it follows its row when the grid or page scrolls and closes once the row scrolls out of view"},
		{name: "contextMenu", type: "QuickGridContextMenuConfig<T>[]", default: "undefined", description: 'Context menu entries shown on right-click — built-in names ("expand-all", "collapse-all", "expand-tree", "collapse-tree"), menu items, or {divider: true}'},
		{name: "ariaLabel", type: "string", default: "undefined", description: "Accessible name of the <table>"},
		{name: "ariaLabelledby", type: "string", default: "undefined", description: "Id of the element that names the <table> (e.g. a heading)"},
		{name: "labels", type: "Partial<QuickGridLabels>", default: "defaultQuickGridLabels", description: "User-facing strings (filter row, pager, tree chevrons, toolbar / menu built-ins, indicators, screen-reader announcements, editor dropdowns), merged over the English defaults — see Labels below"},
		{name: "class", type: "string", default: '""', description: "Additional CSS class applied to the grid wrapper"},
		{name: "style", type: "string", default: '""', description: "Inline CSS style applied to the grid wrapper"}
	]

	const callbacks: Property[] = [
		{name: "onSortChange", type: "(ctx: {sort: QuickGridSortState[]}) => void", default: "undefined", description: "Fired when a header click changed the sort"},
		{name: "onFiltersChange", type: "(ctx: {filters: Record<string, string>}) => void", default: "undefined", description: "Fired on every filter input change with a copy of the {field: value} map"},
		{name: "onCurrentPageChange", type: "(ctx: {currentPage: number}) => void", default: "undefined", description: "Fired when the grid changed currentPage (pager, a sort / filter / page-size change going back to page 1, clamping)"},
		{name: "onPageSizeChange", type: "(ctx: {pageSize: number}) => void", default: "undefined", description: "Fired when the page-size selector changed pageSize"},
		{name: "onDataRequest", type: "(detail: QuickGridDataRequestDetail) => void", default: "undefined", description: "Fired when the displayed data should change: {sort, page, pageSize, skip, filters, mode: \"replace\", trigger: \"init\" | \"page\" | \"page-size\" | \"sort\" | \"filter\"}. \"init\" fires once on mount in server mode. Load the page here in paginationMode=\"server\""},
		{name: "beforePageChangeCallback", type: "(ctx: QuickGridBeforePageChangeContext) => boolean | number | void | Promise<…>", default: "undefined", description: "Runs before the pager (and, in server mode, a sort / filter change) changes the page. ctx: {trigger, fromPage, toPage, invalidCells}. Return false to stay, a number to go to that page instead; may be async (the pager is disabled meanwhile)"},
		{name: "onRowChange", type: "(ctx: QuickGridRowChangeDetail<T>) => void", default: "undefined", description: "Fired when a cell value is committed during inline editing. Detail includes row, draftRow, viewIndex, itemIndex, rowKey, field, oldValue, newValue, isValid, validationError, invalidFields, isRowValid"},
		{name: "onEditStart", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column }) => void", default: "undefined", description: "Fired when a cell enters edit mode"},
		{name: "onEditCancel", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column }) => void", default: "undefined", description: "Fired when editing is cancelled (e.g. Escape key)"},
		{name: "onValidationError", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column, error }) => void", default: "undefined", description: "Fired when a commit is blocked by a validation error"},
		{name: "onAction", type: "(detail: QuickGridActionDetail<T>) => void", default: "undefined", description: "Fired after a row-toolbar or context-menu item ran (detail.source says which). Context includes row, viewIndex, itemIndex, rowKey and, from the context menu, the cell"},
		{name: "beforeActionCallback", type: "(detail: QuickGridActionDetail<T>) => unknown", default: "undefined", description: "Called before a row-toolbar or context-menu item runs; return false (or a Promise resolving to false) to cancel"},
		{name: "onContextMenuOpen", type: "(ctx: QuickGridContextMenuContext<T>) => void", default: "undefined", description: "Fired when the context menu is opened. Receives row, viewIndex, itemIndex, rowKey, columnIndex, column, cellValue"},
		{name: "...rest", type: "HTMLAttributes", default: "undefined", description: "Other native attributes and DOM events (onkeydown, onfocusin, data-*, aria-*, …), forwarded untouched to the root <div> (.quickgrid-container)"}
	]

	// Theme hooks; each falls back to the FluentUI token in "default", so light / dark follow the design system.
	// The row toolbar, context menu and editor dropdowns are portalled: set their variables on :root / a theme selector.
	const cssVariables: Property[] = [
		{name: "--fluent-quickgrid-bg", type: "color", default: "--neutral-layer-1", description: "Grid, filter row and pager background"},
		{name: "--fluent-quickgrid-border", type: "color", default: "--neutral-stroke-layer-rest", description: "Outer border, row separators, header and pager borders"},
		{name: "--fluent-quickgrid-text", type: "color", default: "--neutral-foreground-rest", description: "Cell, header and filter input text"},
		{name: "--fluent-quickgrid-header-bg", type: "color", default: "theme.scss (light / dark)", description: "Header row background"},
		{name: "--fluent-quickgrid-header-bg-hover", type: "color", default: "theme.scss (light / dark)", description: "Sortable header on hover"},
		{name: "--fluent-quickgrid-header-bg-sorted", type: "color", default: "theme.scss (light / dark)", description: "Sorted column header"},
		{name: "--fluent-quickgrid-row-bg-stripe", type: "color", default: "theme.scss (light / dark)", description: "Every other row (striped)"},
		{name: "--fluent-quickgrid-row-bg-hover", type: "color", default: "theme.scss (light / dark)", description: "Row on hover (hoverable)"},
		{name: "--fluent-quickgrid-virtual-max-height", type: "length", default: "480px", description: "virtualize: max height of the scrolling container"},
		{name: "--fluent-quickgrid-focus-stroke", type: "color", default: "--focus-stroke-outer", description: "Focus ring: sort buttons, focusable rows, chevrons, ⋮ / edit / toolbar buttons"},
		{name: "--fluent-quickgrid-focused-cell-stroke", type: "color", default: "--accent-fill-rest", description: "Navigate mode: focused cell outline"},
		{name: "--fluent-quickgrid-focused-cell-bg", type: "color", default: "--neutral-fill-secondary-hover", description: "Navigate mode: focused cell background"},
		{name: "--fluent-quickgrid-editable-bg-hover", type: "color", default: "--neutral-fill-secondary-hover", description: "Editable cell on hover"},
		{name: "--fluent-quickgrid-editable-border-hover", type: "color", default: "--neutral-stroke-input-rest", description: "Editable cell's dashed hover frame"},
		{name: "--fluent-quickgrid-editing-bg", type: "color", default: "--neutral-layer-1", description: "Cell with an open editor"},
		{name: "--fluent-quickgrid-editing-stroke", type: "color", default: "--accent-fill-rest", description: "Outline of the cell being edited"},
		{name: "--fluent-quickgrid-toolbar-bg", type: "color", default: "--neutral-layer-floating", description: "Row toolbar background"},
		{name: "--fluent-quickgrid-toolbar-border", type: "color", default: "--neutral-stroke-rest", description: "Row toolbar border and dividers"},
		{name: "--fluent-quickgrid-toolbar-text", type: "color", default: "--neutral-foreground-rest", description: "Row toolbar buttons"},
		{name: "--fluent-quickgrid-toolbar-bg-hover", type: "color", default: "--neutral-fill-secondary-hover", description: "Row toolbar button on hover"},
		{name: "--fluent-quickgrid-toolbar-shadow", type: "box-shadow", default: "theme.scss (light / dark)", description: "Row toolbar elevation"},
		{name: "--fluent-quickgrid-connector-stroke", type: "color", default: "--accent-fill-rest", description: "Line + arrow from the toolbar to its row after a move"},
		{name: "--fluent-quickgrid-menu-shadow", type: "box-shadow", default: "0 8px 16px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)", description: "Context menu elevation"},
		{name: "--fluent-quickgrid-dropdown-bg", type: "color", default: "--neutral-layer-floating", description: "Select / combobox / autocomplete editor dropdown"},
		{name: "--fluent-quickgrid-dropdown-border", type: "color", default: "--neutral-stroke-rest", description: "Editor dropdown border"},
		{name: "--fluent-quickgrid-dropdown-highlight-bg", type: "color", default: "--neutral-fill-stealth-hover (selected row: --neutral-fill-secondary-hover)", description: "Editor dropdown: hovered / keyboard-highlighted option"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]

	type Person = {
		id: number
		name: string
		email: string
		age: number
		city: string
		active: boolean
	}

	const sampleData: Person[] = [
		{id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28, city: "New York", active: true},
		{id: 2, name: "Bob Smith", email: "bob@example.com", age: 34, city: "Los Angeles", active: true},
		{id: 3, name: "Carol White", email: "carol@example.com", age: 26, city: "Chicago", active: false},
		{id: 4, name: "David Brown", email: "david@example.com", age: 42, city: "Houston", active: true},
		{id: 5, name: "Eve Davis", email: "eve@example.com", age: 31, city: "Phoenix", active: true},
		{id: 6, name: "Frank Miller", email: "frank@example.com", age: 29, city: "Philadelphia", active: false},
		{id: 7, name: "Grace Lee", email: "grace@example.com", age: 37, city: "San Antonio", active: true},
		{id: 8, name: "Henry Wilson", email: "henry@example.com", age: 25, city: "San Diego", active: true},
		{id: 9, name: "Iris Moore", email: "iris@example.com", age: 33, city: "Dallas", active: false},
		{id: 10, name: "Jack Taylor", email: "jack@example.com", age: 39, city: "San Jose", active: true},
		{id: 11, name: "Karen Anderson", email: "karen@example.com", age: 27, city: "Austin", active: true},
		{id: 12, name: "Leo Thomas", email: "leo@example.com", age: 36, city: "Jacksonville", active: false},
		{id: 13, name: "Mary Martinez", email: "mary@example.com", age: 30, city: "Fort Worth", active: true},
		{id: 14, name: "Nancy Garcia", email: "nancy@example.com", age: 32, city: "Columbus", active: true},
		{id: 15, name: "Oscar Rodriguez", email: "oscar@example.com", age: 41, city: "Charlotte", active: false}
	]

	const basicColumns = [
		{field: "id", title: "ID", width: "80px"},
		{field: "name", title: "Name"},
		{field: "email", title: "Email"},
		{field: "city", title: "City"}
	]

	let multiSort = $state<QuickGridSortState[]>([{column: "city", direction: "asc"}, {column: "age", direction: "desc"}])
	let clientPage = $state(1)
	let clientPageSize = $state(5)

	const sortableColumns = [
		{field: "id", title: "ID", width: "80px", sortable: true},
		{field: "name", title: "Name", sortable: true},
		{field: "age", title: "Age", width: "100px", sortable: true, align: "center" as const},
		{field: "city", title: "City", sortable: true}
	]

	const filterableColumns = [
		{field: "name", title: "Name", filterable: true},
		{field: "email", title: "Email", filterable: true},
		{field: "city", title: "City", filterable: true}
	]

	const formattedColumns = [
		{field: "id", title: "ID", width: "80px"},
		{field: "name", title: "Name"},
		{field: "age", title: "Age", width: "100px", align: "center" as const},
		{
			field: "active",
			title: "Status",
			width: "120px",
			align: "center" as const,
			getDisplayValueCallback: ({value}: {value: boolean}) => (value ? "✓ Active" : "✗ Inactive")
		}
	]

	// Sample data extended with long bios for the nowrap demo. Bios are deliberately long
	// enough to wrap by default so the difference between wrap / nowrap / nowrap+maxWidth is obvious.
	type PersonWithBio = Person & {bio: string}
	const sampleDataWithBios: PersonWithBio[] = sampleData.slice(0, 6).map((p, i) => ({
		...p,
		bio: [
			"Senior staff engineer with over a decade of distributed-systems experience and a long history of speaking at conferences",
			"Product manager focused on developer tools, growth platforms, and quietly making the documentation better than anyone asked for",
			"Designer turned half-engineer who spends weekends restoring vintage synths and rewriting CSS at 2am",
			"Researcher in human-computer interaction whose papers nobody reads but whose talks accidentally pack rooms",
			"Operations lead who keeps the lights on, the runbooks current, and the on-call rotation merciful",
			"Founding engineer with a deep hatred of YAML and a deeper love of Postgres"
		][i]
	}))

	const nowrapColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", autoWidth: true, nowrap: true},
		{field: "city", title: "City", autoWidth: true, nowrap: true},
		{field: "bio", title: "Bio (truncates)", maxWidth: "260px", nowrap: true}
	]

	const wrapColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name"},
		{field: "city", title: "City"},
		{field: "bio", title: "Bio (wraps)", maxWidth: "260px"}
	]

	// Server-side paging: a fake server (setTimeout over a local array) answering onDataRequest.
	type Customer = {id: number; name: string; city: string; orders: number}
	const cities = ["Praha", "Zürich", "Oslo", "Brno", "Wien"]

	// Virtualized: 5,000 generated rows
	type Order = {id: number; customer: string; city: string; total: number}
	const bigData: Order[] = Array.from({length: 5000}, (_, i) => ({
		id: i + 1,
		customer: `Customer ${String(i % 997 + 1).padStart(3, "0")}`,
		city: ["Praha", "Zürich", "Oslo", "Brno", "Wien"][i % 5],
		total: (i * 7919) % 100000 / 100
	}))
	const totalFormat = new Intl.NumberFormat("en-US", {style: "currency", currency: "EUR"})
	const bigColumns = [
		{field: "id" as const, title: "Order", width: "90px"},
		{field: "customer" as const, title: "Customer"},
		{field: "city" as const, title: "City"},
		{field: "total" as const, title: "Total", getDisplayValueCallback: ({value}: {value: unknown}) => totalFormat.format(value as number)}
	]
	const serverSource: Customer[] = Array.from({length: 87}, (_, i) => ({
		id: i + 1, name: `Customer ${i + 1}`, city: cities[i % cities.length], orders: (i * 37) % 120
	}))
	const serverColumns = [
		{field: "id", title: "ID", width: "80px"},
		{field: "name", title: "Name"},
		{field: "city", title: "City"},
		{field: "orders", title: "Orders", width: "100px", align: "end" as const, filterable: false}
	]
	let serverItems = $state<Customer[]>([])
	let serverTotal = $state<number | undefined>(undefined)  // unknown until the first response (no clamping meanwhile)
	let serverLoading = $state(false)
	let serverSort = $state<QuickGridSortState[]>([{column: "orders", direction: "desc"}])
	let serverPage = $state(1)
	let serverPageSize = $state(10)
	let serverRequestId = 0
	function loadCustomers(request: QuickGridDataRequestDetail) {
		const id = ++serverRequestId
		serverLoading = true
		setTimeout(() => {
			if (id !== serverRequestId) return  // a newer request is on its way
			let rows = serverSource.filter((row) =>
				Object.entries(request.filters).every(([field, term]) =>
					String(row[field as keyof Customer]).toLowerCase().includes(term.toLowerCase())))
			for (const {column, direction} of [...request.sort].reverse()) {
				const key = column as keyof Customer
				rows = [...rows].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (direction === "asc" ? 1 : -1))
			}
			serverTotal = rows.length
			serverItems = rows.slice(request.skip, request.skip + request.pageSize)
			serverLoading = false
		}, 400)
	}

	const allFeaturesColumns = [
		{field: "id", title: "ID", width: "80px", sortable: true, align: "center" as const},
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "email", title: "Email", filterable: true},
		{field: "age", title: "Age", width: "100px", sortable: true, align: "center" as const},
		{field: "city", title: "City", sortable: true, filterable: true},
		{
			field: "active",
			title: "Status",
			width: "120px",
			sortable: true,
			filterable: false,
			align: "center" as const,
			getDisplayValueCallback: ({value}: {value: boolean}) => (value ? "✓ Active" : "✗ Inactive")
		}
	]
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="QuickGrid"
		description="A lightweight, flexible Svelte data grid with sorting, filtering, and pagination support. Inspired by ASP.NET QuickGrid."
		keywords="svelte, fluentui, quickgrid, data grid, table, sortable, filterable, pagination"
	/>

	<h1>QuickGrid</h1>

	<p>
		A lightweight, flexible data grid component with sorting, filtering, and pagination support. Inspired by ASP.NET QuickGrid.
	</p>

	<References links={[
		{label: "QuickGrid", custom: true},
		{label: "ASP.NET QuickGrid (Inspiration)", href: "https://aspnet.github.io/quickgridsamples/"},
		{label: "QuickGrid Editable", href: "/components/quickgrid-editable"},
		{label: "QuickGrid Context Menu", href: "/components/quickgrid-contextmenu"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Basic Grid</h3>
		<p>Simple grid with default settings:</p>
		<QuickGrid items={sampleData} columns={basicColumns} />

		<h3>Sortable Grid</h3>
		<p>
			<code>sortMode="single"</code>: click a header to sort ascending, again for descending, a third time to clear.
			Text sorts numeric-aware (<code>item2</code> before <code>item10</code>), Dates by time, empty values last.
		</p>
		<QuickGrid items={sampleData} columns={sortableColumns} sortMode="single" />

		<h3>Multi-column sort</h3>
		<p>
			<code>sortMode="multiple"</code>: Ctrl / ⌘ + click adds a column to the sort (the small number is its priority);
			a plain click sorts by that column alone. <code>bind:sort</code> sets the initial sort — here city, then age descending.
		</p>
		<QuickGrid items={sampleData} columns={sortableColumns} sortMode="multiple" bind:sort={multiSort} />
		<p>Sort: <code>{JSON.stringify(multiSort)}</code></p>

		<h3>Filterable Grid</h3>
		<p>Type in the filter inputs to search the displayed text — case and diacritics are ignored (<code>searchBehavior="normalized"</code>):</p>
		<QuickGrid items={sampleData} columns={filterableColumns} filterable />

		<h3>Paginated Grid</h3>
		<p>Grid with pagination and a page-size selector (<code>pageSizes</code>); <code>bind:currentPage</code> / <code>bind:pageSize</code> track it:</p>
		<QuickGrid items={sampleData} columns={basicColumns} pageable bind:pageSize={clientPageSize} bind:currentPage={clientPage} pageSizes={[5, 10, 15]} />
		<p>Page <code>{clientPage}</code>, <code>{clientPageSize}</code> per page.</p>

		<h3>Virtualized: 5,000 rows</h3>
		<p>
			<code>virtualize</code> renders only the rows in view (plus <code>overscanCount</code>) in a scrolling
			container; spacer rows stand in for the rest. Rows are one line of text (<code>itemSize</code>, default 37px);
			sort, filter, edit and keyboard-navigate as usual. Not combined with paging.
		</p>
		<QuickGrid items={bigData} columns={bigColumns} virtualize sortMode="single" filterable idMember="id"
			style="--fluent-quickgrid-virtual-max-height: 360px" ariaLabel="Orders" />

		<h3>Server-side paging, sorting and filtering</h3>
		<p>
			<code>paginationMode="server"</code>: <code>items</code> is just the current page and <code>totalItems</code> the total.
			The grid fires <code>onDataRequest(&#123;trigger, page, pageSize, skip, sort, filters&#125;)</code> on mount
			(<code>trigger: "init"</code>) and on every page / page-size / sort / filter change, and you replace <code>items</code>.
			The "server" here is a <code>setTimeout</code> over 87 local rows.
		</p>
		<QuickGrid
			items={serverItems}
			columns={serverColumns}
			idMember="id"
			paginationMode="server"
			totalItems={serverTotal}
			pageable
			bind:currentPage={serverPage}
			bind:pageSize={serverPageSize}
			pageSizes={[10, 25, 50]}
			sortMode="single"
			bind:sort={serverSort}
			filterable
			onDataRequest={loadCustomers}
		/>
		<p>{serverLoading ? "Loading…" : `Page ${serverPage}, ${serverPageSize} per page, ${serverTotal ?? "?"} rows`}</p>

		<h3>Custom Formatting</h3>
		<p>Use format function to customize cell display:</p>
		<QuickGrid items={sampleData} columns={formattedColumns} />

		<h3>All Features Combined</h3>
		<p>Sorting, filtering, pagination, and custom formatting:</p>
		<QuickGrid
			items={sampleData}
			columns={allFeaturesColumns}
			sortMode="single"
			filterable
			pageable
			pageSize={7}
		/>

		<h3>Nowrap columns &amp; ellipsis truncation</h3>
		<p>
			<code>column.nowrap: true</code> forces body cells onto a single line. Combined with <code>autoWidth</code> the column sizes to
			<code>max(header text, longest cell value)</code> — useful for ID / code / short name columns. Combined with <code>maxWidth</code>
			the column is capped and long values truncate with an ellipsis instead of overflowing or wrapping.
		</p>
		<p>Compare default wrapping (top) with nowrap + ellipsis (bottom):</p>

		<h4 style="margin: 1rem 0 0.5rem;">Default — wrapping</h4>
		<QuickGrid items={sampleDataWithBios} columns={wrapColumns} fillerColumn columnMinWidth="6rem" />

		<h4 style="margin: 1.5rem 0 0.5rem;">With <code>nowrap: true</code> — single-line + ellipsis</h4>
		<QuickGrid items={sampleDataWithBios} columns={nowrapColumns} fillerColumn columnMinWidth="6rem" />

		<h3>No Stripes, No Hover</h3>
		<p>Grid without alternating row colors or hover effects:</p>
		<QuickGrid items={sampleData} columns={basicColumns} striped={false} hoverable={false} />

		<h3>Editable Grid</h3>
		<p>QuickGrid supports inline editing with multiple editor types, validation, dynamic options loading, and custom editors.</p>
		<p><a href="/components/quickgrid-editable">See QuickGrid Editable documentation</a> for examples and full API reference.</p>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Properties</h2>
				<QuickGrid items={properties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Callbacks</h2>
				<QuickGrid items={callbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>CSS variables</h2>
				<p>Theme hooks; "default" is the FluentUI token each falls back to. The row toolbar, context menu and editor dropdowns are portalled — set their variables on <code>:root</code> or a theme selector, not on the grid.</p>
				<QuickGrid items={cssVariables} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>

	<Card>
		<h2>Column Definition</h2>
		<p>Type <code>QuickGridColumn&lt;T&gt;</code>. All QuickGrid model types are exported from the package root: <code>import type &#123;QuickGridColumn, QuickGridRowChangeDetail, QuickGridActionDetail&#125; from "svelte-fluentui"</code>.</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Default</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>field</td>
					<td>keyof T | string</td>
					<td>required</td>
					<td>Field name from data item</td>
				</tr>
				<tr>
					<td>title</td>
					<td>string</td>
					<td>required</td>
					<td>Column header text</td>
				</tr>
				<tr>
					<td>sortable</td>
					<td>boolean</td>
					<td>undefined</td>
					<td><code>false</code> opts the column out of sorting (the grid's <code>sortMode</code> turns sorting on)</td>
				</tr>
				<tr>
					<td>getSortValueCallback</td>
					<td>(&#123;value, row, column&#125;) =&gt; unknown</td>
					<td>undefined</td>
					<td>The value the column sorts by (default: the raw field value) — e.g. an option label or a rank</td>
				</tr>
				<tr>
					<td>compareCallback</td>
					<td>(&#123;rowA, rowB, valueA, valueB, column&#125;) =&gt; number</td>
					<td>undefined</td>
					<td>Replaces the built-in comparison: return &lt; 0 / 0 / &gt; 0 for ascending order (reversed for descending; empty values are yours to place)</td>
				</tr>
				<tr>
					<td>filterable</td>
					<td>boolean</td>
					<td>undefined</td>
					<td><code>false</code> hides this column's filter input (the grid's <code>filterable</code> shows the filter row)</td>
				</tr>
				<tr>
					<td>searchBehavior</td>
					<td>"normalized" | "case-insensitive" | "exact"</td>
					<td>grid's</td>
					<td>How this column's filter matches its displayed text</td>
				</tr>
				<tr>
					<td>filterCallback</td>
					<td>(&#123;term, row, column&#125;) =&gt; boolean | null</td>
					<td>undefined</td>
					<td>Custom filter predicate replacing the text match; <code>null</code> = incomplete input (filter ignored, input marked invalid)</td>
				</tr>
				<tr>
					<td>width</td>
					<td>string</td>
					<td>undefined</td>
					<td>Column width. Any CSS length (e.g. <code>"120px"</code>, <code>"20%"</code>, <code>"10rem"</code>). Ignored when <code>autoWidth</code> is true</td>
				</tr>
				<tr>
					<td>minWidth</td>
					<td>string</td>
					<td>undefined</td>
					<td>CSS <code>min-width</code> for the column (e.g. <code>"80px"</code>)</td>
				</tr>
				<tr>
					<td>maxWidth</td>
					<td>string</td>
					<td>undefined</td>
					<td>CSS <code>max-width</code> for the column (e.g. <code>"320px"</code>)</td>
				</tr>
				<tr>
					<td>autoWidth</td>
					<td>boolean</td>
					<td>undefined</td>
					<td>Size column to its header content and prevent it from stretching. Pair with grid-level <code>fillerColumn</code> so the freed space is absorbed by a trailing empty column instead of redistributing to other columns</td>
				</tr>
				<tr>
					<td>nowrap</td>
					<td>boolean</td>
					<td>undefined</td>
					<td>Body cells never wrap. With <code>maxWidth</code>, long content truncates with an ellipsis. With <code>autoWidth</code>, sizes the column to <code>max(header, longest cell)</code>. Without <code>maxWidth</code>, very long values will widen the column unbounded — set a <code>maxWidth</code> if you want a hard cap</td>
				</tr>
				<tr>
					<td>align</td>
					<td>"start" | "center" | "end"</td>
					<td>"left"</td>
					<td>Text alignment</td>
				</tr>
				<tr>
					<td>getDisplayValueCallback</td>
					<td>(&#123;value, row, column&#125;) =&gt; string</td>
					<td>undefined</td>
					<td>Custom cell formatter</td>
				</tr>
				<tr>
					<td>snippet</td>
					<td>Snippet&lt;[T]&gt;</td>
					<td>undefined</td>
					<td>Renders the cell with a Svelte snippet (receives the row; output is escaped). The safe way to put markup in a cell</td>
				</tr>
				<tr>
					<td>renderCellCallback</td>
					<td>(&#123;row, column&#125;) =&gt; string</td>
					<td>undefined</td>
					<td>Renders the cell as an HTML string via <code>&#123;@html&#125;</code>. <strong>Not sanitised — XSS risk:</strong> never put user or server data in it unescaped; prefer <code>snippet</code></td>
				</tr>
				<tr>
					<td>editable / getIsEditableCallback</td>
					<td>boolean / (&#123;row, column&#125;) =&gt; boolean</td>
					<td>false</td>
					<td>Enable editing (<a href="/components/quickgrid-editable">see editable docs</a>); the callback decides per row and wins</td>
				</tr>
			</tbody>
		</table>
	</Card>
	<Card>
		<h2>Labels</h2>
		<p>Every user-facing string comes from <code>labels</code> (type <code>QuickGridLabels</code>); pass the keys you want to change, the rest stay English. <code>defaultQuickGridLabels</code> is exported from the package root.</p>
		<pre><code>{`<QuickGrid {items} {columns} pageable labels={{
	filterPlaceholder: "Filtrovat…",
	previousPage: "Předchozí",
	nextPage: "Další",
	pageInfo: (page, pageCount) => \`Strana \${page} z \${pageCount}\`
}} />`}</code></pre>
		<table class="member-table">
			<thead>
				<tr>
					<th>Key</th>
					<th>Type</th>
					<th>Default</th>
					<th>Used for</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>filterPlaceholder</td>
					<td>string</td>
					<td>&quot;Filter...&quot;</td>
					<td>Filter input placeholder</td>
				</tr>
				<tr>
					<td>filterAriaLabel</td>
					<td>(columnTitle) =&gt; string</td>
					<td>`Filter $&#123;title&#125;`</td>
					<td>Filter input accessible name</td>
				</tr>
				<tr>
					<td>emptyText</td>
					<td>string</td>
					<td>&quot;No items to display&quot;</td>
					<td>Empty grid message</td>
				</tr>
				<tr>
					<td>previousPage / nextPage</td>
					<td>string</td>
					<td>&quot;Previous&quot; / &quot;Next&quot;</td>
					<td>Pager buttons</td>
				</tr>
				<tr>
					<td>pageInfo</td>
					<td>(page, pageCount) =&gt; string</td>
					<td>`Page $&#123;page&#125; of $&#123;pageCount&#125;`</td>
					<td>Pager text; announced after a page change</td>
				</tr>
				<tr>
					<td>itemCount</td>
					<td>(count) =&gt; string</td>
					<td>`$&#123;count&#125; item(s)`</td>
					<td>Pager item count (shown in parentheses); announced after a filter change</td>
				</tr>
				<tr>
					<td>perPage</td>
					<td>string</td>
					<td>&quot;per page&quot;</td>
					<td>After the page-size selector</td>
				</tr>
				<tr>
					<td>pagination</td>
					<td>string</td>
					<td>&quot;Pagination&quot;</td>
					<td>Accessible name of the pager (&lt;nav&gt;)</td>
				</tr>
				<tr>
					<td>sortedBy</td>
					<td>(columnTitle, &quot;ascending&quot; | &quot;descending&quot;) =&gt; string</td>
					<td>`Sorted by $&#123;title&#125;, $&#123;direction&#125;`</td>
					<td>Announced after a header sorted</td>
				</tr>
				<tr>
					<td>sortCleared</td>
					<td>(columnTitle) =&gt; string</td>
					<td>`Sort removed from $&#123;title&#125;`</td>
					<td>Announced after a header removed its column from the sort</td>
				</tr>
				<tr>
					<td>expand / collapse</td>
					<td>string</td>
					<td>&quot;Expand&quot; / &quot;Collapse&quot;</td>
					<td>Tree chevron name</td>
				</tr>
				<tr>
					<td>clearFilterToCollapse</td>
					<td>string</td>
					<td>&quot;Clear the filter to collapse&quot;</td>
					<td>Tree chevron tooltip while filtering</td>
				</tr>
				<tr>
					<td>rowActions</td>
					<td>string</td>
					<td>&quot;Row actions&quot;</td>
					<td>Row toolbar and its ⋮ trigger</td>
				</tr>
				<tr>
					<td>addRow / deleteRow / duplicateRow / moveRowUp / moveRowDown</td>
					<td>string</td>
					<td>&quot;Add row below&quot; / &quot;Delete row&quot; / &quot;Duplicate row&quot; / &quot;Move row up&quot; / &quot;Move row down&quot;</td>
					<td>Built-in toolbar items</td>
				</tr>
				<tr>
					<td>expandAll / collapseAll / expandTree / collapseTree</td>
					<td>string</td>
					<td>&quot;Expand all&quot; / &quot;Collapse all&quot; / &quot;Expand entire tree&quot; / &quot;Collapse entire tree&quot;</td>
					<td>Built-in context-menu items</td>
				</tr>
				<tr>
					<td>editing</td>
					<td>string</td>
					<td>&quot;Editing...&quot;</td>
					<td>A custom editor is open</td>
				</tr>
				<tr>
					<td>validating</td>
					<td>string</td>
					<td>&quot;Validating&quot;</td>
					<td>Name of the validation indicator</td>
				</tr>
				<tr>
					<td>loadingOptions</td>
					<td>string</td>
					<td>&quot;Loading options&quot;</td>
					<td>Name of the options-loading indicator</td>
				</tr>
				<tr>
					<td>edit</td>
					<td>string</td>
					<td>&quot;Edit&quot;</td>
					<td>Cell edit button</td>
				</tr>
				<tr>
					<td>invalidValue</td>
					<td>string</td>
					<td>&quot;Invalid value&quot;</td>
					<td>Error indicator tooltip without a message</td>
				</tr>
				<tr>
					<td>editorEmptyOption</td>
					<td>string</td>
					<td>&quot;-- Select --&quot;</td>
					<td>Select editor empty row (editorOptions.emptyLabel wins)</td>
				</tr>
				<tr>
					<td>editorSelectPlaceholder / editorSearchPlaceholder</td>
					<td>string</td>
					<td>&quot;Select...&quot; / &quot;Type to search...&quot;</td>
					<td>Combobox / autocomplete editor placeholder (editorOptions.placeholder wins)</td>
				</tr>
				<tr>
					<td>editorLoading / editorSearching</td>
					<td>string</td>
					<td>&quot;Loading...&quot; / &quot;Searching...&quot;</td>
					<td>Editor dropdown while loading options / searching</td>
				</tr>
				<tr>
					<td>editorEmptyText / editorFilterEmptyText</td>
					<td>string</td>
					<td>&quot;No options&quot; / &quot;No matching options&quot;</td>
					<td>Empty editor dropdown (select/autocomplete) / combobox filter with no match</td>
				</tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Keyboard &amp; accessibility</h2>
		<ul>
			<li><kbd>Enter</kbd> / <kbd>Space</kbd> on a sortable header (a button) sorts it; <kbd>Ctrl</kbd> / <kbd>⌘</kbd>+<kbd>Enter</kbd> adds the column in <code>sortMode="multiple"</code>. The primary sorted column carries <code>aria-sort</code>.</li>
			<li><code>editTrigger="navigate"</code>: the grid is one tab stop (the last focused cell). Arrow keys move between cells (keys pressed faster than a frame each advance one cell), <kbd>Home</kbd> / <kbd>End</kbd> to the first / last cell of the row, <kbd>Ctrl</kbd>+<kbd>Home</kbd> / <kbd>Ctrl</kbd>+<kbd>End</kbd> to the first / last cell of the grid, <kbd>PageUp</kbd> / <kbd>PageDown</kbd> by the rows that fit in the view (the scrolling container, else the window) — with paging they stay within the current page (the pager changes pages); <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> between editable cells and out of the grid past the last / first one; <kbd>Enter</kbd> / <kbd>F2</kbd> / typing edits, <kbd>Space</kbd> toggles a checkbox, <kbd>Escape</kbd> cancels. Tree: <kbd>Ctrl</kbd>+<kbd>→</kbd> / <kbd>←</kbd> expand / collapse.</li>
			<li><kbd>Shift</kbd>+<kbd>F10</kbd> or the <kbd>ContextMenu</kbd> key on a focused cell opens the context menu below it with focus on the first item; arrows move, <kbd>Enter</kbd> / <kbd>Space</kbd> run an item, <kbd>Escape</kbd> closes it and returns focus.</li>
			<li>Row toolbar: <kbd>Alt</kbd>+<kbd>F10</kbd> on a cell opens it for that row and focuses its first button. Without navigate mode, rows of a hover / click toolbar grid are one tab stop: <kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>Home</kbd> / <kbd>End</kbd> / <kbd>PageUp</kbd> / <kbd>PageDown</kbd> move between rows, <kbd>Enter</kbd> or <kbd>Alt</kbd>+<kbd>F10</kbd> opens the toolbar. In the toolbar, arrows / <kbd>Home</kbd> / <kbd>End</kbd> move, <kbd>Enter</kbd> / <kbd>Space</kbd> run, <kbd>Escape</kbd> or <kbd>Tab</kbd> close it and return focus. <code>toolbarTrigger="button"</code>: <kbd>Enter</kbd> on <kbd>⋮</kbd> (<code>aria-haspopup</code>, <code>aria-expanded</code>) does the same.</li>
			<li>Paged and server grids set <code>aria-rowcount</code> / <code>aria-rowindex</code> (server mode from <code>totalItems</code>, <code>-1</code> while unknown). Filter inputs are named after their column; name the table with <code>ariaLabel</code> / <code>ariaLabelledby</code>. A polite live region announces the row count after filtering, the page after paging and the sort after a header change.</li>
			<li><code>virtualize</code>: <code>aria-rowcount</code> / <code>aria-rowindex</code> count every displayed row, not just the rendered ones; keyboard focus moves (cells, rows mode, <kbd>Home</kbd> / <kbd>End</kbd>, <kbd>PageUp</kbd> / <kbd>PageDown</kbd>) scroll the target row into view first. A focused cell (or row) scrolled out of the rendered window keeps focus — its row stays rendered outside the window (as the APG grid expects: focus stays on the cell, so the next arrow continues from it and screen readers keep their place); once focus leaves the grid, <kbd>Tab</kbd> back in lands on a rendered row.</li>
			<li>Tree mode renders a <code>treegrid</code> with <code>aria-level</code> and <code>aria-expanded</code> on rows; chevrons are buttons named Expand / Collapse.</li>
		</ul>
	</Card>
</Stack>
