/** Lifecycle state of a file in the list. */
export type InputFileStatus =
	| "pending"
	| "uploading"
	| "paused"
	| "completed"
	| "error"
	| "cancelled"

/** One file in the InputFile list (`bind:items`). */
export type InputFileItem = {
	/** Stable generated id. */
	id: string
	/** The native file; `null` for seeded items (e.g. already-uploaded files). */
	file: File | null
	/** File name shown in the list. */
	name: string
	/** Size in bytes. */
	size: number
	/** MIME type. */
	type: string
	/** Upload progress, 0–100. */
	progress: number
	/** Lifecycle state. */
	status: InputFileStatus
	/** Validation or upload error message (status `error`). */
	error?: string | null
	/** Image preview URL (object URL for local images). */
	thumbnailUrl?: string | null
	/** When set, the row shows a download link. */
	downloadUrl?: string | null
	/** Arbitrary server payload returned by `uploadCallback` (e.g. `{serverGuid}`). */
	metadata?: Record<string, unknown>
}

/** One slice of a file when `chunkSize` is set. */
export type FileUploadChunk = {
	/** Byte offset of this chunk in the file. */
	offset: number
	/** Chunk size in bytes. */
	size: number
	/** Total file size in bytes. */
	total: number
	/** The chunk's bytes. */
	data: Blob
}

/**
 * Fields the upload handler can return to be merged into the InputFileItem
 * after a successful upload. Restricted on purpose: handlers should not be
 * able to overwrite internal lifecycle fields (id, file, size, status,
 * progress, error) by accident. Use `metadata` for arbitrary server payload
 * (e.g. `{serverGuid, etag}`) so it survives in the item for later use
 * (e.g. firing a DELETE when the user removes the item from the list).
 */
export type FileUploadResult = Partial<
	Pick<InputFileItem, "metadata" | "downloadUrl" | "thumbnailUrl" | "name">
>

/** What `uploadCallback` receives. `file.file` is the native `File`. */
export type InputFileUploadContext = {
	file: InputFileItem
	/** Aborts when the user cancels / pauses the upload or removes the file. */
	signal: AbortSignal
	/** Report progress of this upload (or of this chunk), 0–100. */
	reportProgress: (percent: number) => void
	/** Set when `chunkSize` splits the file; upload `chunk.data`. */
	chunk?: FileUploadChunk
}

export type FileUploadHandler = (ctx: InputFileUploadContext) => Promise<void | FileUploadResult>

/** An error message rejects the file; `null` / `undefined` accepts it. */
export type InputFileValidationResult = string | null | undefined
/** `customValidator`: per-file check, sync or async. */
export type InputFileValidator = (
	file: File
) => InputFileValidationResult | Promise<InputFileValidationResult>

/** Where rejected files go: shown as error rows (`list`), only reported via `onFileError` (`callback`), or dropped (`silent`). */
export type InputFileRejectionMode = "list" | "callback" | "silent"
/** Duplicate detection: by name, name + size, or SHA-1 content hash; `false` = allow duplicates. */
export type InputFileDedupeMode = "name" | "name-size" | "hash" | false

/** Retry for failed uploads; the delay before attempt n is `delayMs * backoff^n`. */
export type InputFileRetryPolicy = {
	/** Total attempts including the first. Default: 1 (no retry). */
	attempts?: number
	/** Base delay in ms. Default: 1000. */
	delayMs?: number
	/** Delay multiplier per attempt. Default: 2. */
	backoff?: number
}

/** Selector look: drop-zone card, button, or a compact minimal trigger. */
export type InputFileSelectorAppearance = "card" | "button" | "minimal"
/** File list look: rows, chips, a popover behind a button, or hidden. */
export type InputFileListAppearance = "list" | "chips" | "popover" | "none"
/** Size of the `card` selector. */
export type InputFileCardSize = "small" | "medium" | "large"
/** Where the chips (`listAppearance="chips"`) sit: beside the selector (`end`) or below it. */
export type InputFileChipsPosition = "end" | "bottom"
