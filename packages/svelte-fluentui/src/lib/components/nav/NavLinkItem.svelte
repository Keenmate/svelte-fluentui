<script lang="ts">
	import type {Snippet} from "svelte"
	import NavItem from "./NavItem.svelte"
	import NavLink from "./NavLink.svelte"

	type Props = {
		href?: string
		rel?: string
		target?: string
		title?: string
		disabled?: boolean
		group?: boolean
		onClick?: (ev: MouseEvent) => void
		icon?: Snippet
		afterText?: Snippet
		children?: Snippet
		linkAction?: (node: HTMLElement) => void
	}

	let {
		    href      = undefined,
		    rel       = undefined,
		    target    = undefined,
		    title     = undefined,
		    disabled  = undefined,
		    group     = undefined,
		    icon      = undefined,
		    onClick   = undefined,
		    afterText = undefined,
		    children  = undefined,
		    linkAction = undefined
	    }: Props = $props()
</script>

<NavItem
	{group}
	{disabled}
	{onClick}
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
