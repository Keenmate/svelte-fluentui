<!-- @component
First / previous / next / last page buttons with a "Page X of Y" text and an optional item-count summary.

```svelte
<Paginator bind:currentPageIndex lastPageIndex={9} totalItemCount={200} />
```
-->

<script lang="ts" module>
	import {fluentButton} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentButton())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {PaginatorLabels} from "../i18n/labels.js"

	type OwnProps = {
		/** Extra CSS class on the root `<div>`. */
		class?: string
		/** Inline style on the root `<div>`. */
		style?: string
		/** Disables all navigation buttons. Default: `false`. */
		disabled?: boolean
		/** Total number of items; shows the summary ("N items") when set. */
		totalItemCount?: number
		/** Current page, 0-based (bindable). */
		currentPageIndex?: number
		/** Index of the last page, 0-based. Default: `0`. */
		lastPageIndex?: number
		/** Defaults to `currentPageIndex > 0`. */
		canGoBack?: boolean
		/** Defaults to `currentPageIndex < lastPageIndex`. */
		canGoForwards?: boolean
		/** Fires when the user moves to another page (first / previous / next / last). */
		onPageChange?: (ctx: {pageIndex: number}) => void
		/** Replaces the default "N items" summary. */
		summaryTemplate?: Snippet
		/** Replaces the default "Page X of Y" text. */
		paginationTextTemplate?: Snippet
		/** Overrides of the built-in text (`svelteFluentUI.paginator.*` keys) for this instance. */
		labels?: PaginatorLabels
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
		labels: labelsProp = undefined,
		...rest
	}: Props = $props()

	const t = useTranslations("paginator", () => labelsProp)

	// Label text split into numbers (rendered bold) and the words around them. A number keeps its
	// locale group separators ("1,234", "1.234", "1 234"), so it stays one bold run.
	const NUMBER = /(\d+(?:[.,\s]\d{3})*)/
	function numberParts(text: string): {text: string; isNumber: boolean}[] {
		return text
			.split(NUMBER)
			.filter(Boolean)
			.map((part) => ({text: part, isNumber: /^\d/.test(part)}))
	}

	const backEnabled = $derived(canGoBack ?? currentPageIndex > 0)
	const forwardsEnabled = $derived(canGoForwards ?? currentPageIndex < lastPageIndex)

	function goTo(pageIndex: number) {
		const next = Math.max(0, Math.min(pageIndex, lastPageIndex))
		if (disabled || next === currentPageIndex) return
		currentPageIndex = next
		onPageChange?.({pageIndex: next})
	}
</script>

{#snippet boldNumbers(text: string)}
	{#each numberParts(text) as part, i (i)}{#if part.isNumber}<strong>{part.text}</strong>{:else}{part.text}{/if}{/each}
{/snippet}

<div {...rest} class="paginator {className}" {style}>
	{#if totalItemCount !== undefined}
		<div class="summary">
			{#if summaryTemplate}
				{@render summaryTemplate?.()}
			{:else}
				{@render boldNumbers(t("itemCount", {count: totalItemCount}))}
			{/if}
		</div>
	{/if}

	<nav class="paginator-nav" aria-label={t("paginationAriaLabel")}>
		<fluent-button
			onclick={() => goTo(0)}
			{...!backEnabled || disabled ? {disabled: true} : {}}
			title={t("firstPageTooltip")}
			aria-label={t("firstPageAriaLabel")}
		>
			<span>&laquo;</span>
		</fluent-button>

		<fluent-button
			onclick={() => goTo(currentPageIndex - 1)}
			{...!backEnabled || disabled ? {disabled: true} : {}}
			title={t("previousPageTooltip")}
			aria-label={t("previousPageAriaLabel")}
		>
			<span>&lsaquo;</span>
		</fluent-button>

		<!-- Live: a page change is announced (the pressed button may have just become disabled). -->
		<div class="pagination-text" aria-live="polite">
			{#if paginationTextTemplate}
				{@render paginationTextTemplate?.()}
			{:else}
				{@render boldNumbers(t("pageInfo", {page: currentPageIndex + 1, pageCount: lastPageIndex + 1}))}
			{/if}
		</div>

		<fluent-button
			onclick={() => goTo(currentPageIndex + 1)}
			{...!forwardsEnabled || disabled ? {disabled: true} : {}}
			title={t("nextPageTooltip")}
			aria-label={t("nextPageAriaLabel")}
		>
			<span>&rsaquo;</span>
		</fluent-button>

		<fluent-button
			onclick={() => goTo(lastPageIndex)}
			{...!forwardsEnabled || disabled ? {disabled: true} : {}}
			title={t("lastPageTooltip")}
			aria-label={t("lastPageAriaLabel")}
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
