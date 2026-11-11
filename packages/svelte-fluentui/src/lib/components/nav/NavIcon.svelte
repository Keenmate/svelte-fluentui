<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		children?: Snippet
	}

	/** Other native attributes and events go to the root `<span>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		class: className = undefined,
		...rest
	    }: Props = $props()
</script>

<span {...rest} class={["fluent-nav-icon", className]}>
	{@render children?.()}
</span>

<style>
	.fluent-nav-icon {
		min-width: 20px;
	}
</style>
