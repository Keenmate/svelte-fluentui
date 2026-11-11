<script lang="ts" module>
	import {fluentTabPanel} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTabPanel())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		class?: string
		style?: string
		id?: string
		active?: boolean
		defer?: boolean
		children?: Snippet
	}

	/** Other native attributes and events go to `<fluent-tab-panel>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		id = undefined,
		active = true,
		defer = false,
		children = undefined,
		...rest
	}: Props = $props()
</script>

<fluent-tab-panel {...rest} class={className} {...(style ? { style } : {})} {...(id ? { id } : {})} hidden={!active} >
	{#if children}
		{@render children?.()}
	{/if}
</fluent-tab-panel>
