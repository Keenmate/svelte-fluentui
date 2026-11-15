// Internal (Tabs): shared Tab ⇄ Tabs types; re-exported publicly via Tabs.svelte (TabInfo, TabEntry, TabsContext).

import type {Snippet} from "svelte"

/**
 * Shape of a registered tab entry inside the Tabs context. Tab.svelte
 * populates this and calls `register`; Tabs.svelte reads the array and
 * renders the real tablist + panels from it.
 */
export type TabEntry = {
	/** Unique tab id; also the tab button id (panel: `<id>-panel`). */
	id: string
	/** Tab text (ignored when `header` is set). */
	label?: string
	/** Icon rendered before the label. */
	icon?: Snippet
	/** Custom tab-button content; replaces `label`. */
	header?: Snippet
	/** Panel content. */
	content?: Snippet
	/** Panel content from between the `<Tab>` tags; rendered after `content`. */
	children?: Snippet
	/** Tab can't be activated. */
	disabled?: boolean
	/** Accessible name of the tab button. */
	ariaLabel?: string
	/** Label rendered as `contenteditable` text. */
	labelEditable?: boolean
	/** Shows the close (×) button. */
	showClose?: boolean
	/** `false` hides the tab from the strip. */
	visible?: boolean
	/** Arbitrary data, passed back as `tab.data` in events and callbacks. */
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
	/** Extra CSS class on the tab button. */
	class?: string
	/** Inline style on the tab button. */
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
