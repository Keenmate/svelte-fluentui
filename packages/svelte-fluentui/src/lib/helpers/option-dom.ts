/**
 * DOM accessors for `<Option>` rows (Option.svelte) inside Select / Combobox
 * listboxes. Options carry their value in `data-value`, an explicit label in
 * `data-option-label` and consumer data as JSON in `data-option-context`; the
 * parent marks the keyboard cursor with `data-highlighted`.
 */

export const OPTION_SELECTOR = ".fluent-option"

/** All option rows under `root`, in DOM order (group headers excluded). */
export function getOptionEls(root: ParentNode | null | undefined): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(OPTION_SELECTOR))
}

export function optionValue(el: HTMLElement): string {
	return el.dataset.value ?? el.getAttribute("value") ?? ""
}

/** The option's `label` prop when set, else its visible text. */
export function optionLabel(el: HTMLElement): string {
	return el.dataset.optionLabel ?? el.textContent?.trim() ?? ""
}

/** The option's `data` prop (parsed back from `data-option-context`). */
export function optionData(el: HTMLElement): Record<string, unknown> | undefined {
	const raw = el.dataset.optionContext
	if (!raw) return undefined
	try {
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

/** First option with `value` in the first root that has one. */
export function findOption(
	roots: readonly (ParentNode | null | undefined)[],
	value: string
): HTMLElement | undefined {
	for (const root of roots) {
		const el = getOptionEls(root).find(o => optionValue(o) === value)
		if (el) return el
	}
	return undefined
}

/** Moves `data-highlighted` to `active` (or clears it) among the options under `root`. */
export function markHighlighted(root: ParentNode | null | undefined, active: Element | undefined): void {
	for (const el of getOptionEls(root)) {
		if (el === active) el.setAttribute("data-highlighted", "")
		else el.removeAttribute("data-highlighted")
	}
}

/**
 * Rows per PageUp/PageDown: how many `rows` fit in `list`'s viewport, minus one
 * row of context. 10 before the list has measured.
 */
export function listPageSize(list: HTMLElement | null | undefined, rows: readonly HTMLElement[]): number {
	if (!list || rows.length === 0) return 10
	const rowHeight = rows[0].offsetHeight || 32
	return Math.max(1, Math.floor(list.clientHeight / rowHeight) - 1)
}
