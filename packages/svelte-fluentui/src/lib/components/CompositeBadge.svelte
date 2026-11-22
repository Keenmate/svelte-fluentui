<!-- @component
Three-section `[icon][label][button]` chip for notification pills, status + count or dismissible chips.

```svelte
<CompositeBadge color="success" onButtonClick={remove}>{#snippet label()}Approved{/snippet}</CompositeBadge>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import {buttonLike} from "../helpers/button-like.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {CompositeBadgeLabels} from "../i18n/labels.js"
	/**
	 * CompositeBadge — a three-section chip: [icon][label][button].
	 * Use for notification pills, status + count, or interactive/dismissible
	 * chips. Ported from pure-admin's `pa-composite-badge`.
	 *
	 * Each section can take the base `color`, or you can override the label and
	 * button sections independently via `labelColor` / `buttonColor` (e.g. a
	 * success chip with a red `danger` dismiss button). Colours resolve from the
	 * shared semantic palette (`--fluent-color-<name>-*`).
	 */

	type CompositeColor =
		| "primary"
		| "secondary"
		| "success"
		| "warning"
		| "danger"
		| "info"
		| "light"
		| "dark"
		| "brand"
		| "important"
		| "informative"

	type OwnProps = {
		/** Palette colour for all sections. Default: `"primary"`. */
		color?: CompositeColor
		/** Override only the label (middle) section colour. */
		labelColor?: CompositeColor
		/** Override only the button (right) section colour. Defaults to `color`. */
		buttonColor?: CompositeColor
		/** Icon slot (left section). Section is omitted when not provided. */
		icon?: Snippet
		/** Label content (middle section). */
		label?: Snippet
		/** Button content (right section). Defaults to a `×` dismiss glyph. */
		button?: Snippet
		/** Render the button section. Default: `true`. */
		showButton?: boolean
		/** Tooltip of the button; with the built-in × also its accessible name (default `labels.dismissAriaLabel`). */
		buttonTitle?: string
		/** Overrides of the built-in text (`svelteFluentUI.compositeBadge.*` keys) for this instance. An explicit `buttonTitle` wins. */
		labels?: CompositeBadgeLabels
		/** Fires when the user clicks the label section (makes it look clickable). */
		onLabelClick?: (ctx: {sourceEvent: MouseEvent}) => void
		/** Fires when the user clicks the button section. */
		onButtonClick?: (ctx: {sourceEvent: MouseEvent}) => void
		/** Extra classes for the root `<div>`. */
		class?: string
		/** Inline style for the root `<div>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `title`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		color = "primary",
		labelColor = undefined,
		buttonColor = undefined,
		icon = undefined,
		label = undefined,
		button = undefined,
		showButton = true,
		buttonTitle = undefined,
		onLabelClick = undefined,
		onButtonClick = undefined,
		labels: labelsProp = undefined,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	const t = useTranslations("compositeBadge", () => labelsProp)
	// The built-in × glyph needs a name; custom `button` content names itself.
	const buttonAriaLabel = $derived(button ? null : buttonTitle || t("dismissAriaLabel"))

	let classes = $derived.by(() => {
		let cls = ["composite-badge", `composite-badge-${color}`]
		if (labelColor) cls.push(`composite-badge-label-${labelColor}`)
		if (buttonColor) cls.push(`composite-badge-btn-${buttonColor}`)
		if (onLabelClick) cls.push("is-clickable")
		if (className) cls.push(className)
		return cls.join(" ")
	})
</script>

