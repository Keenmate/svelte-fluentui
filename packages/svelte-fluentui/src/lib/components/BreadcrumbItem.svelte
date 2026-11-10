<script lang="ts">
	import type {Snippet} from "svelte"
	import {fluentBreadcrumbItem, provideFluentDesignSystem} from "@fluentui/web-components"

	provideFluentDesignSystem().register(
		fluentBreadcrumbItem()
	)

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
