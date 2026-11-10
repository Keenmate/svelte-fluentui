<script lang="ts">
	import type {Snippet} from "svelte"
	import {fluentBreadcrumb, provideFluentDesignSystem} from "@fluentui/web-components"

	provideFluentDesignSystem().register(
		fluentBreadcrumb()
	)
	
	type Props = {
		children?: Snippet
	}

	let {
		children = undefined
	    }: Props = $props()
</script>

<fluent-breadcrumb >
	{@render children?.()}
</fluent-breadcrumb>
