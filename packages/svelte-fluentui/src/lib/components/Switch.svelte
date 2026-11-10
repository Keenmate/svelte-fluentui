<script lang="ts" module>
	import {fluentSwitch} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentSwitch())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import { untrack } from 'svelte'

	type Props = {
		class?: string
		style?: string
		readonly?: boolean
		id?: string
		disabled?: boolean
		autofocus?: boolean
		name?: string
		ariaLabel?: string
		label?: string
		labelPosition?: "top" | "start"
		checked?: boolean
		required?: boolean
		checkedMessage?: string | Snippet
		uncheckedMessage?: string | Snippet
		/** Fires when the switch is toggled. */
		onChange?: (ctx: {checked: boolean}) => void
		children?: Snippet
		labelTemplate?: Snippet
	}

	let {
		class: className = "",
		style = "",
		readonly = undefined,
		id = undefined,
		disabled = undefined,
		autofocus = undefined,
		name = undefined,
		ariaLabel = undefined,
		label = undefined,
		labelPosition = "top",
		checked = $bindable(),
		required = undefined,
		checkedMessage = undefined,
		uncheckedMessage = undefined,
		onChange = undefined,
		children = undefined,
		labelTemplate = undefined
	}: Props = $props()

	// Stable fallback id so <label for={...}> always toggles the switch even
	// when the caller didn't provide an id. $props.id() matches between SSR and hydration.
	const uid = $props.id()
	const fallbackId = `fluent-switch-${uid}`
	const effectiveId = $derived(id ?? fallbackId)

	// Switch label always describes the value next to the control — never a
	// field-label — so styling stays the same across positions; only the
	// wrapper's flex direction changes per labelPosition.

	// Check if messages are snippets or strings
	let isCheckedMessageSnippet = $derived(typeof checkedMessage === 'function')
	let isUncheckedMessageSnippet = $derived(typeof uncheckedMessage === 'function')

	function handleChange(e: Event) {
		const target = e.target as any
		const newChecked = target.checked ?? false

		// Update the bindable value without creating reactive tracking
		untrack(() => {
			checked = newChecked
		})

		onChange?.({checked: newChecked})
	}
</script>

<span
	class="fluent-switch-wrapper"
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

	<!-- svelte-ignore a11y_autofocus -->
	<!-- Bind via the public boolean `checked` attribute (not `current-checked`,
	     which is the internal raw value). fluent-switch's `checkedChanged()`
	     handler responds to `checked` and toggles a `.checked` class on its
	     host — that class is what flips the track background to the accent
	     fill (`:host(.checked) .switch { background: var(--accent-fill-rest) }`
	     in fluent-switch's shadow styles). Use `|| null` so that `false`
	     removes the attribute, since the boolean-attribute convention treats
	     mere presence as `true`. -->
	<fluent-switch
		class={className}
		{...attrs({style, readonly, disabled, autofocus, name, required, checked})}
		id={effectiveId}
		{...(ariaLabel || label ? { "aria-label": ariaLabel || label } : {})}
		aria-checked={checked ? "true" : "false"}
		onchange={handleChange}
		role="switch"
	>
		{#if checkedMessage}
			<span slot="checked-message" class="switch-message">
				{#if isCheckedMessageSnippet}
					{@render (checkedMessage as Snippet)?.()}
				{:else}
					{checkedMessage}
				{/if}
			</span>
		{/if}

		{#if uncheckedMessage}
			<span slot="unchecked-message" class="switch-message">
				{#if isUncheckedMessageSnippet}
					{@render (uncheckedMessage as Snippet)?.()}
				{:else}
					{uncheckedMessage}
				{/if}
			</span>
		{/if}
	</fluent-switch>
</span>

<style>
	:global(fluent-switch::part(label)) {
		display: none;
	}

	.fluent-switch-wrapper {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* "top" position: label stacks above the switch. Label keeps its
	   value-label styling — only the wrapper layout changes. */
	.fluent-switch-wrapper[data-label-position="top"] {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.switch-message {
		margin-left: 0.5rem;
	}
</style>
