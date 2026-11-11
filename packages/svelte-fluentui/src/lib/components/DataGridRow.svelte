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
		class?: string;
		style?: string;
		rowIndex?: number;
		rowType?: string;
		children?: Snippet;
	};

	/** Native attributes and events (`onclick`, `ondblclick`, `onkeydown`, `onfocus`, …) go to `<fluent-data-grid-row>`. */
	type Props = OwnProps & RestProps<OwnProps>;

	let {
		class: className = "",
		style = "",
		rowIndex = undefined,
		rowType = undefined,
		children = undefined,
		...rest
	}: Props = $props();
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
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
