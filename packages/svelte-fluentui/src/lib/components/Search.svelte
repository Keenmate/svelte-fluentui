<script lang="ts" module>
	import {fluentSearch} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentSearch())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, RestProps} from "../types/index.js"
	import { setAutocompleteOnShadowInput } from "../utils/shadow-dom.js";

	type OwnProps = {
		class?: string;
		style?: string;
		id?: string;
		name?: string;
		value?: string;
		readonly?: boolean;
		autofocus?: boolean;
		autocomplete?: string;
		placeholder?: string;
		list?: string;
		maxlength?: number;
		minlength?: number;
		pattern?: string;
		size?: number;
		spellcheck?: boolean;
		disabled?: boolean;
		required?: boolean;
		appearance?: "outline" | "filled";
		ariaLabel?: string;
		label?: string;
		labelTemplate?: Snippet;
		children?: Snippet;
		start?: Snippet;
		end?: Snippet;
		// New props from Blazor API
		immediate?: boolean;
		immediateDelay?: number;
		dataList?: string;
		displayName?: string;
		width?: string;
		height?: string;
		title?: string;
		/** Fires as the user types (debounced by `immediateDelay` when `immediate`). */
		onSearch?: (ctx: {term: string}) => void;
		/** Fires when the user commits the value (Enter / blur / clear). */
		onChange?: (ctx: {value: string}) => void;
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler;
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler;
	};

	/** Other native attributes and events go to `<fluent-search>`. */
	type Props = OwnProps & RestProps<OwnProps>;

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
		immediateDelay = 0,
		dataList,
		displayName,
		width,
		height,
		title,
		onSearch,
		onChange,
		oninput,
		onchange,
		...rest
	}: Props = $props();

	let element: HTMLElement | undefined;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	// Expose focus method for parent components
	export function focus(preventScroll: boolean = false) {
		if (element) {
			const shadowInput = element.shadowRoot?.querySelector("input");
			if (shadowInput) {
				shadowInput.focus({ preventScroll });
			} else {
				element.focus({ preventScroll });
			}
		}
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		value = val;
		oninput?.(e);

		if (immediate && immediateDelay > 0) {
			// Immediate mode with a delay: debounce onSearch
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				onSearch?.({term: val});
			}, immediateDelay);
		} else {
			onSearch?.({term: val});
		}
	}

	function handleChange(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		value = val;
		onchange?.(e);
		onChange?.({value: val});
	}

	// Apply autocomplete attribute via shadow DOM
	$effect(() => {
		if (autocomplete !== undefined) {
			setAutocompleteOnShadowInput(element, autocomplete);
		}
	});

	// Cleanup debounce timer
	$effect(() => {
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	// Compute combined style
	let computedStyle = $derived.by(() => {
		let s = style || "";
		if (width) s += (s ? "; " : "") + `width: ${width}`;
		if (height) s += (s ? "; " : "") + `height: ${height}`;
		return s || undefined;
	});

	// Title prop handling (spread to avoid "null" text)
	let titleProps = $derived(title ? { title } : {});
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
		class: className, style: computedStyle, id, name, readonly, autofocus, autocomplete,
		placeholder, maxlength, minlength, pattern, size, disabled, required
	})}
	{...(dataList || list ? { list: dataList || list } : {})}
	value={value ?? ""}
	{...(spellcheck !== undefined ? { spellcheck } : {})}
	appearance={appearance ?? "outline"}
	{...(ariaLabel || label ? { "aria-label": ariaLabel || label } : {})}
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
