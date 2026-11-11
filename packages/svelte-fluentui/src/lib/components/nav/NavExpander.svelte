<script lang="ts">
	import HamburgerIcon from "../icons/HamburgerIcon.svelte"
	import NavItem from "./NavItem.svelte"
	import PositioningRegion from "../PositioningRegion.svelte"
	import ContentRegion from "../ContentRegion.svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		class?: string
	}

	/** Other native attributes and events (`aria-label`, `title`, …) go to the underlying NavItem `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		onclick = undefined,
		class: className = undefined,
		...rest
	    }: Props = $props()

	// Forwarded to a child component whose own prop types are narrower than
	// HTMLAttributes (no `null`), so hand the spread over untyped.
	const forwarded = $derived(rest as Record<string, unknown>)
</script>

<NavItem
	{...forwarded}
	class="expander {className || ''}"
	{onclick}
>
	<PositioningRegion>
		<ContentRegion>
			<HamburgerIcon />
		</ContentRegion>
	</PositioningRegion>
</NavItem>
