<script lang="ts">
	import type {Snippet} from "svelte"
	import type {AnchorRestProps} from "../../types/index.js"
	import Stack from "../layout/Stack.svelte"
	import {StackHorizontalAlign, StackOrientation, StackVerticalAlign} from "../../fluent-ui/constants/stack.js"

	type OwnProps = {
		href?: string
		/** Counter shown as a small badge on the icon (e.g. unread items). Hidden when 0 / undefined. */
		count?: number
		/** Largest value displayed verbatim; above it the badge reads "<maxCount>+". The full count is still announced to screen readers. */
		maxCount?: number
		/** Wording for the count in the accessible name (localisation), e.g. `(count) => count + " unread"`. Receives the full, uncapped count. Default: the bare number. */
		countLabel?: (count: number) => string
		/** Highlights the item as the current one. Controlled by the app (e.g. from the current route). */
		active?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		icon?: Snippet
		children?: Snippet
		class?: string
	}

	/** Other native attributes and events (`target`, `rel`, `download`, `title`, `aria-current`, `onkeydown`, …) go to the inner `<a>`. */
	type Props = OwnProps & AnchorRestProps<OwnProps>

	let {
		    href     = undefined,
		    count    = undefined,
		    maxCount = 99,
		    countLabel = undefined,
		    active   = undefined,
		    onclick = undefined,
		    icon = undefined,
		    children = undefined,
		    class: className = undefined,
		    "aria-label": ariaLabel = undefined,
		    "aria-labelledby": ariaLabelledby = undefined,
		    ...rest
	    }: Props = $props()

	const uid = $props.id()
	const countTextId = `${uid}-count`

	const showCount = $derived(typeof count === "number" && count > 0)
	const countText = $derived(showCount ? (count! > maxCount ? `${maxCount}+` : String(count)) : "")
	/** Full count wording for the accessible name (never capped). */
	const countSpoken = $derived(showCount ? (countLabel?.(count!) ?? String(count)) : "")

	// A consumer `aria-label` / `aria-labelledby` replaces the link content as the
	// accessible name, which would drop the visually hidden count; append it.
	const computedAriaLabel = $derived(ariaLabel && showCount ? `${ariaLabel}, ${countSpoken}` : ariaLabel)
	const computedAriaLabelledby = $derived(ariaLabelledby && showCount ? `${ariaLabelledby} ${countTextId}` : ariaLabelledby)
</script>

<div
	class="fluent-appbar-item {className || ''}"
>
	<div class="fluentui-counterbadge-container">
		<a
			{...rest}
			{href}
			aria-label={computedAriaLabel}
			aria-labelledby={computedAriaLabelledby}
			class:active
			{onclick}
		>
			<Stack
				orientation={StackOrientation.Vertical}
				verticalAlign={StackVerticalAlign.Center}
				horizontalAlign={StackHorizontalAlign.Center}
				horizontalGap="10px"
				verticalGap="0"
				width="100%"
				height="100%"
			>
				{#if icon || showCount}
					<span class="fluent-appbar-item-icon">
						{@render icon?.()}
						{#if showCount}
							<span class="fluent-appbar-item-count" data-count={count} aria-hidden="true">{countText}</span>
						{/if}
					</span>
				{/if}

				<div part="label">
					{@render children?.()}
					{#if showCount}<span id={countTextId} class="fluent-appbar-item-count-text">, {countSpoken}</span>{/if}
				</div>
			</Stack>
		</a>
	</div>

</div>

<style>
	/* Item box, link, label and hover (moved from the global Blazor compat CSS in 2.0).
	   `--appbar-item-size` is set on the parent `.fluent-appbar`. */
	.fluent-appbar-item {
		width: calc(var(--appbar-item-size, 68) * 1px);
		--appbar-active-indicator-width: calc(var(--design-unit) * 0.5px);
		height: calc(var(--appbar-item-size, 68) * 1px - 20px);
	}

	.fluent-appbar-item:hover {
		background-color: var(--neutral-fill-secondary-rest);
	}

	.fluentui-counterbadge-container {
		display: inline;
		position: relative;
		height: 100%;
	}

	a {
		color: inherit;
		text-decoration: none;
		font-size: var(--type-ramp-minus-2-font-size);
		line-height: var(--type-ramp-minus-2-line-height);
		position: relative;
		display: inline-block;
		height: 100%;
		width: 100%;
	}

	a :global(.stack-vertical) {
		padding: calc(var(--design-unit) * 1px) calc(var(--appbar-active-indicator-width) + (var(--design-unit) * 1.5px));
		height: 100%;
	}

	div[part="label"] {
		color: var(--neutral-foreground-rest);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		text-align: center;
	}

	/* Rest/active icon pair: an icon snippet may hold two SVGs marked `part="icon-rest"` and
	   `part="icon-active"`; the active one shows on hover and while the item is active. */
	.fluent-appbar-item:hover :global(svg[part="icon-rest"]),
	.fluent-appbar-item:not(:hover):not(.active) :global(svg[part="icon-active"]),
	.fluent-appbar-item:not(:hover) a.active :global(svg[part="icon-rest"]) {
		display: none;
	}

	.fluent-appbar-item:not(:hover) .active :global(svg[part="icon-active"]) {
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
		background-color: var(--fluent-appbar-count-background, var(--accent-fill-rest, #0078d4));
		color: var(--fluent-appbar-count-color, var(--foreground-on-accent-rest, #ffffff));
		box-shadow: 0 0 0 1px var(--fluent-appbar-count-ring-color, var(--neutral-layer-1, #ffffff));
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
