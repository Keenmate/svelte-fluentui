<!-- @component
Responsive top navigation bar: brand, items and an action area; below 960px (container width) the
items collapse into a hamburger-toggled drawer (`Panel`).

```svelte
<TopNav brand="Contoso" items={[{text: "Home", href: "/"}, {text: "Docs", href: "/docs"}]}>
	<Button>Sign in</Button>
</TopNav>
```
-->

<script lang="ts" module>
	import type {ActionEventDetail, ActionItem} from "../../action-items/index.js"

	/** A top-bar item: an action item (`text`, `icon`, `isDisabled`, `onClick`, …), usually with an `href`. */
	export type TopNavItem = ActionItem<object> & {
		href?: string
		target?: string
		rel?: string
	}
	export type TopNavActionDetail = ActionEventDetail<object> & {item: TopNavItem}
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import Icon from "../Icon.svelte"
	import {createLinkActivation, resolveActionItem, runAction} from "../../action-items/index.js"
	import Panel from "./Panel.svelte"
	import NavMenu from "../nav/NavMenu.svelte"
	import NavGroup from "../nav/NavGroup.svelte"
	import NavLinkItem from "../nav/NavLinkItem.svelte"
	import DismissIcon from "../icons/DismissIcon.svelte"
	import type {RestProps} from "../../types/index.js"
	import {useTranslations} from "../../i18n/translate.svelte.js"
	import type {TopNavLabels} from "../../i18n/labels.js"

	type NavGroupItem = {
		title: string
		icon: string
		items: Array<{label: string; href: string}>
	}

	type CollapseMode = "auto" | "always" | "never"

	type OwnProps = {
		/** Brand text at the start of the bar (ignored with `brandTemplate`). Default: `"Brand"`. */
		brand?: string
		/** URL of the brand link (ignored with `brandTemplate`). Default: `"/"`. */
		brandHref?: string
		/** Replaces the brand link (logo, badges, …). */
		brandTemplate?: Snippet
		/** Bar items (links and/or actions); they move into the drawer when the bar collapses. */
		items?: TopNavItem[]
		/** Action area after the items (search, account menu, …); stays visible at every width. */
		children?: Snippet
		/** Drawer-only nav groups: `{title, icon, items: {label, href}[]}` (`icon` is rendered as text). */
		navigationGroups?: NavGroupItem[]
		/** Custom drawer content after items and groups; receives a `close` function. */
		drawerContent?: Snippet<[close: () => void]>
		/** `"auto"` collapses below a 960px container width; `"always"` / `"never"` force it. Default: `"auto"`. */
		collapse?: CollapseMode
		/** Show the drawer as a pinned, in-flow rail that stays open across link clicks. Default: `false`. */
		drawerPinned?: boolean
		/** Drawer width (any CSS length). Default: `"280px"`. */
		drawerWidth?: string
		/** Bar height in px; the drawer starts below it. Default: `60`. */
		height?: number
		/** Hamburger button size in px. Default: `42`. */
		menuToggleSize?: number
		/** Replaces the hamburger button; receives `{open, toggle}`. */
		menuToggleTemplate?: Snippet<[{open: boolean; toggle: () => void}]>
		/** Overrides of the built-in text (`svelteFluentUI.topNav.*` keys) for this instance. */
		labels?: TopNavLabels
		/** Extra CSS classes on the root `<nav>`. */
		class?: string
		/** Inline style appended after the computed height. */
		style?: string
		/** Fires after an item ran (its `onClick`, or the navigation started); `detail` = `{action, id, item, source, sourceEvent, triggerElement}`. */
		onAction?: (detail: TopNavActionDetail) => void
		/** Called before an item runs or navigates; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: TopNavActionDetail) => unknown
	}

	/** Other native attributes and events (`id`, `aria-label`, …) go to the root `<nav>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		brand = "Brand",
		brandHref = "/",
		brandTemplate = undefined,
		items = [],
		children = undefined,
		navigationGroups = [],
		drawerContent = undefined,
		collapse = "auto",
		drawerPinned = false,
		drawerWidth = "280px",
		height = 60,
		menuToggleSize = 42,
		menuToggleTemplate = undefined,
		labels: labelsProp = undefined,
		class: className = "",
		style = "",
		onAction = undefined,
		beforeActionCallback = undefined,
		...rest
	}: Props = $props()

	const t = useTranslations("topNav", () => labelsProp)

	let mobileMenuOpen = $state(false)

	// Drawer is for collapsed nav items / groups OR custom drawerContent.
	// The action slot is intentionally NOT counted — it stays visible at every
	// width (search, account menu, theme toggle should remain reachable on
	// mobile rather than being hidden inside a hamburger).
	const hasDrawerContent = $derived(
		items.length > 0 || navigationGroups.length > 0 || !!drawerContent
	)

	// Sync drawer's open state with `drawerPinned` so transitioning to pinned
	// mode auto-reveals the rail (desktop default) and transitioning back to
	// overlay mode starts closed (no surprise overlay on viewport resize).
	// User toggles via the hamburger between transitions stand on their own
	// since this effect only re-runs when drawerPinned itself changes.
	$effect(() => {
		mobileMenuOpen = drawerPinned
	})

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen
	}

	function closeMobileMenu() {
		// Pinned drawer (desktop rail) is meant to stay open across link
		// clicks — consumers wire onClick={closeDrawer} on every NavLinkItem
		// to dismiss the overlay on mobile, and rely on this being a no-op
		// once the rail is pinned. Without this guard, every desktop click
		// would close the rail and the sync $effect on drawerPinned wouldn't
		// re-run to restore it (depends only on drawerPinned, not on
		// mobileMenuOpen).
		if (drawerPinned) return
		mobileMenuOpen = false
	}

	const actionHost = {}
	const activateLink = createLinkActivation()

	async function handleNavClick(item: TopNavItem, event: MouseEvent) {
		if (resolveActionItem(item, {}).isDisabled) {
			event.preventDefault()
			return
		}
		const run = () => runAction({
			host: actionHost,
			detail: {
				action: item.action ?? "custom",
				id: item.id,
				item,
				source: "toolbar",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			} satisfies TopNavActionDetail,
			beforeActionCallback,
			emitAction: (d) => onAction?.(d)
		})
		const ran = item.href ? await activateLink(event, run, !!beforeActionCallback) : await run()
		if (ran) closeMobileMenu()
	}
</script>

{#snippet navItem(item: TopNavItem)}
	{@const r = resolveActionItem(item, {})}
	{#if r.isVisible}
		<a
			href={r.isDisabled ? undefined : item.href}
			target={item.target ?? null}
			rel={item.rel ?? null}
			class="nav-item {r.cssClass}"
			class:disabled={r.isDisabled}
			role={item.href ? null : "button"}
			tabindex={item.href ? null : 0}
			title={r.tooltip ?? null}
			aria-disabled={r.isDisabled ? "true" : null}
			onclickcapture={(event: MouseEvent) => handleNavClick(item, event)}
		>
			{#if r.icon}
				<span class="nav-icon">
					{#if typeof r.icon === "string"}<Icon name={r.icon} size={20} />{:else}{@render r.icon()}{/if}
				</span>
			{/if}
			<span class="nav-text">{r.text}</span>
		</a>
	{/if}
{/snippet}

<nav
	{...rest}
	class="topnav {className}"
	class:topnav--force-collapse={collapse === "always"}
	class:topnav--force-expand={collapse === "never"}
	class:topnav--drawer-pinned={drawerPinned}
	style="height: {height}px; --fluent-topnav-toggle-size: {menuToggleSize}px; {style}"
>
	<div class="topnav-container">
		{#if hasDrawerContent}
			<div class="topnav-menu-toggle">
				{#if menuToggleTemplate}
					{@render menuToggleTemplate({open: mobileMenuOpen, toggle: toggleMobileMenu})}
				{:else}
					<button
						type="button"
						class="mobile-menu-toggle"
						onclick={toggleMobileMenu}
						aria-label={mobileMenuOpen ? t("closeMenuAriaLabel") : t("openMenuAriaLabel")}
						aria-expanded={mobileMenuOpen}
					>
						{#if mobileMenuOpen}
							<DismissIcon size={Math.round(menuToggleSize * 0.48)} />
						{:else}
							<span class="hamburger-glyph">☰</span>
						{/if}
					</button>
				{/if}
			</div>
		{/if}

		{#if brandTemplate}
			{@render brandTemplate()}
		{:else}
			<a href={brandHref} class="topnav-brand">
				{brand}
			</a>
		{/if}

		<div class="topnav-trailing">
			{#if items.length > 0}
				<div class="topnav-items">
					{#each items as item}
						{@render navItem(item)}
					{/each}
				</div>
			{/if}

			{#if children}
				{#if items.length > 0}
					<div class="nav-divider"></div>
				{/if}
				<div class="topnav-actions">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</nav>

{#if hasDrawerContent}
	<Panel
		bind:open={mobileMenuOpen}
		side="start"
		width={drawerWidth}
		top="{height}px"
		pinned={drawerPinned}
		class="topnav-drawer {drawerPinned ? 'topnav-drawer--pinned' : ''}"
	>
		<div class="topnav-drawer-body">
			{#if items.length > 0}
				<div class="topnav-drawer-items">
					{#each items as item}
						{@render navItem(item)}
					{/each}
				</div>
			{/if}

			{#if navigationGroups.length > 0}
				{#if items.length > 0}
					<hr class="topnav-drawer-separator" />
				{/if}
				<NavMenu>
					{#each navigationGroups as group}
						<NavGroup>
							{#snippet linkIcon()}
								<span class="nav-icon">{group.icon}</span>
							{/snippet}
							{#snippet linkText()}
								{group.title}
							{/snippet}

							{#each group.items as item}
								<NavLinkItem href={item.href}>{item.label}</NavLinkItem>
							{/each}
						</NavGroup>
					{/each}
				</NavMenu>
			{/if}

			{#if drawerContent}
				{#if items.length > 0 || navigationGroups.length > 0}
					<hr class="topnav-drawer-separator" />
				{/if}
				{@render drawerContent(closeMobileMenu)}
			{/if}
		</div>
	</Panel>
{/if}

<style>
	.topnav {
		display: flex;
		align-items: center;
		background: var(--neutral-layer-1, #ffffff);
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		padding: 0 0.5rem;
		container-type: inline-size;
		container-name: topnav;
	}

	.topnav-container {
		display: flex;
		align-items: center;
		width: 100%;
		position: relative;
		gap: 1rem;
		min-width: 0;
	}

	.topnav-brand {
		text-decoration: none;
		color: inherit;
		font-size: 1.25rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* Wrapper slot — owns visibility + position so a custom menuToggleTemplate
	   gets the same collapse behavior as the default button without consumers
	   needing to know about the internal rules. */
	.topnav-menu-toggle {
		display: none;
		order: -1;
		flex-shrink: 0;
		align-items: center;
	}

	/* Default toggle — plain icon target, no button chrome. Sized via
	   --fluent-topnav-toggle-size (set inline from the menuToggleSize prop).
	   Custom templates render at their natural size. */
	.mobile-menu-toggle {
		width: var(--fluent-topnav-toggle-size, 42px);
		height: var(--fluent-topnav-toggle-size, 42px);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		border-radius: var(--fluent-border-radius-md, 4px);
		transition: opacity 0.15s, background-color 0.15s;
	}

	.mobile-menu-toggle:hover {
		opacity: 0.7;
	}

	.mobile-menu-toggle:focus-visible {
		outline: 2px solid var(--accent-fill-rest, currentColor);
		outline-offset: 2px;
	}

	.hamburger-glyph {
		font-size: calc(var(--fluent-topnav-toggle-size, 42px) * 0.55);
		line-height: 1;
	}

	/* Trailing flex group: items + divider + actions. `margin-left: auto`
	   pushes it to the inline-end edge so brand stays next to hamburger
	   (or hugs the start edge when hamburger is hidden), instead of being
	   visually centered the way justify-content: space-between would do
	   with three flex children. */
	.topnav-trailing {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		min-width: 0;
		margin-inline-start: auto;
	}

	.topnav-items {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		min-width: 0;
		overflow: hidden;
	}

	.nav-item {
		text-decoration: none;
		color: inherit;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--fluent-border-radius-md);
		transition: background-color 0.2s;
	}

	.nav-item:hover {
		background-color: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.05));
	}

	.nav-icon {
		font-size: 1.1rem;
	}

	.nav-divider {
		width: 1px;
		height: 24px;
		background: var(--neutral-stroke-divider-rest, #e0e0e0);
	}

	.topnav-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* Drawer styling — Panel handles position / transition / a11y */
	.topnav-drawer-body {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
	}

	.topnav-drawer-items {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0 0.75rem;
	}

	.topnav-drawer-items .nav-item {
		padding: 0.6rem 0.75rem;
	}

	.topnav-drawer-separator {
		border: none;
		border-top: 1px solid var(--neutral-stroke-divider-rest, #e0e0e0);
		margin: 0.75rem 0;
	}

	@container topnav (max-width: 960px) {
		.topnav-menu-toggle {
			display: flex;
		}

		.topnav-items,
		.nav-divider {
			display: none;
		}
	}

	@container topnav (max-width: 480px) {
		.topnav-brand {
			font-size: 1rem;
		}
	}

	/* collapse="always" — force toggle visible + items hidden regardless of width */
	.topnav--force-collapse .topnav-menu-toggle {
		display: flex;
	}

	/* When drawer is pinned the toggle acts as a show/hide control for the
	   pinned rail itself, so it must stay visible at every width. */
	.topnav--drawer-pinned .topnav-menu-toggle {
		display: flex;
	}

	.topnav--force-collapse .topnav-items,
	.topnav--force-collapse .nav-divider {
		display: none;
	}

	/* collapse="never" — force items/divider visible + toggle hidden regardless of width */
	.topnav--force-expand .topnav-menu-toggle {
		display: none;
	}

	.topnav--force-expand .topnav-items {
		display: flex;
	}

	.topnav--force-expand .nav-divider {
		display: block;
	}

	.nav-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
