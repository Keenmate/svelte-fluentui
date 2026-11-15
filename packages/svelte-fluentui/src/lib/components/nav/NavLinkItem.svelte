<!-- @component
A navigation link row (`NavItem` + `NavLink`) for `NavMenu` / `NavGroup`.

```svelte
<NavLinkItem href="/settings">{#snippet icon()}<Icon name="settings" />{/snippet}Settings</NavLinkItem>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import NavItem from "./NavItem.svelte"
	import NavLink from "./NavLink.svelte"
	import type {RestProps} from "../../types/index.js"
	import type {HTMLAnchorAttributes} from "svelte/elements"

	type OwnProps = {
		/** Link URL; without it the link renders as a `<div>`. */
		href?: string
		/** Link `rel` (only with `href`). */
		rel?: string
		/** Link `target`. */
		target?: string
		/** Native tooltip on the link (useful in a collapsed menu). */
		title?: string
		/** Dims the item and sets `aria-disabled`. */
		disabled?: boolean
		/** Style the row as a group header. */
		group?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		/** Icon before the text. */
		icon?: Snippet
		/** Content after the text (badge, …). */
		afterText?: Snippet
		/** Link text. */
		children?: Snippet
		/** Svelte action applied to the link element on mount (e.g. a router's link action). */
		linkAction?: (node: HTMLElement) => void
		/**
		 * Attributes and events for the inner link element (the `<a>`, or `<div>`
		 * without `href`): `download`, `hreflang`, `referrerpolicy`, `aria-current`,
		 * `data-*`, `onkeydown`, …. `href`/`rel`/`target`/`title` given as top-level
		 * props take precedence over the same keys here.
		 */
		linkProps?: Omit<HTMLAnchorAttributes, "children">
	}

	/** Other native attributes and events (`id`, `class`, `style`, `data-*`, …) go to the outer NavItem `<div role="menuitem">`; use `linkProps` for the inner link. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    href      = undefined,
		    rel       = undefined,
		    target    = undefined,
		    title     = undefined,
		    disabled  = undefined,
		    group     = undefined,
		    icon      = undefined,
		    onclick   = undefined,
		    afterText = undefined,
		    children  = undefined,
		    linkAction = undefined,
		    linkProps  = undefined,
		    ...rest
	    }: Props = $props()

	// Forwarded to a child component whose own prop types are narrower than
	// HTMLAttributes (no `null`), so hand the spread over untyped.
	const forwarded = $derived(rest as Record<string, unknown>)

	// `linkProps` first, then the defined top-level link props on top (an
	// undefined top-level prop must not wipe a value given in `linkProps`).
	const linkAttrs = $derived({
		...linkProps,
		...Object.fromEntries(Object.entries({href, rel, target, title}).filter(([, v]) => v !== undefined))
	} as Record<string, unknown>)
</script>

<NavItem
	{...forwarded}
	{group}
	{disabled}
	{onclick}
>
	<NavLink
		{...linkAttrs}
		{disabled}
		{icon}
		{children}
		{afterText}
		{linkAction}
	/>
</NavItem>
