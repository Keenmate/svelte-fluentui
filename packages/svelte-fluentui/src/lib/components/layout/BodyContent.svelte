<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		children?: Snippet
	}

	/** Other native attributes and events (`id`, `class`, `style`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		class: className = undefined,
		...rest
	    }: Props = $props()
</script>

<div {...rest} class={["body-content", className]}>
	{@render children?.()}
</div>

<style lang="scss">
	.body-content {
		margin: 0;
		align-items: flex-start;
		width: 100%;
		font-family: var(--body-font);
		font-weight: normal;
		font-size: var(--type-ramp-base-font-size);
		line-height: var(--type-ramp-base-line-height);
	}
</style>
