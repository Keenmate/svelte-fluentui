<!-- Internal (InputFile): file list panel (inline list or popover body) — header + actions, rows with drag reorder, show more / less, footer. Not exported from the package. -->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {InputFileItem, InputFileLabels} from "../InputFile.types.js"
	import InputFileRow from "./InputFileRow.svelte"
	import type {InputFileRowApi, UploadQueue} from "./upload-queue.svelte.js"

	type Props = {
		/** Rendered inside the popover: adds "+ Add more" and the limits line. */
		inPopover: boolean
		items: InputFileItem[]
		visibleItems: InputFileItem[]
		hiddenCount: number
		/** True when the list is expanded past `maxVisibleFileCount` and can collapse again. */
		canCollapse: boolean
		queue: UploadQueue
		labels: InputFileLabels
		disabled: boolean
		/** Whether an `uploadCallback` is set. */
		canUpload: boolean
		autoUpload: boolean
		allowReorder: boolean
		dropZoneHints: string[]
		listMaxHeightCss: string | null
		fileItem?: Snippet<[InputFileRowApi]>
		actions?: Snippet<[{
			clearAll: () => void
			uploadAll: () => Promise<void>
			pauseAll: () => void
			resumeAll: () => Promise<void>
			retryAll: () => Promise<void>
		}]>
		footer: Snippet
		onAddMore: () => void
		onClear: () => void
		onShowAll: (showAll: boolean) => void
	}

	let {
		inPopover,
		items,
		visibleItems,
		hiddenCount,
		canCollapse,
		queue,
		labels,
		disabled,
		canUpload,
		autoUpload,
		allowReorder,
		dropZoneHints,
		listMaxHeightCss,
		fileItem = undefined,
		actions = undefined,
		footer,
		onAddMore,
		onClear,
		onShowAll
	}: Props = $props()

	const uploadAll = () => queue.uploadAll()
	const pauseAll = () => queue.pauseAll()
	const resumeAll = () => queue.resumeAll()
	const retryAll = () => queue.retryAll()

	// Drag reorder (allowReorder): source row index and the row currently hovered.
	let dragOverIndex = $state<number | null>(null)
	let draggedIndex = $state<number | null>(null)

	function onRowDragStart(event: DragEvent, index: number) {
		if (!allowReorder) return
		draggedIndex = index
		event.dataTransfer?.setData("text/plain", String(index))
	}
	function onRowDragOver(event: DragEvent, index: number) {
		if (!allowReorder || draggedIndex === null) return
		event.preventDefault()
		dragOverIndex = index
	}
	function onRowDrop(event: DragEvent, index: number) {
		if (!allowReorder || draggedIndex === null) return
		event.preventDefault()
		queue.move(draggedIndex, index)
		draggedIndex = null
		dragOverIndex = null
	}
	function onRowDragEnd() {
		draggedIndex = null
		dragOverIndex = null
	}
</script>

<div class="file-list">
	<div class="file-list-sticky">
	<div class="file-list-header">
		<span class="file-count">{labels.fileCount(items.length)}</span>
		{#if actions}
			{@render actions({clearAll: onClear, uploadAll, pauseAll, resumeAll, retryAll})}
		{:else}
			<div class="file-list-actions">
				{#if inPopover}
					<button
						type="button"
						class="text-button"
						onclick={(e) => {
							e.stopPropagation()
							onAddMore()
						}}
						{disabled}
					>
						{labels.addMore}
					</button>
				{/if}
				{#if canUpload && !autoUpload && items.some((i) => i.status === "pending")}
					<button type="button" class="text-button" onclick={uploadAll} {disabled}>
						{labels.uploadAll}
					</button>
				{/if}
				<button type="button" class="text-button" onclick={onClear} {disabled}>
					{labels.clearAll}
				</button>
			</div>
		{/if}
	</div>

	{#if inPopover && dropZoneHints.length > 0}
		<div class="file-list-limits">{dropZoneHints.join(" · ")}</div>
	{/if}
	</div>

	<div
		class="file-list-rows"
		class:scrollable={listMaxHeightCss != null}
		style:max-height={listMaxHeightCss}
	>
		{#each visibleItems as item, index (item.id)}
			{#if fileItem}
				{@render fileItem(queue.rowApi(item))}
			{:else}
				<InputFileRow
					{item}
					{index}
					{queue}
					{labels}
					{disabled}
					{canUpload}
					{allowReorder}
					dragging={draggedIndex === index}
					dragOver={dragOverIndex === index && draggedIndex !== index}
					ondragstart={(e) => onRowDragStart(e, index)}
					ondragover={(e) => onRowDragOver(e, index)}
					ondrop={(e) => onRowDrop(e, index)}
					ondragend={onRowDragEnd}
				/>
			{/if}
		{/each}

		{#if hiddenCount > 0}
			<button
				type="button"
				class="show-more-toggle"
				onclick={() => onShowAll(true)}
			>
				{labels.showMore(hiddenCount)}
			</button>
		{:else if canCollapse}
			<button
				type="button"
				class="show-more-toggle"
				onclick={() => onShowAll(false)}
			>
				{labels.showLess}
			</button>
		{/if}
	</div>

	{@render footer()}
</div>
