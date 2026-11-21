import type {Snippet} from "svelte"
import type {SearchBehavior} from "../helpers/text.js"
import type {ActionEventDetail, ActionItem, MenuDivider, MenuEntry} from "../action-items/index.js"

// ---------------------------------------------------------------------------
// Row identity
// ---------------------------------------------------------------------------

/**
 * Where a row is, carried by every row-level event / callback context. Write back with
 * `items[itemIndex] = …` (or find the row by `rowKey` / your id) — never with `viewIndex`.
 */
export type QuickGridRowIdentity = {
	/** Position in the displayed list: after filtering, sorting, tree collapse and paging
	 * (0 = first row of the current page). Not an index into `items`. */
	viewIndex: number
	/** Index of the row object in `items`, or −1 when it is no longer there. */
	itemIndex: number
	/** Stable row key: `idMember` (default `"id"` when rows have one), else `treePathMember`, else a key generated per row object.
	 * The same key `invalidCells` uses. */
	rowKey: string
}

// ---------------------------------------------------------------------------
// Editors
// ---------------------------------------------------------------------------

/** Built-in cell editor kinds (`"custom"` hands editing to `Column.editCallback`). */
export type QuickGridEditorType =
	"text" | "number" | "checkbox" | "select" | "combobox" | "date" | "autocomplete" | "custom"

/** What puts a cell into edit mode. */
export type QuickGridEditTrigger = "click" | "dblclick" | "button" | "always" | "navigate"

/** When `editorOptions.loadOptionsCallback` runs. */
export type QuickGridOptionsLoadTrigger = "immediate" | "edit-start" | "dropdown-open"

/** What the date editor stores: a `Date`, an ISO string, or a timestamp. */
export type QuickGridDateOutputFormat = "date" | "iso" | "timestamp"

/** One option of a select / combobox / autocomplete cell editor. Extra properties are allowed. */
export type QuickGridEditorOption = {
	/** Value stored in the cell when this option is picked. */
	value: string | number | boolean
	/** Text shown in the editor and the cell. */
	label: string
	/** Group heading: options sharing a `group` render under it (select / combobox / autocomplete editors). */
	group?: string
	[key: string]: unknown
}

/** Editor fields shared by the public column options and the internal cell editor. */
type QuickGridEditorOptionsBase = {
	// === SHARED (select/autocomplete) ===
	/** Static option list (see `loadOptionsCallback` for loaded ones). */
	options?: QuickGridEditorOption[]
	/** Default: `"edit-start"`. */
	optionsLoadTrigger?: QuickGridOptionsLoadTrigger
	/** Property to use as value (default: `"value"`). */
	valueMember?: string
	/** Property to use as display (default: `"label"`). */
	displayMember?: string
	/** Allow a null/empty selection. */
	allowEmpty?: boolean
	/** Label for the empty option (default: `"-- Select --"`). */
	emptyLabel?: string

	// === TEXT ===
	/** Max characters (`maxlength` on the input). */
	maxLength?: number
	/** Input placeholder (text / number / select editors). */
	placeholder?: string
	/** Validation regex (`pattern` on the input). */
	pattern?: string
	/** Virtual-keyboard hint (`inputmode` on the input). */
	inputMode?: "text" | "numeric" | "email" | "tel" | "url"

	// === NUMBER ===
	/** Minimum value. */
	min?: number
	/** Maximum value. */
	max?: number
	/** Step of the arrows / spinner. Default: derived from `decimalPlaces`. */
	step?: number
	/** Round the committed number to this many decimals. */
	decimalPlaces?: number
	/** `false` forces `min` to 0. */
	allowNegative?: boolean

	// === CHECKBOX ===
	/** Value stored when checked (default: `true`). */
	trueValue?: unknown
	/** Value stored when unchecked (default: `false`). */
	falseValue?: unknown

	// === DATE ===
	/** Earliest selectable date. */
	minDate?: Date | string
	/** Latest selectable date. */
	maxDate?: Date | string
	/** What to store: Date object, ISO string, or timestamp. */
	outputFormat?: QuickGridDateOutputFormat

	// === SELECT / COMBOBOX / AUTOCOMPLETE ===
	/** How filtering and type-ahead compare text: `normalized` (default) ignores case and
	 * diacritics, `case-insensitive` ignores case only, `exact` matches both. No effect on `searchCallback`. */
	searchBehavior?: SearchBehavior

	// === AUTOCOMPLETE ===
	/** Shown before the user searches (popular items). */
	initialOptions?: QuickGridEditorOption[]
	/** Min chars before search (default: 1). */
	minSearchLength?: number
	/** Debounce delay in ms before a search runs (default: 300). */
	searchDelay?: number
}

