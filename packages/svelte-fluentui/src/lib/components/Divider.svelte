<!--
@component
Wrapper for `<fluent-divider>`: a horizontal or vertical separator line.

```svelte
<Divider orientation="vertical" />
```
-->
<script lang="ts" module>
	import {fluentDivider} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDivider())
</script>

<script lang="ts">
	import type {Orientation, RestProps} from "../types/index.js"

	type OwnProps = {
		/** Extra class on `<fluent-divider>`. */
		class?: string
		/** Inline style on the divider. */
		style?: string
		/** Line direction (`orientation` attribute). Default: `horizontal`. */
		orientation?: Orientation
		/** `separator` (announced) or `presentation` (decorative) (`role` attribute). Default: `separator`. */
		role?: "separator" | "presentation"
	}

	/** Other native attributes and events go to `<fluent-divider>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {class: className = "", style = "", orientation = "horizontal", role = "separator", ...rest}: Props = $props()
</script>

<!-- fluent-divider's shadow DOM borders itself with `--neutral-stroke-divider-rest`
     (#ebebeb in the default light theme), which sits one shade away from the
     page background and reads as invisible. Re-point the token at the heavier
     `--neutral-stroke-rest` so the line actually shows up. The variable is
     inherited into the shadow DOM, so setting it on the host suffices. -->
<fluent-divider
	{...rest}
	class={className}
	{orientation}
	{role}
	style="--neutral-stroke-divider-rest: var(--neutral-stroke-rest); {style}"
></fluent-divider>
