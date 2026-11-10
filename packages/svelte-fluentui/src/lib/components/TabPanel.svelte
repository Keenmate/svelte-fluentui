<script lang="ts">
	import type {Snippet} from "svelte"
	import {fluentTabPanel, provideFluentDesignSystem} from "@fluentui/web-components"

	provideFluentDesignSystem().register(fluentTabPanel())

	type Props = {
		class?: string
		style?: string
		id?: string
		active?: boolean
		defer?: boolean
		children?: Snippet
	}

	let {
		class: className = "",
		style = "",
		id = undefined,
		active = true,
		defer = false,
		children = undefined
	}: Props = $props()
</script>

<fluent-tab-panel class={className} {...(style ? { style } : {})} {...(id ? { id } : {})} hidden={!active} >
	{#if children}
		{@render children?.()}
	{/if}
</fluent-tab-panel>
