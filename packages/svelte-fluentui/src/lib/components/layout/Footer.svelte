<!-- @component
Page footer. Either plain `children`, or a three-part `start | center | end` layout (center is truly centred).

```svelte
<Footer>{#snippet start()}© 2026{/snippet}{#snippet end()}v2.0{/snippet}</Footer>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Inline-start section. Any of `start`/`center`/`end` switches to the 3-part grid layout (`1fr | auto | 1fr`). */
		start?: Snippet
		/** Centre section; sits at the footer midpoint regardless of start/end widths. */
		center?: Snippet
		/** Inline-end section. */
		end?: Snippet
		/** Footer content, used only when none of `start`/`center`/`end` is set. */
		children?: Snippet
		/** Stack to a single column below 600px container width. Only applies in 3-part mode. Default: `true`. */
		stack?: boolean
		/** Extra CSS classes, appended after `fluent-footer`. */
		class?: string
		/** Inline style for the root `<footer>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<footer>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		start = undefined,
		center = undefined,
		end = undefined,
		children = undefined,
		stack = true,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	const hasThreeParts = $derived(!!start || !!center || !!end)
</script>

<footer
	{...rest}
	{style}
	class="fluent-footer {className}"
	class:fluent-footer--three-part={hasThreeParts}
	class:fluent-footer--stacks={hasThreeParts && stack}
>
	{#if hasThreeParts}
		{#if start}
			<div class="fluent-footer__start">{@render start()}</div>
		{/if}
		{#if center}
			<div class="fluent-footer__center">{@render center()}</div>
		{/if}
		{#if end}
			<div class="fluent-footer__end">{@render end()}</div>
		{/if}
	{:else}
		{@render children?.()}
	{/if}
</footer>
