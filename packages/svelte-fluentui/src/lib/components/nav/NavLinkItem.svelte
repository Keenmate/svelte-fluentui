<script lang="ts">
	import type {Snippet} from "svelte"
	import NavItem from "./NavItem.svelte"
	import NavLink from "./NavLink.svelte"
	import type {RestProps} from "../../types/index.js"

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
	}

	/** Other native attributes and events (`id`, `class`, `aria-label`, …) go to the outer NavItem `<div role="menuitem">`. */
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
		    ...rest
	    }: Props = $props()

	// Forwarded to a child component whose own prop types are narrower than
	// HTMLAttributes (no `null`), so hand the spread over untyped.
	const forwarded = $derived(rest as Record<string, unknown>)
</script>

<NavItem
	{...forwarded}
	{group}
	{disabled}
	{onclick}
>
	<NavLink
		{href}
		{rel}
		{target}
		{title}
		{disabled}
		{icon}
		{children}
		{afterText}
		{linkAction}
	/>
</NavItem>
