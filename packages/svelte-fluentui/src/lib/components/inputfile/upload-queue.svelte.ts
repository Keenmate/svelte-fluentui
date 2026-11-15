// Internal (InputFile): file list state machine — add / validate / dedupe, upload queue (concurrency, chunks, retry), pause / resume / cancel, remove. Not exported from the package.

import type {
	FileUploadHandler,
	FileUploadResult,
	InputFileDedupeMode,
	InputFileItem,
	InputFileLabels,
	InputFileRejectionMode,
	InputFileRetryPolicy,
	InputFileStatus,
	InputFileValidator
} from "../InputFile.types.js"
import {clampPercent, formatInputFileSize, genId, hashFile, isAcceptedType} from "../InputFile.utils.js"

/** Live view of the InputFile state and props the queue works on (getters over `$props()`). */
export type UploadQueueHost = {
	/** The bindable `items` prop — read and reassigned through this accessor. */
	items: InputFileItem[]
	readonly labels: InputFileLabels
	readonly accept: string | undefined
	readonly multiple: boolean
	readonly disabled: boolean
	readonly maxFileSize: number
	readonly minFileSize: number
	readonly totalMaxSize: number
	readonly maxFileCount: number
	readonly customValidator: InputFileValidator | undefined
	readonly rejectionMode: InputFileRejectionMode
	readonly dedupe: InputFileDedupeMode
	readonly uploadCallback: FileUploadHandler | undefined
	readonly autoUpload: boolean
	readonly concurrency: number
	readonly retryPolicy: InputFileRetryPolicy | undefined
	readonly chunkSize: number | undefined
	readonly showThumbnails: boolean
	readonly onFileAdd: ((ctx: {files: InputFileItem[]}) => void) | undefined
	readonly onFileUpload: ((ctx: {file: InputFileItem; fileIndex: number}) => void) | undefined
	readonly onFileError: ((ctx: {file: InputFileItem; error: string}) => void) | undefined
	readonly onUploadComplete: ((ctx: {files: InputFileItem[]}) => void) | undefined
	readonly onFileRemove: ((ctx: {file: InputFileItem}) => void) | undefined
}

/** Per-row actions handed to the `fileItem` snippet. */
export type InputFileRowApi = {
	item: InputFileItem
	remove: () => void
	retry: () => Promise<void>
	pause: () => void
	resume: () => Promise<void>
	cancel: () => void
}

export class UploadQueue {
	/** Screen-reader announcement for the last finished / failed upload. */
	liveAnnouncement = $state("")

	private readonly controllers = new Map<string, AbortController>()
	private readonly pausedSet = new Set<string>()
	private readonly hashCache = new WeakMap<File, string>()

	constructor(private readonly host: UploadQueueHost) {}

	private get items(): InputFileItem[] { return this.host.items }
	private set items(value: InputFileItem[]) { this.host.items = value }

	private thumbnailFor(file: File | null): string | null {
		if (!file || !file.type.startsWith("image/") || !this.host.showThumbnails) return null
		try {
			return URL.createObjectURL(file)
		} catch {
			return null
		}
	}

	private revokeThumbnail(item: InputFileItem) {
		if (item.thumbnailUrl?.startsWith("blob:")) {
			try {
				URL.revokeObjectURL(item.thumbnailUrl)
			} catch {
				/* ignore */
			}
		}
	}

	private async validateFile(file: File): Promise<string | null> {
		const {labels, maxFileSize, minFileSize, accept, customValidator} = this.host
		if (maxFileSize && file.size > maxFileSize)
			return labels.fileTooLarge(formatInputFileSize(maxFileSize))
		if (minFileSize && file.size < minFileSize)
			return labels.fileTooSmall(formatInputFileSize(minFileSize))
		if (!isAcceptedType(file, accept)) return labels.fileTypeNotAccepted(accept ?? "")
		if (customValidator) {
			const r = await customValidator(file)
			if (r) return r
		}
		return null
	}

