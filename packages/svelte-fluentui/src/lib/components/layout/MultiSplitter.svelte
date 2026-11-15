<!--
 * MultiSplitter
 *
 * Resizable container with N panes (N ≥ 2). Drag a gutter to resize,
 * arrow keys nudge size when a gutter is focused, double-click toggles
 * minimize when an adjacent pane opts in via `minimize` prop.
 *
 * Ported from pureadmin.io's splitter (packages/core/src/js/splitter.js)
 * into Svelte 5. Behaviour notes inline; the original is the canonical
 * reference for the rebalance / accordion / snap-to-rail subtleties.
 *
 * Drag model is REBALANCE (not boundary-coupled): each gutter resizes its
 * primary neighbour (edge-closer side) and the matching opposite delta is
 * distributed across the contiguous block of non-rail panes on the
 * secondary side. Rail panes stay pinned at railSize and don't participate.
 *
 * Internals live in ./multi-splitter/: splitter.svelte.ts (pane registry +
 * layout engine), drag.ts (pointer-drag session), size-math.ts (pure size
 * math), persistence.ts (persistKey storage).
-->

<script lang="ts" module>
	export type {MultiSplitterContext, PaneHandle, PaneRegistration} from "../../types/multi-splitter.js"
	export type {MultiSplitterResizeDetail, MultiSplitterToggleDetail} from "./multi-splitter/splitter.svelte.js"
</script>

