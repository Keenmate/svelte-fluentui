/**
 * Attribute helpers for `<fluent-*>` custom elements.
 *
 * Svelte sets custom-element attributes by stringifying the value, so
 * `disabled={undefined}` or `disabled={false}` renders `disabled="undefined"` /
 * `disabled="false"` — and FAST treats any present boolean attribute as `true`.
 * Absent must mean *no attribute*.
 */

type AttrValue = string | number | boolean | null | undefined

/**
 * Keeps only the entries that should render as attributes: drops `null`,
 * `undefined`, `false` and `""`; keeps `0`. Spread the result onto the element:
 *
 * ```svelte
 * <fluent-button {...attrs({disabled, appearance, "aria-label": ariaLabel})}>
 * ```
 */
export function attrs(record: Record<string, AttrValue>): Record<string, string | number | true> {
	const result: Record<string, string | number | true> = {}
	for (const key in record) {
		const value = record[key]
		if (value === null || value === undefined || value === false || value === "") continue
		result[key] = value
	}
	return result
}
