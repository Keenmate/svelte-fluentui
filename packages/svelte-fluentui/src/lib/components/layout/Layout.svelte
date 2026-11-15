<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"

	type OwnProps = {
		children?: Snippet
		orientation?: Orientation
		class?: string
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		orientation = "vertical",
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	let element: HTMLElement | undefined = $state()
</script>

<div
	{...rest}
	bind:this={element}
	{style}
	class="layout {className}"
	data-orientation={orientation === "horizontal" ? "horizontal" : null}
>
	{@render children?.()}
</div>
