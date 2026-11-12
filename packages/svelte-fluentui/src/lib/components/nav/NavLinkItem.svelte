<script lang="ts">
	import type {Snippet} from "svelte"
	import NavItem from "./NavItem.svelte"
	import NavLink from "./NavLink.svelte"
	import type {RestProps} from "../../types/index.js"
	import type {HTMLAnchorAttributes} from "svelte/elements"

	type OwnProps = {
		href?: string
		rel?: string
		target?: string
		title?: string
		disabled?: boolean
		group?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		icon?: Snippet
		afterText?: Snippet
		children?: Snippet
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
