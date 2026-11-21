<!-- @component
Modal dialog for the site-wide theme settings (theme mode, accent and neutral colour, text direction), backed by the `settings` service.
App-specific settings can be added as `children`; they render below the built-in ones.

```svelte
<SiteSettings bind:open />
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {Dialog, Select, Option, Switch, Button, Divider, TextField, Stack} from "../index.js"
	import {settings, accentColors, type ThemeMode} from "../stores/settings.svelte.js"
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {SiteSettingsLabels} from "../i18n/labels.js"

	type OwnProps = {
		/** Whether the settings dialog is open (bindable). */
		open?: boolean
		/** Fires when the dialog opens or closes. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Extra, app-specific settings rendered below the built-in ones (after the Direction switch). */
		children?: Snippet
		/** Overrides of the built-in text (`svelteFluentUI.siteSettings.*` keys) for this instance. */
		labels?: SiteSettingsLabels
	}

	/** Other native attributes and events go to the underlying `<Dialog>` (`<fluent-dialog>`). */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    open = $bindable(false),
		    onOpenChange,
		    children,
		    labels: labelsProp = undefined,
		    ...rest
	    }: Props = $props()

	// Forwarded to a child component whose own prop types are narrower than
	// HTMLAttributes (no `null`), so hand the spread over untyped.
	const forwarded = $derived(rest as Record<string, unknown>)

	const t = useTranslations("siteSettings", () => labelsProp)

	function handleThemeChange({value}: {value: string | string[]}) {
		settings.setThemeMode(value as ThemeMode)
	}

	function handleAccentColorChange({value}: {value: string | string[]}) {
		settings.setAccentColor(value as string)
	}

	function handleNeutralColorChange(event: Event) {
		const target = event.target as HTMLInputElement
		settings.setNeutralColor(target.value)
	}

	function handleDirectionChange({checked}: {checked: boolean}) {
		settings.setDirection(checked ? 'ltr' : 'rtl')
	}

	function handleReset() {
		settings.reset()
	}
</script>

<Dialog {...forwarded} bind:open modal={true} {onOpenChange} size="small">
	<h4 style="margin: 0 0 1.5rem 0;">{t("heading")}</h4>

	<Stack orientation="vertical" gap="1rem">
		<!-- Theme Selection -->
		<div>
			<label for="theme-select" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
				{t("theme")}
			</label>
			<Select
				id="theme-select"
				value={settings.themeMode}
				style="width: 100%; margin-bottom: 1.5rem;"
				onChange={handleThemeChange}
			>
				<Option value="system">{t("themeSystem")}</Option>
				<Option value="light">{t("themeLight")}</Option>
				<Option value="dark">{t("themeDark")}</Option>
			</Select>
		</div>

		<!-- Accent Color Selection -->
		<div>
			<label for="color-select" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
				{t("color")}
			</label>
			<Select
				id="color-select"
				value={settings.accentColor}
				style="width: 100%; margin-bottom: 1.5rem;"
				onChange={handleAccentColorChange}
			>
				{#each Object.entries(accentColors) as [name, color]}
					<Option value={name}>
						<div style="display: flex; align-items: center; gap: 0.75rem;">
							<svg style="width: 20px; fill: {color};" viewBox="0 0 20 20">
								<path d="M5 4a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Z"></path>
							</svg>
							<span>{name}</span>
						</div>
					</Option>
				{/each}
			</Select>
		</div>

		<!-- Neutral Base Color -->
		<div>
			<label for="neutral-color" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
				{t("neutralColor")}
			</label>
			<div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
				<TextField
					id="neutral-color"
					type="color"
					value={settings.neutralColor}
					style="width: 150px;"
					oninput={handleNeutralColorChange}
				/>
				<svg style="width: 24px; fill: var(--accent-fill-rest);" viewBox="0 0 24 24">
					<path
						d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 7c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0v-5c0-.41.34-.75.75-.75ZM12 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
					></path>
				</svg>
			</div>
		</div>

		<!-- Direction Toggle -->
		<div style="margin-bottom: 1.5rem;">
			<Switch
				checked={settings.direction === 'ltr'}
				onChange={handleDirectionChange}
			>
				{t("direction")}
				{#snippet checkedMessage()}
					{t("leftToRight")}
				{/snippet}
				{#snippet uncheckedMessage()}
					{t("rightToLeft")}
				{/snippet}
			</Switch>
		</div>

		{#if children}
			<div class="site-settings-extra">
				{@render children()}
			</div>
		{/if}

		<!-- Info Text -->
		<p style="margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--neutral-foreground-rest);">
			{t("persistenceNote")}
			<br /><br />
			{t("resetNote")}
		</p>

		<Divider />

		<!-- Reset Button -->
		<div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
			<Button appearance="neutral" onclick={handleReset} style="width: 150px;">
				{t("reset")}
			</Button>
			<svg style="width: 24px; fill: var(--accent-fill-rest);" viewBox="0 0 24 24">
				<path
					d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 7c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0v-5c0-.41.34-.75.75-.75ZM12 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
				></path>
			</svg>
		</div>

		<!-- OK Button -->
		<div style="display: flex; justify-content: flex-end;">
			<Button appearance="accent" onclick={() => { open = false; onOpenChange?.({open: false}) }}>{t("ok")}</Button>
		</div>
	</Stack>
</Dialog>
