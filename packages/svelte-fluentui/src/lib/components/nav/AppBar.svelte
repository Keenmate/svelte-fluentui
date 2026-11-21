<!-- @component
Vertical (or horizontal) application bar of `AppBarItem` icon links. Items that don't fit move into a "…" popover (with an optional search).

```svelte
<AppBar><AppBarItem href="/inbox" count={3}>{#snippet icon()}<Icon name="mail" />{/snippet}Inbox</AppBarItem></AppBar>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import {setContext, tick, untrack} from "svelte"
	import type {Orientation, RestProps} from "../../types/index.js"
	import {classList} from "../../helpers/html.js"
	import {containsText, type SearchBehavior} from "../../helpers/text.js"
	import {dismissOnOutside} from "../../helpers/dismiss.js"
	import {pushLayer} from "../../helpers/layer-stack.js"
	import {useTranslations} from "../../i18n/translate.svelte.js"
	import type {AppBarLabels} from "../../i18n/labels.js"
	import PositioningRegion from "../PositioningRegion.svelte"
	import Search from "../Search.svelte"
	import {APP_BAR_CONTEXT, type AppBarContext, type AppBarEntry} from "./appbar.context.js"

	type OwnProps = {
		/** Bar direction. Default: `"vertical"`. */
		orientation?: Orientation
		/** Shows a search field in the overflow popover; a term searches all items, not only the hidden ones. Default: `false`. */
		showSearch?: boolean
		/** How the popover search matches item labels. Default: `"normalized"` (ignores case and diacritics). */
		searchBehavior?: SearchBehavior
		/** Fires when the overflow popover opens or closes. */
		onOverflowOpenChange?: (ctx: {open: boolean}) => void
		/** Overrides of the built-in text (`svelteFluentUI.appBar.*` keys) for this instance. */
		labels?: AppBarLabels
		/** `AppBarItem`s. */
		children?: Snippet
		/** Extra CSS classes. */
		class?: string
	}

	/** Other native attributes and events (`id`, `aria-label`, …) go to the root `<nav>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		    orientation = "vertical",
		    showSearch = false,
		    searchBehavior = "normalized",
		    onOverflowOpenChange = undefined,
		    labels: labelsProp = undefined,
		    children    = undefined,
		    class: className = undefined,
		    ...rest
	    }: Props = $props()

	const t = useTranslations("appBar", () => labelsProp)

	let itemsEl: HTMLElement | undefined = $state()
	let moreBtn: HTMLButtonElement | undefined = $state()
	let popupEl: HTMLElement | undefined = $state()
	let searchRef: {focus: (preventScroll?: boolean) => void} | undefined = $state()

	let entries = $state<AppBarEntry[]>([])
	let overflowed = $state<Set<string>>(new Set())
	let open = $state(false)
	let term = $state("")

	function domOrder(a: AppBarEntry, b: AppBarEntry): number {
		return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	}

	const overflowEntries = $derived(entries.filter((e) => overflowed.has(e.id)).sort(domOrder))
	// A search term searches every item (a visible one is still a quick way there); no term lists the hidden ones.
	const popoverEntries = $derived(
		term.trim()
			? [...entries].sort(domOrder).filter((e) => containsText(e.getText(), term.trim(), searchBehavior))
			: overflowEntries
	)

	function setOpen(next: boolean) {
		if (open === next) return
		open = next
		if (!next) term = ""
		onOverflowOpenChange?.({open: next})
	}

	setContext<AppBarContext>(APP_BAR_CONTEXT, {
		get orientation() {
			return orientation
		},
		register(entry) {
			entries = [...entries, entry]
			return () => untrack(() => {
				entries = entries.filter((e) => e !== entry)
				if (overflowed.has(entry.id)) overflowed = new Set([...overflowed].filter((id) => id !== entry.id))
			})
		},
		isOverflowed: (id) => overflowed.has(id),
		closeOverflow: () => setOpen(false)
	})

	// Items stay in the strip, which clips them (`overflow: hidden`); one that isn't fully
	// inside it is "overflowed": hidden + inert there, listed in the popover instead.
	$effect(() => {
		if (!itemsEl || typeof IntersectionObserver === "undefined") return
		const byElement = new Map(entries.map((e) => [e.element, e.id]))
		const observer = new IntersectionObserver(
			(records) => {
				const next = new Set(overflowed)
				for (const record of records) {
					const id = byElement.get(record.target as HTMLElement)
					if (!id) continue
					if (record.intersectionRatio < 0.98) next.add(id)
					else next.delete(id)
				}
				if (next.size !== overflowed.size || [...next].some((id) => !overflowed.has(id))) overflowed = next
			},
			{root: itemsEl, threshold: [0, 0.98, 1]}
		)
		for (const element of byElement.keys()) observer.observe(element)
		return () => observer.disconnect()
	})

	// Nothing left to show: close.
	$effect(() => {
		if (open && overflowEntries.length === 0) setOpen(false)
	})

	$effect(() => {
		if (!open) return
		const undismiss = dismissOnOutside(() => [moreBtn, popupEl], () => setOpen(false))
		const popLayer = pushLayer({
			onEscape: () => {
				setOpen(false)
				moreBtn?.focus()
			}
		})
		return () => {
			undismiss()
			popLayer()
		}
	})

	async function toggle() {
		setOpen(!open)
		if (!open) return
		await tick()
		if (searchRef) searchRef.focus()
		else popupEl?.querySelector<HTMLElement>(".fluent-appbar-item-link")?.focus()
	}

	const computedClasses = $derived(classList("fluent-appbar", orientation, className))
