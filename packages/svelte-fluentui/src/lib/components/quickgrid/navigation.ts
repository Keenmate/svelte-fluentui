/**
 * QuickGrid keyboard navigation — pure helpers (no Svelte state).
 */

/**
 * The next editable cell from (`fromRow`, `fromEditableIndex`) in `direction` — Tab / Shift+Tab.
 * `fromEditableIndex` is the cursor's index within the current row's editable columns (-1 = enter
 * the row from outside). Rows differ: in heterogeneous trees some have no editable columns at all
 * (team rows vs employee rows), so each row's list is looked up and rows without any are skipped —
 * otherwise Tab would land on a cell with no tabindex and focus would drop to the body.
 * Null when there is none (Tab then leaves the grid).
 */
export function findNextEditableCell(
	rowCount: number,
	editableColumnsAt: (viewIndex: number) => number[],
	fromRow: number,
	fromEditableIndex: number,
	direction: 1 | -1
): {viewIndex: number; colIndex: number} | null {
	if (fromRow >= 0 && fromRow < rowCount) {
		const currentCols = editableColumnsAt(fromRow)
		const next = fromEditableIndex + direction
		if (next >= 0 && next < currentCols.length) return {viewIndex: fromRow, colIndex: currentCols[next]}
	}
	for (let r = fromRow + direction; r >= 0 && r < rowCount; r += direction) {
		const cols = editableColumnsAt(r)
		if (cols.length > 0) return {viewIndex: r, colIndex: direction === 1 ? cols[0] : cols[cols.length - 1]}
	}
	return null
}
