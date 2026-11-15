<script lang="ts" module>
	import {fluentToolbar} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentToolbar())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../types/index.js"

	type OwnProps = {
		id?: string;
		class?: string;
		style?: string;
		orientation?: Orientation;
		children?: Snippet;
	};

	/** Other native attributes and events (`onkeydown`, `aria-label`, …) go to `<fluent-toolbar>`. */
	type Props = OwnProps & RestProps<OwnProps>;

	let {
		id = undefined,
		class: className = "",
		style = "",
		orientation = "horizontal",
		children = undefined,
		...rest
	}: Props = $props();
</script>

<fluent-toolbar
	{...rest}
	{...attrs({id, style, orientation})}
	class={className}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-toolbar>
