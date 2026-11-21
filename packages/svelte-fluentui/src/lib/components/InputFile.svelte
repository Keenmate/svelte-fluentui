<!--
@component
File picker with drag-and-drop, validation, a file list and an upload queue (progress, retry, chunking).

```svelte
<InputFile multiple bind:items maxFileSize={5 * 1024 * 1024} uploadCallback={uploadOne} />
```
-->
<!--
 * InputFile Component
 * Inspired by FluentUI Blazor InputFile component
 * https://www.fluentui-blazor.net/InputFile
 *
 * Internals live in ./inputfile/: upload-queue.svelte.ts (list state machine
 * + upload queue), summary.ts (hints / validity / totals), dom.ts
 * (positioning, folder drop), the selector variants and the list / row /
 * chips / footer / card-content markup components.
-->

<script lang="ts" module>
	// Re-export types/utils for back-compat with any consumer that imports
	// them straight from "./InputFile.svelte". The canonical locations are
	// InputFile.types.ts and InputFile.utils.ts.
	export type {
		InputFileStatus,
		InputFileItem,
		FileUploadChunk,
		FileUploadResult,
		FileUploadHandler,
		InputFileValidationResult,
		InputFileValidator,
		InputFileRejectionMode,
		InputFileDedupeMode,
		InputFileRetryPolicy,
		InputFileSelectorAppearance,
		InputFileListAppearance,
		InputFileCardSize,
		InputFileChipsPosition
	} from "./InputFile.types.js"
	export type {InputFileLabels} from "../i18n/labels.js"
	export {formatInputFileSize} from "./InputFile.utils.js"
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import {untrack} from "svelte"
	import {portal} from "../actions/portal.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {dismissOnOutside} from "../helpers/dismiss.js"
	import InputFileSelectorCard from "./inputfile/InputFileSelectorCard.svelte"
	import InputFileSelectorButton from "./inputfile/InputFileSelectorButton.svelte"
	import InputFileSelectorMinimal from "./inputfile/InputFileSelectorMinimal.svelte"
	import InputFileCardContent from "./inputfile/InputFileCardContent.svelte"
	import InputFileChips from "./inputfile/InputFileChips.svelte"
	import InputFileFooter from "./inputfile/InputFileFooter.svelte"
	import InputFileList from "./inputfile/InputFileList.svelte"
	import {UploadQueue} from "./inputfile/upload-queue.svelte.js"
	import {
		acceptedBytes,
		badgeStatus,
		dropZoneHints as dropZoneHintLines,
		statusLabel,
		validityReasons as validityReasonList
	} from "./inputfile/summary.js"
	import {droppedFiles, positionOverlay, positionPopover} from "./inputfile/dom.js"
	import type {
		InputFileItem,
		InputFileSelectorAppearance,
		InputFileListAppearance,
		InputFileCardSize,
		InputFileChipsPosition,
		InputFileValidator,
		InputFileRejectionMode,
		InputFileDedupeMode,
		InputFileRetryPolicy,
		FileUploadHandler
	} from "./InputFile.types.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {InputFileLabels} from "../i18n/labels.js"

	type Props = {
		/** The file list (status, progress, metadata) — the source of truth. Bindable. */
		items?: InputFileItem[]

		// Selection
		/** Accepted types, as the native `accept` attribute (e.g. "image/*,.pdf"). */
		accept?: string
		/** Allow selecting more than one file. */
		multiple?: boolean
		/** Disable selecting, dropping and pasting. */
		disabled?: boolean
		/** Selector look: `card` (drop zone), `button` or `minimal`. Default: `card`. */
		selectorAppearance?: InputFileSelectorAppearance
		/** File list look: `list`, `chips`, `popover` or `none`. Default: `list`. */
		listAppearance?: InputFileListAppearance
		/** Size of the `card` selector. Default: `medium`. */
		cardSize?: InputFileCardSize
		/** `listAppearance="chips"` only: `end` flows the chips beside the selector, `bottom`
		 * puts them on their own row underneath. Default: `bottom`. */
		chipsPosition?: InputFileChipsPosition

		/** While an external file is dragged over the page, cover the selector (or
		 * `expandOnDragTarget`) with a large portalled drop overlay — no layout shift. */
		expandOnDrag?: boolean
		/** Element (or CSS selector) the `expandOnDrag` overlay covers. Default: the selector. */
		expandOnDragTarget?: HTMLElement | string

		/** Items appended once on mount (one-shot seeding instead of `bind:items`). */
		initialItems?: InputFileItem[]

		// Validation
		/** Max size per file, in bytes; 0 = no limit. Default: 10 MB. */
		maxFileSize?: number
		/** Min size per file, in bytes; 0 = no limit. */
		minFileSize?: number
		/** Max combined size of the accepted files, in bytes; 0 = no limit. */
		totalMaxSize?: number
		/** Max number of files in the list; 0 = no limit. Default: 10. */
		maxFileCount?: number
		/** Min number of files for the list to be valid (see `onValidityChange`). */
		minFileCount?: number
		/** Extra per-file check; return an error message to reject, or nothing to accept. May be async. */
		customValidator?: InputFileValidator
		/** Where rejected files go: `list` (shown as error rows), `callback` (only `onFileError`), `silent`. Default: `list`. */
		rejectionMode?: InputFileRejectionMode
		/** Reject duplicates by `name`, `name-size` or content `hash`; `false` allows them. Default: `false`. */
		dedupe?: InputFileDedupeMode

		// Upload mechanics
		/** Uploads one file (or chunk). Return `{metadata, downloadUrl, …}` to merge into the item. */
		uploadCallback?: FileUploadHandler
		/** Start uploading as soon as files are added (otherwise via "Upload all"). Default: `true`. */
		autoUpload?: boolean
		/** Max parallel uploads. Default: 1. */
		concurrency?: number
		/** Retries for a failed upload: `{attempts, delayMs (default 1000), backoff (default 2)}`. Default: no retry. */
		retryPolicy?: InputFileRetryPolicy
		/** Split files into chunks of this many bytes (each passed to `uploadCallback` as `chunk`). Default: whole file. */
		chunkSize?: number

		// UX
		/** Show image thumbnails in the list. Default: `true`. */
		showThumbnails?: boolean
		/** Accept files pasted from the clipboard. Default: `true`. */
		pasteFromClipboard?: boolean
		/** Accept dropped folders (their files are added recursively). */
		allowFolderDrop?: boolean
		/** Let the user reorder list rows by dragging. */
		allowReorder?: boolean
		/** Show at most this many rows, with a "Show more" toggle. Default: all. */
		maxVisibleFileCount?: number
		/** Max height of the file list before it scrolls (number = px). */
		listMaxHeight?: string | number

		/** Overrides of the built-in text (`svelteFluentUI.inputFile.*` keys) for this instance. */
		labels?: InputFileLabels

		/** Compose the limits hint under the selector. A non-empty result replaces all per-limit
		 * lines (max/min size, max/min files); the accepted-types line is unaffected. */
		formatLimits?: (info: {
			minFileSize: number
			maxFileSize: number
			totalMaxSize: number
			maxFileCount: number
			minFileCount: number
			multiple: boolean
			// Current state of the picker — non-zero whenever items exist (errored
			// items excluded from the size sum, matching the addFiles accept logic).
			// Use these to render a "N of max" or "X MB left" composition.
			currentCount: number
			currentTotalSize: number
		}) => string | null | undefined

		// a11y
		/** Id of the hidden native file input. */
		id?: string
		/** Accessible name of the component (root `role="group"`). */
		"aria-label"?: string
		/** Id(s) of elements describing the component. */
		"aria-describedby"?: string
		/** Id(s) of elements labelling the component. */
		"aria-labelledby"?: string

		// Callbacks
		/** Fires when files pass validation and are added to the list. */
		onFileAdd?: (ctx: {files: InputFileItem[]}) => void
		/** Fires when a file finishes uploading (after `uploadCallback`'s result is merged). */
		onFileUpload?: (ctx: {file: InputFileItem; fileIndex: number}) => void
		/** Fires when a file is rejected (validation, duplicate, limits) or its upload fails. */
		onFileError?: (ctx: {file: InputFileItem; error: string}) => void
		/** Fires when an upload run ends with no file pending or uploading. */
		onUploadComplete?: (ctx: {files: InputFileItem[]}) => void
		/** Fires when the list's validity (limits, min/max files) changes. */
		onValidityChange?: (ctx: {isValid: boolean; reasons: string[]}) => void
		/** Fires when the list of files changes (add, remove, status/progress updates). */
		onChange?: (ctx: {items: InputFileItem[]}) => void
		/**
		 * Fires once per file when it's removed from the list (via removeAt,
		 * removeById, clear, or the row's × button). Receives the removed
		 * file — including its final status and any metadata attached during
		 * upload (e.g. a server guid) — so callers can run cleanup like
		 * `fetch DELETE /api/files/:guid` for files that were already
		 * uploaded but the user changed their mind about before submit.
		 */
		onFileRemove?: (ctx: {file: InputFileItem}) => void

		// Snippets
		/** Replace the selector content; receives `{openFileDialog, isDragging}`. */
		dropZone?: Snippet<[{openFileDialog: () => void; isDragging: boolean}]>
		/** Replace a file row; receives the item and its `remove` / `retry` / `pause` / `resume` / `cancel` actions. */
		fileItem?: Snippet<
			[
				{
					item: InputFileItem
					remove: () => void
					retry: () => Promise<void>
					pause: () => void
					resume: () => Promise<void>
					cancel: () => void
				}
			]
		>
		/** Rendered in the file list area when there are no files (`listAppearance="list"`). */
		empty?: Snippet
		/** Replace the file-list header actions; receives `{clearAll, uploadAll, pauseAll, resumeAll, retryAll}`. */
		actions?: Snippet<
			[
				{
					clearAll: () => void
					uploadAll: () => Promise<void>
					pauseAll: () => void
					resumeAll: () => Promise<void>
					retryAll: () => Promise<void>
				}
			]
		>

		/** Extra class on the root. */
		class?: string
		/** Inline style on the root. */
		style?: string
	}

	let {
		items = $bindable<InputFileItem[]>([]),
		accept = undefined,
		multiple = false,
		disabled = false,
		selectorAppearance = "card",
		listAppearance = "list",
		cardSize = "medium",
		chipsPosition = "bottom",
		expandOnDrag = false,
		expandOnDragTarget = undefined,
		initialItems = undefined,
		maxFileSize = 10 * 1024 * 1024,
		minFileSize = 0,
		totalMaxSize = 0,
		maxFileCount = 10,
		minFileCount = 0,
		customValidator = undefined,
		rejectionMode = "list",
		dedupe = false,
		uploadCallback = undefined,
		autoUpload = true,
		concurrency = 1,
		retryPolicy = undefined,
		chunkSize = undefined,
		showThumbnails = true,
		pasteFromClipboard = true,
		allowFolderDrop = false,
		allowReorder = false,
		maxVisibleFileCount = undefined,
		listMaxHeight = undefined,
		labels: labelsProp = undefined,
		formatLimits = undefined,
		id = undefined,
		"aria-label": ariaLabel = undefined,
		"aria-describedby": ariaDescribedBy = undefined,
		"aria-labelledby": ariaLabelledBy = undefined,
		onFileAdd = undefined,
		onFileUpload = undefined,
		onFileError = undefined,
		onUploadComplete = undefined,
		onValidityChange = undefined,
		onChange = undefined,
		onFileRemove = undefined,
		dropZone = undefined,
		fileItem = undefined,
		empty = undefined,
		actions = undefined,
		class: className = "",
		style = ""
	}: Props = $props()

	const t = useTranslations("inputFile", () => labelsProp)
	// Bytes already accepted toward the totalMaxSize cap. Mirrors the
	// `runningTotal` seed inside addFiles() — errored items don't count since
	// they won't upload, so the "remaining" hint matches what the next add
	// will actually be permitted.
	const currentTotalSize = $derived(acceptedBytes(items))
	const limitsHint = $derived(
		formatLimits?.({
			minFileSize,
			maxFileSize,
			totalMaxSize,
			maxFileCount,
			minFileCount,
			multiple,
			currentCount: items.length,
			currentTotalSize
		}) ?? null
	)
	const dropZoneHints = $derived(
		dropZoneHintLines(
			t,
			{accept, minFileSize, maxFileSize, totalMaxSize, maxFileCount, minFileCount, multiple},
			limitsHint,
			items.length,
			currentTotalSize
		)
	)

	let fileInput: HTMLInputElement | undefined = $state()
	let isDragging = $state(false)
	let showAllList = $state(false)
	let popoverOpen = $state(false)
	let rootEl: HTMLDivElement | undefined = $state()
	let selectorWrapEl: HTMLDivElement | undefined = $state()
	let popoverEl: HTMLDivElement | undefined = $state()
	let isExternalDragActive = $state(false)

	function resolveExpandTarget(): HTMLElement | undefined {
		if (!expandOnDragTarget) return selectorWrapEl
		if (typeof expandOnDragTarget === "string") {
			return (document.querySelector(expandOnDragTarget) as HTMLElement | null) ?? undefined
		}
		return expandOnDragTarget
	}

	// File list state machine + upload queue (inputfile/upload-queue.svelte.ts).
	const queue = new UploadQueue({
		get items() {
			return items
		},
		set items(value) {
			items = value
		},
		t,
		get accept() {
			return accept
		},
		get multiple() {
			return multiple
		},
		get disabled() {
			return disabled
		},
		get maxFileSize() {
			return maxFileSize
		},
		get minFileSize() {
			return minFileSize
		},
		get totalMaxSize() {
			return totalMaxSize
		},
		get maxFileCount() {
			return maxFileCount
		},
		get customValidator() {
			return customValidator
		},
		get rejectionMode() {
			return rejectionMode
		},
		get dedupe() {
			return dedupe
		},
		get uploadCallback() {
			return uploadCallback
		},
		get autoUpload() {
			return autoUpload
		},
		get concurrency() {
			return concurrency
		},
		get retryPolicy() {
			return retryPolicy
		},
		get chunkSize() {
			return chunkSize
		},
		get showThumbnails() {
			return showThumbnails
		},
		get onFileAdd() {
			return onFileAdd
		},
		get onFileUpload() {
			return onFileUpload
		},
		get onFileError() {
			return onFileError
		},
		get onUploadComplete() {
			return onUploadComplete
		},
		get onFileRemove() {
			return onFileRemove
		}
	})

	// One-shot seed at construction; later changes to initialItems are ignored
	// (use bind:items for reactive control).
	untrack(() => {
		if (initialItems && initialItems.length > 0) {
			items = [...items, ...initialItems]
		}
	})

	// Skip the initial run: onChange reports changes, not the starting list.
	let itemsInitialized = false
	$effect(() => {
		const snapshot = items
		if (!itemsInitialized) {
			itemsInitialized = true
			return
		}
		untrack(() => onChange?.({items: snapshot}))
	})

	const visibleItems = $derived(
		maxVisibleFileCount == null || showAllList ? items : items.slice(0, maxVisibleFileCount)
	)
	const hiddenCount = $derived(items.length - visibleItems.length)
	const canCollapse = $derived(showAllList && maxVisibleFileCount != null && items.length > maxVisibleFileCount)
	const listMaxHeightCss = $derived(
		listMaxHeight == null ? null : typeof listMaxHeight === "number" ? `${listMaxHeight}px` : listMaxHeight
	)
	const minimalBadgeStatus = $derived(badgeStatus(items))

	// expandOnDrag: a file drag entering the page shows the drop overlay. Only
	// the card selector renders the overlay, so other selectors don't listen.
	$effect(() => {
		if (!expandOnDrag || disabled || selectorAppearance !== "card") return
		const onDragEnter = (e: DragEvent) => {
			if (!e.dataTransfer?.types?.includes("Files")) return
			isExternalDragActive = true
		}
		document.addEventListener("dragenter", onDragEnter)
		return () => document.removeEventListener("dragenter", onDragEnter)
	})

	// While a file drag is over the page: listen for its end so the overlay goes away.
	$effect(() => {
		if (!isExternalDragActive) return
		// Dismiss when the cursor leaves the viewport entirely. Browsers signal
		// this with relatedTarget === null; Chrome also fires a final dragleave
		// at clientX/Y 0,0 when the drag is cancelled via Esc on the OS side.
		const onDragLeave = (e: DragEvent) => {
			if (e.relatedTarget) return
			isExternalDragActive = false
			isDragging = false
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				isExternalDragActive = false
				isDragging = false
			}
		}
		const dismiss = () => {
			isExternalDragActive = false
		}
		document.addEventListener("dragleave", onDragLeave)
		document.addEventListener("dragend", dismiss)
		document.addEventListener("drop", dismiss)
		document.addEventListener("keydown", onKeyDown)
		window.addEventListener("blur", dismiss)
		return () => {
			document.removeEventListener("dragleave", onDragLeave)
			document.removeEventListener("dragend", dismiss)
			document.removeEventListener("drop", dismiss)
			document.removeEventListener("keydown", onKeyDown)
			window.removeEventListener("blur", dismiss)
		}
	})

	// Popover: close on outside press / focus and on Escape. It follows its
	// anchor (autoUpdate), so outside scrolls don't close it. The component root
	// counts as inside (it holds the trigger and the hidden file input).
	$effect(() => {
		if (!popoverOpen) return
		const close = () => {
			popoverOpen = false
		}
		const undismiss = dismissOnOutside(() => [rootEl, selectorWrapEl, popoverEl], close)
		// Escape goes to the topmost open layer (helpers/layer-stack.ts)
		const popLayer = pushLayer({onEscape: close})
		return () => {
			undismiss()
			popLayer()
		}
	})

	const validityReasons = $derived(validityReasonList(t, items, minFileCount, maxFileCount))
	const isValid = $derived(validityReasons.length === 0)

	$effect(() => {
		const v = isValid
		const r = validityReasons
		untrack(() => onValidityChange?.({isValid: v, reasons: r}))
	})

	// Instance API (bind:this) — delegates to the upload queue.
	export function addFiles(files: File[]) {
		return queue.addFiles(files)
	}
	export function uploadAll() {
		return queue.uploadAll()
	}
	export function retry(itemId: string) {
		return queue.retry(itemId)
	}
	export function pause(itemId: string) {
		queue.pause(itemId)
	}
	export function resume(itemId: string) {
		return queue.resume(itemId)
	}
	export function cancel(itemId: string) {
		queue.cancel(itemId)
	}
	export function pauseAll() {
		queue.pauseAll()
	}
	export function resumeAll() {
		return queue.resumeAll()
	}
	export function retryAll() {
		return queue.retryAll()
	}
	export function removeAt(index: number) {
		queue.removeAt(index)
	}
	export function removeById(itemId: string) {
		queue.removeById(itemId)
	}

	export function clear() {
		queue.clear(() => {
			if (fileInput) fileInput.value = ""
		})
	}

	export function reset() {
		clear()
	}

	export function getItems(): InputFileItem[] {
		return items
	}

	export function openPicker() {
		openFileDialog()
	}

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement
		const fileList = target.files
		if (fileList) addFiles(Array.from(fileList))
		target.value = ""
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault()
		if (!disabled) isDragging = true
	}
	function handleDragOver(event: DragEvent) {
		event.preventDefault()
	}
	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		if (event.target === event.currentTarget) isDragging = false
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault()
		isDragging = false
		if (disabled) return
		const files = await droppedFiles(event.dataTransfer, allowFolderDrop)
		if (files) await addFiles(files)
	}

	let __lastDialogOpenAt = 0
	function openFileDialog() {
		if (disabled) return
		const now = performance.now()
		// Guard against the dialog being opened twice in quick succession
		// (e.g. when a click target both triggers `openFileDialog` and
		// bubbles to a parent that does the same).
		if (now - __lastDialogOpenAt < 250) return
		__lastDialogOpenAt = now
		fileInput?.click()
	}

	function handleSelectorClick() {
		// Minimal + popover (the legacy "minimal" preset): click toggles popover when
		// files exist, opens picker when empty.
		if (selectorAppearance === "minimal" && listAppearance === "popover" && items.length > 0) {
			popoverOpen = !popoverOpen
			return
		}
		openFileDialog()
	}

	function handlePaste(event: ClipboardEvent) {
		if (!pasteFromClipboard || disabled) return
		const files = Array.from(event.clipboardData?.files ?? [])
		if (files.length) {
			event.preventDefault()
			addFiles(files)
		}
	}

	function handleDropZoneKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault()
			openFileDialog()
		}
	}

	const setShowAll = (value: boolean) => (showAllList = value)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={rootEl}
	class="fluent-inputfile fluent-inputfile--selector-{selectorAppearance} fluent-inputfile--list-{listAppearance} {className}"
	class:disabled
	class:has-files={items.length > 0}
	{style}
	aria-label={ariaLabel}
	aria-describedby={ariaDescribedBy}
	aria-labelledby={ariaLabelledBy}
	onpaste={handlePaste}
	role="group"
