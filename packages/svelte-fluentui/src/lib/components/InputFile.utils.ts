import type {InputFileItem} from "./InputFile.types.js"

export function formatInputFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes"
	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]
	const i = Math.min(Math.max(Math.floor(Math.log(bytes) / Math.log(k)), 0), sizes.length - 1)
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

let __nextId = 0
export function genId(): string {
	return `if-${++__nextId}-${Date.now().toString(36)}`
}

export async function hashFile(file: File): Promise<string> {
	const buf = await file.arrayBuffer()
	const hashBuf = await crypto.subtle.digest("SHA-1", buf)
	return Array.from(new Uint8Array(hashBuf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

export function clampPercent(p: number): number {
	if (!Number.isFinite(p)) return 0
	return Math.max(0, Math.min(100, Math.round(p)))
}

export function isAcceptedType(file: File, accept: string | undefined): boolean {
	if (!accept) return true
	const types = accept
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean)
	const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
	const mime = file.type
	return types.some((t) => {
		if (t.startsWith(".")) return ext === t.toLowerCase()
		if (t.endsWith("/*")) return mime.startsWith(t.slice(0, -1))
		return mime === t
	})
}

export function iconCategory(item: InputFileItem): string {
	const ext = (item.name.split(".").pop() ?? "").toLowerCase()
	const t = item.type
	if (t.startsWith("image/")) return "image"
	if (t.startsWith("video/")) return "video"
	if (t.startsWith("audio/")) return "audio"
	if (t.includes("pdf") || ext === "pdf") return "pdf"
	if (t.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip"
	if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet"
	if (["doc", "docx"].includes(ext)) return "doc"
	if (["ppt", "pptx"].includes(ext)) return "slides"
	return "file"
}
