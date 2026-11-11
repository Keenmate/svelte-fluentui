<script lang="ts" module>
	import {fluentButton, fluentMenu, fluentMenuItem, fluentDivider} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentButton(), fluentMenu(), fluentMenuItem(), fluentDivider())

	import type {Snippet} from "svelte"
	import type {ActionEventDetail, MenuEntry} from "../action-items/index.js"

	/** MenuButton has no surface context of its own — `onAction` gets just the invocation fields. */
	export type MenuButtonActionDetail = ActionEventDetail<object>
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import { computePosition, flip, shift, offset, size, autoUpdate } from "@floating-ui/dom"
	import Icon from "./Icon.svelte"
	import { portal } from "../actions/portal.js"
	import { pushLayer } from "../helpers/layer-stack.js"
	import { resolveMenuEntries, runAction } from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Menu entries: items (`{id, text, icon, isDisabled, isDanger, onClick, …}`) and dividers (`{divider: true}`). */
		items: MenuEntry<object>[]
		/** Button appearance (passed through to `<fluent-button>`). */
		appearance?: string
		/** Disables the trigger button entirely. */
		disabled?: boolean
		class?: string
		style?: string
		/**
		 * Preferred side of the button to open the menu on. `"bottom"` (default) opens
		 * below and auto-flips to above if there isn't enough room; `"top"` prefers above
		 * and flips to below when space is tighter overhead. Floating UI's `shift`
		 * middleware also nudges the menu horizontally to stay inside the viewport
		 * when the anchor is close to the left/right edge.
		 */
		position?: "bottom" | "top"
		/** Bindable open state. */
		open?: boolean
		children?: Snippet
		/** Slot rendered inside the button's `start` slot (icon before label). */
		start?: Snippet
		/** Slot rendered inside the button's `end` slot (icon after label). */
		end?: Snippet
		/** Fires when the menu opens or closes. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Fires after an item ran (its `onClick`, if any). */
		onAction?: (detail: MenuButtonActionDetail) => void
		/** Called before an item runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: MenuButtonActionDetail) => unknown
	}

	/** Other native attributes and events (`id`, `title`, `aria-label`, `onfocus`, …) go to the trigger `<fluent-button>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		items,
		appearance = undefined,
		disabled = undefined,
		class: className = "",
		style = "",
		position = "bottom",
		open = $bindable(false),
		children = undefined,
		start = undefined,
		end = undefined,
		onOpenChange = undefined,
		onAction = undefined,
		beforeActionCallback = undefined,
		...rest
	}: Props = $props()

	/*
	 * Anchor element (the span wrapping `<fluent-button>`) is what Floating UI
	 * positions the menu against. We render the fluent-button directly (not
	 * through our `<Button>` wrapper) so we can `bind:this` on the wrapping
	 * span and have a real DOM node to anchor to.
	 */
	let anchorEl: HTMLElement | undefined = $state()
	let menuEl: HTMLElement | undefined = $state()

	function toggleMenu() {
		if (disabled) return
		const next = !open
		open = next
		onOpenChange?.({open: next})
	}

	function closeMenu() {
		if (!open) return
		open = false
		onOpenChange?.({open: false})
	}

	const host = {}
	const entries = $derived(resolveMenuEntries(items, {}))

	async function runItem(item: MenuEntry<object> & {divider?: undefined}, action: string, event: MouseEvent) {
		if (item.shouldCloseOnClick !== false) closeMenu()
		await runAction({
			host,
			detail: {action, id: item.id, item, source: "menu", sourceEvent: event, triggerElement: event.currentTarget as HTMLElement},
			beforeActionCallback,
			emitAction: (detail) => onAction?.(detail)
		})
	}

	/*
	 * Floating UI positioning. `autoUpdate` re-runs `computePosition` on
	 * scroll / resize / DOM mutation, so the menu follows its anchor live
	 * instead of floating detached the moment the user scrolls. Middleware:
	 *   - offset(4)   — 4px gap between anchor and menu
	 *   - flip()      — if the preferred placement would clip the viewport,
	 *                   flip to the other side (bottom ↔ top)
	 *   - shift()     — slide the menu along the cross axis to stay inside
	 *                   the viewport (with 8px padding) when the anchor is
	 *                   near the left/right edge of the screen
	 *   - size()      — cap the menu's max-height to whatever space is
	 *                   actually available so a tall menu near the bottom
	 *                   of the viewport doesn't get cut off — it becomes
	 *                   scrollable instead
	 */
	const preferredPlacement = $derived(position === "top" ? "top-start" : "bottom-start")

	async function updatePosition() {
		if (!anchorEl || !menuEl) return
		const { x, y } = await computePosition(anchorEl, menuEl, {
			placement: preferredPlacement,
			strategy: "fixed",
			middleware: [
				offset(4),
				flip(),
				shift({ padding: 8 }),
				size({
					apply({ availableHeight, elements }) {
						elements.floating.style.maxHeight = `${Math.max(availableHeight - 8, 80)}px`
					},
					padding: 8
				})
			]
		})
		menuEl.style.left = `${x}px`
		menuEl.style.top = `${y}px`
	}

	/*
	 * Wire autoUpdate while the menu is open. autoUpdate returns a cleanup
	 * fn that removes its own listeners; we call it in the effect's return.
	 * The effect also re-subscribes when `preferredPlacement` changes (the
	 * consumer toggled the `position` prop).
	 */
	$effect(() => {
		if (!open || !anchorEl || !menuEl) return
		void preferredPlacement
		const cleanup = autoUpdate(anchorEl, menuEl, updatePosition)
		return cleanup
	})

	// Close on outside click / Escape. `autoUpdate` keeps the menu stuck to
	// its anchor during scroll, so we no longer force-close on scroll.
	$effect(() => {
		if (!open) return
		function onDocPointer(e: MouseEvent) {
			const target = e.target as HTMLElement | null
			if (!target) return
			if (anchorEl?.contains(target)) return
			if (menuEl?.contains(target)) return
			closeMenu()
		}
		// Escape goes to the topmost open layer (helpers/layer-stack.ts)
		const popLayer = pushLayer({onEscape: () => closeMenu()})
		document.addEventListener("mousedown", onDocPointer, true)
		return () => {
			document.removeEventListener("mousedown", onDocPointer, true)
			popLayer()
		}
	})
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span bind:this={anchorEl} class="fluent-menu-button-anchor">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<fluent-button
		{...rest}
		{...attrs({appearance, disabled, style})}
		class={className}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggleMenu}
	>
		{#if start}
			<span slot="start" class="fluent-menu-button-icon-slot">{@render start()}</span>
		{/if}
		{@render children?.()}
		{#if end}
			<span slot="end" class="fluent-menu-button-icon-slot">{@render end()}</span>
		{/if}
	</fluent-button>
</span>

{#if open && entries.length > 0}
	<div
		use:portal
		bind:this={menuEl}
		class="fluent-menu-button-menu context-menu"
	>
		<fluent-menu>
			{#each entries as entry}
				{#if entry.kind === "divider"}
					<fluent-divider></fluent-divider>
					{#if entry.text}
						<div class="fluent-menu-button-group-label">{entry.text}</div>
					{/if}
				{:else}
					{@const r = entry.resolved}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<fluent-menu-item
						class={[r.isDanger && "danger", r.cssClass].filter(Boolean).join(" ") || null}
						role={r.isToggle ? "menuitemcheckbox" : "menuitem"}
						aria-checked={r.isToggle ? String(r.isToggled) : null}
						title={r.tooltip || null}
						tabindex="-1"
						disabled={r.isDisabled || null}
						onclick={(event: MouseEvent) => runItem(entry.item, r.action, event)}
					>
						{#if r.icon}
							<span slot="start" class="fluent-menu-button-item-icon">
								{#if typeof r.icon === "string"}
									<Icon name={r.icon} size={16} />
								{:else}
									{@render r.icon()}
								{/if}
							</span>
						{/if}
						{r.text}
						{#if r.shortcut}
							<span slot="end" class="fluent-menu-button-shortcut">{r.shortcut}</span>
						{/if}
					</fluent-menu-item>
				{/if}
			{/each}
		</fluent-menu>
	</div>
{/if}

<style>
	.fluent-menu-button-anchor {
		display: inline-flex;
	}

	.fluent-menu-button-icon-slot {
		display: inline-flex;
		align-items: center;
	}

	.fluent-menu-button-icon-slot :global(svg) {
		display: block;
	}

	.fluent-menu-button-item-icon {
		display: inline-flex;
		align-items: center;
		margin-inline-end: 0.25rem;
	}

	.fluent-menu-button-shortcut {
		color: var(--neutral-foreground-hint);
		font-size: var(--type-ramp-minus-1-font-size);
	}

	.fluent-menu-button-group-label {
		padding: 4px 12px;
		color: var(--neutral-foreground-hint);
		font-size: var(--type-ramp-minus-1-font-size);
		font-weight: 600;
	}

	/*
	 * Menu element — positioned by Floating UI via top/left inline styles.
	 * `position: fixed` matches the `strategy: "fixed"` passed to
	 * computePosition(), and keeps the menu pinned to viewport coordinates
	 * (no ancestor-transform surprises).
	 */
	/*
	 * Wrapper is the Floating-UI target — `size` middleware caps its
	 * max-height for viewport fit, so it owns the `overflow-y: auto`
	 * scroll. The inner `<fluent-menu>` has rounded corners; without a
	 * matching `border-radius` here, the wrapper's square corners (or
	 * its scrollbar gutter) would peek out behind the rounded menu and
	 * show as gray pixels. `background: transparent` is explicit so
	 * nothing in a future theme/global rule can repaint it.
	 */
	.fluent-menu-button-menu {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--fluent-z-popover, 1060);
		overflow-y: auto;
		overscroll-behavior: contain;
		background: transparent;
		border-radius: calc(var(--layer-corner-radius, var(--control-corner-radius, 4)) * 1px);
		/* fluent-menu's built-in elevation is barely visible on dark themes —
		 * paint the popover shadow on the wrapper instead so the menu reads
		 * as a distinct surface. Matches the elevation used by ContextMenu. */
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);
	}

	.fluent-menu-button-menu :global(fluent-menu) {
		min-width: 160px;
	}

	.fluent-menu-button-menu :global(fluent-menu-item.danger) {
		color: var(--error-foreground, #d13438);
	}

	.fluent-menu-button-menu :global(fluent-menu-item.danger:hover) {
		background: var(--error-fill-hover, #fde7e9);
	}

	:global([data-theme="dark"]) .fluent-menu-button-menu :global(fluent-menu-item.danger) {
		color: var(--error-foreground, #f87c86);
	}

	:global([data-theme="dark"]) .fluent-menu-button-menu :global(fluent-menu-item.danger:hover) {
		background: var(--error-fill-hover, #442726);
	}
</style>