>
	<input
		bind:this={fileInput}
		{id}
		type="file"
		{accept}
		{multiple}
		{disabled}
		onchange={handleInputChange}
		class="fluent-inputfile__input"
		tabindex="-1"
		aria-hidden="true"
	/>

	{#snippet cardContent()}
		<InputFileCardContent {t} {isDragging} {disabled} hints={dropZoneHints} onBrowse={openFileDialog} />
	{/snippet}

	{#snippet selectorBlock()}
		{#if dropZone}
			{@render dropZone({openFileDialog, isDragging})}
		{:else if selectorAppearance === "card"}
			<InputFileSelectorCard
				{cardSize}
				{isDragging}
				{disabled}
				popoverExpanded={listAppearance === "popover" && items.length > 0 ? popoverOpen : undefined}
				ariaLabel={t("browseAriaLabel")}
				ondragenter={handleDragEnter}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={handleSelectorClick}
				onkeydown={handleDropZoneKeyDown}
				content={cardContent}
			/>
		{:else if selectorAppearance === "button"}
			<InputFileSelectorButton {disabled} label={t("selectFiles")} onclick={handleSelectorClick} />
		{:else if selectorAppearance === "minimal"}
			<InputFileSelectorMinimal
				{disabled}
				itemsLength={items.length}
				popoverExpanded={listAppearance === "popover" && items.length > 0 ? popoverOpen : undefined}
				ariaLabel={items.length > 0 ? t("viewFilesAriaLabel") : t("browseAriaLabel")}
				title={items.length > 0
					? `${t("fileCount", {count: items.length})} — ${statusLabel(t, minimalBadgeStatus)}`
					: t("browseTooltip")}
				badgeStatus={minimalBadgeStatus}
				onclick={(e) => {
					e.stopPropagation()
					handleSelectorClick()
				}}
			/>
		{/if}
	{/snippet}

	{#snippet overallFooter()}
		{#if uploadCallback && items.length > 0}
			<InputFileFooter {items} {t} onPauseAll={pauseAll} onResumeAll={resumeAll} onRetryAll={retryAll} />
		{/if}
	{/snippet}

	{#if listAppearance === "chips" && items.length > 0}
		<!-- chips-row only renders when there are items to show. With zero items,
		     fall through to the plain selector-wrap so the card stays at its
		     natural block width and its inner text changes (e.g. "Drop files
		     here" during drag) don't reflow the wrapper. -->
		<div
			class="chips-row"
			class:dragging={isDragging}
			data-chips-position={chipsPosition}
			bind:this={selectorWrapEl}
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			{@render selectorBlock()}
			<div class="chips-wrap">
				<InputFileChips {visibleItems} {hiddenCount} {canCollapse} {t} onRemove={removeById} onShowAll={setShowAll} />
			</div>
		</div>
		{@render overallFooter()}
	{:else}
		<div class="fluent-inputfile__selector-wrap" bind:this={selectorWrapEl}>
			{@render selectorBlock()}
		</div>
	{/if}

	{#snippet fileListPanel(inPopover: boolean)}
		<InputFileList
			{inPopover}
			{items}
			{visibleItems}
			{hiddenCount}
			{canCollapse}
			{queue}
			{t}
			{disabled}
			canUpload={!!uploadCallback}
			{autoUpload}
			{allowReorder}
			{dropZoneHints}
			{listMaxHeightCss}
			{fileItem}
			{actions}
			footer={overallFooter}
			onAddMore={openFileDialog}
			onClear={clear}
			onShowAll={setShowAll}
		/>
	{/snippet}

	{#if listAppearance === "list"}
		{#if items.length > 0}
			{@render fileListPanel(false)}
		{:else if empty}
			{@render empty()}
		{/if}
	{:else if listAppearance === "popover" && popoverOpen && items.length > 0 && selectorWrapEl}
		<!-- The .fluent-inputfile wrapper restores the CSS scope for the portal'd
		     popover. Component styles are nested under `.fluent-inputfile X`, so
		     descendants of the popover only match if the popover sits inside a
		     .fluent-inputfile root. We portal the wrapper (rather than the popover
		     itself) and let positionPopover place the inner element. -->
		<div class="fluent-inputfile" use:portal>
			<div
				bind:this={popoverEl}
				use:positionPopover={selectorWrapEl}
				class="minimal-popover"
				aria-label={t("viewFilesAriaLabel")}
			>
				{@render fileListPanel(true)}
			</div>
		</div>
	{/if}

	{#if expandOnDrag && isExternalDragActive && selectorAppearance === "card" && !disabled}
		{@const overlayAnchor = resolveExpandTarget() ?? selectorWrapEl}
		{#if overlayAnchor}
			<!-- See popover note above — the .fluent-inputfile wrapper restores
			     the CSS scope for the portal'd overlay's nested rules. -->
			<div class="fluent-inputfile" use:portal>
				<div
					use:positionOverlay={overlayAnchor}
					class="drop-zone drop-zone--large drag-overlay"
					class:dragging={isDragging}
					ondragenter={handleDragEnter}
					ondragover={handleDragOver}
					ondragleave={(e) => {
						// `target === currentTarget` is true even when the cursor moves
						// from the overlay's padding into a descendant (dragleave fires
						// like mouseout). Use relatedTarget containment instead so the
						// overlay only clears its drag-highlight when the cursor really
						// leaves the overlay subtree. Don't toggle isExternalDragActive
						// here — document-level handlers own that lifecycle.
						const overlay = e.currentTarget as HTMLElement
						const related = e.relatedTarget as Node | null
						if (!related || !overlay.contains(related)) {
							isDragging = false
						}
					}}
					ondrop={(e) => {
						handleDrop(e)
						isExternalDragActive = false
					}}
					role="presentation"
				>
					{@render cardContent()}
				</div>
			</div>
		{/if}
	{/if}

	<div class="sr-only" aria-live="polite" role="status">{queue.liveAnnouncement}</div>
</div>
