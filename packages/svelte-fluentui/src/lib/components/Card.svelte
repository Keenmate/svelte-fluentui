<!-- @component
Content container with FluentUI layer background, border and shadow.

```svelte
<Card width={320}>Content</Card>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Width; a number is px, a string any CSS length. */
		width?: string | number
		/** Height; a number is px, a string any CSS length. */
		height?: string | number
		/** Clip content and scroll (`overflow: auto`) instead of letting it overflow. */
		areaRestricted?: boolean
		/** Extra classes for the root `<div>`. */
		class?: string
		/** Inline style for the root `<div>` (`width`/`height` are appended). */
		style?: string
		/** Drop border, shadow and background — padding only. */
		minimalStyle?: boolean
		/** Card content. */
		children?: Snippet
	}

	/** Other native attributes and events (`id`, `onclick`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		width = undefined,
		height = undefined,
		areaRestricted = undefined,
		class: classParam = undefined,
		style: styleParam = undefined,
		minimalStyle = undefined,
		children = undefined,
		...rest
	}: Props = $props()

	let computedStyle = $derived.by(() => {
		let styles = styleParam || ""
		if (width) styles += ` width: ${typeof width === "number" ? width + "px" : width};`
		if (height) styles += ` height: ${typeof height === "number" ? height + "px" : height};`
		return styles
	})

	let computedClass = $derived.by(() => {
		let classes = "card " + (classParam || "")
		if (minimalStyle) classes += " minimal"
		if (areaRestricted) classes += " area-restricted"
		return classes.trim()
	})
</script>

<div {...rest} class={computedClass} style={computedStyle}>
	{@render children?.()}
</div>

<style>
	.card {
		padding: calc(var(--design-unit) * 5px);
		background: var(--neutral-layer-1, #ffffff);
		border-radius: var(--control-corner-radius, 4px);
		border: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
		overflow: visible;
		transition: box-shadow 0.2s ease;
	}

	.card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
	}

	.card.minimal {
		border: none;
		box-shadow: none;
		background: transparent;
	}

	.card.minimal:hover {
		box-shadow: none;
	}

	.card.area-restricted {
		overflow: auto;
	}
</style>
