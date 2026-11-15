<!-- @component
Wrapper for `<fluent-checkbox>` with a clickable value label, optional three-state cycling and status messages.

```svelte
<Checkbox bind:checked label="Subscribe" />
```
-->

<script lang="ts" module>
	import {fluentCheckbox} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentCheckbox())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Checked state; `null` is indeterminate. Bindable. Defaults to `false`. */
		checked?: boolean | null;
		/** Clicks also cycle through an indeterminate state (`checked = null`). */
		threeState?: boolean;
		/** Click order in three-state mode: `"checked-first"` (unchecked → checked → indeterminate, default) or `"indeterminate-first"` (unchecked → indeterminate → checked, Blazor order). */
		threeStateOrder?: "checked-first" | "indeterminate-first";
		/** Focus on page load (`autofocus` attribute). */
		autofocus?: boolean;
		/** Label content (rendered after `label` / `labelTemplate`). */
		children?: Snippet;
		/** Disable the checkbox (`disabled` attribute). */
		disabled?: boolean;
		/** Show the state but block changes (`readonly` attribute). */
		readonly?: boolean;
		/** Mark as required for form validation (`required` attribute). */
		required?: boolean;
		/** Id of `<fluent-checkbox>` (the label's `for`). Generated when omitted. */
		id?: string;
		/** Form field name (`name` attribute). */
		name?: string;
		/** Text label; also the default `aria-label`. */
		label?: string;
		/** Rich label content. */
		labelTemplate?: Snippet;
		/** Where the label sits relative to the box. Default: `"end"`. */
		labelPosition?: "top" | "start" | "end";
		/** Accessible name (`aria-label`); overrides `label`. */
		ariaLabel?: string;
		/** Extra classes for `<fluent-checkbox>`. */
		class?: string;
		/** Inline style for `<fluent-checkbox>`. */
		style?: string;
		/** Status text (string or snippet) shown after the control while checked. Mirrors Switch's `checkedMessage`. */
		checkedMessage?: string | Snippet;
		/** Status text shown while unchecked. */
		uncheckedMessage?: string | Snippet;
		/** Status text shown while indeterminate (`checked === null`, only reachable with `threeState`). */
		indeterminateMessage?: string | Snippet;
		/** Fires when the user changes the state; `null` is indeterminate. */
		onChange?: (ctx: {checked: boolean | null}) => void
		/** Native `click` event, forwarded untouched. */
		onclick?: (event: MouseEvent) => void
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, `onblur`, …) go to `<fluent-checkbox>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		checked = $bindable(false),
		threeState = false,
		threeStateOrder = "checked-first",
		autofocus = undefined,
		disabled = undefined,
		readonly = undefined,
		required = undefined,
		id = undefined,
		name = undefined,
		label = undefined,
		labelTemplate = undefined,
		labelPosition = "end",
		ariaLabel = undefined,
		class: className = "",
		style = "",
		children = undefined,
		checkedMessage = undefined,
		uncheckedMessage = undefined,
		indeterminateMessage = undefined,
		onChange = undefined,
		onclick = undefined,
		...rest
	}: Props = $props()

	// Stable fallback id so <label for={...}> always links to the checkbox —
	// without it, clicking the value label on an id-less <Checkbox /> wouldn't
	// toggle the box. $props.id() matches between SSR and hydration.
	const uid = $props.id()
	const fallbackId = `fluent-checkbox-${uid}`
	const effectiveId = $derived(id ?? fallbackId)

	// Checkbox label always describes the value next to the control — never a
	// field-label — so styling stays the same across all positions; only the
	// wrapper's flex direction changes per labelPosition.

	const currentMessage = $derived(
		checked === true ? checkedMessage
			: checked === false ? uncheckedMessage
			: indeterminateMessage
	)
	const isCurrentMessageSnippet = $derived(typeof currentMessage === "function")

	let element: HTMLElement & {
		checked: boolean
		indeterminate: boolean
		checkValidity: () => boolean
		reportValidity: () => boolean
		setCustomValidity: (message: string) => void
		setValidity: (flags: any, message: any, anchor: any) => void
	}

	// Keep FAST's `checked` / `indeterminate` *properties* in sync. Removing the
	// attribute (when `checked` goes true -> false/null) does not clear the property,
	// so the box stayed visually checked while the value was false.
	$effect(() => {
		if (!element) return
		element.checked = checked === true
		element.indeterminate = checked === null
	})

	// Expose validation methods
	export function checkValidity() {
		return element?.checkValidity()
	}

	export function reportValidity() {
		return element?.reportValidity()
	}

	export function setCustomValidity(message: string) {
		element?.setCustomValidity(message)
	}

	export function setValidity(flags: any, message: any, anchor: any) {
		element?.setValidity(flags, message, anchor)
	}

	function handleOnClick(ev: PointerEvent) {
		ev.preventDefault()
		ev.stopImmediatePropagation()

		if (readonly || disabled) {
			return
		}

		const previousValue = $state.snapshot(checked)

		if (threeState) {
			if (threeStateOrder === "indeterminate-first") {
				// Blazor order: false -> null (indeterminate) -> true -> false
				if (previousValue === false) {
					checked = null
				} else if (previousValue === null) {
					checked = true
				} else {
					checked = false
				}
			} else {
				// Default order: false -> true -> null (indeterminate) -> false
				if (previousValue === true) {
					checked = null
				} else if (previousValue === null) {
					checked = false
				} else {
					checked = true
				}
			}
		} else {
			// Two-state toggle: true <-> false
			checked = (ev as any).target.checked
		}

		onclick?.(ev)
		if (checked !== previousValue) onChange?.({checked})
	}
</script>

<span
	class="fluent-checkbox-wrapper"
	data-label-position={labelPosition}
	data-disabled={disabled ? "true" : null}
	data-readonly={readonly ? "true" : null}
>
	{#if label || labelTemplate || children}
		<label for={effectiveId} class="fluent-value-label">
			{#if label}{label}{/if}
			{#if labelTemplate}{@render labelTemplate?.()}{/if}
			{#if children}{@render children?.()}{/if}
		</label>
	{/if}

	<fluent-checkbox
		bind:this={element}
		{...rest}
		{...(checked === true ? { checked: true } : {})}
		{...(checked === null ? { indeterminate: true } : {})}
		{...attrs({autofocus, readonly, disabled, required, name, class: className, style})}
		id={effectiveId}
		{...(ariaLabel || label ? { "aria-label": ariaLabel || label } : {})}
		onclick={handleOnClick}
	></fluent-checkbox>

	{#if currentMessage}
		<span class="checkbox-message">
			{#if isCurrentMessageSnippet}
				{@render (currentMessage as Snippet)?.()}
			{:else}
				{currentMessage}
			{/if}
		</span>
	{/if}
</span>

<style>
	:global(fluent-checkbox::part(label)) {
		display: none;
	}

	.fluent-checkbox-wrapper {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* "top" position: label stacks above the checkbox. Label keeps its
	   value-label styling — only the wrapper layout changes. */
	.fluent-checkbox-wrapper[data-label-position="top"] {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	/* Label appears AFTER the checkbox in the layout (checkbox on the left,
	   label on the right) without changing DOM order — accessible name remains
	   first in the source so screen readers announce it correctly.

	   We use the `order` property rather than `flex-direction: row-reverse`
	   so the optional status message always trails the [checkbox, label] pair
	   instead of jumping to the front (which row-reverse would do). */
	.fluent-checkbox-wrapper[data-label-position="end"] :global(.fluent-value-label) {
		order: 1;
	}
	.fluent-checkbox-wrapper[data-label-position="end"] .checkbox-message {
		order: 2;
	}

	.checkbox-message {
		font-size: 0.875rem;
		color: var(--neutral-foreground-hint);
	}
</style>
