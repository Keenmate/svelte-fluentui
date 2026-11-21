/**
 * QuickGrid column layout — inline style strings for header and body cells. Pure; QuickGrid
 * computes them once per `columns` change, not per cell.
 */
import type {QuickGridColumn, QuickGridSortMode} from "../QuickGrid.types.js"

/** Header cell style: `autoWidth` (shrink-to-content trick), `width`, `minWidth` / `maxWidth`
 *  (else the grid's `columnMinWidth`), optional text-align. "" when there is nothing to set. */
export function getColumnHeaderStyle<T>(
	column: QuickGridColumn<T>,
	columnMinWidth: string | undefined,
	includeAlign: boolean
): string {
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

/** Body cell style: the column's width constraints on every `<td>` — without them only the header
 *  carried them, and in auto table-layout a wide body cell would drag the column past the header's
 *  max-width (and a `nowrap` cell's ellipsis could never trigger). */
export function getColumnBodyStyle<T>(column: QuickGridColumn<T>, columnMinWidth: string | undefined): string {
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

/** All three style strings per column, by column index. */
export type ColumnStyles = {header: string; filter: string; body: string}

export function getColumnStyles<T>(columns: QuickGridColumn<T>[], columnMinWidth: string | undefined): ColumnStyles[] {
	return columns.map((column) => ({
		header: getColumnHeaderStyle(column, columnMinWidth, true),
		filter: getColumnHeaderStyle(column, columnMinWidth, false),
		body: getColumnBodyStyle(column, columnMinWidth)
	}))
}

/** Sortable unless the grid's `sortMode` is "none" or the column opts out (`sortable: false`). */
export function isColumnSortable<T>(column: QuickGridColumn<T>, sortMode: QuickGridSortMode): boolean {
	return sortMode !== "none" && column.sortable !== false
}
