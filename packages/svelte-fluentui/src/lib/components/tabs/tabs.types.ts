// Internal (Tabs): shared Tab ⇄ Tabs types; re-exported publicly via Tabs.svelte (TabInfo, TabEntry, TabsContext).

import type {Snippet} from "svelte"

/**
 * Shape of a registered tab entry inside the Tabs context. Tab.svelte
 * populates this and calls `register`; Tabs.svelte reads the array and
 * renders the real tablist + panels from it.
 */
export type TabEntry = {
	id: string
	label?: string
	icon?: Snippet
	header?: Snippet
	content?: Snippet
	children?: Snippet
	disabled?: boolean
	ariaLabel?: string
	labelEditable?: boolean
	showClose?: boolean
	visible?: boolean
	data?: Record<string, unknown>
	/**
	 * Called on the *currently active* tab before Tabs navigates away from
	 * it. Return `false` (or a Promise resolving to `false`) to veto the
	 * switch — e.g. when the tab holds unsaved data. May be async.
	 */
	beforeLeaveCallback?: (ctx: {tab: TabInfo; newTab: TabInfo}) => unknown
	/**
	 * Called before this tab's close (×) button fires `onTabClose`. Return
	 * `false` (or a Promise resolving to `false`) to veto the close.
	 * Independent of leaving: leaving keeps the tab alive, closing destroys
	 * it. Guards the tab being closed (not necessarily the active one).
	 */
	beforeCloseCallback?: (ctx: {tab: TabInfo}) => unknown
	/** Fires when the user closes this tab with its × button. */
	onTabClose?: (ctx: {tab: TabInfo}) => void
	class?: string
	style?: string
}

export type TabsContext = {
	register: (entry: TabEntry) => void
	unregister: (id: string) => void
}

/** The tab a callback or event is about. */
export type TabInfo = {
	id: string
	label?: string
	data?: Record<string, unknown>
}

export function toTabInfo(tab: TabEntry): TabInfo {
	return {id: tab.id, label: tab.label, data: tab.data}
}
