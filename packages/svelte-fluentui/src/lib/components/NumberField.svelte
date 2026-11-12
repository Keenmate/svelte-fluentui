<script lang="ts" module>
	import {fluentNumberField} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentNumberField())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {NativeEventHandler, RestProps} from "../types/index.js"
	import { setAutocompleteOnShadowInput } from "../utils/shadow-dom.js";

	type OwnProps = {
		id?: string | null | undefined;
		/** Numeric value; `null` when the field is empty. The underlying element's string value is converted at the boundary. */
		value?: number | null;
		placeholder?: string;
		appearance?: "outline" | "filled";
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		name?: string;
		label?: string;
		labelTemplate?: Snippet | null | undefined;
		autofocus?: boolean;
		autocomplete?: string;
		step?: number;
		min?: number;
		max?: number;
		minlength?: number;
		maxlength?: number;
		size?: number;
		list?: string;
		hideStep?: boolean;
		ariaLabel?: string;
		title?: string;
		width?: string;
		height?: string;
		class?: string;
		style?: string;
		children?: Snippet;
		start?: Snippet;
		end?: Snippet;

		/** Fires when the user commits a value (blur / Enter / step buttons). The live value is `bind:value`. */
		onChange?: (ctx: {value: number | null}) => void;
		/** Native `input` event, forwarded untouched. */
		oninput?: NativeEventHandler;
		/** Native `change` event, forwarded untouched. */
		onchange?: NativeEventHandler;
	};

	/** Other native attributes and events (`onkeydown`, `onfocus`, `onblur`, …) go to `<fluent-number-field>`. */
	type Props = OwnProps & RestProps<OwnProps>;

	let {
		id = undefined,
		value = $bindable<number | null | undefined>(),
		placeholder,
		appearance,
		disabled,
		readonly,
		required,
		name,
		label,
		labelTemplate = undefined,
		autofocus,
		autocomplete = "off",
		step,
		min,
		max,
		minlength,
		maxlength,
		size,
		list,
		hideStep,
		ariaLabel,
		title,
		width,
		height,
		class: className,
		style,
		children,
		start,
		end,
		onChange,
		oninput,
		onchange,
		...rest
	}: Props = $props();

	// Compute style with width/height
	let computedStyle = $derived.by(() => {
		let s = style || "";
		if (width) s += (s ? "; " : "") + `width: ${width}`;
		if (height) s += (s ? "; " : "") + `height: ${height}`;
		return s || null;
	});

	// Handle title separately to avoid rendering "null" as text
	let titleProps = $derived(title ? { title } : {});

	let element: HTMLElement & {
		value: string;
		valueAsNumber: number;
		stepUp: () => void;
		stepDown: () => void;
		checkValidity: () => boolean;
		reportValidity: () => boolean;
		setCustomValidity: (message: string) => void;
		focus: () => void;
		blur: () => void;
		select: () => void;
	};

	// Exposed methods
	export function stepUp() {
		element?.stepUp();
	}

	export function stepDown() {
		element?.stepDown();
	}

	export function checkValidity() {
		return element?.checkValidity();
	}

	export function reportValidity() {
		return element?.reportValidity();
	}

	export function setCustomValidity(message: string) {
		element?.setCustomValidity(message);
	}

	export function focus() {
		element?.focus();
	}

	export function blur() {
		element?.blur();
	}

	export function select() {
		element?.select();
	}

	// <fluent-number-field> keeps a sanitized string `value` ("" or a valid,
	// min/max-clamped number) while the inner input keeps the raw typed text, so
	// partial input like "-" or "1." maps to null / 1 without clobbering typing.
	function parseValue(raw: string | null | undefined): number | null {
		if (raw == null || raw.trim() === "") return null;
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	}

	// True while pushing `value` into the element: FAST re-emits input/change on
	// programmatic value sets, which must not echo back as user edits.
	let syncing = false;

	// Prop -> element (string at the boundary). Skipped when the element already
	// represents the same number, so live typing is never overwritten.
	$effect(() => {
		const next = value ?? null;
		if (!element) return;
		if (parseValue(element.value) === next) return;
		syncing = true;
		try {
			element.value = next == null ? "" : String(next);
		} finally {
			syncing = false;
		}
	});

	function handleOnInput(event: Event) {
		if (!syncing) value = parseValue((event.target as HTMLInputElement).value);
		oninput?.(event);
	}

	function handleOnChange(event: Event) {
		onchange?.(event);
		if (!syncing) onChange?.({value: parseValue((event.target as HTMLInputElement).value)});
	}

	// Apply autocomplete attribute via shadow DOM
	$effect(() => {
		if (autocomplete !== undefined) {
			setAutocompleteOnShadowInput(element, autocomplete);
		}
	});
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

<!-- svelte-ignore a11y_autofocus -->
<fluent-number-field
	bind:this={element}
	{...rest}
	{...attrs({
		id, class: className, style: computedStyle, placeholder, appearance, disabled, readonly,
		required, autofocus, autocomplete, step, min, max, minlength, maxlength, size, list,
		"hide-step": hideStep, name
	})}
	{...(ariaLabel || label ? { "aria-label": ariaLabel ?? label } : {})}
	{...titleProps}
	oninput={handleOnInput}
	onchange={handleOnChange}
>
	{#if start}
		<span slot="start">{@render start()}</span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
	{#if end}
		<span slot="end">{@render end()}</span>
	{/if}
</fluent-number-field>

<style>
	:global(fluent-number-field::part(label)) {
		display: none;
	}
</style>
