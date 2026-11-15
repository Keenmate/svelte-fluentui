<!-- Internal: the label above a form control — text and/or a custom snippet plus the required "*". Renders nothing without `label` / `labelTemplate`. Not exported from the package. -->

<script lang="ts">
	import type {Snippet} from "svelte"

	type Props = {
		/** Id of the labelled control (`for` attribute). */
		for?: string | null | undefined
		/** Label text. */
		label?: string | null | undefined
		/** Custom label content, rendered after `label`. */
		labelTemplate?: Snippet | null | undefined
		/** Appends the required indicator. */
		required?: boolean | null | undefined
	}

	let {for: forId = undefined, label = undefined, labelTemplate = undefined, required = false}: Props = $props()
</script>

{#if label || labelTemplate}
	<label class="fluent-field-label" for={forId}>
		{#if label}{label}{/if}
		{#if labelTemplate}{@render labelTemplate()}{/if}
		{#if required}<span class="fluent-required-indicator">*</span>{/if}
	</label>
{/if}
