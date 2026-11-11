<script lang="ts" module>
	import {fluentMenu, fluentMenuItem, fluentDivider} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentMenu(), fluentMenuItem(), fluentDivider())
</script>

<script lang="ts" generics="T">
	import type {Snippet} from "svelte"
	import {tick, onMount, onDestroy} from "svelte"
	import GridCellEditor from "./GridCellEditor.svelte"
	import Icon from "./Icon.svelte"
	import PositioningRegion from "./PositioningRegion.svelte"
	import {resolveMenuEntries, runAction, type ActionEventDetail, type ActionItem, type MenuDivider, type MenuEntry, type ResolvedActionItem} from "../action-items/index.js"

	type EditorType = "text" | "number" | "checkbox" | "select" | "combobox" | "date" | "autocomplete" | "custom"
	type EditTrigger = "click" | "dblclick" | "button" | "always" | "navigate"
	type OptionsLoadTrigger = "immediate" | "edit-start" | "dropdown-open"
	type DateOutputFormat = "date" | "iso" | "timestamp"

	type EditorOption = {
		value: string | number | boolean
		label: string
		[key: string]: unknown  // Allow extra properties
	}

	type EditorOptions = {
		// === SHARED (select/autocomplete) ===
		options?: EditorOption[]
		/** Loads the options for this row. `signal` aborts when a newer load for the column starts or the grid unmounts. */
		loadOptionsCallback?: (ctx: {row: T; column: Column<T>; signal: AbortSignal}) => Promise<EditorOption[]>
		optionsLoadTrigger?: OptionsLoadTrigger  // Default: "edit-start"
		valueMember?: string    // Property to use as value (default: "value")
		displayMember?: string  // Property to use as display (default: "label")
		allowEmpty?: boolean    // Allow null/empty selection
		emptyLabel?: string     // Label for empty option (default: "-- Select --")

		// === TEXT ===
		maxLength?: number
		placeholder?: string
		pattern?: string
		inputMode?: "text" | "numeric" | "email" | "tel" | "url"

		// === NUMBER ===
		min?: number
		max?: number
		step?: number
		decimalPlaces?: number
		allowNegative?: boolean

		// === CHECKBOX ===
		trueValue?: unknown     // Value to store when checked (default: true)
		falseValue?: unknown    // Value to store when unchecked (default: false)

		// === DATE ===
		minDate?: Date | string
		maxDate?: Date | string
		outputFormat?: DateOutputFormat  // What to store: Date object, ISO string, or timestamp

		// === AUTOCOMPLETE ===
		initialOptions?: EditorOption[]  // Show before search (popular items)
		/** Server-side search for the autocomplete editor. */
		searchCallback?: (ctx: {term: string; row: T; column: Column<T>; signal?: AbortSignal}) => Promise<EditorOption[]>
		minSearchLength?: number         // Min chars before search (default: 1)
		debounceMs?: number              // Debounce search calls (default: 300)
		multiple?: boolean               // Allow multiple selections
		maxSelections?: number           // Max items when multiple=true
	}

	type CustomEditorContext<T> = {
		value: any
		row: T
		rowIndex: number
		field: string
		column: Column<T>
		commit: (newValue: any) => void
		cancel: () => void
	}

	// Validation types
	type CellValidationState = {
		rowKey: string
		field: string
		error: string
	}

	type ValidationResult = {
		valid: boolean
		message?: string
		transformedValue?: unknown
	}

	type BeforeCommitContext<T> = {
		value: unknown
		oldValue: unknown
		row: T
		rowIndex: number
		field: string
		column: Column<T>
	}

	// beforeCommitCallback can return:
	// - ValidationResult object
	// - boolean (true = valid, false = invalid with no message)
	// - string (error message = invalid)
	// - null/undefined (valid)
	type BeforeCommitResult = ValidationResult | boolean | string | null | undefined

	type Column<T> = {
		field: keyof T | string
		title: string
		headerInfo?: string  // Info tooltip shown next to header title (displays ⓘ icon)
		sortable?: boolean
		filterable?: boolean
		/** Explicit column width. Accepts any CSS length (px, %, rem, ch, etc.). Ignored when `autoWidth` is true. */
		width?: string
		/** CSS min-width for the column. */
		minWidth?: string
		/** CSS max-width for the column. */
		maxWidth?: string
		/** When true, the column sizes to its header content and does not stretch to fill remaining table width.
		 *  Effectively sets `width: 1%; white-space: nowrap` on the header cell. Works best in combination with
		 *  the grid-level `fillerColumn` prop so the freed-up space is absorbed by a trailing empty column
		 *  instead of redistributing to other columns. */
		autoWidth?: boolean
		/** When true, body cells in this column never wrap (`white-space: nowrap`). Pairs with `maxWidth` to
		 *  truncate long content with an ellipsis. Pairs with `autoWidth` to size the column to the wider of
		 *  the header text and the longest cell value. Without `maxWidth`, very long values will widen the
		 *  column unbounded — set a `maxWidth` if you want a hard cap. */
		nowrap?: boolean
		align?: "start" | "center" | "end"
		/** Formats the cell's value for display. */
		getDisplayValueCallback?: (ctx: {value: any; row: T; column: Column<T>}) => string
		/** Renders the whole cell as an HTML string (takes precedence over getDisplayValueCallback). */
		renderCellCallback?: (ctx: {row: T; column: Column<T>}) => string
		snippet?: Snippet<[T]>
		// Custom filter predicate. When set, replaces the built-in substring match for this
		// column. Called once per row with the raw filter input string and the row.
		// Returns `true` to keep the row, `false` to exclude it, or `null` when the input
		// is syntactically invalid (e.g. user has only typed `>` so far) — `null` causes
		// the filter to be ignored entirely (all rows pass) AND the filter input gets a
		// `.invalid` class so the UI can surface the bad-syntax state. Assumes the
		// validity is a property of the input string, not the row, so the grid only
		// probes the first row to decide validity.
		filterCallback?: (ctx: {term: string; row: T; column: Column<T>}) => boolean | null
		// Editing props
		/** Cells in this column can be edited (when the grid is `editable`). Default `false`. */
		editable?: boolean
		/** Per-row decision (e.g. only leaf rows in a tree); wins over `editable`. */
		getIsEditableCallback?: (ctx: {row: T; column: Column<T>}) => boolean
		editor?: EditorType
		editTrigger?: EditTrigger  // Per-column override
		editorOptions?: EditorOptions
		/** Validates a new value: return an error message, or null when valid. Prefer beforeCommitCallback. */
		validateCallback?: (ctx: {value: any; row: T; column: Column<T>}) => string | null | Promise<string | null>
		/** Validates and optionally transforms a value before it is committed (see BeforeCommitResult). */
		beforeCommitCallback?: (ctx: BeforeCommitContext<T>) => BeforeCommitResult | Promise<BeforeCommitResult>
		/** Custom editor (`editor: "custom"`): open your own UI, then call `ctx.commit(value)` or `ctx.cancel()`. */
		editCallback?: (ctx: CustomEditorContext<T>) => void
		// Show edit button in cell
		showEditButton?: boolean
		/** Tree mode: render this column with indent + expand/collapse chevron (never editable). */
		tree?: boolean
	}

	type RowChangeDetail<T> = {
		row: T                    // Original row (unchanged)
		draftRow: T              // Draft row with user's changes (including invalid)
		rowIndex: number
		field: string
		oldValue: any
		newValue: any
		isValid: boolean
		validationError?: string | null
	}

	// Row toolbar — action items (see lib/action-items). Built-ins are presets (icon,
	// text, danger styling); what they *do* is up to you, in `onAction` / `onClick`.
	type RowToolbarAction = 'add' | 'delete' | 'duplicate' | 'move-up' | 'move-down'

	type RowContext<T> = {
		row: T
		rowIndex: number
	}

	type RowToolbarItem<T> = ActionItem<RowContext<T>, RowToolbarAction> & {
		/** Toolbar line, 1 = closest to the grid row (default). Higher lines stack above. */
		toolbarRow?: number
		/** Show `text` next to the icon; otherwise it is the tooltip / accessible name only. */
		isTextVisible?: boolean
	}

	// Shorthand: a built-in name, a full item, or a `{divider: true}` separator.
	type RowToolbarConfig<T> = RowToolbarAction | RowToolbarItem<T> | MenuDivider

	// Context menu types
	type ContextMenuContext<T> = {
		row: T
		rowIndex: number
		columnIndex: number
		column: Column<T>
		cellValue: unknown
	}

	// Built-in context-menu actions (they do the work themselves, and only show in tree mode
	// where relevant). `expand-all` / `collapse-all` act on the right-clicked row's branch;
	// `expand-tree` / `collapse-tree` on the entire dataset.
	type ContextMenuAction = 'expand-all' | 'collapse-all' | 'expand-tree' | 'collapse-tree'

	// Shorthand: a built-in name, or a full MenuEntry (item or divider).
	type ContextMenuConfig<T> = ContextMenuAction | MenuEntry<ContextMenuContext<T>, ContextMenuAction>

	/** What `onAction` / `beforeActionCallback` receive — the row (and, from the context menu, the cell). */
	type QuickGridActionDetail<T> = ActionEventDetail<RowContext<T> & Partial<Omit<ContextMenuContext<T>, "row" | "rowIndex">>>

	type Props<T> = {
		items: T[]
		columns: Column<T>[]
		sortable?: boolean
		filterable?: boolean
		pageable?: boolean
		pageSize?: number
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
		cellTemplate?: Snippet
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
		// Stable row identity — keys internal state (drafts, edits) so they survive
		// re-orderings (pagination, filter, tree expand/collapse). When omitted, the grid
		// falls back to treePathMember in tree mode, then to the displayed-row index, and
		// console.warns once if neither stable key is available while editing is enabled.
		idMember?: keyof T
		// Tree mode (ltree-style path hierarchy)
		treePathMember?: keyof T              // Required to enable tree mode — field holding the path string ("1.2.3", "/1/2/3", "C:\\foo\\bar")
		treeLevelMember?: keyof T             // Optional — pre-computed depth (0-based). Falls back to deriving from path.
		treeParentMember?: keyof T            // Optional — pre-computed parent path. Falls back to deriving from path.
		treeSeparator?: string                // Path separator. Auto-detected from first row if omitted.
		treeDataSorted?: boolean              // True when caller already sorted items so parents precede children. Default false → grid sorts internally.
		expandedPaths?: Set<string>           // Bindable set of expanded path strings. Default: managed internally.
		defaultExpandDepth?: number           // Initial expansion depth when expandedPaths not bound. Omit to expand all.
		treeDoubleClickBehavior?: "none" | "toggle"  // "toggle": double-clicking the tree column toggles expand/collapse on rows with children. Default "none".
		// Filter mode. When set, internal client-side filtering is bypassed and the caller
		// owns the filtered dataset (typical for server-side search). Filter inputs still
		// render and fire this callback with a copy of the current `{field: value}` map on
		// every keystroke — debounce + post to your backend, then update `items`.
		onFiltersChange?: (ctx: {filters: Record<string, string>}) => void
		// Events
		/** Fires after every committed cell edit (valid or not — see `isValid`). */
		onRowChange?: (ctx: RowChangeDetail<T>) => void
		/** Fires when a cell enters edit mode. */
		onEditStart?: (ctx: {row: T; rowIndex: number; field: string; column: Column<T>}) => void
		/** Fires when a cell edit is cancelled. */
		onEditCancel?: (ctx: {row: T; rowIndex: number; field: string; column: Column<T> | undefined}) => void
		/** Fires when a committed value fails validation. */
		onValidationError?: (ctx: {row: T; rowIndex: number; field: string; column: Column<T>; error: string}) => void
		/** Fires after a row-toolbar or context-menu item ran (`source` says which). */
		onAction?: (detail: QuickGridActionDetail<T>) => void
		/** Called before a row-toolbar or context-menu item runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: QuickGridActionDetail<T>) => unknown
	}

	let {
		items = [],
		columns = [],
		sortable = false,
		filterable = false,
		pageable = false,
		pageSize = 10,
		striped = true,
		hoverable = true,
		fillerColumn = false,
		columnMinWidth = undefined,
		class: className = "",
		style = "",
		cellTemplate = undefined,
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
		expandedPaths = $bindable(undefined),
		defaultExpandDepth = undefined,
		treeDoubleClickBehavior = "none",
		// Filter delegation
		onFiltersChange = undefined,
		// Callbacks
		onRowChange = undefined,
		onEditStart = undefined,
		onEditCancel = undefined,
		onValidationError = undefined,
		onAction = undefined,
		beforeActionCallback = undefined
	}: Props<T> = $props()

	const resolvedShowToolbar = $derived(showRowToolbar)
	const resolvedToolbarConfig = $derived(rowToolbar ?? (['add', 'delete', 'duplicate'] as RowToolbarConfig<T>[]))
	const actionHost = {}

	// Build inline style for a column header cell. Covers `autoWidth` (shrink-to-content trick),
	// explicit `width`, `minWidth` / `maxWidth`, and optional text-align. Returns empty string when
	// no width-related props and `includeAlign` is false so we don't emit a stray `style=""`.
	function getColumnHeaderStyle(column: Column<T>, includeAlign: boolean): string {
		const parts: string[] = []
		if (column.autoWidth) {
			// `width: 1%` + `white-space: nowrap` is the canonical HTML-table trick for sizing a
			// column to its content. Browser treats the 1% as a lower bound and the nowrap forces
			// the intrinsic min-width to be the header's no-wrap width, which wins.
			parts.push("width: 1%", "white-space: nowrap")
		} else {
			if (column.width) parts.push(`width: ${column.width}`)
			// Mirror body nowrap onto the header so a body-nowrap column doesn't end up with a
			// wrapping header sitting above single-line cells (visually inconsistent).
			if (column.nowrap) parts.push("white-space: nowrap")
		}
		// Per-column minWidth wins; otherwise fall back to the grid-level default. Skip both
		// when the column opted into autoWidth — that mode is supposed to shrink to content
		// and a min-width would break the trick.
		if (column.minWidth) parts.push(`min-width: ${column.minWidth}`)
		else if (columnMinWidth && !column.autoWidth) parts.push(`min-width: ${columnMinWidth}`)
		if (column.maxWidth) parts.push(`max-width: ${column.maxWidth}`)
		if (includeAlign) parts.push(`text-align: ${column.align || "start"}`)
		return parts.join("; ")
	}

	// Build inline style for a body cell. Mirrors the column's width constraints onto every
	// `<td>` so the column's max-width / min-width are enforced consistently — without this,
	// only the header carried the constraints, and in HTML auto table-layout a wide body cell
	// would drag the column past the header's max-width (and the ellipsis on a `nowrap` cell
	// could never trigger).
	function getColumnBodyStyle(column: Column<T>): string {
		const parts: string[] = [`text-align: ${column.align || "start"}`]
		if (column.autoWidth) {
			parts.push("width: 1%", "white-space: nowrap")
		} else {
			if (column.width) parts.push(`width: ${column.width}`)
			if (column.nowrap) parts.push("white-space: nowrap", "overflow: hidden", "text-overflow: ellipsis")
		}
		if (column.minWidth) parts.push(`min-width: ${column.minWidth}`)
		else if (columnMinWidth && !column.autoWidth) parts.push(`min-width: ${columnMinWidth}`)
		if (column.maxWidth) parts.push(`max-width: ${column.maxWidth}`)
		return parts.join("; ")
	}

	// Sorting state
	let sortColumn = $state<string | null>(null)
	let sortDirection = $state<"asc" | "desc">("asc")

	// Filtering state
	let filters = $state<Record<string, string>>({})

	// Pagination state
	let currentPage = $state(1)

	// Editing state
	let editingCell = $state<{ rowIndex: number; field: string; initialSearchQuery?: string } | null>(null)
	let currentCellError = $state<string | null>(null)  // Error for currently editing cell
	let isValidating = $state(false)

	// Draft rows - clones of rows being edited (preserves dirty values including invalid ones).
	// Keyed by stable row id (idMember → treePathMember → displayed index fallback) so drafts
	// survive pagination / filter / tree expand-collapse re-orderings.
	let draftRows = $state<Map<string, T>>(new Map())

	// Returns a stable key for a row. Coalesces idMember → treePathMember → displayed index.
	// The index fallback is lossy (drifts on re-order) and triggers a one-shot console warning
	// via the effect below when editing is enabled without a real stable id.
	function getRowId(item: T, displayedIndex: number): string {
		if (idMember !== undefined) {
			const v = item[idMember]
			if (v !== undefined && v !== null) return String(v)
		}
		if (treePathMember !== undefined) {
			const v = item[treePathMember]
			if (v !== undefined && v !== null) return String(v)
		}
		return String(displayedIndex)
	}

	let idWarningEmitted = $state(false)
	$effect(() => {
		if (idWarningEmitted) return
		if (!editable) return
		if (idMember !== undefined || treePathMember !== undefined) return
		// eslint-disable-next-line no-console
		console.warn(
			"[QuickGrid] No `idMember` was provided while `editable` is enabled. Row state " +
			"(drafts, in-progress edits) will be keyed by displayed-row index, which means " +
			"pagination, filtering, sorting, or tree expand/collapse can shift the displayed " +
			"order and cause an in-flight edit to land on the wrong row. Pass `idMember=\"id\"` " +
			"(or any field that uniquely identifies a row) to fix this. In tree mode, " +
			"`treePathMember` is also accepted as a fallback identity."
		)
		idWarningEmitted = true
	})

	// Navigation mode state (for "navigate" editTrigger)
	let focusedCell = $state<{ rowIndex: number; colIndex: number } | null>(null)
	let isNavigateMode = $derived(editTrigger === "navigate" || columns.some(c => c.editTrigger === "navigate"))
	let tableElement: HTMLTableElement | undefined = $state()
	let isCommittingFromKeyboard = $state(false)
	let skipNextDropdownAutoEdit = $state(false)  // Prevents dropdown from reopening after selection

	// Row action button state (floating + button between rows)
	let hoveredRowIndex = $state<number | null>(null)
	let hoveredRowElement = $state<HTMLElement | null>(null)
	let hoveredRowItem = $state<T | null>(null)  // Track row data, not just index
	let rowActionButtonHovered = $state(false)
	let rowActionHideTimeout: ReturnType<typeof setTimeout> | null = null
	let containerRef: HTMLDivElement | undefined = $state()
	let popupElement: HTMLDivElement | undefined = $state()
	let connectorPath = $state<string | null>(null)
	let connectorArrowPos = $state<{ x: number; y: number } | null>(null)
	let connectorArrowDir = $state<'right' | 'left' | 'down'>('right')
	let popupPosition = $state<'left' | 'right' | 'top'>('left')
	let hasRowMoved = $state(false)  // Track if row has moved from original position
	let isTouchDevice = $state(false)

	// Context menu state
	let contextMenuVisible = $state(false)
	let contextMenuPosition = $state({ x: 0, y: 0 })
	let contextMenuContext = $state<ContextMenuContext<T> | null>(null)
	let contextMenuElement: HTMLDivElement | undefined = $state()

	// Dynamic options cache (for "immediate" load trigger)
	let dynamicOptionsCache = $state<Record<string, EditorOption[]>>({})
	let loadingOptions = $state<Record<string, boolean>>({})

	// Load options with "immediate" trigger on mount
	$effect(() => {
		columns.forEach(column => {
			const field = String(column.field)
			if (
				column.editorOptions?.loadOptionsCallback &&
				column.editorOptions?.optionsLoadTrigger === "immediate" &&
				!dynamicOptionsCache[field]
			) {
				loadOptionsForColumn(column, items[0], field)
			}
		})
	})

	// ============ Tree mode helpers ============
	let isTreeMode = $derived(treePathMember !== undefined)
	let internalExpandedPaths = $state(new Set<string>())
	let treeInitialized = $state(false)

	let resolvedTreeSeparator = $derived.by(() => {
		if (treeSeparator) return treeSeparator
		if (!isTreeMode) return "/"
		// Scan items until we find a path that contains a recognizable separator —
		// inspecting only items[0] would miss the case where the root is "1" and the
		// first path that actually contains a separator is "1.1" (the second row).
		for (const item of items) {
			const p = String(item[treePathMember as keyof T] ?? "")
			if (p.includes("/")) return "/"
			if (p.includes("\\")) return "\\"
			if (p.includes(".")) return "."
		}
		return "/"
	})

	function getRowPath(item: T): string {
		if (!treePathMember) return ""
		const raw = String(item[treePathMember] ?? "")
		// Strip trailing separator so "C:\foo\" and "C:\foo" behave the same
		const sep = resolvedTreeSeparator
		return raw.endsWith(sep) ? raw.slice(0, -sep.length) : raw
	}

	function getRowLevel(item: T): number {
		if (treeLevelMember) {
			const v = item[treeLevelMember]
			const n = Number(v)
			return Number.isFinite(n) ? n : 0
		}
		const path = getRowPath(item)
		if (!path) return 0
		const sep = resolvedTreeSeparator
		return path.split(sep).filter(Boolean).length - 1
	}

	function getRowParentPath(item: T): string {
		if (treeParentMember) {
			const raw = String(item[treeParentMember] ?? "")
			const sep = resolvedTreeSeparator
			return raw.endsWith(sep) ? raw.slice(0, -sep.length) : raw
		}
		const path = getRowPath(item)
		if (!path) return ""
		const sep = resolvedTreeSeparator
		const idx = path.lastIndexOf(sep)
		return idx >= 0 ? path.slice(0, idx) : ""
	}

	// Path-aware comparison: numeric segments compare numerically (so "1.2" < "1.10")
	function compareTreePaths(a: string, b: string): number {
		const sep = resolvedTreeSeparator
		const aSegs = a.split(sep).filter(Boolean)
		const bSegs = b.split(sep).filter(Boolean)
		const min = Math.min(aSegs.length, bSegs.length)
		for (let i = 0; i < min; i++) {
			const aSeg = aSegs[i]
			const bSeg = bSegs[i]
			const aNum = Number(aSeg)
			const bNum = Number(bSeg)
			if (!isNaN(aNum) && !isNaN(bNum) && aSeg !== "" && bSeg !== "") {
				if (aNum !== bNum) return aNum - bNum
			} else if (aSeg !== bSeg) {
				return aSeg.localeCompare(bSeg)
			}
		}
		return aSegs.length - bSegs.length
	}

	// Set of every path that exists as an actual row (used to distinguish "real" ancestors
	// from virtual roots — e.g. "C:" when only "C:\\Windows" and below are in the dataset).
	let treePathSet = $derived.by(() => {
		const result = new Set<string>()
		if (!isTreeMode) return result
		for (const item of items) result.add(getRowPath(item))
		return result
	})

	// Set of paths that have at least one child in the dataset
	let treeParentPathSet = $derived.by(() => {
		const result = new Set<string>()
		if (!isTreeMode) return result
		for (const item of items) {
			const parent = getRowParentPath(item)
			if (parent) result.add(parent)
		}
		return result
	})

	function rowHasChildren(item: T): boolean {
		return treeParentPathSet.has(getRowPath(item))
	}

	let resolvedExpandedPaths = $derived(expandedPaths ?? internalExpandedPaths)

	function isPathExpanded(path: string): boolean {
		return resolvedExpandedPaths.has(path)
	}

	function toggleExpand(path: string) {
		if (expandedPaths !== undefined) {
			const next = new Set(expandedPaths)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			expandedPaths = next
		} else {
			const next = new Set(internalExpandedPaths)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			internalExpandedPaths = next
		}
	}

	// Replace the entire expanded-paths set, respecting the bound vs internal split that
	// `toggleExpand` uses. Centralized so every bulk mutation (expand-all, collapse-all,
	// subtree variants) goes through one code path.
	function setExpandedPaths(next: Set<string>) {
		if (expandedPaths !== undefined) expandedPaths = next
		else internalExpandedPaths = next
	}

	// Walk ancestors of `path` until we find one that is currently expanded; returns its
	// path. Used by Ctrl+ArrowLeft to collapse the nearest expanded ancestor when the
	// focused row is a leaf or an already-collapsed parent. Returns null when the row
	// has no expanded ancestor (already at a root visible level).
	function findNearestExpandedAncestor(path: string): string | null {
		const sep = resolvedTreeSeparator
		const idx = path.lastIndexOf(sep)
		let parent = idx >= 0 ? path.slice(0, idx) : ""
		while (parent) {
			if (resolvedExpandedPaths.has(parent)) return parent
			const i = parent.lastIndexOf(sep)
			parent = i >= 0 ? parent.slice(0, i) : ""
		}
		return null
	}

	// Initialize internal expansion when items first arrive (only if no external binding).
	// `defaultExpandDepth` is interpreted relative to the shallowest level present in the
	// dataset, not absolute level 0 — so a partial tree where the shallowest row is level 3
	// still gets its own "roots" expanded.
	$effect(() => {
		if (!isTreeMode) return
		if (expandedPaths !== undefined) return
		if (treeInitialized) return
		if (items.length === 0) return
		let minLevel = Infinity
		for (const item of items) minLevel = Math.min(minLevel, getRowLevel(item))
		if (!Number.isFinite(minLevel)) minLevel = 0
		const next = new Set<string>()
		for (const item of items) {
			const level = getRowLevel(item) - minLevel
			if (defaultExpandDepth === undefined || level < defaultExpandDepth) {
				next.add(getRowPath(item))
			}
		}
		internalExpandedPaths = next
		treeInitialized = true
	})

	// ============ Display chain ============

	// Tree-ordered: caller-sorted, or sorted internally by path
	let treeOrderedItems = $derived.by(() => {
		if (!isTreeMode) return items
		if (treeDataSorted) return items
		return [...items].sort((a, b) => compareTreePaths(getRowPath(a), getRowPath(b)))
	})

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

	// Computed: filtered items (tree-aware: includes ancestors of matches).
	// When `onFiltersChange` is provided the caller owns filtering — we render the inputs
	// and fire the callback, but skip internal filtering entirely (server-side mode).
	let filteredItems = $derived.by(() => {
		if (onFiltersChange) return treeOrderedItems
		if (!filterable || Object.keys(filters).length === 0) return treeOrderedItems

		const matchesFilter = (item: T) =>
			Object.entries(filters).every(([field, filterValue]) => {
				if (!filterValue) return true
				// Per-column custom predicate wins over the built-in substring match.
				const col = columns.find((c) => String(c.field) === field)
				if (col?.filterCallback) {
					const result = col.filterCallback({term: filterValue, row: item, column: col})
					// null = invalid input → don't filter, treat row as a match.
					return result === null ? true : result
				}
				const cellValue = String(item[field as keyof T] ?? "").toLowerCase()
				return cellValue.includes(filterValue.toLowerCase())
			})

		if (!isTreeMode) return treeOrderedItems.filter(matchesFilter)

		// Tree mode: include matched rows + all their ancestors so the hierarchy reads correctly
		const matchedPaths = new Set<string>()
		for (const item of treeOrderedItems) {
			if (matchesFilter(item)) matchedPaths.add(getRowPath(item))
		}
		const includePaths = new Set(matchedPaths)
		const sep = resolvedTreeSeparator
		for (const path of matchedPaths) {
			let parent = path
			const idx0 = parent.lastIndexOf(sep)
			parent = idx0 >= 0 ? parent.slice(0, idx0) : ""
			while (parent) {
				includePaths.add(parent)
				const idx = parent.lastIndexOf(sep)
				parent = idx >= 0 ? parent.slice(0, idx) : ""
			}
		}
		return treeOrderedItems.filter((i) => includePaths.has(getRowPath(i)))
	})

	// Computed: sorted items. Tree mode preserves hierarchy and ignores column sort.
	let sortedItems = $derived.by(() => {
		if (isTreeMode) return filteredItems
		if (!sortColumn) return filteredItems

		return [...filteredItems].sort((a, b) => {
			const aVal = a[sortColumn as keyof T]
			const bVal = b[sortColumn as keyof T]

			if (aVal === bVal) return 0

			let comparison = 0
			if (typeof aVal === "string" && typeof bVal === "string") {
				comparison = aVal.localeCompare(bVal)
			} else if (typeof aVal === "number" && typeof bVal === "number") {
				comparison = aVal - bVal
			} else {
				comparison = String(aVal).localeCompare(String(bVal))
			}

			return sortDirection === "asc" ? comparison : -comparison
		})
	})

	// Computed: visible items — hide descendants of collapsed nodes (tree only).
	// When a filter is active, ancestors are already auto-included above and we render the
	// full filtered set so users can see matches inside otherwise-collapsed branches.
	// Ancestors that aren't actually present as rows in the dataset are treated as virtual
	// roots and never gate visibility (supports partial-tree / subtree views).
	let visibleItems = $derived.by(() => {
		if (!isTreeMode) return sortedItems
		const filterActive = filterable && Object.values(filters).some((v) => !!v)
		if (filterActive) return sortedItems
		const sep = resolvedTreeSeparator
		return sortedItems.filter((item) => {
			let parent = getRowParentPath(item)
			while (parent) {
				if (treePathSet.has(parent) && !resolvedExpandedPaths.has(parent)) return false
				const idx = parent.lastIndexOf(sep)
				parent = idx >= 0 ? parent.slice(0, idx) : ""
			}
			return true
		})
	})

	// Computed: paginated items
	let paginatedItems = $derived.by(() => {
		if (!pageable) return visibleItems

		const start = (currentPage - 1) * pageSize
		const end = start + pageSize
		return visibleItems.slice(start, end)
	})

	// Computed: total pages
	let totalPages = $derived(Math.ceil(visibleItems.length / pageSize))

	// Display items (final result)
	let displayItems = $derived(paginatedItems)

	function handleSort(column: Column<T>) {
		if (!sortable || !column.sortable) return

		const field = String(column.field)
		if (sortColumn === field) {
			sortDirection = sortDirection === "asc" ? "desc" : "asc"
		} else {
			sortColumn = field
			sortDirection = "asc"
		}
	}

	function handleFilter(field: string, value: string) {
		filters[field] = value
		currentPage = 1 // Reset to first page when filtering
		// Pass a shallow copy so callers can't mutate our internal state.
		onFiltersChange?.({filters: {...filters}})
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page
		}
	}

	// Get raw value for a cell (checks draft row first, then original)
	function getCellRawValue(item: T, rowIndex: number, field: string): unknown {
		const draftRow = draftRows.get(getRowId(item, rowIndex))
		if (draftRow) {
			return draftRow[field as keyof T]
		}
		return item[field as keyof T]
	}

	function getCellValue(item: T, column: Column<T>, rowIndex?: number): string {
		if (column.renderCellCallback) {
			return column.renderCellCallback({row: item, column})
		}
		// Use draft value if available
		const value = rowIndex !== undefined
			? getCellRawValue(item, rowIndex, String(column.field))
			: item[column.field as keyof T]
		if (column.getDisplayValueCallback) {
			return column.getDisplayValueCallback({value, row: item, column})
		}
		return String(value ?? "")
	}

	function hasTemplate(column: Column<T>): boolean {
		return !!column.renderCellCallback
	}

	function hasSnippet(column: Column<T>): boolean {
		return !!column.snippet
	}

	// Dynamic options loading
	// One in-flight load per column; a newer load (or unmount) aborts the previous one.
	const optionLoads = new Map<string, AbortController>()
	$effect(() => () => {
		for (const controller of optionLoads.values()) controller.abort()
	})

	async function loadOptionsForColumn(column: Column<T>, row: T, field: string): Promise<EditorOption[]> {
		if (!column.editorOptions?.loadOptionsCallback) return column.editorOptions?.options || []

		const cacheKey = field
		optionLoads.get(cacheKey)?.abort()
		const controller = new AbortController()
		optionLoads.set(cacheKey, controller)
		loadingOptions[cacheKey] = true

		try {
			const options = await column.editorOptions.loadOptionsCallback({row, column, signal: controller.signal})
			if (controller.signal.aborted) return []
			dynamicOptionsCache[cacheKey] = options
			return options
		} catch (error) {
			if (!controller.signal.aborted) console.error(`Failed to load options for ${field}:`, error)
			return []
		} finally {
			if (optionLoads.get(cacheKey) === controller) {
				optionLoads.delete(cacheKey)
				loadingOptions[cacheKey] = false
			}
		}
	}

	function getOptionsForColumn(column: Column<T>): EditorOption[] {
		const field = String(column.field)
		// Return cached dynamic options if available
		if (dynamicOptionsCache[field]) {
			return dynamicOptionsCache[field]
		}
		// Otherwise return static options
		return column.editorOptions?.options || []
	}

	// Build editor options for GridCellEditor, wrapping callbacks with row context
	function getEditorOptionsForCell(column: Column<T>, row: T): Record<string, unknown> {
		const baseOptions: Record<string, unknown> = {
			...column.editorOptions,
			options: getOptionsForColumn(column)
		}

		// Adapt the public callbacks to GridCellEditor's internal (positional) ones
		const searchCallback = column.editorOptions?.searchCallback
		if (searchCallback) {
			baseOptions.onSearch = (term: string, signal?: AbortSignal) => searchCallback({term, row, column, signal})
		}
		if (column.editorOptions?.loadOptionsCallback) {
			baseOptions.loadOptions = () => loadOptionsForColumn(column, row, String(column.field))
		}

		return baseOptions
	}

	// Editing functions
	function isEditing(rowIndex: number, field: string): boolean {
		return editingCell?.rowIndex === rowIndex && editingCell?.field === field
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

	async function startEdit(rowIndex: number, field: string, item: T, column: Column<T>, colIndex?: number, initialSearchQuery?: string) {
		const columnField = String(column.field)
		currentCellError = null

		// Clone row if not already cloned (preserves dirty values across edits)
		const rowKey = getRowId(item, rowIndex)
		if (!draftRows.has(rowKey)) {
			draftRows.set(rowKey, { ...item })
		}

		// Handle custom editor
		if (column.editor === "custom" && column.editCallback) {
			const context: CustomEditorContext<T> = {
				value: item[column.field as keyof T],
				row: item,
				rowIndex,
				field: columnField,
				column,
				commit: (newValue: any) => {
					commitEditDirect(rowIndex, column, newValue, item, colIndex)
				},
				cancel: () => {
					editingCell = null
					// Refocus cell on cancel in navigate mode
					if (isNavigateMode && colIndex !== undefined) {
						focusCell(rowIndex, colIndex)
					}
				}
			}
			column.editCallback(context)
			// Mark as editing so we can show visual feedback
			editingCell = { rowIndex, field }
			return
		}

		// Load options if needed ("edit-start" trigger)
		if (
			column.editorOptions?.loadOptionsCallback &&
			(column.editorOptions?.optionsLoadTrigger === "edit-start" || !column.editorOptions?.optionsLoadTrigger)
		) {
			await loadOptionsForColumn(column, item, columnField)
		}

		editingCell = { rowIndex, field, initialSearchQuery }
		onEditStart?.({row: item, rowIndex, field, column})
	}

	function cancelEdit(item: T, rowIndex: number) {
		if (editingCell) {
			const field = editingCell.field
			onEditCancel?.({row: item, rowIndex, field, column: columns.find((c) => String(c.field) === field)})
			editingCell = null
			currentCellError = null
		}
	}

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

	function getCellValidationError(rowKey: string, field: string): string | null {
		const cell = invalidCells.find(c => c.rowKey === rowKey && c.field === field)
		return cell?.error || null
	}

	function isCellInvalid(rowKey: string, field: string): boolean {
		return invalidCells.some(c => c.rowKey === rowKey && c.field === field)
	}

	// ============ Draft Row Management Functions ============
	// External-facing helpers (not currently called from inside the grid). Drafts are now
	// keyed by the same stable id as everything else, so these accept a row key (string).

	function getRowDraft(rowKey: string): T | undefined {
		return draftRows.get(rowKey)
	}

	function hasRowDraft(rowKey: string): boolean {
		return draftRows.has(rowKey)
	}

	function discardRowDraft(rowKey: string): void {
		draftRows.delete(rowKey)
		invalidCells = invalidCells.filter(c => c.rowKey !== rowKey)
	}

	function getDraftRowKeys(): string[] {
		return Array.from(draftRows.keys())
	}

	function discardAllDrafts(): void {
		draftRows.clear()
		invalidCells = []
	}

	// Normalize validation result from various return types
	function normalizeValidationResult(result: BeforeCommitResult, value: unknown): { valid: boolean; message?: string; finalValue: unknown } {
		if (result === null || result === undefined || result === true) {
			return { valid: true, finalValue: value }
		}
		if (result === false) {
			return { valid: false, message: "Validation failed", finalValue: value }
		}
		if (typeof result === "string") {
			return { valid: false, message: result, finalValue: value }
		}
		// ValidationResult object
		return {
			valid: result.valid,
			message: result.message,
			finalValue: result.transformedValue !== undefined ? result.transformedValue : value
		}
	}

	// Direct commit without validation (used by custom editors that handle their own validation)
	function commitEditDirect(rowIndex: number, column: Column<T>, newValue: any, item: T, colIndex?: number) {
		const field = String(column.field)
		const oldValue = item[column.field as keyof T]

		// Update draft row
		const rowKey = getRowId(item, rowIndex)
		const draftRow = draftRows.get(rowKey)
		if (draftRow) {
			;(draftRow as any)[field] = newValue
		}

		// Remove from invalid cells if it was invalid
		removeInvalidCell(rowKey, field)

		// Always fire onRowChange with isValid: true
		onRowChange?.({
			row: item,
			draftRow: draftRow || { ...item, [field]: newValue } as T,
			rowIndex,
			field,
			oldValue,
			newValue,
			isValid: true,
			validationError: null
		})

		editingCell = null
		currentCellError = null

		// Refocus cell in navigate mode so arrow key navigation continues to work
		if (isNavigateMode && colIndex !== undefined) {
			focusCell(rowIndex, colIndex)
		}
	}

	async function commitEdit(rowIndex: number, column: Column<T>, newValue: any, item: T, colIndex?: number) {
		const field = String(column.field)
		const oldValue = item[column.field as keyof T]
		let finalValue = newValue
		let validationErrorMsg: string | null = null
		let isValid = true

		isValidating = true

		try {
			// First, run beforeCommitCallback if defined (preferred)
			if (column.beforeCommitCallback) {
				const context: BeforeCommitContext<T> = {
					value: newValue,
					oldValue,
					row: item,
					rowIndex,
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

		isValidating = false

		// Update draft row with the new value (valid or invalid - preserves user input)
		const rowKey = getRowId(item, rowIndex)
		const draftRow = draftRows.get(rowKey)
		if (draftRow) {
			;(draftRow as any)[field] = finalValue
		}

		// Update invalid cells tracking
		if (isValid) {
			removeInvalidCell(rowKey, field)
			currentCellError = null
		} else {
			addInvalidCell(rowKey, field, validationErrorMsg || "Invalid value")
			currentCellError = validationErrorMsg
			onValidationError?.({row: item, rowIndex, field, column, error: validationErrorMsg || "Invalid value"})
		}

		// Always fire onRowChange (with isValid flag)
		// draftRow contains all user changes including invalid ones
		onRowChange?.({
			row: item,
			draftRow: draftRow || { ...item, [field]: finalValue } as T,
			rowIndex,
			field,
			oldValue,
			newValue: finalValue,
			isValid,
			validationError: validationErrorMsg
		})

		// Always exit edit mode (allow navigation even with invalid values)
		editingCell = null

		// For immediate-commit editors in navigate mode, refocus the cell so arrow key navigation continues
		if (isNavigateMode && colIndex !== undefined) {
			const isImmediateCommitEditor = column.editor === "checkbox" || column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete" || column.editor === "date"
			if (isImmediateCommitEditor) {
				// For dropdown editors, prevent auto-reopening when we refocus
				const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
				if (isDropdownEditor) {
					skipNextDropdownAutoEdit = true
				}
				focusCell(rowIndex, colIndex)
			}
		}
	}

	function handleCellClick(e: MouseEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
		if (!isCellEditable(column, item)) return
		const trigger = getColumnEditTrigger(column)
		if (trigger === "click") {
			startEdit(rowIndex, String(column.field), item, column, colIndex)
		}
	}

	function handleCellDblClick(e: MouseEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
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
			startEdit(rowIndex, String(column.field), item, column, colIndex)
		}
	}

	function handleEditButtonClick(e: MouseEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
		e.stopPropagation()
		startEdit(rowIndex, String(column.field), item, column, colIndex)
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

	// Walk in `direction` from (fromRowIndex, fromColEditableIndex) until we find another
	// editable cell. `fromColEditableIndex` is the cursor's index within the *current* row's
	// editable column list — pass -1 for "step into this row from outside" (e.g. forward
	// arrival on a fresh row should land on the first editable col).
	//
	// In heterogeneous trees only some rows have editable columns at all (e.g. team rows
	// have zero, employees have two), so the next row's editable layout can differ from
	// the current row's. We re-compute editable columns per row and skip rows that have
	// none — otherwise Tab from the last employee before a team row falls on a `<td>` that
	// has no `tabindex` and focus drops to body. Returns null when no further cell exists
	// in that direction (caller can let Tab bubble out of the grid normally).
	function findNextEditableCell(
		fromRowIndex: number,
		fromColEditableIndex: number,
		direction: 1 | -1
	): { rowIndex: number; colIndex: number } | null {
		const items = displayItems
		const currentRow = items[fromRowIndex]
		if (currentRow !== undefined) {
			const currentCols = getEditableColumns(currentRow)
			const next = fromColEditableIndex + direction
			if (next >= 0 && next < currentCols.length) {
				return { rowIndex: fromRowIndex, colIndex: currentCols[next].index }
			}
		}
		let r = fromRowIndex + direction
		while (r >= 0 && r < items.length) {
			const cols = getEditableColumns(items[r])
			if (cols.length > 0) {
				const target = direction === 1 ? cols[0] : cols[cols.length - 1]
				return { rowIndex: r, colIndex: target.index }
			}
			r += direction
		}
		return null
	}

	function isCellFocused(rowIndex: number, colIndex: number): boolean {
		return focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === colIndex
	}

	function focusCell(rowIndex: number, colIndex: number) {
		focusedCell = { rowIndex, colIndex }
		// Focus the td element for keyboard events
		requestAnimationFrame(() => {
			const cell = tableElement?.querySelector(`[data-row="${rowIndex}"][data-col="${colIndex}"]`) as HTMLElement
			cell?.focus({ preventScroll: true })
		})
	}

	function handleCellFocus(rowIndex: number, colIndex: number, column: Column<T>, item: T) {
		if (isNavigateMode && !editingCell) {
			focusedCell = { rowIndex, colIndex }

			// Auto-start edit for dropdown editors (select/combobox/autocomplete) when dropdownShowOnFocus is enabled
			if (dropdownShowOnFocus) {
				const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
				if (isDropdownEditor && isCellEditable(column, item)) {
					// Skip auto-edit if we just committed from this dropdown (prevents reopen after selection)
					if (skipNextDropdownAutoEdit) {
						skipNextDropdownAutoEdit = false
						return
					}
					startEdit(rowIndex, String(column.field), item, column, colIndex)
				}
			}
		}
	}

	function handleGridFocusOut(e: FocusEvent) {
		// Clear focusedCell when focus leaves the grid entirely
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!relatedTarget || !tableElement?.contains(relatedTarget)) {
			focusedCell = null
		}
	}

	function handleNavigationKeyDown(e: KeyboardEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
		if (!isNavigateMode || editingCell) return

		const editableCols = getEditableColumns(item)
		const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

		switch (e.key) {
			case "ArrowUp":
				e.preventDefault()
				if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
				break
			case "ArrowDown":
				e.preventDefault()
				if (rowIndex < displayItems.length - 1) focusCell(rowIndex + 1, colIndex)
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
						const ancestor = findNearestExpandedAncestor(path)
						if (ancestor) {
							toggleExpand(ancestor)
							const ancestorRowIndex = displayItems.findIndex(it => getRowPath(it) === ancestor)
							if (ancestorRowIndex >= 0) focusCell(ancestorRowIndex, colIndex)
						}
					}
					break
				}
				if (colIndex > 0) focusCell(rowIndex, colIndex - 1)
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
				if (colIndex < columns.length - 1) focusCell(rowIndex, colIndex + 1)
				break
			case "Tab": {
				e.preventDefault()
				const target = findNextEditableCell(rowIndex, currentEditableIndex, e.shiftKey ? -1 : 1)
				if (target) focusCell(target.rowIndex, target.colIndex)
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
				startEdit(rowIndex, String(column.field), item, column, colIndex)
				break
			case " ":
				// Space toggles checkbox immediately. Same gate as Enter/F2 — read-only
				// cells with a checkbox-editor column shouldn't toggle.
				if (column.editor === "checkbox" && isCellEditable(column, item)) {
					e.preventDefault()
					const newValue = !item[column.field as keyof T]
					commitEditDirect(rowIndex, column, newValue, item, colIndex)
				}
				break
			default:
				// Any printable character starts editing (for text/number/autocomplete/combobox/select fields).
				// Same gate — without it, typing on a read-only cell would open a default-text editor
				// because the `|| !column.editor` branch matches columns with no editor configured at all.
				if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && isCellEditable(column, item)) {
					if (column.editor === "text" || column.editor === "number" || !column.editor) {
						startEdit(rowIndex, String(column.field), item, column, colIndex)
						// Don't prevent default - let the character be typed
					} else if (column.editor === "autocomplete" || column.editor === "combobox" || column.editor === "select") {
						// Pass typed character as initial search query for dropdown types
						e.preventDefault()
						startEdit(rowIndex, String(column.field), item, column, colIndex, e.key)
					}
				}
				break
		}
	}

	async function handleEditorKeyDown(e: KeyboardEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
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

			// Commit current edit first (for text/number inputs)
			const input = e.target as HTMLInputElement
			const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
			if (column.editor === "checkbox") {
				// Checkbox already committed on change, just clear editing state
				editingCell = null
			} else if (isDropdownEditor) {
				// Dropdown editors handle their own commit via selectDropdownOption
				// Just exit edit mode without committing (preserves original value if no selection made)
				editingCell = null
			} else if (input?.value !== undefined) {
				await commitEdit(rowIndex, column, column.editor === "number" ? Number(input.value) : input.value, item)
			}

			isCommittingFromKeyboard = false

			// Walk to the next / previous editable cell, skipping rows that have no editable
			// columns (heterogeneous trees: team rows have zero, employee rows have N).
			const tabTarget = findNextEditableCell(rowIndex, currentEditableIndex, e.shiftKey ? -1 : 1)
			if (!tabTarget) return

			if (isNavigateMode) {
				// Navigate mode: focus the next cell as a focusable td (tabindex=0). User
				// presses Enter / F2 / character to start editing.
				focusCell(tabTarget.rowIndex, tabTarget.colIndex)
			} else {
				// dblclick / click / button: spreadsheet pattern — auto-open the editor on
				// the next editable cell. Cells in these modes don't have tabindex, so
				// `focusCell` would be a no-op; we have to start the next edit directly.
				// Wait one tick so the previous editor unmounts cleanly before the next mounts —
				// otherwise the autofocus on the new editor races the blur on the old one.
				const tabTargetItem = displayItems[tabTarget.rowIndex]
				const tabTargetColumn = columns[tabTarget.colIndex]
				await tick()
				startEdit(tabTarget.rowIndex, String(tabTargetColumn.field), tabTargetItem, tabTargetColumn, tabTarget.colIndex)
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
			cancelEdit(item, rowIndex)
			await tick()
			isCommittingFromKeyboard = false
			focusCell(rowIndex, colIndex)
		} else if (e.key === "Enter") {
			e.preventDefault()
			e.stopPropagation()  // Prevent bubbling to handleNavigationKeyDown
			isCommittingFromKeyboard = true

			const input = e.target as HTMLInputElement
			const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
			if (column.editor === "checkbox") {
				// Checkbox already committed on change, just clear editing state
				editingCell = null
			} else if (isDropdownEditor) {
				// Dropdown editors handle their own commit via selectDropdownOption
				// Just exit edit mode without committing (preserves original value if no selection made)
				editingCell = null
			} else if (input?.value !== undefined) {
				await commitEdit(rowIndex, column, column.editor === "number" ? Number(input.value) : input.value, item)
			}

			isCommittingFromKeyboard = false

			// Move to cell below after Enter (any cell — all are focusable in navigate mode).
			if (rowIndex < displayItems.length - 1) focusCell(rowIndex + 1, colIndex)
			else focusCell(rowIndex, colIndex)
		} else if (e.key === " " && column.editor === "checkbox") {
			// Space toggles checkbox while in edit mode
			e.preventDefault()
			e.stopPropagation()
			const newValue = !item[column.field as keyof T]
			await commitEdit(rowIndex, column, newValue, item, colIndex)
		} else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
			// NOTE: Dropdown editors (select, combobox, autocomplete) handle their own arrow keys
			// when dropdown is OPEN (via stopPropagation). When dropdown is CLOSED, events bubble
			// here for cell navigation, allowing users to navigate away with arrow keys.

			const input = e.target as HTMLInputElement
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

			// Commit current edit first (or just exit for dropdown editors with closed dropdown)
			const isDropdownEditor = column.editor === "select" || column.editor === "combobox" || column.editor === "autocomplete"
			if (column.editor === "checkbox") {
				editingCell = null
			} else if (isDropdownEditor) {
				// For dropdown editors, just exit edit mode (dropdown was closed, no value to commit)
				editingCell = null
			} else if (input?.value !== undefined) {
				await commitEdit(rowIndex, column, column.editor === "number" ? Number(input.value) : input.value, item)
			}

			isCommittingFromKeyboard = false

			// Move to target cell (allow navigation even with invalid values).
			// ArrowUp/Down: any cell (all are focusable in navigate mode).
			// ArrowLeft/Right: stays within the editable column list while editing — user
			// pressed an arrow inside an open editor, so they're explicitly stepping between
			// editable cells, not browsing.
			if (e.key === "ArrowUp") {
				if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
				else focusCell(rowIndex, colIndex)
			} else if (e.key === "ArrowDown") {
				if (rowIndex < displayItems.length - 1) focusCell(rowIndex + 1, colIndex)
				else focusCell(rowIndex, colIndex)
			} else if (e.key === "ArrowLeft" && currentEditableIndex > 0) {
				focusCell(rowIndex, editableCols[currentEditableIndex - 1].index)
			} else if (e.key === "ArrowRight" && currentEditableIndex < editableCols.length - 1) {
				focusCell(rowIndex, editableCols[currentEditableIndex + 1].index)
			} else {
				// Stay in current cell if can't move
				focusCell(rowIndex, colIndex)
			}
		}
	}

	// Row action popup functions
	// Row click handler - toggles popup (for click/button trigger modes or touch devices)
	function handleRowClickForActions(rowIndex: number, event: MouseEvent) {
		// For hover mode, only handle touch devices
		if (toolbarTrigger === 'hover' && !isTouchDevice) return

		// Prevent default to avoid triggering other click handlers
		event.stopPropagation()

		// Toggle popup for this row
		if (hoveredRowIndex === rowIndex) {
			// Clicking same row - hide popup
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
		} else {
			// Show popup for this row
			hoveredRowIndex = rowIndex
			// For button trigger, find the parent row element
			const target = event.currentTarget as HTMLElement
			hoveredRowElement = target.closest('tr') || target
			hoveredRowItem = displayItems[rowIndex]
			hasRowMoved = false
		}
	}

	// Button trigger click handler
	function handleToolbarButtonClick(rowIndex: number, event: MouseEvent) {
		event.stopPropagation()
		handleRowClickForActions(rowIndex, event)
	}

	function handleRowMouseEnter(rowIndex: number, event: MouseEvent) {
		// Only for hover mode and non-touch devices
		if (toolbarTrigger !== 'hover' || isTouchDevice) return

		if (rowActionHideTimeout) {
			clearTimeout(rowActionHideTimeout)
			rowActionHideTimeout = null
		}
		hoveredRowIndex = rowIndex
		hoveredRowElement = event.currentTarget as HTMLElement
		hoveredRowItem = displayItems[rowIndex]  // Store the row data
		hasRowMoved = false  // Reset movement tracking for new row
	}

	function handleRowMouseLeave() {
		// Only for hover mode and non-touch devices
		if (toolbarTrigger !== 'hover' || isTouchDevice) return

		// Delay hiding to allow mouse to reach the popup
		rowActionHideTimeout = setTimeout(() => {
			if (!rowActionButtonHovered) {
				hoveredRowIndex = null
				hoveredRowElement = null
				hoveredRowItem = null
			}
		}, 200)
	}

	function handleRowActionPopupMouseEnter() {
		if (rowActionHideTimeout) {
			clearTimeout(rowActionHideTimeout)
			rowActionHideTimeout = null
		}
		rowActionButtonHovered = true
	}

	function handleRowActionPopupMouseLeave() {
		rowActionButtonHovered = false
		// Start hide timeout when leaving the popup
		rowActionHideTimeout = setTimeout(() => {
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
		}, 150)
	}

	async function handleToolbarItemClick(item: RowToolbarItem<T>, action: string, event: MouseEvent) {
		if (hoveredRowItem === null) return

		// Find current index of the row item (it may have moved)
		const currentIndex = displayItems.findIndex(i => i === hoveredRowItem)
		if (currentIndex === -1) {
			// Row was deleted externally, hide popup
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
			return
		}

		const ran = await runAction({
			host: actionHost,
			detail: {
				row: hoveredRowItem,
				rowIndex: currentIndex,
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
		if (ran && action === 'delete') {
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
		}
		// For other actions (add, duplicate, move), keep popup visible
	}

	// Built-in toolbar presets: icon, text (tooltip), danger styling. Your item fields win.
	const toolbarPresets: Record<RowToolbarAction, Partial<ResolvedActionItem<RowToolbarAction>>> = {
		add: { icon: 'add', text: 'Add row below' },
		delete: { icon: 'delete', text: 'Delete row', isDanger: true },
		duplicate: { icon: 'copy', text: 'Duplicate row' },
		'move-up': { icon: 'arrow_up', text: 'Move row up' },
		'move-down': { icon: 'arrow_down', text: 'Move row down' }
	}

	function toolbarDefaults(item: ActionItem<RowContext<T>, RowToolbarAction>) {
		return item.action && item.action !== 'custom' ? toolbarPresets[item.action] : undefined
	}

	// Split toolbar entries into lines (`toolbarRow`, default 1), furthest line first.
	// A divider belongs to the line of the item before it.
	const toolbarLines = $derived.by(() => {
		const lines = new Map<number, RowToolbarConfig<T>[]>()
		let currentLine = 1
		for (const entry of resolvedToolbarConfig) {
			if (typeof entry !== 'string' && !('divider' in entry && entry.divider)) {
				currentLine = (entry as RowToolbarItem<T>).toolbarRow ?? 1
			} else if (typeof entry === 'string') {
				currentLine = 1
			}
			if (!lines.has(currentLine)) lines.set(currentLine, [])
			lines.get(currentLine)!.push(entry)
		}
		return [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, entries]) => entries)
	})

	// popupPosition is a physical side (decided from the space around the table);
	// PositioningRegion takes logical start/end and flips them for RTL itself.
	const toolbarRegionPosition = $derived.by(() => {
		if (popupPosition === 'top') return 'top' as const
		const rtl = !!hoveredRowElement && getComputedStyle(hoveredRowElement).direction === 'rtl'
		return (popupPosition === 'left') !== rtl ? 'start' as const : 'end' as const
	})

	// Determine popup position based on available space
	// Priority: 1. left, 2. right, 3. top
	$effect(() => {
		if (!tableElement || !hoveredRowElement) return

		const tableRect = tableElement.getBoundingClientRect()
		const viewportWidth = window.innerWidth
		const minSpace = 100  // Minimum space needed for popup

		if (tableRect.left >= minSpace) {
			popupPosition = 'left'
		} else if (viewportWidth - tableRect.right >= minSpace) {
			popupPosition = 'right'
		} else {
			popupPosition = 'top'
		}
	})

	// Calculate bracket-shaped connector path when row has moved from original position
	$effect(() => {
		if (!hoveredRowItem || !hoveredRowElement || !popupElement || !tableElement) {
			connectorPath = null
			connectorArrowPos = null
			return
		}

		// Find current row element for the tracked item
		const currentIndex = displayItems.findIndex(item => item === hoveredRowItem)
		if (currentIndex === -1) {
			connectorPath = null
			connectorArrowPos = null
			return
		}

		const rows = tableElement.querySelectorAll('tbody tr')
		const currentRowEl = rows[currentIndex] as HTMLElement | undefined
		if (!currentRowEl) {
			connectorPath = null
			connectorArrowPos = null
			return
		}

		// Check if row is at its original position (adjacent to popup)
		const isAdjacent = currentRowEl === hoveredRowElement

		// Track if row has ever moved
		if (!isAdjacent) {
			hasRowMoved = true
		}

		// If row has never moved, no connector needed
		if (!hasRowMoved) {
			connectorPath = null
			connectorArrowPos = null
			return
		}

		const popupRect = popupElement.getBoundingClientRect()
		const rowRect = currentRowEl.getBoundingClientRect()
		const tableRect = tableElement.getBoundingClientRect()
		const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'

		// Determine relative position for 'top' popup position
		const popupCenterY = popupRect.top + popupRect.height / 2
		const rowCenterY = rowRect.top + rowRect.height / 2
		const isOverlapping = !(rowRect.bottom < popupRect.top || rowRect.top > popupRect.bottom)

		// For all positions, use a bracket shape that goes to the left side of the table (in LTR)
		// or right side (in RTL), then points at the row
		const cornerX = isRTL ? tableRect.right + 15 : tableRect.left - 15
		const endX = isRTL ? rowRect.right + 8 : rowRect.left - 8
		const endY = rowRect.top + rowRect.height / 2

		if (popupPosition === 'left') {
			// Popup is to the left of the table - connect from right side of popup
			const startX = popupRect.right
			const startY = popupRect.top + popupRect.height / 2
			// Go right a bit, then down/up to row, then right to row edge
			connectorPath = `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`
			connectorArrowPos = { x: endX, y: endY }
			connectorArrowDir = isRTL ? 'left' : 'right'
		} else if (popupPosition === 'right') {
			// Popup is to the right of the table - connect from left side of popup
			const startX = popupRect.left
			const startY = popupRect.top + popupRect.height / 2
			// Go left to corner, then down/up to row, then to row edge
			connectorPath = `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`
			connectorArrowPos = { x: endX, y: endY }
			connectorArrowDir = isRTL ? 'left' : 'right'
		} else {
			// Position: 'top' - popup is above the table
			if (isOverlapping && !isAdjacent) {
				// Overlapping (but not adjacent) - back-loop pointing to itself
				const startY = rowRect.top + rowRect.height * 0.75
				const loopEndY = rowRect.top + rowRect.height * 0.25
				connectorPath = `M ${endX} ${startY} H ${cornerX} V ${loopEndY} H ${endX}`
				connectorArrowPos = { x: endX, y: loopEndY }
				connectorArrowDir = isRTL ? 'left' : 'right'
			} else {
				// Row below or above popup - bracket shape from left (LTR) or right (RTL) side
				const startX = isRTL ? popupRect.right : popupRect.left
				const startY = popupRect.top + popupRect.height / 2
				connectorPath = `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`
				connectorArrowPos = { x: endX, y: endY }
				connectorArrowDir = isRTL ? 'left' : 'right'
			}
		}
	})

	// Touch device detection and click-outside handler
	function handleDocumentClick(event: MouseEvent) {
		if (!isTouchDevice || !resolvedShowToolbar || hoveredRowIndex === null) return

		const target = event.target as HTMLElement
		// Check if click is outside popup and table
		if (!popupElement?.contains(target) && !tableElement?.contains(target)) {
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
		}
	}

	// Hide toolbar on scroll (row may have moved out of view)
	function handleScroll() {
		if (hoveredRowIndex !== null) {
			hoveredRowIndex = null
			hoveredRowElement = null
			hoveredRowItem = null
		}
		// Also close context menu on scroll
		if (contextMenuVisible) {
			closeContextMenu()
		}
	}

	// Context menu handlers
	function handleCellContextMenu(e: MouseEvent, rowIndex: number, colIndex: number, column: Column<T>, item: T) {
		if (!contextMenu || contextMenu.length === 0) return

		const context: ContextMenuContext<T> = {
			row: item,
			rowIndex,
			columnIndex: colIndex,
			column,
			cellValue: item[column.field as keyof T]
		}
		// Nothing visible for this cell (e.g. tree-only built-ins on a flat grid) → native menu.
		if (resolveMenuEntries(contextMenu, context, (item) => contextMenuDefaults(item, context)).length === 0) return

		e.preventDefault()

		contextMenuContext = context
		contextMenuPosition = { x: e.clientX, y: e.clientY }
		contextMenuVisible = true

		onContextMenuOpen?.(context)
	}

	async function handleContextMenuItemClick(item: MenuEntry<ContextMenuContext<T>, ContextMenuAction>, action: string, event: MouseEvent) {
		const ctx = contextMenuContext
		if (!ctx || 'divider' in item) return
		if (item.shouldCloseOnClick !== false) closeContextMenu()
		await runAction({
			host: actionHost,
			detail: {
				...ctx,
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
				return { text: 'Expand all', icon: 'arrow_expand_all', isVisible: isTreeMode && !!ctx && rowHasChildren(ctx.row) }
			case 'collapse-all':
				return { text: 'Collapse all', icon: 'arrow_collapse_all', isVisible: isTreeMode && !!ctx && rowHasChildren(ctx.row) }
			case 'expand-tree':
				return { text: 'Expand entire tree', icon: 'arrow_expand_all', isVisible: isTreeMode && treeParentPathSet.size > 0 }
			case 'collapse-tree':
				return { text: 'Collapse entire tree', icon: 'arrow_collapse_all', isVisible: isTreeMode && resolvedExpandedPaths.size > 0 }
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
				const prefix = root + resolvedTreeSeparator
				const next = new Set(resolvedExpandedPaths)
				for (const it of items) {
					const p = getRowPath(it)
					if ((p === root || p.startsWith(prefix)) && treeParentPathSet.has(p)) next.add(p)
				}
				setExpandedPaths(next)
				break
			}
			case 'collapse-all': {
				const root = getRowPath(ctx.row)
				const prefix = root + resolvedTreeSeparator
				setExpandedPaths(new Set([...resolvedExpandedPaths].filter(p => p !== root && !p.startsWith(prefix))))
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
		contextMenuVisible = false
		contextMenuContext = null
	}

	function handleDocumentClickForContextMenu(event: MouseEvent) {
		if (contextMenuVisible && !contextMenuElement?.contains(event.target as HTMLElement)) {
			closeContextMenu()
		}
	}

	function handleDocumentContextMenuForContextMenu(event: MouseEvent) {
		// Close this context menu if right-click happens outside our table
		if (contextMenuVisible && !tableElement?.contains(event.target as HTMLElement)) {
			closeContextMenu()
		}
	}

	function handleKeyDownForContextMenu(event: KeyboardEvent) {
		if (event.key === 'Escape' && contextMenuVisible) {
			closeContextMenu()
		}
	}

	// Adjust context menu position to keep it within viewport
	$effect(() => {
		if (contextMenuVisible && contextMenuElement) {
			// Use tick to ensure the menu has rendered
			tick().then(() => {
				if (!contextMenuElement) return

				const rect = contextMenuElement.getBoundingClientRect()
				const viewportWidth = window.innerWidth
				const viewportHeight = window.innerHeight

				let { x, y } = contextMenuPosition
				let needsUpdate = false

				// Adjust if going off right edge
				if (x + rect.width > viewportWidth) {
					x = viewportWidth - rect.width - 8
					needsUpdate = true
				}

				// Adjust if going off bottom edge
				if (y + rect.height > viewportHeight) {
					y = viewportHeight - rect.height - 8
					needsUpdate = true
				}

				// Ensure not going off left or top
				if (x < 8) {
					x = 8
					needsUpdate = true
				}
				if (y < 8) {
					y = 8
					needsUpdate = true
				}

				if (needsUpdate) {
					contextMenuPosition = { x, y }
				}
			})
		}
	})

	onMount(() => {
		isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
		document.addEventListener('click', handleDocumentClick)
		document.addEventListener('click', handleDocumentClickForContextMenu)
		document.addEventListener('contextmenu', handleDocumentContextMenuForContextMenu, true)
		document.addEventListener('keydown', handleKeyDownForContextMenu)
		window.addEventListener('scroll', handleScroll, true)  // Use capture to catch all scroll events
	})

	onDestroy(() => {
		document.removeEventListener('click', handleDocumentClick)
		document.removeEventListener('click', handleDocumentClickForContextMenu)
		document.removeEventListener('contextmenu', handleDocumentContextMenuForContextMenu, true)
		document.removeEventListener('keydown', handleKeyDownForContextMenu)
		window.removeEventListener('scroll', handleScroll, true)
		if (rowActionHideTimeout) clearTimeout(rowActionHideTimeout)
	})

	let computedClass = $derived(`quickgrid ${striped ? "striped" : ""} ${hoverable ? "hoverable" : ""} ${editable ? "editable" : ""} ${isNavigateMode ? "navigate-mode" : ""} ${className}`.trim())
</script>

<div bind:this={containerRef} class="quickgrid-container" {style} onfocusout={handleGridFocusOut}>
	<!-- Row toolbar (uses fixed positioning to float outside container) -->
	{#if resolvedShowToolbar && hoveredRowIndex !== null && hoveredRowElement}
		<PositioningRegion anchor={hoveredRowElement} visible={true} position={toolbarRegionPosition} align={toolbarAlign} matchWidth={false} style="width: auto;">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={popupElement}
				class="row-toolbar"
				onmouseenter={handleRowActionPopupMouseEnter}
				onmouseleave={handleRowActionPopupMouseLeave}
			>
				{#if hoveredRowItem !== null}
					{@const rowCtx = {row: hoveredRowItem, rowIndex: displayItems.findIndex(i => i === hoveredRowItem)}}
					{#each toolbarLines as line}
						<div class="row-toolbar-row">
							{#each resolveMenuEntries(line, rowCtx, toolbarDefaults) as entry}
								{#if entry.kind === 'divider'}
									<div class="row-toolbar-divider"></div>
								{:else}
									{@const r = entry.resolved}
									<button
										class="row-toolbar-btn {r.cssClass}"
										class:danger={r.isDanger}
										title={r.tooltip ?? r.text}
										aria-label={r.text}
										aria-pressed={r.isToggle ? r.isToggled : undefined}
										disabled={r.isDisabled}
										onclick={(event) => handleToolbarItemClick(entry.item as RowToolbarItem<T>, r.action, event)}
									>
										{#if typeof r.icon === 'string'}
											<Icon name={r.icon} size={16} />
										{:else if r.icon}
											{@render r.icon()}
										{/if}
										{#if (entry.item as RowToolbarItem<T>).isTextVisible}
											<span class="row-toolbar-label">{r.text}</span>
										{/if}
									</button>
								{/if}
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		</PositioningRegion>
		<!-- L-shaped connector line when row has moved -->
		{#if connectorPath && connectorArrowPos}
			<svg class="row-connector" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: var(--fluent-z-dropdown, 1000);">
				<path
					d={connectorPath}
					stroke="var(--accent-fill-rest, #0078d4)"
					stroke-width="2"
					fill="none"
				/>
				<!-- Arrow head pointing at the row -->
				<polygon
					points={
						connectorArrowDir === 'down' ? '-4,0 4,0 0,8' :
						connectorArrowDir === 'left' ? '0,-4 -8,0 0,4' :
						'0,-4 8,0 0,4'
					}
					fill="var(--accent-fill-rest, #0078d4)"
					transform="translate({connectorArrowPos.x}, {connectorArrowPos.y})"
				/>
			</svg>
		{/if}
	{/if}

	<!-- Context menu -->
	{#if contextMenu && contextMenuVisible && contextMenuContext}
		<div
			bind:this={contextMenuElement}
			class="context-menu"
			style="position: fixed; left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
		>
			<fluent-menu>
				{#each resolveMenuEntries(contextMenu, contextMenuContext, (item) => contextMenuDefaults(item, contextMenuContext)) as entry}
					{#if entry.kind === 'divider'}
						<fluent-divider></fluent-divider>
					{:else}
						{@const r = entry.resolved}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<fluent-menu-item
							{...(r.isDisabled ? { disabled: true } : {})}
							class={[r.isDanger && "danger", r.cssClass].filter(Boolean).join(" ") || null}
							title={r.tooltip ?? null}
							onclick={(event: MouseEvent) => handleContextMenuItemClick(entry.item, r.action, event)}
						>
							{#if typeof r.icon === 'string'}
								<span slot="start"><Icon name={r.icon} size={16} /></span>
							{:else if r.icon}
								<span slot="start">{@render r.icon()}</span>
							{/if}
							{r.text}
						</fluent-menu-item>
					{/if}
				{/each}
			</fluent-menu>
		</div>
	{/if}

	<table bind:this={tableElement} class={computedClass}>
		<thead>
			{#if filterable}
				<tr class="filter-row">
					{#if resolvedShowToolbar && toolbarTrigger === 'button'}
						<th class="actions-column"></th>
					{/if}
					{#each columns as column}
						<th style={getColumnHeaderStyle(column, false)}>
							{#if column.filterable !== false}
								<input
									type="text"
									class="filter-input"
									class:invalid={filterValidity[String(column.field)] === false}
									placeholder="Filter..."
									value={filters[String(column.field)] || ""}
									oninput={(e) => handleFilter(String(column.field), e.currentTarget.value)}
								/>
							{/if}
						</th>
					{/each}
					{#if fillerColumn}
						<th class="filler-column"></th>
					{/if}
				</tr>
			{/if}
			<tr>
				{#if resolvedShowToolbar && toolbarTrigger === 'button'}
					<th class="actions-column"></th>
				{/if}
				{#each columns as column}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<th
						class={`column-header ${column.sortable !== false && sortable ? "sortable" : ""} ${
							sortColumn === String(column.field) ? `sorted sorted-${sortDirection}` : ""
						}`}
						style={getColumnHeaderStyle(column, true)}
						onclick={() => handleSort(column)}
					>
						<div class="column-header-content">
							<span>{column.title}</span>
							{#if column.headerInfo}
								<span class="header-info-icon">
									<Icon name="info" size={16} color="accent" title={column.headerInfo} />
								</span>
							{/if}
							{#if column.sortable !== false && sortable}
								<span class="sort-indicator">
									{#if sortColumn === String(column.field)}
										{sortDirection === "asc" ? "▲" : "▼"}
									{:else}
										<span class="sort-placeholder">⬍</span>
									{/if}
								</span>
							{/if}
						</div>
					</th>
				{/each}
				{#if fillerColumn}
					<th class="filler-column column-header"></th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if displayItems.length === 0}
				<tr>
					<td colspan={columns.length + (resolvedShowToolbar && toolbarTrigger === 'button' ? 1 : 0) + (fillerColumn ? 1 : 0)} class="empty-message">
						No items to display
					</td>
				</tr>
			{:else}
				{#each displayItems as item, rowIndex}
					<tr
						onclick={resolvedShowToolbar && toolbarTrigger === 'click' ? (e) => handleRowClickForActions(rowIndex, e) : undefined}
						onmouseenter={resolvedShowToolbar && toolbarTrigger === 'hover' ? (e) => handleRowMouseEnter(rowIndex, e) : undefined}
						onmouseleave={resolvedShowToolbar && toolbarTrigger === 'hover' ? handleRowMouseLeave : undefined}
					>
						{#if resolvedShowToolbar && toolbarTrigger === 'button'}
							<td class="actions-column">
								<button
									class="toolbar-trigger-btn"
									class:active={hoveredRowIndex === rowIndex}
									onclick={(e) => handleToolbarButtonClick(rowIndex, e)}
									title="Actions"
								>
									⋮
								</button>
							</td>
						{/if}
						{#each columns as column, colIndex}
							{@const cellField = String(column.field)}
							{@const cellRowKey = getRowId(item, rowIndex)}
							{@const cellInvalid = isCellInvalid(cellRowKey, cellField)}
							{@const cellError = getCellValidationError(cellRowKey, cellField)}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
							<td
								data-row={rowIndex}
								data-col={colIndex}
								tabindex={isNavigateMode ? 0 : undefined}
								style={getColumnBodyStyle(column)}
								class={`${isCellEditable(column, item) ? "editable-cell" : ""} ${cellInvalid ? "validation-error" : ""} ${isCellFocused(rowIndex, colIndex) ? "focused" : ""} ${isEditing(rowIndex, cellField) ? "editing" : ""} ${column.nowrap ? "nowrap-cell" : ""}`}
								onclick={(e) => handleCellClick(e, rowIndex, colIndex, column, item)}
								ondblclick={(e) => handleCellDblClick(e, rowIndex, colIndex, column, item)}
								oncontextmenu={(e) => handleCellContextMenu(e, rowIndex, colIndex, column, item)}
								onfocus={() => handleCellFocus(rowIndex, colIndex, column, item)}
								onkeydown={(e) => handleNavigationKeyDown(e, rowIndex, colIndex, column, item)}
								title={cellError || undefined}
							>
								{#snippet cellContent()}
								{#if isEditing(rowIndex, cellField)}
									{#if column.editor === "custom"}
										<!-- Custom editor - handled via callback, show indicator -->
										<span class="custom-editing-indicator">Editing...</span>
									{:else}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											class="editor-wrapper"
											class:validating={isValidating}
											onkeydown={(e) => handleEditorKeyDown(e, rowIndex, colIndex, column, item)}
										>
											<GridCellEditor
												type={getEditorType(column)}
												value={getCellRawValue(item, rowIndex, cellField)}
												options={getEditorOptionsForCell(column, item)}
												initialSearchQuery={editingCell?.initialSearchQuery}
												oncommit={(newValue) => commitEdit(rowIndex, column, newValue, item, colIndex)}
												oncancel={() => cancelEdit(item, rowIndex)}
												skipBlurCommit={isCommittingFromKeyboard}
												skipKeyboardCommit={isNavigateMode}
											/>
											{#if isValidating}
												<span class="validating-indicator">...</span>
											{/if}
										</div>
										{#if currentCellError}
											<div class="validation-error-message">{currentCellError}</div>
										{/if}
									{/if}
								{:else if isCellEditable(column, item) && getColumnEditTrigger(column) === "always"}
									<GridCellEditor
										type={getEditorType(column)}
										value={getCellRawValue(item, rowIndex, cellField)}
										options={getEditorOptionsForCell(column, item)}
										oncommit={(newValue) => commitEdit(rowIndex, column, newValue, item)}
										oncancel={() => {}}
									/>
								{:else}
									<div class="cell-content">
										{#if hasSnippet(column)}
											{@render column.snippet?.(item)}
										{:else if hasTemplate(column)}
											{@html getCellValue(item, column, rowIndex)}
										{:else if isNavigateMode && column.editor === "checkbox"}
											<!-- Checkbox in navigate mode: either always editable or disabled display -->
											{#if checkboxAlwaysEditable}
												<GridCellEditor
													type="checkbox"
													value={getCellRawValue(item, rowIndex, cellField)}
													options={getEditorOptionsForCell(column, item)}
													oncommit={(newValue) => commitEdit(rowIndex, column, newValue, item)}
													oncancel={() => {}}
												/>
											{:else}
												<input
													type="checkbox"
													class="cell-checkbox-display"
													checked={!!getCellRawValue(item, rowIndex, cellField)}
													disabled
													tabindex={-1}
												/>
											{/if}
										{:else}
											<span class="cell-text">{getCellValue(item, column, rowIndex)}</span>
										{/if}
										{#if cellInvalid}
											<span class="cell-error-indicator" title={cellError || "Invalid value"}>⚠</span>
										{/if}
										{#if isCellEditable(column, item) && shouldShowEditButton(column)}
											<button
												class="cell-edit-btn"
												onclick={(e) => handleEditButtonClick(e, rowIndex, colIndex, column, item)}
												title="Edit"
											>
												✎
											</button>
										{/if}
									</div>
								{/if}
								{/snippet}
								{#if isTreeMode && column.tree}
									{@const _path = getRowPath(item)}
									{@const _level = getRowLevel(item)}
									{@const _hasChildren = rowHasChildren(item)}
									{@const _expanded = isPathExpanded(_path)}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="tree-cell"
										style={`padding-inline-start: ${_level * 1.25}rem`}
										onmousedown={(e) => {
											// Suppress the default text-selection extension that the second click of
											// a dblclick triggers — only when we're actually going to handle the
											// dblclick as a tree-toggle. e.detail counts clicks within the dblclick
											// interval, so > 1 == "this is the second+ click of a multi-click".
											if (e.detail > 1 && treeDoubleClickBehavior === "toggle" && _hasChildren) {
												e.preventDefault()
											}
										}}
									>
										{#if _hasChildren}
											<!-- svelte-ignore a11y_consider_explicit_label -->
											<button
												type="button"
												class="tree-chevron"
												class:expanded={_expanded}
												onclick={(e) => { e.stopPropagation(); toggleExpand(_path) }}
												ondblclick={(e) => e.stopPropagation()}
												title={_expanded ? "Collapse" : "Expand"}
											>
												▶
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

	{#if pageable && totalPages > 1}
		<div class="pagination">
			<button
				class="pagination-btn"
				disabled={currentPage === 1}
				onclick={() => goToPage(currentPage - 1)}
			>
				Previous
			</button>

			<div class="pagination-info">
				Page {currentPage} of {totalPages}
				<span class="item-count">
					({sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""})
				</span>
			</div>

			<button
				class="pagination-btn"
				disabled={currentPage === totalPages}
				onclick={() => goToPage(currentPage + 1)}
			>
				Next
			</button>
		</div>
	{/if}
</div>

<style>
	.quickgrid-container {
		position: relative;
		width: 100%;
		overflow-x: auto;
	}

	/* Row toolbar (positioned by PositioningRegion) */
	.row-toolbar {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 0;
		background: var(--neutral-layer-floating, #ffffff);
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.row-toolbar-row {
		display: flex;
		gap: 2px;
		align-items: center;
		/* Match grid row height: vertical padding (design-unit * 2 * 2) + line-height (~21px) */
		height: calc(var(--design-unit, 4) * 4px + 21px);
		padding: 0 4px;
	}

	.row-toolbar-divider {
		width: 1px;
		height: 16px;
		background: var(--neutral-stroke-rest, #d1d1d1);
		margin: 0 2px;
	}

	.row-toolbar-btn {
		min-width: 24px;
		height: 100%;
		border: none;
		border-radius: var(--control-corner-radius, 4px);
		background: transparent;
		color: var(--neutral-foreground-rest, #242424);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-size: 14px;
		font-weight: 500;
		transition: background 0.1s ease;
		padding: 0 4px;
	}

	.row-toolbar-btn:hover {
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
	}

	.row-toolbar-btn:active {
		background: var(--neutral-fill-secondary-active, #e0e0e0);
	}

	.row-toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.row-toolbar-btn:disabled:hover {
		background: transparent;
	}

	.row-toolbar-btn.danger:hover {
		background: var(--error-fill-hover, #fde7e9);
		color: var(--error-foreground, #d13438);
	}

	.row-toolbar-label {
		font-size: 12px;
		white-space: nowrap;
	}

	:global([data-theme="dark"]) .row-toolbar {
		background: var(--neutral-layer-floating, #2b2b2b);
		border-color: var(--neutral-stroke-rest, #5a5a5a);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	:global([data-theme="dark"]) .row-toolbar-divider {
		background: var(--neutral-stroke-rest, #5a5a5a);
	}

	:global([data-theme="dark"]) .row-toolbar-btn {
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) .row-toolbar-btn:hover {
		background: var(--neutral-fill-secondary-hover, #3a3a3a);
	}

	:global([data-theme="dark"]) .row-toolbar-btn.danger:hover {
		background: var(--error-fill-hover, #442726);
		color: var(--error-foreground, #f87c86);
	}

	/* Legacy class aliases for backwards compatibility */
	.row-action-popup { /* alias for .row-toolbar */
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px;
		background: var(--neutral-layer-floating, #ffffff);
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.quickgrid {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		background: var(--neutral-layer-1, #ffffff);
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
	}

	/* Filler column: an empty trailing cell whose sole job is to absorb any leftover
	   horizontal space so preceding columns keep their defined / auto widths instead
	   of stretching. `width: 100%` is the classic absorb-leftover trick in auto
	   table-layout — other columns claim their content/defined widths first and the
	   filler swallows whatever remains, instead of an arbitrary unspecified column
	   ballooning to fill the table. */
	.filler-column {
		width: 100%;
		padding: 0;
		background: transparent;
	}

	.column-header {
		background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #f5f5f5));
		color: var(--neutral-foreground-rest, #242424);
		font-weight: var(--font-weight-semibold, 600);
		padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
		border-bottom: 2px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		text-align: left;
		user-select: none;
		position: relative;
	}

	.column-header.sortable {
		cursor: pointer;
	}

	.column-header.sortable:hover {
		background: var(--fluent-quickgrid-header-hover-bg, var(--neutral-layer-3, #ebebeb));
	}

	.column-header-content {
		display: flex;
		align-items: center;
		gap: 4px;
		justify-content: space-between;
	}

	.sort-indicator {
		font-size: 10px;
		opacity: 0.8;
		min-width: 12px;
		text-align: center;
		color: var(--accent-fill-rest, currentColor);
	}

	.sort-placeholder {
		color: var(--neutral-foreground-rest, currentColor);
		opacity: 0.3;
	}

	.header-info-icon {
		font-size: 12px;
		color: var(--accent-fill-rest, #0078d4);
		cursor: help;
		opacity: 0.7;
		margin-left: 2px;
	}

	.header-info-icon:hover {
		opacity: 1;
	}

	.column-header.sorted {
		background: var(--fluent-quickgrid-header-sorted-bg, var(--neutral-layer-3, #ebebeb));
	}

	.filter-row th {
		padding: calc(var(--design-unit) * 1px) calc(var(--design-unit) * 2px);
		background: var(--neutral-layer-1, #ffffff);
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	.filter-input {
		width: 100%;
		padding: 4px 8px;
		border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		background: var(--neutral-layer-1, #ffffff);
		color: var(--neutral-foreground-rest, #242424);
		font-size: 12px;
		box-sizing: border-box;
	}

	.filter-input:focus {
		outline: none;
		border-color: var(--accent-fill-rest, #0078d4);
		box-shadow: 0 0 0 1px var(--accent-fill-rest, #0078d4);
	}

	/* Invalid state — surfaced when a column's `filter` callback returned null on the
	   probe row (i.e. user typed something syntactically incomplete like `>`). Themes
	   that override `--error-foreground` / `--error-fill-rest` get the right red. */
	.filter-input.invalid {
		border-color: var(--error-foreground, #d13438);
	}

	.filter-input.invalid:focus {
		border-color: var(--error-foreground, #d13438);
		box-shadow: 0 0 0 1px var(--error-foreground, #d13438);
	}

	:global([data-theme="dark"]) .filter-input.invalid {
		border-color: var(--error-foreground, #f87c86);
	}

	:global([data-theme="dark"]) .filter-input.invalid:focus {
		border-color: var(--error-foreground, #f87c86);
		box-shadow: 0 0 0 1px var(--error-foreground, #f87c86);
	}

	tbody tr {
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	tbody td {
		padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
		color: var(--neutral-foreground-rest, #242424);
	}

	.quickgrid.striped tbody tr:nth-child(even) {
		background: var(--fluent-quickgrid-stripe-bg, var(--neutral-layer-2, #fafafa));
	}

	.quickgrid.hoverable tbody tr:hover {
		background: var(--fluent-quickgrid-row-hover-bg, var(--neutral-layer-3, #f0f0f0));
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

	.tree-leaf-spacer {
		display: inline-block;
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	:global([data-theme="dark"]) .tree-chevron {
		color: var(--neutral-foreground-hint, #a0a0a0);
	}

	:global([data-theme="dark"]) .tree-chevron:hover {
		background: var(--neutral-fill-secondary-hover, #3a3a3a);
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: calc(var(--design-unit) * 3px);
		border-top: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		background: var(--neutral-layer-1, #ffffff);
	}

	.pagination-btn {
		padding: 6px 16px;
		background: var(--neutral-layer-1, #ffffff);
		border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		color: var(--neutral-foreground-rest, #242424);
		font-size: var(--type-ramp-base-font-size, 14px);
		cursor: pointer;
		transition: all 0.1s ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--neutral-layer-2, #f5f5f5);
		border-color: var(--neutral-stroke-input-hover, #a0a0a0);
	}

	.pagination-btn:active:not(:disabled) {
		background: var(--neutral-layer-3, #ebebeb);
	}

	.pagination-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-info {
		font-size: var(--type-ramp-base-font-size, 14px);
		color: var(--neutral-foreground-rest, #242424);
	}

	.item-count {
		font-size: 12px;
		color: var(--neutral-foreground-hint, #707070);
		margin-left: 4px;
	}

	/* Dark mode support */
	:global([data-theme="dark"]) .quickgrid {
		background: var(--neutral-layer-1, #1f1f1f);
		border-color: var(--neutral-stroke-layer-rest, #3d3d3d);
	}

	:global([data-theme="dark"]) .column-header {
		background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #2b2b2b));
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) tbody td {
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) .quickgrid.striped tbody tr:nth-child(even) {
		background: var(--fluent-quickgrid-stripe-bg, var(--neutral-layer-2, #262626));
	}

	:global([data-theme="dark"]) .quickgrid.hoverable tbody tr:hover {
		background: var(--fluent-quickgrid-row-hover-bg, var(--neutral-layer-3, #333333));
	}

	/* Editable cell styles */
	.quickgrid.editable .editable-cell {
		cursor: pointer;
		position: relative;
	}

	.quickgrid.editable .editable-cell:hover {
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
	}

	.quickgrid.editable .editable-cell:hover::after {
		content: "";
		position: absolute;
		inset: 2px;
		border: 1px dashed var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--fluent-border-radius-sm);
		pointer-events: none;
	}

	:global([data-theme="dark"]) .quickgrid.editable .editable-cell:hover {
		background: var(--neutral-fill-secondary-hover, #3a3a3a);
	}

	:global([data-theme="dark"]) .quickgrid.editable .editable-cell:hover::after {
		border-color: var(--neutral-stroke-input-rest, #5a5a5a);
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

	/* Actions column (for button trigger mode) */
	.actions-column {
		width: 32px;
		min-width: 32px;
		max-width: 32px;
		padding: 0 !important;
		text-align: center;
	}

	thead .actions-column {
		background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #f5f5f5));
		border-bottom: 2px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	.filter-row .actions-column {
		background: var(--neutral-layer-1, #ffffff);
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) thead .actions-column {
		background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #2b2b2b));
	}

	:global([data-theme="dark"]) .filter-row .actions-column {
		background: var(--neutral-layer-1, #1f1f1f);
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

	:global([data-theme="dark"]) .toolbar-trigger-btn {
		color: var(--neutral-foreground-hint, #a0a0a0);
	}

	:global([data-theme="dark"]) .toolbar-trigger-btn:hover,
	:global([data-theme="dark"]) .toolbar-trigger-btn.active {
		background: var(--neutral-fill-secondary-hover, #3a3a3a);
		color: var(--neutral-foreground-rest, #e0e0e0);
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
		background: var(--error-fill-rest, #fde7e9) !important;
	}

	.validation-error::after {
		border-color: var(--error-stroke-rest, #d13438) !important;
		border-style: solid !important;
	}

	.validation-error-message {
		font-size: 11px;
		color: var(--error-foreground, #d13438);
		margin-top: 2px;
	}

	/* Cell error indicator (shows when cell is invalid but not editing) */
	.cell-error-indicator {
		color: var(--error-foreground, #d13438);
		font-size: 12px;
		margin-left: 4px;
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

	.validating-indicator {
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

	/* Dark mode for new styles */
	:global([data-theme="dark"]) .cell-edit-btn {
		background: var(--neutral-layer-2, #2b2b2b);
		border-color: var(--neutral-stroke-input-rest, #5a5a5a);
		color: var(--neutral-foreground-rest, #e0e0e0);
	}

	:global([data-theme="dark"]) .cell-edit-btn:hover {
		background: var(--neutral-layer-3, #333333);
	}

	:global([data-theme="dark"]) .validation-error {
		background: var(--error-fill-rest, #442726) !important;
	}

	:global([data-theme="dark"]) .validation-error-message {
		color: var(--error-foreground, #f87c86);
	}

	:global([data-theme="dark"]) .cell-error-indicator {
		color: var(--error-foreground, #f87c86);
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
		outline: 2px solid var(--accent-fill-rest, #0078d4);
		outline-offset: -2px;
		background: var(--neutral-fill-secondary-hover, #f0f0f0);
	}

	.quickgrid.navigate-mode tbody td.focused::after {
		display: none;
	}

	:global([data-theme="dark"]) .quickgrid.navigate-mode tbody td.focused {
		background: var(--neutral-fill-secondary-hover, #3a3a3a);
	}

	/* Editing cell - prominent white background */
	.quickgrid .editable-cell.editing {
		background: var(--neutral-layer-1, #ffffff) !important;
		outline: 2px solid var(--accent-fill-rest, #0078d4);
		outline-offset: -2px;
	}

	:global([data-theme="dark"]) .quickgrid .editable-cell.editing {
		background: var(--neutral-layer-1, #1f1f1f) !important;
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
		outline: 2px solid var(--accent-fill-rest, #0078d4);
		outline-offset: -2px;
		background: var(--neutral-layer-1, #ffffff);
	}

	tbody td:has(.editor-wrapper)::after {
		display: none;
	}

	:global([data-theme="dark"]) tbody td:has(.editor-wrapper) {
		background: var(--neutral-layer-1, #1f1f1f);
	}

	/* Checkbox display in navigate mode (read-only visual) */
	.cell-checkbox-display {
		width: 18px;
		height: 18px;
		pointer-events: none;
		accent-color: var(--accent-fill-rest, #0078d4);
	}

	/* Context menu styles. Wrapper is transparent + rounded so the inner
	 * `<fluent-menu>`'s rounded corners don't reveal gray pixels behind
	 * them (the wrapper would otherwise be a rectangular surface). */
	.context-menu {
		z-index: var(--fluent-z-popover, 1060);
		background: transparent;
		border-radius: calc(var(--layer-corner-radius, var(--control-corner-radius, 4)) * 1px);
		/* Popover elevation — paint shadow on the wrapper so the menu reads
		 * as a distinct surface on dark themes (fluent-menu's own shadow is
		 * too subtle there). Matches ContextMenu's elevation. */
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);
	}

	.context-menu fluent-menu {
		min-width: 160px;
	}

	.context-menu fluent-menu-item.danger {
		color: var(--error-foreground, #d13438);
	}

	.context-menu fluent-menu-item.danger:hover {
		background: var(--error-fill-hover, #fde7e9);
	}

	:global([data-theme="dark"]) .context-menu fluent-menu-item.danger {
		color: var(--error-foreground, #f87c86);
	}

	:global([data-theme="dark"]) .context-menu fluent-menu-item.danger:hover {
		background: var(--error-fill-hover, #442726);
	}
</style>
