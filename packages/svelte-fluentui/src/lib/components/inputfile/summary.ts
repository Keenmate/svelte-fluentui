// Internal (InputFile): pure derivations over the file list — hint lines, validity, progress totals, status labels. Not exported from the package.

import type {InputFileItem, InputFileLabels, InputFileStatus} from "../InputFile.types.js"
import {formatInputFileSize} from "../InputFile.utils.js"

/** Bytes already accepted toward totalMaxSize — errored items don't count (they won't upload). */
export function acceptedBytes(items: InputFileItem[]): number {
	return items.reduce((sum, i) => (i.status === "error" ? sum : sum + i.size), 0)
}

export type LimitsInfo = {
	accept: string | undefined
	minFileSize: number
	maxFileSize: number
	totalMaxSize: number
	maxFileCount: number
	minFileCount: number
	multiple: boolean
}

// Drop-zone hint lines (file-type, size caps, file-count caps). Rendered
// as <p> rows under the card selector, and as a single "·"-joined line in
// the popover header where the card (and its inline hints) isn't visible.
// A non-empty `limitsHint` (formatLimits) replaces every per-limit line.
export function dropZoneHints(
	labels: InputFileLabels,
	limits: LimitsInfo,
	limitsHint: string | null,
	itemCount: number,
	currentTotalSize: number
): string[] {
	const parts: string[] = []
	if (limits.accept) parts.push(labels.accepted(limits.accept))
	if (limitsHint) {
		parts.push(limitsHint)
	} else {
		const {maxFileSize, minFileSize, totalMaxSize, multiple, maxFileCount, minFileCount} = limits
		if (maxFileSize) parts.push(labels.maxSize(formatInputFileSize(maxFileSize)))
		if (minFileSize) parts.push(labels.minSize(formatInputFileSize(minFileSize)))
		if (totalMaxSize > 0) {
			parts.push(labels.totalMaxSize(
				formatInputFileSize(totalMaxSize),
				itemCount > 0
					? formatInputFileSize(Math.max(0, totalMaxSize - currentTotalSize))
					: undefined
			))
		}
		if (multiple && maxFileCount) {
			parts.push(labels.maxFilesHint(
				maxFileCount,
				itemCount > 0 ? Math.max(0, maxFileCount - itemCount) : undefined
			))
		}
		if (minFileCount > 0) parts.push(labels.minFileCountHint(minFileCount))
	}
	return parts
}

export function validityReasons(
	labels: InputFileLabels,
	items: InputFileItem[],
	minFileCount: number,
	maxFileCount: number
): string[] {
	const reasons: string[] = []
	if (minFileCount && items.length < minFileCount) reasons.push(labels.tooFewFiles(minFileCount))
	if (maxFileCount && items.length > maxFileCount)
		reasons.push(labels.tooManyFiles(maxFileCount))
	if (items.some((i) => i.status === "error")) reasons.push(labels.error)
	return reasons
}

export type UploadTotals = {
	/** Total payload (every item, including errored ones). */
	totalBytes: number
	/** Completed items count fully, in-flight ones proportional to their progress. */
	uploadedBytes: number
	percent: number
	completed: number
	failed: number
	anyUploading: boolean
	anyPaused: boolean
}

export function uploadTotals(items: InputFileItem[]): UploadTotals {
	const totalBytes = items.reduce((sum, i) => sum + i.size, 0)
	const uploadedBytes = items.reduce((sum, i) => {
		if (i.status === "completed") return sum + i.size
		if (i.status === "uploading" || i.status === "paused") {
			return sum + Math.floor(i.size * (i.progress / 100))
		}
		return sum
	}, 0)
	return {
		totalBytes,
		uploadedBytes,
		percent: totalBytes === 0 ? 0 : Math.min(100, (uploadedBytes / totalBytes) * 100),
		completed: items.filter((i) => i.status === "completed").length,
		failed: items.filter((i) => i.status === "error").length,
		anyUploading: items.some((i) => i.status === "uploading"),
		anyPaused: items.some((i) => i.status === "paused")
	}
}

/** Aggregate status shown on the minimal selector's count badge. */
export function badgeStatus(items: InputFileItem[]): InputFileStatus {
	if (items.some((i) => i.status === "error")) return "error"
	if (items.some((i) => i.status === "uploading" || i.status === "paused")) return "uploading"
	if (items.length > 0 && items.every((i) => i.status === "completed")) return "completed"
	return "pending"
}

export function statusLabel(labels: InputFileLabels, status: InputFileStatus): string {
	switch (status) {
		case "pending":
			return labels.pending
		case "uploading":
			return labels.uploading
		case "paused":
			return labels.paused
		case "completed":
			return labels.completed
		case "error":
			return labels.error
		case "cancelled":
			return labels.cancelled
	}
}
