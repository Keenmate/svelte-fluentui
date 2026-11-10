<script lang="ts" module>
	import {fluentSlider} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentSlider())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"

	type Props = {
		id?: string
		value?: number | null
		min?: number
		max?: number
		step?: number
		orientation?: "horizontal" | "vertical"
		disabled?: boolean
		readonly?: boolean
		required?: boolean
		name?: string
		label?: string
		labelTemplate?: Snippet
		ariaLabel?: string
		class?: string
		style?: string
		children?: Snippet
		/** Fires when the user commits a new value; the live value while dragging is `bind:value`. */
		onChange?: (ctx: {value: number}) => void
	}

	let {
		id = undefined,
		value = $bindable(),
		min = 0,
		max = 10,
		step = 1,
		orientation = "horizontal",
		disabled = undefined,
		readonly = undefined,
		required = undefined,
		name = undefined,
		label = undefined,
		labelTemplate = undefined,
		ariaLabel = undefined,
		class: className = "",
		style = "",
		children = undefined,
		onChange = undefined
	}: Props = $props()

	let element: (HTMLElement & {value: string; valueAsNumber: number}) | undefined = $state()

	// Keep the web component's value in sync with the bound `value` prop.
	// fluent-slider exposes `value` as a string attribute, so we set it directly
	// on the element to avoid attribute/property mismatch warnings.
	$effect(() => {
		if (!element) return
		const next = value ?? min
		const str = String(next)
		if (element.value !== str) {
			element.value = str
		}
	})

	function handleChange(ev: Event) {
		const target = ev.target as HTMLElement & {valueAsNumber: number}
		const numeric = Number(target.valueAsNumber)
		if (!Number.isNaN(numeric)) {
			value = numeric
			onChange?.({value: numeric})
		}
	}

	function handleInput(ev: Event) {
		const target = ev.target as HTMLElement & {valueAsNumber: number}
		const numeric = Number(target.valueAsNumber)
		if (!Number.isNaN(numeric)) {
			value = numeric
		}
	}
</script>

{#if label || labelTemplate}
	<label for={id} class="fluent-field-label">
		{#if label}{label}{/if}
		{#if labelTemplate}{@render labelTemplate?.()}{/if}
	</label>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<fluent-slider
	bind:this={element}
	{...attrs({id, min, max, step, orientation, disabled, readonly, required, name, class: className, style})}
	{...(ariaLabel || label ? { "aria-label": ariaLabel || label } : {})}
	onchange={handleChange}
	oninput={handleInput}
>
	{#if children}
		{@render children()}
	{/if}
</fluent-slider>
