<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		children?: Snippet
	}

	/** Other native attributes and events go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		class: className = "",
		...rest
	}: Props = $props()
</script>

<div {...rest} class={["content-region", className]}>
	{@render children?.()}
</div>
