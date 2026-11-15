<script lang="ts" module>
	import {fluentButton} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentButton())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		class?: string
		style?: string
		disabled?: boolean
		totalItemCount?: number
		/** Current page, 0-based (bindable). */
		currentPageIndex?: number
		lastPageIndex?: number
		/** Defaults to `currentPageIndex > 0`. */
		canGoBack?: boolean
		/** Defaults to `currentPageIndex < lastPageIndex`. */
		canGoForwards?: boolean
		/** Fires when the user moves to another page (first / previous / next / last). */
		onPageChange?: (ctx: {pageIndex: number}) => void
		summaryTemplate?: Snippet
		paginationTextTemplate?: Snippet
	}

	/** Other native attributes and events go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		disabled = false,
		totalItemCount = undefined,
		currentPageIndex = $bindable(0),
		lastPageIndex = 0,
		canGoBack = undefined,
		canGoForwards = undefined,
		onPageChange = undefined,
		summaryTemplate = undefined,
		paginationTextTemplate = undefined,
		...rest
	}: Props = $props()

	const backEnabled = $derived(canGoBack ?? currentPageIndex > 0)
	const forwardsEnabled = $derived(canGoForwards ?? currentPageIndex < lastPageIndex)

	function goTo(pageIndex: number) {
		const next = Math.max(0, Math.min(pageIndex, lastPageIndex))
		if (disabled || next === currentPageIndex) return
		currentPageIndex = next
		onPageChange?.({pageIndex: next})
	}
</script>

<div {...rest} class="paginator {className}" {style}>
	{#if totalItemCount !== undefined}
		<div class="summary">
			{#if summaryTemplate}
				{@render summaryTemplate?.()}
			{:else}
				<strong>{totalItemCount}</strong> items
			{/if}
		</div>
	{/if}

	<nav class="paginator-nav">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<fluent-button
			onclick={() => goTo(0)}
			{...(!backEnabled || disabled ? { disabled: true } : {})}
			title="Go to first page"
			aria-label="Go to first page"
		>
			<span>&laquo;</span>
		</fluent-button>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<fluent-button
			onclick={() => goTo(currentPageIndex - 1)}
			{...(!backEnabled || disabled ? { disabled: true } : {})}
			title="Go to previous page"
			aria-label="Go to previous page"
		>
			<span>&lsaquo;</span>
		</fluent-button>

		<div class="pagination-text">
			{#if paginationTextTemplate}
				{@render paginationTextTemplate?.()}
			{:else}
				Page <strong>{currentPageIndex + 1}</strong> of <strong>{lastPageIndex + 1}</strong>
			{/if}
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<fluent-button
			onclick={() => goTo(currentPageIndex + 1)}
			{...(!forwardsEnabled || disabled ? { disabled: true } : {})}
			title="Go to next page"
			aria-label="Go to next page"
		>
			<span>&rsaquo;</span>
		</fluent-button>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<fluent-button
			onclick={() => goTo(lastPageIndex)}
			{...(!forwardsEnabled || disabled ? { disabled: true } : {})}
			title="Go to last page"
			aria-label="Go to last page"
		>
			<span>&raquo;</span>
		</fluent-button>
	</nav>
</div>

<style>
	.paginator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		padding: 0.25rem 0;
	}

	.summary {
		font-size: 0.9rem;
	}

	.paginator-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0;
		margin-inline-start: auto;
		margin-inline-end: 0;
	}

	.pagination-text {
		margin: 0 0.5rem;
	}
</style>
