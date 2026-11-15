<!-- @component
Wrapper for `<fluent-radio-group>`: holds the selected value of its `<Radio>` children (via context) and supports arrow-key selection.

```svelte
<RadioGroup label="Size" bind:value orientation="vertical">
	<Radio value="s">Small</Radio>
	<Radio value="l">Large</Radio>
</RadioGroup>
```
-->

<script lang="ts" module>
	import {fluentRadioGroup} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentRadioGroup())
</script>

<script lang="ts">
	import {radioGroupContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, Orientation, RestProps} from "../types/index.js"

	type OwnProps = {
		/** Value of the checked radio (`value` attribute). Bindable. */
		value?: string | null
		/** Form field name shared by the radios (`name` attribute). */
		name?: string
		/** Text rendered in a `<label>` above the group. */
		label?: string
		/** Custom label content, rendered after `label`. */
		labelTemplate?: Snippet
		/** Accessible name (`aria-label`). */
		ariaLabel?: string
		/** Layout of the radios (`orientation` attribute). Default: `horizontal` (element default). */
		orientation?: Orientation
		/** Selection can't be changed (`readonly` attribute). */
		readonly?: boolean
		/** Disables all radios (`disabled` attribute). */
		disabled?: boolean
		/** Focus the group on mount (`autofocus` attribute). */
		autofocus?: boolean
		/** Extra CSS class on `<fluent-radio-group>`. */
		class?: string
		/** Inline style on `<fluent-radio-group>`. */
		style?: string
		/** The `<Radio>` items. */
		children?: Snippet
		/** Fires when the user selects a different radio. */
		onChange?: (ctx: {value: string}) => void
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
	}

	/** Other native attributes and events (`onkeydown`, `onfocusin`, …) go to `<fluent-radio-group>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		value = $bindable(),
		name = undefined,
		label = undefined,
		labelTemplate = undefined,
		ariaLabel = undefined,
		orientation = undefined,
		readonly = undefined,
		disabled = undefined,
		autofocus = undefined,
		class: className = undefined,
		style = undefined,
		children = undefined,
		onChange = undefined,
		onchange = undefined,
		...rest
	}: Props = $props()

	const ctx = $state({
		get value() { return value },
		setValue
	})

	radioGroupContext.set(ctx)

	function setValue(newValue: string) {
		if (disabled || readonly || newValue === value) {
			return
		}

		value = newValue
		onChange?.({value: newValue})
	}

	// Arrow keys move the checked radio inside FAST's group without a click;
	// the group then reports its new value via `change`.
	function handleGroupChange(ev: Event) {
		onchange?.(ev)
		const next = (ev.currentTarget as HTMLElement & {value?: string}).value
		if (next) setValue(next)
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
<fluent-radio-group
	{...rest}
	{...attrs({
		value, name, orientation, readonly, disabled, autofocus,
		"aria-label": ariaLabel, class: className, style
	})}
	onchange={handleGroupChange}
>
	{@render children?.()}
</fluent-radio-group>
