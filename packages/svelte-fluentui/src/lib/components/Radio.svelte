<script lang="ts" module>
	import {fluentRadio} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentRadio())
</script>

<script lang="ts">
	import {radioGroupContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"

	type Props = {
		value: string
		label?: string
		labelTemplate?: Snippet
		ariaLabel?: string
		name?: string
		readonly?: boolean
		disabled?: boolean
		required?: boolean
		checked?: boolean
		autofocus?: boolean
		class?: string
		style?: string
		children?: Snippet
	}

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
		children = undefined
	}: Props = $props()

	const ctx = radioGroupContext.get()

	// Determine if checked - explicit prop takes precedence over context
	const isChecked = $derived(checked !== undefined ? checked : (ctx?.value === value))

	function handleOnClick(ev: MouseEvent) {
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
	{value}
	{...attrs({
		name, disabled, readonly, required, checked: isChecked, autofocus, "aria-label": ariaLabel,
		class: className, style
	})}
	onclick={handleOnClick}
>
	{@render children?.()}
</fluent-radio>

