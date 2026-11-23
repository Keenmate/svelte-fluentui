<!-- @component
Full-width, non-wrapping flex row with a start margin — a simple region for inline header/toolbar content.
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Region content. */
		children?: Snippet
	}

	/** Other native attributes and events go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {children = undefined, class: className = "", ...rest}: Props = $props()
</script>

<div {...rest} class={["content-region", className]}>
	{@render children?.()}
</div>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		.content-region {
			display: flex;
			align-items: center;
			white-space: nowrap;
			width: 100%;
			margin-inline-start: calc(var(--design-unit) * 2px);
		}
	}
</style>
