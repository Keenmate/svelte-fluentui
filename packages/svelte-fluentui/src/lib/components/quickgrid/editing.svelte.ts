/**
 * QuickGrid editing helpers: per-cell overrides (drafts) of invalid values, validation-result
 * normalisation and checkbox values. The edit session itself (tokens, startEdit / commitEdit)
 * stays in QuickGrid.svelte — it drives focus, navigation and the grid's events.
 */
import {SvelteMap} from "svelte/reactivity"
import type {QuickGridBeforeCommitResult, QuickGridColumn} from "../QuickGrid.types.js"

/** One key per cell (row key + field) for maps of cell state. */
export const cellKeyOf = (rowKey: string, field: string) => `${rowKey}\u0000${field}`

type CellOverride = {value: unknown; error: string}

/**
 * Drafts: per-cell overrides holding the values that failed validation (rowKey → field →
 * {value, error}). A cell shows its override if it has one, else the live item value, so the
 * consumer's changes to other fields always show. Reactive (SvelteMap).
 */
export class CellOverrides {
	readonly #rows = new SvelteMap<string, SvelteMap<string, CellOverride>>()

	get(rowKey: string, field: string): CellOverride | undefined {
		return this.#rows.get(rowKey)?.get(field)
	}

	set(rowKey: string, field: string, value: unknown, error: string) {
		let row = this.#rows.get(rowKey)
		if (!row) {
			row = new SvelteMap()
			this.#rows.set(rowKey, row)
		}
		row.set(field, {value, error})
	}

	delete(rowKey: string, field: string) {
		const row = this.#rows.get(rowKey)
		if (!row) return
		row.delete(field)
		if (row.size === 0) this.#rows.delete(rowKey)
	}

	/** Drops one row's overrides, or all. */
	clear(rowKey?: string) {
		if (rowKey === undefined) this.#rows.clear()
		else this.#rows.delete(rowKey)
	}

	/** Keeps only the overrides `keep(rowKey, field)` accepts. */
	prune(keep: (rowKey: string, field: string) => boolean) {
		for (const [rowKey, row] of this.#rows) {
			for (const field of [...row.keys()]) if (!keep(rowKey, field)) this.delete(rowKey, field)
		}
	}

	/** Drops every override of the rows `drop` says are gone. */
	dropRows(drop: (rowKey: string) => boolean) {
		for (const rowKey of [...this.#rows.keys()]) if (drop(rowKey)) this.#rows.delete(rowKey)
	}

	/** The cell's override value, else the item's. */
	value<T>(item: T, rowKey: string, field: string): unknown {
		const override = this.get(rowKey, field)
		return override ? override.value : item[field as keyof T]
	}

	/** The row with its overrides applied (the item itself when it has none). */
	draftRow<T>(item: T, rowKey: string): T {
		const row = this.#rows.get(rowKey)
		if (!row || row.size === 0) return item
		const draft = {...item} as Record<string, unknown>
		for (const [field, override] of row) draft[field] = override.value
		return draft as T
	}
}

/** `beforeCommitCallback`'s result as {valid, message, finalValue}. */
export function normalizeValidationResult(
	result: QuickGridBeforeCommitResult,
	value: unknown
): {valid: boolean; message?: string; finalValue: unknown} {
	if (result === null || result === undefined || result === true) return {valid: true, finalValue: value}
	if (result === false) return {valid: false, message: "Validation failed", finalValue: value}
	if (typeof result === "string") return {valid: false, message: result, finalValue: value}
	// ValidationResult object
	return {
		valid: result.valid,
		message: result.message,
		finalValue: result.transformedValue !== undefined ? result.transformedValue : value
	}
}

/** Checkbox state of a value: `trueValue` (default `true`), or plain `true`. */
export function isCheckboxChecked<T>(column: QuickGridColumn<T>, value: unknown): boolean {
	return value === (column.editorOptions?.trueValue ?? true) || value === true
}

/** Space toggle: the other of `trueValue` / `falseValue`. */
export function toggledCheckboxValue<T>(column: QuickGridColumn<T>, value: unknown): unknown {
	return isCheckboxChecked(column, value)
		? (column.editorOptions?.falseValue ?? false)
		: (column.editorOptions?.trueValue ?? true)
}
