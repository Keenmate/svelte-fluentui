/**
 * QuickGrid tree mode — pure path helpers (ltree-style paths: "1.2.3", "/a/b", "C:\\foo\\bar").
 * No Svelte state; QuickGrid precomputes a `TreeRowInfo` per row once per `items` change.
 */

/** What tree mode needs to know about a row. */
export type TreeRowInfo = {
	/** The row's path, trailing separator stripped. */
	path: string
	/** Non-empty path segments (for path-order comparison). */
	segments: string[]
	/** Depth: `treeLevelMember`, else segments − 1. */
	level: number
	/** `treeParentMember`, else the path minus its last segment. */
	parentPath: string
	/** Nearest ancestor that is a row in the dataset ("" = none) — virtual ancestors never gate. */
	parent: string
}

/** Where QuickGrid's tree props point. */
export type TreeFields<T> = {
	pathMember: keyof T
	levelMember?: keyof T
	parentMember?: keyof T
	separator: string
}

/** The first of "/", "\\", "." found in any path (a root like "1" has none, so keep looking); "/" otherwise. */
export function detectTreeSeparator(paths: Iterable<string>): string {
	for (const p of paths) {
		if (p.includes("/")) return "/"
		if (p.includes("\\")) return "\\"
		if (p.includes(".")) return "."
	}
	return "/"
}

/** "C:\\foo\\" and "C:\\foo" are the same path. */
export function trimSeparator(raw: string, sep: string): string {
	return raw.endsWith(sep) ? raw.slice(0, -sep.length) : raw
}

/** The path minus its last segment ("" for a root). */
export function parentPathOf(path: string, sep: string): string {
	const idx = path.lastIndexOf(sep)
	return idx >= 0 ? path.slice(0, idx) : ""
}

/** Path-aware order: numeric segments compare numerically ("1.2" < "1.10"), shorter (ancestor) first. */
export function compareSegments(aSegs: string[], bSegs: string[]): number {
	const min = Math.min(aSegs.length, bSegs.length)
	for (let i = 0; i < min; i++) {
		const aSeg = aSegs[i]
		const bSeg = bSegs[i]
		const aNum = Number(aSeg)
		const bNum = Number(bSeg)
		if (!isNaN(aNum) && !isNaN(bNum) && aSeg !== "" && bSeg !== "") {
			if (aNum !== bNum) return aNum - bNum
		} else if (aSeg !== bSeg) {
			return aSeg.localeCompare(bSeg)
		}
	}
	return aSegs.length - bSegs.length
}

/** Nearest ancestor of `path` in `expanded` (Ctrl+← collapses it), null when none is. */
export function nearestExpandedAncestor(path: string, sep: string, expanded: Set<string>): string | null {
	let parent = parentPathOf(path, sep)
	while (parent) {
		if (expanded.has(parent)) return parent
		parent = parentPathOf(parent, sep)
	}
	return null
}

/** `path` itself or one of its descendants. */
export function isInSubtree(path: string, root: string, sep: string): boolean {
	return path === root || path.startsWith(root + sep)
}

/** `TreeRowInfo` for one row; `rowPaths` (every row's path) resolves `parent`. */
export function getTreeRowInfo<T>(item: T, fields: TreeFields<T>, rowPaths: Set<string>): TreeRowInfo {
	const sep = fields.separator
	const path = trimSeparator(String(item[fields.pathMember] ?? ""), sep)
	const segments = path.split(sep).filter(Boolean)
	let level: number
	if (fields.levelMember) {
		const n = Number(item[fields.levelMember])
		level = Number.isFinite(n) ? n : 0
	} else {
		level = path ? segments.length - 1 : 0
	}
	const parentPath = fields.parentMember
		? trimSeparator(String(item[fields.parentMember] ?? ""), sep)
		: path
			? parentPathOf(path, sep)
			: ""
	let parent = parentPath
	while (parent && !rowPaths.has(parent)) parent = parentPathOf(parent, sep)
	return {path, segments, level, parentPath, parent}
}

/** Every row's `TreeRowInfo`, by row. */
export function buildTreeInfo<T>(items: T[], fields: TreeFields<T>): Map<T, TreeRowInfo> {
	const sep = fields.separator
	const rowPaths = new Set(items.map((item) => trimSeparator(String(item[fields.pathMember] ?? ""), sep)))
	return new Map(items.map((item) => [item, getTreeRowInfo(item, fields, rowPaths)]))
}

/** Expansion for parents seen for the first time: expanded unless deeper than `defaultExpandDepth`
 *  (relative to `minLevel`, the shallowest level present). */
export function defaultExpandedPaths(
	fresh: string[],
	levelOf: (path: string) => number,
	minLevel: number,
	defaultExpandDepth: number | undefined
): string[] {
	return fresh.filter((path) => defaultExpandDepth === undefined || levelOf(path) - minLevel < defaultExpandDepth)
}
