<script lang="ts">
	import type {Snippet} from "svelte"
	import { fluentToolbar, provideFluentDesignSystem } from "@fluentui/web-components";

	provideFluentDesignSystem().register(fluentToolbar());

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
