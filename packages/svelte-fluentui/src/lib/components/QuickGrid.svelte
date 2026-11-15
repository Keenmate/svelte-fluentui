<script lang="ts" generics="T">
	import {tick, untrack, onMount, onDestroy} from "svelte"
	import GridCellEditor from "./GridCellEditor.svelte"
	import QuickGridPager from "./quickgrid/QuickGridPager.svelte"
	import QuickGridHeader from "./quickgrid/QuickGridHeader.svelte"
	import QuickGridContextMenu from "./quickgrid/QuickGridContextMenu.svelte"
	import QuickGridRowToolbar from "./quickgrid/QuickGridRowToolbar.svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {resolveMenuEntries, runAction, type MenuEntry, type ResolvedActionItem} from "../action-items/index.js"

	import type {
		QuickGridColumn as Column,
		QuickGridEditorType as EditorType,
		QuickGridEditTrigger as EditTrigger,
		QuickGridCellValidationState as CellValidationState,
		QuickGridBeforeCommitContext as BeforeCommitContext,
		QuickGridRowChangeDetail as RowChangeDetail,
		QuickGridInvalidField as InvalidField,
		QuickGridRowIdentity as RowIdentity,
		QuickGridEditStartContext as EditStartContext,
		QuickGridEditCancelContext as EditCancelContext,
		QuickGridValidationErrorContext as ValidationErrorContext,
		QuickGridRowToolbarAction as RowToolbarAction,
		QuickGridRowToolbarItem as RowToolbarItem,
		QuickGridRowToolbarConfig as RowToolbarConfig,
		QuickGridContextMenuContext as ContextMenuContext,
		QuickGridContextMenuAction as ContextMenuAction,
		QuickGridContextMenuConfig as ContextMenuConfig,
		QuickGridActionDetail,
		QuickGridSortMode as SortMode,
		QuickGridSortState as SortState,
		QuickGridPaginationMode as PaginationMode,
		QuickGridFilterMode as FilterMode,
		QuickGridDataRequestDetail as DataRequestDetail,
		QuickGridDataRequestTrigger as DataRequestTrigger,
		QuickGridPageChangeTrigger as PageChangeTrigger,
		QuickGridBeforePageChangeContext as BeforePageChangeContext,
		QuickGridBeforePageChangeResult as BeforePageChangeResult,
		QuickGridLabels
	} from "./QuickGrid.types.js"
	import {defaultQuickGridLabels} from "./quickgrid/labels.js"
	import type {RestProps} from "../types/index.js"
	import type {SearchBehavior} from "../helpers/text.js"
	import {defaultLocale} from "../helpers/locale.js"
	import {
		createRowComparator, createRowFilter, nextSort, sortRows, treeOrder, filterTreeRows,
		visibleTreeRows, getPageCount, clampPage, pageSlice, type TreeAccess
	} from "./quickgrid/pipeline.js"
	import {
		buildTreeInfo, getTreeRowInfo, detectTreeSeparator, compareSegments, nearestExpandedAncestor,
		defaultExpandedPaths, isInSubtree, type TreeRowInfo, type TreeFields
	} from "./quickgrid/tree.js"
	import {getColumnStyles, isColumnSortable} from "./quickgrid/columns.js"
	import {findNextEditableCell as findNextEditableCellIn} from "./quickgrid/navigation.js"
	import {CellOverrides, cellKeyOf, normalizeValidationResult, isCheckboxChecked, toggledCheckboxValue} from "./quickgrid/editing.svelte.js"
	import {OptionsLoader} from "./quickgrid/options.svelte.js"

	// Public model types live in QuickGrid.types.ts (exported from the package root).

	type OwnProps<T> = {
		items: T[]
		columns: Column<T>[]
		/** `"none"` (default), `"single"`, or `"multiple"` (Ctrl / ⌘ + click adds a column). A column opts out with `sortable: false`. */
		sortMode?: SortMode
		/** Bindable. The sort, first entry first; set it for an initial / server-side sort. */
		sort?: SortState[]
		/** Fires when a header click changed `sort`. */
		onSortChange?: (ctx: {sort: SortState[]}) => void
		/** Shows the filter row. */
		filterable?: boolean
		/** Bindable. Filter text per field. */
		filters?: Record<string, string>
		/** `"server"`: the grid doesn't filter `items` — it reports the filters (`onFiltersChange`,
		 *  `onDataRequest`) and you replace `items`. Default `"client"` (`"server"` paging implies it). */
		filterMode?: FilterMode
		/** How filter inputs match the cell text: `normalized` (default; ignores case and diacritics), `case-insensitive`, `exact`. Columns can override. */
		searchBehavior?: SearchBehavior
		/** Locale for sorting text (numeric-aware) and showing Date values. Default: the browser's. */
		culture?: Intl.Locale
		/** Shows the pager. */
		pageable?: boolean
		/** Bindable. Rows per page. */
		pageSize?: number
		/** Offer these page sizes in the pager. */
		pageSizes?: number[]
		/** Bindable. 1-based; brought back into range when the page count shrinks. */
		currentPage?: number
		/** `"server"`: `items` is the current page (already filtered and sorted); the pager counts `totalItems`. */
		paginationMode?: PaginationMode
		/** Server mode: how many rows there are in total. Leave it undefined until known — `currentPage`
		 *  is only clamped against a known total (a full page then counts as "maybe one more"). */
		totalItems?: number
		/** Before the pager (or, in server mode, a sort / filter change) changes the page: `false` stays,
		 *  a number goes to that page instead. May be async (the pager is disabled meanwhile). */
		beforePageChangeCallback?: (ctx: BeforePageChangeContext) => BeforePageChangeResult | Promise<BeforePageChangeResult>
		/** Fires when the grid changed `currentPage` (pager, sort / filter reset, clamping). */
		onCurrentPageChange?: (ctx: {currentPage: number}) => void
		/** Fires when the page-size selector changed `pageSize`. */
		onPageSizeChange?: (ctx: {pageSize: number}) => void
		/** Fires when the displayed data should change — load it here in server mode. */
		onDataRequest?: (detail: DataRequestDetail) => void
		striped?: boolean
		hoverable?: boolean
		/** When true, appends an empty filler column at the end of every row that absorbs any remaining
		 *  horizontal space. Pair with per-column `width` / `minWidth` / `maxWidth` / `autoWidth` when you
		 *  want columns to keep predefined widths instead of stretching to justify across the table. */
		fillerColumn?: boolean
		/** Default `min-width` applied to every column header that does not specify its own `minWidth`.
		 *  Useful with `fillerColumn` to stop content-sized columns from collapsing to a one-word column.
		 *  Accepts any CSS length (e.g. `"100px"`, `"8rem"`). */
		columnMinWidth?: string
		class?: string
		style?: string
		// Editing props
		editable?: boolean
		editTrigger?: EditTrigger
		dropdownShowOnFocus?: boolean  // Auto-show editor for dropdown types when cell is focused
		// Row-level editability gate, evaluated before the column's: `false` here makes the
		// whole row read-only (e.g. parent / category rows in a tree grid). Default `true`.
		rowEditable?: boolean
		/** Per-row decision; wins over `rowEditable`. */
		getIsRowEditableCallback?: (ctx: {row: T}) => boolean
		checkboxAlwaysEditable?: boolean  // Make checkboxes always interactive, even in navigate mode
		// Invalid cells state (bindable for external tracking)
		invalidCells?: CellValidationState[]
		// Row toolbar (floating toolbar for row actions)
		showRowToolbar?: boolean
		/** Toolbar entries: built-in names (`"add"`, `"delete"`, …), action items, `{divider: true}`. */
		rowToolbar?: RowToolbarConfig<T>[]
		toolbarAlign?: 'center' | 'top'  // Vertical alignment: center (default) or top (first row aligned with grid row)
		toolbarTrigger?: 'hover' | 'click' | 'button'  // How to show toolbar: hover (default), click on row, or button in first column
		// Context menu
		/** Right-click menu entries: built-in names (`"expand-all"`, …), menu items, `{divider: true}`. */
		contextMenu?: ContextMenuConfig<T>[]
		/** Fires when the cell context menu opens. */
		onContextMenuOpen?: (ctx: ContextMenuContext<T>) => void
		/** Field that uniquely identifies a row; becomes `rowKey` and keys drafts, invalid cells,
		 *  the edited / focused cell and the row toolbar. Defaults to `"id"` when the rows have an
		 *  `id` field. Without either the grid uses `treePathMember` (tree mode), else the row
		 *  object's identity — which resets that state for rows you replace with new objects
		 *  (`items.map(...)`). */
		idMember?: keyof T
		// Tree mode (ltree-style path hierarchy)
		treePathMember?: keyof T              // Required to enable tree mode — field holding the path string ("1.2.3", "/1/2/3", "C:\\foo\\bar")
		treeLevelMember?: keyof T             // Optional — pre-computed depth (0-based). Falls back to deriving from path.
		treeParentMember?: keyof T            // Optional — pre-computed parent path. Falls back to deriving from path.
		treeSeparator?: string                // Path separator. Auto-detected from first row if omitted.
		treeDataSorted?: boolean              // True when the caller's order is final (parents before children): the grid never reorders, `sort` only reports. Default false → grid orders by path, siblings by `sort`.
		expandedPaths?: Set<string>           // Bindable set of expanded paths; written back on every toggle.
		defaultExpandDepth?: number           // Expansion depth for parents the grid hasn't seen yet (initially, and new ones in `items`). Omit to expand all.
		treeDoubleClickBehavior?: "none" | "toggle"  // "toggle": double-clicking the tree column toggles expand/collapse on rows with children. Default "none".
		/** Fires on every filter input change with a copy of the `{field: value}` map. */
		onFiltersChange?: (ctx: {filters: Record<string, string>}) => void
		// Events
		/** Fires after every committed cell edit (valid or not — see `isValid`). */
		onRowChange?: (ctx: RowChangeDetail<T>) => void
		/** Fires when a cell enters edit mode. */
		onEditStart?: (ctx: EditStartContext<T>) => void
		/** Fires when a cell edit is cancelled. */
		onEditCancel?: (ctx: EditCancelContext<T>) => void
		/** Fires when a committed value fails validation. */
		onValidationError?: (ctx: ValidationErrorContext<T>) => void
		/** Fires after a row-toolbar or context-menu item ran (`source` says which). */
		onAction?: (detail: QuickGridActionDetail<T>) => void
		/** Called before a row-toolbar or context-menu item runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: QuickGridActionDetail<T>) => unknown
		/** Native `focusout` event on the root, forwarded untouched. */
		onfocusout?: (event: FocusEvent) => void
		/** Accessible name of the `<table>`. */
		ariaLabel?: string
		/** Id of the element naming the `<table>`. */
		ariaLabelledby?: string
		/** User-facing strings; merged over `defaultQuickGridLabels`. */
		labels?: Partial<QuickGridLabels>
	}

	/** Other native attributes and events go to the root `<div class="quickgrid-container">`. */
	type Props<T> = OwnProps<T> & RestProps<OwnProps<T>>

	let {
		items = [],
		columns = [],
		sortMode = "none",
		sort = $bindable([]),
		onSortChange = undefined,
		filterable = false,
		filters = $bindable({}),
		filterMode = "client",
		searchBehavior = "normalized",
		culture = defaultLocale(),
		pageable = false,
		pageSize = $bindable(10),
		pageSizes = undefined,
		currentPage = $bindable(1),
		paginationMode = "client",
		totalItems = undefined,
		beforePageChangeCallback = undefined,
		onCurrentPageChange = undefined,
		onPageSizeChange = undefined,
		onDataRequest = undefined,
		striped = true,
		hoverable = true,
		fillerColumn = false,
		columnMinWidth = undefined,
		class: className = "",
		style = "",
		// Editing props
		editable = false,
		editTrigger = "dblclick",
		dropdownShowOnFocus = true,
		rowEditable = true,
		getIsRowEditableCallback = undefined,
		checkboxAlwaysEditable = false,
		invalidCells = $bindable([]),
		// Row toolbar
		showRowToolbar = false,
		rowToolbar = undefined,
		toolbarAlign = 'center',
		toolbarTrigger = 'hover',
		// Context menu
		contextMenu = undefined,
		onContextMenuOpen = undefined,
		// Stable row identity
		idMember = undefined,
		// Tree mode
		treePathMember = undefined,
		treeLevelMember = undefined,
		treeParentMember = undefined,
		treeSeparator = undefined,
		treeDataSorted = false,
		expandedPaths = $bindable(),
		defaultExpandDepth = undefined,
		treeDoubleClickBehavior = "none",
		onFiltersChange = undefined,
		// Callbacks
		onRowChange = undefined,
		onEditStart = undefined,
		onEditCancel = undefined,
		onValidationError = undefined,
		onAction = undefined,
		beforeActionCallback = undefined,
		onfocusout = undefined,
		ariaLabel = undefined,
		ariaLabelledby = undefined,
		labels: labelsProp = undefined,
		...rest
	}: Props<T> = $props()

	const labels = $derived<QuickGridLabels>({...defaultQuickGridLabels, ...(labelsProp ?? {})})

	const resolvedToolbarConfig = $derived(rowToolbar ?? (['add', 'delete', 'duplicate'] as RowToolbarConfig<T>[]))
	const actionHost = {}

	// Inline width / align styles per column, once per `columns` change (not per cell)
	let columnStyles = $derived(getColumnStyles(columns, columnMinWidth))

	// Editing state
	// Interaction state is keyed by row key (never a view position), so it follows its row
	// through sorting, paging, filtering, tree collapse and inserts.
	// Every startEdit gets a token; anything that resolves after an `await` (validation,
	// options load, a custom editor's commit/cancel) only touches the edit UI while its
	// token is still the open edit's.
	type EditSession = {
		token: number
		rowKey: string
		field: string
		item: T
		column: Column<T>
		initialSearchQuery?: string
	}
	let editingCell = $state.raw<EditSession | null>(null)
	let activeEditor = $state.raw<{commit: () => Promise<void>} | null>(null)  // the open edit's GridCellEditor
	let editSeq = 0                                    // last token handed out by startEdit
	const cancelledEdits = new Set<number>()           // tokens whose late commits are dropped
	let validatingToken = $state<number | null>(null)  // the open edit is waiting for its validation

	function isCurrentEdit(token: number | undefined): boolean {
		return token !== undefined && editingCell?.token === token
	}

	// Close the edit UI, but only if `token` is still the open edit.
	function endEdit(token: number | undefined) {
		if (isCurrentEdit(token)) editingCell = null
	}

	// Drafts: per-cell overrides of the values that failed validation (quickgrid/editing.svelte.ts).
	// Every override has an entry in `invalidCells`; dropping the entry (e.g. `invalidCells = []`)
	// drops the override.
	const overrides = new CellOverrides()

	$effect(() => {
		const kept = new Set(invalidCells.map((c) => cellKeyOf(c.rowKey, c.field)))
		untrack(() => overrides.prune((rowKey, field) => kept.has(cellKeyOf(rowKey, field))))
	})

	// Rows replaced without an id get a new generated key, so their old key's overrides,
	// `invalidCells` entries and loaded options can never match again: drop them. Only
	// generated keys — an id-keyed row missing from `items` may come back (server-side
	// filtering / paging), so its state is kept.
	$effect(() => {
		const keys = new Set(items.map((it) => getRowKey(it)))
		const orphan = (rowKey: string) => rowKey.startsWith(GENERATED_KEY_PREFIX) && !keys.has(rowKey)
		untrack(() => {
			overrides.dropRows(orphan)
			if (invalidCells.some((c) => orphan(c.rowKey))) invalidCells = invalidCells.filter((c) => !orphan(c.rowKey))
			optionsLoader.dropRows(orphan)
		})
	})

	// The row with its overrides applied (the item itself when it has none).
	function getDraftRow(item: T, rowKey: string = getRowKey(item)): T {
		return overrides.draftRow(item, rowKey)
	}

	/** Drops the pending invalid values (and their `invalidCells` entries) of one row, or of all rows. */
	export function discardDrafts(rowKey?: string): void {
		overrides.clear(rowKey)
		invalidCells = rowKey === undefined ? [] : invalidCells.filter((c) => c.rowKey !== rowKey)
	}

	// Generated keys for rows without idMember / treePathMember: one per row object, so
	// state never leaks between rows that happen to share a view position.
	const GENERATED_KEY_PREFIX = "__quickgrid-row-"
	const generatedRowKeys = new WeakMap<object, string>()
	let generatedRowKeyCount = 0

	// idMember, else `"id"` when the rows have an `id` field (and no treePathMember identifies them).
	const rowIdMember = $derived.by((): keyof T | undefined => {
		if (idMember !== undefined) return idMember
		if (treePathMember !== undefined) return undefined
		const first = items[0]
		return first !== null && typeof first === "object" && "id" in first ? "id" as keyof T : undefined
	})

	// Stable key for a row: idMember (or `id`) → treePathMember → row object identity.
	function getRowKey(item: T): string {
		if (rowIdMember !== undefined) {
			const v = item[rowIdMember]
			if (v !== undefined && v !== null) return String(v)
		}
		if (treePathMember !== undefined) {
			const v = item[treePathMember]
			if (v !== undefined && v !== null) return String(v)
		}
		if (item !== null && typeof item === "object") {
			let key = generatedRowKeys.get(item)
			if (key === undefined) {
				key = `${GENERATED_KEY_PREFIX}${++generatedRowKeyCount}`
				generatedRowKeys.set(item, key)
			}
			return key
		}
		return String(item)
	}

	// Current position of a row in the displayed list, −1 when it isn't displayed.
	function getViewIndex(rowKey: string): number {
		return viewIndexByKey.get(rowKey) ?? -1
	}

	// `viewIndex` / `itemIndex` / `rowKey` for an event context, resolved now (not when the
	// interaction started — a commit may resolve after the list re-sorted).
	function getRowIdentity(row: T, rowKey: string = getRowKey(row)): RowIdentity {
		let viewIndex = displayItems.indexOf(row)
		if (viewIndex < 0) viewIndex = getViewIndex(rowKey)
		let itemIndex = items.indexOf(row)
		if (itemIndex < 0) itemIndex = items.findIndex((it) => getRowKey(it) === rowKey)
		return {viewIndex, itemIndex, rowKey}
	}

	let idWarningEmitted = $state(false)
	$effect(() => {
		if (idWarningEmitted) return
		if (!editable) return
		if (items.length === 0 || rowIdMember !== undefined || treePathMember !== undefined) return
		// eslint-disable-next-line no-console
		console.warn(
			"[QuickGrid] No `idMember` was provided and the rows have no `id` field while `editable` is enabled. Row state " +
			"(drafts, invalid cells, in-progress edits) is keyed by row object identity, so it " +
			"is dropped for rows you replace with new objects (e.g. `items = items.map(...)`). " +
			"Pass `idMember` (any field that uniquely identifies a row) to keep it. " +
			"In tree mode, `treePathMember` is also accepted as the identity."
		)
		idWarningEmitted = true
	})

	// Navigation mode state (for "navigate" editTrigger)
	let focusedCell = $state<{ rowKey: string; colIndex: number } | null>(null)
	let isNavigateMode = $derived(editTrigger === "navigate" || columns.some(c => c.editTrigger === "navigate"))
	let tableElement: HTMLTableElement | undefined = $state()
	let isCommittingFromKeyboard = $state(false)
	let skipNextDropdownAutoEdit = $state(false)  // Prevents dropdown from reopening after selection

	// Row toolbar state. The toolbar's row is tracked by key (rows replaced immutably keep
	// working); the toolbar stays anchored to the view position it opened at, and the
	// connector points at the row when an action moves it elsewhere.
	let hoveredRowKey = $state<string | null>(null)
	let hoveredAnchorViewIndex = $state<number | null>(null)
	let hoveredRowElement = $state<HTMLElement | null>(null)
	let rowActionButtonHovered = $state(false)
	let rowActionHideTimeout: ReturnType<typeof setTimeout> | null = null
	let containerRef: HTMLDivElement | undefined = $state()
	let popupElement: HTMLDivElement | undefined = $state()
	let toolbarSession = $state(0)  // bumped per open: the toolbar forgets that its row moved
	// Pointer type of the last press on a row: hover mode opens on mouse / pen hover, on a tap for touch
	let lastRowPointerType = ''

	// Context menu state
	let contextMenuVisible = $state(false)
	// The cell the menu opened on and the pointer's offset in it — the menu follows the cell
	let contextMenuAnchor = $state.raw<{cell: HTMLElement; dx: number; dy: number} | null>(null)
	let contextMenuContext = $state<ContextMenuContext<T> | null>(null)
	let contextMenuElement: HTMLDivElement | undefined = $state()

	// Options loaded by `loadOptionsCallback`, per cell (quickgrid/options.svelte.ts)
	const optionsLoader = new OptionsLoader<T>()
	$effect(() => () => optionsLoader.abortAll())
	// The edit waiting for its options (the cell shows a loading indicator)
	let optionsLoadingEdit = $state.raw<{token: number; rowKey: string; field: string} | null>(null)

	// ============ Tree mode (path helpers in quickgrid/tree.ts) ============
	let isTreeMode = $derived(treePathMember !== undefined)

	let resolvedTreeSeparator = $derived.by(() => {
		if (treeSeparator) return treeSeparator
		if (!isTreeMode) return "/"
		return detectTreeSeparator(items.map((item) => String(item[treePathMember as keyof T] ?? "")))
	})

	let treeFields = $derived<TreeFields<T> | null>(treePathMember === undefined ? null : {
		pathMember: treePathMember, levelMember: treeLevelMember, parentMember: treeParentMember, separator: resolvedTreeSeparator
	})

	// Path, segments, level and parent of every row, computed once per `items` change.
	let treeInfo = $derived(treeFields ? buildTreeInfo(items, treeFields) : new Map<T, TreeRowInfo>())

	// Set of every path that exists as an actual row (used to distinguish "real" ancestors
	// from virtual roots — e.g. "C:" when only "C:\\Windows" and below are in the dataset).
	let treePathSet = $derived(new Set([...treeInfo.values()].map((info) => info.path)))

	const EMPTY_TREE_INFO: TreeRowInfo = {path: "", segments: [], level: 0, parentPath: "", parent: ""}
	// A row not in `items` (an event's stale row) is computed on the spot.
	function getTreeInfo(item: T): TreeRowInfo {
		return treeInfo.get(item) ?? (treeFields ? getTreeRowInfo(item, treeFields, treePathSet) : EMPTY_TREE_INFO)
	}

	function getRowPath(item: T): string {
		return getTreeInfo(item).path
	}

	function getRowLevel(item: T): number {
		return getTreeInfo(item).level
	}

	// Set of paths that have at least one child in the dataset
	let treeParentPathSet = $derived.by(() => {
		const result = new Set<string>()
		for (const info of treeInfo.values()) if (info.parentPath) result.add(info.parentPath)
		return result
	})

	function rowHasChildren(item: T): boolean {
		return treeParentPathSet.has(getRowPath(item))
	}

	const NO_PATHS = new Set<string>()
	let resolvedExpandedPaths = $derived(expandedPaths ?? NO_PATHS)

	function isPathExpanded(path: string): boolean {
		return resolvedExpandedPaths.has(path)
	}

	// Every expansion change (toggle, expand-all, …) goes through here and writes the bindable back.
	function setExpandedPaths(next: Set<string>) {
		expandedPaths = next
	}

	function toggleExpand(path: string) {
		const next = new Set(resolvedExpandedPaths)
		if (next.has(path)) next.delete(path)
		else next.add(path)
		setExpandedPaths(next)
	}

	// aria-level is 1-based from the shallowest level present
	let treeMinLevel = $derived.by(() => {
		let min = Infinity
		for (const info of treeInfo.values()) min = Math.min(min, info.level)
		return Number.isFinite(min) ? min : 0
	})

	let rowByPath = $derived(new Map([...treeInfo].map(([row, info]) => [info.path, row])))

	// Default expansion for parents the grid hasn't seen yet — on the first non-empty `items`
	// (unless `expandedPaths` came with a set) and for new parents arriving later; parents seen
	// before keep their state. `defaultExpandDepth` is relative to the shallowest level present.
	const seenParentPaths = new Set<string>()
	let expansionSeeded = false
	$effect(() => {
		if (!isTreeMode || items.length === 0) return
		const parents = treeParentPathSet
		untrack(() => {
			const fresh = [...parents].filter((p) => !seenParentPaths.has(p))
			for (const p of fresh) seenParentPaths.add(p)
			const current = expandedPaths
			if (!expansionSeeded) {
				expansionSeeded = true
				if (current !== undefined) return  // the consumer's initial set wins
			}
			if (fresh.length === 0 && current !== undefined) return
			const levelOf = (path: string) => {
				const row = rowByPath.get(path)
				return row ? getRowLevel(row) : path.split(resolvedTreeSeparator).filter(Boolean).length - 1
			}
			const next = new Set(current ?? [])
			for (const path of defaultExpandedPaths(fresh, levelOf, treeMinLevel, defaultExpandDepth)) next.add(path)
			if (current === undefined || next.size !== current.size) setExpandedPaths(next)
		})
	})

	const treeAccess: TreeAccess<T> = {getPath: (row) => getTreeInfo(row).path, getParent: (row) => getTreeInfo(row).parent}

	// ============ Display chain: filter → sort → tree visibility → page (quickgrid/pipeline.ts) ============

	// Server paging: `items` is the page, already filtered and sorted by the server.
	let isServerPaging = $derived(paginationMode === "server")
	let collator = $derived(new Intl.Collator(culture.baseName, {numeric: true}))

	// Per-field validity for custom filters — `false` when the column's filter predicate
	// returned null on the first row (probe), meaning the input is syntactically invalid
	// (e.g. `>` typed so far without a number). Surfaced to the template so the input gets
	// a `.invalid` class.
	let filterValidity = $derived.by(() => {
		const result: Record<string, boolean> = {}
		if (items.length === 0) return result
		for (const [field, filterValue] of Object.entries(filters)) {
			if (!filterValue) continue
			const col = columns.find((c) => String(c.field) === field)
			if (!col?.filterCallback) continue
			const probe = col.filterCallback({term: filterValue, row: items[0], column: col})
			if (probe === null) result[field] = false
		}
		return result
	})

	// Matches the text the cell shows (getDisplayValueCallback / formatted value) under `searchBehavior`.
	let rowFilter = $derived(
		filterable && filterMode === "client" && !isServerPaging
			? createRowFilter({filters, columns, searchBehavior, getText: (row, column) => formatCellValue(row[column.field as keyof T], row, column)})
			: null
	)
	let isFiltering = $derived(rowFilter !== null)

	let rowComparator = $derived(sortMode !== "none" && !isServerPaging ? createRowComparator(sort, columns, collator) : null)

	// Filtered and sorted. Tree: matches + their ancestors, depth-first, siblings sorted within
	// their parent (by path when unsorted); `treeDataSorted` keeps the caller's order.
	let orderedItems = $derived.by(() => {
		if (!isTreeMode) return sortRows(rowFilter ? items.filter(rowFilter) : items, rowComparator)
		const rows = rowFilter ? filterTreeRows(items, treeAccess, rowFilter) : items
		if (treeDataSorted) return rows
		const byPath = (a: T, b: T) => compareSegments(getTreeInfo(a).segments, getTreeInfo(b).segments)
		const compare = rowComparator
		return treeOrder(rows, treeAccess, compare ? (a, b) => compare(a, b) || byPath(a, b) : byPath)
	})

	// Tree: descendants of collapsed rows hidden — except while filtering, when every match
	// shows with its ancestors (chevrons then show expanded and are disabled).
	let visibleItems = $derived(isTreeMode && !isFiltering ? visibleTreeRows(orderedItems, treeAccess, isPathExpanded) : orderedItems)

	// While filtering: the rows that have a matching child.
	let filteredParentPaths = $derived(isTreeMode && isFiltering ? new Set(visibleItems.map((it) => getTreeInfo(it).parent).filter(Boolean)) : NO_PATHS)

	// What the pager counts: the visible rows, or the server's `totalItems`.
	let pagedTotal = $derived(isServerPaging ? (totalItems ?? items.length) : visibleItems.length)
	// Server mode without `totalItems`: a full page means there may be another one.
	let totalPages = $derived(isServerPaging && totalItems === undefined
		? Math.max(1, currentPage) + (items.length >= pageSize ? 1 : 0)
		: getPageCount(pagedTotal, pageSize))
	let effectivePage = $derived(clampPage(currentPage, totalPages))

	let displayItems = $derived(!pageable || isServerPaging ? visibleItems : pageSlice(visibleItems, effectivePage, pageSize))

	// The page count shrank (rows deleted / filtered / collapsed, smaller `totalItems`): bring
	// `currentPage` back into range — server mode then asks for that page.
	$effect(() => {
		const page = effectivePage
		if (!pageable) return
		untrack(() => {
			if (page === currentPage) return
			setPage(page, isServerPaging ? "page" : null)
		})
	})

	onMount(() => {
		if (isServerPaging) requestData("init")
	})

	// Body rows with their {#each} key: the row key, suffixed for repeats (duplicate ids, or
	// the same object twice in items) so a keyed each never throws on them.
	let displayRows = $derived.by(() => {
		const seen = new Map<string, number>()
		return displayItems.map((item) => {
			const rowKey = getRowKey(item)
			const n = seen.get(rowKey) ?? 0
			seen.set(rowKey, n + 1)
			return {item, rowKey, eachKey: n === 0 ? rowKey : `${rowKey}#${n}`}
		})
	})

	// First view position of every displayed row key.
	let viewIndexByKey = $derived.by(() => {
		const map = new Map<string, number>()
		displayRows.forEach(({rowKey}, i) => {
			if (!map.has(rowKey)) map.set(rowKey, i)
		})
		return map
	})

	function requestData(trigger: DataRequestTrigger) {
		onDataRequest?.({
			sort: [...sort], page: currentPage, pageSize, trigger, mode: "replace",
			skip: (currentPage - 1) * pageSize, filters: {...filters}
		})
	}

	function setPage(page: number, trigger: DataRequestTrigger | null) {
		const changed = page !== currentPage
		currentPage = page
		if (changed) onCurrentPageChange?.({currentPage: page})
		if (trigger) requestData(trigger)
	}

	// A user action that changes the page runs `apply(page)` once `beforePageChangeCallback`
	// allows it (`false` → nothing happens, a number → that page). Resolves to whether it applied.
	let pageChangePending = $state(false)
	async function guardPageChange(trigger: PageChangeTrigger, toPage: number, apply: (page: number) => void): Promise<boolean> {
		if (pageChangePending) return false
		if (!beforePageChangeCallback) {
			apply(toPage)
			return true
		}
		let result: BeforePageChangeResult
		try {
			const returned = beforePageChangeCallback({trigger, fromPage: effectivePage, toPage, invalidCells: [...invalidCells]})
			if (returned instanceof Promise) {
				pageChangePending = true
				result = await returned
			} else {
				result = returned
			}
		} catch (error) {
			console.error("[QuickGrid] beforePageChangeCallback failed", error)
			result = false
		} finally {
			pageChangePending = false
		}
		if (result === false) return false
		apply(typeof result === "number" && Number.isFinite(result) ? clampPage(result, totalPages) : toPage)
		return true
	}

	function goToPage(page: number) {
		const target = clampPage(page, totalPages)
		if (target === effectivePage) return
		void guardPageChange("page", target, (p) => {
			setPage(p, "page")
			void tick().then(() => announce(labels.pageInfo(effectivePage, totalPages)))
		})
	}

	// ============ Screen-reader announcements (polite live region) ============
	let liveMessage = $state("")
	let liveFrame = 0
	function announce(message: string) {
		// Cleared first, so the same text twice is still read out
		liveMessage = ""
		cancelAnimationFrame(liveFrame)
		liveFrame = requestAnimationFrame(() => (liveMessage = message))
	}
	$effect(() => () => cancelAnimationFrame(liveFrame))

	// The filtered row count: at once on the client; with server filtering once the new `items` arrive
	let countAnnouncementPending = false
	function announceCount() {
		if (filterMode === "server" || isServerPaging) countAnnouncementPending = true
		else void tick().then(() => announce(labels.itemCount(pagedTotal)))
	}
	$effect(() => {
		void items
		untrack(() => {
			if (!countAnnouncementPending) return
			countAnnouncementPending = false
			announce(labels.itemCount(pagedTotal))
		})
	})

	// aria-rowcount / aria-rowindex when only part of the rows is in the DOM (paged / server)
	let headerRowCount = $derived(filterable ? 2 : 1)
	let ariaRowCount = $derived(
		!pageable && !isServerPaging ? undefined
			: isServerPaging && totalItems === undefined ? -1
			: headerRowCount + pagedTotal
	)
	let rowIndexBase = $derived(headerRowCount + (pageable || isServerPaging ? (effectivePage - 1) * pageSize : 0))

	// The pager's page-size select; resolves false when refused (the select reverts).
	function changePageSize(size: number): Promise<boolean> {
		return guardPageChange("page-size", 1, (p) => {
			pageSize = size
			onPageSizeChange?.({pageSize: size})
			setPage(p, "page-size")
		})
	}

	// The pager's size choices (the current size included).
	let pageSizeChoices = $derived(pageSizes?.length ? [...new Set([...pageSizes, pageSize])].sort((a, b) => a - b) : [])

	// Header click / Enter / Space: asc → desc → unsorted; "multiple" mode: Ctrl / ⌘ (`additive`)
	// adds the column. Back to page 1; in server mode that goes through beforePageChangeCallback first.
	function handleSort(column: Column<T>, additive: boolean) {
		if (!isColumnSortable(column, sortMode)) return
		const field = String(column.field)
		const next = nextSort(sort, field, sortMode, additive)
		const apply = (page: number) => {
			sort = next
			onSortChange?.({sort: next})
			if (pageable) setPage(page, null)
			requestData("sort")
			const entry = next.find((s) => s.column === field)
			announce(entry ? labels.sortedBy(column.title, entry.direction === "asc" ? "ascending" : "descending") : labels.sortCleared(column.title))
		}
		if (isServerPaging && pageable) void guardPageChange("sort", 1, apply)
		else apply(1)
	}

	// A filter input changed; resolves false when beforePageChangeCallback refused (the input reverts).
	function handleFilter(field: string, value: string): boolean | Promise<boolean> {
		if ((filters[field] ?? "") === value) return true
		const apply = (page: number) => {
			const next = {...filters}
			if (value) next[field] = value
			else delete next[field]
			filters = next
			onFiltersChange?.({filters: {...next}})
			if (pageable) setPage(page, null)
			requestData("filter")
			announceCount()
		}
		if (isServerPaging && pageable) return guardPageChange("filter", 1, apply)
		apply(1)
		return true
	}

	// A value as the cell shows it: getDisplayValueCallback, else a Date as a local date, else the text.
	function formatCellValue(value: unknown, row: T, column: Column<T>): string {
		if (column.getDisplayValueCallback) return column.getDisplayValueCallback({value, row, column})
		if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toLocaleDateString(culture.baseName)
		return String(value ?? "")
	}

	// A cell's value: its pending invalid override, else the live item value.
	function getCellRawValue(item: T, rowKey: string, field: string): unknown {
		return overrides.value(item, rowKey, field)
	}

	function getCellValue(item: T, column: Column<T>, rowKey?: string): string {
		if (column.renderCellCallback) {
			return column.renderCellCallback({row: rowKey !== undefined ? getDraftRow(item, rowKey) : item, column})
		}
		// Use draft value if available
		const value = rowKey !== undefined
			? getCellRawValue(item, rowKey, String(column.field))
			: item[column.field as keyof T]
		return formatCellValue(value, item, column)
	}

	// The cell's text for an editor (autocomplete shows it when no option has the value).
	function getEditorDisplayText(item: T, column: Column<T>, rowKey: string): string {
		const value = getCellRawValue(item, rowKey, String(column.field))
		return formatCellValue(value, item, column)
	}

	// "immediate": load for every displayed row whose cell is editable (the rows the user can
	// see and edit), once per row object — a page / sort / filter loads the newly shown rows.
	$effect(() => {
		for (const column of columns) {
			if (!column.editorOptions?.loadOptionsCallback || OptionsLoader.trigger(column) !== "immediate") continue
			for (const item of displayItems) {
				if (!isCellEditable(column, item)) continue
				const rowKey = getRowKey(item)
				untrack(() => {
					if (optionsLoader.cachedRow(rowKey, column) !== item) void optionsLoader.load(column, item, rowKey, true)
				})
			}
		}
	})

	// Editing functions
	function isEditing(rowKey: string, field: string): boolean {
		return editingCell?.rowKey === rowKey && editingCell?.field === field
	}

	function isCellEditable(column: Column<T>, row: T): boolean {
		if (!editable) return false
		// Tree column is structural (chevron + indentation) — never editable,
		// regardless of column.editable. Inline editing the cell that owns
		// the expand affordance creates ambiguous click targets and was the
		// source of repeat regressions (rc17/rc18). Consumers who need a
		// "rename" affordance should expose it via a separate column or a
		// context-menu / button action.
		if (column.tree) return false
		const rowGate = getIsRowEditableCallback ? getIsRowEditableCallback({row}) : rowEditable
		if (!rowGate) return false
		return column.getIsEditableCallback ? column.getIsEditableCallback({row, column}) : (column.editable ?? false)
	}

	function getColumnEditTrigger(column: Column<T>): EditTrigger {
		return column.editTrigger || editTrigger
	}

	async function startEdit(field: string, item: T, column: Column<T>, colIndex?: number, initialSearchQuery?: string) {
		const columnField = String(column.field)
		const rowKey = getRowKey(item)
		// A custom editor's UI doesn't blur away: superseding it ends it as a cancel.
		if (editingCell?.column.editor === "custom") cancelEdit(editingCell.token)
		const token = ++editSeq
		optionsLoadingEdit = null

		const open = () => {
			editingCell = {token, rowKey, field, item, column, initialSearchQuery}
			onEditStart?.({row: item, ...getRowIdentity(item, rowKey), field, column})
		}

		// Custom editor: the edit is open before editCallback runs (it may commit synchronously).
		// commit / cancel are one-shot and only act while this edit is still the open one.
		if (column.editor === "custom" && column.editCallback) {
			open()
			let settled = false
			const settle = () => {
				if (settled || !isCurrentEdit(token)) return false
				settled = true
				return true
			}
			column.editCallback({
				value: getCellRawValue(item, rowKey, columnField),
				row: item,
				...getRowIdentity(item, rowKey),
				field: columnField,
				column,
				commit: (newValue: any) => {
					if (settle()) void commitEdit(item, column, newValue, colIndex, token)
				},
				cancel: () => {
					if (!settle()) return
					cancelEdit(token)
					// Refocus cell on cancel in navigate mode
					if (isNavigateMode && colIndex !== undefined) focusCell(rowKey, colIndex)
				}
			})
			return
		}

		// Load options first: "edit-start" on every edit, "immediate" when this row's aren't in yet.
		const trigger = OptionsLoader.trigger(column)
		if (
			column.editorOptions?.loadOptionsCallback &&
			(trigger === "edit-start" || (trigger === "immediate" && optionsLoader.cachedRow(rowKey, column) !== item))
		) {
			optionsLoadingEdit = {token, rowKey, field: columnField}
			await optionsLoader.load(column, item, rowKey, trigger === "immediate")
			if (optionsLoadingEdit?.token === token) optionsLoadingEdit = null
			// A newer edit started while the options loaded: this one is stale.
			if (token !== editSeq) return
		}

		open()
	}

	// Abandon the open edit (only if `token` is still it); a late commit for it is dropped.
	function cancelEdit(token: number | undefined) {
		const cell = editingCell
		if (!cell || cell.token !== token) return
		cancelledEdits.add(cell.token)
		editingCell = null
		if (validatingToken === cell.token) validatingToken = null
		onEditCancel?.({row: cell.item, ...getRowIdentity(cell.item, cell.rowKey), field: cell.field, column: cell.column})
	}

	// The edited row left the view (its key changed, it was removed, filtered or paged away):
	// cancel the edit instead of leaving it dangling.
	$effect(() => {
		const cell = editingCell
		if (cell === null) return
		if (viewIndexByKey.has(cell.rowKey)) return
		untrack(() => cancelEdit(cell.token))
	})

	// Helper functions for managing invalid cells. Keyed by stable row id so markers survive
	// pagination / filter / tree expand-collapse re-orderings.
	function addInvalidCell(rowKey: string, field: string, error: string) {
		const existingIndex = invalidCells.findIndex(c => c.rowKey === rowKey && c.field === field)
		if (existingIndex >= 0) {
			invalidCells[existingIndex] = { rowKey, field, error }
		} else {
			invalidCells = [...invalidCells, { rowKey, field, error }]
		}
	}

	function removeInvalidCell(rowKey: string, field: string) {
		invalidCells = invalidCells.filter(c => !(c.rowKey === rowKey && c.field === field))
	}

	// Error per invalid cell (rowKey + field), built once per `invalidCells` change; the first entry wins.
	let invalidByKey = $derived.by(() => {
		const map = new Map<string, string>()
		for (const c of invalidCells) {
			const key = cellKeyOf(c.rowKey, c.field)
			if (!map.has(key)) map.set(key, c.error)
		}
		return map
	})

	// Latest commit per cell: a commit superseded by a newer one of the same cell (while its
	// validation was pending) is dropped.
	const latestCommits = new Map<string, number>()
	let commitSeq = 0

	// Every commit path (editors, keyboard, Space toggle, custom editors) goes through here:
	// beforeCommitCallback / validateCallback, then the override + invalidCells update and
	// onRowChange. `token` is the edit being committed (none for "always" editors); the edit
	// UI is only closed / refocused while that edit is still the open one.
	async function commitEdit(item: T, column: Column<T>, newValue: any, colIndex?: number, token?: number) {
		if (token !== undefined && cancelledEdits.has(token)) return
		const field = String(column.field)
		const rowKey = getRowKey(item)
		const cellKey = cellKeyOf(rowKey, field)
		const seq = ++commitSeq
		latestCommits.set(cellKey, seq)
		const oldValue = item[column.field as keyof T]
		let finalValue = newValue
		let validationErrorMsg: string | null = null
		let isValid = true

		if (token !== undefined && isCurrentEdit(token)) validatingToken = token

		try {
			// First, run beforeCommitCallback if defined (preferred)
			if (column.beforeCommitCallback) {
				const context: BeforeCommitContext<T> = {
					value: newValue,
					oldValue,
					row: item,
					...getRowIdentity(item, rowKey),
					field,
					column
				}
				const result = column.beforeCommitCallback(context)
				const resolvedResult = result instanceof Promise ? await result : result
				const normalized = normalizeValidationResult(resolvedResult, newValue)

				isValid = normalized.valid
				validationErrorMsg = normalized.message || null
				finalValue = normalized.finalValue
			}
			// Otherwise the simpler validateCallback
			else if (column.validateCallback) {
				const result = column.validateCallback({value: newValue, row: item, column})
				const error = result instanceof Promise ? await result : result

				if (error) {
					isValid = false
					validationErrorMsg = error
				}
			}
		} catch (err) {
			isValid = false
			validationErrorMsg = err instanceof Error ? err.message : "Validation failed"
		}

		if (token !== undefined && validatingToken === token) validatingToken = null
		// Superseded by a newer commit of the same cell, or the edit was cancelled meanwhile.
		if (latestCommits.get(cellKey) !== seq) return
		latestCommits.delete(cellKey)
		if (token !== undefined && cancelledEdits.has(token)) return

		// A valid value replaces the item's (the consumer writes it back); an invalid one is
		// kept as this cell's override so the user sees and can fix it.
		if (isValid) {
			overrides.delete(rowKey, field)
			removeInvalidCell(rowKey, field)
		} else {
			const error = validationErrorMsg || "Invalid value"
			overrides.set(rowKey, field, finalValue, error)
			addInvalidCell(rowKey, field, error)
			onValidationError?.({row: item, ...getRowIdentity(item, rowKey), field, column, error})
		}

		// Always fire onRowChange (with isValid flag): draftRow = item + every override of the
		// row + this value; invalidFields = every invalid cell of the row after this commit.
		const draftRow = {...getDraftRow(item, rowKey), [field]: finalValue} as T
		const invalidFields: InvalidField[] = invalidCells
			.filter((c) => c.rowKey === rowKey)
			.map((c) => ({field: c.field, error: c.error, value: getCellRawValue(item, rowKey, c.field)}))
		onRowChange?.({
			row: item,
			draftRow,
			...getRowIdentity(item, rowKey),
			field,
			oldValue,
			newValue: finalValue,
			isValid,
			validationError: validationErrorMsg,
			invalidFields,
			isRowValid: invalidFields.length === 0
		})

		// Always exit edit mode (allow navigation even with invalid values), but only this
		// edit: another cell may have opened while the validation ran.
		const ownsUi = token === undefined ? editingCell === null : isCurrentEdit(token)
		endEdit(token)

		// For immediate-commit editors in navigate mode, refocus the cell so arrow key navigation continues
		if (ownsUi && isNavigateMode && colIndex !== undefined) {
			const isImmediateCommitEditor = column.editor === "checkbox" || column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete" || column.editor === "date" || column.editor === "custom"
			if (isImmediateCommitEditor) {
				// For dropdown editors, prevent auto-reopening when we refocus
				const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
				if (isDropdownEditor) {
					skipNextDropdownAutoEdit = true
				}
				focusCell(rowKey, colIndex)
			}
		}
	}

	function handleCellClick(e: MouseEvent, colIndex: number, column: Column<T>, item: T) {
		if (!isCellEditable(column, item)) return
		const trigger = getColumnEditTrigger(column)
		if (trigger === "click") {
			startEdit(String(column.field), item, column, colIndex)
		}
	}

	function handleCellDblClick(e: MouseEvent, colIndex: number, column: Column<T>, item: T) {
		// Tree-toggle on dblclick wins on the tree column when enabled and the row has
		// children. Chevron's own ondblclick stops propagation, so this only fires for
		// dblclicks elsewhere in the cell. Leaves fall through to the edit logic below.
		if (
			isTreeMode &&
			column.tree &&
			treeDoubleClickBehavior === "toggle" &&
			rowHasChildren(item)
		) {
			toggleExpand(getRowPath(item))
			return
		}
		if (!isCellEditable(column, item)) return
		const trigger = getColumnEditTrigger(column)
		// Double-click should work in both "dblclick" and "navigate" modes
		if (trigger === "dblclick" || trigger === "navigate") {
			startEdit(String(column.field), item, column, colIndex)
		}
	}

	function handleEditButtonClick(e: MouseEvent, colIndex: number, column: Column<T>, item: T) {
		e.stopPropagation()
		startEdit(String(column.field), item, column, colIndex)
	}

	function getEditorType(column: Column<T>): EditorType {
		return column.editor || "text"
	}

	function shouldShowEditButton(column: Column<T>): boolean {
		return column.showEditButton === true || getColumnEditTrigger(column) === "button"
	}

	// Navigation mode functions
	function getEditableColumns(row: T): { index: number; column: Column<T> }[] {
		return columns
			.map((col, index) => ({ index, column: col }))
			.filter(({ column }) => isCellEditable(column, row))
	}

	// Tab / Shift+Tab target (quickgrid/navigation.ts), null = leave the grid.
	function findNextEditableCell(fromRowIndex: number, fromColEditableIndex: number, direction: 1 | -1) {
		const rows = displayItems
		const editableAt = (r: number) => getEditableColumns(rows[r]).map((c) => c.index)
		return findNextEditableCellIn(rows.length, editableAt, fromRowIndex, fromColEditableIndex, direction)
	}

	function isCellFocused(rowKey: string, colIndex: number): boolean {
		return focusedCell?.rowKey === rowKey && focusedCell?.colIndex === colIndex
	}

	// Navigate mode: one tab stop (roving tabindex) — the last focused cell while its row is
	// displayed, else the first cell. Tab from outside lands there; Tab past the last editable
	// cell leaves the grid.
	let tabStop = $state<{ rowKey: string; colIndex: number } | null>(null)
	let resolvedTabStop = $derived.by(() => {
		if (!isNavigateMode || displayItems.length === 0) return null
		const stop = tabStop
		if (stop && stop.colIndex < columns.length && viewIndexByKey.has(stop.rowKey)) return stop
		return { rowKey: getRowKey(displayItems[0]), colIndex: 0 }
	})

	function getCellTabIndex(rowKey: string, colIndex: number): number | undefined {
		if (!isNavigateMode) return undefined
		return resolvedTabStop?.rowKey === rowKey && resolvedTabStop.colIndex === colIndex ? 0 : -1
	}

	// Focus a cell of a row (by key — wherever the row is displayed after the DOM updates).
	function focusCell(rowKey: string, colIndex: number) {
		focusedCell = { rowKey, colIndex }
		tabStop = { rowKey, colIndex }
		// Focus the td element for keyboard events
		requestAnimationFrame(() => {
			const row = tableElement?.querySelector(`:scope > tbody > tr[data-row-key="${CSS.escape(rowKey)}"]`)
			const cell = row?.querySelector(`:scope > td[data-col="${colIndex}"]`) as HTMLElement | null
			cell?.focus({ preventScroll: true })
		})
	}

	// Focus a cell of the row at a view position (keyboard navigation between rows).
	function focusCellAt(viewIndex: number, colIndex: number) {
		const item = displayItems[viewIndex]
		if (item !== undefined) focusCell(getRowKey(item), colIndex)
	}

	function handleCellFocus(colIndex: number, column: Column<T>, item: T) {
		if (isNavigateMode) tabStop = { rowKey: getRowKey(item), colIndex }
		if (isNavigateMode && !editingCell) {
			focusedCell = { rowKey: getRowKey(item), colIndex }

			// Auto-start edit for dropdown editors (select/combobox/autocomplete) when dropdownShowOnFocus is enabled
			if (dropdownShowOnFocus) {
				const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
				if (isDropdownEditor && isCellEditable(column, item)) {
					// Skip auto-edit if we just committed from this dropdown (prevents reopen after selection)
					if (skipNextDropdownAutoEdit) {
						skipNextDropdownAutoEdit = false
						return
					}
					startEdit(String(column.field), item, column, colIndex)
				}
			}
		}
	}

	function handleGridFocusOut(e: FocusEvent) {
		onfocusout?.(e)
		// Clear focusedCell when focus leaves the grid entirely
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!relatedTarget || !tableElement?.contains(relatedTarget)) {
			focusedCell = null
		}
	}

	// Keys that work on any cell (focus on the cell or a control in it, not in an editor's input):
	// Shift+F10 / ContextMenu opens the context menu, Alt+F10 the row toolbar.
	function handleCellKeyDown(e: KeyboardEvent, viewIndex: number, colIndex: number, column: Column<T>, item: T) {
		const inInput = !!(e.target as Element).closest('input, textarea, select, [contenteditable]')
		const cell = e.currentTarget as HTMLElement
		if (!inInput && (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey && !e.altKey))) {
			if (openContextMenu(cell, colIndex, column, item, null)) e.preventDefault()
			return
		}
		if (!inInput && e.key === "F10" && e.altKey && showRowToolbar) {
			e.preventDefault()
			const row = cell.closest('tr') as HTMLElement | null
			if (row) openToolbarFromKeyboard(getRowKey(item), viewIndex, row)
			return
		}
		handleNavigationKeyDown(e, viewIndex, colIndex, column, item)
	}

	function handleNavigationKeyDown(e: KeyboardEvent, viewIndex: number, colIndex: number, column: Column<T>, item: T) {
		if (!isNavigateMode || editingCell) return
		const rowKey = getRowKey(item)

		const editableCols = getEditableColumns(item)
		const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

		switch (e.key) {
			case "ArrowUp":
				e.preventDefault()
				if (viewIndex > 0) focusCellAt(viewIndex - 1, colIndex)
				break
			case "ArrowDown":
				e.preventDefault()
				if (viewIndex < displayItems.length - 1) focusCellAt(viewIndex + 1, colIndex)
				break
			case "ArrowLeft":
				e.preventDefault()
				// Ctrl/Cmd+ArrowLeft: tree-collapse. If focused row is an expanded parent,
				// collapse it; otherwise walk up to the nearest expanded ancestor and collapse
				// that, then refocus the ancestor's row (the current row is about to be hidden).
				if ((e.ctrlKey || e.metaKey) && isTreeMode) {
					const path = getRowPath(item)
					if (rowHasChildren(item) && isPathExpanded(path)) {
						toggleExpand(path)
					} else {
						const ancestor = nearestExpandedAncestor(path, resolvedTreeSeparator, resolvedExpandedPaths)
						if (ancestor) {
							toggleExpand(ancestor)
							const ancestorRowIndex = displayItems.findIndex(it => getRowPath(it) === ancestor)
							if (ancestorRowIndex >= 0) focusCellAt(ancestorRowIndex, colIndex)
						}
					}
					break
				}
				if (colIndex > 0) focusCell(rowKey, colIndex - 1)
				break
			case "ArrowRight":
				e.preventDefault()
				// Ctrl/Cmd+ArrowRight: tree-expand. Only acts on rows that have children and
				// are currently collapsed; leaves and already-expanded rows are no-ops (matches
				// the chevron's affordance — nothing to expand).
				if ((e.ctrlKey || e.metaKey) && isTreeMode) {
					if (rowHasChildren(item) && !isPathExpanded(getRowPath(item))) {
						toggleExpand(getRowPath(item))
					}
					break
				}
				if (colIndex < columns.length - 1) focusCell(rowKey, colIndex + 1)
				break
			case "Tab": {
				// No editable cell further on: the browser's Tab leaves the grid (WCAG 2.1.2)
				const target = findNextEditableCell(viewIndex, currentEditableIndex, e.shiftKey ? -1 : 1)
				if (!target) break
				e.preventDefault()
				focusCellAt(target.viewIndex, target.colIndex)
				break
			}
			case "Enter":
			case "F2":
				e.preventDefault()
				// Gate on isCellEditable: rc17 made all cells focusable (was: editable
				// cells only), so this handler now fires on read-only cells too. Without
				// this guard, Enter / F2 would open an editor on the tree column or any
				// other cell on a read-only row (e.g. team rows in the teams+employees
				// demo). Click handlers gate already; the keyboard path was overlooked.
				if (!isCellEditable(column, item)) break
				startEdit(String(column.field), item, column, colIndex)
				break
			case " ":
				// Space toggles checkbox immediately. Same gate as Enter/F2 — read-only
				// cells with a checkbox-editor column shouldn't toggle.
				if (column.editor === "checkbox" && isCellEditable(column, item)) {
					e.preventDefault()
					const newValue = toggledCheckboxValue(column, getCellRawValue(item, rowKey, String(column.field)))
					commitEdit(item, column, newValue, colIndex)
				}
				break
			default:
				// Any printable character starts editing (for text/number/autocomplete/combobox/select fields).
				// Same gate — without it, typing on a read-only cell would open a default-text editor
				// because the `|| !column.editor` branch matches columns with no editor configured at all.
				if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && isCellEditable(column, item)) {
					if (column.editor === "text" || column.editor === "number" || !column.editor) {
						startEdit(String(column.field), item, column, colIndex)
						// Don't prevent default - let the character be typed
					} else if (column.editor === "autocomplete" || column.editor === "combobox" || column.editor === "select") {
						// Pass typed character as initial search query for dropdown types
						e.preventDefault()
						startEdit(String(column.field), item, column, colIndex, e.key)
					}
				}
				break
		}
	}

	// Tab / Enter / arrows leave the cell: the editor commits what it holds through its own
	// parse path (number, date outputFormat, autocomplete free text; unchanged → cancel).
	// A checkbox already committed on toggle; a dropdown pick already committed (the editor
	// then just returns that commit).
	async function commitFromKeyboard(column: Column<T>, token: number | undefined) {
		if (column.editor === "checkbox" || !activeEditor) endEdit(token)
		else await activeEditor.commit()
	}

	async function handleEditorKeyDown(e: KeyboardEvent, viewIndex: number, colIndex: number, column: Column<T>, item: T) {
		const rowKey = getRowKey(item)
		const token = editingCell?.token
		// After an awaited commit: false when another edit opened meanwhile (don't move focus).
		const stillOurs = () => editingCell === null || editingCell.token === token
		const editableCols = getEditableColumns(item)
		const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

		// Tab works in BOTH navigate mode and dblclick / click / button modes. Without this
		// override, dblclick mode would fall through to the browser's default Tab — which
		// blurs the input to whatever focusable element is next on the page (often outside
		// the grid entirely), and the focus indicator visibly disappeared. The post-commit
		// advance behavior differs by mode (see comment below).
		if (e.key === "Tab") {
			e.preventDefault()
			e.stopPropagation()  // Prevent bubbling to handleNavigationKeyDown
			isCommittingFromKeyboard = true

			await commitFromKeyboard(column, token)

			isCommittingFromKeyboard = false
			if (!stillOurs()) return
			viewIndex = getViewIndex(rowKey)  // the commit may have moved the row

			// Walk to the next / previous editable cell, skipping rows that have no editable
			// columns (heterogeneous trees: team rows have zero, employee rows have N).
			const tabTarget = findNextEditableCell(viewIndex, currentEditableIndex, e.shiftKey ? -1 : 1)
			if (!tabTarget) {
				// Last / first editable cell: back on the cell (focus isn't lost); the next Tab leaves
				if (isNavigateMode) focusCell(rowKey, colIndex)
				return
			}

			if (isNavigateMode) {
				// Navigate mode: focus the next cell as a focusable td (tabindex=0). User
				// presses Enter / F2 / character to start editing.
				focusCellAt(tabTarget.viewIndex, tabTarget.colIndex)
			} else {
				// dblclick / click / button: spreadsheet pattern — auto-open the editor on
				// the next editable cell. Cells in these modes don't have tabindex, so
				// `focusCell` would be a no-op; we have to start the next edit directly.
				// Wait one tick so the previous editor unmounts cleanly before the next mounts —
				// otherwise the autofocus on the new editor races the blur on the old one.
				const tabTargetItem = displayItems[tabTarget.viewIndex]
				const tabTargetColumn = columns[tabTarget.colIndex]
				await tick()
				startEdit(String(tabTargetColumn.field), tabTargetItem, tabTargetColumn, tabTarget.colIndex)
			}
			return
		}

		// Escape and Enter remain navigate-mode-only — in dblclick / click / button modes
		// GridCellEditor handles those keys itself (commit on Enter, cancel on Escape).
		if (!isNavigateMode) return

		if (e.key === "Escape") {
			e.preventDefault()
			e.stopPropagation()  // Prevent bubbling to handleNavigationKeyDown
			// Set the same flag we use for keyboard-driven commits so the editor's blur,
			// which fires during the unmount triggered by editingCell = null, skips its
			// commit-on-blur path. Without this, clearing a number cell then pressing Esc
			// commits null instead of canceling — Esc cancels in QuickGrid, but the editor
			// also commits during teardown via blur, and the commit wins. The flag must
			// stay true across the async unmount (blur is async), hence `await tick()`.
			isCommittingFromKeyboard = true
			cancelEdit(token)
			await tick()
			isCommittingFromKeyboard = false
			viewIndex = getViewIndex(rowKey)  // the commit may have moved the row
			focusCell(rowKey, colIndex)
		} else if (e.key === "Enter") {
			e.preventDefault()
			e.stopPropagation()  // Prevent bubbling to handleNavigationKeyDown
			isCommittingFromKeyboard = true

			await commitFromKeyboard(column, token)

			isCommittingFromKeyboard = false
			if (!stillOurs()) return
			viewIndex = getViewIndex(rowKey)  // the commit may have moved the row

			// Move to cell below after Enter (any cell — all are focusable in navigate mode).
			if (viewIndex < displayItems.length - 1) focusCellAt(viewIndex + 1, colIndex)
			else focusCell(rowKey, colIndex)
		} else if (e.key === " " && column.editor === "checkbox") {
			// Space toggles checkbox while in edit mode
			e.preventDefault()
			e.stopPropagation()
			const newValue = toggledCheckboxValue(column, getCellRawValue(item, rowKey, String(column.field)))
			await commitEdit(item, column, newValue, colIndex, token)
		} else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
			// NOTE: Dropdown editors (select, combobox, autocomplete) handle their own arrow keys
			// when dropdown is OPEN (via stopPropagation). When dropdown is CLOSED, events bubble
			// here for cell navigation, allowing users to navigate away with arrow keys.

			const isTextEditor = column.editor === "text" || column.editor === "number"

			// For text-based editors, ArrowLeft/ArrowRight only move cursor, never navigate cells
			// User must use Tab/Enter to leave cell (prevents accidental navigation)
			if (isTextEditor && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
				return // Let browser handle cursor movement
			}

			// Arrow keys navigate while editing - commit current value and move
			e.preventDefault()
			e.stopPropagation()
			isCommittingFromKeyboard = true

			await commitFromKeyboard(column, token)

			isCommittingFromKeyboard = false
			if (!stillOurs()) return
			viewIndex = getViewIndex(rowKey)  // the commit may have moved the row

			// Move to target cell (allow navigation even with invalid values).
			// ArrowUp/Down: any cell (all are focusable in navigate mode).
			// ArrowLeft/Right: stays within the editable column list while editing — user
			// pressed an arrow inside an open editor, so they're explicitly stepping between
			// editable cells, not browsing.
			if (e.key === "ArrowUp") {
				if (viewIndex > 0) focusCellAt(viewIndex - 1, colIndex)
				else focusCell(rowKey, colIndex)
			} else if (e.key === "ArrowDown") {
				if (viewIndex < displayItems.length - 1) focusCellAt(viewIndex + 1, colIndex)
				else focusCell(rowKey, colIndex)
			} else if (e.key === "ArrowLeft" && currentEditableIndex > 0) {
				focusCell(rowKey, editableCols[currentEditableIndex - 1].index)
			} else if (e.key === "ArrowRight" && currentEditableIndex < editableCols.length - 1) {
				focusCell(rowKey, editableCols[currentEditableIndex + 1].index)
			} else {
				// Stay in current cell if can't move
				focusCell(rowKey, colIndex)
			}
		}
	}

	// Row action popup functions
	function openRowToolbar(rowKey: string, viewIndex: number, anchor: HTMLElement) {
		hoveredRowKey = rowKey
		hoveredAnchorViewIndex = viewIndex
		hoveredRowElement = anchor
		toolbarSession++
	}

	function closeRowToolbar() {
		// Focus inside the toolbar goes back to where the keyboard opened it from (or the row)
		const refocus = !!popupElement?.contains(document.activeElement)
		const row = hoveredRowElement
		const returnTo = toolbarReturnFocus
		hoveredRowKey = null
		hoveredAnchorViewIndex = null
		hoveredRowElement = null
		// The popup may be removed under the pointer (no mouseleave) — don't leave this stuck.
		rowActionButtonHovered = false
		toolbarFocused = false
		toolbarReturnFocus = null
		if (refocus) {
			const target = returnTo?.isConnected ? returnTo : row?.querySelector('.toolbar-trigger-btn, td[tabindex="0"]') as HTMLElement | null
			target?.focus()
		}
	}

	// Keyboard access: the toolbar opens for the row and takes focus (its first enabled button).
	// Arrows / Home / End move between its buttons; Escape or Tab return focus to `toolbarReturnFocus`.
	let toolbarFocused = $state(false)
	let toolbarReturnFocus: HTMLElement | null = null

	function focusToolbar() {
		void tick().then(() => requestAnimationFrame(() => {
			popupElement?.querySelector<HTMLElement>('.row-toolbar-btn:not(:disabled)')?.focus()
		}))
	}

	function openToolbarFromKeyboard(rowKey: string, viewIndex: number, row: HTMLElement) {
		toolbarReturnFocus = document.activeElement as HTMLElement | null
		if (hoveredRowKey !== rowKey) openRowToolbar(rowKey, viewIndex, row)
		focusToolbar()
	}

	// Without navigate mode, rows with a hover / click toolbar are focusable (one tab stop):
	// ↑ / ↓ / Home / End move between them, Enter or Alt+F10 opens the toolbar.
	let rowsFocusable = $derived(showRowToolbar && toolbarTrigger !== 'button' && !isNavigateMode)
	let rowTabStop = $state<string | null>(null)
	let resolvedRowTabStop = $derived.by(() => {
		if (!rowsFocusable || displayItems.length === 0) return null
		const stop = rowTabStop
		if (stop !== null && viewIndexByKey.has(stop)) return stop
		return getRowKey(displayItems[0])
	})

	function handleRowKeyDown(rowKey: string, viewIndex: number, event: KeyboardEvent) {
		if (event.target !== event.currentTarget) return
		const row = event.currentTarget as HTMLElement
		const rows = [...(tableElement?.querySelectorAll<HTMLElement>(':scope > tbody > tr[data-row-key]') ?? [])]
		let next = -1
		switch (event.key) {
			case 'ArrowDown': next = Math.min(viewIndex + 1, rows.length - 1); break
			case 'ArrowUp': next = Math.max(viewIndex - 1, 0); break
			case 'Home': next = 0; break
			case 'End': next = rows.length - 1; break
			case 'Enter':
				event.preventDefault()
				openToolbarFromKeyboard(rowKey, viewIndex, row)
				return
			case 'F10':
				if (!event.altKey) return
				event.preventDefault()
				openToolbarFromKeyboard(rowKey, viewIndex, row)
				return
			default: return
		}
		event.preventDefault()
		rows[next]?.focus()
	}

	// The toolbar's row, resolved by key against the current view (null once it's gone).
	const hoveredRow = $derived.by(() => {
		if (hoveredRowKey === null) return null
		const viewIndex = getViewIndex(hoveredRowKey)
		return viewIndex < 0 ? null : {row: displayItems[viewIndex], viewIndex}
	})

	// The toolbar stays at the view position it opened at; re-resolve that position's <tr>
	// after the rows re-render (keyed rows move their elements along with the data).
	$effect(() => {
		if (hoveredAnchorViewIndex === null || !tableElement) return
		void displayItems
		const el = tableElement.querySelectorAll(':scope > tbody > tr')[hoveredAnchorViewIndex] as HTMLElement | undefined
		if (el && el !== hoveredRowElement) hoveredRowElement = el
	})

	// Row click handler - toggles popup (click / button modes; a tap in hover mode)
	function handleRowClickForActions(rowKey: string, viewIndex: number, event: MouseEvent) {
		// Hover mode: only a touch tap toggles (mouse / pen open it by hovering)
		if (toolbarTrigger === 'hover' && lastRowPointerType !== 'touch') return

		// Prevent default to avoid triggering other click handlers
		event.stopPropagation()

		// Toggle popup for this row
		if (hoveredRowKey === rowKey) {
			// Clicking same row - hide popup
			closeRowToolbar()
		} else {
			// Show popup for this row. For button trigger, find the parent row element.
			const target = event.currentTarget as HTMLElement
			openRowToolbar(rowKey, viewIndex, target.closest('tr') || target)
		}
	}

	// Button trigger click handler; a keyboard press (detail 0) moves focus into the toolbar
	function handleToolbarButtonClick(rowKey: string, viewIndex: number, event: MouseEvent) {
		event.stopPropagation()
		const trigger = event.currentTarget as HTMLElement
		handleRowClickForActions(rowKey, viewIndex, event)
		if (event.detail === 0 && hoveredRowKey === rowKey) {
			toolbarReturnFocus = trigger
			focusToolbar()
		}
	}

	// Hover mode, decided per event: touch-screen laptops still get hover for the mouse
	function handleRowPointerEnter(rowKey: string, viewIndex: number, event: PointerEvent) {
		if (event.pointerType === 'touch') return

		if (rowActionHideTimeout) {
			clearTimeout(rowActionHideTimeout)
			rowActionHideTimeout = null
		}
		openRowToolbar(rowKey, viewIndex, event.currentTarget as HTMLElement)
	}

	function handleRowPointerLeave(event: PointerEvent) {
		if (event.pointerType === 'touch') return

		// Delay hiding to allow mouse to reach the popup (a keyboard user inside it keeps it)
		rowActionHideTimeout = setTimeout(() => {
			if (!rowActionButtonHovered && !toolbarFocused) closeRowToolbar()
		}, 200)
	}

	function handleRowActionPopupPointerEnter(event: PointerEvent) {
		if (event.pointerType === 'touch') return
		if (rowActionHideTimeout) {
			clearTimeout(rowActionHideTimeout)
			rowActionHideTimeout = null
		}
		rowActionButtonHovered = true
	}

	function handleRowActionPopupPointerLeave(event: PointerEvent) {
		if (event.pointerType === 'touch') return
		rowActionButtonHovered = false
		// Start hide timeout when leaving the popup (hover mode only)
		if (toolbarTrigger === 'hover') rowActionHideTimeout = setTimeout(() => {
			if (!toolbarFocused) closeRowToolbar()
		}, 150)
	}

	async function handleToolbarItemClick(item: RowToolbarItem<T>, action: string, event: MouseEvent) {
		// Resolve the row by key now — it may have moved, or been replaced by a new object
		const target = hoveredRow
		if (target === null) {
			// Row was removed externally, hide popup
			closeRowToolbar()
			return
		}

		const ran = await runAction({
			host: actionHost,
			detail: {
				row: target.row,
				...getRowIdentity(target.row),
				action,
				id: item.id,
				item,
				source: "row-toolbar",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			} as QuickGridActionDetail<T>,
			beforeActionCallback,
			emitAction: (detail) => onAction?.(detail)
		})

		// For delete action, hide popup (row is gone)
		if (ran && action === 'delete') closeRowToolbar()
		// For other actions (add, duplicate, move), keep popup visible
	}

	// Built-in toolbar presets: icon, text (tooltip), danger styling. Your item fields win.
	const toolbarPresets: Record<RowToolbarAction, Partial<ResolvedActionItem<RowToolbarAction>>> = $derived({
		add: { icon: 'add', text: labels.addRow },
		delete: { icon: 'delete', text: labels.deleteRow, isDanger: true },
		duplicate: { icon: 'copy', text: labels.duplicateRow },
		'move-up': { icon: 'arrow_up', text: labels.moveRowUp },
		'move-down': { icon: 'arrow_down', text: labels.moveRowDown }
	})

	// While the toolbar is open: an outside press / focus closes it.
	// Listeners exist only while it's open; the toolbar follows its row (PositioningRegion).
	$effect(() => {
		if (hoveredRowKey === null) return
		return dismissOnOutside(() => [containerRef, popupElement], () => closeRowToolbar())
	})

	// Escape closes it (closeRowToolbar returns focus). A hover-opened toolbar is no layer unless
	// it holds focus — the pointer passing over a row (e.g. in a dialog) must not take Escape.
	$effect(() => {
		if (hoveredRowKey === null || (toolbarTrigger === 'hover' && !toolbarFocused)) return
		return pushLayer({
			onEscape: (event) => {
				// Escape in a cell editor cancels the edit, not the toolbar
				if ((event.target as Element | null)?.closest?.('td.editing')) return false
				closeRowToolbar()
			}
		})
	})

	// Close a popup once its anchor scrolls out of view (any scroll container or the page)
	function closeWhenHidden(el: Element | null | undefined, close: () => void) {
		if (!el || typeof IntersectionObserver === 'undefined') return
		const observer = new IntersectionObserver((entries) => {
			if (!entries[entries.length - 1].isIntersecting) close()
		})
		observer.observe(el)
		return () => observer.disconnect()
	}

	$effect(() => closeWhenHidden(hoveredRowKey === null ? null : hoveredRowElement, closeRowToolbar))

	// Context menu handlers
	function handleCellContextMenu(e: MouseEvent, colIndex: number, column: Column<T>, item: T) {
		// Right-click in an editor's input keeps the native menu (copy / paste / spelling)
		if ((e.target as Element).closest('input, textarea, select, [contenteditable]')) return
		const cell = e.currentTarget as HTMLElement
		const rect = cell.getBoundingClientRect()
		if (openContextMenu(cell, colIndex, column, item, {dx: e.clientX - rect.left, dy: e.clientY - rect.top})) e.preventDefault()
	}

	// Focus to restore when the menu closes with focus inside it
	let contextMenuReturnFocus: HTMLElement | null = null

	// Opens the menu on a cell: at the pointer's offset in it, or (keyboard, `offset` null) below
	// the cell with focus on the first item. False when it has nothing to show (native menu then).
	function openContextMenu(cell: HTMLElement, colIndex: number, column: Column<T>, item: T, offset: {dx: number; dy: number} | null): boolean {
		if (!contextMenu || contextMenu.length === 0) return false
		const context: ContextMenuContext<T> = {
			row: item,
			...getRowIdentity(item),
			columnIndex: colIndex,
			column,
			cellValue: getCellRawValue(item, getRowKey(item), String(column.field))
		}
		// Nothing visible for this cell (e.g. tree-only built-ins on a flat grid) → native menu.
		if (resolveMenuEntries(contextMenu, context, (item) => contextMenuDefaults(item, context)).length === 0) return false

		const rect = cell.getBoundingClientRect()
		const rtl = getComputedStyle(cell).direction === 'rtl'
		contextMenuContext = context
		contextMenuAnchor = {cell, ...(offset ?? {dx: rtl ? rect.width : 0, dy: rect.height})}
		contextMenuVisible = true
		contextMenuReturnFocus = document.activeElement as HTMLElement | null

		onContextMenuOpen?.(context)
		if (!offset) {
			void tick().then(() => requestAnimationFrame(() => {
				contextMenuElement?.querySelector<HTMLElement>('fluent-menu-item:not([disabled])')?.focus()
			}))
		}
		return true
	}

	async function handleContextMenuItemClick(item: MenuEntry<ContextMenuContext<T>, ContextMenuAction>, action: string, event: MouseEvent | KeyboardEvent) {
		const ctx = contextMenuContext
		if (!ctx || 'divider' in item) return
		if (item.shouldCloseOnClick !== false) closeContextMenu()
		await runAction({
			host: actionHost,
			detail: {
				...ctx,
				// re-resolved: the row may have moved while the menu was open
				...getRowIdentity(ctx.row, ctx.rowKey),
				action,
				id: item.id,
				item,
				source: "context-menu",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			} as QuickGridActionDetail<T>,
			beforeActionCallback,
			runBuiltIn: () => runContextMenuBuiltIn(action, ctx),
			emitAction: (detail) => onAction?.(detail)
		})
	}

	// Built-in context-menu items: default text / icon, and a tree-mode visibility gate
	// so they only show when relevant. Your item fields (text, icon, isVisible, …) win.
	function contextMenuDefaults(item: MenuEntry<ContextMenuContext<T>, ContextMenuAction>, ctx: ContextMenuContext<T> | null): Partial<ResolvedActionItem<ContextMenuAction>> | undefined {
		if ('divider' in item) return undefined
		switch (item.action) {
			case 'expand-all':
				return { text: labels.expandAll, icon: 'arrow_expand_all', isVisible: isTreeMode && !!ctx && rowHasChildren(ctx.row) }
			case 'collapse-all':
				return { text: labels.collapseAll, icon: 'arrow_collapse_all', isVisible: isTreeMode && !!ctx && rowHasChildren(ctx.row) }
			case 'expand-tree':
				return { text: labels.expandTree, icon: 'arrow_expand_all', isVisible: isTreeMode && treeParentPathSet.size > 0 }
			case 'collapse-tree':
				return { text: labels.collapseTree, icon: 'arrow_collapse_all', isVisible: isTreeMode && resolvedExpandedPaths.size > 0 }
		}
		return undefined
	}

	// What the built-ins do. They re-read reactive state (`resolvedExpandedPaths`,
	// `treeParentPathSet`, `items`) on each run.
	function runContextMenuBuiltIn(action: string, ctx: ContextMenuContext<T>) {
		switch (action) {
			case 'expand-all': {
				// Expand the right-clicked row and every descendant that has children.
				const root = getRowPath(ctx.row)
				const next = new Set(resolvedExpandedPaths)
				for (const it of items) {
					const p = getRowPath(it)
					if (isInSubtree(p, root, resolvedTreeSeparator) && treeParentPathSet.has(p)) next.add(p)
				}
				setExpandedPaths(next)
				break
			}
			case 'collapse-all': {
				const root = getRowPath(ctx.row)
				setExpandedPaths(new Set([...resolvedExpandedPaths].filter(p => !isInSubtree(p, root, resolvedTreeSeparator))))
				break
			}
			case 'expand-tree':
				setExpandedPaths(new Set(treeParentPathSet))
				break
			case 'collapse-tree':
				setExpandedPaths(new Set())
				break
		}
	}

	function closeContextMenu() {
		const refocus = !!contextMenuElement?.contains(document.activeElement)
		const returnTo = contextMenuReturnFocus
		contextMenuVisible = false
		contextMenuContext = null
		contextMenuAnchor = null
		contextMenuReturnFocus = null
		if (refocus && returnTo?.isConnected) returnTo.focus()
	}

	// While the menu is open: a press outside it (a right-click elsewhere reopens it there,
	// the header closes it) or focus leaving closes it; Escape goes to the topmost layer.
	$effect(() => {
		if (!contextMenuVisible) return
		const undismiss = dismissOnOutside(() => [containerRef, contextMenuElement], () => closeContextMenu())
		const popLayer = pushLayer({onEscape: () => closeContextMenu()})
		return () => {
			undismiss()
			popLayer()
		}
	})

	$effect(() => closeWhenHidden(contextMenuVisible ? contextMenuAnchor?.cell : null, closeContextMenu))

	// The grid counts as "inside" above (the anchor's dialog), so a press in it closes the menu here
	function handleContainerPointerDown(event: PointerEvent) {
		if (contextMenuVisible && !contextMenuElement?.contains(event.target as Node)) closeContextMenu()
	}
	// A listener, not `onpointerdowncapture`, so a consumer's own handler in `...rest` still runs
	$effect(() => {
		const el = containerRef
		if (!el) return
		el.addEventListener("pointerdown", handleContainerPointerDown, true)
		return () => el.removeEventListener("pointerdown", handleContainerPointerDown, true)
	})

	onDestroy(() => {
		if (rowActionHideTimeout) clearTimeout(rowActionHideTimeout)
	})

	let computedClass = $derived(`quickgrid ${striped ? "striped" : ""} ${hoverable ? "hoverable" : ""} ${editable ? "editable" : ""} ${isNavigateMode ? "navigate-mode" : ""} ${className}`.trim())
