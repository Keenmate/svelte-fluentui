<!-- @component
Vertical (or horizontal) application bar of `AppBarItem` icon links.

```svelte
<AppBar><AppBarItem href="/inbox" count={3}>{#snippet icon()}<Icon name="mail" />{/snippet}Inbox</AppBarItem></AppBar>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"
	import {AppBarOrientation} from "../../fluent-ui/constants/app-bar.js"
	import {classList} from "../../helpers/html.js"

	type OwnProps = {
		/** Bar direction. Default: `"vertical"`. */
		orientation?: Orientation
		/** `AppBarItem`s. */
		children?: Snippet
		/** Extra CSS classes. */
		class?: string
	}

	/** Other native attributes and events (`id`, `aria-label`, …) go to the root `<nav>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    orientation = undefined,
		    children    = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	const computedClasses = $derived(classList(
		"fluent-appbar",
		orientation === AppBarOrientation.Horizontal
			? "horizontal"
			: "vertical",
		className
	))
</script>

<nav
	{...rest}
	data-orientation={orientation || AppBarOrientation.Vertical}
	class={computedClasses}
>
	{@render children?.()}
</nav>

<style>
	.fluent-appbar {
		--fluent-appbar-item-size: 68;
	}
</style>
