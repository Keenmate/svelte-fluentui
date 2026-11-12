<script lang="ts">
	import type {Snippet} from "svelte"
	import type {AnchorRestProps} from "../../types/index.js"
	import Stack from "../layout/Stack.svelte"
	import {StackHorizontalAlign, StackOrientation, StackVerticalAlign} from "../../fluent-ui/constants/stack.js"

	type OwnProps = {
		href?: string
		rel?: string
		/** Counter shown as a small badge on the icon (e.g. unread items). Hidden when 0 / undefined. */
		count?: number
		/** Largest value displayed verbatim; above it the badge reads "<maxCount>+". The full count is still announced to screen readers. */
		maxCount?: number
		/** Highlights the item as the current one. Controlled by the app (e.g. from the current route). */
		active?: boolean
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
		icon?: Snippet
		children?: Snippet
		class?: string
	}

	/** Other native attributes and events (`target`, `download`, `title`, `aria-current`, `onkeydown`, …) go to the inner `<a>`. */
	type Props = OwnProps & AnchorRestProps<OwnProps>

	let {
		    href     = undefined,
		    rel      = undefined,
		    count    = undefined,
		    maxCount = 99,
		    active   = undefined,
		    onclick = undefined,
		    icon = undefined,
		    children = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	const showCount = $derived(typeof count === "number" && count > 0)
	const countText = $derived(showCount ? (count! > maxCount ? `${maxCount}+` : String(count)) : "")
</script>

<div
	class="fluent-appbar-item {className || ''}"
>
	<div class="fluentui-counterbadge-container">
		<a
			{...rest}
			{href}
			{rel}
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
					{#if showCount}<span class="fluent-appbar-item-count-text">, {count}</span>{/if}
				</div>
			</Stack>
		</a>
	</div>

</div>

<style>
	.fluent-appbar-item-icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* Counter badge pinned to the icon's top end corner (flips in RTL). */
	.fluent-appbar-item-count {
		position: absolute;
		inset-block-start: -6px;
		inset-inline-end: -10px;
		z-index: 1;
		box-sizing: border-box;
		min-inline-size: 16px;
		block-size: 16px;
		padding-inline: 4px;
		border-radius: 8px;
		background-color: var(--accent-fill-rest, #0078d4);
		color: var(--foreground-on-accent-rest, #ffffff);
		box-shadow: 0 0 0 1px var(--neutral-layer-1, #ffffff);
		font-size: 10px;
		font-weight: 600;
		line-height: 16px;
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
