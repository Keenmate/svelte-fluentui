<!--
 * Tabs
 *
 * Custom tabbed interface: `<Tab>` children register through the
 * `fluent-tabs` context and Tabs renders the real tablist + panels.
 *
 * Internals live in ./tabs/: tabs.types.ts (Tab ⇄ Tabs types), order.ts
 * (display order, overflow swap, keyboard / swipe targets), measure.ts
 * (menu-mode fit, indicator geometry, scroll state), swipe.ts (gesture
 * tracking), TabsScrollButton.svelte and TabsOverflowMenu.svelte.
-->

<script lang="ts" module>
	export type {TabEntry, TabsContext, TabInfo} from "./tabs/tabs.types.js"
</script>

<script lang="ts">
	import {tabsContext} from "../contexts.js"
	import type {Snippet} from "svelte"
	import {untrack} from "svelte"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import type {Orientation, RestProps} from "../types/index.js"
	import {toTabInfo, type TabEntry, type TabInfo} from "./tabs/tabs.types.js"
	import {adjacentEnabledTab, keyboardTarget, orderTabs, swapIntoStrip} from "./tabs/order.js"
	import {cssIdSelector, indicatorStyle as computeIndicatorStyle, measureVisibleCount, scrollState} from "./tabs/measure.js"
	import {SwipeTracker} from "./tabs/swipe.js"
	import TabsScrollButton from "./tabs/TabsScrollButton.svelte"
	import TabsOverflowMenu from "./tabs/TabsOverflowMenu.svelte"

	type OwnProps = {
		id?: string
		class?: string
		style?: string
		orientation?: Orientation
		activeId?: string
		showActiveIndicator?: boolean
		/** The `<Tab>` elements, placed directly between the `<Tabs>` tags. */
		children?: Snippet
		/**
		 * How the tab list handles widths wider than the container.
		 *  - `scroll` (default): tab strip scrolls horizontally (vertical: vertically). Scroll arrows appear at the ends when there's overflow.
		 *  - `wrap`: tabs flow onto multiple rows (horizontal) / columns (vertical).
		 *  - `menu`: tabs that don't fit collapse into an overflow `⋯` button at the end of the strip. Clicking the button opens a floating menu of the hidden tabs. Selecting a hidden tab swaps its position with the last-visible tab so the selection stays visible.
		 */
		responsive?: "scroll" | "wrap" | "menu"
		/** Stretch tabs to fill the strip (each tab takes an equal share). */
		justify?: boolean
		/**
		 * Fixed width for the tab strip (CSS length — `"200px"`, `"12rem"`, `"20%"`, etc.).
		 * Most useful in `orientation="vertical"`: caps the strip's cross-axis so the stack
		 * of tabs doesn't grow to fit the widest label. When set in vertical, each tab's
		 * label auto-ellipsises if it exceeds the available width. In horizontal mode
		 * this just caps the strip's total width (falls through to the parent's width
		 * otherwise) and tabs fall back to their `responsive` mode when the sum of tab
		 * widths exceeds it.
		 */
		stripWidth?: string
		/**
		 * Fixed height for the tab strip. Symmetric counterpart to `stripWidth` — most
		 * useful in `orientation="horizontal"` if you want a taller strip (e.g. to show
		 * multi-line tab content). Rarely needed.
		 */
		stripHeight?: string
		/** Enable horizontal-swipe (or vertical-swipe in vertical orientation) to navigate between tabs. Default `true`. Swipes starting on interactive elements (input, button, slider, contenteditable) are ignored so form controls keep working. */
		swipe?: boolean
		/** Fires when the user activates another tab. `tab` is the newly active one. */
		onActiveIdChange?: (ctx: {activeId: string; oldActiveId: string | undefined; tab: TabInfo}) => void
	}

	/** Other native attributes and events (`aria-label`, `data-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id = undefined,
		class: className = "",
		style = "",
		orientation = "horizontal",
		activeId = $bindable(undefined),
		showActiveIndicator = true,
		children = undefined,
		responsive = "scroll",
		justify = false,
		stripWidth = undefined,
		stripHeight = undefined,
		swipe = true,
		onActiveIdChange = undefined,
		...rest
	}: Props = $props()

	const stripStyle = $derived.by(() => {
		const parts: string[] = []
		if (stripWidth) parts.push(`width: ${stripWidth}`)
		if (stripHeight) parts.push(`height: ${stripHeight}`)
		return parts.join("; ")
	})

	let tabs = $state<TabEntry[]>([])

	tabsContext.set({
		register: (entry) => {
			const idx = tabs.findIndex(t => t.id === entry.id)
			if (idx >= 0) tabs[idx] = entry
			else tabs.push(entry)
		},
		unregister: (tabId) => {
			const idx = tabs.findIndex(t => t.id === tabId)
			if (idx >= 0) tabs.splice(idx, 1)
		}
	})

	/*
	 * `displayOrder` is a custom-ordering layer on top of the source
	 * (registration) order. Starts empty — meaning "use source order as-is".
	 * `responsive="menu"` mutates this array when the user picks a hidden
	 * tab from the overflow menu (swap-with-last-visible UX), so the
	 * selection stays in the strip after it's chosen. Other responsive
	 * modes never write to it.
	 */
	let displayOrder = $state<string[]>([])

	const orderedTabs = $derived(orderTabs(tabs, displayOrder))

	const isHorizontal = $derived(orientation === "horizontal")
	const isMenuMode = $derived(responsive === "menu")

	/*
	 * Menu-mode state: `visibleCount` is how many tabs fit in the strip
	 * before the `⋯` button kicks in. The measurement is driven by a
	 * shadow tablist that holds every tab at its natural width so adding
	 * or hiding the `⋯` button doesn't feed back into the measurement.
	 */
	let visibleCount = $state(Number.POSITIVE_INFINITY)
	let overflowOpen = $state(false)
	let moreBtnRef: HTMLElement | undefined = $state()
	let overflowMenuRef: HTMLElement | undefined = $state()
	let shadowTablistRef: HTMLElement | undefined = $state()
	/*
	 * When the last tab that would otherwise overflow fits only *partially*
	 * into the remaining strip space, we still include it as the last
	 * visible tab and cap its width here (pixels). The CSS then truncates
	 * its label with an ellipsis. 0 = no truncation applied.
	 */
	let truncateLastTabSize = $state(0)

	const renderedTabs = $derived(
		isMenuMode ? orderedTabs.slice(0, visibleCount) : orderedTabs
	)
	const overflowTabs = $derived(
		isMenuMode ? orderedTabs.slice(visibleCount) : []
	)

	// Default-select the first visible tab if caller didn't set activeId.
	$effect(() => {
		if (!activeId && orderedTabs.length > 0) {
			activeId = orderedTabs[0].id
		}
	})

	let tablistRef: HTMLElement | undefined = $state()
	let indicatorStyle = $state("opacity: 0;")
	/*
	 * Resolved text direction of the tablist (inherited from any `dir`
	 * ancestor). Scroll offsets and offsetLeft are physical, so the scroll
	 * buttons, arrow keys and the vertical indicator flip on it.
	 */
	let isRtl = $state(false)

	function readRtl(): boolean {
		isRtl = !!tablistRef && getComputedStyle(tablistRef).direction === "rtl"
		return isRtl
	}

	function updateIndicator() {
		if (!tablistRef || !activeId || !showActiveIndicator) {
			indicatorStyle = "opacity: 0;"
			return
		}
		const activeBtn = tablistRef.querySelector<HTMLButtonElement>(
			`button${cssIdSelector(activeId)}`
		)
		indicatorStyle = computeIndicatorStyle(activeBtn, isHorizontal, readRtl)
	}

	// Indicator reposition — runs on activeId / orientation / tabs change.
	$effect(() => {
		// Reactive dependencies
		void activeId
		void isHorizontal
		void orderedTabs.length
		updateIndicator()
	})

	// Resize/scroll observers — keep indicator aligned when tab sizes change
	// (label edit, font load, container resize, horizontal scroll etc.) and
	// drive the scroll-arrow visibility in `responsive="scroll"` mode.
	let canScrollStart = $state(false)
	let canScrollEnd = $state(false)

	function updateScrollState() {
		if (!tablistRef || responsive !== "scroll") {
			canScrollStart = false
			canScrollEnd = false
			return
		}
		// Horizontal scroll offsets are physical: refresh the resolved direction.
		if (isHorizontal) readRtl()
		const state = scrollState(tablistRef, isHorizontal)
		canScrollStart = state.canScrollStart
		canScrollEnd = state.canScrollEnd
	}

	function onTablistScroll() {
		updateScrollState()
		updateIndicator()
	}

	$effect(() => {
		if (!tablistRef) return
		const list = tablistRef
		// Re-run when tabs are added/removed so late-added buttons are observed too.
		void orderedTabs.length
		list.addEventListener("scroll", onTablistScroll)
		const ro = new ResizeObserver(() => {
			updateScrollState()
			updateIndicator()
		})
		ro.observe(list)
		list.querySelectorAll<HTMLElement>("button[data-tab-id]").forEach(btn => ro.observe(btn))
		// Re-run once after layout
		const frame = requestAnimationFrame(() => {
			updateScrollState()
			updateIndicator()
		})
		return () => {
			cancelAnimationFrame(frame)
			list.removeEventListener("scroll", onTablistScroll)
			ro.disconnect()
		}
	})

	function scrollArrow(direction: 1 | -1) {
		if (!tablistRef) return
		if (isHorizontal) {
			// `direction` is logical (-1 = toward start); RTL scrolls start-ward with positive left.
			const step = tablistRef.clientWidth * 0.8 * (readRtl() ? -1 : 1)
			tablistRef.scrollBy({ left: direction * step, behavior: "smooth" })
		} else {
			const step = tablistRef.clientHeight * 0.8
			tablistRef.scrollBy({ top: direction * step, behavior: "smooth" })
		}
	}

	/*
	 * A tab can veto being navigated away from: before switching off the
	 * current tab we call its registered `beforeLeaveCallback` (if any). A
	 * `false` resolve cancels the switch, so a tab with dirty data can prompt
	 * the user and stay put. The guard may be sync or async (return a
	 * Promise) so it can await a confirm dialog. Only interaction-driven
	 * switches (click, keyboard, swipe, overflow menu) route through here —
	 * a consumer assigning `activeId` directly bypasses the guard by design.
	 */
	async function canLeaveCurrent(targetId: string): Promise<boolean> {
		if (!activeId || activeId === targetId) return true
		const current = orderedTabs.find(t => t.id === activeId)
		const target = orderedTabs.find(t => t.id === targetId)
		if (!current?.beforeLeaveCallback || !target) return true
		try {
			return (await current.beforeLeaveCallback({tab: toTabInfo(current), newTab: toTabInfo(target)})) !== false
		} catch (error) {
			console.error("[Tabs] beforeLeaveCallback failed:", error)
			return false
		}
	}

	function activate(tab: TabEntry) {
		const oldActiveId = activeId
		activeId = tab.id
		onActiveIdChange?.({activeId: tab.id, oldActiveId, tab: toTabInfo(tab)})
	}

	async function selectTab(tabId: string, focus = false) {
		const tab = orderedTabs.find(t => t.id === tabId)
		if (!tab || tab.disabled) return
		if (activeId !== tabId) {
			if (!(await canLeaveCurrent(tabId))) return
			activate(tab)
		}
		// Scroll the selected tab into view in scroll mode.
		requestAnimationFrame(() => {
			const btn = tablistRef?.querySelector<HTMLButtonElement>(`button${cssIdSelector(tabId)}`)
			if (!btn) return
			if (responsive === "scroll") {
				btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
			}
			if (focus) btn.focus()
		})
	}

	function handleTabKeydown(e: KeyboardEvent) {
		if (orderedTabs.length === 0) return
		// Horizontal arrows follow the reading direction: ArrowLeft is "next" in RTL.
		const rtl = isHorizontal && readRtl()
		const prevKey = isHorizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp"
		const nextKey = isHorizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown"
		const target = keyboardTarget(orderedTabs, activeId, e.key, prevKey, nextKey)
		if (target === null) return
		e.preventDefault()
		if (target) selectTab(target.id, true)
	}

	/*
	 * Close is guarded independently of navigation: a tab can allow being left
	 * (kept in memory) yet still confirm before being destroyed. We await the
	 * closed tab's `beforeCloseCallback` (if any) before firing `onTabClose`; a
	 * `false` resolve cancels the close (a throw too, and is logged).
	 */
	async function handleCloseClick(tab: TabEntry, e: MouseEvent) {
		e.stopPropagation()
		e.preventDefault()
		if (tab.beforeCloseCallback) {
			try {
				if ((await tab.beforeCloseCallback({tab: toTabInfo(tab)})) === false) return
			} catch (error) {
				console.error("[Tabs] beforeCloseCallback failed:", error)
				return
			}
		}
		tab.onTabClose?.({tab: toTabInfo(tab)})
	}

	// Swipe-to-navigate on the tabpanels container (gesture rules in tabs/swipe.ts).
	const swipeTracker = new SwipeTracker()

	function onPanelsTouchStart(e: TouchEvent) {
		swipeTracker.onTouchStart(e, swipe)
	}

	function onPanelsTouchEnd(e: TouchEvent) {
		const direction = swipeTracker.onTouchEnd(e, isHorizontal)
		if (direction === 0) return
		const tab = adjacentEnabledTab(orderedTabs, activeId, direction)
		if (tab) selectTab(tab.id)
	}

	// Menu-mode measurement against the off-screen shadow tablist (see tabs/measure.ts).
	function updateVisibleCount() {
		if (!tablistRef || !isMenuMode || !shadowTablistRef) return
		const fit = measureVisibleCount(tablistRef, shadowTablistRef, isHorizontal)
		visibleCount = fit.visibleCount
		truncateLastTabSize = fit.truncate
	}

	// Re-measure on container size change, shadow size change, or tabs change.
	$effect(() => {
		if (!isMenuMode) {
			visibleCount = Number.POSITIVE_INFINITY
			return
		}
		if (!tablistRef || !shadowTablistRef) return

		const realList = tablistRef
		const shadowList = shadowTablistRef
		// Track orientation + tabs count as reactive deps so measurement
		// re-runs when orientation flips or tabs add/remove.
		void isHorizontal
		void orderedTabs.length

		const ro = new ResizeObserver(() => updateVisibleCount())
		ro.observe(realList)
		ro.observe(shadowList)
		const frame = requestAnimationFrame(() => updateVisibleCount())
		return () => {
			cancelAnimationFrame(frame)
			ro.disconnect()
		}
	})

	/*
	 * Swap UX: clicking a hidden overflow tab replaces the last-visible tab's
	 * position with the clicked tab, so the selection stays in the strip after
	 * it's activated. The displaced tab falls off into the overflow menu.
	 */
	async function onOverflowTabClick(tabId: string) {
		const tab = orderedTabs.find(t => t.id === tabId)
		if (!tab || tab.disabled) return
		// Guard before reordering/activating. When called from the auto-swap
		// effect the tab is already active, so canLeaveCurrent short-circuits.
		if (!(await canLeaveCurrent(tabId))) return

		const currentOrder = displayOrder.length > 0
			? [...displayOrder]
			: orderedTabs.map(t => t.id)

		const next = swapIntoStrip(currentOrder, tabId, visibleCount)
		if (next) displayOrder = next

		overflowOpen = false
		if (activeId !== tabId) activate(tab)
	}

	/*
	 * Programmatic activeId change can land on a tab that's currently in
	 * overflow — in that case the indicator has no target in the rendered
	 * strip. Auto-swap the activated overflow tab into the last-visible
	 * slot so the selection is always visible regardless of whether it
	 * was chosen via click or externally.
	 */
	$effect(() => {
		if (!isMenuMode || !activeId) return
		if (!Number.isFinite(visibleCount)) return
		const idx = orderedTabs.findIndex(t => t.id === activeId)
		if (idx < 0 || idx < visibleCount) return
		// Active tab is currently in overflow — swap into visible range.
		untrack(() => onOverflowTabClick(activeId!))
	})

	// Close the overflow menu on outside press / focus / scroll (the menu is
	// portalled, so it's passed as a surface of its own) and on Escape.
	// Scrolls inside the menu are ignored so a long overflow list can scroll.
	$effect(() => {
		if (!overflowOpen) return
		const close = () => { overflowOpen = false }
		const undismiss = dismissOnOutside(() => [moreBtnRef, overflowMenuRef], close, {scroll: true})
		// Escape goes to the topmost open layer (helpers/layer-stack.ts)
		const popLayer = pushLayer({onEscape: close})
		return () => {
			undismiss()
			popLayer()
		}
	})
