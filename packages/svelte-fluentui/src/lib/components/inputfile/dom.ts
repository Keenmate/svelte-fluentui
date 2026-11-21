// Internal (InputFile): DOM helpers — popover / drag-overlay positioning actions and folder-drop traversal. Not exported from the package.

import {computePosition, flip, shift, offset, size, autoUpdate} from "@floating-ui/dom"

/** Keeps the drag overlay centred on `anchor` and at least its size (fixed positioning). */
export function positionOverlay(node: HTMLElement, anchor: HTMLElement) {
	function update() {
		const rect = anchor.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		// Anchor the overlay's centre to the target's centre so it expands
		// symmetrically in every direction rather than only downwards.
		node.style.position = "fixed"
		node.style.left = `${cx}px`
		node.style.top = `${cy}px`
		node.style.transform = "translate(-50%, -50%)"
		node.style.minWidth = `${rect.width}px`
		node.style.minHeight = `${rect.height}px`
	}
	const cleanup = autoUpdate(anchor, node, update)
	return {
		destroy() {
			cleanup()
		}
	}
}

/** Places the file-list popover under (or above) `anchor`, capped to the viewport. */
export function positionPopover(node: HTMLElement, anchor: HTMLElement) {
	async function update() {
		const {x, y} = await computePosition(anchor, node, {
			placement: "bottom-end",
			strategy: "fixed",
			middleware: [
				offset(6),
				flip({fallbackPlacements: ["top-end", "bottom-start", "top-start"]}),
				shift({padding: 8}),
				size({
					apply({availableHeight, elements}) {
						// Clear any prior inline cap so getComputedStyle reflects the
						// CSS rule (which reads --fluent-inputfile-popover-max-height).
						// Then only re-apply an inline cap when the viewport actually
						// has less room than the CSS-defined ceiling — otherwise we'd
						// silently override the theme variable on tall screens and the
						// popover would grow to whatever the viewport allows.
						const floating = elements.floating as HTMLElement
						floating.style.maxHeight = ""
						const cssMax = parseFloat(getComputedStyle(floating).maxHeight)
						const viewportCap = availableHeight - 16
						const effective = Number.isFinite(cssMax) ? Math.min(cssMax, viewportCap) : viewportCap
						floating.style.maxHeight = `${Math.max(effective, 160)}px`
					},
					padding: 8
				})
			]
		})
		node.style.left = `${x}px`
		node.style.top = `${y}px`
	}
	const cleanup = autoUpdate(anchor, node, update)
	return {
		destroy() {
			cleanup()
		}
	}
}

/** Files from a drop (null when there's no file list); with `allowFolderDrop`, dropped directories are walked recursively. */
export async function droppedFiles(
	dataTransfer: DataTransfer | null | undefined,
	allowFolderDrop: boolean
): Promise<File[] | null> {
	if (allowFolderDrop && dataTransfer?.items) {
		const dataItems = Array.from(dataTransfer.items)
		const files: File[] = []
		await Promise.all(
			dataItems.map(async (di) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const entry = (di as any).webkitGetAsEntry?.()
				if (entry) await traverseEntry(entry, files)
				else {
					const f = di.getAsFile()
					if (f) files.push(f)
				}
			})
		)
		return files
	}
	const files = dataTransfer?.files
	return files ? Array.from(files) : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function traverseEntry(entry: any, out: File[]) {
	if (entry.isFile) {
		const f = await new Promise<File>((res, rej) => entry.file(res, rej))
		out.push(f)
	} else if (entry.isDirectory) {
		const reader = entry.createReader()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const entries = await new Promise<any[]>((res, rej) => reader.readEntries(res, rej))
		for (const e of entries) await traverseEntry(e, out)
	}
}
