<script lang="ts">
	import HamburgerIcon from "../icons/HamburgerIcon.svelte"
	import NavItem from "./NavItem.svelte"
	import PositioningRegion from "../PositioningRegion.svelte"
	import ContentRegion from "../ContentRegion.svelte"

	type Props = {
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		class?: string
	}

	let {
		onclick = undefined,
		class: className = undefined
	    }: Props = $props()
</script>

<NavItem
	class="expander {className || ''}"
	{onclick}
>
	<PositioningRegion>
		<ContentRegion>
			<HamburgerIcon />
		</ContentRegion>
	</PositioningRegion>
</NavItem>
