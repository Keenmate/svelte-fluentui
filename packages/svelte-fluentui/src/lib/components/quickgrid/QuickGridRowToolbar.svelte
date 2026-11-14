<script lang="ts" generics="T">
	import Icon from "../Icon.svelte"
	import PositioningRegion from "../PositioningRegion.svelte"
	import {resolveMenuEntries, type ActionItem, type ResolvedActionItem} from "../../action-items/index.js"
	import type {
		QuickGridLabels,
		QuickGridRowContext as RowContext,
		QuickGridRowToolbarAction as RowToolbarAction,
		QuickGridRowToolbarConfig as RowToolbarConfig,
		QuickGridRowToolbarItem as RowToolbarItem
	} from "../QuickGrid.types.js"

	// QuickGrid's floating row toolbar (internal): positioned beside / above the row it opened at,
	// with a connector to the row once an action moved it. Arrow / Home / End rove its buttons.
	// The grid owns opening, closing, hover timing, outside / Escape dismissal and running items.
	type Props = {
		/** The `<tr>` the toolbar opened at (it stays there while its row moves). */
		anchor: HTMLElement
		table: HTMLTableElement
		/** The toolbar's row and its current view position. */
		target: {row: T; viewIndex: number}
		/** Changes on every open (even of the same row): forgets that the row moved. */
		session: number
		align: 'center' | 'top'
		labels: QuickGridLabels
		entries: RowToolbarConfig<T>[]
		rowContext: RowContext<T>
		/** Built-in presets (icon, text) for an item's `action`. */
		presets: Partial<Record<RowToolbarAction, Partial<ResolvedActionItem<RowToolbarAction>>>>
		/** Bindable: the toolbar element. */
		element?: HTMLDivElement
		/** Bindable: focus is inside the toolbar. */
		focused?: boolean
		onItemClick: (ctx: {item: RowToolbarItem<T>; action: string; event: MouseEvent}) => void
		/** Tab pressed inside: the toolbar is portalled, so it closes (returning focus) instead. */
		onCloseRequest: () => void
		onpointerenter?: (event: PointerEvent) => void
		onpointerleave?: (event: PointerEvent) => void
	}

	let {
		anchor, table, target, session, align, labels, entries, rowContext, presets,
		element = $bindable(), focused = $bindable(false), onItemClick, onCloseRequest, onpointerenter, onpointerleave
	}: Props = $props()

	function itemDefaults(item: ActionItem<RowContext<T>, RowToolbarAction>) {
		return item.action && item.action !== 'custom' ? presets[item.action] : undefined
	}

	// Split entries into lines (`toolbarRow`, default 1), furthest line first.
	// A divider belongs to the line of the item before it.
	const lines = $derived.by(() => {
		const byLine = new Map<number, RowToolbarConfig<T>[]>()
		let currentLine = 1
		for (const entry of entries) {
			if (typeof entry !== 'string' && !('divider' in entry && entry.divider)) {
				currentLine = (entry as RowToolbarItem<T>).toolbarRow ?? 1
			} else if (typeof entry === 'string') {
				currentLine = 1
			}
			if (!byLine.has(currentLine)) byLine.set(currentLine, [])
			byLine.get(currentLine)!.push(entry)
		}
		return [...byLine.entries()].sort((a, b) => b[0] - a[0]).map(([, list]) => list)
	})

	function handleKeyDown(event: KeyboardEvent) {
		const buttons = [...(element?.querySelectorAll<HTMLElement>('.row-toolbar-btn:not(:disabled)') ?? [])]
		const index = buttons.indexOf(document.activeElement as HTMLElement)
		const rtl = !!element && getComputedStyle(element).direction === 'rtl'
		let next: number
		switch (event.key) {
			case 'ArrowRight': next = index + (rtl ? -1 : 1); break
			case 'ArrowLeft': next = index + (rtl ? 1 : -1); break
			case 'ArrowDown': next = index + 1; break
			case 'ArrowUp': next = index - 1; break
			case 'Home': next = 0; break
			case 'End': next = buttons.length - 1; break
			case 'Tab':
				event.preventDefault()
				onCloseRequest()
				return
			default: return
		}
		event.preventDefault()
		if (buttons.length === 0) return
		buttons[(next + buttons.length) % buttons.length].focus()
	}

	function handleFocusOut(event: FocusEvent) {
		if (!element?.contains(event.relatedTarget as Node | null)) focused = false
	}

	// Physical side, decided from the space around the table: 1. left, 2. right, 3. top
	let side = $state<'left' | 'right' | 'top'>('left')
	$effect(() => {
		void anchor
		const tableRect = table.getBoundingClientRect()
		// The side needs room for the whole toolbar (measured once it has rendered —
		// `element` re-runs this effect), or a wide toolbar ends up off-screen.
		const minSpace = Math.max(100, (element?.offsetWidth ?? 0) + 8)
		if (tableRect.left >= minSpace) side = 'left'
		else if (window.innerWidth - tableRect.right >= minSpace) side = 'right'
		else side = 'top'
	})

	// PositioningRegion takes logical start / end and flips them for RTL itself.
	const regionPosition = $derived.by(() => {
		if (side === 'top') return 'top' as const
		const rtl = getComputedStyle(anchor).direction === 'rtl'
		return (side === 'left') !== rtl ? 'start' as const : 'end' as const
	})

	// Bracket-shaped connector from the toolbar to its row, once the row moved away from `anchor`
	let movedSession = $state(-1)
	let connector = $state<{path: string; x: number; y: number; dir: 'left' | 'right'} | null>(null)
	$effect(() => {
		const currentRowEl = table.querySelectorAll(':scope > tbody > tr')[target.viewIndex] as HTMLElement | undefined
		if (!element || !currentRowEl) {
			connector = null
			return
		}
		const isAdjacent = currentRowEl === anchor
		if (!isAdjacent) movedSession = session
		if (movedSession !== session) {
			connector = null
			return
		}

		const popupRect = element.getBoundingClientRect()
		const rowRect = currentRowEl.getBoundingClientRect()
		const tableRect = table.getBoundingClientRect()
		const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
		const dir = isRTL ? 'left' : 'right'
		const isOverlapping = !(rowRect.bottom < popupRect.top || rowRect.top > popupRect.bottom)

		// Out to the table's start edge, along it to the row, then in to the row
		const cornerX = isRTL ? tableRect.right + 15 : tableRect.left - 15
		const endX = isRTL ? rowRect.right + 8 : rowRect.left - 8
		const endY = rowRect.top + rowRect.height / 2

		if (side === 'top' && isOverlapping && !isAdjacent) {
			// Overlapping (but not adjacent) - back-loop pointing to itself
			const startY = rowRect.top + rowRect.height * 0.75
			const loopEndY = rowRect.top + rowRect.height * 0.25
			connector = {path: `M ${endX} ${startY} H ${cornerX} V ${loopEndY} H ${endX}`, x: endX, y: loopEndY, dir}
			return
		}
		// From the toolbar's side facing the table (above it: its start side)
		const startX = side === 'left' ? popupRect.right : side === 'right' ? popupRect.left : isRTL ? popupRect.right : popupRect.left
		const startY = popupRect.top + popupRect.height / 2
		connector = {path: `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`, x: endX, y: endY, dir}
	})
