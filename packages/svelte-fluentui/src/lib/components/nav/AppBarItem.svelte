<!-- @component
One `AppBar` entry: an icon link (a button when it has no `href`) with a label and an optional count badge. Shows the active indicator when `active`; moves into the bar's "…" popover when it doesn't fit.
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {getContext, untrack} from "svelte"
	import type {AnchorRestProps} from "../../types/index.js"
	import Tooltip from "../Tooltip.svelte"
	import {APP_BAR_CONTEXT, type AppBarContext} from "./appbar.context.js"

	type OwnProps = {
		/** Link URL. Without it the item renders a `<button type="button">` (for `onclick`-only items). */
		href?: string
		/** Counter shown as a small badge on the icon (e.g. unread items). Hidden when 0 / undefined. */
		count?: number
		/** Largest value displayed verbatim; above it the badge reads "<maxCount>+". The full count is still announced to screen readers. Default: `99`. */
		maxCount?: number
		/** Wording for the count in the accessible name (localisation), e.g. `(count) => count + " unread"`. Receives the full, uncapped count. Default: the bare number. */
		countLabel?: (count: number) => string
		/** Highlights the item as the current one (active indicator + `icon-active` icon). Controlled by the app (e.g. from the current route). */
		active?: boolean
		/** Tooltip text shown on hover / focus (beside a vertical bar, below a horizontal one). */
		tooltip?: string
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		/** Icon shown above the label (the count badge sits on it). Two SVGs marked `part="icon-rest"` / `part="icon-active"` swap on hover and while active. */
		icon?: Snippet
		/** Item label. */
		children?: Snippet
		/** Extra CSS classes on the outer item `<div>`. */
		class?: string
	}

	/** Other native attributes and events (`id`, `target`, `rel`, `download`, `title`, `aria-current`, `onkeydown`, …) go to the inner `<a>` (or `<button>`). */
	type Props = OwnProps & AnchorRestProps<OwnProps>

	let {
		    href     = undefined,
		    count    = undefined,
		    maxCount = 99,
		    countLabel = undefined,
		    active   = undefined,
		    tooltip  = undefined,
		    onclick = undefined,
		    icon = undefined,
		    children = undefined,
		    class: className = undefined,
		    id = undefined,
		    "aria-label": ariaLabel = undefined,
		    "aria-labelledby": ariaLabelledby = undefined,
		    ...rest
	    }: Props = $props()

	const appBar = getContext<AppBarContext | undefined>(APP_BAR_CONTEXT)

	const uid = $props.id()
	const linkId = $derived(id ?? `${uid}-link`)

	let itemEl: HTMLElement | undefined = $state()

	const orientation = $derived(appBar?.orientation ?? "vertical")
	const overflowed = $derived(appBar?.isOverflowed(uid) ?? false)

	const showCount = $derived(typeof count === "number" && count > 0)
	const countText = $derived(showCount ? (count! > maxCount ? `${maxCount}+` : String(count)) : "")
	/** Full count wording for the accessible name (never capped). */
	const countSpoken = $derived(showCount ? (countLabel?.(count!) ?? String(count)) : "")

	$effect(() => {
		if (!appBar || !itemEl) return
		const element = itemEl
		// untrack: register() reads the bar's entry list; tracking it would re-register on every change.
		return untrack(() => appBar.register({
			id: uid,
			element,
			getText: () => element.querySelector(".fluent-appbar-item-label")?.textContent?.trim() ?? "",
			popoverTile
		}))
	})

	function handlePopoverClick(ev: MouseEvent) {
		onclick?.(ev)
		appBar?.closeOverflow()
	}
</script>

