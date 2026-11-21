/**
 * Remembered expanded state of `NavGroup`s with a `persistKey` — a Svelte 5 reactive singleton,
 * persisted to localStorage.
 */
import {BROWSER} from "esm-env"

const STORAGE_KEY = "svelte-fluentui-nav-state"

function load(): Record<string, boolean> {
	if (!BROWSER) return {}
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		return stored ? JSON.parse(stored) : {}
	} catch (e) {
		console.warn("Failed to load navigation state from localStorage:", e)
		return {}
	}
}

function save(groups: Record<string, boolean>) {
	if (!BROWSER) return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
	} catch (e) {
		console.warn("Failed to save navigation state to localStorage:", e)
	}
}

function createNavigationService() {
	let groups = $state<Record<string, boolean>>(load())

	return {
		/** Whether the group stored under `key` is expanded; `defaultExpanded` when nothing is stored. */
		isGroupExpanded(key: string, defaultExpanded = false): boolean {
			return groups[key] ?? defaultExpanded
		},

		/** Remembers the group's expanded state. */
		setGroupExpanded(key: string, expanded: boolean) {
			groups = {...groups, [key]: expanded}
			save(groups)
		},

		/** Forgets every remembered group. */
		reset() {
			groups = {}
			if (BROWSER) localStorage.removeItem(STORAGE_KEY)
		}
	}
}

export const navigation = createNavigationService()
