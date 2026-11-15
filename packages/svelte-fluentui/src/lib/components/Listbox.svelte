<script lang="ts" module>
	import {fluentListbox} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentListbox())
</script>

<script lang="ts">
	import {selectedOptionsContext} from "../contexts.js"
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import {untrack} from "svelte"
	import type {NativeEventHandler, RestProps, SelectedValue} from "../types/index.js"
	import {createSelectedOptions} from "../data/selected-options.svelte.js"

	type ValueType = string | string[] | null | undefined

	type OwnProps = {
		/** Selected value (array when `multiple`). Bindable. */
		value?: ValueType
		/** Allow selecting more than one option. */
		multiple?: boolean
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
		/** Fires when the user selects or deselects an option. */
		onChange?: (ctx: {value: ValueType}) => void
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, …) go to `<fluent-listbox>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		value = $bindable(),
		multiple = undefined,
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
		onChange = undefined,
		onchange = undefined,
		...rest
	}: Props = $props()

	// Combine width/height with style (default width: 100%)
	// Note: height is exposed as the private --_listbox-max-height; nothing reads it yet
	// (<fluent-listbox> 2.6 has no max-height hook), so the prop has no visual effect.
	const computedStyle = $derived.by(() => {
		const styles: string[] = [`width: ${width || '100%'}`]
		if (height) {
			styles.push(`--_listbox-max-height: ${height}`)
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
	const selectedOptions = createSelectedOptions(value, multiple)
	selectedOptionsContext.set(selectedOptions)

	// The context holds an array; the public `value` is a string in single mode.
	function fromContext(current: SelectedValue): ValueType {
		return multiple ? (current ?? []) : (current?.[0] ?? null)
	}

	// An Option click toggles the context; that is the only user-driven change,
	// so onChange fires from here (not from external `value` assignments).
	const toggleOption = selectedOptions.toggle
	selectedOptions.toggle = (optionValue) => {
		toggleOption.call(selectedOptions, optionValue)
		value = fromContext(selectedOptions.value)
		onChange?.({value})
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
	{...rest}
	{...attrs({disabled, autofocus, name, size})}
	aria-label={ariaLabel || null}
	class={className || null}
	style={computedStyle}
	multiple={multiple || null}
	onchange={handleOnChange}
>
	{@render children?.()}
</fluent-listbox>
