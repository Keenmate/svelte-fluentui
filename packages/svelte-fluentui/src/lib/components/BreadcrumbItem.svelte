<script lang="ts" module>
	import {fluentBreadcrumbItem} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentBreadcrumbItem())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"

	type Props = {
		href?: string
		separator?: Snippet
		children?: Snippet
	}

	let {
		href = undefined,
    separator = undefined,
		children = undefined
	    }: Props = $props()
</script>

<fluent-breadcrumb-item
	{...(href ? { href } : {})}
>
	{#if separator}
		<span slot="separator">
			{@render separator?.()}
		</span>
	{/if}

	{@render children?.()}
</fluent-breadcrumb-item>
