/** Every UI text of SiteSettings; pass a partial object as `labels` to override. */
export type SiteSettingsLabels = {
	title: string
	theme: string
	themeSystem: string
	themeLight: string
	themeDark: string
	color: string
	neutralColor: string
	direction: string
	leftToRight: string
	rightToLeft: string
	/** First paragraph of the info text. */
	persistenceNote: string
	/** Second paragraph of the info text. */
	resetNote: string
	reset: string
	ok: string
}

/** SiteSettings' English strings; spread a partial over them via the `labels` prop. */
export const defaultSiteSettingsLabels: SiteSettingsLabels = {
	title: "Site settings",
	theme: "Theme",
	themeSystem: "System",
	themeLight: "Light",
	themeDark: "Dark",
	color: "Color",
	neutralColor: "Neutral base color",
	direction: "Direction",
	leftToRight: "Left to Right",
	rightToLeft: "Right to Left",
	persistenceNote: "These values (except for Direction) are persisted in the LocalStorage and will be recovered during your next visits.",
	resetNote: "Use the 'Reset settings' button below to go back to the system theme and default color.",
	reset: "Reset settings",
	ok: "OK"
}
