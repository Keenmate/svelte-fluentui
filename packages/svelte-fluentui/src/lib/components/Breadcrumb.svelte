<script lang="ts" module>
	import {fluentBreadcrumb} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentBreadcrumb())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"

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