<div {...rest} class={classes} style={style || null}>
	{#if icon}<span class="composite-badge-icon">{@render icon()}</span>{/if}
	<!-- With `onLabelClick` the label becomes role="button" + tab stop + Enter / Space (buttonLike). -->
	<span
		{...buttonLike(!!onLabelClick)}
		class="composite-badge-label"
		onclick={onLabelClick ? (event) => onLabelClick({sourceEvent: event}) : undefined}
	>
		{@render label?.()}
	</span>
	{#if showButton}
		<button
			class="composite-badge-button"
			type="button"
			title={buttonTitle || null}
			aria-label={buttonAriaLabel}
			onclick={(event) => onButtonClick?.({sourceEvent: event})}
		>
			{#if button}{@render button()}{:else}&times;{/if}
		</button>
	{/if}
</div>

<style>
	.composite-badge {
		display: inline-flex;
		align-items: stretch;
		height: 24px;
		font-family: var(--body-font);
		font-size: var(--type-ramp-minus-1-font-size, 12px);
		font-weight: 500;
		border-radius: var(--control-corner-radius, 4px);
		overflow: hidden;
		box-sizing: border-box;
	}

	.composite-badge-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		padding: 0 6px;
		flex-shrink: 0;
		background-color: var(--_v-solid);
		color: var(--_v-contrast);
	}

	.composite-badge-label {
		display: flex;
		align-items: center;
		padding: 0 8px;
		background-color: var(--_lv-tint, var(--_v-tint));
		color: var(--_lv-emphasis, var(--_v-emphasis));
		user-select: none;
		transition: background-color 150ms ease;
	}

	.composite-badge.is-clickable .composite-badge-label {
		cursor: pointer;
	}

	.composite-badge.is-clickable .composite-badge-label:hover {
		background-color: color-mix(in srgb, var(--_lv-emphasis, var(--_v-emphasis)) 18%, transparent);
	}

	.composite-badge-button {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		padding: 0 6px;
		flex-shrink: 0;
		border: none;
		font: inherit;
		line-height: 1;
		cursor: pointer;
		background-color: var(--_bv-solid, var(--_v-solid));
		color: var(--_bv-contrast, var(--_v-contrast));
		transition: filter 150ms ease;
	}

	.composite-badge-button:hover {
		filter: brightness(0.92);
	}

	.composite-badge-button:focus-visible {
		outline: 2px solid var(--focus-stroke-outer, currentColor);
		outline-offset: -2px;
	}

	/* Variant palette — sets the section colour vars for all three sections. */
	.composite-badge-primary {
		--_v-solid: var(--fluent-color-primary, #0078d4);
		--_v-contrast: var(--fluent-color-primary-contrast, #fff);
		--_v-tint: var(--fluent-color-primary-tint, rgba(0, 120, 212, 0.12));
		--_v-emphasis: var(--fluent-color-primary-emphasis, #0067b8);
	}
	.composite-badge-secondary {
		--_v-solid: var(--fluent-color-secondary, #616161);
		--_v-contrast: var(--fluent-color-secondary-contrast, #fff);
		--_v-tint: var(--fluent-color-secondary-tint, rgba(97, 97, 97, 0.12));
		--_v-emphasis: var(--fluent-color-secondary-emphasis, #424242);
	}
	.composite-badge-success {
		--_v-solid: var(--fluent-color-success, #107c10);
		--_v-contrast: var(--fluent-color-success-contrast, #fff);
		--_v-tint: var(--fluent-color-success-tint, rgba(16, 124, 16, 0.12));
		--_v-emphasis: var(--fluent-color-success-emphasis, #0e700e);
	}
	.composite-badge-warning {
		--_v-solid: var(--fluent-color-warning, #fde300);
		--_v-contrast: var(--fluent-color-warning-contrast, #242424);
		--_v-tint: var(--fluent-color-warning-tint, rgba(253, 227, 0, 0.22));
		--_v-emphasis: var(--fluent-color-warning-emphasis, #8a6d00);
	}
	.composite-badge-danger {
		--_v-solid: var(--fluent-color-danger, #c50f1f);
		--_v-contrast: var(--fluent-color-danger-contrast, #fff);
		--_v-tint: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
		--_v-emphasis: var(--fluent-color-danger-emphasis, #b10e1e);
	}
	.composite-badge-info {
		--_v-solid: var(--fluent-color-info, #0a94d6);
		--_v-contrast: var(--fluent-color-info-contrast, #fff);
		--_v-tint: var(--fluent-color-info-tint, rgba(10, 148, 214, 0.12));
		--_v-emphasis: var(--fluent-color-info-emphasis, #0a6a9a);
	}
	.composite-badge-light {
		--_v-solid: var(--fluent-color-light, #f0f0f0);
		--_v-contrast: var(--fluent-color-light-contrast, #242424);
		--_v-tint: var(--fluent-color-light-tint, #f5f5f5);
		--_v-emphasis: var(--fluent-color-light-emphasis, #8a8a8a);
	}
	.composite-badge-dark {
		--_v-solid: var(--fluent-color-dark, #242424);
		--_v-contrast: var(--fluent-color-dark-contrast, #fff);
		--_v-tint: var(--fluent-color-dark-tint, rgba(36, 36, 36, 0.1));
		--_v-emphasis: var(--fluent-color-dark-emphasis, #242424);
	}
	.composite-badge-brand {
		--_v-solid: var(--fluent-color-brand, #0078d4);
		--_v-contrast: var(--fluent-color-brand-contrast, #fff);
		--_v-tint: var(--fluent-color-brand-tint, rgba(0, 120, 212, 0.12));
		--_v-emphasis: var(--fluent-color-brand-emphasis, #0067b8);
	}
	.composite-badge-important {
		--_v-solid: var(--fluent-color-important, #242424);
		--_v-contrast: var(--fluent-color-important-contrast, #fff);
		--_v-tint: var(--fluent-color-important-tint, rgba(36, 36, 36, 0.1));
		--_v-emphasis: var(--fluent-color-important-emphasis, #242424);
	}
	.composite-badge-informative {
		--_v-solid: var(--fluent-color-informative, #f0f0f0);
		--_v-contrast: var(--fluent-color-informative-contrast, #242424);
		--_v-tint: var(--fluent-color-informative-tint, #f5f5f5);
		--_v-emphasis: var(--fluent-color-informative-emphasis, #8a8a8a);
	}

	/* Label-section overrides */
	.composite-badge-label-primary {
		--_lv-tint: var(--fluent-color-primary-tint, rgba(0, 120, 212, 0.12));
		--_lv-emphasis: var(--fluent-color-primary-emphasis, #0067b8);
	}
	.composite-badge-label-secondary {
		--_lv-tint: var(--fluent-color-secondary-tint, rgba(97, 97, 97, 0.12));
		--_lv-emphasis: var(--fluent-color-secondary-emphasis, #424242);
	}
	.composite-badge-label-success {
		--_lv-tint: var(--fluent-color-success-tint, rgba(16, 124, 16, 0.12));
		--_lv-emphasis: var(--fluent-color-success-emphasis, #0e700e);
	}
	.composite-badge-label-warning {
		--_lv-tint: var(--fluent-color-warning-tint, rgba(253, 227, 0, 0.22));
		--_lv-emphasis: var(--fluent-color-warning-emphasis, #8a6d00);
	}
	.composite-badge-label-danger {
		--_lv-tint: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
		--_lv-emphasis: var(--fluent-color-danger-emphasis, #b10e1e);
	}
	.composite-badge-label-info {
		--_lv-tint: var(--fluent-color-info-tint, rgba(10, 148, 214, 0.12));
		--_lv-emphasis: var(--fluent-color-info-emphasis, #0a6a9a);
	}
	.composite-badge-label-light {
		--_lv-tint: var(--fluent-color-light-tint, #f5f5f5);
		--_lv-emphasis: var(--fluent-color-light-emphasis, #8a8a8a);
	}
	.composite-badge-label-dark {
		--_lv-tint: var(--fluent-color-dark-tint, rgba(36, 36, 36, 0.1));
		--_lv-emphasis: var(--fluent-color-dark-emphasis, #242424);
	}
	.composite-badge-label-brand {
		--_lv-tint: var(--fluent-color-brand-tint, rgba(0, 120, 212, 0.12));
		--_lv-emphasis: var(--fluent-color-brand-emphasis, #0067b8);
	}
	.composite-badge-label-important {
		--_lv-tint: var(--fluent-color-important-tint, rgba(36, 36, 36, 0.1));
		--_lv-emphasis: var(--fluent-color-important-emphasis, #242424);
	}
	.composite-badge-label-informative {
		--_lv-tint: var(--fluent-color-informative-tint, #f5f5f5);
		--_lv-emphasis: var(--fluent-color-informative-emphasis, #8a8a8a);
	}

	/* Button-section overrides */
	.composite-badge-btn-primary {
		--_bv-solid: var(--fluent-color-primary, #0078d4);
		--_bv-contrast: var(--fluent-color-primary-contrast, #fff);
	}
	.composite-badge-btn-secondary {
		--_bv-solid: var(--fluent-color-secondary, #616161);
		--_bv-contrast: var(--fluent-color-secondary-contrast, #fff);
	}
	.composite-badge-btn-success {
		--_bv-solid: var(--fluent-color-success, #107c10);
		--_bv-contrast: var(--fluent-color-success-contrast, #fff);
	}
	.composite-badge-btn-warning {
		--_bv-solid: var(--fluent-color-warning, #fde300);
		--_bv-contrast: var(--fluent-color-warning-contrast, #242424);
	}
	.composite-badge-btn-danger {
		--_bv-solid: var(--fluent-color-danger, #c50f1f);
		--_bv-contrast: var(--fluent-color-danger-contrast, #fff);
	}
	.composite-badge-btn-info {
		--_bv-solid: var(--fluent-color-info, #0a94d6);
		--_bv-contrast: var(--fluent-color-info-contrast, #fff);
	}
	.composite-badge-btn-light {
		--_bv-solid: var(--fluent-color-light, #f0f0f0);
		--_bv-contrast: var(--fluent-color-light-contrast, #242424);
	}
	.composite-badge-btn-dark {
		--_bv-solid: var(--fluent-color-dark, #242424);
		--_bv-contrast: var(--fluent-color-dark-contrast, #fff);
	}
	.composite-badge-btn-brand {
		--_bv-solid: var(--fluent-color-brand, #0078d4);
		--_bv-contrast: var(--fluent-color-brand-contrast, #fff);
	}
	.composite-badge-btn-important {
		--_bv-solid: var(--fluent-color-important, #242424);
		--_bv-contrast: var(--fluent-color-important-contrast, #fff);
	}
	.composite-badge-btn-informative {
		--_bv-solid: var(--fluent-color-informative, #f0f0f0);
		--_bv-contrast: var(--fluent-color-informative-contrast, #242424);
	}
</style>
