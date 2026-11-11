<script lang="ts" module>
	import {fluentTextField} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTextField())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, RestProps} from "../types/index.js"
	import {setAutocompleteOnShadowInput, setAttributeOnShadowInput} from "../utils/shadow-dom.js"

	type OwnProps = {
		id?: string | null | undefined
		value?: string | null | undefined
		placeholder?: string | null | undefined
		appearance?: string | null | undefined
		disabled?: boolean | null | undefined
		readonly?: boolean | null | undefined
		required?: boolean | null | undefined
		type?: string | null | undefined
		name?: string | null | undefined
		label?: string | null | undefined
		labelTemplate?: Snippet | null | undefined
		autofocus?: boolean | null | undefined
		autocomplete?: string | null | undefined
		/** Max length of the typed value. Forwarded to the shadow-DOM `<input>` since fluent-text-field doesn't expose it. */
		maxlength?: number | null | undefined
		/** Min length required for the typed value. Forwarded to the shadow-DOM `<input>`. */
		minlength?: number | null | undefined
		/** Regex pattern attribute on the inner `<input>` — participates in native form validity (ValidityState.patternMismatch). */
		pattern?: string | null | undefined
		children?: Snippet | null | undefined
		/** Leading content (icon, prefix) rendered inside the input via the underlying `<fluent-text-field>`'s `start` slot. */
		start?: Snippet | null | undefined
		/** Trailing content (icon, suffix, action) rendered inside the input via the underlying `<fluent-text-field>`'s `end` slot. */
		end?: Snippet | null | undefined
		style?: string | null | undefined
		title?: string | null | undefined

		setSelectionRange?: (
			start: number,
			end: number,
			direction?: "forward" | "backward" | "none"
		) => void

		/** Fires when the user commits an edit (blur / Enter). The live value is `bind:value`. */
		onChange?: (ctx: {value: string}) => void
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, `onblur`, …) go to `<fluent-text-field>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		value = $bindable(),
		placeholder = undefined,
		appearance = undefined,
		disabled = undefined,
		readonly = undefined,
		required = undefined,
		type = undefined,
		name = undefined,
		label = undefined,
		labelTemplate = undefined,
		autofocus = undefined,
		autocomplete = "off",
		maxlength = undefined,
		minlength = undefined,
		pattern = undefined,
		children = undefined,
		start = undefined,
		end = undefined,
		style = "",
		title = undefined,

		onChange = undefined,
		oninput = undefined,
		onchange = undefined,
		...rest
	}: Props = $props()

	let element: HTMLElement & {
		value: string
		select: () => void
		checkValidity: () => boolean
		reportValidity: () => boolean
		setCustomValidity: (message: string) => void
		setSelectionRange: (
			start: number,
			end: number,
			direction?: "forward" | "backward" | "none"
		) => void
	}

	// Expose methods
	export function select() {
		element?.select()
	}

	export function checkValidity() {
		return element?.checkValidity()
	}

	export function reportValidity() {
		return element?.reportValidity()
	}

	export function setCustomValidity(message: string) {
		element?.setCustomValidity(message)
	}

	export function setSelectionRange(
		start: number,
		end: number,
		direction?: "forward" | "backward" | "none"
	) {
		element?.setSelectionRange(start, end, direction)
	}

	// Internal

	function handleOnInput(event: Event) {
		value = (event.target as HTMLInputElement).value
		oninput?.(event)
	}

	function handleOnChange(event: Event) {
		onchange?.(event)
		onChange?.({value: (event.target as HTMLInputElement).value})
	}

	// Apply autocomplete attribute via shadow DOM
	$effect(() => {
		if (autocomplete != null) {
			setAutocompleteOnShadowInput(element, autocomplete)
		}
	})

	// fluent-text-field 2.6 doesn't forward maxlength/minlength/pattern to its shadow `<input>`,
	// so set (or remove) them directly via the same shadow-DOM helper.
	$effect(() => {
		setAttributeOnShadowInput(element, "maxlength", maxlength)
	})
	$effect(() => {
		setAttributeOnShadowInput(element, "minlength", minlength)
	})
	$effect(() => {
		setAttributeOnShadowInput(element, "pattern", pattern)
	})
</script>

{#if label || labelTemplate}
	<label for={id} class="fluent-field-label">
		{#if label}
			{label}
		{/if}
		{#if labelTemplate}
			{@render labelTemplate?.()}
		{/if}
	</label>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_autofocus -->
<fluent-text-field
	bind:this={element}
	{...rest}
	{...attrs({
		id, placeholder, appearance, disabled, readonly, required, type, name, autofocus,
		autocomplete, style, title
	})}
	{...(value != null ? { value } : {})}
	{...(label || labelTemplate ? { "aria-label": label } : {})}
	oninput={handleOnInput}
	onchange={handleOnChange}
>
	{#if children}
		{@render children()}
	{/if}
	{#if start}
		<div slot="start">
			{@render start()}
		</div>
	{/if}
	{#if end}
		<div slot="end">
			{@render end()}
		</div>
	{/if}
</fluent-text-field>

<style>
	/* Optional: Add component-specific styles here */
</style>
