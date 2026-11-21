<!-- @component
Small status/count indicator — a themed `<span>` with palette colours, appearances, sizes and optional truncation.

```svelte
<Badge fill="success" color="success">Done</Badge>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import {buttonLike} from "../helpers/button-like.js"
	/**
	 * Custom Badge Component - FluentUI styled
	 *
	 * Colours come from the shared `--fluent-color-<name>` palette (same as Label /
	 * CompositeBadge):
	 * - --fluent-color-[fill]: background colour
	 * - --fluent-color-[color]-contrast: text colour
	 *
	 * Built-in colours: primary, secondary, success, warning, danger, info, light, dark,
	 * severe, subtle. The Fluent badge names brand / important / informative are accepted
	 * as aliases of primary / dark / light. Any other name reads
	 * `--fluent-color-<name>` / `--fluent-color-<name>-contrast` (define them yourself).
	 */

	type BadgeColor =
		| "primary"
		| "secondary"
		| "success"
		| "warning"
		| "danger"
		| "info"
		| "light"
		| "dark"
		| "severe"
		| "subtle"
		| "brand"
		| "important"
		| "informative"
		| (string & {})

	// Fluent badge colour names → shared palette names.
	const colorAliases: Record<string, string> = {brand: "primary", important: "dark", informative: "light"}
	const paletteName = (name: string) => colorAliases[name] ?? name
	type BadgeAppearance = "accent" | "lightweight" | "neutral" | "outline" | "tint" | (string & {})
	type BadgeSize = "extra-small" | "small" | "medium" | "large" | "extra-large"

	type OwnProps = {
		/** Palette name for the text colour (`--fluent-color-<name>-contrast`); also used as the fill when `fill` is unset. */
		color?: BadgeColor
		/** Palette name for the background (`--fluent-color-<name>`). Default: `color`. */
		fill?: string
		/** Visual style: `accent`, `lightweight`, `neutral`, `outline`, `tint`. Default: `"lightweight"`. */
		appearance?: BadgeAppearance
		/** Size scale `extra-small` … `extra-large`. Default: `"medium"`. */
		size?: BadgeSize
		/** Fully rounded, at least as wide as tall (counts/dots). */
		circular?: boolean
		/** Pill-shaped corners. */
		pill?: boolean
		/** Custom `border-radius` (any CSS length); overrides `circular`/`pill`. */
		radius?: string
		/** Icon slot rendered before the label. */
		icon?: Snippet
		/**
		 * Truncate overflowing text with an ellipsis. Requires a width
		 * constraint (`maxWidth`) to take effect. Pair with `title` so the
		 * full text is available on hover.
		 */
		truncate?: boolean
		/**
		 * Truncate from the START instead of the end — the visible tail is
		 * what matters (file paths, breadcrumbs, hierarchies). Implies
		 * `truncate`.
		 */
		ellipsisStart?: boolean
		/** Max width for the badge (any CSS length). Drives truncation. */
		maxWidth?: string
		/** Native tooltip; surface the full text here when truncating. */
		title?: string
		/** Badge label. */
		children?: Snippet
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		/** Extra classes for the root `<span>`. */
		class?: string
		/** Inline style for the root `<span>` (appended after the computed colour styles). */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, `onkeydown`, …) go to the root `<span>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		color = undefined,
		fill = undefined,
		appearance = "lightweight",
		size = "medium",
		circular = false,
		pill = false,
		radius = undefined,
		icon = undefined,
		truncate = false,
		ellipsisStart = false,
		maxWidth = undefined,
		title = undefined,
		children = undefined,
		onclick = undefined,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	// ellipsisStart implies truncate
	let isTruncated = $derived(truncate || ellipsisStart)

	// Auto-set fill to color value if color is set but fill is not
	let effectiveFill = $derived(fill ?? color)

	// Build inline styles for color
	let colorStyles = $derived.by(() => {
		if (!color && !effectiveFill) return ""
		let styles = ""
		if (effectiveFill) {
			styles += `background-color: var(--fluent-color-${paletteName(effectiveFill)});`
		}
		if (color) {
			styles += `color: var(--fluent-color-${paletteName(color)}-contrast);`
		}
		return styles
	})

	let radiusStyle = $derived(radius ? `border-radius: ${radius};` : "")

	let maxWidthStyle = $derived(maxWidth ? `max-width: ${maxWidth};` : "")

	let computedStyle = $derived([colorStyles, radiusStyle, maxWidthStyle, style].filter(Boolean).join(" "))

	let classes = $derived.by(() => {
		let cls = ["badge"]
		if (appearance) cls.push(`badge-${appearance}`)
		if (size && size !== "medium") cls.push(`badge-${size}`)
		if (circular) cls.push("badge-circular")
		if (pill) cls.push("badge-pill")
		if (className) cls.push(className)
		return cls.join(" ")
	})
