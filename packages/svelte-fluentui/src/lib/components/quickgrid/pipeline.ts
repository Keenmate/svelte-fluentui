/**
 * QuickGrid display pipeline — pure functions, no Svelte state.
 * QuickGrid chains them: tree order → filter → sort → visibility (tree collapse) → page.
 */
import {containsText, type SearchBehavior} from "../../helpers/text.js"
import type {QuickGridColumn, QuickGridSortMode, QuickGridSortState} from "../QuickGrid.types.js"

// ---------------------------------------------------------------------------
// Comparing
// ---------------------------------------------------------------------------

/** `null` / `undefined` / `""` / NaN / an invalid Date — sorted last in both directions. */
export function isEmptySortValue(value: unknown): boolean {
	if (value === null || value === undefined || value === "") return true
	if (typeof value === "number") return Number.isNaN(value)
	if (value instanceof Date) return Number.isNaN(value.getTime())
	return false
}

/** Ascending comparison of two non-empty values: Dates by time, numbers / bigints numerically,
 *  booleans false < true, anything else as text through `collator` (numeric: "2" < "10"). */
export function compareSortValues(a: unknown, b: unknown, collator: Intl.Collator): number {
	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
	if (typeof a === "number" && typeof b === "number") return a - b
	if (typeof a === "bigint" && typeof b === "bigint") return a < b ? -1 : a > b ? 1 : 0
	if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1
	return collator.compare(String(a), String(b))
}

export function getSortValue<T>(row: T, column: QuickGridColumn<T> | undefined, field: string): unknown {
	const value = (row as Record<string, unknown>)?.[field]
	return column?.getSortValueCallback ? column.getSortValueCallback({value, row, column}) : value
}

/** Row comparator for `sort` (in order; later entries break ties). Empty values go last
 *  whatever the direction; a column's `compareCallback` replaces the comparison. */
export function createRowComparator<T>(
	sort: QuickGridSortState[],
	columns: QuickGridColumn<T>[],
	collator: Intl.Collator
): ((a: T, b: T) => number) | null {
	const keys = sort.map((s) => ({
		field: s.column,
		sign: s.direction === "desc" ? -1 : 1,
		column: columns.find((c) => String(c.field) === s.column)
	}))
	if (keys.length === 0) return null
	return (a, b) => {
		for (const {field, sign, column} of keys) {
			const valueA = getSortValue(a, column, field)
			const valueB = getSortValue(b, column, field)
			let cmp: number
			if (column?.compareCallback) {
				cmp = sign * column.compareCallback({rowA: a, rowB: b, valueA, valueB, column})
			} else {
				const emptyA = isEmptySortValue(valueA)
				const emptyB = isEmptySortValue(valueB)
				if (emptyA || emptyB) cmp = emptyA === emptyB ? 0 : emptyA ? 1 : -1
				else cmp = sign * compareSortValues(valueA, valueB, collator)
			}
			if (cmp !== 0 && !Number.isNaN(cmp)) return cmp
		}
		return 0
	}
}

/** Stable sort (a copy); `rows` itself when there is nothing to sort by. */
export function sortRows<T>(rows: T[], compare: ((a: T, b: T) => number) | null): T[] {
	return compare ? [...rows].sort(compare) : rows
}

/**
 * The sort after a header click on `field` (web-grid's model). A plain click sorts by that
 * column alone, cycling asc → desc → none; in `"multiple"` mode Ctrl / ⌘ + click adds the
 * column to the sort (asc), or cycles the one already there asc → desc → removed.
 */
