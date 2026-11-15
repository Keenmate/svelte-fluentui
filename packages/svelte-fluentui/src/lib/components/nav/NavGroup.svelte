<!-- @component
Expandable group of nav rows inside a `NavMenu`; the header toggles `expanded`.

```svelte
<NavGroup persistKey="reports">
	{#snippet linkText()}Reports{/snippet}
	<NavLinkItem href="/reports/sales">Sales</NavLinkItem>
</NavGroup>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import NavItem from "./NavItem.svelte"
	import NavLink from "./NavLink.svelte"
	import ExpandIcon from "../icons/ExpandIcon.svelte"
	import {classList} from "../../helpers/html.js"
	import {navigationStore} from "../../stores/navigation.js"
	import {onMount} from "svelte"
	import type {RestProps} from "../../types/index.js"

	type OwnProps = {
		/** Opt-in persistence of the expanded state in localStorage (shared map under
		 * "svelte-fluentui-nav-state", keyed by `persistKey` — the same key 1.x derived from `title`).
		 * Omit to disable persistence. */
		persistKey?: string
		/** Whether the children are shown. Bindable. Default: `false`. */
		expanded?: boolean
		/** Dims the group and sets `aria-disabled`. */
		disabled?: boolean
		/** Icon at the start of the group header. */
		linkIcon?: Snippet
		/** Group header text. */
		linkText?: Snippet
		/** Rows inside the group (`NavLinkItem`, nested `NavGroup`). */
		children?: Snippet
		/** Extra CSS classes. */
		class?: string
	}

	/** Other native attributes and events (`id`, `title`, `aria-label`, …) go to the outer NavItem `<div role="menuitem">`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    persistKey = undefined,
		    expanded = $bindable(false),
		    disabled = undefined,
		    linkIcon = undefined,
		    linkText = undefined,
		    children = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	// Forwarded to a child component whose own prop types are narrower than
	// HTMLAttributes (no `null`), so hand the spread over untyped.
	const forwarded = $derived(rest as Record<string, unknown>)

	const navItemClass = $derived(classList(
		expanded && "expanded",
		className
	))

	// Load the persisted expanded state on mount (only with persistKey)
	onMount(() => {
		if (persistKey) {
			navigationStore.subscribe(state => {
				const storedExpanded = state[persistKey]
				if (storedExpanded !== undefined) {
					expanded = storedExpanded
				}
			})()
		}
	})

	function onNavLinkClicked(ev: MouseEvent) {
		expanded = !expanded

		// Persist to localStorage
		if (persistKey) {
			navigationStore.setGroupExpanded(persistKey, expanded)
		}
	}
</script>

<NavItem
	{...forwarded}
	group
	{disabled}
	class={navItemClass}
>
	<NavLink class="notactive" onclick={onNavLinkClicked}>
		{#snippet icon()}
			{@render linkIcon?.()}
		{/snippet}

		{@render linkText?.()}

		{#snippet afterText()}
			<div
				aria-hidden="true"
				class="expand-collapse-button"
				class:rotate={expanded}
				tabindex="-1"
			>
				<ExpandIcon />
			</div>
		{/snippet}
	</NavLink>

	<div role="group" class="fluent-collapsible-region-container items" style:display={expanded ? 'block' : 'none'}>
		<div
			class="fluent-nav-menu"
			role="menu"
			data-expanded={expanded}
		>
			{@render children?.()}
		</div>
	</div>
</NavItem>

<style>
	.fluent-collapsible-region-container {
		height: auto;
		overflow: hidden;
	}

	.fluent-nav-menu {
		width: 100%;
	}
</style>
