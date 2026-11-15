<!-- Internal (InputFile): default file row — thumbnail / icon, name + size, status or progress, per-row actions. Not exported from the package. -->

<script lang="ts">
	import DismissIcon from "../icons/DismissIcon.svelte"
	import type {InputFileItem, InputFileLabels} from "../InputFile.types.js"
	import {formatInputFileSize, iconCategory} from "../InputFile.utils.js"
	import {statusLabel} from "./summary.js"
	import type {UploadQueue} from "./upload-queue.svelte.js"

	type Props = {
		item: InputFileItem
		index: number
		queue: UploadQueue
		labels: InputFileLabels
		disabled: boolean
		/** Whether an `uploadCallback` is set (retry needs one). */
		canUpload: boolean
		allowReorder: boolean
		dragging: boolean
		dragOver: boolean
		ondragstart: (event: DragEvent) => void
		ondragover: (event: DragEvent) => void
		ondrop: (event: DragEvent) => void
		ondragend: () => void
	}

	let {
		item,
		index,
		queue,
		labels,
		disabled,
		canUpload,
		allowReorder,
		dragging,
		dragOver,
		ondragstart,
		ondragover,
		ondrop,
		ondragend
	}: Props = $props()

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault()
			queue.removeAt(index)
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="file-item"
	class:error={item.status === "error"}
	class:completed={item.status === "completed"}
	class:dragging
	class:drag-over={dragOver}
	tabindex="0"
	role="listitem"
	aria-label="{item.name}, {statusLabel(labels, item.status)}"
	onkeydown={handleKeyDown}
	draggable={allowReorder}
	{ondragstart}
	{ondragover}
	{ondrop}
	{ondragend}
>
	{#if item.thumbnailUrl}
		<img class="file-thumb" src={item.thumbnailUrl} alt="" />
	{:else}
		<div class="file-icon" data-category={iconCategory(item)} aria-hidden="true">
			<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor">
				<path
					d="M19 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V9l-7-7zm0 7V3.5L24.5 9H19z"
				/>
			</svg>
		</div>
	{/if}

	<div class="file-info">
		<div class="file-header">
			<span class="file-name" title={item.name}>{item.name}</span>
			<span class="file-size">{formatInputFileSize(item.size)}</span>
		</div>

		{#if item.status === "uploading" || item.status === "paused"}
			<div
				class="progress-bar"
				role="progressbar"
				aria-valuenow={item.progress}
				aria-valuemin="0"
				aria-valuemax="100"
			>
				<div class="progress-fill" style="width: {item.progress}%"></div>
			</div>
			<span class="status-text">
				{item.progress}% — {item.status === "paused"
					? labels.paused
					: labels.uploading}
			</span>
		{:else if item.status === "completed"}
			<span class="status-text success">✓ {labels.completed}</span>
		{:else if item.status === "error"}
			<span class="status-text error">✗ {item.error ?? labels.error}</span>
		{:else if item.status === "cancelled"}
			<span class="status-text muted">⊘ {labels.cancelled}</span>
		{:else}
			<span class="status-text muted">{labels.pending}</span>
		{/if}
	</div>

	<div class="file-actions">
		{#if item.downloadUrl && item.status === "completed"}
			<a
				class="action-button"
				href={item.downloadUrl}
				download={item.name}
				aria-label={labels.download}
			>
				↓
			</a>
		{/if}
		{#if item.status === "uploading"}
			<button
				type="button"
				class="action-button"
				onclick={() => queue.pause(item.id)}
				aria-label={labels.pause}
			>
				‖
			</button>
			<button
				type="button"
				class="action-button"
				onclick={() => queue.cancel(item.id)}
				aria-label={labels.cancel}
			>
				<DismissIcon size={14} />
			</button>
		{:else if item.status === "paused"}
			<button
				type="button"
				class="action-button"
				onclick={() => queue.resume(item.id)}
				aria-label={labels.resume}
			>
				▶
			</button>
		{:else if (item.status === "error" || item.status === "cancelled") && item.file && canUpload}
			<button
				type="button"
				class="action-button"
				onclick={() => queue.retry(item.id)}
				aria-label={labels.retry}
			>
				↻
			</button>
		{/if}
		<button
			type="button"
			class="remove-button"
			onclick={() => queue.removeAt(index)}
			{disabled}
			aria-label={labels.remove}
		>
			<DismissIcon size={16} />
		</button>
	</div>
</div>
