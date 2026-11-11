<script lang="ts" module>
	import {fluentBreadcrumbItem} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentBreadcrumbItem())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		href?: string
		separator?: Snippet
		children?: Snippet
	}

	/** Other native attributes and events (`onclick`, `class`, `aria-current`, …) go to `<fluent-breadcrumb-item>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		href = undefined,
		separator = undefined,
		children = undefined,
		...rest
	}: Props = $props()
</script>

<fluent-breadcrumb-item
	{...rest}
	{...attrs({href})}
>
	{#if separator}
		<span slot="separator">
			{@render separator?.()}
		</span>
	{/if}

	{@render children?.()}
</fluent-breadcrumb-item>
