<script lang="ts" generics="T">
	import Icon from "../Icon.svelte"
	import type {QuickGridColumn as Column, QuickGridSortMode, QuickGridSortState} from "../QuickGrid.types.js"
	import {isColumnSortable, type ColumnStyles} from "./columns.js"
	import type {Translate} from "../../i18n/translate.svelte.js"

	// QuickGrid's `<thead>` (internal): the optional filter row and the header row with sort buttons.
	type Props = {
		columns: Column<T>[]
		columnStyles: ColumnStyles[]
		t: Translate<"quickGrid">
		sortMode: QuickGridSortMode
		sort: QuickGridSortState[]
		filterable: boolean
		filters: Record<string, string>
		/** `false` for a field whose `filterCallback` rejected the input. */
		filterValidity: Record<string, boolean>
		/** The row-toolbar `⋮` column (toolbarTrigger "button"). */
		actionsColumn: boolean
		fillerColumn: boolean
		/** `aria-rowindex` of the header row; undefined → no row indexes. */
		headerRowIndex: number | undefined
		onSortRequest: (ctx: {column: Column<T>; additive: boolean}) => void
		/** Resolves `false` when the change was refused — the input then shows `filters` again. */
		filterChangeCallback: (ctx: {field: string; value: string}) => boolean | Promise<boolean>
	}

	let {
		columns,
		columnStyles,
		t,
		sortMode,
		sort,
		filterable,
		filters,
		filterValidity,
		actionsColumn,
		fillerColumn,
		headerRowIndex,
		onSortRequest,
		filterChangeCallback
	}: Props = $props()

	// `aria-sort` goes on the primary sorted column only (ARIA: one header at a time)
	function getAriaSort(column: Column<T>): "ascending" | "descending" | undefined {
		const primary = sort[0]
		if (!primary || primary.column !== String(column.field) || !isColumnSortable(column, sortMode)) return undefined
		return primary.direction === "asc" ? "ascending" : "descending"
	}

	// Ctrl / ⌘ + Enter / Space mirrors Ctrl + click (the button's own click has no modifier)
	function handleSortKeyDown(column: Column<T>, event: KeyboardEvent) {
		if ((event.key === "Enter" || event.key === " ") && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()
			onSortRequest({column, additive: true})
		}
	}

	async function handleFilterInput(field: string, input: HTMLInputElement) {
		const applied = await filterChangeCallback({field, value: input.value})
		if (!applied) input.value = filters[field] ?? ""
	}
</script>

