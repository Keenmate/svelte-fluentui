<!-- @component
Wrapper for `<fluent-radio>`. Inside a `RadioGroup` it reads and sets the group's value through context.

```svelte
<RadioGroup bind:value>
	<Radio value="a">Option A</Radio>
	<Radio value="b">Option B</Radio>
</RadioGroup>
```
-->

<script lang="ts" module>
	import {fluentRadio} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentRadio())
</script>

<script lang="ts">
	import {radioGroupContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Value this radio represents (`value` attribute); becomes the group's value when picked. */
		value: string
		/** Text rendered in a `<label>` above the radio (use `children` for the inline label). */
		label?: string
		/** Custom label content, rendered after `label`. */
		labelTemplate?: Snippet
		/** Accessible name (`aria-label`). */
		ariaLabel?: string
		/** Form field name (`name` attribute). */
		name?: string
		/** Can't be changed by the user (`readonly` attribute). */
		readonly?: boolean
		/** Disables the radio (`disabled` attribute). */
		disabled?: boolean
		/** Marks the radio as required (`required` attribute). */
		required?: boolean
		/** Force the checked state (`checked` attribute). Default: derived from the parent `RadioGroup` value. */
		checked?: boolean
		/** Focus the radio on mount (`autofocus` attribute). */
		autofocus?: boolean
		/** Extra CSS class on `<fluent-radio>`. */
		class?: string
		/** Inline style on `<fluent-radio>`. */
		style?: string
		/** Inline label content (the element's default slot). */
		children?: Snippet
		/** Native `click` event, forwarded untouched. */
		onclick?: (event: MouseEvent) => void
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, …) go to `<fluent-radio>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		value,
		label = undefined,
		labelTemplate = undefined,
		ariaLabel = undefined,
		name = undefined,
		readonly = undefined,
		disabled = undefined,
		required = undefined,
		checked = undefined,
		autofocus = undefined,
		class: className = undefined,
		style = undefined,
		children = undefined,
		onclick = undefined,
		...rest
	}: Props = $props()

	const ctx = radioGroupContext.get()

	// Determine if checked - explicit prop takes precedence over context
	const isChecked = $derived(checked !== undefined ? checked : (ctx?.value === value))

	function handleOnClick(ev: MouseEvent) {
		onclick?.(ev)
		if (disabled || readonly) {
			return
		}

		ctx?.setValue(value)
	}
</script>

{#if label || labelTemplate}
	<label class="fluent-field-label">
		{#if label}
			{label}
		{/if}
		{#if labelTemplate}
			{@render labelTemplate?.()}
		{/if}
	</label>
{/if}

<!-- svelte-ignore a11y_autofocus -->
<fluent-radio
	{...rest}
	{value}
	{...attrs({
		name, disabled, readonly, required, checked: isChecked, autofocus, "aria-label": ariaLabel,
		class: className, style
	})}
	onclick={handleOnClick}
>
	{@render children?.()}
</fluent-radio>

