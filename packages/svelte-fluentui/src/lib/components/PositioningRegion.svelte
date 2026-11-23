<!-- @component
Floating overlay portalled to `<body>` (or into the anchor's `<fluent-dialog>`, inside its focus trap) and placed against `anchor` by the shared positioning helper (`helpers/floating.ts`; top layer via the Popover API). Used by Select, Combobox, DatePicker and friends for their dropdowns.

The region publishes `--fluent-popup-available-height` (room left on the side it opened), `--fluent-popup-available-width` and `--fluent-popup-anchor-width`; cap a scroll container inside with them. It keeps the side it first opened on until the viewport resizes or it grows while capped.

```svelte
<PositioningRegion anchor={inputEl} visible={open}>
	<div style="max-height: min(300px, var(--fluent-popup-available-height, 100vh)); overflow-y: auto">…</div>
</PositioningRegion>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {Placement} from "@floating-ui/dom"
	import {portal, portalHost} from "../actions/portal.js"
	import {floating} from "../helpers/floating.js"
	import type {RestProps} from "../types/index.js"

	/** Logical position: `start` / `end` follow the anchor's text direction. */
	type PositionType = "bottom" | "top" | "start" | "end"
	type AlignType = "center" | "top"

	type OwnProps = {
		/** Element the overlay is positioned against. */
		anchor?: HTMLElement
		/** Show the overlay (and start position tracking). Default: `false`. */
		visible?: boolean
		/** Inline style on the region `<div>`. */
		style?: string
		/** Tooltip text (`title` attribute) on the region. */
		title?: string
		/** Preferred side of the anchor; flips when there's no room. Default: `bottom`. */
		position?: PositionType
		/** Vertical alignment for `start` / `end` positions. "top" anchors the
		 * overlay's bottom edge to the anchor's bottom (so it extends upward);
		 * "center" centers it on the anchor (default). */
		align?: AlignType
		/** Overlay width = the anchor's width (`var(--fluent-popup-anchor-width)`), so
		 * dropdown options align under the input. Default: `true`. */
		matchWidth?: boolean
		/** Gap between anchor and overlay: px or a CSS length (`"calc(var(--design-unit) * 2px)"`).
		 * `--fluent-popup-offset` set on the anchor (or any ancestor of it) overrides it. Default: `0`. */
		offset?: number | string
		/** Overlay content. */
		children?: Snippet
	}

	/** Other native attributes and events (`id`, `class`, `role`, `onkeydown`, …) go to the region `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		anchor = undefined,
		visible = false,
		style = "",
		title = undefined,
		position: positionProp = "bottom",
		align: alignProp = "center",
		matchWidth = true,
		offset = 0,
		children = undefined,
		class: className = undefined,
		...rest
	}: Props = $props()

	const isRtl = $derived(
		!!anchor && typeof getComputedStyle !== "undefined" && getComputedStyle(anchor).direction === "rtl"
	)
	const physicalSide = $derived((positionProp === "start") !== isRtl ? "left" : "right")

	const placement = $derived<Placement>(
		positionProp === "bottom"
			? "bottom-start"
			: positionProp === "top"
				? "top-start"
				: physicalSide === "left"
					? alignProp === "top"
						? "left-end"
						: "left"
					: alignProp === "top"
						? "right-end"
						: "right"
	)

	// Promote the floating element into the browser top layer via the Popover API.
	// The top layer paints above ALL z-indexed content — including a modal dialog
	// with an arbitrarily high z-index (the docs set the settings dialog to 10000),
	// which a fixed popover z-index (1060) can never reliably beat. We still position
	// the element ourselves with Floating UI; `popover` only governs stacking.
	//
	// "manual" (not "auto") so the browser's light-dismiss doesn't fight our own
	// outside-pointerdown / focus / scroll close logic. Falls back to the CSS
	// z-index when the API is unavailable (older browsers).
	function topLayer(node: HTMLElement & {showPopover?: () => void; hidePopover?: () => void}) {
		// Unsupported: drop the `popover` attribute so the UA's
		// `:not(:popover-open){display:none}` can't hide the element; z-index fallback.
		if (typeof node.showPopover !== "function") {
			node.removeAttribute("popover")
			return
		}
		try {
			node.showPopover()
		} catch {
			// Failed to promote (e.g. disconnected mid-mount) — same reasoning: don't
			// leave a non-open popover behind, or it renders as display:none.
			node.removeAttribute("popover")
			return
		}
		return {
			destroy() {
				try {
					node.hidePopover?.()
				} catch {
					/* already hidden */
				}
			}
		}
	}
</script>

{#if anchor}
	{#if visible}
		<div
			{...rest}
			use:portal={portalHost(anchor)}
			use:topLayer
			use:floating={{reference: anchor, placement, matchWidth, offset}}
			popover="manual"
			class={["positioning-region positioning-region-floating", className]}
			{title}
			style="position: fixed; top: 0; left: 0; {style}"
		>
			{@render children?.()}
		</div>
	{/if}
{:else}
	<!-- Static wrapper mode (NavLink, NavExpander) — no anchor, just a layout passthrough. -->
	<div {...rest} class={["positioning-region", className]} {title} {style}>
		{@render children?.()}
	</div>
{/if}

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		/* Floating variant lifts above page content. The static wrapper mode is
	 * used inside NavLink etc. — applying z-index there would lift every nav
	 * item above modals.
	 *
	 * z-index is the fallback for browsers without the Popover API; when
	 * `popover` is supported the element is in the top layer and z-index is moot.
	 * The remaining rules undo the UA `[popover]` defaults (border, padding,
	 * margin, centered `inset`, opaque background) so our Floating-UI `left`/`top`
	 * drive the position and the wrapper stays visually transparent. */
		.positioning-region-floating {
			z-index: var(--fluent-z-popover);
			inset: auto;
			margin: 0;
			border: 0;
			padding: 0;
			width: auto;
			height: auto;
			max-width: none;
			max-height: none;
			overflow: visible;
			background: transparent;
			color: inherit;
		}
	}
</style>
