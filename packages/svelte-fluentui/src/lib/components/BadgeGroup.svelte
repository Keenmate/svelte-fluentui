<!-- @component
Flex-wrap container that hides child badges past `maxVisibleBadgeCount`, optionally with a built-in "+N more" toggle.

```svelte
<BadgeGroup maxVisibleBadgeCount={3} expandable>{#each tags as t}<Badge>{t}</Badge>{/each}</BadgeGroup>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {BadgeGroupLabels} from "../i18n/labels.js"
	/**
	 * BadgeGroup — a flex-wrap container that limits how many child badges are
	 * visible. Ported from pure-admin's `pa-badge-group`, with the visible limit
	 * configurable per instance and an optional built-in expand/collapse toggle.
	 *
	 * Two modes:
	 * - **Static** (default): hides children past `maxVisibleBadgeCount` but always keeps the
	 *   LAST child shown — the conventional "+N more" tail you add yourself.
	 * - **Expandable** (`expandable`): the group renders its OWN clickable
	 *   "+N more" / "Show less" toggle after the badges (don't add a manual
	 *   tail), and clicking it reveals/collapses the hidden badges.
	 *
	 * Hidden children stay in the DOM (so filtering/sorting still see them) —
	 * they're just `display: none`. `showAll` (bindable) reveals everything; in
	 * expandable mode the built-in toggle flips it, so `bind:showAll` tracks
	 * the expanded state.
	 */

	type OwnProps = {
		/** Max badges shown before the overflow is hidden. Default: 5. */
		maxVisibleBadgeCount?: number
		/** Reveal all children, ignoring `maxVisibleBadgeCount`. Bindable; the expandable toggle writes it. */
		showAll?: boolean
		/** Render a built-in clickable "+N more" / "Show less" toggle. */
		expandable?: boolean
		/** Overrides of the built-in text (`svelteFluentUI.badgeGroup.*` keys) for this instance. `showMore` receives `{count}` (hidden badges). */
		labels?: BadgeGroupLabels
		/** Gap between badges (any CSS length). Default: `"0.5rem"`. */
		gap?: string
		/** The badges. */
		children?: Snippet
		/** Extra classes for the root `<div>`. */
		class?: string
		/** Inline style for the root `<div>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		maxVisibleBadgeCount = 5,
		showAll = $bindable(false),
		expandable = false,
		labels: labelsProp = undefined,
		gap = "0.5rem",
		children = undefined,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	const t = useTranslations("badgeGroup", () => labelsProp)

	let containerEl: HTMLDivElement | undefined = $state()
	let hiddenCount = $state(0)

	function badgeChildren(): HTMLElement[] {
		if (!containerEl) return []
		return Array.from(containerEl.children).filter(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && !el.classList.contains("badge-group-toggle")
		)
	}

	function applyLimit() {
		const kids = badgeChildren()
		const total = kids.length
		const revealed = showAll
		const lastIndex = total - 1
		kids.forEach((el, i) => {
			let hide: boolean
			if (revealed) hide = false
			else if (expandable) hide = i >= maxVisibleBadgeCount
			// static mode: keep the last child (the manual "+N more" tail) visible
			else hide = i >= maxVisibleBadgeCount && i !== lastIndex
			el.style.display = hide ? "none" : ""
		})
		hiddenCount = Math.max(0, total - maxVisibleBadgeCount)
	}

	function toggle() {
		showAll = !showAll
	}

	$effect(() => {
		// re-run when any of these change
		void maxVisibleBadgeCount
		void showAll
		void expandable
		applyLimit()

		// re-apply when children are added/removed (dynamic lists)
		const observer = new MutationObserver(() => applyLimit())
		if (containerEl) observer.observe(containerEl, {childList: true})
		return () => observer.disconnect()
	})
</script>

<div
	{...rest}
	bind:this={containerEl}
	class={`badge-group${className ? ` ${className}` : ""}`}
	style={`--fluent-badge-group-gap: ${gap};${style ? ` ${style}` : ""}`}
>
	{@render children?.()}
	{#if expandable && hiddenCount > 0}
		<button type="button" class="badge-group-toggle" aria-expanded={showAll} onclick={toggle}>
			{showAll ? t("showLess") : t("showMore", {count: hiddenCount})}
		</button>
	{/if}
</div>

<style>
	.badge-group {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--fluent-badge-group-gap, 0.5rem);
	}

	/* Toggle styled to match a neutral Badge */
	.badge-group-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--body-font);
		font-size: var(--type-ramp-minus-1-font-size, 12px);
		font-weight: 600;
		line-height: var(--type-ramp-minus-1-line-height, 16px);
		min-height: 20px;
		padding: 2px 8px;
		border: none;
		border-radius: var(--control-corner-radius, 4px);
		background-color: var(--neutral-fill-secondary-rest, #f0f0f0);
		color: var(--neutral-foreground-rest, #242424);
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.badge-group-toggle:hover {
		background-color: var(--neutral-fill-secondary-hover, #ebebeb);
	}

	.badge-group-toggle:focus-visible {
		outline: 2px solid var(--focus-stroke-outer, currentColor);
		outline-offset: 1px;
	}
</style>
