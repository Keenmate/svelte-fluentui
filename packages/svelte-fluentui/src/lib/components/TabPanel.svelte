<!-- @component
Standalone panel wrapping `<fluent-tab-panel>`; shown while `active`. Not used by `<Tabs>` / `<Tab>`, which render their own panels.
-->
<script lang="ts" module>
	import {fluentTabPanel} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentTabPanel())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Extra CSS class on `<fluent-tab-panel>`. */
		class?: string
		/** Inline style on `<fluent-tab-panel>`. */
		style?: string
		/** Id of `<fluent-tab-panel>`. */
		id?: string
		/** Shows the panel; `false` sets the `hidden` attribute. Default: `true`. */
		active?: boolean
		/** Lazy content: `children` aren't rendered until the panel is first `active`, then stay mounted
		 * (state survives later hide/show). Default: `false` (rendered immediately, even while hidden). */
		defer?: boolean
		/** Panel content. */
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

	// `defer`: mount the content on first activation, keep it mounted afterwards.
	// svelte-ignore state_referenced_locally
	let activated = $state(active)
	$effect(() => {
		if (active) activated = true
	})
	const renderContent = $derived(!defer || active || activated)
</script>

<fluent-tab-panel {...rest} class={className} {...(style ? { style } : {})} {...(id ? { id } : {})} hidden={!active} >
	{#if children && renderContent}
		{@render children()}
	{/if}
</fluent-tab-panel>
