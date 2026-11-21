/**
 * Site-wide theme settings (theme mode, accent and neutral colour, text direction) — a Svelte 5
 * reactive singleton, read directly in runes code (`settings.themeMode`, `settings.effectiveTheme`).
 *
 * Every change is applied to `<html>` (`data-theme`, `dir`, the FluentUI design tokens) and,
 * except `direction`, persisted to localStorage. `themeMode: "system"` follows the OS setting live.
 */
import {BROWSER} from "esm-env"
import {
	accentBaseColor,
	baseLayerLuminance,
	neutralBaseColor,
	StandardLuminance,
	SwatchRGB
} from "@fluentui/web-components"

export type ThemeMode = "system" | "light" | "dark"
export type EffectiveTheme = "light" | "dark"
export type Direction = "ltr" | "rtl"

export interface SiteSettingsState {
	themeMode: ThemeMode
	accentColor: string
	neutralColor: string
	direction: Direction
}

const STORAGE_KEY = "site-settings"

const defaultSettings: SiteSettingsState = {
	themeMode: "system",
	accentColor: "OneDrive",
	neutralColor: "#FAFAFA", // Light gray, close to white for light mode
	direction: "ltr"
}

// Microsoft product colors matching FluentUI Blazor
export const accentColors = {
	Default: "#036ac4",
	Access: "#a4373a",
	Booking: "#00a99d",
	Exchange: "#0078d4",
	Excel: "#217346",
	GroupMe: "#00bcf2",
	Office: "#d83b01",
	OneDrive: "#0078d4",
	OneNote: "#7719aa",
	Outlook: "#0f6cbd",
	Planner: "#31752f",
	PowerApps: "#742774",
	PowerBI: "#f2c811",
	PowerPoint: "#b7472a",
	Project: "#31752f",
	Publisher: "#077568",
	SharePoint: "#0078d4",
	Skype: "#0078d4",
	Stream: "#bc1948",
	Sway: "#008272",
	Teams: "#6264a7",
	Visio: "#3955a3",
	Windows: "#0078d4",
	Word: "#2b579a",
	Yammer: "#106ebe"
}

function loadSettings(): SiteSettingsState {
	if (!BROWSER) return {...defaultSettings}
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) return {...defaultSettings, ...JSON.parse(stored)}
	} catch (e) {
		console.warn("Failed to load settings from localStorage:", e)
	}
	return {...defaultSettings}
}

function saveSettings(s: SiteSettingsState) {
	if (!BROWSER) return
	try {
		// Don't persist direction (FluentUI Blazor behaviour)
		const {direction: _direction, ...persistent} = s
		localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent))
	} catch (e) {
		console.warn("Failed to save settings to localStorage:", e)
	}
}

function systemPrefersDark(): boolean {
	return BROWSER && (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false)
}

function toSwatch(hex: string): SwatchRGB | undefined {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
	if (!m) return undefined
	return SwatchRGB.create(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255)
}

// Pick black or white text for best contrast against `hex`. Uses the simple
// W3C luminance threshold; good enough for the accent-on-text decision.
// Returns '#ffffff' for any non-hex input so the caller can blindly forward
// whatever it has (named colors, malformed localStorage, etc.).
function contrastForeground(hex: unknown): string {
	if (typeof hex !== "string") return "#ffffff"
	const h = hex.trim().replace(/^#/, "")
	const full =
		h.length === 3
			? h
					.split("")
					.map((c) => c + c)
					.join("")
			: h
	if (full.length !== 6) return "#ffffff"
	const r = parseInt(full.slice(0, 2), 16) / 255
	const g = parseInt(full.slice(2, 4), 16) / 255
	const b = parseInt(full.slice(4, 6), 16) / 255
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff"
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
	return luminance > 0.6 ? "#000000" : "#ffffff"
}

/** Resolves a named accent (`accentColors` key) to its hex; other values pass through. */
function resolveAccent(color: string): string {
	return (accentColors as Record<string, string>)[color] ?? color
}

// Applies the settings to <html>. `animate: false` (initial load) skips the transition
// suppression; on a live change `.fluent-theme-switching` (theme.scss) disables every
// transition for two frames, so hover/focus colour transitions on custom controls don't
// fade from the old palette to the new one.
function applySettings(s: SiteSettingsState, effective: EffectiveTheme, animate: boolean) {
	if (!BROWSER) return
	const root = document.documentElement
	if (animate) root.classList.add("fluent-theme-switching")

	root.setAttribute("data-theme", effective)
	root.setAttribute("dir", s.direction)

	// FluentUI design tokens: luminance, then the accent and neutral palettes derived from the base colours.
	try {
		baseLayerLuminance.setValueFor(
			root,
			effective === "dark" ? StandardLuminance.DarkMode : StandardLuminance.LightMode
		)
		const accentSwatch = toSwatch(resolveAccent(s.accentColor))
		if (accentSwatch) accentBaseColor.setValueFor(root, accentSwatch)
		const neutralSwatch = toSwatch(s.neutralColor)
		if (neutralSwatch) neutralBaseColor.setValueFor(root, neutralSwatch)
	} catch (e) {
		console.warn("Failed to apply FluentUI design tokens:", e)
	}

	// The raw accent also goes straight onto the --accent-fill-* variables, with a recomputed
	// --foreground-on-accent-* for contrast (white on yellow / light accents is unreadable).
	// --accent-foreground-rest is left alone: some FluentUI internals route accent button labels through it.
	const accentHex = resolveAccent(s.accentColor)
	const accentForeground = contrastForeground(accentHex)
	for (const state of ["rest", "hover", "active"]) root.style.setProperty(`--accent-fill-${state}`, accentHex)
	for (const state of ["rest", "hover", "active", "focus"])
		root.style.setProperty(`--foreground-on-accent-${state}`, accentForeground)
	root.style.setProperty("--fluent-accent-primary", accentHex)
	root.style.setProperty("--fluent-accent-hover", accentHex)
	root.style.setProperty("--fluent-accent-active", accentHex)

	// Neutral base color → primary surface
	root.style.setProperty("--neutral-layer-1", s.neutralColor)
	root.style.setProperty("--fluent-bg-primary", s.neutralColor)

	if (animate) {
		void root.offsetHeight
		requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("fluent-theme-switching")))
	}
}

