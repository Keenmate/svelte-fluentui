<!--
@component
Wrapper for `<fluent-data-grid-row>`: one row of `DataGridCell`s inside a `DataGrid`.
-->
<script lang="ts" module>
	import {fluentDataGridRow} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDataGridRow())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Extra class on `<fluent-data-grid-row>`. */
		class?: string
		/** Inline style on the row. */
		style?: string
		/** Row index, rendered as `data-row-index`. */
		rowIndex?: number
		/** Row kind: `default`, `header` or `sticky-header` (`row-type` attribute). */
		rowType?: string
		/** `<DataGridCell>` children. */
		children?: Snippet
	}

	/** Native attributes and events (`onclick`, `ondblclick`, `onkeydown`, `onfocus`, …) go to `<fluent-data-grid-row>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		rowIndex = undefined,
		rowType = undefined,
		children = undefined,
		...rest
	}: Props = $props()
</script>

<fluent-data-grid-row
	{...rest}
	class={className}
	{...attrs({style, "data-row-index": rowIndex, "row-type": rowType})}
	role="row"
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-data-grid-row>
