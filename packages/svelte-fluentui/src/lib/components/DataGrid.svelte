<!--
@component
Wrapper for `<fluent-data-grid>`: a keyboard-navigable grid of `DataGridRow` / `DataGridCell` children.

```svelte
<DataGrid gridTemplateColumns="1fr 1fr">
	<DataGridRow><DataGridCell gridColumn={1}>A</DataGridCell><DataGridCell gridColumn={2}>B</DataGridCell></DataGridRow>
</DataGrid>
```
-->
<script lang="ts" module>
	import {fluentDataGrid} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDataGrid())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Extra class on `<fluent-data-grid>`. */
		class?: string;
		/** Inline style on `<fluent-data-grid>`. */
		style?: string;
		/** Element id. */
		id?: string;
		/** Total row count for assistive tech (`aria-rowcount`), e.g. when only a page is rendered. */
		ariaRowCount?: number;
		/** Auto-generated header row: `none`, `default` or `sticky` (`generate-header` attribute). */
		generateHeader?: "none" | "default" | "sticky";
		/** CSS `grid-template-columns` applied to every row, e.g. "1fr 2fr 120px" (`grid-template-columns` attribute). */
		gridTemplateColumns?: string;
		/** ARIA role. Default: `grid`. */
		role?: string;
		/** `<DataGridRow>` children. */
		children?: Snippet;
	};

	/** Native attributes and events (`onkeydown`, `onclick`, …) go to `<fluent-data-grid>`. */
	type Props = OwnProps & RestProps<OwnProps>;

	let {
		class: className = "",
		style = "",
		id = undefined,
		ariaRowCount = undefined,
		generateHeader = undefined,
		gridTemplateColumns = undefined,
		role = "grid",
		children = undefined,
		...rest
	}: Props = $props();

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
	{...rest}
	class={className}
	{...attrs({
		style: mergedStyle, id, "aria-rowcount": ariaRowCount, "generate-header": generateHeader,
		"grid-template-columns": gridTemplateColumns
	})}
	role={role}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-data-grid>
