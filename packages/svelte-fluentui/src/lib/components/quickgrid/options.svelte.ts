/**
 * QuickGrid editor options loaded by `editorOptions.loadOptionsCallback`, per cell (rowKey + field).
 */
import {SvelteMap} from "svelte/reactivity"
import type {QuickGridColumn, QuickGridEditorOption, GridCellEditorOptions} from "../QuickGrid.types.js"
import {cellKeyOf} from "./editing.svelte.js"

/** Options of one cell, with the row object they were loaded for: a replaced row (the consumer's update) reloads. */
type LoadedOptions<T> = {row: T; options: QuickGridEditorOption[]}
type OptionsLoad<T> = {row: T; controller: AbortController; promise: Promise<QuickGridEditorOption[]>}

export class OptionsLoader<T> {
	/** Reactive: cells re-render when their options arrive. */
	readonly cache = new SvelteMap<string, LoadedOptions<T>>()
	// One in-flight load per cell; a newer load of the cell (or `abortAll`) aborts it, and its
	// controller is the load token — only the cell's current load may write the cache.
	readonly #loads = new Map<string, OptionsLoad<T>>()

	static trigger<T>(column: QuickGridColumn<T>) {
		return column.editorOptions?.optionsLoadTrigger ?? "edit-start"
	}

	/** The row object the cell's cached options were loaded for. */
	cachedRow(rowKey: string, column: QuickGridColumn<T>): T | undefined {
		return this.cache.get(cellKeyOf(rowKey, String(column.field)))?.row
	}

	/** Loaded options, else the column's static `options`. */
	optionsFor(rowKey: string, column: QuickGridColumn<T>): QuickGridEditorOption[] {
		return this.cache.get(cellKeyOf(rowKey, String(column.field)))?.options ?? column.editorOptions?.options ?? []
	}

	/** Loads the cell's options. `reuse`: join an in-flight load for the same row object instead of restarting it. */
	load(column: QuickGridColumn<T>, row: T, rowKey: string, reuse = false): Promise<QuickGridEditorOption[]> {
		const load = column.editorOptions?.loadOptionsCallback
		if (!load) return Promise.resolve(column.editorOptions?.options || [])
		const field = String(column.field)
		const key = cellKeyOf(rowKey, field)
		const inFlight = this.#loads.get(key)
		if (reuse && inFlight?.row === row) return inFlight.promise
		inFlight?.controller.abort()

		const controller = new AbortController()
		const entry: OptionsLoad<T> = {row, controller, promise: Promise.resolve([])}
		this.#loads.set(key, entry)
		entry.promise = (async () => {
			try {
				const options = await load({row, column, signal: controller.signal})
				// Superseded or unmounted: a stale response never overwrites a newer one.
				if (controller.signal.aborted || this.#loads.get(key) !== entry) return this.cache.get(key)?.options ?? []
				this.cache.set(key, {row, options})
				return options
			} catch (error) {
				if (!controller.signal.aborted) console.error(`Failed to load options for ${field}:`, error)
				return []
			} finally {
				if (this.#loads.get(key) === entry) this.#loads.delete(key)
			}
		})()
		return entry.promise
	}

	/** GridCellEditor's options for a cell: the public callbacks adapted to its internal (positional) ones. */
	editorOptionsFor(column: QuickGridColumn<T>, row: T, rowKey: string): GridCellEditorOptions {
		const {loadOptionsCallback: _load, searchCallback, ...shared} = column.editorOptions ?? {}
		const options: GridCellEditorOptions = {...shared, options: this.optionsFor(rowKey, column)}
		if (searchCallback)
			options.onSearch = (term: string, signal?: AbortSignal) => searchCallback({term, row, column, signal})
		if (column.editorOptions?.loadOptionsCallback) options.loadOptions = () => this.load(column, row, rowKey)
		return options
	}

	/** Drops the cached options of rows `drop` says are gone. */
	dropRows(drop: (rowKey: string) => boolean) {
		for (const key of [...this.cache.keys()]) if (drop(key.split("\u0000")[0])) this.cache.delete(key)
	}

	/** Unmount: every in-flight load is aborted. */
	abortAll() {
		for (const load of this.#loads.values()) load.controller.abort()
	}
}