</script>

<!-- With `onclick` the badge becomes role="button" + tab stop + Enter / Space (buttonLike). -->
<span
	{...buttonLike(!!onclick)}
	{...rest}
	class={classes}
	style={computedStyle || null}
	title={title || null}
	{onclick}
>
	{#if icon}<span class="badge-icon">{@render icon()}</span>{/if}
	{#if isTruncated}
		<span class="badge-text" class:badge-ellipsis-start={ellipsisStart}>{@render children?.()}</span>
	{:else}
		{@render children?.()}
	{/if}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--body-font);
		font-size: var(--type-ramp-minus-1-font-size, 12px);
		font-weight: 600;
		line-height: var(--type-ramp-minus-1-line-height, 16px);
		padding: 2px 8px;
		border-radius: var(--control-corner-radius, 4px);
		box-sizing: border-box;
		min-height: 20px;
	}

	.badge-circular {
		border-radius: var(--fluent-border-radius-pill);
		min-width: 20px;
		padding: 2px 6px;
	}

	.badge-pill {
		border-radius: var(--fluent-border-radius-pill, 9999px);
	}

	/* Size scale */
	.badge-extra-small {
		font-size: var(--type-ramp-minus-2-font-size, 10px);
		line-height: var(--type-ramp-minus-2-line-height, 14px);
		padding: 0 4px;
		min-height: 16px;
	}

	.badge-small {
		font-size: var(--type-ramp-minus-1-font-size, 12px);
		padding: 1px 6px;
		min-height: 18px;
	}

	.badge-large {
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
		padding: 3px 10px;
		min-height: 24px;
	}

	.badge-extra-large {
		font-size: var(--type-ramp-plus-1-font-size, 16px);
		line-height: var(--type-ramp-plus-1-line-height, 22px);
		padding: 4px 12px;
		min-height: 28px;
	}

	/* Leading icon */
	.badge-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-inline-end: 4px;
	}

	/* Truncation — the badge stays flex; the text child owns the ellipsis so
	   a leading icon still lines up. Needs min-width:0 to shrink below content. */
	.badge-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Start-side ellipsis for paths/hierarchies where the end is the payload.
	   direction: rtl clips the leading edge; text-align keeps glyph order LTR. */
	.badge-ellipsis-start {
		direction: rtl;
		text-align: end;
	}

	:global([dir="rtl"]) .badge-ellipsis-start {
		direction: ltr;
	}

	/* Appearance variants */
	.badge-lightweight {
		background-color: transparent;
		color: var(--neutral-foreground-rest, #242424);
	}

	.badge-accent {
		background-color: var(--accent-fill-rest, #0078d4);
		color: var(--foreground-on-accent-rest, #ffffff);
	}

	.badge-neutral {
		background-color: var(--neutral-fill-secondary-rest, #f0f0f0);
		color: var(--neutral-foreground-rest, #242424);
	}

	.badge-outline {
		background-color: transparent;
		border: 1px solid var(--neutral-stroke-rest, #d1d1d1);
		color: var(--neutral-foreground-rest, #242424);
	}

	.badge-tint {
		background-color: var(--accent-fill-rest, #0078d4);
		opacity: 0.1;
		color: var(--accent-foreground-rest, #0078d4);
	}
</style>