	private async isDuplicate(file: File): Promise<boolean> {
		const dedupe = this.host.dedupe
		if (!dedupe) return false
		if (dedupe === "name") return this.items.some((i) => i.name === file.name)
		if (dedupe === "name-size")
			return this.items.some((i) => i.name === file.name && i.size === file.size)
		if (dedupe === "hash") {
			let h = this.hashCache.get(file)
			if (!h) {
				h = await hashFile(file)
				this.hashCache.set(file, h)
			}
			for (const i of this.items) {
				if (!i.file) continue
				let ih = this.hashCache.get(i.file)
				if (!ih) {
					ih = await hashFile(i.file)
					this.hashCache.set(i.file, ih)
				}
				if (ih === h) return true
			}
		}
		return false
	}

	private emitRejection(file: File, reason: string) {
		const rejectionMode = this.host.rejectionMode
		if (rejectionMode === "silent") return
		const item: InputFileItem = {
			id: genId(),
			file,
			name: file.name,
			size: file.size,
			type: file.type,
			progress: 0,
			status: "error",
			error: reason,
			// Only a listed rejection gets a thumbnail (object URLs need revoking).
			thumbnailUrl: rejectionMode === "list" ? this.thumbnailFor(file) : null
		}
		// "list" shows the rejected file as an error row; "callback" only reports it.
		if (rejectionMode === "list") this.items = [...this.items, item]
		this.host.onFileError?.({file: item, error: reason})
	}

	async addFiles(files: File[]) {
		const host = this.host
		if (host.disabled || !files.length) return
		const incoming = host.multiple ? [...files] : files.slice(0, 1)

		if (host.maxFileCount && this.items.length + incoming.length > host.maxFileCount) {
			const room = Math.max(0, host.maxFileCount - this.items.length)
			const overflow = incoming.slice(room)
			for (const f of overflow) this.emitRejection(f, host.labels.tooManyFiles(host.maxFileCount))
			incoming.length = room
			if (incoming.length === 0) return
		}

		let runningTotal = host.totalMaxSize > 0
			? this.items.reduce((sum, i) => (i.status === "error" ? sum : sum + i.size), 0)
			: 0

		const accepted: InputFileItem[] = []
		for (const file of incoming) {
			if (await this.isDuplicate(file)) {
				this.emitRejection(file, host.labels.duplicate)
				continue
			}
			const err = await this.validateFile(file)
			if (err) {
				this.emitRejection(file, err)
				continue
			}
			if (host.totalMaxSize > 0 && runningTotal + file.size > host.totalMaxSize) {
				this.emitRejection(file, host.labels.totalSizeExceeded(formatInputFileSize(host.totalMaxSize)))
				continue
			}
			runningTotal += file.size
			accepted.push({
				id: genId(),
				file,
				name: file.name,
				size: file.size,
				type: file.type,
				progress: 0,
				status: "pending",
				error: null,
				thumbnailUrl: this.thumbnailFor(file)
			})
		}

		if (accepted.length > 0) {
			this.items = [...this.items, ...accepted]
			host.onFileAdd?.({files: accepted})
		}

		if (host.autoUpload && host.uploadCallback && accepted.length > 0) {
			await this.uploadAll()
		}
	}

	private patchItem(itemId: string, patch: Partial<InputFileItem>) {
		const items = this.items
		const idx = items.findIndex((i) => i.id === itemId)
		if (idx === -1) return
		items[idx] = {...items[idx], ...patch}
		this.items = [...items]
	}

