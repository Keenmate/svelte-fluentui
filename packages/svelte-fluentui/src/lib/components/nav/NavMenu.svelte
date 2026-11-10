<script lang="ts">
	import type {Snippet} from "svelte"
	import NavExpander from "./NavExpander.svelte"
	import {styleList} from "../../helpers/html.js"

	type Props = {
		width?: string
		collapsed?: boolean
		collapsible?: boolean
		children?: Snippet
		class?: string
	}

	let {
		    width       = undefined,
		    collapsed   = $bindable(),
		    collapsible = undefined,
		    children    = undefined,
		    class: className = undefined
	    }: Props = $props()

	const computedStyle = $derived(styleList(
			collapsed ? "width: 40px; min-width: 40px" : width ? `width: ${width}` : "width: 100%"
	))
</script>

<div
	role="menu"
	class="fluent-nav-menu {className || ''}"
	class:collapsed
	style={computedStyle}
>
	{#if collapsible}
		<NavExpander onClick={() => collapsed = !collapsed} />
	{/if}

	{@render children?.()}
</div>