export function nextSort(current: QuickGridSortState[], field: string, mode: QuickGridSortMode, additive: boolean): QuickGridSortState[] {
	const index = current.findIndex((s) => s.column === field)
	if (additive && mode === "multiple") {
		const next = [...current]
		if (index < 0) next.push({column: field, direction: "asc"})
		else if (next[index].direction === "asc") next[index] = {column: field, direction: "desc"}
		else next.splice(index, 1)
		return next
	}
	if (index >= 0 && current.length === 1) {
		return current[0].direction === "asc" ? [{column: field, direction: "desc"}] : []
	}
	return [{column: field, direction: "asc"}]
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export type FilterOptions<T> = {
	filters: Record<string, string>
	columns: QuickGridColumn<T>[]
	searchBehavior: SearchBehavior
	/** The text the cell shows (what the built-in match compares against). */
	getText: (row: T, column: QuickGridColumn<T>) => string
}

/** A predicate for the active filters, or null when none is active. A column's
 *  `filterCallback` returning `null` (incomplete input) leaves that filter off. */
export function createRowFilter<T>({filters, columns, searchBehavior, getText}: FilterOptions<T>): ((row: T) => boolean) | null {
	const active = Object.entries(filters)
		.filter(([, term]) => !!term)
		.map(([field, term]) => ({term, column: columns.find((c) => String(c.field) === field)}))
		.filter((f): f is {term: string; column: QuickGridColumn<T>} => f.column !== undefined)
	if (active.length === 0) return null
	return (row) => active.every(({term, column}) => {
		if (column.filterCallback) {
			const result = column.filterCallback({term, row, column})
			return result === null ? true : result
		}
		return containsText(getText(row, column), term, column.searchBehavior ?? searchBehavior)
	})
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export type TreeAccess<T> = {
	getPath: (row: T) => string
	/** Nearest ancestor path that is a row in the dataset ("" = root). */
	getParent: (row: T) => string
}

/**
 * Depth-first tree order: every row after its parent, siblings ordered by `compareSiblings`.
 * Rows whose parent isn't in `rows` (filtered out / virtual roots) are roots.
 */
export function treeOrder<T>(rows: T[], tree: TreeAccess<T>, compareSiblings: (a: T, b: T) => number): T[] {
	const present = new Set(rows.map(tree.getPath))
	const children = new Map<string, T[]>()
	for (const row of rows) {
		let parent = tree.getParent(row)
		if (parent && !present.has(parent)) parent = ""
		let list = children.get(parent)
		if (!list) children.set(parent, (list = []))
		list.push(row)
	}
	const result: T[] = []
	const walked = new Set<string>()
	const walk = (parent: string) => {
		if (walked.has(parent)) return  // duplicate paths / cycles
		walked.add(parent)
		const list = children.get(parent)
		if (!list) return
		for (const row of [...list].sort(compareSiblings)) {
			result.push(row)
			walk(tree.getPath(row))
		}
	}
	walk("")
	// Anything unreachable (a cycle) keeps its place at the end rather than vanishing.
	if (result.length < rows.length) {
		const placed = new Set(result)
		for (const row of rows) if (!placed.has(row)) result.push(row)
	}
	return result
}

/** Rows matching `matches`, plus all their ancestors (so the hierarchy reads correctly). */
export function filterTreeRows<T>(rows: T[], tree: TreeAccess<T>, matches: (row: T) => boolean): T[] {
	const byPath = new Map(rows.map((r) => [tree.getPath(r), r]))
	const keep = new Set<T>()
	for (const row of rows) {
		if (!matches(row)) continue
		let current: T | undefined = row
		while (current && !keep.has(current)) {
			keep.add(current)
			const parent = tree.getParent(current)
			current = parent ? byPath.get(parent) : undefined
		}
	}
	return rows.filter((r) => keep.has(r))
}

/** Rows whose every ancestor row is expanded. */
export function visibleTreeRows<T>(rows: T[], tree: TreeAccess<T>, isExpanded: (path: string) => boolean): T[] {
	const present = new Set(rows.map(tree.getPath))
	const hidden = new Set<string>()
	const result: T[] = []
	// `rows` is in tree order, so a parent's verdict is known before its children's.
	for (const row of rows) {
		const parent = tree.getParent(row)
		const isHidden = !!parent && present.has(parent) && (hidden.has(parent) || !isExpanded(parent))
		if (isHidden) hidden.add(tree.getPath(row))
		else result.push(row)
	}
	return result
}

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

/** Number of pages for `total` rows (at least 1). */
export function getPageCount(total: number, pageSize: number): number {
	return Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
}

/** `page` brought into 1…pageCount. */
export function clampPage(page: number, pageCount: number): number {
	if (!Number.isFinite(page)) return 1
	return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, pageCount))
}

export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize
	return rows.slice(start, start + pageSize)
}
