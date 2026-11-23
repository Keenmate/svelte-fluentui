<!-- @component
Single-line text input wrapping `<fluent-text-field>`; `bind:value` is a string. The instance exposes
`select()`, `checkValidity()`, `reportValidity()`, `setCustomValidity()` and `setSelectionRange()`.

```svelte
<TextField label="Email" type="email" required bind:value={email} />
```
-->
<script lang="ts" module>
	import {fluentTextField} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTextField())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import FieldLabel from "./FieldLabel.svelte"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, RestProps} from "../types/index.js"
	import {setAutocompleteOnShadowInput, setAttributeOnShadowInput} from "../utils/shadow-dom.js"

	type OwnProps = {
		/** Id of `<fluent-text-field>` (also the label's `for`). */
		id?: string | null | undefined
		/** Text value (bindable; updates on every keystroke). */
		value?: string | null | undefined
		/** Hint text shown while empty (`placeholder` attribute). */
		placeholder?: string | null | undefined
		/** Visual style (`appearance` attribute): `"outline"` or `"filled"`. Default: `"outline"` (FluentUI default). */
		appearance?: string | null | undefined
		/** Disables the field (`disabled` attribute). */
		disabled?: boolean | null | undefined
		/** Text shows but can't be edited (`readonly` attribute). */
		readonly?: boolean | null | undefined
		/** Marks the field required for form validation (`required` attribute). */
		required?: boolean | null | undefined
		/** Input type (`type` attribute): `text`, `email`, `password`, `tel`, `url`. Default: `"text"`. */
		type?: string | null | undefined
		/** Form field name (`name` attribute). */
		name?: string | null | undefined
		/** Visible label text rendered above the field; also the `aria-label`. */
		label?: string | null | undefined
		/** Custom label markup, rendered after `label` inside the `<label>`. */
		labelTemplate?: Snippet | null | undefined
		/** Focus on mount (`autofocus` attribute). */
		autofocus?: boolean | null | undefined
		/** Autofill hint (`autocomplete`), also applied to the inner shadow `<input>`. Default: `"off"`. */
		autocomplete?: string | null | undefined
		/** Max length of the typed value. Forwarded to the shadow-DOM `<input>` since fluent-text-field doesn't expose it. */
		maxlength?: number | null | undefined
		/** Min length required for the typed value. Forwarded to the shadow-DOM `<input>`. */
		minlength?: number | null | undefined
		/** Regex pattern attribute on the inner `<input>` — participates in native form validity (ValidityState.patternMismatch). */
		pattern?: string | null | undefined
		/** Content slotted into `<fluent-text-field>` (its default slot is the built-in label). */
		children?: Snippet | null | undefined
		/** Leading content (icon, prefix) rendered inside the input via the underlying `<fluent-text-field>`'s `start` slot. */
		start?: Snippet | null | undefined
		/** Trailing content (icon, suffix, action) rendered inside the input via the underlying `<fluent-text-field>`'s `end` slot. */
		end?: Snippet | null | undefined
		/** Inline style on `<fluent-text-field>`. */
		style?: string | null | undefined
		/** Tooltip text (`title` attribute). */
		title?: string | null | undefined

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
		setSelectionRange: (start: number, end: number, direction?: "forward" | "backward" | "none") => void
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

	export function setSelectionRange(start: number, end: number, direction?: "forward" | "backward" | "none") {
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

<FieldLabel for={id} {label} {labelTemplate} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_autofocus -->
<fluent-text-field
	bind:this={element}
	{...rest}
	{...attrs({
		id,
		placeholder,
		appearance,
		disabled,
		readonly,
		required,
		type,
		name,
		autofocus,
		autocomplete,
		style,
		title
	})}
	{...value != null ? {value} : {}}
	{...label || labelTemplate ? {"aria-label": label} : {}}
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
	@layer reset, variables, component, overrides;

	@layer component {
		/* Optional: Add component-specific styles here */
	}
</style>
