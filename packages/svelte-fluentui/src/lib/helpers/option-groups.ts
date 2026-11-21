/** A run of consecutive options sharing one `group` (`undefined` = ungrouped). */
export type OptionSegment<T> = {group: string | undefined; items: T[]}

/**
 * Sections an options array in SOURCE ORDER: a new segment starts whenever the
 * `group` value changes from the previous item. The author's ordering is kept —
 * ungrouped options stay where they sit (not hoisted), and a group that
 * reappears emits its header again. `null` when nothing is grouped, so callers
 * can keep a flat render path.
 */
export function groupSegments<T extends {group?: string}>(options: readonly T[]): OptionSegment<T>[] | null {
	if (!options.some((o) => o.group)) return null
	const segments: OptionSegment<T>[] = []
	let current: OptionSegment<T> | null = null
	for (const option of options) {
		const group = option.group || undefined
		if (!current || current.group !== group) {
			current = {group, items: []}
			segments.push(current)
		}
		current.items.push(option)
	}
	return segments
}
