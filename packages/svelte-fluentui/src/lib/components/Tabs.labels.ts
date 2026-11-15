/** Every UI text of Tabs; pass a partial object as `labels` to override. */
export type TabsLabels = {
	/** Accessible name of a tab's close (×) button (`showClose`). */
	closeTab: string
	/** Tooltip of a tab's close (×) button. */
	closeTabTitle: string
	/** Tooltip of an editable tab label (`labelEditable`). */
	editTabName: string
	/** Accessible name of the overflow (⋯) button (`responsive="menu"`). */
	moreTabs: string
	/** Accessible names of the scroll arrows (`responsive="scroll"`), by physical direction. */
	scrollLeft: string
	scrollRight: string
	scrollUp: string
	scrollDown: string
}

/** Tabs' English strings; spread a partial over them via the `labels` prop. */
export const defaultTabsLabels: TabsLabels = {
	closeTab: "Close tab",
	closeTabTitle: "Close",
	editTabName: "Click to edit this tab name",
	moreTabs: "Show more tabs",
	scrollLeft: "Scroll tabs left",
	scrollRight: "Scroll tabs right",
	scrollUp: "Scroll tabs up",
	scrollDown: "Scroll tabs down"
}