</script>

<!--
 Hidden wrapper renders the consumer's Tab children so each Tab component's
 $effect fires and registers its data via setContext. Tab.svelte has no
 template of its own, so nothing visible is emitted — but we still gate it
 behind `hidden` + `aria-hidden` as a defensive measure in case consumers
 inline stray markup inside the snippet.
-->
<div hidden aria-hidden="true">
	{@render children?.()}
</div>

<div
	{...rest}
	{id}
	class="fluent-tabs {className}"
	class:fluent-tabs-horizontal={isHorizontal}
	class:fluent-tabs-vertical={!isHorizontal}
	class:fluent-tabs-justify={justify}
	data-responsive={responsive}
	{style}
>
	<div class="fluent-tabs-strip" style={stripStyle}>
		{#if responsive === "scroll" && canScrollStart}
			<TabsScrollButton side="start" horizontal={isHorizontal} rtl={isRtl} onclick={() => scrollArrow(-1)} />
		{/if}

		<!--
			 svelte-ignore a11y_no_noninteractive_element_interactions
			 svelte-ignore a11y_interactive_supports_focus
		-->
		<div
			class="fluent-tabs-tablist"
			role="tablist"
			tabindex="-1"
			aria-orientation={orientation}
			bind:this={tablistRef}
			onkeydown={handleTabKeydown}
		>
			{#each renderedTabs as tab, i (tab.id)}
				{@const isLastAndTruncated = isMenuMode && truncateLastTabSize > 0 && i === renderedTabs.length - 1}
				<button
					type="button"
					role="tab"
					id={tab.id}
					class="fluent-tab {tab.class || ''}"
					class:active={tab.id === activeId}
					class:disabled={tab.disabled}
					class:truncated={isLastAndTruncated}
					style={`${tab.style || ''}${isLastAndTruncated ? `; max-width: ${truncateLastTabSize}px; ${isHorizontal ? '' : `max-height: ${truncateLastTabSize}px;`}` : ''}`}
					data-tab-id={tab.id}
					title={tab.label || undefined}
					aria-selected={tab.id === activeId}
					aria-controls={`${tab.id}-panel`}
					aria-label={tab.ariaLabel || undefined}
					aria-disabled={tab.disabled || undefined}
					disabled={tab.disabled}
					tabindex={tab.id === activeId ? 0 : -1}
					onclick={() => selectTab(tab.id)}
				>
					{#if tab.icon}
						<span class="fluent-tab-icon">{@render tab.icon()}</span>
					{/if}

					{#if tab.header}
						{@render tab.header()}
					{:else if tab.labelEditable}
						<span
							contenteditable="true"
							autocapitalize="off"
							spellcheck="false"
							class="fluent-tab-label editable-label"
							title="Click to edit this tab name"
						>{tab.label}</span>
					{:else if tab.label}
						<span class="fluent-tab-label">{tab.label}</span>
					{/if}

					{#if tab.showClose}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<span
							class="fluent-tab-close"
							role="button"
							tabindex="-1"
							title="Close"
							aria-label="Close tab"
							onclick={(e) => handleCloseClick(tab, e)}
						>
							<svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true">
								<path d="M2.09 2.22a.75.75 0 0 1 1.06-.13L6 4.94l2.85-2.85a.75.75 0 1 1 1.06 1.06L7.06 6l2.85 2.85a.75.75 0 1 1-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 0 1-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 0 1-.13-1.06z"/>
							</svg>
						</span>
					{/if}
				</button>
			{/each}

			{#if isMenuMode && overflowTabs.length > 0}
				<button
					type="button"
					bind:this={moreBtnRef}
					class="fluent-tab fluent-tabs-more-btn"
					class:active={overflowOpen}
					onclick={() => overflowOpen = !overflowOpen}
					aria-label="Show more tabs"
					aria-haspopup="menu"
					aria-expanded={overflowOpen}
				>
					<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
						<path d="M4.5 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm4.75 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zM12.75 9.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/>
					</svg>
				</button>
			{/if}

			{#if showActiveIndicator}
				<div class="fluent-tabs-active-indicator" style={indicatorStyle}></div>
			{/if}
		</div>

		<!--
		 Shadow tablist (menu mode only). Renders every tab at its natural width
		 off-screen so `measureVisibleCount()` can read stable per-tab sizes
		 independent of what's currently displayed. Without this, hiding
		 overflowed tabs via the real tablist would flip the measurement
		 in a feedback loop.
		-->
		{#if isMenuMode}
			<div
				class="fluent-tabs-shadow-tablist"
				class:fluent-tabs-shadow-vertical={!isHorizontal}
				aria-hidden="true"
				bind:this={shadowTablistRef}
			>
				{#each orderedTabs as tab (tab.id)}
					<span class="fluent-tab fluent-tab-shadow" data-shadow-tab-id={tab.id}>
						{#if tab.icon}
							<span class="fluent-tab-icon">{@render tab.icon()}</span>
						{/if}
						{#if tab.header}
							{@render tab.header()}
						{:else if tab.label}
							<span class="fluent-tab-label">{tab.label}</span>
						{/if}
						{#if tab.showClose}
							<span class="fluent-tab-close">
								<svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"></svg>
							</span>
						{/if}
					</span>
				{/each}
				<span class="fluent-tab fluent-tabs-more-btn fluent-tab-shadow" data-shadow-more>
					<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"></svg>
				</span>
			</div>
		{/if}

		{#if responsive === "scroll" && canScrollEnd}
			<TabsScrollButton side="end" horizontal={isHorizontal} rtl={isRtl} onclick={() => scrollArrow(1)} />
		{/if}
	</div>

	{#if isMenuMode && moreBtnRef}
		<TabsOverflowMenu
			anchor={moreBtnRef}
			visible={overflowOpen && overflowTabs.length > 0}
			horizontal={isHorizontal}
			tabs={overflowTabs}
			bind:menuEl={overflowMenuRef}
			onPick={onOverflowTabClick}
		/>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fluent-tabs-panels"
		ontouchstart={swipe ? onPanelsTouchStart : undefined}
		ontouchend={swipe ? onPanelsTouchEnd : undefined}
		ontouchcancel={() => swipeTracker.cancel()}
	>
		{#each orderedTabs as tab (tab.id)}
			<div
				role="tabpanel"
				id={`${tab.id}-panel`}
				aria-labelledby={tab.id}
				class="fluent-tab-panel"
				class:active={tab.id === activeId}
				hidden={tab.id !== activeId}
			>
				{@render tab.content?.()}
				{@render tab.children?.()}
			</div>
		{/each}
	</div>
</div>

<style>
	/* Host container — horizontal puts strip on top, vertical puts strip on left. */
	.fluent-tabs {
		display: flex;
		box-sizing: border-box;
		min-width: 0;
	}

	.fluent-tabs-horizontal {
		flex-direction: column;
	}

	.fluent-tabs-vertical {
		flex-direction: row;
	}

	/* Strip = scroll arrow + tablist + scroll arrow. */
	.fluent-tabs-strip {
		display: flex;
		position: relative;
		flex: none;
		min-width: 0;
		min-height: 0;
	}

	.fluent-tabs-horizontal .fluent-tabs-strip {
		flex-direction: row;
		align-items: stretch;
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, rgba(0, 0, 0, 0.1));
	}

	.fluent-tabs-vertical .fluent-tabs-strip {
		flex-direction: column;
		align-items: stretch;
		border-inline-end: 1px solid var(--neutral-stroke-layer-rest, rgba(0, 0, 0, 0.1));
	}

	/* Tablist — holds tab buttons and the active indicator. */
	.fluent-tabs-tablist {
		display: flex;
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
	}

	.fluent-tabs-horizontal .fluent-tabs-tablist {
		flex-direction: row;
	}

	.fluent-tabs-vertical .fluent-tabs-tablist {
		flex-direction: column;
	}

	/* --- responsive modes --- */

	.fluent-tabs-horizontal[data-responsive="scroll"] .fluent-tabs-tablist {
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
	}
	.fluent-tabs-horizontal[data-responsive="scroll"] .fluent-tabs-tablist::-webkit-scrollbar {
		display: none;
	}

	.fluent-tabs-vertical[data-responsive="scroll"] .fluent-tabs-tablist {
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
	}
	.fluent-tabs-vertical[data-responsive="scroll"] .fluent-tabs-tablist::-webkit-scrollbar {
		display: none;
	}

	.fluent-tabs[data-responsive="wrap"] .fluent-tabs-tablist {
		flex-wrap: wrap;
	}

	/*
	 * menu mode: tablist clips any overflow (should never actually overflow
	 * since visibleCount limits what we render, but belt-and-suspenders for
	 * any fractional-pixel slack during measurement). The overflow button
	 * is rendered INSIDE the tablist as a regular flex item so the active
	 * indicator and keyboard focus flow past it correctly.
	 */
	.fluent-tabs[data-responsive="menu"] .fluent-tabs-tablist {
		overflow: hidden;
	}

	/* Shadow tablist — off-screen copy used only for measurement. */
	.fluent-tabs-shadow-tablist {
		position: absolute;
		top: -9999px;
		inset-inline-start: -9999px;
		visibility: hidden;
		pointer-events: none;
		display: flex;
		flex-direction: row;
		white-space: nowrap;
	}

	.fluent-tabs-shadow-vertical {
		flex-direction: column;
	}

	/* Overflow `⋯` button — styled like a tab so the strip looks uniform. */
	.fluent-tabs-more-btn {
		flex: none;
		padding: 0 calc((4 + (var(--design-unit, 4) * 2)) * 1px);
		cursor: pointer;
	}

	.fluent-tabs-more-btn.active {
		background-color: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.03));
	}

	/*
	 * Pin the real `⋯` button to the end of the strip via `auto` margin so
	 * its position doesn't shift with the last-visible tab's width. This
	 * works in flex because `margin-*-auto` absorbs free space; with the
	 * measurement already reserving `moreBtnSize`, there's always room for
	 * the button at the end. The shadow copy doesn't need the margin —
	 * `:not(.fluent-tab-shadow)` scopes the rule to the real button.
	 */
	.fluent-tabs-horizontal[data-responsive="menu"] .fluent-tabs-tablist > .fluent-tabs-more-btn:not(.fluent-tab-shadow) {
		margin-inline-start: auto;
	}

	.fluent-tabs-vertical[data-responsive="menu"] .fluent-tabs-tablist > .fluent-tabs-more-btn:not(.fluent-tab-shadow) {
		margin-top: auto;
	}

	/*
	 * When the last visible tab has a `max-width` cap applied by the
	 * measurement pass, let its label collapse with an ellipsis instead
	 * of overflowing the tab box. Icon and close button stay intact.
	 */
	.fluent-tab.truncated {
		overflow: hidden;
	}

	.fluent-tab.truncated .fluent-tab-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 0 1 auto;
	}

	/*
	 * Vertical orientation: tabs stack, each takes the strip's cross-axis
	 * width. Always apply label ellipsis so a long label doesn't inflate
	 * the whole strip to match. `min-width: 0` + `flex: 0 1 auto` is what
	 * lets the label shrink below its natural size inside the flex tab
	 * container. Icon and close button (outside `.fluent-tab-label`) keep
	 * their natural widths.
	 */
	.fluent-tabs-vertical .fluent-tab {
		overflow: hidden;
	}

	.fluent-tabs-vertical .fluent-tab-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 0 1 auto;
	}

	/* justify: stretch tabs to divide the row equally. */
	.fluent-tabs-justify .fluent-tab {
		flex: 1 1 0;
		min-width: 0;
	}

	/* --- tab button --- */
	.fluent-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0 calc((6 + (var(--design-unit, 4) * 2)) * 1px);
		height: calc(((var(--base-height-multiplier, 8) + var(--density, 0)) * var(--design-unit, 4) + (var(--design-unit, 4) * 2)) * 1px);
		min-height: 36px;
		box-sizing: border-box;
		background: transparent;
		border: 1px solid transparent;
		border-radius: calc(var(--control-corner-radius, 4) * 1px) calc(var(--control-corner-radius, 4) * 1px) 0 0;
		color: var(--neutral-foreground-rest);
		font-family: var(--body-font);
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
		font-weight: 400;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		user-select: none;
		position: relative;
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.fluent-tabs-vertical .fluent-tab {
		justify-content: flex-start;
		border-radius: 0;
		border-start-start-radius: calc(var(--control-corner-radius, 4) * 1px);
		border-end-start-radius: calc(var(--control-corner-radius, 4) * 1px);
	}

	.fluent-tab:hover:not(.disabled):not(:disabled) {
		color: var(--neutral-foreground-rest);
		background-color: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.03));
	}

	.fluent-tab.active {
		font-weight: 600;
		color: var(--accent-fill-rest, var(--neutral-foreground-rest));
	}

	.fluent-tab.disabled,
	.fluent-tab:disabled {
		cursor: not-allowed;
		color: var(--neutral-foreground-hint);
		opacity: 0.6;
	}

	.fluent-tab:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--focus-stroke-outer);
		outline-offset: calc(var(--focus-stroke-width, 2) * -1px);
	}

	.fluent-tab-label {
		display: inline-block;
	}

	.fluent-tab-icon {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		min-width: 18px;
		max-width: 18px;
		fill: var(--neutral-fill-strong-active);
	}

	.fluent-tab-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		border-radius: var(--fluent-border-radius-md);
		color: var(--neutral-foreground-hint);
		cursor: pointer;
		margin-inline-start: 4px;
	}

	.fluent-tab-close:hover {
		color: var(--neutral-foreground-rest);
		background-color: var(--neutral-fill-stealth-hover);
	}

	.editable-label {
		padding: 3px 5px;
		border-radius: var(--fluent-border-radius-sm);
	}

	.editable-label:focus {
		outline: 1px solid var(--accent-fill-rest);
	}

	/*
	 * Animated active indicator — full tab width (horizontal) / height (vertical).
	 * Anchored to top: 0; left: 0 of the tablist; JS sets a `translate(x, y)`
	 * so the indicator tracks both axes. Two-axis translation is required
	 * for wrap mode, where the active tab may be on a later row/column;
	 * with a single-axis translate + static `bottom: 0`/`right: 0`, the
	 * indicator would pin to the last row's edge regardless of where the
	 * active tab actually is.
	 * `left: 0` is deliberately physical (not inset-inline-start): the JS
	 * offset is the button's physical `offsetLeft`, in both LTR and RTL.
	 */
	.fluent-tabs-active-indicator {
		position: absolute;
		top: 0;
		left: 0;
		background-color: var(--accent-fill-rest);
		pointer-events: none;
		transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease;
		border-radius: var(--fluent-border-radius-sm) var(--fluent-border-radius-sm) 0 0;
	}

	.fluent-tabs-vertical .fluent-tabs-active-indicator {
		border-radius: 0;
		border-start-start-radius: var(--fluent-border-radius-sm);
		border-end-start-radius: var(--fluent-border-radius-sm);
	}

	/* Panels */
	.fluent-tabs-panels {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
	}

	.fluent-tab-panel {
		padding: 1rem 0;
	}

	.fluent-tabs-vertical .fluent-tab-panel {
		padding: 0 1rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.fluent-tabs-active-indicator {
			transition: none;
		}
	}
</style>
