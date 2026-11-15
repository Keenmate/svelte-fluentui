<!--
@component
Form-field frame around any control: label, required marker, hint and validation message.

```svelte
<Field label="Email" id="email" required validationState="error" validationMessage="Invalid address">
	<TextField id="email" bind:value={email} />
</Field>
```
-->
<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../types/index.js"

	export type FieldValidationState = "none" | "warning" | "error" | "success"
	type OwnProps = {
		/** Label text rendered above (or beside) the control. */
		label?: string | null | undefined
		/** Custom label content, rendered after `label` inside the `<label>`. */
		labelTemplate?: Snippet | null | undefined
		/** Show a required `*` marker after the label (visual only). */
		required?: boolean
		/** Helper text under the control; hidden while a validation message is shown. */
		hint?: string | null | undefined
		/** Validation state; colours the field and shows `validationMessage` when not `none`. Default: `none`. */
		validationState?: FieldValidationState
		/** Message shown under the control when `validationState` isn't `none` (announced for `error`). */
		validationMessage?: string | null | undefined
		/** `vertical` stacks label above the control, `horizontal` puts it beside. Default: `vertical`. */
		orientation?: Orientation
		/**
		 * Optional id used both as the inner control's `id` (caller passes it through)
		 * and as the label's `for` attribute. If omitted, label clicks are not
		 * automatically associated with the inner control.
		 */
		id?: string | null | undefined
		/** Extra class on the wrapper. */
		class?: string
		/** Inline style on the wrapper. */
		style?: string
		/** The form control to wrap. */
		children?: Snippet
	}

	/** Other native attributes and events go to the wrapper `<div>` (`id` stays on the label's `for`). */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		label = undefined,
		labelTemplate = undefined,
		required = false,
		hint = undefined,
		validationState = "none",
		validationMessage = undefined,
		orientation = "vertical",
		id = undefined,
		class: className = "",
		style = "",
		children,
		...rest
	}: Props = $props()

	const showMessage = $derived(
		validationState !== "none" && validationMessage != null && validationMessage !== ""
	)
	const showHint = $derived(!showMessage && hint != null && hint !== "")
</script>

<div
	{...rest}
	class="fluent-field fluent-field--{orientation} {className}"
	data-state={validationState}
	{style}
>
	{#if label || labelTemplate}
		<label class="fluent-field__label" for={id}>
			{#if label}{label}{/if}
			{#if labelTemplate}{@render labelTemplate?.()}{/if}
			{#if required}<span class="fluent-field__required" aria-hidden="true">*</span>{/if}
		</label>
	{/if}

	<div class="fluent-field__control">
		{#if children}{@render children()}{/if}
	</div>

	{#if showHint}
		<small class="fluent-field__hint">{hint}</small>
	{/if}

	{#if showMessage}
		<small
			class="fluent-field__message"
			role={validationState === "error" ? "alert" : undefined}
			aria-live={validationState === "error" ? "polite" : undefined}
		>
			{validationMessage}
		</small>
	{/if}
</div>