</script>

<nav
	{...rest}
	data-orientation={orientation}
	class={computedClasses}
>
	<div class="fluent-appbar-items" bind:this={itemsEl}>
		{@render children?.()}
	</div>

	{#if overflowEntries.length > 0}
		<button
			type="button"
			bind:this={moreBtn}
			class="fluent-appbar-more fluent-focus-ring"
			class:active={open}
			title={t("moreItemsTooltip")}
			aria-label={t("moreItemsAriaLabel")}
			aria-haspopup="dialog"
			aria-expanded={open}
			onclick={toggle}
		>
			<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
				<path d="M4.5 8a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm4.75 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zM12.75 9.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/>
			</svg>
		</button>
	{/if}
</nav>

{#if moreBtn}
	<PositioningRegion
		anchor={moreBtn}
		visible={open}
		matchWidth={false}
		position={orientation === "horizontal" ? "bottom" : "end"}
		align="top"
	>
		<div
			class="fluent-appbar-popover fluent-popup-surface"
			role="dialog"
			aria-label={t("popupAriaLabel")}
			bind:this={popupEl}
		>
			{#if showSearch}
				<Search
					class="fluent-appbar-popover-search"
					bind:this={searchRef}
					bind:value={term}
					placeholder={t("searchPlaceholder")}
					ariaLabel={t("searchAriaLabel")}
				/>
			{/if}
			<div class="fluent-appbar-popover-items">
				{#each popoverEntries as entry (entry.id)}
					{@render entry.popoverTile()}
				{:else}
					<div class="fluent-appbar-popover-empty">{t("noResults")}</div>
				{/each}
			</div>
		</div>
	</PositioningRegion>
{/if}

<style>
	/* The bar surface. Vertical: a full-height column (the strip takes the space, the "…"
	   button sits at the end); horizontal: a full-width row. */
	.fluent-appbar {
		--fluent-appbar-item-size: 68;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		block-size: 100%;
		inline-size: fit-content;
		background: var(--fluent-appbar-background, var(--neutral-layer-2));
		color: var(--neutral-foreground-rest);
	}

	.fluent-appbar.horizontal {
		flex-direction: row;
		block-size: auto;
		inline-size: 100%;
	}

	/* The strip clips; an item that doesn't fit is detected (AppBar's IntersectionObserver)
	   and hidden. Block padding leaves room for the count badge above the first icon. */
	.fluent-appbar-items {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-block-size: 0;
		min-inline-size: 0;
		overflow: hidden;
		padding-block: var(--fluent-appbar-padding-block, calc(var(--design-unit) * 1px));
	}

	.horizontal .fluent-appbar-items {
		flex-direction: row;
	}

	.fluent-appbar-more {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: calc(var(--fluent-appbar-item-size, 68) * 1px);
		block-size: var(--fluent-appbar-item-block-size, calc(var(--fluent-appbar-item-size, 68) * 1px - var(--design-unit) * 5px));
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: calc(var(--control-corner-radius, 4) * 1px);
		background: transparent;
		color: var(--neutral-foreground-rest);
		cursor: pointer;
	}

	.horizontal .fluent-appbar-more {
		align-self: center;
	}

	.fluent-appbar-more:hover,
	.fluent-appbar-more.active {
		background-color: var(--neutral-fill-secondary-rest);
	}

	/* Overflow popover: the hidden items as tiles, three per row. */
	.fluent-appbar-popover {
		--fluent-appbar-count-ring-color: var(--neutral-layer-floating);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: var(--fluent-appbar-popover-gap, calc(var(--design-unit) * 2px));
		padding: var(--fluent-appbar-popover-padding, calc(var(--design-unit) * 2px));
		/* Three tiles per row (+ padding + the 1px surface border). */
		max-inline-size: calc(var(--fluent-appbar-item-size, 68) * 3px + 2 * var(--fluent-appbar-popover-padding, calc(var(--design-unit) * 2px)) + 2px);
	}

	.fluent-appbar-popover :global(.fluent-appbar-popover-search) {
		inline-size: 100%;
	}

	.fluent-appbar-popover-items {
		display: flex;
		flex-wrap: wrap;
		padding-block-start: calc(var(--design-unit) * 1px);
	}

	.fluent-appbar-popover-empty {
		padding: calc(var(--design-unit) * 2px);
		color: var(--neutral-foreground-hint);
		font-size: var(--type-ramp-minus-1-font-size);
	}
</style>
