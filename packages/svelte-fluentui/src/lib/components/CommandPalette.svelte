<script lang="ts">
	import type {Snippet} from "svelte"
	import {onMount, tick, untrack} from "svelte"
	import Icon from "./Icon.svelte"
	import {portal} from "../actions/portal.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {ListNav} from "../helpers/listbox-nav.svelte.js"
	import {normalizeForSearch, type SearchBehavior} from "../helpers/text.js"
	import type {CommandPaletteItem, CommandPaletteFilter, CommandPaletteActionDetail} from "./CommandPalette.types.js"
	import {createLinkActivation, resolveActionItem, runAction} from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Items to search. Each is either navigation (`href`) or an action (`onClick`). */
		items: CommandPaletteItem[]
		/** Controlled open state. Bind it to drive the palette from your own trigger. */
		open?: boolean
		/** Input placeholder. */
		placeholder?: string
		/** Items shown on the idle screen (no query yet), grouped by `group`. Defaults to the first `maxResultCount` of `items`. */
		homeItems?: CommandPaletteItem[]
		/** Max results rendered for a query. */
		maxResultCount?: number
		/**
		 * Global keyboard shortcut that toggles the palette, e.g. "mod+k"
		 * (mod = ⌘ on Mac, Ctrl elsewhere). Set `enableShortcut={false}` to
		 * disable the built-in listener and drive `open` yourself.
		 */
		shortcut?: string
		/** Register the global `shortcut` listener. */
		enableShortcut?: boolean
		/** Close the palette after an item is selected. */
		closeOnSelect?: boolean
		/** Override the built-in fuzzy scorer with app-specific search. */
		filterCallback?: CommandPaletteFilter
		/** How the built-in search compares text: `normalized` (default) ignores case and
		 * diacritics (`cafe` finds `Café`), `case-insensitive` ignores case only, `exact`
		 * matches both. Applies to scoring and the match highlight; no effect on `filterCallback`. */
		searchBehavior?: SearchBehavior
		/** Fires after an item ran (its `onClick`, or the navigation started). */
		onAction?: (detail: CommandPaletteActionDetail) => void
		/** Called before an item runs or navigates; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: CommandPaletteActionDetail) => unknown
		/** Fires when the palette opens or closes. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Replace a result row's rendering. Receives the item and whether it's the active row. */
		item?: Snippet<[item: CommandPaletteItem, selected: boolean]>
		/** Text shown when nothing matches (used when no `empty` snippet is given). Defaults to
		 * the built-in message: `No matches for "<query>"`, or `No items` with an empty query. */
		emptyText?: string
		/** Replace the empty-state body. Receives the current query. */
		empty?: Snippet<[query: string]>
		/** Replace the footer hints. */
		footer?: Snippet
	}

	/** Other native attributes and events (`id`, `class`, `aria-label`, …) go to the palette panel (`role="dialog"`). */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		items,
		open = $bindable(false),
		placeholder = "Search…",
		homeItems = undefined,
		maxResultCount = 50,
		shortcut = "mod+k",
		enableShortcut = true,
		closeOnSelect = true,
		filterCallback = undefined,
		searchBehavior = "normalized",
		onAction = undefined,
		beforeActionCallback = undefined,
		onOpenChange = undefined,
		item: itemSnippet = undefined,
		emptyText = undefined,
		empty: emptySnippet = undefined,
		footer: footerSnippet = undefined,
		class: className = undefined,
		...rest
	}: Props = $props()

	let query = $state("")
	let inputEl = $state<HTMLInputElement | undefined>(undefined)
	let listEl = $state<HTMLDivElement | undefined>(undefined)

	const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)
	const modKey = isMac ? "⌘" : "Ctrl"

	// Parse "mod+k" once into the modifier/key contract the keydown handler checks.
	const parsedShortcut = $derived.by(() => {
		const parts = shortcut.toLowerCase().split("+").map((p) => p.trim()).filter(Boolean)
		return {
			key: parts[parts.length - 1] ?? "",
			mod: parts.includes("mod"),
			ctrl: parts.includes("ctrl"),
			meta: parts.includes("cmd") || parts.includes("meta"),
			shift: parts.includes("shift"),
			alt: parts.includes("alt")
		}
	})

	const norm = (text: string) => normalizeForSearch(text, searchBehavior)

	// Searchable fields, normalized once per items / searchBehavior change.
	const searchIndex = $derived(
		items.map((it) => ({
			it,
			title: norm(it.text),
			group: norm(it.group ?? ""),
			meta: norm(it.meta ?? ""),
			keywords: (it.keywords ?? []).map(norm)
		}))
	)

	// Score: higher = better match. 0 = no match. Layered so exact / prefix beat
	// substring beat fuzzy-subsequence. Searches title, meta, group and keywords.
	// All fields and the needle are normalized under `searchBehavior`.
	function score(entry: (typeof searchIndex)[number], needle: string): number {
		const {title, group} = entry
		if (title === needle) return 1000
		if (title.startsWith(needle)) return 500 - (title.length - needle.length)
		if (group === needle) return 400
		if (title.includes(needle)) return 300 - title.indexOf(needle)
		if (entry.meta.includes(needle)) return 200
		if (entry.keywords.some((k) => k.includes(needle))) return 150
		if (group.includes(needle)) return 100
		// Fuzzy: every character of needle must appear in title in order.
		let i = 0
		for (const c of title) {
			if (c === needle[i]) i++
			if (i === needle.length) return 20
		}
		return 0
	}

	const trimmedQuery = $derived(query.trim())
	const normalizedQuery = $derived(norm(trimmedQuery))

	const results = $derived.by(() => {
		const q = trimmedQuery
		if (!q) return []
		if (filterCallback) return filterCallback({items, term: q}).slice(0, maxResultCount)
		const needle = normalizedQuery
		if (!needle) return []
		return searchIndex
			.map((entry) => ({it: entry.it, s: score(entry, needle)}))
			.filter((r) => r.s > 0)
			.sort((a, b) => b.s - a.s)
			.slice(0, maxResultCount)
			.map((r) => r.it)
	})

	// Idle screen: grouped sections preserving first-appearance order.
	const homeSections = $derived.by(() => {
		const source = (homeItems ?? items).slice(0, maxResultCount)
		const order: string[] = []
		const byGroup = new Map<string, CommandPaletteItem[]>()
		for (const it of source) {
			const g = it.group ?? ""
			if (!byGroup.has(g)) {
				byGroup.set(g, [])
				order.push(g)
			}
			byGroup.get(g)!.push(it)
		}
		return order.map((g) => ({group: g, items: byGroup.get(g)!}))
	})

	// Flattened render list — section headers interleaved with rows — so a single
	// running index drives both keyboard nav and the highlight. Headers carry no index.
	type Row =
		| {kind: "header"; label: string}
		| {kind: "item"; item: CommandPaletteItem; index: number}

	const rows = $derived.by(() => {
		const out: Row[] = []
		let index = 0
		if (trimmedQuery) {
			for (const it of results) out.push({kind: "item", item: it, index: index++})
		} else {
			for (const section of homeSections) {
				if (section.group) out.push({kind: "header", label: section.group})
				for (const it of section.items) out.push({kind: "item", item: it, index: index++})
			}
		}
		return out
	})

	const itemCount = $derived(rows.filter((r) => r.kind === "item").length)

	// Keyboard cursor over the result rows: clamped at both ends (no wrap).
	const nav = new ListNav({
		count: () => itemCount,
		itemAt: (index) => listEl?.querySelector(`[data-idx="${index}"]`)
	})
	const selectedIndex = $derived(nav.index)

	// Highlights the first row (when there is one) and scrolls it into view.
	function resetHighlight() {
		nav.index = 0
		void nav.scrollIntoView()
	}

	function itemKey(it: CommandPaletteItem): string {
		return it.id ?? it.href ?? it.text
	}

	// Split a title around the first contiguous match of the query for <mark>
	// highlighting. Subsequence (fuzzy) matches don't highlight — only the simple
	// substring case, which is what users actually read. Matching runs on the
	// normalized title (so `cafe` marks `Café`); the match is mapped back to the
	// original text through the normalized length of each prefix.
	function highlight(title: string): {text: string; mark: boolean}[] {
		const needle = normalizedQuery
		if (!needle) return [{text: title, mark: false}]
		const start = norm(title).indexOf(needle)
		if (start < 0) return [{text: title, mark: false}]
		const end = start + needle.length
		// Code-point boundaries of the original title and their normalized offsets.
		const bounds: {at: number; len: number}[] = [{at: 0, len: 0}]
		let at = 0
		for (const ch of title) {
			at += ch.length
			bounds.push({at, len: norm(title.slice(0, at)).length})
		}
		let from = 0
		for (const b of bounds) if (b.len <= start) from = b.at
		let toIdx = bounds.findIndex((b) => b.len >= end)
		if (toIdx < 0) toIdx = bounds.length - 1
		// Take trailing combining marks along (they normalize to nothing).
		while (toIdx + 1 < bounds.length && bounds[toIdx + 1].len === bounds[toIdx].len) toIdx++
		const to = bounds[toIdx].at
		return [
			{text: title.slice(0, from), mark: false},
			{text: title.slice(from, to), mark: true},
			{text: title.slice(to), mark: false}
		].filter((s) => s.text.length > 0)
	}

	async function openPalette() {
		open = true
		query = ""
		resetHighlight()
		onOpenChange?.({open: true})
		await tick()
		inputEl?.focus()
	}

	function closePalette() {
		if (!open) return
		open = false
		onOpenChange?.({open: false})
	}

	const actionHost = {}
	// Navigation rows: cancel + replay so beforeActionCallback can veto them.
	const activateLink = createLinkActivation()

	function isDisabled(it: CommandPaletteItem): boolean {
		return resolveActionItem(it, {term: query.trim()}).isDisabled
	}

	async function selectItem(it: CommandPaletteItem, event: MouseEvent) {
		if (isDisabled(it)) {
			event.preventDefault()
			return
		}
		const run = () => runAction({
			host: actionHost,
			detail: {
				term: query.trim(),
				action: it.action ?? "custom",
				id: it.id,
				item: it,
				source: "palette",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			} satisfies CommandPaletteActionDetail,
			beforeActionCallback,
			emitAction: (d) => onAction?.(d)
		})
		const ran = it.href && !it.onClick
			? await activateLink(event, run, !!beforeActionCallback)
			: await run()
		if (ran && closeOnSelect) closePalette()
	}

	// Enter activates the highlighted row by clicking its DOM node — works for both
	// <button> actions and <a> navigation (router intercepts the anchor click).
	function activateSelected() {
		const el = listEl?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`)
		el?.click()
	}

	function matchesShortcut(e: KeyboardEvent): boolean {
		const s = parsedShortcut
		if (!s.key || e.key.toLowerCase() !== s.key) return false
		const wantCtrlOrMeta = s.mod || s.ctrl || s.meta
		if (wantCtrlOrMeta && !(e.ctrlKey || e.metaKey)) return false
		if (!wantCtrlOrMeta && (e.ctrlKey || e.metaKey)) return false
		if (s.shift !== e.shiftKey) return false
		if (s.alt !== e.altKey) return false
		return true
	}

	// Reset highlighted row whenever the query changes.
	$effect(() => {
		query
		untrack(resetHighlight)
	})

	// However it was opened (shortcut, trigger, or `bind:open` from the app),
	// start with an empty query and the search input focused.
	let wasOpen = false
	$effect(() => {
		const isOpen = open
		if (isOpen && !wasOpen) {
			untrack(() => {
				query = ""
				resetHighlight()
			})
			tick().then(() => inputEl?.focus())
		}
		wasOpen = isOpen
	})

	function handleGlobalKey(e: KeyboardEvent) {
		if (enableShortcut && matchesShortcut(e)) {
			e.preventDefault()
			if (open) closePalette()
			else openPalette()
			return
		}

		if (!open) return

		// Arrows / PageUp / PageDown move the cursor (scrolled into view by ListNav).
		// Home / End stay with the search input's caret.
		if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") {
			nav.handleKey(e)
		} else if (e.key === "Enter") {
			e.preventDefault()
			activateSelected()
		}
	}

	// Escape goes to the topmost open layer (helpers/layer-stack.ts)
	$effect(() => {
		if (open) return pushLayer({onEscape: () => closePalette()})
	})

	onMount(() => {
		document.addEventListener("keydown", handleGlobalKey)
		return () => document.removeEventListener("keydown", handleGlobalKey)
	})
</script>

{#snippet rowBody(it: CommandPaletteItem)}
	{#if it.icon}
		<span class="cp-item-icon">{#if typeof it.icon === "string"}<Icon name={it.icon} size={20} />{:else}{@render it.icon()}{/if}</span>
	{/if}
	<span class="cp-item-content">
		<span class="cp-item-title">
			{#each highlight(it.text) as seg}{#if seg.mark}<mark>{seg.text}</mark>{:else}{seg.text}{/if}{/each}
		</span>
		{#if it.meta}<span class="cp-item-meta">{it.meta}</span>{/if}
	</span>
	{#if trimmedQuery && it.group}
		<span class="cp-item-group">{it.group}</span>
	{/if}
	{#if it.badge}
		<span class="cp-item-badge">{it.badge}</span>
	{/if}
	{#if it.shortcut}
		<span class="cp-item-shortcut">
			{#each it.shortcut.split(" ") as key}<kbd>{key}</kbd>{/each}
		</span>
	{/if}
{/snippet}

{#if open}
	<div use:portal class="cp-root">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="cp-backdrop" onclick={closePalette}></div>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			{...rest}
			class={["cp-panel", className]}
		>
			<div class="cp-search-row">
				<svg class="cp-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M7 1.75a5.25 5.25 0 1 0 3.215 9.4l3.067 3.068a.75.75 0 1 0 1.061-1.061l-3.066-3.066A5.25 5.25 0 0 0 7 1.75zM3.25 7a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0z" fill="currentColor"/>
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					class="cp-input"
					{placeholder}
					autocomplete="off"
					spellcheck="false"
				/>
				<span class="cp-kbd-hint">esc to close</span>
			</div>

			<div class="cp-results" bind:this={listEl} role="listbox">
				{#each rows as row (row.kind === "header" ? "h:" + row.label : itemKey(row.item) + ":" + row.index)}
					{#if row.kind === "header"}
						<div class="cp-section">{row.label}</div>
					{:else if row.item.href && !row.item.onClick}
						<!-- Navigation row — real <a> so the host router handles the click. -->
						<a
							class="cp-item"
							class:selected={row.index === selectedIndex}
							class:disabled={isDisabled(row.item)}
							data-idx={row.index}
							href={isDisabled(row.item) ? undefined : row.item.href}
							target={row.item.target ?? null}
							rel={row.item.rel ?? null}
							role="option"
							aria-selected={row.index === selectedIndex}
							onclickcapture={(event) => selectItem(row.item, event)}
							onmousemove={() => (nav.index = row.index)}
						>
							{#if itemSnippet}{@render itemSnippet(row.item, row.index === selectedIndex)}{:else}{@render rowBody(row.item)}{/if}
						</a>
					{:else}
						<!-- Action row. -->
						<button
							type="button"
							class="cp-item"
							class:selected={row.index === selectedIndex}
							data-idx={row.index}
							disabled={isDisabled(row.item) || undefined}
							role="option"
							aria-selected={row.index === selectedIndex}
							onclick={(event) => selectItem(row.item, event)}
							onmousemove={() => (nav.index = row.index)}
						>
							{#if itemSnippet}{@render itemSnippet(row.item, row.index === selectedIndex)}{:else}{@render rowBody(row.item)}{/if}
						</button>
					{/if}
				{/each}

				{#if itemCount === 0}
					{#if emptySnippet}
						{@render emptySnippet(trimmedQuery)}
					{:else}
						<div class="cp-empty">
							{#if emptyText}{emptyText}{:else if trimmedQuery}No matches for "{trimmedQuery}"{:else}No items{/if}
						</div>
					{/if}
				{/if}
			</div>

			{#if footerSnippet}
				{@render footerSnippet()}
			{:else}
				<div class="cp-footer">
					<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
					<span><kbd>↵</kbd> select</span>
					<span><kbd>{modKey}</kbd><kbd>{parsedShortcut.key.toUpperCase()}</kbd> toggle</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.cp-root {
		position: fixed;
		inset: 0;
		z-index: var(--fluent-z-modal);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-top: 12vh;
	}

	.cp-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
	}

	.cp-panel {
		position: relative;
		width: min(640px, calc(100vw - 2rem));
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		background: var(--neutral-layer-1, #ffffff);
		border: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		border-radius: 8px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22), 0 0 2px rgba(0, 0, 0, 0.12);
		overflow: hidden;
		font-family: var(--body-font);
	}

	.cp-search-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
	}

	.cp-search-icon {
		color: var(--neutral-foreground-hint, #666);
		flex-shrink: 0;
	}

	.cp-input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-size: 1rem;
		color: var(--neutral-foreground-rest, inherit);
		font-family: inherit;
	}

	.cp-kbd-hint {
		color: var(--neutral-foreground-hint, #888);
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.cp-results {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.25rem;
	}

	.cp-section {
		padding: 0.5rem 0.75rem 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--neutral-foreground-hint, #888);
	}

	.cp-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		text-align: start;
		text-decoration: none;
		font: inherit;
		color: var(--neutral-foreground-rest, inherit);
	}

	.cp-item.selected {
		background: var(--accent-fill-rest, #0078d4);
		color: var(--neutral-foreground-on-accent, #ffffff);
	}

	.cp-item.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.cp-item-icon {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--accent-fill-rest);
	}

	.cp-item.selected .cp-item-icon {
		color: inherit;
	}

	.cp-item-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.cp-item-title {
		font-size: 0.9375rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cp-item-title :global(mark) {
		background: transparent;
		color: var(--accent-fill-rest, #0078d4);
		font-weight: 700;
	}

	.cp-item.selected .cp-item-title :global(mark) {
		color: inherit;
		text-decoration: underline;
	}

	.cp-item-meta {
		font-size: 0.75rem;
		color: var(--neutral-foreground-hint, #888);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cp-item.selected .cp-item-meta {
		color: inherit;
		opacity: 0.85;
	}

	.cp-item-group {
		flex-shrink: 0;
		font-size: 0.75rem;
		opacity: 0.8;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		background: var(--neutral-fill-secondary-rest, rgba(0, 0, 0, 0.06));
	}

	.cp-item.selected .cp-item-group {
		background: rgba(255, 255, 255, 0.2);
	}

	.cp-item-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		background: var(--neutral-fill-secondary-rest, rgba(0, 0, 0, 0.06));
		color: var(--neutral-foreground-rest);
	}

	.cp-item.selected .cp-item-badge {
		background: rgba(255, 255, 255, 0.2);
		color: inherit;
	}

	.cp-item-shortcut {
		display: inline-flex;
		gap: 0.15rem;
		flex-shrink: 0;
	}

	.cp-empty {
		padding: 1.5rem 1rem;
		text-align: center;
		color: var(--neutral-foreground-hint, #888);
		font-size: 0.875rem;
	}

	.cp-footer {
		display: flex;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-top: 1px solid var(--neutral-stroke-layer-rest, #e0e0e0);
		font-size: 0.75rem;
		color: var(--neutral-foreground-hint, #888);
	}

	.cp-footer kbd,
	.cp-item-shortcut kbd {
		display: inline-block;
		padding: 0.05rem 0.35rem;
		border: 1px solid var(--neutral-stroke-layer-rest, #ccc);
		border-radius: 3px;
		background: var(--neutral-layer-2, #f5f5f5);
		color: var(--neutral-foreground-rest, #222);
		font-family: inherit;
		font-size: 0.7rem;
		margin-block: 0;
		margin-inline: 0 0.15rem;
		min-width: 1rem;
		text-align: center;
	}

	.cp-item.selected .cp-item-shortcut kbd {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
		color: inherit;
	}
</style>
