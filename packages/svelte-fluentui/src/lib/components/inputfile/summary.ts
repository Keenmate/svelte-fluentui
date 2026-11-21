// Internal (InputFile): pure derivations over the file list — hint lines, validity, progress totals, status labels. Not exported from the package.

import type {InputFileItem, InputFileStatus} from "../InputFile.types.js"
import type {Translate} from "../../i18n/translate.svelte.js"
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
	t: Translate<"inputFile">,
	limits: LimitsInfo,
	limitsHint: string | null,
	itemCount: number,
	currentTotalSize: number
): string[] {
	const parts: string[] = []
	if (limits.accept) parts.push(t("accepted", {accept: limits.accept}))
	if (limitsHint) {
		parts.push(limitsHint)
	} else {
		const {maxFileSize, minFileSize, totalMaxSize, multiple, maxFileCount, minFileCount} = limits
		if (maxFileSize) parts.push(t("maxSize", {size: formatInputFileSize(maxFileSize)}))
		if (minFileSize) parts.push(t("minSize", {size: formatInputFileSize(minFileSize)}))
		if (totalMaxSize > 0) {
			const size = formatInputFileSize(totalMaxSize)
			parts.push(
				itemCount > 0
					? t("totalMaxSizeRemaining", {
							size,
							remaining: formatInputFileSize(Math.max(0, totalMaxSize - currentTotalSize))
						})
					: t("totalMaxSize", {size})
			)
		}
		if (multiple && maxFileCount) {
			parts.push(
				itemCount > 0
					? t("maxFilesRemaining", {max: maxFileCount, remaining: Math.max(0, maxFileCount - itemCount)})
					: t("maxFiles", {max: maxFileCount})
			)
		}
		if (minFileCount > 0) parts.push(t("minFiles", {min: minFileCount}))
	}
	return parts
}

export function validityReasons(
	t: Translate<"inputFile">,
	items: InputFileItem[],
	minFileCount: number,
	maxFileCount: number
): string[] {
	const reasons: string[] = []
	if (minFileCount && items.length < minFileCount) reasons.push(t("tooFewFiles", {min: minFileCount}))
	if (maxFileCount && items.length > maxFileCount) reasons.push(t("tooManyFiles", {max: maxFileCount}))
	if (items.some((i) => i.status === "error")) reasons.push(t("error"))
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

export function statusLabel(t: Translate<"inputFile">, status: InputFileStatus): string {
	switch (status) {
		case "pending":
			return t("pending")
		case "uploading":
			return t("uploading")
		case "paused":
			return t("paused")
		case "completed":
			return t("completed")
		case "error":
			return t("error")
		case "cancelled":
			return t("cancelled")
	}
}
