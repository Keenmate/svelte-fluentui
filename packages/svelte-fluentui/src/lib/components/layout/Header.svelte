<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		children?: Snippet
		height?: number
		class?: string
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<header>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		height = 50,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	let element: HTMLElement | undefined = $state()

	let computedStyle = $derived(
		[height != null && `height: ${height}px;`, style].filter(Boolean).join(" ")
	)
</script>

<header
	{...rest}
	bind:this={element}
	style={computedStyle}
	class="header {className}"
>
	<div class="header-gutters">
		{@render children?.()}
	</div>
</header>