<script lang="ts">
	import {multiSplitterContext} from "../../contexts.js"
	import type {Snippet} from "svelte"
	import {onMount} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"
	import {MultiSplitterEngine, type MultiSplitterResizeDetail, type MultiSplitterToggleDetail} from "./multi-splitter/splitter.svelte.js"

	type OwnProps = {
		children?: Snippet
		orientation?: Orientation
		/** DOM `id` of the root element. Plain attribute — no longer drives persistence (use `persistKey`). */
		id?: string
		/** Opt-in localStorage persistence of pane sizes / minimized state. Saved under
		 * "fluent-multi-splitter:<persistKey>" (the same key 1.x derived from `id`). Omit to disable persistence. */
		persistKey?: string
		/** Keyboard step in px when a gutter is focused. */
		step?: number
		/** Rail width in px when a pane is minimized. */
		railSize?: number
		/** Drag-to-rail snap threshold as ratio of the drag-start size (0–1). */
		minimizeThreshold?: number
		width?: string
		height?: string
		class?: string
		style?: string
		/** Logs drag / minimize transitions to console (development aid). */
		debug?: boolean
		/** Fires when a pane's size changes. */
		onPaneResize?: (ctx: MultiSplitterResizeDetail) => void
		/** Fires when a pane is minimized (collapsed to its rail). */
		onPaneCollapse?: (ctx: MultiSplitterToggleDetail) => void
		/** Fires when a minimized pane is restored. */
		onPaneExpand?: (ctx: MultiSplitterToggleDetail) => void
	}

	/** Other native attributes and events (`role`, `aria-*`, `data-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		orientation = "horizontal",
		id = undefined,
		persistKey = undefined,
		step = 10,
		railSize = 40,
		minimizeThreshold = 0.40,
		width = undefined,
		height = undefined,
		class: className = "",
		style = "",
		debug = false,
		onPaneResize = undefined,
		onPaneCollapse = undefined,
		onPaneExpand = undefined,
		...rest
	}: Props = $props()

	const engine = new MultiSplitterEngine({
		get orientation() { return orientation },
		get id() { return id },
		get persistKey() { return persistKey },
		get step() { return step },
		get railSize() { return railSize },
		get minimizeThreshold() { return minimizeThreshold },
		get debug() { return debug },
		get onPaneResize() { return onPaneResize },
		get onPaneCollapse() { return onPaneCollapse },
		get onPaneExpand() { return onPaneExpand }
	})
	multiSplitterContext.set(engine.createContext())

	onMount(() => () => engine.destroy())

	const computedStyle = $derived.by(() => {
		const parts: string[] = []
		if (width) parts.push(`width: ${width}`)
		if (height) parts.push(`height: ${height}`)
		if (style) parts.push(style)
		return parts.join("; ")
	})
</script>

<div
	{...rest}
	{id}
	bind:this={engine.rootEl}
	class="fluent-multi-splitter fluent-multi-splitter--{orientation} {className}"
	style={computedStyle}
>
	{@render children?.()}
</div>

<style>
	/* ===== Root container =====
	 * Width fills the parent. Height is intentionally NOT 100% — the splitter
	 * sizes to its tallest pane (via default flex `align-items: stretch`),
	 * which means all panes end up equal height = tallest natural content
	 * height. Consumers who want a fixed-area splitter (IDE-style) can pass
	 * the `height` prop or wrap in a sized container.
	 *
	 * pa-splitter's original default was `height: 100%`, which forces every
	 * consumer to give the splitter a sized parent. Content-driven is the
	 * less surprising default for ad-hoc usage; fill-parent is one prop away. */
	.fluent-multi-splitter {
		display: flex;
		width: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		box-sizing: border-box;
	}

	.fluent-multi-splitter--horizontal {
		flex-direction: row;
	}

	.fluent-multi-splitter--vertical {
		flex-direction: column;
	}

	/* While dragging: kill text selection and pointer events on pane content
	 * (so dragging over an iframe / canvas doesn't get hijacked). Sibling
	 * gutters also stop hover-firing as cursor passes over them during drag. */
	.fluent-multi-splitter--dragging {
		user-select: none;
	}
	.fluent-multi-splitter--dragging :global(.fluent-multi-splitter-pane) {
		pointer-events: none;
	}
	.fluent-multi-splitter--dragging :global(.fluent-multi-splitter-gutter:not(.fluent-multi-splitter-gutter--active)) {
		pointer-events: none;
	}
	.fluent-multi-splitter--dragging :global(.fluent-multi-splitter-gutter:not(.fluent-multi-splitter-gutter--active):focus-visible) {
		box-shadow: none;
	}

	/* Programmatic reflow window — added for ~250 ms after applySizes runs
	 * outside a drag. Suppresses the gutter-hover flash that fires when a
	 * gutter slides under the resting cursor during reflow. */
	.fluent-multi-splitter--reflowing {
		user-select: none;
	}
	.fluent-multi-splitter--reflowing :global(.fluent-multi-splitter-gutter) {
		transition: none;
	}
	.fluent-multi-splitter--reflowing :global(.fluent-multi-splitter-gutter:hover),
	.fluent-multi-splitter--reflowing :global(.fluent-multi-splitter-gutter:focus-visible) {
		background-color: transparent;
		box-shadow: none;
	}

	/* ===== Pane ===== */
	/* Make the pane a flex column so direct `.card` children can flex-grow
	 * to fill the pane height. Without this, the card sits at its natural
	 * content height and leaves whitespace below in vertical splitters
	 * (where the pane's height is driven by flex-basis from drag) and in
	 * horizontal splitters with mixed-height content (where the pane is
	 * stretched to match the tallest sibling).
	 *
	 * Note: `flex: 1 1 auto` (not `1 1 0`) keeps the card's natural content
	 * height as the basis, so the splitter's content-driven sizing still
	 * resolves correctly when no height prop is set. */
	:global(.fluent-multi-splitter-pane) {
		display: flex;
		flex-direction: column;
		overflow: auto;
		min-width: 0;
		min-height: 0;
		box-sizing: border-box;
	}

	:global(.fluent-multi-splitter-pane:not(.fluent-multi-splitter-pane--minimized) > .card) {
		flex: 1 1 auto;
		min-height: 0;
	}

	:global(.fluent-multi-splitter-pane--minimized) {
		cursor: pointer;
		overflow: hidden;
	}

	/* Rail-title rotation hook: any element marked [data-multisplitter-rail-title]
	 * inside a minimized pane rotates to vertical writing. */
	:global(.fluent-multi-splitter-pane--minimized [data-multisplitter-rail-title]) {
		writing-mode: sideways-rl;
	}
	:global(.fluent-multi-splitter-pane--minimized [data-multisplitter-rail-title] i),
	:global(.fluent-multi-splitter-pane--minimized [data-multisplitter-rail-title] svg) {
		writing-mode: initial;
	}

	/* Auto-adaptation for Card: when a `.card` (the svelte-fluentui Card
	 * component) is rendered inside a minimized pane, fill the rail and
	 * treat its first child as the rail title — hide the rest. Mirrors
	 * pa-splitter's `_cards.scss` integration so consumers using <Card>
	 * don't need data-multisplitter-rail-title on their headings.
	 *
	 * Pane carries its own orientation class (--horizontal / --vertical)
	 * set from its parent splitter's orientation via context, so nested
	 * splitters with different orientations don't cross-contaminate styles
	 * (an earlier version walked up to ANY orientation ancestor, which
	 * picked up the outer splitter for nested-inner panes).
	 *
	 * Specificity: three classes on the rail pane + `.card` = (0,4,0),
	 * beats Card.svelte's own `.card { padding }` rule (0,2,0). */

	/* Common: hide everything in the rail card except the first child. */
	:global(.fluent-multi-splitter-pane.fluent-multi-splitter-pane--minimized .card > *) {
		display: none;
	}
	:global(.fluent-multi-splitter-pane.fluent-multi-splitter-pane--minimized .card > :first-child) {
		display: block;
		white-space: nowrap;
		margin: 0;
	}

	/* Horizontal-splitter rail (narrow + tall) — title rotated vertically.
	 * Long-axis padding matches Card.svelte's default (`design-unit * 5px`,
	 * = 20px) so the title's distance from the top edge stays consistent
	 * between expanded and railed states — toggling minimize doesn't shift
	 * the icon. Short axis stays narrow to fit the 40px rail. */
	:global(.fluent-multi-splitter-pane--horizontal.fluent-multi-splitter-pane--minimized .card) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: calc(var(--design-unit, 4) * 5px) calc(var(--design-unit, 4) * 1px);
		margin: 0;
		overflow: hidden;
	}
	:global(.fluent-multi-splitter-pane--horizontal.fluent-multi-splitter-pane--minimized .card > :first-child) {
		writing-mode: sideways-rl;
	}
	:global(.fluent-multi-splitter-pane--horizontal.fluent-multi-splitter-pane--minimized .card > :first-child i),
	:global(.fluent-multi-splitter-pane--horizontal.fluent-multi-splitter-pane--minimized .card > :first-child svg) {
		writing-mode: initial;
	}

	/* Vertical-splitter rail (wide + short) — title stays horizontal.
	 * Long-axis padding matches Card.svelte's default so the title's distance
	 * from the left edge is consistent across expanded/railed states. */
	:global(.fluent-multi-splitter-pane--vertical.fluent-multi-splitter-pane--minimized .card) {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: calc(var(--design-unit, 4) * 1px) calc(var(--design-unit, 4) * 5px);
		margin: 0;
		overflow: hidden;
	}

	/* ===== Gutter ===== */
	:global(.fluent-multi-splitter-gutter) {
		position: relative;
		flex: 0 0 auto;
		background-color: var(--neutral-stroke-divider-rest, #e0e0e0);
		transition: background-color 0.1s ease, box-shadow 0.1s ease;
		touch-action: none;
		outline: none;
	}

	.fluent-multi-splitter--horizontal :global(> .fluent-multi-splitter-gutter) {
		cursor: col-resize;
		width: var(--fluent-multi-splitter-gutter-size, 6px);
		height: auto;
		align-self: stretch;
	}

	.fluent-multi-splitter--vertical :global(> .fluent-multi-splitter-gutter) {
		cursor: row-resize;
		width: auto;
		height: var(--fluent-multi-splitter-gutter-size, 6px);
		align-self: stretch;
	}

	/* Center grip indicator. */
	:global(.fluent-multi-splitter-gutter::before) {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--neutral-stroke-rest, #d1d1d1);
		border-radius: 2px;
		transition: background-color 0.1s ease;
	}

	.fluent-multi-splitter--horizontal :global(> .fluent-multi-splitter-gutter::before) {
		width: 2px;
		height: 24px;
	}
	.fluent-multi-splitter--vertical :global(> .fluent-multi-splitter-gutter::before) {
		width: 24px;
		height: 2px;
	}

	:global(.fluent-multi-splitter-gutter:hover) {
		background-color: var(--accent-fill-rest, #0078d4);
	}
	:global(.fluent-multi-splitter-gutter:hover::before) {
		background-color: var(--neutral-foreground-on-accent-rest, #ffffff);
	}
	:global(.fluent-multi-splitter-gutter:focus-visible) {
		box-shadow: inset 0 0 0 2px var(--accent-fill-rest, #0078d4);
	}
	:global(.fluent-multi-splitter-gutter--active) {
		background-color: var(--accent-fill-rest, #0078d4) !important;
	}
	:global(.fluent-multi-splitter-gutter--active::before) {
		background-color: var(--neutral-foreground-on-accent-rest, #ffffff);
	}
</style>
