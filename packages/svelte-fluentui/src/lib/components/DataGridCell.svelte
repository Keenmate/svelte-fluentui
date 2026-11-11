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
		class?: string
		style?: string
		gridColumn?: number | string
		cellType?: "default" | "columnheader"
		colIndex?: number
		role?: string
		tabIndex?: number
		title?: string
		ariaLabel?: string
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

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_click_events_have_key_events -->
<fluent-data-grid-cell
	{...rest}
	class={className}
	{...attrs({
		style, "grid-column": gridColumn, "cell-type": cellType, "col-index": colIndex, role,
		tabindex: tabIndex, title, "aria-label": ariaLabel
	})}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-data-grid-cell>
