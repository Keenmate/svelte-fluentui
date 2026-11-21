<!-- @component
The link part of a nav row: icon, text and trailing content; an `<a>` with `href`, else a `<div>`.
-->

<script lang="ts">
	import {attrs} from "../../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import PositioningRegion from "../PositioningRegion.svelte"
	import ContentRegion from "../ContentRegion.svelte"
	import NavIcon from "./NavIcon.svelte"
	import type {AnchorRestProps} from "../../types/index.js"

	type OwnProps = {
		/** Link URL; without it the link renders as a `<div>`. */
		href?: string
		/** Link `rel` (only with `href`). */
		rel?: string
		/** Link `target`. */
		target?: string
		/** Native tooltip (useful in a collapsed menu). */
		title?: string
		/** Dims the link and sets `aria-disabled`. */
		disabled?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		/** Icon before the text. */
		icon?: Snippet
		/** Content after the text (badge, chevron, …). */
		afterText?: Snippet
		/** Link text. */
		children?: Snippet
		/** Svelte action applied to the link element on mount (e.g. a router's link action). */
		linkAction?: (node: HTMLElement) => void
		/** Extra CSS classes. */
		class?: string
	}

	/** Other native attributes and events (`id`, `aria-current`, `download`, …) go to the root `<a>` (or `<div>` without `href`). */
	type Props = OwnProps & AnchorRestProps<OwnProps>

	let {
		href = undefined,
		rel = undefined,
		target = undefined,
		title = undefined,
		disabled = undefined,
		icon = undefined,
		onclick = undefined,
		afterText = undefined,
		children = undefined,
		linkAction = undefined,
		class: className = undefined,
		...rest
	}: Props = $props()

	let renderElement = $derived(href ? "a" : "div")

	function applyLinkAction(node: HTMLElement) {
		linkAction?.(node)
	}
</script>

<!-- Without `href` this is a <div> inside a NavItem row; the row is the tab stop
     and forwards Enter / Space to this element as a click (NavItem.svelte). -->
<svelte:element
	this={renderElement}
	{...rest}
	{...href ? {href, rel} : {}}
	{...attrs({target})}
	{title}
	aria-disabled={disabled}
	class="fluent-nav-link {className || ''}"
	class:disabled
	{onclick}
	use:applyLinkAction
>
	<PositioningRegion>
		<ContentRegion>
			<NavIcon>
				{@render icon?.()}
			</NavIcon>

			<span class="fluent-nav-text">
				{@render children?.()}
			</span>

			{@render afterText?.()}
		</ContentRegion>
	</PositioningRegion>
</svelte:element>
