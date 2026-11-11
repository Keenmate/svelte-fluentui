<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		disabled?: boolean
		group?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		children?: Snippet
		class?: string
	}

	/** Other native attributes and events (`id`, `aria-label`, `onkeydown`, …) go to the root `<div role="menuitem">`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    disabled    = undefined,
		    group    = undefined,
		    onclick = undefined,
		    children = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	// const isInNavGroup = getContext<NavGroupSvelteContext>("nav-group")
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="menuitem"
	tabindex="0"
	{...rest}
	aria-disabled={disabled}
	class="fluent-nav-item {className || ''}"
	class:fluent-nav-group={group}
	class:disabled
	onclick={onclick}
>
	{@render children?.()}

</div>
