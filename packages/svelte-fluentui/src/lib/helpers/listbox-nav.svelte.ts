import {tick} from "svelte"

export type ListNavOptions = {
	/** Number of navigable rows right now (disabled / filtered-out rows excluded). */
	count: () => number
	/** The element of row `index`, scrolled into view after each move. Read after the DOM update. */
	itemAt?: (index: number) => Element | null | undefined
	/** Rows per PageUp/PageDown. Default 10. */
	pageSize?: () => number
}

/**
 * Keyboard cursor over a listbox: the highlighted row index (`-1` = none),
 * clamped moves (no wrap) and scroll-into-view. Rows are whatever `count()` /
 * `itemAt()` describe — DOM options or a rendered array — so the caller decides
 * what is navigable and how the highlight renders.
 */
export class ListNav {
	/** Highlighted row, or `-1`. Reactive. */
	index = $state(-1)
	#options: ListNavOptions

	constructor(options: ListNavOptions) {
		this.#options = options
	}

	/** Highlights `index` (clamped; `-1` when the list is empty) and scrolls it into view. */
	set(index: number): void {
		const count = this.#options.count()
		this.index = count === 0 ? -1 : Math.min(Math.max(index, 0), count - 1)
		void this.scrollIntoView()
	}

	/** Moves by `delta` rows, stopping at the ends. From `-1`, any move lands in the list. */
	move(delta: number): void {
		this.set(this.index + delta)
	}

	first(): void {
		this.set(0)
	}

	last(): void {
		this.set(this.#options.count() - 1)
	}

	/** Forgets the highlight (no scrolling). */
	reset(): void {
		this.index = -1
	}

	/**
	 * Handles ArrowUp/ArrowDown/PageUp/PageDown/Home/End. Returns `true` (and
	 * prevents the default) when the key moved the cursor. Home/End are left to
	 * the browser on an empty list, so they still move a text caret.
	 */
	handleKey(event: KeyboardEvent): boolean {
		const page = () => this.#options.pageSize?.() ?? 10
		switch (event.key) {
			case "ArrowDown":
				this.move(1)
				break
			case "ArrowUp":
				this.move(-1)
				break
			case "PageDown":
				this.move(page())
				break
			case "PageUp":
				this.move(-page())
				break
			case "Home":
			case "End":
				if (this.#options.count() === 0) return false
				if (event.key === "Home") this.first()
				else this.last()
				break
			default:
				return false
		}
		event.preventDefault()
		return true
	}

	/** Scrolls the highlighted row into view once the DOM reflects the new index. */
	async scrollIntoView(): Promise<void> {
		await tick()
		if (this.index < 0) return
		this.#options.itemAt?.(this.index)?.scrollIntoView({block: "nearest"})
	}
}