function createSettingsService() {
	const initial = loadSettings()
	let themeMode = $state<ThemeMode>(initial.themeMode)
	let accentColor = $state(initial.accentColor)
	let neutralColor = $state(initial.neutralColor)
	let direction = $state<Direction>(initial.direction)
	let prefersDark = $state(systemPrefersDark())

	const effective = (): EffectiveTheme => (themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode)
	const snapshot = (): SiteSettingsState => ({themeMode, accentColor, neutralColor, direction})

	function commit(persist = true) {
		const s = snapshot()
		if (persist) saveSettings(s)
		applySettings(s, effective(), true)
	}

	if (BROWSER) {
		applySettings(initial, effective(), false)
		window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
			prefersDark = e.matches
			if (themeMode === "system") applySettings(snapshot(), effective(), true)
		})
	}

	return {
		/** `"system"` (follows the OS), `"light"` or `"dark"`. Persisted. */
		get themeMode(): ThemeMode {
			return themeMode
		},
		set themeMode(value: ThemeMode) {
			themeMode = value
			commit()
		},

		/** The theme actually shown: `themeMode`, with `"system"` resolved (reactive, follows OS changes). */
		get effectiveTheme(): EffectiveTheme {
			return effective()
		},

		/** Accent colour: an `accentColors` name or a hex value. Persisted. */
		get accentColor(): string {
			return accentColor
		},
		set accentColor(value: string) {
			accentColor = value
			commit()
		},

		/** Neutral base colour (hex), the primary surface. Persisted. */
		get neutralColor(): string {
			return neutralColor
		},
		set neutralColor(value: string) {
			neutralColor = value
			commit()
		},

		/** Text direction on `<html>`. Not persisted. */
		get direction(): Direction {
			return direction
		},
		set direction(value: Direction) {
			direction = value
			commit(false)
		},

		/** All settings as a plain object. */
		get current(): SiteSettingsState {
			return snapshot()
		},

		setThemeMode(mode: ThemeMode) {
			this.themeMode = mode
		},

		setAccentColor(color: string) {
			this.accentColor = color
		},

		setNeutralColor(color: string) {
			this.neutralColor = color
		},

		setDirection(value: Direction) {
			this.direction = value
		},

		/** Switches between light and dark (from `"system"`: to the opposite of what the OS shows). */
		toggleTheme() {
			this.themeMode = effective() === "dark" ? "light" : "dark"
		},

		/** Sets several settings at once (one apply, one save). */
		set(values: Partial<SiteSettingsState>) {
			if (values.themeMode !== undefined) themeMode = values.themeMode
			if (values.accentColor !== undefined) accentColor = values.accentColor
			if (values.neutralColor !== undefined) neutralColor = values.neutralColor
			if (values.direction !== undefined) direction = values.direction
			commit()
		},

		/** Back to the defaults (system theme, default colours, ltr). */
		reset() {
			this.set(defaultSettings)
		}
	}
}

export const settings = createSettingsService()
