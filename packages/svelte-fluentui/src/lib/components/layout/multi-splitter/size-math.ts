// Internal (MultiSplitter): pure pane-size math — parsing, constraint clamping, absorber selection. Not exported from the package.

/** The mutable size slice of a pane the math works on (min/max already resolved to px). */
export type SizedPane = {
	size: number
	min: number
	max: number
}

/** "200px" / "30%" / "200" → px against `totalPx`; null when absent or unparsable. */
export function parseSize(raw: string | undefined, totalPx: number): number | null {
	if (raw == null || raw === "") return null
	const s = String(raw).trim()
	if (s.endsWith("%")) {
		const pct = parseFloat(s)
		return isNaN(pct) ? null : (pct / 100) * totalPx
	}
	if (s.endsWith("px")) {
		const px = parseFloat(s)
		return isNaN(px) ? null : px
	}
	const n = parseFloat(s)
	if (!isNaN(n) && /^-?\d*\.?\d+$/.test(s)) return n
	return null
}

/**
 * Resolve each pane's raw min/max against the root size, capping max at the
 * space actually available and never letting min exceed max.
 */
export function resolveMinMax(
	pane: SizedPane & {rawMin?: string; rawMax?: string},
	rootSize: number,
	total: number
) {
	let mn = parseSize(pane.rawMin, rootSize)
	let mx = parseSize(pane.rawMax, rootSize)
	if (mn == null) mn = 0
	if (mx == null) mx = total
	if (mx > total) mx = total
	if (mn > mx) mn = mx
	pane.min = mn
	pane.max = mx
}

// Clamp each pane to [min, max] and redistribute shortfall/excess to
// unclamped panes proportionally. `pinned` excludes panes from the flex
// pool (used to keep rail panes locked or constrain to absorber sets).
export function clampToConstraints(arr: SizedPane[], total: number, pinned: boolean[]) {
	const N = arr.length
	for (let pass = 0; pass < N + 1; pass++) {
		let sum = 0
		for (const p of arr) sum += p.size
		const diff = total - sum
		if (Math.abs(diff) < 0.5) break
		const flexable: number[] = []
		let flexableWeight = 0
		for (let j = 0; j < N; j++) {
			if (pinned[j]) continue
			const p = arr[j]
			const headroom = diff > 0 ? (p.max - p.size) : (p.size - p.min)
			if (headroom > 0.5) {
				flexable.push(j)
				flexableWeight += p.size > 0 ? p.size : 1
			}
		}
		if (flexable.length === 0) break
		for (const idx of flexable) {
			const p = arr[idx]
			const share = diff * ((p.size > 0 ? p.size : 1) / flexableWeight)
			let next = p.size + share
			if (next < p.min) next = p.min
			if (next > p.max) next = p.max
			p.size = next
		}
	}
}

// Absorbers for a drag on gutter `g` (between panes g and g+1) with the
// given primary index. Two modes:
//   CLASSIC: immediate secondary is non-rail → only that one absorbs.
//   TUNNEL: immediate secondary is rail → skip rails, collect the
//     contiguous non-rail block beyond. Lets slack punch through a rail
//     wall, which is the only way drag-from-rail can grow the primary
//     when its immediate neighbour is also rail.
export function computeAbsorbers(isMin: boolean[], g: number, primary: number): number[] {
	const N = isMin.length
	const absorbers: number[] = []
	let sawRail = false
	if (primary === g) {
		// Secondary side = right of gutter; walk from g+1 forward.
		for (let i = g + 1; i < N; i++) {
			if (isMin[i]) {
				if (absorbers.length > 0) break
				sawRail = true
				continue
			}
			absorbers.push(i)
			if (!sawRail) break
		}
	} else {
		// Secondary side = left of gutter; walk from g backward.
		for (let j = g; j >= 0; j--) {
			if (isMin[j]) {
				if (absorbers.length > 0) break
				sawRail = true
				continue
			}
			absorbers.push(j)
			if (!sawRail) break
		}
	}
	return absorbers
}

export function pinnedForAbsorbers(count: number, absorbers: number[]): boolean[] {
	const pinned = new Array(count).fill(true) as boolean[]
	for (const i of absorbers) pinned[i] = false
	return pinned
}

// Pick the primary neighbour for gutter `g`: side closer to its
// container edge. LTR/RTL tiebreaker on ties.
export function primaryNeighbour(g: number, count: number, rtl: () => boolean): number {
	const leftDist = g
	const rightDist = count - 2 - g
	if (leftDist < rightDist) return g
	if (rightDist < leftDist) return g + 1
	return rtl() ? (g + 1) : g
}

/** Size below which a drag snaps the primary pane into its rail. */
export function snapThreshold(anchor: number, railSize: number, minimizeThreshold: number): number {
	return Math.max(railSize * 1.5, railSize + (anchor - railSize) * minimizeThreshold)
}

/**
 * After the absorbers took what they could: if the layout still doesn't sum
 * to `total`, pull the primary back by the overshoot, clamped to [floor, max].
 */
export function settlePrimary(arr: SizedPane[], primary: SizedPane, total: number, floor: number) {
	let sum = 0
	for (const p of arr) sum += p.size
	if (Math.abs(sum - total) > 0.5) {
		primary.size -= (sum - total)
		if (primary.size < floor) primary.size = floor
		if (primary.size > primary.max) primary.size = primary.max
	}
}

// In accordion mode the expanded pane(s) ignore `max` and consume all
// remaining space — mins are still respected.
export function expandNonMinToFill(arr: SizedPane[], isMin: boolean[], total: number) {
	let sum = 0
	const flexable: number[] = []
	let flexableWeight = 0
	for (let i = 0; i < arr.length; i++) {
		const p = arr[i]
		sum += p.size
		if (!isMin[i]) {
			flexable.push(i)
			flexableWeight += p.size > 0 ? p.size : 1
		}
	}
	const diff = total - sum
	if (flexable.length === 0 || Math.abs(diff) < 0.5) return
	for (const idx of flexable) {
		const p = arr[idx]
		const weight = (p.size > 0 ? p.size : 1) / flexableWeight
		let next = p.size + diff * weight
		if (next < p.min) next = p.min
		p.size = next
	}
}
