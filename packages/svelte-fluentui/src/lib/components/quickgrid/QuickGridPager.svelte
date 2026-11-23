<script lang="ts">
	import type {Translate} from "../../i18n/translate.svelte.js"

	// QuickGrid's pager (internal): previous / next, "Page x of y (n items)", optional page-size select.
	type Props = {
		t: Translate<"quickGrid">
		/** 1-based, already clamped. */
		page: number
		pageCount: number
		itemCount: number
		pageSize: number
		/** Page-size choices; none → no selector. */
		pageSizes: number[]
		/** A page change is waiting for `beforePageChangeCallback`. */
		busy: boolean
		onPageRequest: (ctx: {page: number}) => void
		/** Resolves `false` when the change was refused — the select then shows `pageSize` again. */
		pageSizeChangeCallback: (ctx: {pageSize: number}) => Promise<boolean>
	}

	let {t, page, pageCount, itemCount, pageSize, pageSizes, busy, onPageRequest, pageSizeChangeCallback}: Props =
		$props()

	function changePageSize(select: HTMLSelectElement) {
		const size = Number(select.value)
		if (!(size > 0) || size === pageSize) return
		void pageSizeChangeCallback({pageSize: size}).then((applied) => {
			if (!applied) select.value = String(pageSize)
		})
	}
</script>

<nav class="pagination" aria-label={t("paginationAriaLabel")} aria-busy={busy || null}>
	{#if pageSizes.length > 0}
		<label class="pagination-size">
			<select
				class="pagination-size-select"
				value={pageSize}
				disabled={busy}
				onchange={(e) => changePageSize(e.currentTarget)}
			>
				{#each pageSizes as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
			{t("perPage")}
		</label>
	{/if}

	<button class="pagination-btn" disabled={page <= 1 || busy} onclick={() => onPageRequest({page: page - 1})}>
		{t("previousPage")}
	</button>

	<div class="pagination-info">
		{t("pageInfo", {page, pageCount})}
		<span class="item-count">
			({t("itemCount", {count: itemCount})})
		</span>
	</div>

	<button class="pagination-btn" disabled={page >= pageCount || busy} onclick={() => onPageRequest({page: page + 1})}>
		{t("nextPage")}
	</button>
</nav>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		.pagination {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 16px;
			padding: calc(var(--design-unit) * 3px);
			border-block-start: 1px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
			background: var(--fluent-quickgrid-bg, var(--neutral-layer-1, #ffffff));
		}

		.pagination-btn {
			padding: 6px 16px;
			background: var(--neutral-layer-1, #ffffff);
			border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
			border-radius: var(--control-corner-radius, 4px);
			color: var(--neutral-foreground-rest, #242424);
			font-size: var(--type-ramp-base-font-size, 14px);
			cursor: pointer;
			transition: all 0.1s ease;
		}

		.pagination-btn:hover:not(:disabled) {
			background: var(--neutral-layer-2, #f5f5f5);
			border-color: var(--neutral-stroke-input-hover, #a0a0a0);
		}

		.pagination-btn:active:not(:disabled) {
			background: var(--neutral-layer-3, #ebebeb);
		}

		.pagination-btn:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}

		.pagination-size {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 12px;
			color: var(--neutral-foreground-hint, #707070);
		}

		.pagination-size-select {
			padding: 4px 6px;
			background: var(--neutral-layer-1, #ffffff);
			border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
			border-radius: var(--control-corner-radius, 4px);
			color: var(--neutral-foreground-rest, #242424);
			font: inherit;
		}

		.pagination-info {
			font-size: var(--type-ramp-base-font-size, 14px);
			color: var(--neutral-foreground-rest, #242424);
		}

		.item-count {
			font-size: 12px;
			color: var(--neutral-foreground-hint, #707070);
			margin-inline-start: 4px;
		}
	}
</style>
