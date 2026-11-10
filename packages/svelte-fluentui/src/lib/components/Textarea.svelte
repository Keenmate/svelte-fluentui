<script lang="ts" module>
	import {fluentTextArea} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTextArea())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import { setAutocompleteOnShadowInput, whenShadowRoot } from "../utils/shadow-dom.js"

	const activeIndicatorOverride =
		typeof CSSStyleSheet !== "undefined"
			? (() => {
					const sheet = new CSSStyleSheet()
					sheet.replaceSync(
						":host(:not([disabled]):active)::after { left: 0; width: 100%; transform: none; }"
					)
					return sheet
				})()
			: (undefined as unknown as CSSStyleSheet)

	type Props = {
		class?: string
		style?: string
		readonly?: boolean
		resize?: "none" | "both" | "horizontal" | "vertical"
		autofocus?: boolean
		autocomplete?: string
		form?: string
		list?: string
		maxlength?: number
		minlength?: number
		placeholder?: string
		cols?: number
		rows?: number
		spellcheck?: boolean
		id?: string
		name?: string
		disabled?: boolean
		required?: boolean
		appearance?: "outline" | "filled"
		value?: string
		label?: string
		ariaLabel?: string
		fullWidth?: boolean
		labelTemplate?: Snippet
		children?: Snippet
		/** Fires when the user commits an edit (blur / change). The live value is `bind:value`. */
		onChange?: (ctx: {value: string}) => void
		/** Native `input` event, forwarded untouched. */
		oninput?: (event: Event) => void
		/** Native `change` event, forwarded untouched. */
		onchange?: (event: Event) => void
	}

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
		onchange = undefined
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

<!-- svelte-ignore a11y_autofocus -->
<fluent-text-area
	bind:this={element}
	class={className}
	{...attrs({
		style, readonly, resize, autofocus, autocomplete, form, list, maxlength, minlength,
		placeholder, cols, rows, id, name, disabled, required, appearance, "aria-label": ariaLabel
	})}
	{...(spellcheck != null ? { spellcheck } : {})}
	{...(value != null ? { value } : {})}
	oninput={handleInput}
	onchange={handleChange}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-text-area>
