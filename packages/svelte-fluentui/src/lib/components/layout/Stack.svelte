<!-- @component
Flexbox container laying its children out vertically or horizontally with gap and alignment.

```svelte
<Stack orientation="horizontal" gap="8px" verticalAlign="center">…</Stack>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Stacked items. */
		children?: Snippet
		/** Flex direction. Default: `"vertical"`. */
		orientation?: Orientation
		/** Horizontal alignment (main axis when horizontal, cross axis when vertical — `space-*` only applies on the main axis). */
		horizontalAlign?: "start" | "center" | "end" | "stretch" | "space-between" | "space-around"
		/** Vertical alignment (main axis when vertical, cross axis when horizontal — `space-*` only applies on the main axis). */
		verticalAlign?: "start" | "center" | "end" | "stretch" | "space-between" | "space-around"
		/** CSS `row-gap` (any CSS length). */
		verticalGap?: string
		/** CSS `column-gap` (any CSS length). */
		horizontalGap?: string
		/** CSS `gap` for both axes (any CSS length), e.g. `"8px"`. */
		gap?: string
		/** CSS width of the stack. */
		width?: string
		/** CSS height of the stack. */
		height?: string
		/** Reverse the item order (`row-reverse` / `column-reverse`). Default: `false`. */
		reversed?: boolean
		/** Allow children to wrap onto multiple lines when they overflow the main axis. */
		wrap?: boolean
		/** Extra CSS classes. */
		class?: string
		/** Inline style for the root `<div>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, `onclick`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		orientation = "vertical",
		horizontalAlign = undefined,
		verticalAlign = undefined,
		verticalGap = undefined,
		horizontalGap = undefined,
		gap = undefined,
		width = undefined,
		height = undefined,
		reversed = false,
		wrap = false,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	const computedClass = $derived(
		[
			`stack-${orientation}`,
			verticalAlign && `vertical-align-${verticalAlign}`,
			horizontalAlign && `horizontal-align-${horizontalAlign}`,
			className
		]
			.filter((x) => x)
			.join(" ")
			.trim()
	)
</script>

<div
	{...rest}
	class={computedClass}
	data-reverse={reversed ? "true" : undefined}
	style:flex-wrap={wrap ? "wrap" : undefined}
	style:gap
	style:row-gap={verticalGap}
	style:column-gap={horizontalGap}
	style:width
	style:height
	{style}
>
	{@render children?.()}
</div>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		/* Microsoft FluentUI Blazor Stack styles */
		.stack-vertical {
			display: flex;
			flex-direction: column;
		}

		.stack-horizontal {
			display: flex;
			flex-direction: row;
		}

		.stack-vertical[data-reverse="true"] {
			flex-direction: column-reverse;
		}

		.stack-horizontal[data-reverse="true"] {
			flex-direction: row-reverse;
		}

		/* Vertical alignment (cross-axis for vertical, main-axis for horizontal) */
		.stack-vertical.vertical-align-start {
			justify-content: flex-start;
		}
		.stack-vertical.vertical-align-center {
			justify-content: center;
		}
		.stack-vertical.vertical-align-end {
			justify-content: flex-end;
		}
		.stack-vertical.vertical-align-stretch {
			justify-content: stretch;
		}
		.stack-vertical.vertical-align-space-between {
			justify-content: space-between;
		}
		.stack-vertical.vertical-align-space-around {
			justify-content: space-around;
		}

		.stack-horizontal.vertical-align-start {
			align-items: flex-start;
		}
		.stack-horizontal.vertical-align-center {
			align-items: center;
		}
		.stack-horizontal.vertical-align-end {
			align-items: flex-end;
		}
		.stack-horizontal.vertical-align-stretch {
			align-items: stretch;
		}

		/* Horizontal alignment (cross-axis for horizontal, main-axis for vertical) */
		.stack-horizontal.horizontal-align-start {
			justify-content: flex-start;
		}
		.stack-horizontal.horizontal-align-center {
			justify-content: center;
		}
		.stack-horizontal.horizontal-align-end {
			justify-content: flex-end;
		}
		.stack-horizontal.horizontal-align-stretch {
			justify-content: stretch;
		}
		.stack-horizontal.horizontal-align-space-between {
			justify-content: space-between;
		}
		.stack-horizontal.horizontal-align-space-around {
			justify-content: space-around;
		}

		.stack-vertical.horizontal-align-start {
			align-items: flex-start;
		}
		.stack-vertical.horizontal-align-center {
			align-items: center;
		}
		.stack-vertical.horizontal-align-end {
			align-items: flex-end;
		}
		.stack-vertical.horizontal-align-stretch {
			align-items: stretch;
		}
	}
</style>
