<script lang="ts" module>
	import {fluentRadioGroup} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentRadioGroup())
</script>

<script lang="ts">
	import {radioGroupContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"

	type Props = {
		value?: string | null
		name?: string
		label?: string
		labelTemplate?: Snippet
		ariaLabel?: string
		orientation?: "horizontal" | "vertical"
		readonly?: boolean
		disabled?: boolean
		required?: boolean
		autofocus?: boolean
		placeholder?: string
		class?: string
		style?: string
		children?: Snippet
		onchange?: (value: string) => void
	}

	let {
		value = $bindable(),
		name = undefined,
		label = undefined,
		labelTemplate = undefined,
		ariaLabel = undefined,
		orientation = undefined,
		readonly = undefined,
		disabled = undefined,
		required = undefined,
		autofocus = undefined,
		placeholder = undefined,
		class: className = undefined,
		style = undefined,
		children = undefined,
		onchange = undefined
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
		onchange?.(newValue)
	}

	// Arrow keys move the checked radio inside FAST's group without a click;
	// the group then reports its new value via `change`.
	function handleGroupChange(ev: Event) {
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
	{...attrs({
		value, name, orientation, readonly, disabled, autofocus, placeholder,
		"aria-label": ariaLabel, class: className, style
	})}
	onchange={handleGroupChange}
>
	{@render children?.()}
</fluent-radio-group>
