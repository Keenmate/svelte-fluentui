<!-- @component
Page header bar with fixed height and gutters.

```svelte
<Header height={60}>My app</Header>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Header content. */
		children?: Snippet
		/** Header height in px; `null` leaves it to CSS. Default: `50`. */
		height?: number
		/** Extra CSS classes, appended after `header`. */
		class?: string
		/** Inline style, appended after the computed height. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<header>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		height = 50,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	let computedStyle = $derived(
		[height != null && `height: ${height}px;`, style].filter(Boolean).join(" ")
	)
</script>

<header
	{...rest}
	style={computedStyle}
	class="header {className}"
>
	<div class="header-gutters">
		{@render children?.()}
	</div>
</header>
