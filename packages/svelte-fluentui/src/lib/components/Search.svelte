<!-- @component
Wrapper for `<fluent-search>`: a search input with a clear button, `onSearch` while typing (optionally debounced) and `onChange` on commit.

```svelte
<Search placeholder="Search…" immediate searchDelay={300} onSearch={({term}) => find(term)} />
```
-->

<script lang="ts" module>
	import {fluentSearch} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentSearch())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import {debounce} from "../helpers/debounce.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, RestProps} from "../types/index.js"
	import {setAutocompleteOnShadowInput} from "../utils/shadow-dom.js"

	type OwnProps = {
		/** Extra CSS class on `<fluent-search>`. */
		class?: string
		/** Inline style on `<fluent-search>`; `width` / `height` are appended. */
		style?: string
		/** Id of the field (also the label's `for`). */
		id?: string
		/** Form field name (`name` attribute). */
		name?: string
		/** Current text. Bindable. */
		value?: string
		/** Read-only field (`readonly` attribute). */
		readonly?: boolean
		/** Focus the field on mount (`autofocus` attribute). */
		autofocus?: boolean
		/** Browser autofill hint, applied to the inner shadow `<input>`. Default: `off`. */
		autocomplete?: string
		/** Placeholder text (`placeholder` attribute). */
		placeholder?: string
		/** Id of a `<datalist>` with suggestions (`list` attribute). `dataList` wins when both are set. */
		list?: string
		/** Maximum text length (`maxlength` attribute). */
		maxlength?: number
		/** Minimum text length (`minlength` attribute). */
		minlength?: number
		/** Validation regex (`pattern` attribute). */
		pattern?: string
		/** Visible width in characters (`size` attribute). */
		size?: number
		/** Browser spell checking (`spellcheck` attribute). */
		spellcheck?: boolean
		/** Disables the field (`disabled` attribute). */
		disabled?: boolean
		/** Marks the field as required (`required` attribute); adds `*` to the label. */
		required?: boolean
		/** Visual style (`appearance` attribute). Default: `outline`. */
		appearance?: "outline" | "filled"
		/** Accessible name (`aria-label`); falls back to `label`. */
		ariaLabel?: string
		/** Text rendered in a `<label>` above the field. */
		label?: string
		/** Custom label content, rendered above the field. */
		labelTemplate?: Snippet
		/** Default-slot content of `<fluent-search>`. */
		children?: Snippet
		/** Content in the element's `start` slot (before the input). */
		start?: Snippet
		/** Content in the element's `end` slot (after the input). */
		end?: Snippet
		// New props from Blazor API
		/** Debounce `onSearch` by `searchDelay` (without it, `onSearch` fires on every keystroke). Default: `false`. */
		immediate?: boolean
		/** Debounce delay in ms before `onSearch` fires while typing (requires `immediate`; 0 = no debounce). */
		searchDelay?: number
		/** Alias of `list` (Blazor naming); wins over `list`. */
		dataList?: string
		/** CSS width, appended to `style`. */
		width?: string
		/** CSS height, appended to `style`. */
		height?: string
		/** Tooltip text (`title` attribute). */
		title?: string
		/** Fires as the user types (debounced by `searchDelay` when `immediate`). */
		onSearch?: (ctx: {term: string}) => void
		/** Fires when the user commits the value (Enter / blur / clear). */
		onChange?: (ctx: {value: string}) => void
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler
	}

	/** Other native attributes and events go to `<fluent-search>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		id,
		name,
		value = $bindable(),
		readonly,
		autofocus,
		autocomplete = "off",
		placeholder,
		list,
		maxlength,
		minlength,
		pattern,
		size,
		spellcheck,
		disabled,
		required,
		appearance,
		ariaLabel,
		label,
		labelTemplate,
		children,
		start,
		end,
		// New props
		immediate = false,
		searchDelay = 0,
		dataList,
		width,
		height,
		title,
		onSearch,
		onChange,
		oninput,
		onchange,
		...rest
	}: Props = $props()

	let element: HTMLElement | undefined
	// `immediate` + `searchDelay`: onSearch fires once typing pauses for the delay.
	const debouncedSearch = debounce(
		(term: string) => onSearch?.({term}),
		() => searchDelay
	)

	// Expose focus method for parent components
	export function focus(preventScroll: boolean = false) {
		if (element) {
			const shadowInput = element.shadowRoot?.querySelector("input")
			if (shadowInput) {
				shadowInput.focus({preventScroll})
			} else {
				element.focus({preventScroll})
			}
		}
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value
		value = val
		oninput?.(e)

		if (immediate && searchDelay > 0) {
			// Immediate mode with a delay: debounce onSearch
			debouncedSearch(val)
		} else {
			onSearch?.({term: val})
		}
	}

	function handleChange(e: Event) {
		const val = (e.target as HTMLInputElement).value
		value = val
		onchange?.(e)
		onChange?.({value: val})
	}

	// Apply autocomplete attribute via shadow DOM
	$effect(() => {
		if (autocomplete !== undefined) {
			setAutocompleteOnShadowInput(element, autocomplete)
		}
	})

	// Drop a pending onSearch on unmount
	$effect(() => () => debouncedSearch.cancel())

	// Compute combined style
	let computedStyle = $derived.by(() => {
		let s = style || ""
		if (width) s += (s ? "; " : "") + `width: ${width}`
		if (height) s += (s ? "; " : "") + `height: ${height}`
		return s || undefined
	})

	// Title prop handling (spread to avoid "null" text)
	let titleProps = $derived(title ? {title} : {})
</script>

{#if label}
	<label for={id} aria-label={ariaLabel || label}>
		{label}
		{#if required}<span aria-hidden="true">*</span>{/if}
	</label>
{/if}

{#if labelTemplate}
	{@render labelTemplate?.()}
{/if}

<fluent-search
	bind:this={element}
	{...rest}
	{...attrs({
		class: className,
		style: computedStyle,
		id,
		name,
		readonly,
		autofocus,
		autocomplete,
		placeholder,
		maxlength,
		minlength,
		pattern,
		size,
		disabled,
		required
	})}
	{...dataList || list ? {list: dataList || list} : {}}
	value={value ?? ""}
	{...spellcheck !== undefined ? {spellcheck} : {}}
	appearance={appearance ?? "outline"}
	{...ariaLabel || label ? {"aria-label": ariaLabel || label} : {}}
	{...titleProps}
	oninput={handleInput}
	onchange={handleChange}
>
	{#if start}
		<span slot="start">
			{@render start()}
		</span>
	{/if}
	{@render children?.()}
	{#if end}
		<span slot="end">
			{@render end()}
		</span>
	{/if}
</fluent-search>
