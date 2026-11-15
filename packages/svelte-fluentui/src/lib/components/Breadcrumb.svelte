<!-- @component
Wrapper for `<fluent-breadcrumb>` — a trail of `<BreadcrumbItem>` links.

```svelte
<Breadcrumb>
	<BreadcrumbItem href="/">Home</BreadcrumbItem>
	<BreadcrumbItem>Current</BreadcrumbItem>
</Breadcrumb>
```
-->

<script lang="ts" module>
	import {fluentBreadcrumb} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentBreadcrumb())
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** `<BreadcrumbItem>` children. */
		children?: Snippet
	}

	/** Other native attributes and events (`class`, `style`, `aria-label`, …) go to `<fluent-breadcrumb>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		...rest
	}: Props = $props()
</script>

<fluent-breadcrumb {...rest}>
	{@render children?.()}
</fluent-breadcrumb>
