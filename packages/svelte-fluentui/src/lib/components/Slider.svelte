<!-- @component
Range slider wrapping `<fluent-slider>`; `bind:value` is a number.

```svelte
<Slider label="Volume" min={0} max={100} bind:value={volume} />
```
-->
<script lang="ts" module>
	import {fluentSlider} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentSlider())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, Orientation, RestProps} from "../types/index.js"

	type OwnProps = {
		/** Id of `<fluent-slider>` (also the label's `for`). */
		id?: string
		/** Current value (bindable; updates live while dragging). `null`/unset shows `min`. */
		value?: number | null
		/** Lowest value (`min` attribute). Default: `0`. */
		min?: number
		/** Highest value (`max` attribute). Default: `10`. */
		max?: number
		/** Increment between values (`step` attribute). Default: `1`. */
		step?: number
		/** Track direction (`orientation` attribute). Default: `"horizontal"`. */
		orientation?: Orientation
		/** Disables the slider (`disabled` attribute). */
		disabled?: boolean
		/** Value shows but can't be changed (`readonly` attribute). */
		readonly?: boolean
		/** Marks the field required for form validation (`required` attribute). */
		required?: boolean
		/** Form field name (`name` attribute). */
		name?: string
		/** Visible label text rendered above the slider; also the fallback `aria-label`. */
		label?: string
		/** Custom label markup, rendered after `label` inside the `<label>`. */
		labelTemplate?: Snippet
		/** Accessible name (`aria-label`). Default: `label`. */
		ariaLabel?: string
		/** Extra CSS class on `<fluent-slider>`. */
		class?: string
		/** Inline style on `<fluent-slider>`. */
		style?: string
		/** Slotted content, typically `<fluent-slider-label>` tick marks. */
		children?: Snippet
		/** Fires when the user commits a new value; the live value while dragging is `bind:value`. */
		onChange?: (ctx: {value: number}) => void
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler
	}

	/** Other native attributes and events (`onkeydown`, `onpointerdown`, …) go to `<fluent-slider>`. */
	type Props = OwnProps & RestProps<OwnProps>

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
		onChange = undefined,
		onchange = undefined,
		oninput = undefined,
		...rest
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
		onchange?.(ev)
		const target = ev.target as HTMLElement & {valueAsNumber: number}
		const numeric = Number(target.valueAsNumber)
		if (!Number.isNaN(numeric)) {
			value = numeric
			onChange?.({value: numeric})
		}
	}

	function handleInput(ev: Event) {
		oninput?.(ev)
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
	{...rest}
	{...attrs({id, min, max, step, orientation, disabled, readonly, required, name, class: className, style})}
	{...(ariaLabel || label ? { "aria-label": ariaLabel || label } : {})}
	onchange={handleChange}
	oninput={handleInput}
>
	{#if children}
		{@render children()}
	{/if}
</fluent-slider>
