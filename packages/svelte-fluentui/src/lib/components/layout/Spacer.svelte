<script lang="ts">
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		width?: string | number
	}

	/** Other native attributes and events (`id`, `class`, `style`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		width = undefined,
		class: className = undefined,
		...rest
	}: Props = $props()

	let widthCssVar = $derived(width && `${width}px`)
</script>

<div
	{...rest}
	class={["spacer", className]}
	class:auto-width={!width}
	style:--spacer-width={widthCssVar}
></div>

<style lang="scss">
	.spacer {
		width: var(--spacer-width);

		&.auto-width {
			flex: 1;
			width: auto;
		}
	}
</style>
