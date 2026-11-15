import {tick} from "svelte"

/**
 * Keyboard access to the selected-value chips shown inline in a multi-select input
 * (Combobox / Autocomplete). Focus moves onto a chip's × button — still `tabindex="-1"`,
 * so Tab skips the chips — and every chip, not only the last, can be removed:
 *
 * - From the input, ArrowLeft (ArrowRight in RTL) with the caret at the start focuses the last chip.
 * - On a chip: ArrowLeft / ArrowRight move between chips (past the last one back to the
 *   input), Home goes to the first chip, End returns to the input.
 * - Backspace removes the chip and focuses the previous one; Delete removes it and focuses
 *   the next one. With none left, focus goes back to the input.
 * - Enter / Space activate the × button (the host removes the chip and refocuses the input).
 * - A printable character returns to the input, which receives the character.
 */
export type ChipNavOptions = {
	/** The × buttons of the inline chips, in DOM order. */
	chips: () => HTMLElement[]
	/** The filter input. */
	input: () => HTMLInputElement | undefined
	/** Remove the chip at `index`, without moving focus. */
	remove: (index: number) => void
}

function isRtl(el: Element): boolean {
	return getComputedStyle(el).direction === "rtl"
}

/** Input keydown: ArrowLeft (start-ward) at caret 0 moves focus to the last chip. Returns `true` when handled. */
export function chipNavFromInput(ev: KeyboardEvent, options: ChipNavOptions): boolean {
	const input = options.input()
	if (!input || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return false
	if (ev.key !== (isRtl(input) ? "ArrowRight" : "ArrowLeft")) return false
	if (input.selectionStart !== 0 || input.selectionEnd !== 0) return false
	const chips = options.chips()
	if (chips.length === 0) return false
	ev.preventDefault()
	chips[chips.length - 1].focus()
	return true
}

/** Keydown on a chip's × button (delegate from the chips' container). Returns `true` when handled. */
export function chipNavFromChip(ev: KeyboardEvent, options: ChipNavOptions): boolean {
	const chips = options.chips()
	const index = chips.indexOf(ev.target as HTMLElement)
	if (index < 0 || ev.altKey || ev.ctrlKey || ev.metaKey) return false
	const rtl = isRtl(chips[index])
	const focusAt = (i: number) => {
		if (i >= chips.length) options.input()?.focus()
		else chips[Math.max(0, i)].focus()
	}

	switch (ev.key) {
		case rtl ? "ArrowRight" : "ArrowLeft":
			focusAt(index - 1)
			break
		case rtl ? "ArrowLeft" : "ArrowRight":
			focusAt(index + 1)
			break
		case "Home":
			focusAt(0)
			break
		case "End":
			options.input()?.focus()
			break
		case "Backspace":
		case "Delete": {
			const next = ev.key === "Backspace" ? Math.max(0, index - 1) : index
			options.remove(index)
			// The chip leaves the DOM on the next flush; focus its neighbour then.
			void tick().then(() => {
				const now = options.chips()
				if (next < now.length) now[next].focus()
				else options.input()?.focus()
			})
			break
		}
		default:
			// Typing goes back to the filter (no preventDefault: the input receives the key).
			if (ev.key.length === 1 && ev.key !== " ") {
				options.input()?.focus()
				return true
			}
			return false
	}
	ev.preventDefault()
	return true
}
