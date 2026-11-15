/**
 * Move an element out of its current DOM position into another container
 * (defaults to `document.body`) for the lifetime of the action. Useful for
 * overlays — modals, popovers, tooltips — that must escape any ancestor
 * `transform` / `filter` / `position: fixed` stacking context to honor the
 * library's z-index scale.
 *
 * Usage:
 *   <div use:portal>...</div>                      // appends to <body>
 *   <div use:portal={'#layer-root'}>               // appends to a specific selector / element
 *   <div use:portal={portalHost(anchorEl)}>        // <body>, or the anchor's modal dialog
 */
export type PortalTarget = HTMLElement | string

/**
 * Where a popup anchored to `anchor` should be portalled: `<body>`, unless the
 * anchor sits inside a `<fluent-dialog>` (the Dialog component) — then the
 * dialog itself. The dialog traps focus to its own subtree, so a popup
 * portalled to `<body>` can't take keyboard focus (the trap pulls it straight
 * back). Inside the dialog's light DOM the popup still uses `position: fixed`
 * (the dialog has no transform / filter / contain, so the viewport stays the
 * containing block and Floating UI's `strategy: "fixed"` coordinates hold) and
 * stacks above the dialog's content.
 *
 * Only `<fluent-dialog>` is detected: it is the only focus trap in the library;
 * other `[role="dialog"]` surfaces (Panel, the picker popups) don't trap and
 * may be transformed (Panel slides in), which would break fixed positioning.
 */
export function portalHost(anchor: Element | null | undefined): HTMLElement {
	return (anchor?.closest("fluent-dialog") as HTMLElement | null) ?? document.body
}

export function portal(node: HTMLElement, target: PortalTarget = document.body) {
	function resolve(t: PortalTarget): HTMLElement | null {
		if (typeof t === "string") return document.querySelector(t)
		return t ?? null
	}

	function mount(t: PortalTarget) {
		const host = resolve(t)
		if (!host) {
			console.warn("portal: target not found", t)
			return
		}
		// Re-appending an element already in place would still detach it (and drop its focus)
		if (node.parentNode !== host) host.appendChild(node)
	}

	mount(target)

	return {
		update(newTarget: PortalTarget) {
			mount(newTarget)
		},
		destroy() {
			node.parentNode?.removeChild(node)
		}
	}
}
