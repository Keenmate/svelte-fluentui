<!-- @component
Groups controls in a single tab stop with arrow-key navigation, wrapping `<fluent-toolbar>`.

```svelte
<Toolbar aria-label="Formatting">
	<Button>Bold</Button>
	<Button>Italic</Button>
</Toolbar>
```
-->
<script lang="ts" module>
	import {fluentToolbar} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentToolbar())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../types/index.js"

	type OwnProps = {
		/** Id of `<fluent-toolbar>`. */
		id?: string;
		/** Extra CSS class on `<fluent-toolbar>`. */
		class?: string;
		/** Inline style on `<fluent-toolbar>`. */
		style?: string;
		/** Layout and arrow-key direction (`orientation` attribute). Default: `"horizontal"`. */
		orientation?: Orientation;
		/** Toolbar items (buttons, fields, …); arrow keys move focus between them. */
		children?: Snippet;
	};

	/** Other native attributes and events (`onkeydown`, `aria-label`, …) go to `<fluent-toolbar>`. */
	type Props = OwnProps & RestProps<OwnProps>;

	let {
		id = undefined,
		class: className = "",
		style = "",
		orientation = "horizontal",
		children = undefined,
		...rest
	}: Props = $props();
</script>

<fluent-toolbar
	{...rest}
	{...attrs({id, style, orientation})}
	class={className}
>
	{#if children}
		{@render children?.()}
	{/if}
</fluent-toolbar>
