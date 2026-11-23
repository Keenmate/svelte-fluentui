<!-- @component
Lightweight tag-style indicator: tinted fill + coloured border in one of six semantic colours.

```svelte
<Label color="info" outline>Beta</Label>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import {buttonLike} from "../helpers/button-like.js"
	/**
	 * Label — a lightweight, tag-style indicator: tinted background + coloured
	 * border in the variant colour, medium weight. Sits alongside Badge for
	 * inline content tags / category chips. Ported from pure-admin's `pa-label`.
	 *
	 * Colours resolve from the shared semantic palette
	 * (`--fluent-color-<name>-*`, see fluent-blazor-compat.scss).
	 */

	type LabelColor =
		"primary" | "secondary" | "success" | "warning" | "danger" | "info" | "brand" | "important" | "informative"
	type LabelSize = "extra-small" | "small" | "medium" | "large" | "extra-large"

	type OwnProps = {
		/** Semantic colour: primary, secondary, success, warning, danger, info, or Fluent's badge names brand / important / informative. Default: `"primary"`. */
		color?: LabelColor
		/** Size scale `extra-small` … `extra-large`. Default: `"medium"`. */
		size?: LabelSize
		/** Transparent background; fills with the tint on hover. */
		outline?: boolean
		/** Icon slot rendered before the label text. */
		icon?: Snippet
		/** Label text. */
		children?: Snippet
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		/** Extra classes for the root `<span>`. */
		class?: string
		/** Inline style for the root `<span>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `title`, `aria-*`, …) go to the root `<span>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		color = "primary",
		size = "medium",
		outline = false,
		icon = undefined,
		children = undefined,
		onclick = undefined,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	let classes = $derived.by(() => {
		let cls = ["fluent-label", `fluent-label-${color}`]
		if (size && size !== "medium") cls.push(`fluent-label-${size}`)
		if (outline) cls.push("fluent-label-outline")
		if (className) cls.push(className)
		return cls.join(" ")
	})
</script>

<!-- With `onclick` the label becomes role="button" + tab stop + Enter / Space (buttonLike). -->
<span {...buttonLike(!!onclick)} {...rest} class={classes} style={style || null} {onclick}>
	{#if icon}<span class="fluent-label-icon">{@render icon()}</span>{/if}
	{@render children?.()}
</span>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		.fluent-label {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			box-sizing: border-box;
			font-family: var(--body-font);
			font-size: var(--type-ramp-minus-1-font-size, 12px);
			font-weight: 500;
			line-height: 1.2;
			padding: 3px 8px;
			border-radius: var(--control-corner-radius, 4px);
			border: 1px solid transparent;
			text-decoration: none;
			transition:
				background-color 100ms ease,
				color 100ms ease,
				border-color 100ms ease;
		}

		.fluent-label-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		/* Size scale (mirrors Badge) */
		.fluent-label-extra-small {
			font-size: var(--type-ramp-minus-2-font-size, 10px);
			padding: 1px 4px;
		}

		.fluent-label-small {
			font-size: var(--type-ramp-minus-1-font-size, 12px);
			padding: 2px 6px;
		}

		.fluent-label-large {
			font-size: var(--type-ramp-base-font-size, 14px);
			padding: 4px 10px;
		}

		.fluent-label-extra-large {
			font-size: var(--type-ramp-plus-1-font-size, 16px);
			padding: 5px 12px;
		}

		/* Colour variants — tinted fill + coloured line, driven by the palette.
	   Each maps a --_lc (line colour) and --_tc (tint colour) so the shared
	   rules below stay DRY. */
		.fluent-label-primary {
			--_lc: var(--fluent-color-primary-emphasis, #0067b8);
			--_tc: var(--fluent-color-primary-tint, rgba(0, 120, 212, 0.12));
		}
		.fluent-label-secondary {
			--_lc: var(--fluent-color-secondary-emphasis, #424242);
			--_tc: var(--fluent-color-secondary-tint, rgba(97, 97, 97, 0.12));
		}
		.fluent-label-success {
			--_lc: var(--fluent-color-success-emphasis, #0e700e);
			--_tc: var(--fluent-color-success-tint, rgba(16, 124, 16, 0.12));
		}
		.fluent-label-warning {
			--_lc: var(--fluent-color-warning-emphasis, #8a6d00);
			--_tc: var(--fluent-color-warning-tint, rgba(253, 227, 0, 0.22));
		}
		.fluent-label-danger {
			--_lc: var(--fluent-color-danger-emphasis, #b10e1e);
			--_tc: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
		}
		.fluent-label-info {
			--_lc: var(--fluent-color-info-emphasis, #0a6a9a);
			--_tc: var(--fluent-color-info-tint, rgba(10, 148, 214, 0.12));
		}
		.fluent-label-brand {
			--_lc: var(--fluent-color-brand-emphasis, #0067b8);
			--_tc: var(--fluent-color-brand-tint, rgba(0, 120, 212, 0.12));
		}
		.fluent-label-important {
			--_lc: var(--fluent-color-important-emphasis, #242424);
			--_tc: var(--fluent-color-important-tint, rgba(36, 36, 36, 0.1));
		}
		.fluent-label-informative {
			--_lc: var(--fluent-color-informative-emphasis, #8a8a8a);
			--_tc: var(--fluent-color-informative-tint, #f5f5f5);
		}

		.fluent-label {
			background-color: var(--_tc);
			color: var(--_lc);
			border-color: var(--_lc);
		}

		.fluent-label:hover {
			background-color: var(--_tc);
		}

		/* Outline — transparent until hover */
		.fluent-label-outline {
			background-color: transparent;
		}

		.fluent-label-outline:hover {
			background-color: var(--_tc);
		}
	}
</style>
