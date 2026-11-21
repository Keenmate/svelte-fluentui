// Internal (MultiSplitter): opt-in localStorage persistence of pane sizes / minimized state (`persistKey`). Not exported from the package.

/** Saved under "fluent-multi-splitter:<persistKey>" (the same key 1.x derived from `id`). */
export const STORAGE_PREFIX = "fluent-multi-splitter:"

export type SavedSplitterState = {sizes?: number[]; lasts?: number[]; minimized?: boolean[]}

export function readSplitterState(persistKey: string | undefined): SavedSplitterState | null {
	if (!persistKey) return null
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + persistKey)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (typeof parsed !== "object" || parsed === null || parsed.v !== 2) return null
		return parsed
	} catch {
		return null
	}
}

export function writeSplitterState(persistKey: string | undefined, state: Required<SavedSplitterState>) {
	if (!persistKey) return
	try {
		localStorage.setItem(STORAGE_PREFIX + persistKey, JSON.stringify({v: 2, ...state}))
	} catch {
		/* quota/privacy mode */
	}
}
