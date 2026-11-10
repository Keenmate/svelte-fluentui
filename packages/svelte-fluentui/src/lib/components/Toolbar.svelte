<script lang="ts" module>
	import {fluentToolbar} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentToolbar())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
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
	{...attrs({id, style, orientation})}
	class={className}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-toolbar>