<!-- The link (a <button> without `href`) with icon, count badge and label: in the bar and as an overflow popover tile. -->
{#snippet link(inPopover: boolean)}
	{@const countTextId = `${uid}-count${inPopover ? "-popover" : ""}`}
	<svelte:element
		this={href ? "a" : "button"}
		{...rest}
		id={inPopover ? null : linkId}
		href={href || null}
		type={href ? null : "button"}
		aria-label={ariaLabel && showCount ? `${ariaLabel}, ${countSpoken}` : ariaLabel}
		aria-labelledby={ariaLabelledby && showCount ? `${ariaLabelledby} ${countTextId}` : ariaLabelledby}
		class="fluent-appbar-item-link fluent-focus-ring"
		class:active
		onclick={inPopover ? handlePopoverClick : onclick}
	>
		<span class="fluent-appbar-item-body">
			{#if icon || showCount}
				<span class="fluent-appbar-item-icon">
					{@render icon?.()}
					{#if showCount}
						<span class="fluent-appbar-item-count" data-count={count} aria-hidden="true">{countText}</span>
					{/if}
				</span>
			{/if}

			<span part="label">
				<span class="fluent-appbar-item-label">{@render children?.()}</span>
				{#if showCount}<span id={countTextId} class="fluent-appbar-item-count-text">, {countSpoken}</span>{/if}
			</span>
		</span>
	</svelte:element>
{/snippet}

{#snippet popoverTile()}
	<div class="fluent-appbar-item {className || ''}" class:active data-in-popover>
		{@render link(true)}
	</div>
{/snippet}

<!-- Clipped by the bar's strip: hidden (and inert), listed in the "…" popover instead. -->
<div
	bind:this={itemEl}
	class="fluent-appbar-item {className || ''}"
	class:active
	data-orientation={orientation}
	data-overflowed={overflowed || null}
	inert={overflowed}
>
	{@render link(false)}
</div>

{#if tooltip && !overflowed}
	<Tooltip anchor={linkId} position={orientation === "horizontal" ? "bottom" : "end"}>{tooltip}</Tooltip>
{/if}

<style>
	/* Item box, link, label and hover (moved from the global Blazor compat CSS in 2.0).
	   `--fluent-appbar-item-size` is set on the parent `.fluent-appbar`. */
	.fluent-appbar-item {
		flex: none;
		position: relative;
		width: calc(var(--fluent-appbar-item-size, 68) * 1px);
		--fluent-appbar-active-indicator-width: calc(var(--design-unit) * 0.5px);
		height: var(--fluent-appbar-item-block-size, calc(var(--fluent-appbar-item-size, 68) * 1px - var(--design-unit) * 5px));
	}

	.fluent-appbar-item[data-overflowed] {
		visibility: hidden;
	}

	.fluent-appbar-item:hover {
		background-color: var(--neutral-fill-secondary-rest);
	}

	.fluent-appbar-item-link {
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		font-family: inherit;
		cursor: pointer;
		color: inherit;
		text-decoration: none;
		font-size: var(--type-ramp-minus-2-font-size);
		line-height: var(--type-ramp-minus-2-line-height);
		position: relative;
		display: block;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
	}

	.fluent-appbar-item-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		block-size: 100%;
		box-sizing: border-box;
		padding: calc(var(--design-unit) * 1px) calc(var(--fluent-appbar-active-indicator-width) + (var(--design-unit) * 1.5px));
	}

	/* Active indicator: an accent bar on the start edge (vertical) or the bottom (horizontal).
	   Not in the overflow popover. */
	.fluent-appbar-item[data-orientation] .fluent-appbar-item-link.active::before {
		content: "";
		position: absolute;
		background-color: var(--fluent-appbar-indicator-color, var(--accent-fill-rest));
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
	}

	.fluent-appbar-item[data-orientation="vertical"] .fluent-appbar-item-link.active::before {
		inset-block: 0;
		inset-inline-start: calc(var(--design-unit) * 0.5px);
		inline-size: var(--fluent-appbar-active-indicator-width);
	}

	.fluent-appbar-item[data-orientation="horizontal"] .fluent-appbar-item-link.active::before {
		inset-inline: calc(var(--design-unit) * 2px);
		inset-block-end: calc(var(--design-unit) * 0.5px);
		block-size: var(--fluent-appbar-active-indicator-width);
	}

	[part="label"] {
		display: block;
		color: var(--neutral-foreground-rest);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		text-align: center;
	}

	/* Rest/active icon pair: an icon snippet may hold two SVGs marked `part="icon-rest"` and
	   `part="icon-active"`; the active one shows on hover and while the item is active. */
	.fluent-appbar-item-icon :global(svg[part="icon-active"]) {
		display: none;
	}

	.fluent-appbar-item:is(:hover, .active) .fluent-appbar-item-icon:has(:global(svg[part="icon-active"])) :global(svg[part="icon-rest"]) {
		display: none;
	}

	.fluent-appbar-item:is(:hover, .active) .fluent-appbar-item-icon :global(svg[part="icon-active"]) {
		display: block;
	}

	.fluent-appbar-item-icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* Counter badge on the icon's top end corner (flips in RTL). Anchored by its
	   start edge, so it overlaps the corner by a fixed amount and longer counts
	   ("99+") grow outward instead of covering the icon — as in Teams / Outlook.
	   Restyle via the component-scoped --fluent-appbar-count-* variables. */
	.fluent-appbar-item-count {
		position: absolute;
		inset-block-start: var(--fluent-appbar-count-offset-block, -6px);
		inset-inline-start: calc(100% - var(--fluent-appbar-count-overlap, 8px));
		/* Numbers read the same in RTL: keep "99+" from turning into "+99". */
		direction: ltr;
		unicode-bidi: isolate;
		z-index: var(--fluent-z-raised);
		box-sizing: border-box;
		min-inline-size: var(--fluent-appbar-count-size, 16px);
		block-size: var(--fluent-appbar-count-size, 16px);
		padding-inline: var(--fluent-appbar-count-padding-inline, 4px);
		border-radius: var(--fluent-appbar-count-radius, 9999px);
		background-color: var(--fluent-appbar-count-bg, var(--fluent-color-danger));
		color: var(--fluent-appbar-count-text, var(--fluent-color-danger-contrast));
		box-shadow: 0 0 0 1px var(--fluent-appbar-count-ring-color, var(--fluent-appbar-background, var(--neutral-layer-2)));
		font-size: var(--fluent-appbar-count-font-size, 10px);
		font-weight: var(--fluent-appbar-count-font-weight, 600);
		line-height: var(--fluent-appbar-count-size, 16px);
		text-align: center;
		white-space: nowrap;
		pointer-events: none;
	}

	/* Full count for the accessible name; visually hidden. */
	.fluent-appbar-item-count-text {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
