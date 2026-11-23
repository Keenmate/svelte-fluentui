<!-- @component
Flex spacer: a fixed-width gap, or (without `width`) grows to push siblings apart.

```svelte
<Stack orientation="horizontal"><span>Left</span><Spacer /><span>Right</span></Stack>
```
-->

<script lang="ts">
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Fixed width: a number (or numeric string) is px, any other string is used as a CSS length
		 * (`"1rem"`, `"10%"`). Omit to grow and fill the free space (`flex: 1`). */
		width?: string | number
	}

	/** Other native attributes and events (`id`, `class`, `style`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {width = undefined, class: className = undefined, ...rest}: Props = $props()

	// Numbers and bare numeric strings ("100") get `px`; CSS lengths pass through.
	let widthCssVar = $derived(
		!width ? undefined : typeof width === "number" || /^\d+(\.\d+)?$/.test(width.trim()) ? `${width}px` : width
	)
</script>

<div {...rest} class={["spacer", className]} class:auto-width={!width} style:--fluent-spacer-width={widthCssVar}></div>

<style lang="scss">
	@layer reset, variables, component, overrides;

	@layer component {
		.spacer {
			width: var(--fluent-spacer-width);

			&.auto-width {
				flex: 1;
				width: auto;
			}
		}
	}
</style>
