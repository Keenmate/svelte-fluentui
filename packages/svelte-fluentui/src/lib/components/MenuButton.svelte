<!-- @component
A `<fluent-button>` that opens a portalled `<fluent-menu>` of `items` (ActionItem model), positioned with Floating UI.

```svelte
<MenuButton items={[{id: "edit", text: "Edit"}, {divider: true}, {id: "delete", text: "Delete", isDanger: true}]}>Actions</MenuButton>
```
-->

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
	import {tick} from "svelte"
	import {attrs} from "../helpers/attrs.js"
	import Icon from "./Icon.svelte"
	import {portal, portalHost} from "../actions/portal.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import {anchorFloating} from "../helpers/floating.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {resolveMenuEntries, runAction} from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Menu entries: items (`{id, text, icon, isDisabled, isDanger, onClick, …}`) and dividers (`{divider: true}`). */
		items: MenuEntry<object>[]
		/** Button appearance (passed through to `<fluent-button>`). */
		appearance?: string
		/** Disables the trigger button entirely. */
		disabled?: boolean
		/** Extra CSS class on the trigger `<fluent-button>`. */
		class?: string
		/** Inline style on the trigger `<fluent-button>`. */
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
		/** Button label content. */
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
		onkeydown = undefined,
		...rest
	}: Props = $props()

	/*
	 * Anchor element (the span wrapping `<fluent-button>`) is what Floating UI
	 * positions the menu against. We render the fluent-button directly (not
	 * through our `<Button>` wrapper) so we can `bind:this` on the wrapping
	 * span and have a real DOM node to anchor to.
	 */
	let anchorEl: HTMLElement | undefined = $state()
	let triggerEl: HTMLElement | undefined = $state()
	let menuEl: HTMLElement | undefined = $state()

	function setMenuOpen(next: boolean) {
		if (open === next) return
		open = next
		onOpenChange?.({open: next})
	}

	// `detail === 0` is a keyboard click (Enter / Space on the button): move focus into the menu.
	function toggleMenu(event: MouseEvent) {
		if (disabled) return
		setMenuOpen(!open)
		if (open && event.detail === 0) void focusItem("first")
	}

	/** Closes the menu; `restoreFocus` sends focus back to the button when it was inside the menu. */
	function closeMenu(restoreFocus = false) {
		if (!open) return
		const focusWasInside = !!menuEl?.contains(document.activeElement)
		setMenuOpen(false)
		if (restoreFocus && focusWasInside) triggerEl?.focus()
	}

	/*
	 * Keyboard. `<fluent-menu>`'s own arrow handling lands on disabled items and
	 * `<fluent-menu-item>` turns Enter / Space into a `change` event, not a click,
	 * so our `onclick` never ran from the keyboard. The capture-phase handler below
	 * runs before both and owns ArrowUp/Down, Home/End, PageUp/Down (enabled items
	 * only, via ListNav), Enter / Space (click the item) and Tab (close, focus
	 * back on the button so Tab continues from there).
	 *
	 * Svelte sets `disabled` as a property on the custom element and FAST reflects it to
	 * the attribute only on its next update, so a fresh menu is filtered by the property.
	 */
	function enabledItems(): HTMLElement[] {
		if (!menuEl) return []
		return Array.from(menuEl.querySelectorAll<HTMLElement & {disabled?: boolean}>("fluent-menu-item")).filter(
			(el) => !el.disabled
		)
	}

	const nav = new ListNav({count: () => enabledItems().length, itemAt: (i) => enabledItems()[i]})

	async function focusItem(which: "first" | "last") {
		await tick()
		if (which === "first") nav.first()
		else nav.last()
		enabledItems()[nav.index]?.focus()
	}

	function onTriggerKeydown(event: KeyboardEvent & {currentTarget: EventTarget & HTMLElement}) {
		onkeydown?.(event)
		if (event.defaultPrevented || disabled || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return
		event.preventDefault()
		setMenuOpen(true)
		void focusItem(event.key === "ArrowDown" ? "first" : "last")
	}

	function onMenuKeydown(event: KeyboardEvent) {
		const items = enabledItems()
		const current = items.indexOf(document.activeElement as HTMLElement)
		if (event.key === "Enter" || event.key === " ") {
			if (current < 0) return
			event.preventDefault()
			items[current].click()
			return
		}
		if (event.key === "Tab") {
			closeMenu(true)
			return
		}
		nav.index = current
		if (nav.handleKey(event)) {
			event.stopPropagation()
			items[nav.index]?.focus()
		}
	}

	const host = {}
	const entries = $derived(resolveMenuEntries(items, {}))

	async function runItem(item: MenuEntry<object> & {divider?: undefined}, action: string, event: MouseEvent) {
		if (item.shouldCloseOnClick !== false) closeMenu(true)
		await runAction({
			host,
			detail: {
				action,
				id: item.id,
				item,
				source: "menu",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			},
			beforeActionCallback,
			emitAction: (detail) => onAction?.(detail)
		})
	}

	/*
	 * Positioning (helpers/floating.ts): 4px below the button (`position="top"`: above), flips
	 * when there's no room, shifts to stay 8px inside the viewport, follows the anchor on
	 * scroll / resize, and caps the menu to the room left (`--fluent-popup-available-height`,
	 * read by the CSS below) so a tall menu scrolls instead of running off-screen.
	 */
	const preferredPlacement = $derived(position === "top" ? "top-start" : "bottom-start")

	$effect(() => {
		if (!open || !anchorEl || !menuEl) return
		const handle = anchorFloating(anchorEl, menuEl, {placement: preferredPlacement, offset: 4})
		return () => handle.destroy()
	})

	// Light dismiss (outside press, focus moving away) + Escape while open. `autoUpdate`
	// keeps the menu stuck to its anchor during scroll, so scroll doesn't close it.
	$effect(() => {
		if (!open) return
		// Escape goes to the topmost open layer (helpers/layer-stack.ts)
		const popLayer = pushLayer({onEscape: () => closeMenu(true)})
		const undismiss = dismissOnOutside(
			() => [anchorEl, menuEl],
			() => closeMenu()
		)
		return () => {
			undismiss()
			popLayer()
		}
	})
</script>

<span bind:this={anchorEl} class="fluent-menu-button-anchor">
	<fluent-button
		bind:this={triggerEl}
		{...rest}
		{...attrs({appearance, disabled, style})}
		class={className}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggleMenu}
		onkeydown={onTriggerKeydown}
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
	<!-- Inside a Dialog the menu is portalled into the dialog, within its focus trap -->
	<div
		use:portal={portalHost(anchorEl)}
		bind:this={menuEl}
		class="fluent-menu-button-menu context-menu"
		onkeydowncapture={onMenuKeydown}
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
	 * Wrapper is the positioned element (`position: fixed`, top / left set by
	 * helpers/floating.ts). It is capped to the room left to the viewport edge,
	 * so it owns the `overflow-y: auto` scroll. The inner `<fluent-menu>` has rounded corners; without a
	 * matching `border-radius` here, the wrapper's square corners (or
	 * its scrollbar gutter) would peek out behind the rounded menu and
	 * show as gray pixels. `background: transparent` is explicit so
	 * nothing in a future theme/global rule can repaint it.
	 */
	.fluent-menu-button-menu {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--fluent-z-popover);
		max-height: var(--fluent-popup-available-height, none);
		overflow-y: auto;
		overscroll-behavior: contain;
		background: transparent;
		border-radius: calc(var(--layer-corner-radius, var(--control-corner-radius, 4)) * 1px);
		/* fluent-menu's built-in elevation is barely visible on dark themes —
		 * paint the popover shadow on the wrapper instead so the menu reads
		 * as a distinct surface. Matches the elevation used by ContextMenu. */
		box-shadow: var(--elevation-shadow-flyout, 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12));
	}

	.fluent-menu-button-menu :global(fluent-menu) {
		min-width: 160px;
	}

	/* Dark theme is handled by the palette tokens (re-declared under [data-theme="dark"]). */
	/* danger items: _primitives.scss */
</style>
