<!-- @component
Multi-line text input wrapping `<fluent-text-area>`; `bind:value` is a string. Call `focus()` on the instance to focus it.

```svelte
<Textarea label="Comments" rows={4} resize="vertical" bind:value={comments} />
```
-->
<script lang="ts" module>
	import {fluentTextArea} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTextArea())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import {setAutocompleteOnShadowInput, whenShadowRoot} from "../utils/shadow-dom.js"
	import type {NativeEventHandler, RestProps} from "../types/index.js"

	const activeIndicatorOverride =
		typeof CSSStyleSheet !== "undefined"
			? (() => {
					const sheet = new CSSStyleSheet()
					sheet.replaceSync(":host(:not([disabled]):active)::after { left: 0; width: 100%; transform: none; }")
					return sheet
				})()
			: (undefined as unknown as CSSStyleSheet)

	type OwnProps = {
		/** Extra CSS class on `<fluent-text-area>`. */
		class?: string
		/** Inline style on `<fluent-text-area>`. */
		style?: string
		/** Text shows but can't be edited (`readonly` attribute). */
		readonly?: boolean
		/** Which directions the user can drag-resize (`resize` attribute). Default: no resize handle. */
		resize?: "none" | "both" | "horizontal" | "vertical"
		/** Focus on mount (`autofocus` attribute). */
		autofocus?: boolean
		/** Autofill hint, applied to the inner shadow `<textarea>`. Default: `"off"`. */
		autocomplete?: string
		/** Id of the `<form>` the field belongs to (`form` attribute). */
		form?: string
		/** Id of a `<datalist>` with suggestions (`list` attribute). */
		list?: string
		/** Maximum length in characters (`maxlength` attribute). */
		maxlength?: number
		/** Minimum length in characters (`minlength` attribute). */
		minlength?: number
		/** Hint text shown while empty (`placeholder` attribute). */
		placeholder?: string
		/** Visible width in characters (`cols` attribute); the host then shrinks to fit. */
		cols?: number
		/** Visible height in text lines (`rows` attribute). */
		rows?: number
		/** Browser spell checking (`spellcheck` attribute). Default: browser default. */
		spellcheck?: boolean
		/** Id of `<fluent-text-area>` (also the label's `for`). */
		id?: string
		/** Form field name (`name` attribute). */
		name?: string
		/** Disables the field (`disabled` attribute). */
		disabled?: boolean
		/** Marks the field required for form validation (`required` attribute). */
		required?: boolean
		/** Visual style (`appearance` attribute). Default: `"outline"` (FluentUI default). */
		appearance?: "outline" | "filled"
		/** Text content (bindable; updates on every keystroke). */
		value?: string
		/** Visible label text rendered above the field. */
		label?: string
		/** Accessible name (`aria-label`). */
		ariaLabel?: string
		/** Stretch to the container's width (ignored when `cols` is set). Default: `false`. */
		fullWidth?: boolean
		/** Custom label markup, rendered after `label` inside the `<label>`. */
		labelTemplate?: Snippet
		/** Content slotted into `<fluent-text-area>` (its default slot is the built-in label). */
		children?: Snippet
		/** Fires when the user commits an edit (blur / change). The live value is `bind:value`. */
		onChange?: (ctx: {value: string}) => void
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, `onblur`, …) go to `<fluent-text-area>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		readonly = undefined,
		resize = undefined,
		autofocus = undefined,
		autocomplete = "off",
		form = undefined,
		list = undefined,
		maxlength = undefined,
		minlength = undefined,
		placeholder = undefined,
		cols = undefined,
		rows = undefined,
		spellcheck = undefined,
		id = undefined,
		name = undefined,
		disabled = undefined,
		required = undefined,
		appearance = undefined,
		value = $bindable(),
		label = undefined,
		ariaLabel = undefined,
		fullWidth = false,
		labelTemplate = undefined,
		children = undefined,
		onChange = undefined,
		oninput = undefined,
		onchange = undefined,
		...rest
	}: Props = $props()

	let element: HTMLElement | undefined

	export function focus() {
		element?.focus()
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement
		value = target.value
		oninput?.(e)
	}

	function handleChange(e: Event) {
		const target = e.target as HTMLTextAreaElement
		value = target.value
		onchange?.(e)
		onChange?.({value: target.value})
	}

	// Apply autocomplete attribute via shadow DOM (use 'textarea' selector)
	$effect(() => {
		if (autocomplete !== undefined) {
			setAutocompleteOnShadowInput(element, autocomplete, "textarea")
		}
	})

	// Neutralize FluentUI's `:active::after` rule, which collapses the focus
	// indicator to a 40%-wide centered line while the user is dragging the
	// resize handle. Make active match focus-within (full-width line).
	$effect(() => {
		if (!element || typeof CSSStyleSheet === "undefined") return
		whenShadowRoot(element, (root) => {
			if (root.adoptedStyleSheets.includes(activeIndicatorOverride)) return
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, activeIndicatorOverride]
		})
	})

	// Sizing: by default the host opts out of parent flex stretching (matches the
	// Blazor demo, where a default textarea renders at its intrinsic ~20ch width).
	// `fullWidth` opts back into stretching. `cols` sets the host attribute that
	// FluentUI's `:host([cols]) { width: initial }` gates on, plus `width: fit-content`
	// so the host wraps the inner cols-sized textarea instead of being stretched.
	// `rows` similarly writes the attribute that `:host([rows]) .control { height: initial }`
	// gates on. FluentUI uses `mode: "fromView"` on both, so property writes alone
	// wouldn't reflect to attributes — we have to set them directly.
	$effect(() => {
		if (!element) return

		if (cols !== undefined) element.setAttribute("cols", String(cols))
		else element.removeAttribute("cols")

		if (rows !== undefined) element.setAttribute("rows", String(rows))
		else element.removeAttribute("rows")

		if (cols !== undefined) {
			element.style.width = "fit-content"
		} else if (fullWidth) {
			element.style.width = "100%"
		} else {
			element.style.removeProperty("width")
		}

		if (cols !== undefined || rows !== undefined) {
			element.style.alignSelf = "flex-start"
		} else if (fullWidth) {
			element.style.alignSelf = "stretch"
		} else {
			element.style.alignSelf = "flex-start"
		}
	})
</script>

{#if label || labelTemplate}
	<label for={id} class="fluent-field-label">
		{label}
		{#if labelTemplate}
			{@render labelTemplate?.()}
		{/if}
	</label>
{/if}

<fluent-text-area
	bind:this={element}
	{...rest}
	class={className}
	{...attrs({
		style,
		readonly,
		resize,
		autofocus,
		autocomplete,
		form,
		list,
		maxlength,
		minlength,
		placeholder,
		cols,
		rows,
		id,
		name,
		disabled,
		required,
		appearance,
		"aria-label": ariaLabel
	})}
	{...spellcheck != null ? {spellcheck} : {}}
	{...value != null ? {value} : {}}
	oninput={handleInput}
	onchange={handleChange}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-text-area>