</script>

<PositioningRegion {anchor} visible={true} position={regionPosition} {align} matchWidth={false} style="width: auto;">
	<div
		bind:this={element}
		class="row-toolbar"
		role="toolbar"
		tabindex="-1"
		aria-label={labels.rowActions}
		{onpointerenter}
		{onpointerleave}
		onkeydown={handleKeyDown}
		onfocusin={() => (focused = true)}
		onfocusout={handleFocusOut}
	>
		{#each lines as line}
			<div class="row-toolbar-row">
				{#each resolveMenuEntries(line, rowContext, itemDefaults) as entry}
					{#if entry.kind === 'divider'}
						<div class="row-toolbar-divider"></div>
					{:else}
						{@const r = entry.resolved}
						<button
							class="row-toolbar-btn {r.cssClass}"
							class:danger={r.isDanger}
							title={r.tooltip ?? r.text}
							aria-label={r.text}
							aria-pressed={r.isToggle ? r.isToggled : undefined}
							disabled={r.isDisabled}
							onclick={(event) => onItemClick({item: entry.item as RowToolbarItem<T>, action: r.action, event})}
						>
							{#if typeof r.icon === 'string'}
								<Icon name={r.icon} size={16} />
							{:else if r.icon}
								{@render r.icon()}
							{/if}
							{#if (entry.item as RowToolbarItem<T>).isTextVisible}
								<span class="row-toolbar-label">{r.text}</span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</PositioningRegion>
<!-- L-shaped connector line when row has moved -->
{#if connector}
	<svg class="row-connector">
		<path d={connector.path} />
		<!-- Arrow head pointing at the row -->
		<polygon
			points={connector.dir === 'left' ? '0,-4 -8,0 0,4' : '0,-4 8,0 0,4'}
			transform="translate({connector.x}, {connector.y})"
		/>
	</svg>
{/if}

<style>
	.row-toolbar {
		outline: none;
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 0;
		background: var(--fluent-quickgrid-toolbar-bg, var(--neutral-layer-floating, #ffffff));
		border: 1px solid var(--fluent-quickgrid-toolbar-border, var(--neutral-stroke-rest, #d1d1d1));
		border-radius: var(--control-corner-radius, 4px);
		box-shadow: var(--fluent-quickgrid-toolbar-shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
	}

	.row-toolbar-row {
		display: flex;
		gap: 2px;
		align-items: center;
		/* Match grid row height: vertical padding (design-unit * 2 * 2) + line-height (~21px) */
		height: calc(var(--design-unit, 4) * 4px + 21px);
		padding: 0 4px;
	}

	.row-toolbar-divider {
		width: 1px;
		height: 16px;
		background: var(--fluent-quickgrid-toolbar-border, var(--neutral-stroke-rest, #d1d1d1));
		margin: 0 2px;
	}

	.row-toolbar-btn {
		min-width: 24px;
		height: 100%;
		border: none;
		border-radius: var(--control-corner-radius, 4px);
		background: transparent;
		color: var(--fluent-quickgrid-toolbar-text, var(--neutral-foreground-rest, #242424));
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-size: 14px;
		font-weight: 500;
		transition: background 0.1s ease;
		padding: 0 4px;
	}

	.row-toolbar-btn:hover {
		background: var(--fluent-quickgrid-toolbar-hover-bg, var(--neutral-fill-secondary-hover, #f0f0f0));
	}

	.row-toolbar-btn:active {
		background: var(--neutral-fill-secondary-active, #e0e0e0);
	}

	.row-toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.row-toolbar-btn:disabled:hover {
		background: transparent;
	}

	.row-toolbar-btn.danger:hover {
		background: var(--fluent-color-danger-tint, rgba(197, 15, 31, 0.12));
		color: var(--fluent-color-danger-foreground, #d13438);
	}

	.row-toolbar-btn:focus-visible {
		outline: calc(var(--focus-stroke-width, 2) * 1px) solid var(--fluent-quickgrid-focus-stroke, var(--focus-stroke-outer, #0078d4));
		outline-offset: 1px;
	}

	.row-toolbar-label {
		font-size: 12px;
		white-space: nowrap;
	}

	/* Viewport overlay; the path is in viewport coordinates */
	.row-connector {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: var(--fluent-z-dropdown, 1000);
	}

	.row-connector path {
		fill: none;
		stroke: var(--fluent-quickgrid-connector-stroke, var(--accent-fill-rest, var(--fluent-accent-primary)));
		stroke-width: 2;
	}

	.row-connector polygon {
		fill: var(--fluent-quickgrid-connector-stroke, var(--accent-fill-rest, var(--fluent-accent-primary)));
	}
</style>