/** Per-column editor configuration (`Column.editorOptions`). */
export type QuickGridEditorOptions<T = any> = QuickGridEditorOptionsBase & {
	/** Loads the options for this row. `signal` aborts when a newer load for the column starts or the grid unmounts. */
	loadOptionsCallback?: (ctx: {
		row: T
		column: QuickGridColumn<T>
		signal: AbortSignal
	}) => Promise<QuickGridEditorOption[]>
	/** Server-side search for the autocomplete editor. */
	searchCallback?: (ctx: {
		term: string
		row: T
		column: QuickGridColumn<T>
		signal?: AbortSignal
	}) => Promise<QuickGridEditorOption[]>
}

/**
 * Internal: the options GridCellEditor receives. QuickGrid adapts the public
 * row-aware callbacks to these positional ones (see getEditorOptionsForCell).
 * Not exported from the package root.
 */
export type GridCellEditorOptions = QuickGridEditorOptionsBase & {
	loadOptions?: () => Promise<QuickGridEditorOption[]>
	onSearch?: (query: string, signal?: AbortSignal) => Promise<QuickGridEditorOption[]>
}

/** What `Column.editCallback` receives for `editor: "custom"`. */
export type QuickGridCustomEditorContext<T = any> = QuickGridRowIdentity & {
	/** The cell's current value: its pending invalid value if it has one, else the row's. */
	value: any
	row: T
	field: string
	column: QuickGridColumn<T>
	/** Validates and commits (like the built-in editors). One-shot; ignored once another edit started. */
	commit: (newValue: any) => void
	/** Abandons the edit (fires `onEditCancel`). One-shot; ignored once another edit started. */
	cancel: () => void
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** One invalid cell, as tracked in the bindable `invalidCells`. */
export type QuickGridCellValidationState = {
	rowKey: string
	field: string
	error: string
}

export type QuickGridValidationResult = {
	valid: boolean
	message?: string
	transformedValue?: unknown
}

/** What `Column.beforeCommitCallback` receives. */
export type QuickGridBeforeCommitContext<T = any> = QuickGridRowIdentity & {
	value: unknown
	oldValue: unknown
	row: T
	field: string
	column: QuickGridColumn<T>
}

/**
 * `beforeCommitCallback` may return:
 * - a `QuickGridValidationResult`
 * - `boolean` (true = valid, false = invalid with no message)
 * - `string` (error message = invalid)
 * - `null` / `undefined` (valid)
 */
export type QuickGridBeforeCommitResult = QuickGridValidationResult | boolean | string | null | undefined

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export type QuickGridColumn<T = any> = {
	/** Row property shown in this column (also the key for sort, filter and edits). */
	field: keyof T | string
	/** Header text. */
	title: string
	/** Info tooltip shown next to the header title (displays an ⓘ icon). */
	headerInfo?: string
	/** `false` opts the column out of sorting (the grid's `sortMode` turns sorting on). */
	sortable?: boolean
	/** `false` hides this column's filter input (the grid's `filterable` turns the filter row on). */
	filterable?: boolean
	/** The value this column sorts by (default: the raw field value) — e.g. an option's label. */
	getSortValueCallback?: (ctx: {value: any; row: T; column: QuickGridColumn<T>}) => unknown
	/** Replaces the built-in comparison for this column: return < 0, 0 or > 0 for ascending
	 *  order (the grid reverses it for `"desc"`; empty values are yours to place). `valueA` /
	 *  `valueB` are the sort values (see `getSortValueCallback`). */
	compareCallback?: (ctx: {rowA: T; rowB: T; valueA: unknown; valueB: unknown; column: QuickGridColumn<T>}) => number
	/** How this column's filter input matches the cell text (default: the grid's `searchBehavior`). */
	searchBehavior?: SearchBehavior
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
	/** Horizontal text alignment of header and cells. */
	align?: "start" | "center" | "end"
	/** Formats the cell's value for display. */
	getDisplayValueCallback?: (ctx: {value: any; row: T; column: QuickGridColumn<T>}) => string
	/**
	 * Renders the whole cell as an HTML string (takes precedence over getDisplayValueCallback).
	 *
	 * **XSS risk:** the string is inserted with `{@html}` and is **not sanitised**. Never interpolate
	 * user-supplied or server data into it unescaped (a name like `<img src=x onerror=…>` runs script).
	 * Prefer `snippet` — Svelte escapes its output — and keep this for trusted, static markup.
	 */
	renderCellCallback?: (ctx: {row: T; column: QuickGridColumn<T>}) => string
	/** Renders the cell with a Svelte snippet (receives the row; output is escaped). Wins over `renderCellCallback`. */
	snippet?: Snippet<[T]>
	/**
	 * Custom filter predicate, replacing the built-in substring match for this column. Called once
	 * per row with the raw filter input and the row. Return `true` to keep the row, `false` to
	 * exclude it, or `null` when the input is syntactically invalid (e.g. only `>` typed so far) —
	 * `null` ignores the filter entirely (all rows pass) and gives the filter input an `.invalid`
	 * class. Validity is assumed to depend on the input only, so the grid probes the first row.
	 */
	filterCallback?: (ctx: {term: string; row: T; column: QuickGridColumn<T>}) => boolean | null
	/** Cells in this column can be edited (when the grid is `editable`). Default `false`. */
	editable?: boolean
	/** Per-row decision (e.g. only leaf rows in a tree); wins over `editable`. */
	getIsEditableCallback?: (ctx: {row: T; column: QuickGridColumn<T>}) => boolean
	/** Cell editor kind. Default: `text`. */
	editor?: QuickGridEditorType
	/** Per-column override of the grid's `editTrigger`. */
	editTrigger?: QuickGridEditTrigger
	/** Editor settings (options, limits, search, …). */
	editorOptions?: QuickGridEditorOptions<T>

	/** Validates a new value: return an error message, or null when valid. Prefer beforeCommitCallback. */
	validateCallback?: (ctx: {value: any; row: T; column: QuickGridColumn<T>}) => string | null | Promise<string | null>
	/** Validates and optionally transforms a value before it is committed (see QuickGridBeforeCommitResult). */
	beforeCommitCallback?: (
		ctx: QuickGridBeforeCommitContext<T>
	) => QuickGridBeforeCommitResult | Promise<QuickGridBeforeCommitResult>
	/** Custom editor (`editor: "custom"`): open your own UI, then call `ctx.commit(value)` or `ctx.cancel()`. */
	editCallback?: (ctx: QuickGridCustomEditorContext<T>) => void
	/** Show an edit button in the cell. */
	showEditButton?: boolean
	/** Tree mode: render this column with indent + expand/collapse chevron (never editable). */
	tree?: boolean
}

// ---------------------------------------------------------------------------
// Sorting, filtering, paging
// ---------------------------------------------------------------------------

/** `"none"` (no sorting), `"single"` (one column), `"multiple"` (Ctrl / ⌘ + click adds a column). */
export type QuickGridSortMode = "none" | "single" | "multiple"

export type QuickGridSortDirection = "asc" | "desc"

/** One sorted column; `sort` is an array of these, the first one sorting first. */
export type QuickGridSortState = {
	column: string
	direction: QuickGridSortDirection
}

/** `"client"`: the grid filters / sorts / slices `items`. `"server"`: `items` is the current
 *  page, already filtered and sorted — the grid only renders it (see `onDataRequest`). */
export type QuickGridPaginationMode = "client" | "server"

/** `"client"`: the grid filters `items`. `"server"`: the filter inputs only report
 *  (`onFiltersChange` / `onDataRequest`); you replace `items`. */
export type QuickGridFilterMode = "client" | "server"

/** What made the grid ask for data. `"init"` fires once on mount, in `paginationMode="server"`. */
export type QuickGridDataRequestTrigger = "sort" | "page" | "page-size" | "filter" | "init"

/** What `onDataRequest` receives: the state the displayed rows should reflect. */
export type QuickGridDataRequestDetail = {
	sort: QuickGridSortState[]
	/** 1-based. */
	page: number
	pageSize: number
	trigger: QuickGridDataRequestTrigger
	/** Always `"replace"` (the rows replace `items`; no load-more yet). */
	mode: "replace"
	/** Rows before this page: `(page - 1) * pageSize`. */
	skip: number
	filters: Record<string, string>
}

/** User actions that run through `beforePageChangeCallback` (`"sort"` / `"filter"` only in server mode). */
export type QuickGridPageChangeTrigger = "page" | "page-size" | "sort" | "filter"

/** What `beforePageChangeCallback` receives — a user action is about to change the page. */
export type QuickGridBeforePageChangeContext = {
	trigger: QuickGridPageChangeTrigger
	fromPage: number
	/** The page the action leads to (1 for page-size / sort / filter changes). */
	toPage: number
	/** The grid's invalid cells (unsaved drafts) — e.g. to ask "leave without saving?". */
	invalidCells: QuickGridCellValidationState[]
}

/** `false` keeps the current page, a number goes to that page instead, anything else continues. */
export type QuickGridBeforePageChangeResult = boolean | number | void | undefined | null

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** One invalid cell of a row, as reported in `QuickGridRowChangeDetail.invalidFields`. */
export type QuickGridInvalidField = {
	field: string
	error: string
	/** The value that failed validation (what the cell shows). */
	value: unknown
}

/** What `onRowChange` receives after every committed cell edit. */
export type QuickGridRowChangeDetail<T = any> = QuickGridRowIdentity & {
	/** The row as it is in `items` (unchanged). */
	row: T
	/** The row's current state: `row` + every pending invalid value of the row + this commit's value. */
	draftRow: T
	field: string
	oldValue: any
	newValue: any
	/** The edited field passed validation. */
	isValid: boolean
	validationError?: string | null
	/** Every invalid cell of the row after this commit (including this one when it failed). */
	invalidFields: QuickGridInvalidField[]
	/** `invalidFields.length === 0`. */
	isRowValid: boolean
}

/** What `onEditStart` receives. */
export type QuickGridEditStartContext<T = any> = QuickGridRowIdentity & {
	row: T
	field: string
	column: QuickGridColumn<T>
}

/** What `onEditCancel` receives. */
export type QuickGridEditCancelContext<T = any> = QuickGridRowIdentity & {
	row: T
	field: string
	column: QuickGridColumn<T> | undefined
}

/** What `onValidationError` receives. */
export type QuickGridValidationErrorContext<T = any> = QuickGridRowIdentity & {
	row: T
	field: string
	column: QuickGridColumn<T>
	error: string
}

// ---------------------------------------------------------------------------
// Row toolbar
// ---------------------------------------------------------------------------

/** Built-in row-toolbar presets (icon, text, danger styling); what they *do* is up to `onAction` / `onClick`. */
export type QuickGridRowToolbarAction = "add" | "delete" | "duplicate" | "move-up" | "move-down"

/** The row a toolbar item / action runs for. */
export type QuickGridRowContext<T = any> = QuickGridRowIdentity & {
	row: T
}

export type QuickGridRowToolbarItem<T = any> = ActionItem<QuickGridRowContext<T>, QuickGridRowToolbarAction> & {
	/** Toolbar line, 1 = closest to the grid row (default). Higher lines stack above. */
	toolbarRow?: number
	/** Show `text` next to the icon; otherwise it is the tooltip / accessible name only. */
	isTextVisible?: boolean
}

/** A `rowToolbar` entry: a built-in name, a full item, or a `{divider: true}` separator. */
export type QuickGridRowToolbarConfig<T = any> = QuickGridRowToolbarAction | QuickGridRowToolbarItem<T> | MenuDivider

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

/** The right-clicked cell, as passed to `onContextMenuOpen` and context-menu items. */
export type QuickGridContextMenuContext<T = any> = QuickGridRowIdentity & {
	row: T
	columnIndex: number
	column: QuickGridColumn<T>
	cellValue: unknown
}

/**
 * Built-in context-menu actions (they do the work themselves, and only show in tree mode).
 * `expand-all` / `collapse-all` act on the right-clicked row's branch; `expand-tree` /
 * `collapse-tree` on the entire dataset.
 */
export type QuickGridContextMenuAction = "expand-all" | "collapse-all" | "expand-tree" | "collapse-tree"

/** A `contextMenu` entry: a built-in name, or a full menu entry (item or divider). */
export type QuickGridContextMenuConfig<T = any> =
	QuickGridContextMenuAction | MenuEntry<QuickGridContextMenuContext<T>, QuickGridContextMenuAction>

/** What `onAction` / `beforeActionCallback` receive — the row (and, from the context menu, the cell). */
export type QuickGridActionDetail<T = any> = ActionEventDetail<
	QuickGridRowContext<T> & Partial<Omit<QuickGridContextMenuContext<T>, keyof QuickGridRowContext<T>>>
>
