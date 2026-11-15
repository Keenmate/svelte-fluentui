<!-- Internal (Tabs): start / end scroll-arrow button overlaid on the tab strip edge (responsive="scroll"). Not exported from the package. -->

<script lang="ts">
	type Props = {
		side: "start" | "end"
		horizontal: boolean
		rtl: boolean
		onclick: () => void
	}

	let {side, horizontal, rtl, onclick}: Props = $props()

	const ariaLabel = $derived(side === "start"
		? (horizontal ? (rtl ? "Scroll tabs right" : "Scroll tabs left") : "Scroll tabs up")
		: (horizontal ? (rtl ? "Scroll tabs left" : "Scroll tabs right") : "Scroll tabs down"))
</script>

<button
	type="button"
	class="fluent-tabs-scroll-btn fluent-tabs-scroll-btn-{side}"
	{onclick}
	aria-label={ariaLabel}
	tabindex="-1"
>
	{#if side === "start"}
		{#if horizontal}
			<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
				<path d="M10.3 3.3a1 1 0 0 1 0 1.4L7 8l3.3 3.3a1 1 0 1 1-1.4 1.4l-4-4a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 0z"/>
			</svg>
		{:else}
			<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
				<path d="M3.3 10.3a1 1 0 0 0 1.4 0L8 7l3.3 3.3a1 1 0 1 0 1.4-1.4l-4-4a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4z"/>
			</svg>
		{/if}
	{:else if horizontal}
		<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
			<path d="M5.7 3.3a1 1 0 0 0 0 1.4L9 8l-3.3 3.3a1 1 0 1 0 1.4 1.4l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 0z"/>
		</svg>
	{:else}
		<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
			<path d="M3.3 5.7a1 1 0 0 1 1.4 0L8 9l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z"/>
		</svg>
	{/if}
</button>

<style>
	/*
	 * Scroll arrow buttons — absolute-positioned over the strip edges so
	 * toggling their visibility does NOT change the tablist's client width.
	 *
	 * When scroll arrows are flex siblings of the tablist, showing an arrow
	 * shrinks the tablist by ~32px. At borderline widths (e.g. scrollWidth
	 * ≈ clientWidth + 32), this flips the overflow condition, which flips
	 * the arrow visibility, which flips the condition — oscillating forever
	 * as a reactive feedback loop. Overlaying them fixes the loop because
	 * the tablist's size is invariant to arrow visibility.
	 *
	 * Orientation comes from the Tabs root class (`:global` — it's in the parent).
	 */
	.fluent-tabs-scroll-btn {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--neutral-layer-1, #fff) 85%, transparent);
		backdrop-filter: blur(4px);
		border: none;
		color: var(--neutral-foreground-rest);
		cursor: pointer;
		padding: 0;
		z-index: 2;
	}

	:global(.fluent-tabs-horizontal) .fluent-tabs-scroll-btn {
		top: 0;
		bottom: 0;
		width: 32px;
	}

	:global(.fluent-tabs-horizontal) .fluent-tabs-scroll-btn-start {
		inset-inline-start: 0;
	}

	:global(.fluent-tabs-horizontal) .fluent-tabs-scroll-btn-end {
		inset-inline-end: 0;
	}

	/* The chevrons point toward their side; mirror them in RTL. */
	:global(.fluent-tabs-horizontal) .fluent-tabs-scroll-btn:dir(rtl) svg {
		transform: scaleX(-1);
	}

	:global(.fluent-tabs-vertical) .fluent-tabs-scroll-btn {
		inset-inline: 0;
		height: 32px;
	}

	:global(.fluent-tabs-vertical) .fluent-tabs-scroll-btn-start {
		top: 0;
	}

	:global(.fluent-tabs-vertical) .fluent-tabs-scroll-btn-end {
		bottom: 0;
	}

	.fluent-tabs-scroll-btn:hover {
		background: var(--neutral-fill-stealth-hover);
	}

	.fluent-tabs-scroll-btn:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--focus-stroke-outer);
		outline-offset: calc(var(--focus-stroke-width, 2) * -1px);
	}
</style>
