<script lang="ts">
	import {attrs} from "../../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import PositioningRegion from "../PositioningRegion.svelte"
	import ContentRegion from "../ContentRegion.svelte"
	import NavIcon from "./NavIcon.svelte"

	type Props = {
		href?: string
		rel?: string
		target?: string
		title?: string
		disabled?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		icon?: Snippet
		afterText?: Snippet
		children?: Snippet
		linkAction?: (node: HTMLElement) => void
		class?: string
	}

	let {
		    href      = undefined,
		    rel       = undefined,
		    target    = undefined,
		    title     = undefined,
		    disabled  = undefined,
		    icon      = undefined,
		    onclick   = undefined,
		    afterText = undefined,
		    children  = undefined,
		    linkAction = undefined,
		    class: className = undefined
	    }: Props = $props()

	let renderElement = $derived(href
		? "a"
		: "div"
	)

	function applyLinkAction(node: HTMLElement) {
		linkAction?.(node)
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={renderElement}
	{...(href ? {href, rel} : {})}
	{...attrs({target})}
	{title}
	aria-disabled={disabled}
	class="fluent-nav-link {className || ''}"
	class:disabled
	onclick={onclick}
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