	private async uploadOne(itemId: string, attempt = 0): Promise<void> {
		const uploadCallback = this.host.uploadCallback
		const item = this.items.find((i) => i.id === itemId)
		if (!item || !item.file || !uploadCallback) return
		if (this.pausedSet.has(itemId)) return

		const ctrl = new AbortController()
		this.controllers.set(itemId, ctrl)
		this.patchItem(itemId, {status: "uploading", progress: 0, error: null})

		try {
			let serverPatch: FileUploadResult | undefined
			const chunkSize = this.host.chunkSize
			if (chunkSize && chunkSize > 0 && item.file.size > chunkSize) {
				serverPatch = await this.uploadInChunks(item, ctrl.signal)
			} else {
				const res = await uploadCallback({
					file: item,
					signal: ctrl.signal,
					reportProgress: (p) => this.patchItem(itemId, {progress: clampPercent(p)})
				})
				if (res) serverPatch = res
			}
			// Merging the handler's return value here (rather than asking the
			// consumer to wire onFileUpload + a WeakMap) lets the handler do
			// `return {metadata: {serverGuid}}` and have it land on the item
			// atomically with the "completed" status flip.
			this.patchItem(itemId, {status: "completed", progress: 100, ...(serverPatch ?? {})})
			const fileIndex = this.items.findIndex((i) => i.id === itemId)
			const updated = this.items[fileIndex]
			if (updated && updated.file) {
				this.host.onFileUpload?.({file: updated, fileIndex})
				this.liveAnnouncement = this.host.labels.uploadedAnnouncement(updated.name)
			}
		} catch (err) {
			if (ctrl.signal.aborted) {
				if (this.pausedSet.has(itemId)) this.patchItem(itemId, {status: "paused"})
				else this.patchItem(itemId, {status: "cancelled"})
				return
			}
			const msg = err instanceof Error ? err.message : "Upload failed"
			const policy = this.host.retryPolicy ?? {}
			const maxAttempts = Math.max(1, policy.attempts ?? 1)
			if (attempt + 1 < maxAttempts) {
				const delay = (policy.delayMs ?? 1000) * Math.pow(policy.backoff ?? 2, attempt)
				await new Promise((r) => setTimeout(r, delay))
				if (this.pausedSet.has(itemId) || !this.items.find((i) => i.id === itemId)) return
				return this.uploadOne(itemId, attempt + 1)
			}
			this.patchItem(itemId, {status: "error", error: msg})
			const failed = this.items.find((i) => i.id === itemId)
			if (failed) {
				this.host.onFileError?.({file: failed, error: msg})
				this.liveAnnouncement = this.host.labels.failedAnnouncement(failed.name, msg)
			}
		} finally {
			this.controllers.delete(itemId)
		}
	}

	private async uploadInChunks(
		item: InputFileItem,
		signal: AbortSignal
	): Promise<FileUploadResult | undefined> {
		const host = this.host
		if (!item.file || !host.uploadCallback || !host.chunkSize) return
		const file = item.file
		const total = file.size
		let offset = 0
		// Only the final chunk typically has the assembled server response
		// (guid, downloadUrl, etc.). Keep the last non-empty return so callers
		// can also opt to return it from an earlier chunk if their protocol
		// assigns the id up-front.
		let lastResult: FileUploadResult | undefined
		while (offset < total) {
			if (signal.aborted) throw new DOMException("Aborted", "AbortError")
			const end = Math.min(offset + host.chunkSize!, total)
			const data = file.slice(offset, end)
			const chunkOffset = offset
			const res = await host.uploadCallback!({
				file: item,
				signal,
				reportProgress: (p) => {
					const overallBytes = chunkOffset + ((end - chunkOffset) * p) / 100
					this.patchItem(item.id, {progress: clampPercent((overallBytes / total) * 100)})
				},
				chunk: {offset: chunkOffset, size: end - chunkOffset, total, data}
			})
			if (res) lastResult = res
			offset = end
		}
		return lastResult
	}

