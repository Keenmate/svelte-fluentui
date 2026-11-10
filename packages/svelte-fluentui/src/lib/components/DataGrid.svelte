<script lang="ts" module>
	import {fluentDataGrid} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDataGrid())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"

	type Props = {
		class?: string;
		style?: string;
		id?: string;
		ariaRowCount?: number;
		generateHeader?: "none" | "default" | "sticky";
		gridTemplateColumns?: string;
		role?: string;
		onCloseColumnOptions?: (e: Event) => void;
		onCloseColumnResize?: (e: Event) => void;
		children?: Snippet;
	};

	let {
		class: className = "",
		style = "",
		id = undefined,
		ariaRowCount = undefined,
		generateHeader = undefined,
		gridTemplateColumns = undefined,
		role = "grid",
		onCloseColumnOptions = undefined,
		onCloseColumnResize = undefined,
		children = undefined
	}: Props = $props();

	function handleCloseColumnOptions(e: Event) {
		onCloseColumnOptions?.(e);
	}

	function handleCloseColumnResize(e: Event) {
		onCloseColumnResize?.(e);
	}

	// Also expose the template as an inheriting custom property. FluentUI applies
	// it to each row imperatively (via inline style), which is enough on its own,
	// but publishing it as a CSS variable lets a scoped rule (see
	// fluent-blazor-compat.scss) guarantee every row — header included — is laid
	// out, independent of FluentUI's per-row timing.
	let mergedStyle = $derived(
		gridTemplateColumns
			? `${style ? `${style}; ` : ""}--fluent-data-grid-template-columns: ${gridTemplateColumns}`
			: style
	);
</script>

<fluent-data-grid
	class={className}
	{...attrs({
		style: mergedStyle, id, "aria-rowcount": ariaRowCount, "generate-header": generateHeader,
		"grid-template-columns": gridTemplateColumns
	})}
	role={role}
	onclosecolumnoptions={handleCloseColumnOptions}
	onclosecolumnresize={handleCloseColumnResize}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-data-grid>
