<!-- @component
Page layout wrapper stacking Header / BodyContent / Footer (vertical) or side-by-side regions (horizontal).

```svelte
<Layout><Header>…</Header><BodyContent>…</BodyContent><Footer>…</Footer></Layout>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Layout regions (Header, BodyContent, Footer, …). */
		children?: Snippet
		/** Direction the regions flow in. Default: `"vertical"`. */
		orientation?: Orientation
		/** Extra CSS classes, appended after `layout`. */
		class?: string
		/** Inline style for the root `<div>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		orientation = "vertical",
		class: className = "",
		style = "",
		...rest
	}: Props = $props()
</script>

<div
	{...rest}
	{style}
	class="layout {className}"
	data-orientation={orientation === "horizontal" ? "horizontal" : null}
>
	{@render children?.()}
</div>
