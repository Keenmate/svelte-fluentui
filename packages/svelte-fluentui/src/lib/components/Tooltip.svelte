<!-- @component
Floating hint shown on hover / focus of the element whose id is `anchor`; positioned with floating-ui and portalled to `<body>`.

```svelte
<Button id="save-btn">Save</Button>
<Tooltip anchor="save-btn" position="bottom">Save the document</Tooltip>
```
-->
<script lang="ts">
	import type {Snippet} from "svelte"
	import {onMount, onDestroy, untrack} from "svelte"
	import {portal} from "../actions/portal.js"
	import type {MiddlewareData, Placement} from "@floating-ui/dom"
	import {anchorFloating, type FloatingHandle} from "../helpers/floating.js"
	import type {RestProps} from "../types/index.js"
	import {pushLayer} from "../helpers/layer-stack.js"

	/** Logical position: `start` / `end` follow the anchor's text direction. */
	type Position = "top" | "bottom" | "start" | "end"
	type PhysicalSide = "top" | "bottom" | "left" | "right"

	type OwnProps = {
		/** Extra CSS class on the tooltip element. */
		class?: string
		/** Inline style on the tooltip element. */
		style?: string
		/**
		 * Visibility. Leave `undefined` (the default) for hover/focus-driven
		 * showing; in that mode the tooltip writes the current state back, so
		 * `bind:visible` tracks it and assigning `true`/`false` shows/hides it
		 * programmatically. Start with `true`/`false` to force it (hover ignored).
		 */
		visible?: boolean
		/** HTML id of the element the tooltip is positioned relative to. */
		anchor?: string
		/** Delay before showing on hover, in ms. Default: `250`. */
		delay?: number
		/** Preferred placement; flips to the opposite side if there's no room. Default: `"top"`. */
		position?: Position
		/** Tooltip content. */
		children?: Snippet
		/** Max width (CSS length) at which long content wraps. */
		maxWidth?: string
	}

	/** Other native attributes and events (`id`, `aria-*`, …) go to the tooltip `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		class: className = "",
		style = "",
		visible = $bindable(),
		anchor = undefined,
		delay = 250,
		position = "top",
		children = undefined,
		maxWidth = undefined,
		...rest
	}: Props = $props()

	// Hover/focus-driven unless the consumer forced a value at mount. In
	// hover mode the tooltip writes `visible` itself (bindable).
	const hoverDriven = untrack(() => visible === undefined)

	const GAP = 8

	let tooltipElement: HTMLDivElement | undefined = $state()
	let arrowElement: HTMLDivElement | undefined = $state()
	let isVisible = $state(false)
	let isRendered = $state(false)
	let actualPlacement = $state<Placement>("top")

	function physicalPlacement(pos: Position, anchorEl: Element): Placement {
		if (pos === "top" || pos === "bottom") return pos
		const rtl = getComputedStyle(anchorEl).direction === "rtl"
		return (pos === "start") !== rtl ? "left" : "right"
	}
	let referenceHidden = $state(false)
	let showDelayTimer: ReturnType<typeof setTimeout> | null = null
	let hideDelayTimer: ReturnType<typeof setTimeout> | null = null
	let floatingHandle: FloatingHandle | null = null

	const shouldShow = $derived(visible === true || (visible === undefined && isVisible))

	// The anchor points at the tooltip (`aria-describedby`) while it is shown, so
	// screen readers read the hint with the focused control. A consumer `id` wins.
	const uid = $props.id()
	const tooltipId = $derived((rest.id as string | undefined) || `fluent-tooltip-${uid}`)

	$effect(() => {
		if (!shouldShow || !anchor) return
		const anchorEl = getAnchorElement()
		if (!anchorEl) return
		const id = tooltipId
		const tokens = (anchorEl.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean)
		if (!tokens.includes(id)) anchorEl.setAttribute("aria-describedby", [...tokens, id].join(" "))
		return () => {
			const remaining = (anchorEl.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((t) => t && t !== id)
			if (remaining.length) anchorEl.setAttribute("aria-describedby", remaining.join(" "))
			else anchorEl.removeAttribute("aria-describedby")
		}
	})

	// Escape hides a hover / focus tooltip (WCAG 1.4.13 "dismissible"). It goes
	// through the layer stack, so a tooltip inside a dialog takes the first Escape
	// and the dialog stays open. Forced tooltips (`visible={true}`) belong to the consumer.
	$effect(() => {
		if (!hoverDriven || !isVisible) return
		return pushLayer({
			onEscape: () => {
				clearShowDelay()
				hideFn()
			}
		})
	})

	function getAnchorElement(): HTMLElement | null {
		return anchor ? document.getElementById(anchor) : null
	}

	// After each placement (helpers/floating.ts): remember the side, hide when the anchor is
	// scrolled out of view, and put the arrow on the side facing the anchor.
	function onPlaced({placement, middlewareData}: {placement: Placement; middlewareData: MiddlewareData}) {
		actualPlacement = placement
		referenceHidden = middlewareData.hide?.referenceHidden ?? false

		const arrowData = middlewareData.arrow
		if (arrowElement && arrowData) {
			const side = placement.split("-")[0] as PhysicalSide
			const staticSideMap: Record<PhysicalSide, string> = {
				top: "bottom",
				bottom: "top",
				left: "right",
				right: "left"
			}
			const staticSide = staticSideMap[side]
			Object.assign(arrowElement.style, {
				left: arrowData.x != null ? `${arrowData.x}px` : "",
				top: arrowData.y != null ? `${arrowData.y}px` : "",
				right: "",
				bottom: "",
				[staticSide]: "-5px"
			})
		}
	}

	function startAutoUpdate() {
		const anchorEl = getAnchorElement()
		if (!anchorEl || !tooltipElement) return
		stopAutoUpdate()
		// Not locked: a tooltip should flip to wherever it fits as the page moves.
		floatingHandle = anchorFloating(anchorEl, tooltipElement, {
			placement: physicalPlacement(position, anchorEl),
			offset: GAP,
			offsetVariable: false,
			lockPlacement: false,
			arrow: arrowElement,
			hide: true,
			onPlaced
		})
	}

	function stopAutoUpdate() {
		floatingHandle?.destroy()
		floatingHandle = null
	}

	function show() {
		isRendered = true
		// Wait for DOM, then position and reveal
		requestAnimationFrame(() => {
			startAutoUpdate()
			isVisible = true
			if (hoverDriven) visible = true
		})
	}

	function hideFn() {
		isVisible = false
		if (hoverDriven) visible = false
	}

	function startShowDelay() {
		clearHideDelay()
		if (isVisible) return
		if (delay > 0) {
			showDelayTimer = setTimeout(show, delay)
		} else {
			show()
		}
	}

	function startHideDelay() {
		clearShowDelay()
		hideDelayTimer = setTimeout(hideFn, 100)
	}

	function clearShowDelay() {
		if (showDelayTimer) {
			clearTimeout(showDelayTimer)
			showDelayTimer = null
		}
	}

	function clearHideDelay() {
		if (hideDelayTimer) {
			clearTimeout(hideDelayTimer)
			hideDelayTimer = null
		}
	}

	function handleAnchorMouseEnter() {
		if (hoverDriven) startShowDelay()
	}
	function handleAnchorMouseLeave() {
		if (hoverDriven) startHideDelay()
	}
	function handleTooltipMouseEnter() {
		clearHideDelay()
	}
	function handleTooltipMouseLeave() {
		if (hoverDriven) startHideDelay()
	}
	function handleTransitionEnd() {
		if (!isVisible && !shouldShow) {
			isRendered = false
			stopAutoUpdate()
		}
	}

	onMount(() => {
		const anchorEl = getAnchorElement()
		if (anchorEl) {
			anchorEl.addEventListener("mouseenter", handleAnchorMouseEnter)
			anchorEl.addEventListener("mouseleave", handleAnchorMouseLeave)
			anchorEl.addEventListener("focusin", handleAnchorMouseEnter)
			anchorEl.addEventListener("focusout", handleAnchorMouseLeave)
		}
		if (visible === true) {
			isRendered = true
			requestAnimationFrame(() => {
				startAutoUpdate()
				isVisible = true
			})
		}
	})

	onDestroy(() => {
		clearShowDelay()
		clearHideDelay()
		stopAutoUpdate()
		const anchorEl = getAnchorElement()
		if (anchorEl) {
			anchorEl.removeEventListener("mouseenter", handleAnchorMouseEnter)
			anchorEl.removeEventListener("mouseleave", handleAnchorMouseLeave)
			anchorEl.removeEventListener("focusin", handleAnchorMouseEnter)
			anchorEl.removeEventListener("focusout", handleAnchorMouseLeave)
		}
	})

	// Hover mode, hidden from outside (`visible = false`): drop the hover state
	// too, so the next hover shows it again.
	$effect(() => {
		if (hoverDriven && visible === false) untrack(() => (isVisible = false))
	})

	$effect(() => {
		if (visible === true && tooltipElement && !floatingHandle) {
			startAutoUpdate()
		}
	})

	const placementSide = $derived(actualPlacement.split("-")[0])
</script>

{#if isRendered || shouldShow}
	<div
		{...rest}
		id={tooltipId}
		use:portal
		bind:this={tooltipElement}
		class="fluent-tooltip {placementSide} {className}"
		class:visible={shouldShow && !referenceHidden}
		class:has-max-width={maxWidth}
		style:max-width={maxWidth}
		{style}
		role="tooltip"
		onmouseenter={handleTooltipMouseEnter}
		onmouseleave={handleTooltipMouseLeave}
		ontransitionend={handleTransitionEnd}
	>
		{#if children}
			{@render children()}
		{/if}
		<div class="fluent-tooltip-arrow" bind:this={arrowElement} aria-hidden="true"></div>
	</div>
{/if}

<style>
	.fluent-tooltip {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--fluent-z-tooltip);
		box-sizing: border-box;
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		border: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		background: var(--neutral-layer-floating, #ffffff);
		color: var(--neutral-foreground-rest, #242424);
		padding: 4px 11px 6px 11px;
		font-family: var(--body-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
		font-size: var(--type-ramp-base-font-size, 14px);
		line-height: var(--type-ramp-base-line-height, 20px);
		white-space: nowrap;
		box-shadow: var(--elevation-shadow-tooltip, 0 0 2px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.14));
		pointer-events: auto;
		opacity: 0;
		transform: scale(0.95);
		transition:
			opacity 0.1s ease-out,
			transform 0.1s ease-out;
	}

	.fluent-tooltip.visible {
		opacity: 1;
		transform: scale(1);
	}

	.fluent-tooltip.has-max-width {
		white-space: normal;
		word-wrap: break-word;
	}

	/* Arrow rendered as a rotated square. Floating UI's `arrow` middleware
	 * sets the in-axis offset (left/top); the perpendicular axis is anchored
	 * to the side of the tooltip via the `staticSide` property assigned in
	 * updatePosition() (e.g. bottom: -5px on a top-placed tooltip). */
	.fluent-tooltip-arrow {
		position: absolute;
		width: 8.5px;
		height: 8.5px;
		background: var(--neutral-layer-floating, #ffffff);
		border: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		transform: rotate(45deg);
	}

	/* Hide the borders on the two sides facing into the tooltip body so the
	 * arrow looks like a triangle pointing outward, not a diamond. */
	.fluent-tooltip.top .fluent-tooltip-arrow {
		border-top: none;
		border-left: none;
	}
	.fluent-tooltip.bottom .fluent-tooltip-arrow {
		border-bottom: none;
		border-right: none;
	}
	.fluent-tooltip.left .fluent-tooltip-arrow {
		border-left: none;
		border-bottom: none;
	}
	.fluent-tooltip.right .fluent-tooltip-arrow {
		border-right: none;
		border-top: none;
	}
</style>
