<script lang="ts" module>
	import {fluentToolbar} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentToolbar())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"

	type Props = {
		id?: string;
		class?: string;
		style?: string;
		orientation?: "horizontal" | "vertical";
		children?: Snippet;
	};

	let {
		id = undefined,
		class: className = "",
		style = "",
		orientation = "horizontal",
		children = undefined
	}: Props = $props();
</script>

<fluent-toolbar
	{...(id ? { id } : {})}
	class={className}
	{...(style ? { style } : {})}
	{...(orientation ? { orientation } : {})}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-toolbar>
