<script lang="ts" module>
	import type {ActionEventDetail} from "../action-items/index.js"

	/** The surface context of a context menu: where it was opened. */
	export type ContextMenuContext = {x: number; y: number}
	export type ContextMenuActionDetail = ActionEventDetail<ContextMenuContext>
</script>

<!--
@component
Wraps content in a right-click zone that opens a menu of `ActionItem` entries (submenus, dividers, expandable sections).

```svelte
<ContextMenu items={[{id: "copy", text: "Copy", onClick: copy}]}>
	<div>Right-click me</div>
</ContextMenu>
```
-->
<script lang="ts">
	import type {Snippet} from "svelte"
	import {tick} from "svelte"
	import { computePosition, flip, shift, offset, size, autoUpdate } from "@floating-ui/dom"
	import { SvelteMap } from "svelte/reactivity"
	import Icon from "./Icon.svelte"
	import { portal } from "../actions/portal.js"
	import { pushLayer } from "../helpers/layer-stack.js"
	import { dismissOnOutside } from "../helpers/dismiss.js"
	import { ListNav } from "../helpers/listbox-nav.svelte.js"
	import {getMenuChildren, resolveMenuEntries, runAction, type MenuEntry, type MenuItem, type ResolvedMenuEntry} from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"

	type Entry = MenuEntry<ContextMenuContext>
	type Item = MenuItem<ContextMenuContext>
	type Resolved = ResolvedMenuEntry<ContextMenuContext, string>

	type OwnProps = {
		/**
		 * Menu entries: items (`{id, text, icon, isDisabled, isDanger, onClick, …}`), dividers
		 * (`{divider: true}`), and items with `children` — a side submenu, or an inline
		 * collapsible section with `isExpandable`.
		 */
		items: Entry[]
		/** Suppress the context menu entirely. When true, right-clicks fall through to the browser's native menu as usual. */
		disabled?: boolean
		/**
		 * Horizontal offset (pixels) pushing the menu further to the right of the
		 * cursor. Useful so the click position doesn't land directly on the first
		 * menu item — otherwise the user has to move the mouse away and back to
		 * select it. Added on top of a small baseline gap. Default: 8.
		 */
		offsetMenuX?: number
		/**
		 * Vertical offset (pixels) pushing the menu further below the cursor.
		 * Same rationale as `offsetMenuX`. Added on top of a small baseline gap. Default: 0.
		 */
		offsetMenuY?: number
		/** Children rendered inside the context-menu trigger zone. */
		children?: Snippet
		/** Fires when the menu opens (with the pointer position) or closes. */
		onOpenChange?: (ctx: {open: boolean; x?: number; y?: number}) => void
		/** Fires after an item ran (its `onClick`, if any). */
		onAction?: (detail: ContextMenuActionDetail) => void
		/** Called before an item runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: ContextMenuActionDetail) => unknown
		/** Native `contextmenu` event on the trigger zone, forwarded untouched (runs before the menu opens). */
		oncontextmenu?: (event: MouseEvent) => void
	}

	/** Other native attributes and events (`class`, `style`, `id`, …) go to the trigger-zone `<span>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		items,
		disabled = false,
		/*
		 * Default 8px on the X axis so the cursor sits safely off the
		 * left edge of the menu after right-click — otherwise the click
		 * position overlaps the first item and the user has to reset
		 * the mouse to hit anything.
		 */
		offsetMenuX = 8,
		offsetMenuY = 0,
		children = undefined,
		onOpenChange = undefined,
		onAction = undefined,
		beforeActionCallback = undefined,
		oncontextmenu = undefined,
		class: className = undefined,
		...rest
	}: Props = $props()

	let open = $state(false)
	let wrapperEl: HTMLElement | undefined = $state()
	let menuEl: HTMLElement | undefined = $state()
	/** Marks this instance's portalled submenus so `menuSurfaces()` can find them. */
	const uid = $props.id()
	/** Focus before the menu opened — restored when it closes from inside (Escape, item, Tab). */
	let returnFocusEl: HTMLElement | null = null
	let cursor = $state({ x: 0, y: 0 })

	const menuCtx = $derived<ContextMenuContext>({x: cursor.x, y: cursor.y})
	const entries = $derived(resolveMenuEntries(items, menuCtx))
	const host = {}

	function onContextMenu(e: MouseEvent) {
		oncontextmenu?.(e)
		if (disabled || resolveMenuEntries(items, {x: e.clientX, y: e.clientY}).length === 0) return
		e.preventDefault()
		e.stopPropagation()
		cursor = { x: e.clientX, y: e.clientY }
		if (!open) returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null
		open = true
		onOpenChange?.({open: true, x: e.clientX, y: e.clientY})
	}

	/** Closes the menu; `restoreFocus` returns focus to where it was before opening, if it is in the menu now. */
	function closeMenu(restoreFocus = false) {
		if (!open) return
		const focusWasInside = menuSurfaces().some(el => el.contains(document.activeElement))
		open = false
		closeAllSubmenus()
		onOpenChange?.({open: false})
		if (restoreFocus && focusWasInside && returnFocusEl?.isConnected) returnFocusEl.focus()
		returnFocusEl = null
	}

	async function runItem(item: Item, action: string, event: MouseEvent) {
		const detail: ContextMenuActionDetail = {
			...menuCtx,
			action,
			id: item.id,
			item,
			source: "context-menu",
			sourceEvent: event,
			triggerElement: event.currentTarget as HTMLElement
		}
		if (item.shouldCloseOnClick !== false) closeMenu(true)
		await runAction({host, detail, beforeActionCallback, emitAction: (d) => onAction?.(d)})
	}

	/*
	 * Per-section expand state keyed by id (falls back to text). Sections
	 * default to expanded unless `isExpanded: false` on the item. User
	 * toggles persist across opens/closes of the menu — that's usually what
	 * people expect in sidebar-style menus.
	 */
	let expandedState = $state<Record<string, boolean>>({})

	function entryKey(entry: Resolved, index: number): string {
		return entry.kind === "item" ? (entry.item.id ?? entry.resolved.text) : `divider-${index}`
	}

	function isExpanded(entry: Resolved & {kind: "item"}): boolean {
		const key = entryKey(entry, 0)
		if (expandedState[key] !== undefined) return expandedState[key]
		return entry.item.isExpanded !== false
	}

	function toggleExpand(entry: Resolved & {kind: "item"}) {
		const key = entryKey(entry, 0)
		expandedState[key] = !isExpanded(entry)
	}

	/*
	 * Submenu state. Items with `children` and without `isExpandable`
	 * render as side-opening submenu triggers. Each open submenu is tracked
	 * by the trigger item's key; the submenu body portals to <body> and
	 * positions itself with Floating UI (placement: `right-start`, flips to
	 * `left-start` when near the viewport's right edge). Hover-intent delays
	 * (open ~150ms / close ~250ms) prevent flicker and let the user
	 * diagonally swoop from trigger to submenu body without it snapping
	 * shut. Sibling submenus (same parent) auto-close when a new one opens.
	 */
	type SubmenuEntry = {
		entries: Resolved[]
		triggerEl: HTMLElement
		parentKey: string | null
	}
	/*
	 * `SvelteMap` (from `svelte/reactivity`) is required here — a plain
	 * `new Map()` wrapped in `$state()` does NOT proxy Map mutations, so
	 * `openSubmenus.set(key, …)` wouldn't invalidate the `{#each …}` that
	 * renders submenu portals, and hovered submenus would never appear.
	 * The `openTimers` / `closeTimers` maps stay as plain Maps because
	 * they're only read/written from non-reactive code.
	 */
	const openSubmenus = new SvelteMap<string, SubmenuEntry>()

	const HOVER_OPEN_DELAY = 150
	const HOVER_CLOSE_DELAY = 250
	const openTimers = new Map<string, number>()
	const closeTimers = new Map<string, number>()

	function cancelOpen(key: string) {
		const t = openTimers.get(key)
		if (t !== undefined) {
			clearTimeout(t)
			openTimers.delete(key)
		}
	}
	function cancelClose(key: string) {
		const t = closeTimers.get(key)
		if (t !== undefined) {
			clearTimeout(t)
			closeTimers.delete(key)
		}
	}

	function scheduleOpenSubmenu(entry: Resolved & {kind: "item"}, triggerEl: HTMLElement, parentKey: string | null) {
		const key = entryKey(entry, 0)
		cancelClose(key)
		if (openSubmenus.has(key) || openTimers.has(key)) return
		const t = window.setTimeout(() => {
			openTimers.delete(key)
			void openSubmenu(entry, triggerEl, parentKey)
		}, HOVER_OPEN_DELAY) as unknown as number
		openTimers.set(key, t)
	}

	async function openSubmenu(entry: Resolved & {kind: "item"}, triggerEl: HTMLElement, parentKey: string | null) {
		const key = entryKey(entry, 0)
		cancelOpen(key)
		cancelClose(key)
		if (openSubmenus.has(key)) return
		// `getChildrenCallback` may be async (lazy submenus).
		const children = await getMenuChildren(entry.item, menuCtx)
		if (!open) return
		// Close sibling submenus (same parent) before opening this one.
		for (const [k, v] of openSubmenus) {
			if (v.parentKey === parentKey && k !== key) closeSubmenuTree(k)
		}
		openSubmenus.set(key, { entries: resolveMenuEntries(children, menuCtx), triggerEl, parentKey })
	}

	function scheduleCloseSubmenu(key: string) {
		cancelOpen(key)
		if (closeTimers.has(key)) return
		const t = window.setTimeout(() => {
			closeSubmenuTree(key)
			closeTimers.delete(key)
		}, HOVER_CLOSE_DELAY) as unknown as number
		closeTimers.set(key, t)
	}

	function closeSubmenuTree(key: string) {
		// Recursively close descendant submenus first so they don't leak.
		const childKeys = Array.from(openSubmenus.entries())
			.filter(([, v]) => v.parentKey === key)
			.map(([k]) => k)
		for (const ck of childKeys) closeSubmenuTree(ck)
		openSubmenus.delete(key)
		cancelOpen(key)
		cancelClose(key)
	}

	function closeAllSubmenus() {
		for (const key of Array.from(openSubmenus.keys())) closeSubmenuTree(key)
	}

	/*
	 * Floating UI action for each submenu body. `autoUpdate` keeps the
	 * submenu glued to its trigger as the viewport changes; since we also
	 * dismiss the whole menu on outside scroll (see effect below), this
	 * really only matters for resize and sibling movements while the menu
	 * is open.
	 */
	function positionSubmenu(node: HTMLElement, triggerEl: HTMLElement) {
		async function update() {
			const { x, y } = await computePosition(triggerEl, node, {
				placement: "right-start",
				strategy: "fixed",
				middleware: [
					offset(2),
					flip({ fallbackPlacements: ["left-start", "right-end", "left-end"] }),
					shift({ padding: 8 }),
					size({
						apply({ availableHeight, elements }) {
							elements.floating.style.maxHeight = `${Math.max(availableHeight - 8, 80)}px`
						},
						padding: 8
					})
				]
			})
			node.style.left = `${x}px`
			node.style.top = `${y}px`
		}
		const cleanup = autoUpdate(triggerEl, node, update)
		return {
			destroy() {
				cleanup()
			}
		}
	}

	/*
	 * Floating UI virtual element — a zero-sized anchor at the cursor
	 * position. `computePosition` and `autoUpdate` treat this the same as
	 * a DOM anchor, so the menu gets flipped / shifted / size-capped by
	 * the usual middleware when it'd otherwise clip the viewport.
	 */
	const virtualAnchor = $derived({
		getBoundingClientRect: () => ({
			x: cursor.x,
			y: cursor.y,
			top: cursor.y,
			left: cursor.x,
			right: cursor.x,
			bottom: cursor.y,
			width: 0,
			height: 0
		})
	})

	const BASE_OFFSET = 2

	async function updatePosition() {
		if (!menuEl) return
		const { x, y } = await computePosition(virtualAnchor, menuEl, {
			placement: "bottom-start",
			strategy: "fixed",
			middleware: [
				/*
				 * offset is { mainAxis, crossAxis } — with `bottom-start`
				 * mainAxis is vertical (positive = further below cursor)
				 * and crossAxis is horizontal (positive = further right).
				 * The consumer-provided `offsetMenuX` / `offsetMenuY`
				 * stack on top of a small baseline gap so the cursor
				 * isn't sitting on the first menu item at 0 offset.
				 */
				offset({
					mainAxis: BASE_OFFSET + offsetMenuY,
					crossAxis: offsetMenuX
				}),
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
	 * autoUpdate keeps the menu positioned relative to its *virtual anchor*
	 * (the cursor position captured at right-click). The cursor doesn't
	 * move while the menu is open, but autoUpdate still handles scrolling
	 * and viewport resize.
	 */
	$effect(() => {
		if (!open || !menuEl) return
		// Re-subscribe when offsets change so updatePosition gets the new values.
		void offsetMenuX
		void offsetMenuY
		const cleanup = autoUpdate(virtualAnchor, menuEl, updatePosition)
		return cleanup
	})

	/** Root menu + this instance's open submenus (portalled to <body>). */
	function menuSurfaces(): HTMLElement[] {
		const subs = document.querySelectorAll<HTMLElement>(`.fluent-context-submenu[data-menu-id="${uid}"]`)
		return [...(menuEl ? [menuEl] : []), ...subs]
	}

	function submenuSurface(key: string): HTMLElement | null {
		return document.querySelector<HTMLElement>(`.fluent-context-submenu[data-menu-id="${uid}"][data-submenu-key="${CSS.escape(key)}"]`)
	}

	/*
	 * Light dismiss + Escape while open. `inside` lists the trigger zone first so
	 * dismissOnOutside's dialog focus-trap exception sees the zone's dialog; a press
	 * on the zone itself still closes (see `onZonePointerDown`). Scroll outside closes
	 * too: the menu was opened at a viewport position that loses its meaning once the
	 * content under it moves. Scrolling inside a long menu is ignored.
	 */
	$effect(() => {
		if (!open) return
		// Escape goes to the topmost open layer (helpers/layer-stack.ts) and
		// pops submenus one at a time before closing the root.
		const popLayer = pushLayer({
			onEscape: () => {
				const deepest = Array.from(openSubmenus.keys()).pop()
				if (deepest) closeSubmenuWithFocus(deepest)
				else closeMenu(true)
			}
		})
		const undismiss = dismissOnOutside(() => [wrapperEl, ...menuSurfaces()], () => closeMenu(), {scroll: true})
		return () => {
			undismiss()
			popLayer()
		}
	})

	/*
	 * A press anywhere on the zone closes an open menu; a right-click then re-opens it
	 * at the new position through the zone's `contextmenu`. A right-click outside every
	 * <ContextMenu> closes through dismissOnOutside and the browser menu opens as usual.
	 */
	function onZonePointerDown() {
		closeMenu()
	}

	// Right-click inside our own menu — suppress the browser menu.
	function onSurfaceContextMenu(e: MouseEvent) {
		e.preventDefault()
	}

	// Focus the menu on open so the keyboard works straight away (ArrowDown lands on the
	// first item). Not inside a modal dialog: the menu is portalled outside its focus
	// trap, which would pull focus back to the dialog's first element.
	$effect(() => {
		if (!open || !menuEl) return
		if (wrapperEl?.closest("fluent-dialog")) return
		menuEl.focus({preventScroll: true})
	})

	/*
	 * Keyboard inside a menu surface (root or submenu). ListNav walks the surface's
	 * enabled items — dividers, group labels and disabled items are skipped; an
	 * expanded section's children are rows of the same surface. ArrowRight / Enter /
	 * Space on a submenu trigger open it and focus its first item; ArrowLeft in a
	 * submenu closes it back to its trigger (mirrored in RTL). Tab closes the menu.
	 */
	let navSurface: HTMLElement | null = null

	function surfaceItems(surface: HTMLElement | null): HTMLElement[] {
		return surface ? Array.from(surface.querySelectorAll<HTMLElement>(":scope > button.fluent-context-menu-item:not(:disabled)")) : []
	}

	const nav = new ListNav({count: () => surfaceItems(navSurface).length, itemAt: i => surfaceItems(navSurface)[i]})

	function isRtl(el: HTMLElement) {
		return getComputedStyle(el).direction === "rtl"
	}

	function closeSubmenuWithFocus(key: string) {
		const triggerEl = openSubmenus.get(key)?.triggerEl
		const focusWasInside = !!submenuSurface(key)?.contains(document.activeElement)
		closeSubmenuTree(key)
		if (!focusWasInside) return
		triggerEl?.focus()
		// The trigger's `onfocus` schedules a hover-intent open — not wanted when closing back to it.
		cancelOpen(key)
	}

	function onSurfaceKeydown(e: KeyboardEvent & {currentTarget: HTMLElement}) {
		const surface = e.currentTarget
		const ownKey = surface.dataset.submenuKey ?? null
		if (e.key === "Tab") {
			closeMenu(true)
			return
		}
		if (ownKey !== null && e.key === (isRtl(surface) ? "ArrowRight" : "ArrowLeft")) {
			e.preventDefault()
			closeSubmenuWithFocus(ownKey)
			return
		}
		navSurface = surface
		const items = surfaceItems(surface)
		nav.index = items.indexOf(document.activeElement as HTMLElement)
		if (!nav.handleKey(e)) return
		const target = items[nav.index]
		// Moving off a submenu trigger closes its submenu (and drops a pending focus-open);
		// landing on one opens it through its own `onfocus`.
		for (const k of Array.from(openTimers.keys())) cancelOpen(k)
		for (const [k, v] of openSubmenus) {
			if (v.parentKey === ownKey && v.triggerEl !== target) closeSubmenuTree(k)
		}
		target?.focus()
	}

	async function onSubmenuTriggerKeydown(e: KeyboardEvent & {currentTarget: HTMLElement}, entry: Resolved & {kind: "item"}, parentKey: string | null) {
		const triggerEl = e.currentTarget
		if (e.key !== (isRtl(triggerEl) ? "ArrowLeft" : "ArrowRight") && e.key !== "Enter" && e.key !== " ") return
		e.preventDefault()
		e.stopPropagation()
		const key = entryKey(entry, 0)
		await openSubmenu(entry, triggerEl, parentKey)
		await tick()
		surfaceItems(submenuSurface(key))[0]?.focus()
	}
</script>

<span {...rest} bind:this={wrapperEl} class={["fluent-context-menu-wrapper", className]} oncontextmenu={onContextMenu} onpointerdowncapture={onZonePointerDown}>
	{@render children?.()}
</span>

{#snippet icon(r: Resolved & {kind: "item"})}
	{#if r.resolved.icon}
		<span class="fluent-context-menu-item-icon">
			{#if typeof r.resolved.icon === "string"}
				<Icon name={r.resolved.icon} size={16} />
			{:else}
				{@render r.resolved.icon()}
			{/if}
		</span>
	{/if}
{/snippet}

{#snippet renderEntry(entry: Resolved, index: number, depth: number, parentKey: string | null)}
	{#if entry.kind === "divider"}
		<div class="fluent-context-menu-divider" role="separator"></div>
		{#if entry.text}
			<div class="fluent-context-menu-group-label" style="padding-inline-start: {depth * 16 + 12}px;">{entry.text}</div>
		{/if}
	{:else if entry.hasChildren && entry.item.isExpandable}
		<!-- Expandable section header — chevron rotates; children render
		     inline below it when expanded. -->
		<button
			type="button"
			class="fluent-context-menu-item fluent-context-menu-section-header {entry.resolved.cssClass}"
			class:expanded={isExpanded(entry)}
			style="padding-inline-start: {depth * 16 + 12}px;"
			title={entry.resolved.tooltip || null}
			disabled={entry.resolved.isDisabled || undefined}
			onclick={() => toggleExpand(entry)}
			aria-expanded={isExpanded(entry)}
		>
			{@render icon(entry)}
			<span class="fluent-context-menu-item-label">{entry.resolved.text}</span>
			<svg class="fluent-context-menu-chevron" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
				<path d="M3.3 5.7a1 1 0 0 1 1.4 0L8 9l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z"/>
			</svg>
		</button>
		{#if isExpanded(entry)}
			{#each resolveMenuEntries(entry.item.children ?? [], menuCtx) as child, ci (entryKey(child, ci))}
				{@render renderEntry(child, ci, depth + 1, parentKey)}
			{/each}
		{/if}
	{:else if entry.hasChildren}
		<!-- Submenu trigger — side-opening popover on hover/focus. -->
		<button
			type="button"
			class="fluent-context-menu-item fluent-context-menu-submenu-trigger {entry.resolved.cssClass}"
			class:active={openSubmenus.has(entryKey(entry, index))}
			style="padding-inline-start: {depth * 16 + 12}px;"
			title={entry.resolved.tooltip || null}
			disabled={entry.resolved.isDisabled || undefined}
			aria-haspopup="menu"
			aria-expanded={openSubmenus.has(entryKey(entry, index))}
			onmouseenter={(e) => scheduleOpenSubmenu(entry, e.currentTarget, parentKey)}
			onmouseleave={() => scheduleCloseSubmenu(entryKey(entry, index))}
			onfocus={(e) => scheduleOpenSubmenu(entry, e.currentTarget, parentKey)}
			onclick={(e) => scheduleOpenSubmenu(entry, e.currentTarget, parentKey)}
			onkeydown={(e) => onSubmenuTriggerKeydown(e, entry, parentKey)}
		>
			{@render icon(entry)}
			<span class="fluent-context-menu-item-label">{entry.resolved.text}</span>
			<svg class="fluent-context-menu-submenu-arrow" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
				<path d="M5.7 3.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 1 1-1.4-1.4L9 8 5.7 4.7a1 1 0 0 1 0-1.4z"/>
			</svg>
		</button>
	{:else}
		<!-- Leaf item -->
		<button
			type="button"
			class="fluent-context-menu-item {entry.resolved.cssClass}"
			class:danger={entry.resolved.isDanger}
			style="padding-inline-start: {depth * 16 + 12}px;"
			role={entry.resolved.isToggle ? "menuitemcheckbox" : "menuitem"}
			aria-checked={entry.resolved.isToggle ? entry.resolved.isToggled : undefined}
			title={entry.resolved.tooltip || null}
			disabled={entry.resolved.isDisabled || undefined}
			onclick={(event) => runItem(entry.item, entry.resolved.action, event)}
		>
			{@render icon(entry)}
			<span class="fluent-context-menu-item-label">{entry.resolved.text}</span>
			{#if entry.resolved.shortcut}
				<span class="fluent-context-menu-shortcut">{entry.resolved.shortcut}</span>
			{/if}
		</button>
	{/if}
{/snippet}

{#if open && entries.length > 0}
	<div
		use:portal
		bind:this={menuEl}
		class="fluent-context-menu"
		role="menu"
		tabindex="-1"
		onkeydown={onSurfaceKeydown}
		oncontextmenu={onSurfaceContextMenu}
	>
		{#each entries as entry, i (entryKey(entry, i))}
			{@render renderEntry(entry, i, 0, null)}
		{/each}
	</div>
{/if}

{#each Array.from(openSubmenus.entries()) as [key, submenu] (key)}
	<div
		use:portal
		use:positionSubmenu={submenu.triggerEl}
		class="fluent-context-menu fluent-context-submenu"
		role="menu"
		tabindex="-1"
		data-menu-id={uid}
		data-submenu-key={key}
		onkeydown={onSurfaceKeydown}
		oncontextmenu={onSurfaceContextMenu}
		onmouseenter={() => cancelClose(key)}
		onmouseleave={() => scheduleCloseSubmenu(key)}
	>
		{#each submenu.entries as entry, i (entryKey(entry, i))}
			{@render renderEntry(entry, i, 0, key)}
		{/each}
	</div>
{/each}

<style>
	/*
	 * `display: contents` keeps the wrapper span out of the layout flow —
	 * children render where they would have without the wrapper. Event
	 * handlers on the span still catch events that bubble up from the
	 * children, so `oncontextmenu` works normally.
	 */
	.fluent-context-menu-wrapper {
		display: contents;
	}

	/*
	 * Custom menu container — replaces fluent-menu so we can freely render
	 * nested items and expandable sections without wrestling the shadow
	 * DOM. Styled against FluentUI design tokens so the look still matches
	 * QuickGrid's context menu and MenuButton's dropdown.
	 */
	.fluent-context-menu {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--fluent-z-popover);
		overflow-y: auto;
		overscroll-behavior: contain;
		min-width: 200px;
		padding: 0.25rem 0;
		background: var(--neutral-layer-1, #ffffff);
		border: 1px solid var(--neutral-stroke-layer-rest, rgba(0, 0, 0, 0.1));
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);
		color: var(--neutral-foreground-rest);
		font-family: var(--body-font);
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
	}

	/* The surface takes focus only to receive arrow keys; the items show the focus ring. */
	.fluent-context-menu:focus {
		outline: none;
	}

	.fluent-context-menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		text-align: start;
		cursor: pointer;
		white-space: nowrap;
	}

	.fluent-context-menu-item:hover:not(:disabled) {
		background: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.03));
	}

	.fluent-context-menu-item:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--focus-stroke-outer);
		outline-offset: calc(var(--focus-stroke-width, 2) * -1px);
	}

	.fluent-context-menu-item:disabled {
		cursor: not-allowed;
		color: var(--neutral-foreground-hint);
		opacity: 0.6;
	}

	.fluent-context-menu-item-icon {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--accent-fill-rest);
	}

	.fluent-context-menu-item-label {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fluent-context-menu-section-header {
		font-weight: 600;
	}

	.fluent-context-menu-chevron {
		transition: transform 0.15s ease;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.fluent-context-menu-section-header.expanded .fluent-context-menu-chevron {
		transform: rotate(180deg);
	}

	.fluent-context-menu-submenu-arrow {
		flex-shrink: 0;
		opacity: 0.7;
	}

	.fluent-context-menu-submenu-trigger.active {
		background: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.03));
	}

	.fluent-context-menu-divider {
		height: 1px;
		background: var(--neutral-stroke-layer-rest, rgba(0, 0, 0, 0.1));
		margin: 0.25rem 0;
	}

	.fluent-context-menu-group-label {
		padding-block: 4px;
		padding-inline-end: 12px;
		color: var(--neutral-foreground-hint);
		font-size: var(--type-ramp-minus-1-font-size);
		font-weight: 600;
	}

	.fluent-context-menu-shortcut {
		margin-inline-start: auto;
		padding-inline-start: 16px;
		color: var(--neutral-foreground-hint);
		font-size: var(--type-ramp-minus-1-font-size);
	}

	/* Dark theme is handled by the palette tokens (re-declared under [data-theme="dark"]). */
	.fluent-context-menu-item.danger {
		color: var(--fluent-color-danger-foreground, #d13438);
	}

	.fluent-context-menu-item.danger:hover:not(:disabled) {
		background: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
	}
</style>