	async uploadAll() {
		if (!this.host.uploadCallback) return
		const queue = this.items.filter((i) => i.status === "pending" && i.file).map((i) => i.id)
		let cursor = 0
		const worker = async () => {
			while (cursor < queue.length) {
				const id = queue[cursor++]
				if (this.pausedSet.has(id)) continue
				await this.uploadOne(id)
			}
		}
		await Promise.all(Array.from({length: Math.max(1, this.host.concurrency)}, worker))
		const allDone = this.items.every(
			(i) => i.status !== "pending" && i.status !== "uploading"
		)
		if (allDone) this.host.onUploadComplete?.({files: this.items})
	}

	async retry(itemId: string) {
		this.pausedSet.delete(itemId)
		this.patchItem(itemId, {status: "pending", progress: 0, error: null})
		await this.uploadOne(itemId)
	}

	pause(itemId: string) {
		this.pausedSet.add(itemId)
		const ctrl = this.controllers.get(itemId)
		if (ctrl) ctrl.abort()
		else this.patchItem(itemId, {status: "paused"})
	}

	async resume(itemId: string) {
		this.pausedSet.delete(itemId)
		const item = this.items.find((i) => i.id === itemId)
		if (!item) return
		if (item.status === "paused" || item.status === "cancelled") {
			this.patchItem(itemId, {status: "pending", progress: 0, error: null})
			await this.uploadOne(itemId)
		}
	}

	cancel(itemId: string) {
		this.pausedSet.delete(itemId)
		const ctrl = this.controllers.get(itemId)
		if (ctrl) ctrl.abort()
		else this.patchItem(itemId, {status: "cancelled"})
	}

	// Batch counterparts of pause/resume/retry. resumeAll/retryAll reset the
	// affected items back to "pending" and then defer to uploadAll() so the
	// queue is drained through the same worker pool that respects `concurrency`
	// rather than firing N parallel uploads ignoring the cap.
	pauseAll() {
		for (const i of this.items) {
			if (i.status === "uploading") this.pause(i.id)
		}
	}

	private async restartItemsWithStatus(status: InputFileStatus) {
		for (const i of this.items) {
			if (i.status === status) {
				this.pausedSet.delete(i.id)
				this.patchItem(i.id, {status: "pending", progress: 0, error: null})
			}
		}
		await this.uploadAll()
	}

	async resumeAll() {
		await this.restartItemsWithStatus("paused")
	}

	async retryAll() {
		await this.restartItemsWithStatus("error")
	}

	removeAt(index: number) {
		const item = this.items[index]
		if (!item) return
		this.cancel(item.id)
		this.revokeThumbnail(item)
		this.items = this.items.filter((_, i) => i !== index)
		// Fire after the items array has been updated so consumers that read
		// state inside the handler see the post-removal snapshot. The removed
		// item is captured above so its metadata/status are still accessible.
		this.host.onFileRemove?.({file: item})
	}

	removeById(itemId: string) {
		const idx = this.items.findIndex((i) => i.id === itemId)
		if (idx >= 0) this.removeAt(idx)
	}

	/** Removes every file; `afterEmpty` runs once the list is empty, before the onFileRemove calls. */
	clear(afterEmpty?: () => void) {
		// Snapshot before mutation so we can fire onFileRemove for each one
		// after the state is cleared (consumers reading state inside the
		// handler then see the empty list, matching removeAt's timing).
		const removed = this.items.slice()
		for (const i of removed) {
			this.cancel(i.id)
			this.revokeThumbnail(i)
		}
		this.items = []
		afterEmpty?.()
		for (const i of removed) this.host.onFileRemove?.({file: i})
	}

	/** Moves the row at `from` to `to` (drag reorder). */
	move(from: number, to: number) {
		if (from === to) return
		const next = [...this.items]
		const [moved] = next.splice(from, 1)
		next.splice(to, 0, moved)
		this.items = next
	}

	rowApi(item: InputFileItem): InputFileRowApi {
		return {
			item,
			remove: () => this.removeById(item.id),
			retry: () => this.retry(item.id),
			pause: () => this.pause(item.id),
			resume: () => this.resume(item.id),
			cancel: () => this.cancel(item.id)
		}
	}
}
