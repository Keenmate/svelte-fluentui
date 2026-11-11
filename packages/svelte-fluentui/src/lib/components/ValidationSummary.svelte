<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/**
		 * Map of field-name → error message. Falsy values are ignored. Empty/missing
		 * map renders nothing, so the panel auto-hides when there are no errors.
		 */
		errors?: Record<string, string | null | undefined>
		/**
		 * Map of field-name → human-readable label. If a field has no entry here, the
		 * field name itself is shown. Use this to display "Email" instead of "email".
		 */
		labels?: Record<string, string>
		title?: string
		/**
		 * Called when a user clicks an error link. Receives the field name from
		 * `errors`. Typical use: scroll to + focus the offending input.
		 */
		/** Fires when the user clicks an error; the default jump-to-field navigation is prevented. */
		onFieldClick?: (ctx: {field: string}) => void
		class?: string
		style?: string
		children?: Snippet
	}

	/** Other native attributes and events go to the summary `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		errors = {},
		labels = {},
		title = "Please fix the following:",
		onFieldClick = undefined,
		class: className = "",
		style = "",
		children = undefined,
		...rest
	}: Props = $props()

	const errorEntries = $derived(
		Object.entries(errors).filter(([, msg]) => msg != null && msg !== "") as [
			string,
			string
		][]
	)
	const errorCount = $derived(errorEntries.length)

	function handleClick(e: Event, field: string) {
		if (onFieldClick) {
			e.preventDefault()
			onFieldClick({field})
		}
	}
</script>

{#if errorCount > 0}
	<div
		{...rest}
		class="fluent-validation-summary {className}"
		role="alert"
		aria-live="polite"
		{style}
	>
		<div class="fluent-validation-summary__title">{title}</div>
		<ul class="fluent-validation-summary__list">
			{#each errorEntries as [field, error] (field)}
				<li class="fluent-validation-summary__item">
					<a
						href={"#" + field}
						class="fluent-validation-summary__link"
						onclick={(e) => handleClick(e, field)}
					>
						{labels[field] ?? field}
					</a>
					— {error}
				</li>
			{/each}
		</ul>
		{#if children}{@render children()}{/if}
	</div>
{/if}
