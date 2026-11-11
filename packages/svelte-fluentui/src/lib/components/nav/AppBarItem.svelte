<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"
	import Stack from "../layout/Stack.svelte"
	import {StackHorizontalAlign, StackOrientation, StackVerticalAlign} from "../../fluent-ui/constants/stack.js"

	type OwnProps = {
		href?: string
		rel?: string
		target?: string
		count?: number
		/** Highlights the item as the current one. Controlled by the app (e.g. from the current route). */
		active?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		icon?: Snippet
		children?: Snippet
		class?: string
	}

	/** Other native attributes and events (`target`, `title`, `aria-current`, `onkeydown`, …) go to the inner `<a>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    href     = undefined,
		    rel      = undefined,
		    target   = undefined,
		    active   = undefined,
		    onclick = undefined,
		    icon = undefined,
		    children = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()
</script>

<div
	class="fluent-appbar-item {className || ''}"
>
	<div class="fluentui-counterbadge-container">
		<a
			{...rest}
			{href}
			{rel}
			{target}
			class:active
			{onclick}
		>
			<Stack
				orientation={StackOrientation.Vertical}
				verticalAlign={StackVerticalAlign.Center}
				horizontalAlign={StackHorizontalAlign.Center}
				horizontalGap="10px"
				verticalGap="0"
				width="100%"
				height="100%"
			>
				{@render icon?.()}

				<div part="label">
					{@render children?.()}
				</div>
			</Stack>
		</a>
	</div>

</div>
