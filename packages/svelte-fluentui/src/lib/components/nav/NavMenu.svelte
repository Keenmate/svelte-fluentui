<!-- @component
Vertical navigation menu of `NavLinkItem`s and `NavGroup`s, optionally collapsible to a 40px rail.

```svelte
<NavMenu collapsible bind:collapsed width="250px">
	<NavLinkItem href="/">Home</NavLinkItem>
</NavMenu>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import NavExpander from "./NavExpander.svelte"
	import {styleList} from "../../helpers/html.js"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** CSS width when expanded. Default: `100%` of the parent. */
		width?: string
		/** Collapsed to a 40px rail. Bindable. */
		collapsed?: boolean
		/** Show a hamburger button at the top that toggles `collapsed`. */
		collapsible?: boolean
		/** `NavLinkItem`, `NavGroup` and other nav rows. */
		children?: Snippet
		/** Extra CSS classes. */
		class?: string
	}

	/** Other native attributes and events (`id`, `aria-label`, …) go to the root `<div role="menu">`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    width       = undefined,
		    collapsed   = $bindable(),
		    collapsible = undefined,
		    children    = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	const computedStyle = $derived(styleList(
			collapsed ? "width: 40px; min-width: 40px" : width ? `width: ${width}` : "width: 100%"
	))
</script>

<div
	role="menu"
	{...rest}
	class="fluent-nav-menu {className || ''}"
	class:collapsed
	style={computedStyle}
>
	{#if collapsible}
		<NavExpander onclick={() => collapsed = !collapsed} />
	{/if}

	{@render children?.()}
</div>
