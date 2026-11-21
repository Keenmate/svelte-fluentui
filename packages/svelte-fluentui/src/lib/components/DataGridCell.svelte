<!--
@component
Wrapper for `<fluent-data-grid-cell>`: one cell inside a `DataGridRow`.
-->
<script lang="ts" module>
	import {fluentDataGridCell} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDataGridCell())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Extra class on `<fluent-data-grid-cell>`. */
		class?: string
		/** Inline style on the cell. */
		style?: string
		/** 1-based grid column the cell occupies (`grid-column` attribute). */
		gridColumn?: number | string
		/** `columnheader` styles the cell as a header (`cell-type` attribute). Default: `default`. */
		cellType?: "default" | "columnheader"
		/** Column index (`col-index` attribute). */
		colIndex?: number
		/** ARIA role override (e.g. `columnheader`, `gridcell`). */
		role?: string
		/** `tabindex` of the cell. */
		tabIndex?: number
		/** Tooltip (`title`). */
		title?: string
		/** Accessible name (`aria-label`). */
		ariaLabel?: string
		/** Cell content. */
		children?: Snippet
	}

	/** Native attributes and events (`onclick`, `onkeydown`, `onfocus`, …) go to `<fluent-data-grid-cell>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		gridColumn = undefined,
		cellType = "default",
		colIndex = undefined,
		role = undefined,
		tabIndex = undefined,
		title = undefined,
		ariaLabel = undefined,
		children = undefined,
		...rest
	}: Props = $props()
</script>

<fluent-data-grid-cell
	{...rest}
	class={className}
	{...attrs({
		style,
		"grid-column": gridColumn,
		"cell-type": cellType,
		"col-index": colIndex,
		role,
		tabindex: tabIndex,
		title,
		"aria-label": ariaLabel
	})}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-data-grid-cell>
