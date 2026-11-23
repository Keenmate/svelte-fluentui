<!-- @component
A single listbox row for `Select`, `Combobox` and `Listbox` (plain themed `<div role="option">`). Selection comes from the parent's `selected-options` context.

```svelte
<Select bind:value>
	<Option value="cz">Czechia</Option>
</Select>
```
-->

<!--
 * Option Component
 *
 * Renders a single listbox option as a plain themed <div role="option">.
 *
 * Previously this wrapped <fluent-option> (a FAST custom element with its own
 * shadow DOM). Now that Select/Combobox/Autocomplete are all custom components
 * that own their listbox, style options via design tokens, and drive highlight/
 * filter/selection with data-attributes, <fluent-option> only added cost: every
 * option was a custom element whose shadow-DOM upgrade blocked the main thread
 * on open (~185ms for ~60 options). A plain <div> renders instantly and gives us
 * full CSS control — Autocomplete already renders plain option buttons.
 *
 * The public API (value, label, data, icon, selected, disabled) and the
 * 'selected-options' context contract are unchanged, so this stays a drop-in.
 * Parents read `data-value` / `data-option-label` / `data-option-context`
 * and set `data-highlighted` / `data-filtered-out` / `disabled` on this element.
-->

<script lang="ts">
	import {selectedOptionsContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Value written to the parent's selection when this option is picked. */
		value: string
		/** Text used for filtering, type-ahead and the trigger display. Default: the rendered text. */
		label?: string
		/** Extra CSS class on the row. */
		class?: string
		/** Inline style on the row. */
		style?: string
		/** Native `click` on the row, called after the context selection toggled (not called when disabled). */
		onclick?: (ev: MouseEvent) => void
		/** Initially selected, like a native `<option selected>`: seeds the parent's selection on its first
		 * render (ignored when the parent's `value` is set), then the selection decides and the row can be
		 * deselected. Outside a Select / Combobox / Listbox it marks the row selected. */
		selected?: boolean
		/** Option can't be highlighted or selected. Default: `false`. */
		disabled?: boolean
		/** Arbitrary context data, reported as `option.data` in the parent's `onChange` when this option is picked. */
		data?: Record<string, unknown>
		/** Icon slot rendered before option text */
		icon?: Snippet
		/** Row content (the option's display text). */
		children: Snippet
	}

	/** Other native attributes and events (`title`, `data-*`, `onpointerenter`, …) go to the row `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		value,
		label = undefined,
		class: className = undefined,
		style = undefined,
		disabled = false,
		selected = undefined,
		onclick = undefined,
		data = undefined,
		icon = undefined,
		children,
		...rest
	}: Props = $props()

	const selectedValue = selectedOptionsContext.get()

	// Unique per instance: the parent's input / trigger points `aria-activedescendant`
	// at the highlighted row's id (focus stays on the input). A consumer `id` wins.
	const uid = $props.id()
	const optionId = $derived((rest.id as string | undefined) || `fluent-option-${uid}`)

	// svelte-ignore state_referenced_locally
	if (selected) selectedValue?.preselect?.(value)

	// Inside a parent the shared selection decides (reading ctx.value tracks it); standalone, `selected`.
	const isSelected = $derived(selectedValue ? !!selectedValue.value?.includes(value) : !!selected)

	function handleOnClick(ev: MouseEvent) {
		if (disabled) {
			return
		}

		// Only handle context-based selection if we're in a listbox parent.
		if (selectedValue) {
			selectedValue.toggle(value)
		}

		onclick?.(ev)
	}
</script>

<!-- The keyboard lives on the parent's input / trigger (aria-activedescendant
     pattern), so the row itself takes clicks only. -->
<div
	{...rest}
	id={optionId}
	class={`fluent-option${className ? ` ${className}` : ""}`}
	role="option"
	aria-selected={isSelected ? "true" : "false"}
	data-value={value}
	data-option-label={label ?? null}
	data-option-context={data ? JSON.stringify(data) : null}
	{...disabled ? {disabled: "", "aria-disabled": "true"} : {}}
	{...attrs({style})}
	onclick={handleOnClick}
>
	{#if icon}
		<span class="option-icon">
			{@render icon()}
		</span>
	{/if}
	{@render children()}
</div>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		/* One row of a listbox. Sized/typed against FluentUI design tokens so it
	 * matches the trigger and the rest of the library. Scoped styles live here
	 * (not in each parent) so the same look applies wherever an Option renders —
	 * portalled popover, inline multi-select list, etc. */
		.fluent-option {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
			box-sizing: border-box;
			flex-shrink: 0;
			min-height: calc((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) * 1px);
			padding: 0 calc(var(--design-unit, 4) * 2 * 1px);
			font-family: inherit;
			font-size: var(--type-ramp-base-font-size, 14px);
			line-height: var(--type-ramp-base-line-height, 20px);
			color: var(--neutral-foreground-rest, #242424);
			border-radius: calc(var(--control-corner-radius, 4) * 1px);
			cursor: pointer;
			user-select: none;
		}

		.fluent-option:hover:not([disabled]),
		.fluent-option[data-highlighted]:not([disabled]) {
			background: var(--neutral-fill-stealth-hover, #f0f0f0);
		}

		/* Accent tint, not a neutral fill: --neutral-fill-secondary-rest is a near-invisible step
		   from the listbox background in dark mode */
		.fluent-option[aria-selected="true"] {
			background: var(--fluent-option-bg-selected, var(--fluent-color-primary-tint));
			font-weight: 600;
		}

		.fluent-option[aria-selected="true"]:hover:not([disabled]),
		.fluent-option[aria-selected="true"][data-highlighted]:not([disabled]) {
			background: var(
				--fluent-option-bg-selected-hover,
				color-mix(in srgb, var(--accent-fill-rest, #0078d4) 20%, transparent)
			);
		}

		.fluent-option[disabled] {
			opacity: 0.5;
			cursor: not-allowed;
		}

		/* Parents (Combobox) hide non-matching rows by toggling this attribute. */
		.fluent-option[data-filtered-out] {
			display: none !important;
		}

		.option-icon {
			display: inline-flex;
			align-items: center;
			flex-shrink: 0;
		}
	}
</style>
