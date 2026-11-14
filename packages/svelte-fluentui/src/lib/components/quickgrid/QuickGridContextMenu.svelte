<script lang="ts" module>
	import {fluentMenu, fluentMenuItem, fluentDivider} from "@fluentui/web-components"
	import {registerFluentElements} from "../../fluent-ui/register.js"

	registerFluentElements(fluentMenu(), fluentMenuItem(), fluentDivider())
</script>

<script lang="ts" generics="T">
	import Icon from "../Icon.svelte"
	import {portal} from "../../actions/portal.js"
	import {computePosition, flip, shift, autoUpdate} from "@floating-ui/dom"
	import type {MenuItem, ResolvedMenuEntry} from "../../action-items/index.js"
	import type {QuickGridContextMenuAction as ContextMenuAction, QuickGridContextMenuContext as ContextMenuContext} from "../QuickGrid.types.js"

	// QuickGrid's cell context menu (internal): portalled, placed at a spot in its cell. The grid owns
	// opening, closing, outside / Escape dismissal and running the items.
	type Anchor = {cell: HTMLElement; dx: number; dy: number}
	type Props = {
		/** The cell and the spot in it (offset from its top-left corner). */
		anchor: Anchor
		entries: ResolvedMenuEntry<ContextMenuContext<T>, ContextMenuAction>[]
		/** Bindable: the menu's wrapper element. */
		element?: HTMLDivElement
		onItemSelect: (ctx: {item: MenuItem<ContextMenuContext<T>, ContextMenuAction>; action: string; event: MouseEvent | KeyboardEvent}) => void
	}

	let {anchor, entries, element = $bindable(), onItemSelect}: Props = $props()

	// Enter / Space on a focused item (the menu item itself only emits `change` for them)
	function handleItemKeyDown(item: MenuItem<ContextMenuContext<T>, ContextMenuAction>, action: string, disabled: boolean, event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return
		event.preventDefault()
		if (!disabled) onItemSelect({item, action, event})
	}

	// Placed at the pointer's spot in its cell (floating-ui keeps it in the viewport and follows
	// the cell when the grid or the page scrolls)
	function placeContextMenu(node: HTMLElement, anchor: Anchor) {
		let stop = () => {}
		function attach({cell, dx, dy}: Anchor) {
			stop()
			const reference = {
				contextElement: cell,
				getBoundingClientRect() {
					const rect = cell.getBoundingClientRect()
					const x = rect.left + dx
					const y = rect.top + dy
					return {x, y, left: x, top: y, right: x, bottom: y, width: 0, height: 0}
				}
			}
			stop = autoUpdate(reference, node, async () => {
				const {x, y} = await computePosition(reference, node, {
					placement: 'bottom-start',
					strategy: 'fixed',
					middleware: [flip(), shift({padding: 8})]
				})
				node.style.left = `${x}px`
				node.style.top = `${y}px`
			})
		}
		attach(anchor)
		return {update: attach, destroy: () => stop()}
	}
</script>

<div
	use:portal
	use:placeContextMenu={anchor}
	bind:this={element}
	class="context-menu"
	style="position: fixed; left: 0; top: 0;"
>
	<fluent-menu>
		{#each entries as entry}
			{#if entry.kind === 'divider'}
				<fluent-divider></fluent-divider>
			{:else}
				{@const r = entry.resolved}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<fluent-menu-item
					{...(r.isDisabled ? { disabled: true } : {})}
					class={[r.isDanger && "danger", r.cssClass].filter(Boolean).join(" ") || null}
					title={r.tooltip ?? null}
					onclick={(event: MouseEvent) => onItemSelect({item: entry.item, action: r.action, event})}
					onkeydown={(event: KeyboardEvent) => handleItemKeyDown(entry.item, r.action, !!r.isDisabled, event)}
				>
					{#if typeof r.icon === 'string'}
						<span slot="start"><Icon name={r.icon} size={16} /></span>
					{:else if r.icon}
						<span slot="start">{@render r.icon()}</span>
					{/if}
					{r.text}
				</fluent-menu-item>
			{/if}
		{/each}
	</fluent-menu>
</div>

<style>
	/* Wrapper is transparent + rounded so the inner `<fluent-menu>`'s rounded corners
	 * don't reveal gray pixels behind them (the wrapper would otherwise be a
	 * rectangular surface). */
	.context-menu {
		z-index: var(--fluent-z-popover, 1060);
		background: transparent;
		border-radius: calc(var(--layer-corner-radius, var(--control-corner-radius, 4)) * 1px);
		/* Popover elevation — paint shadow on the wrapper so the menu reads
		 * as a distinct surface on dark themes (fluent-menu's own shadow is
		 * too subtle there). Matches ContextMenu's elevation. */
		box-shadow: var(--fluent-quickgrid-menu-shadow, 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12));
	}

	.context-menu fluent-menu {
		min-width: 160px;
	}

	.context-menu fluent-menu-item.danger {
		color: var(--fluent-color-danger-foreground, #d13438);
	}

	.context-menu fluent-menu-item.danger:hover {
		background: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
	}
</style>
