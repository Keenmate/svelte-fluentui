/** Every UI text of TopNav; pass a partial object as `labels` to override. */
export type TopNavLabels = {
	/** Accessible name of the mobile menu toggle while the menu is closed / open. */
	openMenu: string
	closeMenu: string
}

/** TopNav's English strings; spread a partial over them via the `labels` prop. */
export const defaultTopNavLabels: TopNavLabels = {
	openMenu: "Open menu",
	closeMenu: "Close menu"
}