</script>

<div {...rest} bind:this={containerRef} class="quickgrid-container" {style} onfocusout={handleGridFocusOut}>
	<!-- Row toolbar (uses fixed positioning to float outside container) -->
	{#if showRowToolbar && hoveredRow && hoveredRowElement && tableElement}
		<QuickGridRowToolbar
			bind:element={popupElement}
			bind:focused={toolbarFocused}
			anchor={hoveredRowElement}
			table={tableElement}
			target={hoveredRow}
			session={toolbarSession}
			align={toolbarAlign}
			{labels}
			entries={resolvedToolbarConfig}
			rowContext={{row: hoveredRow.row, ...getRowIdentity(hoveredRow.row)}}
			presets={toolbarPresets}
			onItemClick={({item, action, event}) => handleToolbarItemClick(item, action, event)}
			onCloseRequest={closeRowToolbar}
			onpointerenter={handleRowActionPopupPointerEnter}
			onpointerleave={handleRowActionPopupPointerLeave}
		/>
	{/if}

	<!-- Context menu -->
	{#if contextMenu && contextMenuVisible && contextMenuContext && contextMenuAnchor}
		<QuickGridContextMenu
			bind:element={contextMenuElement}
			anchor={contextMenuAnchor}
			entries={resolveMenuEntries(contextMenu, contextMenuContext, (item) => contextMenuDefaults(item, contextMenuContext))}
			onItemSelect={({item, action, event}) => handleContextMenuItemClick(item, action, event)}
		/>
	{/if}

	<div class="quickgrid-live-region" role="status" aria-live="polite">{liveMessage}</div>

	<table
		bind:this={tableElement}
		class={computedClass}
		role={isTreeMode ? "treegrid" : undefined}
		aria-label={ariaLabel}
		aria-labelledby={ariaLabelledby}
		aria-rowcount={ariaRowCount}
	>
		<QuickGridHeader
			{columns}
			{columnStyles}
			{labels}
			{sortMode}
			{sort}
			{filterable}
			{filters}
			{filterValidity}
			actionsColumn={showRowToolbar && toolbarTrigger === 'button'}
			{fillerColumn}
			headerRowIndex={ariaRowCount !== undefined ? headerRowCount : undefined}
			onSortRequest={({column, additive}) => handleSort(column, additive)}
			filterChangeCallback={({field, value}) => handleFilter(field, value)}
		/>
		<tbody>
			{#if displayItems.length === 0}
				<tr>
					<td colspan={columns.length + (showRowToolbar && toolbarTrigger === 'button' ? 1 : 0) + (fillerColumn ? 1 : 0)} class="empty-message">
						{labels.emptyText}
					</td>
				</tr>
			{:else}
				{#each displayRows as {item, rowKey, eachKey}, viewIndex (eachKey)}
					{@const rowPath = isTreeMode ? getRowPath(item) : ""}
					{@const rowIsParent = isTreeMode && (isFiltering ? filteredParentPaths.has(rowPath) : rowHasChildren(item))}
					<tr
						data-row-key={rowKey}
						aria-rowindex={ariaRowCount !== undefined ? rowIndexBase + viewIndex + 1 : undefined}
						aria-level={isTreeMode ? getRowLevel(item) - treeMinLevel + 1 : undefined}
						aria-expanded={rowIsParent ? isFiltering || isPathExpanded(rowPath) : undefined}
						onclick={showRowToolbar && toolbarTrigger !== 'button' ? (e) => handleRowClickForActions(rowKey, viewIndex, e) : undefined}
						onpointerdown={showRowToolbar && toolbarTrigger === 'hover' ? (e) => lastRowPointerType = e.pointerType : undefined}
						onpointerenter={showRowToolbar && toolbarTrigger === 'hover' ? (e) => handleRowPointerEnter(rowKey, viewIndex, e) : undefined}
						onpointerleave={showRowToolbar && toolbarTrigger === 'hover' ? handleRowPointerLeave : undefined}
						tabindex={rowsFocusable ? (resolvedRowTabStop === rowKey ? 0 : -1) : undefined}
						onfocus={rowsFocusable ? (e) => { if (e.target === e.currentTarget) rowTabStop = rowKey } : undefined}
						onkeydown={rowsFocusable ? (e) => handleRowKeyDown(rowKey, viewIndex, e) : undefined}
					>
						{#if showRowToolbar && toolbarTrigger === 'button'}
							<td class="actions-column">
								<button
									type="button"
									class="toolbar-trigger-btn"
									class:active={hoveredRowKey === rowKey}
									onclick={(e) => handleToolbarButtonClick(rowKey, viewIndex, e)}
									title={labels.rowActions}
									aria-label={labels.rowActions}
									aria-haspopup="true"
									aria-expanded={hoveredRowKey === rowKey}
									tabindex={isNavigateMode ? -1 : undefined}
								>
									<span aria-hidden="true">⋮</span>
								</button>
							</td>
						{/if}
						{#each columns as column, colIndex}
							{@const cellField = String(column.field)}
							{@const cellInvalid = invalidByKey.has(cellKeyOf(rowKey, cellField))}
							{@const cellError = invalidByKey.get(cellKeyOf(rowKey, cellField)) || null}
							{@const cellEditable = isCellEditable(column, item)}
							{@const cellEditing = isEditing(rowKey, cellField)}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
							<td
								data-row={viewIndex}
								data-col={colIndex}
								tabindex={getCellTabIndex(rowKey, colIndex)}
								style={columnStyles[colIndex].body}
								class={`${cellEditable ? "editable-cell" : ""} ${cellInvalid ? "validation-error" : ""} ${isCellFocused(rowKey, colIndex) ? "focused" : ""} ${cellEditing ? "editing" : ""} ${column.nowrap ? "nowrap-cell" : ""}`}
								onclick={(e) => handleCellClick(e, colIndex, column, item)}
								ondblclick={(e) => handleCellDblClick(e, colIndex, column, item)}
								oncontextmenu={(e) => handleCellContextMenu(e, colIndex, column, item)}
								onfocus={() => handleCellFocus(colIndex, column, item)}
								onkeydown={(e) => handleCellKeyDown(e, viewIndex, colIndex, column, item)}
								title={cellError || undefined}
							>
								{#snippet cellContent()}
								{#if cellEditing}
									{#if column.editor === "custom"}
										<!-- Custom editor - handled via callback, show indicator -->
										<span class="custom-editing-indicator">{labels.editing}</span>
									{:else if editingCell}
										{@const editToken = editingCell.token}
										{@const isValidating = validatingToken === editToken}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											class="editor-wrapper"
											class:validating={isValidating}
											onkeydown={(e) => handleEditorKeyDown(e, viewIndex, colIndex, column, item)}
										>
											{#key editToken}
												<GridCellEditor
													bind:this={activeEditor}
													{labels}
													autofocus
													type={getEditorType(column)}
													value={getCellRawValue(item, rowKey, cellField)}
													displayText={getEditorDisplayText(item, column, rowKey)}
													options={optionsLoader.editorOptionsFor(column, item, rowKey)}
													{editToken}
													initialSearchQuery={editingCell?.initialSearchQuery}
													onCommit={({value: newValue, editToken: token}) => commitEdit(item, column, newValue, colIndex, token)}
													onCancel={({editToken: token}) => cancelEdit(token)}
													skipBlurCommit={isCommittingFromKeyboard}
													skipKeyboardCommit={isNavigateMode}
												/>
											{/key}
											{#if isValidating}
												<span class="validating-indicator" role="img" aria-label={labels.validating} title={labels.validating}>...</span>
											{/if}
										</div>
										<!-- The cell's current validation error (set by an earlier invalid commit). -->
										{#if cellError}
											<div class="validation-error-message">{cellError}</div>
										{/if}
									{/if}
								{:else if cellEditable && getColumnEditTrigger(column) === "always"}
									<GridCellEditor
										{labels}
										type={getEditorType(column)}
										value={getCellRawValue(item, rowKey, cellField)}
										displayText={getEditorDisplayText(item, column, rowKey)}
										options={optionsLoader.editorOptionsFor(column, item, rowKey)}
										onCommit={({value: newValue}) => commitEdit(item, column, newValue)}
										onCancel={() => {}}
									/>
								{:else}
									<div class="cell-content">
										{#if column.snippet}
											{@render column.snippet(item)}
										{:else if column.renderCellCallback}
											<!-- Unsanitised HTML: renderCellCallback must escape any user data (see its JSDoc) -->
											{@html getCellValue(item, column, rowKey)}
										{:else if isNavigateMode && column.editor === "checkbox"}
											<!-- Checkbox in navigate mode: either always editable or disabled display -->
											{#if checkboxAlwaysEditable}
												<GridCellEditor
													{labels}
													type="checkbox"
													value={getCellRawValue(item, rowKey, cellField)}
													options={optionsLoader.editorOptionsFor(column, item, rowKey)}
													onCommit={({value: newValue}) => commitEdit(item, column, newValue)}
													onCancel={() => {}}
												/>
											{:else}
												<input
													type="checkbox"
													class="cell-checkbox-display"
													checked={isCheckboxChecked(column, getCellRawValue(item, rowKey, cellField))}
													disabled
													tabindex={-1}
												/>
											{/if}
										{:else}
											<span class="cell-text">{getCellValue(item, column, rowKey)}</span>
										{/if}
										{#if optionsLoadingEdit?.rowKey === rowKey && optionsLoadingEdit.field === cellField}
											<span class="options-loading-indicator" role="img" aria-label={labels.loadingOptions} title={labels.loadingOptions}>...</span>
										{/if}
										{#if cellInvalid}
											<span class="cell-error-indicator" title={cellError || labels.invalidValue}>⚠</span>
										{/if}
										{#if cellEditable && shouldShowEditButton(column)}
											<button
												type="button"
												class="cell-edit-btn"
												onclick={(e) => handleEditButtonClick(e, colIndex, column, item)}
												title={labels.edit}
												aria-label={labels.edit}
												tabindex={isNavigateMode ? -1 : undefined}
											>
												<span aria-hidden="true">✎</span>
											</button>
										{/if}
									</div>
								{/if}
								{/snippet}
								{#if isTreeMode && column.tree}
									{@const _level = getRowLevel(item)}
									{@const _expanded = isFiltering || isPathExpanded(rowPath)}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="tree-cell"
										style={`padding-inline-start: ${_level * 1.25}rem`}
										onmousedown={(e) => {
											// Suppress the default text-selection extension that the second click of
											// a dblclick triggers — only when we're actually going to handle the
											// dblclick as a tree-toggle. e.detail counts clicks within the dblclick
											// interval, so > 1 == "this is the second+ click of a multi-click".
											if (e.detail > 1 && treeDoubleClickBehavior === "toggle" && rowIsParent) {
												e.preventDefault()
											}
										}}
									>
										{#if rowIsParent}
											<button
												type="button"
												class="tree-chevron"
												class:expanded={_expanded}
												disabled={isFiltering}
												onclick={(e) => { e.stopPropagation(); toggleExpand(rowPath) }}
												ondblclick={(e) => e.stopPropagation()}
												aria-label={_expanded ? labels.collapse : labels.expand}
												title={isFiltering ? labels.clearFilterToCollapse : _expanded ? labels.collapse : labels.expand}
												tabindex={isNavigateMode ? -1 : undefined}
											>
												<span aria-hidden="true">▶</span>
											</button>
										{:else}
											<span class="tree-leaf-spacer" aria-hidden="true"></span>
										{/if}
										<div class="tree-cell-body">{@render cellContent()}</div>
									</div>
								{:else}
									{@render cellContent()}
								{/if}
							</td>
						{/each}
						{#if fillerColumn}
							<td class="filler-column"></td>
						{/if}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>

	{#if pageable && (totalPages > 1 || pageSizeChoices.length > 0)}
		<QuickGridPager
			{labels}
			page={effectivePage}
			pageCount={totalPages}
			itemCount={pagedTotal}
			{pageSize}
			pageSizes={pageSizeChoices}
			busy={pageChangePending}
			onPageRequest={({page}) => goToPage(page)}
			pageSizeChangeCallback={({pageSize: size}) => changePageSize(size)}
		/>
	{/if}
</div>

<style>
	/* Theme hooks: --fluent-quickgrid-* variables (docs: QuickGrid → CSS variables); each falls back
	   to the FluentUI design token, so light / dark follow `baseLayerLuminance` without overrides. */
	.quickgrid-container {
		position: relative;
		width: 100%;
		overflow-x: auto;
	}

	.quickgrid {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
		background: var(--fluent-quickgrid-bg, var(--neutral-layer-1, #ffffff));
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
	}

	/* Filler column: an empty trailing cell whose sole job is to absorb any leftover
	   horizontal space so preceding columns keep their defined / auto widths instead
	   of stretching. `width: 100%` is the classic absorb-leftover trick in auto
	   table-layout — other columns claim their content/defined widths first and the
	   filler swallows whatever remains, instead of an arbitrary unspecified column
	   ballooning to fill the table. (The header's copy is in QuickGridHeader.svelte.) */
	.filler-column {
		width: 100%;
		padding: 0;
		background: transparent;
	}

	/* Live region: read by screen readers, not shown */
	.quickgrid-live-region {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}

	tbody tr {
		border-block-end: 1px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
	}

	tbody td {
		padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
		color: var(--fluent-quickgrid-text, var(--neutral-foreground-rest, #242424));
	}

	.quickgrid.striped tbody tr:nth-child(even) {
		background: var(--fluent-quickgrid-row-bg-stripe, var(--neutral-layer-2, #fafafa));
	}

	.quickgrid.hoverable tbody tr:hover {
		background: var(--fluent-quickgrid-row-bg-hover, var(--neutral-layer-3, #f0f0f0));
	}

	.empty-message {
		text-align: center;
		padding: calc(var(--design-unit) * 6px);
		color: var(--neutral-foreground-hint, #707070);
		font-style: italic;
	}

	/* Tree column: indentation + expand/collapse chevron.
	   Use inline-flex (not flex) and don't set flex:1 on the body — otherwise the wrapper
	   signals "fill all available space" to the table's auto layout and steals width from
	   sibling columns. */
	.tree-cell {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.tree-cell-body {
		min-width: 0;
	}

	.tree-chevron {
		all: unset;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: var(--fluent-border-radius-sm);
		font-size: 9px;
		color: var(--neutral-foreground-hint, #707070);
		cursor: pointer;
		flex-shrink: 0;
		transition: transform 0.12s ease, background 0.1s ease;
	}

	.tree-chevron:hover {
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
		color: var(--neutral-foreground-rest, #242424);
	}

	.tree-chevron.expanded {
		transform: rotate(90deg);
	}

	tbody tr:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--fluent-quickgrid-focus-stroke, var(--focus-stroke-outer, #0078d4));
		outline-offset: calc(var(--focus-stroke-width, 2) * -1px);
	}

	.tree-chevron:focus-visible,
	.toolbar-trigger-btn:focus-visible,
	.cell-edit-btn:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--fluent-quickgrid-focus-stroke, var(--focus-stroke-outer, #0078d4));
		outline-offset: 1px;
	}

	/* The edit button shows while focused, not only on hover */
	.cell-edit-btn:focus-visible {
		opacity: 1;
	}

	.tree-chevron > span {
		display: inline-flex;
	}

	.tree-leaf-spacer {
		display: inline-block;
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.tree-chevron:disabled {
		cursor: default;
		opacity: 0.5;
	}

	/* Editable cell styles */
	.quickgrid.editable .editable-cell {
		cursor: pointer;
		position: relative;
	}

	.quickgrid.editable .editable-cell:hover {
		background: var(--fluent-quickgrid-editable-bg-hover, var(--neutral-fill-secondary-hover, #f0f0f0));
	}

	.quickgrid.editable .editable-cell:hover::after {
		content: "";
		position: absolute;
		inset: 2px;
		border: 1px dashed var(--fluent-quickgrid-editable-border-hover, var(--neutral-stroke-input-rest, #d1d1d1));
		border-radius: var(--fluent-border-radius-sm);
		pointer-events: none;
	}

	/* Cell content with edit button */
	.cell-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
	}

	/* Nowrap column: ellipsis-truncate the text span when its column has a
	   max-width. The span needs `min-width: 0` to shrink below intrinsic
	   content width as a flex item; `flex: 1 1 auto` lets it claim the
	   horizontal space the edit button / error icon doesn't use. */
	td.nowrap-cell .cell-text {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: block;
	}

	/* Actions column (for button trigger mode; the header's copy is in QuickGridHeader.svelte) */
	.actions-column {
		width: 32px;
		min-width: 32px;
		max-width: 32px;
		padding: 0 !important;
		text-align: center;
	}

	/* Toolbar trigger button (for button mode) */
	.toolbar-trigger-btn {
		padding: 0 4px;
		background: transparent;
		border: none;
		border-radius: var(--control-corner-radius, 4px);
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		color: var(--neutral-foreground-hint, #707070);
		transition: background 0.1s ease, color 0.1s ease;
	}

	.toolbar-trigger-btn:hover,
	.toolbar-trigger-btn.active {
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
		color: var(--neutral-foreground-rest, #242424);
	}

	.cell-edit-btn {
		opacity: 0;
		padding: 2px 6px;
		background: var(--neutral-layer-2, #f5f5f5);
		border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		cursor: pointer;
		font-size: 12px;
		line-height: 1;
		transition: opacity 0.15s ease;
	}

	.editable-cell:hover .cell-edit-btn {
		opacity: 1;
	}

	.cell-edit-btn:hover {
		background: var(--neutral-layer-3, #ebebeb);
		border-color: var(--accent-fill-rest, #0078d4);
	}

	/* Validation error styles */
	.validation-error {
		background: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12)) !important;
	}

	.validation-error::after {
		border-color: var(--fluent-color-danger-foreground, #d13438) !important;
		border-style: solid !important;
	}

	.validation-error-message {
		font-size: 11px;
		color: var(--fluent-color-danger-foreground, #d13438);
		margin-block-start: 2px;
	}

	/* Cell error indicator (shows when cell is invalid but not editing) */
	.cell-error-indicator {
		color: var(--fluent-color-danger-foreground, #d13438);
		font-size: 12px;
		margin-inline-start: 4px;
		cursor: help;
	}

	/* Editor wrapper and validating state */
	.editor-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.editor-wrapper.validating {
		opacity: 0.7;
		pointer-events: none;
	}

	.validating-indicator,
	.options-loading-indicator {
		font-size: 10px;
		color: var(--neutral-foreground-hint, #707070);
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* Custom editing indicator */
	.custom-editing-indicator {
		font-size: 12px;
		color: var(--accent-foreground-rest, #0078d4);
		font-style: italic;
	}

	/* Navigate mode styles. All cells are focusable so the focus indicator applies to
	   any td.focused, not only `.editable-cell` — read-only cells still need the indicator
	   so the user can see where their selection is when traversing the tree column or
	   non-editable rows. `cursor: cell` stays scoped to editable cells (cursor signals
	   editability, not focusability). */
	.quickgrid.navigate-mode .editable-cell {
		cursor: cell;
	}

	.quickgrid.navigate-mode tbody td:focus {
		outline: none;
	}

	.quickgrid.navigate-mode tbody td.focused {
		outline: 2px solid var(--fluent-quickgrid-focused-cell-stroke, var(--accent-fill-rest, #0078d4));
		outline-offset: -2px;
		background: var(--fluent-quickgrid-focused-cell-bg, var(--neutral-fill-secondary-hover, #f0f0f0));
	}

	.quickgrid.navigate-mode tbody td.focused::after {
		display: none;
	}

	/* Editing cell - prominent background */
	.quickgrid .editable-cell.editing {
		background: var(--fluent-quickgrid-editing-bg, var(--neutral-layer-1, #ffffff)) !important;
		outline: 2px solid var(--fluent-quickgrid-editing-stroke, var(--accent-fill-rest, #0078d4));
		outline-offset: -2px;
	}

	/* Editing cell styles - seamless input */
	.editable-cell .editor-wrapper {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
		box-sizing: border-box;
	}

	/* Make editable cells position relative for absolute editor */
	tbody td.editable-cell {
		position: relative;
	}

	/* When a cell is being edited, show the accent border on the cell itself */
	tbody td:has(.editor-wrapper) {
		outline: 2px solid var(--fluent-quickgrid-editing-stroke, var(--accent-fill-rest, #0078d4));
		outline-offset: -2px;
		background: var(--fluent-quickgrid-editing-bg, var(--neutral-layer-1, #ffffff));
	}

	tbody td:has(.editor-wrapper)::after {
		display: none;
	}

	/* Checkbox display in navigate mode (read-only visual) */
	.cell-checkbox-display {
		width: 18px;
		height: 18px;
		pointer-events: none;
		accent-color: var(--accent-fill-rest, #0078d4);
	}
</style>
