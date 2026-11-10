<script lang="ts">
	import type {Snippet} from "svelte"
	import {fluentListbox, provideFluentDesignSystem} from "@fluentui/web-components"
	import {setContext, untrack} from "svelte"
	import type {SelectedOptionSvelteContext} from "../types/combobox.js"
	import type {SelectedValue} from "../types/index.js"
	import {createSelectedOptions} from "../data/selected-options.svelte.js"

	provideFluentDesignSystem().register(fluentListbox())

	type ValueType = string | string[] | null | undefined

	type Props = {
		value: ValueType
		multi?: boolean
		disabled?: boolean
		autofocus?: boolean
		name?: string
		label?: string
		ariaLabel?: string
		width?: string
		height?: string
		size?: number
		class?: string
		style?: string
		children?: Snippet
		onchange?: (ev: Event) => void
	}

	let {
		value = $bindable(),
		multi = undefined,
		disabled = undefined,
		autofocus = undefined,
		name = undefined,
		label = undefined,
		ariaLabel = undefined,
		width = undefined,
		height = undefined,
		size = undefined,
		class: className = "",
		style = "",
		children = undefined,
		onchange = undefined
	}: Props = $props()

	// Combine width/height with style (default width: 100%)
	// Note: height uses --listbox-max-height CSS variable which the FluentUI web component uses internally
	const computedStyle = $derived.by(() => {
		const styles: string[] = [`width: ${width || '100%'}`]
		if (height) {
			styles.push(`--listbox-max-height: ${height}`)
		}
		if (style) styles.push(style)
		return styles.join('; ')
	})

	let element:
		| (HTMLElement & {
				length: number
				value: any
				selectedIndex: number
				options: HTMLOptionElement[]
				selectFirstOption: VoidFunction
		  })
		| undefined = $state()

	// svelte-ignore state_referenced_locally
	const selectedOptions = createSelectedOptions(value, multi)
	setContext<SelectedOptionSvelteContext>("selected-options", selectedOptions)

	// The context holds an array; the public `value` is a string in single mode.
	function fromContext(current: SelectedValue): ValueType {
		return multi ? (current ?? []) : (current?.[0] ?? null)
	}

	// Option click → context → bound value
	$effect(() => {
		const next = fromContext(selectedOptions.value)
		untrack(() => {
			if (JSON.stringify(next) !== JSON.stringify(value)) value = next
		})
	})

	// External value assignment → context
	$effect(() => {
		const next = selectedOptions.toContextValue(value)
		untrack(() => {
			if (JSON.stringify(next) !== JSON.stringify(selectedOptions.value)) selectedOptions.set(value)
		})
	})

	// Selection is owned by the Option children (via context); the native
	// change event is only forwarded.
	function handleOnChange(ev: Event) {
		onchange?.(ev)
	}
</script>

{#if label}
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label style="display: block; margin-bottom: 0.25rem;">{label}</label>
{/if}
<!-- svelte-ignore a11y_autofocus -->
<fluent-listbox
	bind:this={element}
	{...(disabled ? { disabled } : {})}
	{...(autofocus ? { autofocus } : {})}
	{...(name ? { name } : {})}
	{...(size !== undefined ? { size } : {})}
	aria-label={ariaLabel || null}
	class={className || null}
	style={computedStyle}
	multiple={multi || null}
	onchange={handleOnChange}
>
	{@render children?.()}
</fluent-listbox>