<thead>
	{#if filterable}
		<tr class="filter-row" aria-rowindex={headerRowIndex !== undefined ? 1 : undefined}>
			{#if actionsColumn}
				<th class="actions-column"></th>
			{/if}
			{#each columns as column, colIndex}
				<th style={columnStyles[colIndex].filter}>
					{#if column.filterable !== false}
						<input
							type="text"
							class="filter-input"
							class:invalid={filterValidity[String(column.field)] === false}
							placeholder={t("filterPlaceholder")}
							aria-label={t("filterAriaLabel", {column: column.title})}
							value={filters[String(column.field)] || ""}
							oninput={(e) => handleFilterInput(String(column.field), e.currentTarget)}
						/>
					{/if}
				</th>
			{/each}
			{#if fillerColumn}
				<th class="filler-column"></th>
			{/if}
		</tr>
	{/if}
	<tr aria-rowindex={headerRowIndex}>
		{#if actionsColumn}
			<th class="actions-column"></th>
		{/if}
		{#each columns as column, colIndex}
			{@const sortable = isColumnSortable(column, sortMode)}
			{@const sortIndex = sort.findIndex((s) => s.column === String(column.field))}
			{@const sortState = sortIndex >= 0 ? sort[sortIndex] : undefined}
			{#snippet headerContent()}
				<span>{column.title}</span>
				{#if column.headerInfo}
					<span class="header-info-icon">
						<Icon name="info" size={16} color="accent" title={column.headerInfo} />
					</span>
				{/if}
				{#if sortable}
					<span class="sort-indicator" aria-hidden="true">
						{#if sortState}
							{sortState.direction === "asc" ? "▲" : "▼"}{#if sort.length > 1}<span class="sort-priority">
									{sortIndex + 1}
								</span>{/if}
						{:else}
							<span class="sort-placeholder">⬍</span>
						{/if}
					</span>
				{/if}
			{/snippet}
			<th
				class={`column-header ${sortable ? "sortable" : ""} ${sortState ? `sorted sorted-${sortState.direction}` : ""}`}
				style={columnStyles[colIndex].header}
				aria-sort={getAriaSort(column)}
			>
				{#if sortable}
					<!-- Enter / Space sort; Ctrl / ⌘ adds the column in "multiple" mode -->
					<button
						type="button"
						class="column-header-content column-sort-button"
						onclick={(e) => onSortRequest({column, additive: e.ctrlKey || e.metaKey})}
						onkeydown={(e) => handleSortKeyDown(column, e)}
					>
						{@render headerContent()}
					</button>
				{:else}
					<div class="column-header-content">{@render headerContent()}</div>
				{/if}
			</th>
		{/each}
		{#if fillerColumn}
			<th class="filler-column column-header"></th>
		{/if}
	</tr>
</thead>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		/* Same as the body's filler cell (QuickGrid.svelte); before `.column-header` so the header's wins */
		.filler-column {
			width: 100%;
			padding: 0;
			background: transparent;
		}

		.column-header {
			background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #f5f5f5));
			color: var(--fluent-quickgrid-text, var(--neutral-foreground-rest, #242424));
			font-weight: var(--font-weight-semibold, 600);
			padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
			border-block-end: 2px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
			text-align: start;
			user-select: none;
			position: relative;
		}

		.column-header.sortable {
			cursor: pointer;
			padding: 0;
		}

		/* The sort button fills its header cell (the padding moves onto it) */
		.column-sort-button {
			all: unset;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 4px;
			width: 100%;
			padding: calc(var(--design-unit) * 2px) calc(var(--design-unit) * 3px);
			cursor: pointer;
			text-align: inherit;
		}

		.column-sort-button:focus-visible {
			outline: calc(var(--focus-stroke-width, 2) * 1px) solid
				var(--fluent-quickgrid-focus-stroke, var(--focus-stroke-outer, #0078d4));
			outline-offset: calc(var(--focus-stroke-width, 2) * -1px);
		}

		.column-header.sortable:hover {
			background: var(--fluent-quickgrid-header-bg-hover, var(--neutral-layer-3, #ebebeb));
		}

		.column-header-content {
			display: flex;
			align-items: center;
			gap: 4px;
			justify-content: space-between;
		}

		.sort-indicator {
			font-size: 10px;
			opacity: 0.8;
			min-width: 12px;
			text-align: center;
			color: var(--accent-fill-rest, currentColor);
		}

		.sort-priority {
			font-size: 9px;
			margin-inline-start: 1px;
			vertical-align: super;
		}

		.sort-placeholder {
			color: var(--neutral-foreground-rest, currentColor);
			opacity: 0.3;
		}

		.header-info-icon {
			font-size: 12px;
			color: var(--accent-fill-rest, #0078d4);
			cursor: help;
			opacity: 0.7;
			margin-inline-start: 2px;
		}

		.header-info-icon:hover {
			opacity: 1;
		}

		.column-header.sorted {
			background: var(--fluent-quickgrid-header-bg-sorted, var(--neutral-layer-3, #ebebeb));
		}

		.filter-row th {
			padding: calc(var(--design-unit) * 1px) calc(var(--design-unit) * 2px);
			background: var(--fluent-quickgrid-bg, var(--neutral-layer-1, #ffffff));
			border-block-end: 1px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
		}

		.filter-input {
			width: 100%;
			padding: 4px 8px;
			border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
			border-radius: var(--control-corner-radius, 4px);
			background: var(--fluent-quickgrid-bg, var(--neutral-layer-1, #ffffff));
			color: var(--fluent-quickgrid-text, var(--neutral-foreground-rest, #242424));
			font-size: 12px;
			box-sizing: border-box;
		}

		.filter-input:focus {
			outline: none;
			border-color: var(--accent-fill-rest, #0078d4);
			box-shadow: 0 0 0 1px var(--accent-fill-rest, #0078d4);
		}

		/* Invalid state — surfaced when a column's `filter` callback returned null on the
	   probe row (i.e. user typed something syntactically incomplete like `>`). Themes
	   that override `--fluent-color-danger-foreground` get the right red (dark theme included). */
		.filter-input.invalid {
			border-color: var(--fluent-color-danger-foreground, #d13438);
		}

		.filter-input.invalid:focus {
			border-color: var(--fluent-color-danger-foreground, #d13438);
			box-shadow: 0 0 0 1px var(--fluent-color-danger-foreground, #d13438);
		}

		/* Same as the body's actions cell (QuickGrid.svelte) */
		.actions-column {
			width: 32px;
			min-width: 32px;
			max-width: 32px;
			text-align: center;
		}

		/* ID-level specificity via :not(#_) instead of an important flag — wins over the class rules here, yet an app's own CSS can still override it */
		.actions-column:not(#_) {
			padding: 0;
		}

		thead .actions-column {
			background: var(--fluent-quickgrid-header-bg, var(--neutral-layer-2, #f5f5f5));
			border-block-end: 2px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
		}

		.filter-row .actions-column {
			background: var(--fluent-quickgrid-bg, var(--neutral-layer-1, #ffffff));
			border-block-end: 1px solid var(--fluent-quickgrid-border, var(--neutral-stroke-layer-rest, #e0e0e0));
		}
	}
</style>
