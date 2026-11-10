/**
 * One Escape owner for everything that floats above the page: dialogs, panels,
 * dropdowns, pickers, menus.
 *
 * Each open layer registers itself; a single capture-phase `keydown` listener on
 * `document` hands Escape to the topmost layer only. So Escape in a dropdown
 * inside a dialog closes the dropdown and leaves the dialog open, and the next
 * Escape closes the dialog. Separate per-component document listeners can't do
 * this: capture listeners on the same node all run, in registration order, so
 * the dialog (registered first) always won.
 *
 * The listener is installed when the first layer opens and removed when the
 * last one closes. Only call `pushLayer` in the browser (effects, handlers).
 */

export type Layer = {
	/**
	 * Called when Escape is pressed while this layer is on top. Return `false`
	 * to decline (e.g. the dialog has `closeOnEscape={false}`); the key then
	 * passes through untouched. Lower layers never receive it either way.
	 */
	onEscape: (event: KeyboardEvent) => boolean | void
}

const stack: Layer[] = []

function handleKeydown(event: KeyboardEvent) {
	if (event.key !== "Escape" || event.isComposing) return
	const top = stack[stack.length - 1]
	if (!top || top.onEscape(event) === false) return
	event.preventDefault()
	event.stopPropagation()
}

/** Register an open layer; returns the function that unregisters it. */
export function pushLayer(layer: Layer): () => void {
	stack.push(layer)
	if (stack.length === 1) document.addEventListener("keydown", handleKeydown, true)

	return () => {
		const index = stack.lastIndexOf(layer)
		if (index < 0) return
		stack.splice(index, 1)
		if (stack.length === 0) document.removeEventListener("keydown", handleKeydown, true)
	}
}
