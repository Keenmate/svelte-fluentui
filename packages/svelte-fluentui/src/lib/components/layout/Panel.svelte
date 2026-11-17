<!-- @component
Slide-in side panel (drawer) portalled to `<body>`, with optional backdrop; or, with `pinned`, an in-flow `<aside>`.

```svelte
<Panel bind:open side="end" width="400px">…</Panel>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {pushLayer} from "../../helpers/layer-stack.js"
	import {useTranslations} from "../../i18n/translate.svelte.js"
	import type {PanelLabels} from "../../i18n/labels.js"

	/** Logical edge: `start`/`end` follow the writing direction. */
	type Side = "start" | "end"

	type Props = {
		/** Whether the panel is shown. Bindable. Default: `false`. */
		open?: boolean
		/** Edge it slides in from; follows the writing direction. Default: `"end"`. */
		side?: Side
		/** Panel width (any CSS length). Default: `"320px"`. */
		width?: string
		/** Top offset of panel + backdrop (any CSS length), keeping e.g. a top nav above it usable. Default: `"0"`. */
		top?: string
		/** Render a backdrop behind the panel (clicking it closes). Default: `true`. */
		overlay?: boolean
		/** Close on a backdrop click, or on any click outside the panel when `overlay` is off. Default: `true`. */
		closeOnOutsideClick?: boolean
		/** Close on Escape (when it is the topmost layer). Default: `true`. */
		closeOnEscape?: boolean
		/** Render in place as a static `<aside>` (no portal, backdrop, Escape or outside-click). Default: `false`. */
		pinned?: boolean
		/** Fires when the user closes the panel (Escape, backdrop or outside click); `ctx` = `{open: false}`. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Panel content; header/body/footer are up to you. */
		children?: Snippet
		/** Extra CSS classes on the root (the `<aside>` when pinned). */
		class?: string
		/** Inline style on the panel surface, after `width`. */
		style?: string
		/** Overrides of the built-in text (`svelteFluentUI.panel.*` keys) for this instance. */
		labels?: PanelLabels
	}

	let {
		open = $bindable(false),
		side = "end",
		width = "320px",
		top = "0",
		overlay = true,
		closeOnOutsideClick = true,
		closeOnEscape = true,
		pinned = false,
		onOpenChange = undefined,
		children = undefined,
		class: className = undefined,
		style = undefined,
		labels: labelsProp = undefined
	}: Props = $props()

	const t = useTranslations("panel", () => labelsProp)

	let panelEl: HTMLElement | undefined = $state()
	let isRTL = $state(false)

	// Escape closes the topmost open layer (a dropdown inside the panel first).
	$effect(() => {
		if (pinned || !open) return
		return pushLayer({
			onEscape: () => {
				if (!closeOnEscape) return false
				close()
			}
		})
	})

	// Document-level outside-click detection — only needed when there's no
	// overlay to catch the click. Deferred to the next task so the same click
	// that opened the panel doesn't immediately close it.
	$effect(() => {
		if (pinned || !open || overlay || !closeOnOutsideClick) return
		const id = setTimeout(() => {
			document.addEventListener("pointerdown", handleOutsideClick, true)
		}, 0)
		return () => {
			clearTimeout(id)
			document.removeEventListener("pointerdown", handleOutsideClick, true)
		}
	})

	function handleOutsideClick(e: PointerEvent) {
		if (!panelEl) return
		if (panelEl.contains(e.target as Node)) return
		close()
	}

	function close() {
		if (!open) return
		open = false
		onOpenChange?.({open: false})
	}

	function onOverlayClick() {
		if (closeOnOutsideClick) close()
	}

	// Combined: capture the original parent's direction BEFORE moving the node
	// under <body>. Doing both in one action avoids relying on Svelte's
	// multi-action source-order. We set `dir="rtl"` (so `inset-inline-*`
	// resolves correctly) AND flip an isRTL flag (so a class-based selector can
	// drive the rest of the styling without depending on attribute matching).
	function setupRoot(node: HTMLElement) {
		const parent = node.parentElement
		if (parent && getComputedStyle(parent).direction === "rtl") {
			node.setAttribute("dir", "rtl")
			isRTL = true
		}
		document.body.appendChild(node)
		return {
			destroy() {
				node.parentNode?.removeChild(node)
			}
		}
	}
</script>

{#if pinned}
	{#if open}
		<aside
			class="fluent-panel fluent-panel--pinned fluent-panel--pinned-{side} {className || ''}"
			style="width: {width}; {style || ''}"
		>
			{@render children?.()}
		</aside>
	{/if}
{:else}
	<div
		class="fluent-panel-root fluent-panel-root--{side} {className || ''}"
		class:fluent-panel-root--open={open}
		class:fluent-panel-root--rtl={isRTL}
		style="--fluent-panel-top: {top};"
		aria-hidden={!open}
		use:setupRoot
	>
		{#if overlay}
			<div
				class="fluent-panel-overlay"
				role="button"
				tabindex={-1}
				aria-label={t("closeAriaLabel")}
				onclick={onOverlayClick}
				onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOverlayClick()}
			></div>
		{/if}

		<div
			bind:this={panelEl}
			class="fluent-panel"
			role="dialog"
			aria-modal={overlay}
			style="width: {width}; {style || ''}"
		>
			{@render children?.()}
		</div>
	</div>
{/if}

<style lang="scss">
	.fluent-panel-root {
		position: fixed;
		inset-block: var(--fluent-panel-top, 0) 0;
		inset-inline: 0;
		z-index: var(--fluent-z-modal);
		// Never block the page — only the overlay and the panel surface
		// (re-enabled below) capture pointer events.
		pointer-events: none;
	}

	.fluent-panel-overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0);
		cursor: pointer;
		pointer-events: none;
		transition: background-color 0.25s ease;
		z-index: var(--fluent-z-modal-backdrop);
	}

	.fluent-panel {
		position: absolute;
		top: 0;
		height: 100%;
		max-width: 90vw;
		background-color: var(--neutral-layer-1, #ffffff);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		pointer-events: none;
		transition: transform 0.25s ease, visibility 0.25s ease;
		visibility: hidden;
		z-index: calc(var(--fluent-z-modal) + 1);
	}

	// Closed-state per-side transforms — declared BEFORE the --open rule so
	// the open rule wins on source order at equal specificity.

	// Sides follow the writing direction (start = left in LTR, right in RTL);
	// translateX and box-shadow offsets are physical, hence the --rtl overrides.
	.fluent-panel-root--start .fluent-panel {
		inset-inline-start: 0;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
		transform: translateX(-100%);
	}

	.fluent-panel-root--start.fluent-panel-root--rtl .fluent-panel {
		box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
		transform: translateX(100%);
	}

	.fluent-panel-root--end .fluent-panel {
		inset-inline-end: 0;
		box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
		transform: translateX(100%);
	}

	.fluent-panel-root--end.fluent-panel-root--rtl .fluent-panel {
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
		transform: translateX(-100%);
	}

	.fluent-panel-root--open .fluent-panel-overlay {
		background-color: rgba(0, 0, 0, 0.3);
		pointer-events: auto;
	}

	// Match the (0,3,0) specificity of the RTL side overrides so the open
	// transform wins on source order (this rule is last).
	.fluent-panel-root.fluent-panel-root--open .fluent-panel {
		transform: translateX(0);
		visibility: visible;
		pointer-events: auto;
	}

	// Pinned: render in normal flow as a regular column. None of the
	// floating-panel positioning, transforms, or visibility gymnastics apply
	// — caller is responsible for placing the <aside> via parent layout.
	//
	// `z-index` is explicit (not auto) so pinned forms its own stacking
	// context — keeps overlay drawers (z-index 1050+) and their backdrops
	// (1040) reliably above any pinned drawer, regardless of paint order.
	// Override via --fluent-z-panel-pinned on the consumer side if multiple
	// pinned panels need to layer relative to each other.
	.fluent-panel--pinned {
		position: relative;
		top: auto;
		height: auto;
		max-width: none;
		transform: none;
		visibility: visible;
		pointer-events: auto;
		transition: none;
		flex-shrink: 0;
		align-self: stretch;
		box-shadow: none;
		border-inline-end: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		z-index: var(--fluent-z-panel-pinned);
	}

	.fluent-panel--pinned-end {
		border-inline-end: none;
		border-inline-start: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	@media (prefers-reduced-motion: reduce) {
		.fluent-panel,
		.fluent-panel-overlay {
			transition: none;
		}
	}
</style>
