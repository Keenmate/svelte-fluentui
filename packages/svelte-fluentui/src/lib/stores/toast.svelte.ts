/**
 * Programmatic toasts — a Svelte 5 reactive singleton. Call `toast.success("Saved")` from anywhere;
 * a `<ToastContainer />` (mounted once, e.g. in the root layout) renders `toast.items`.
 */
export type ToastVariant = "success" | "error" | "warning" | "info"

export type ToastPosition = "top-end" | "top-start" | "top-center" | "bottom-end" | "bottom-start" | "bottom-center"

export interface ToastOptions {
	variant?: ToastVariant
	/** Heading. Default: the variant's built-in title (`svelteFluentUI.toastContainer.<variant>Title`). */
	title?: string
	message?: string
	position?: ToastPosition
	duration?: number
	showProgress?: boolean
	persistent?: boolean
}

export interface ToastInstance extends Required<Omit<ToastOptions, "title" | "message">> {
	id: string
	/** Empty when not given: the container shows the variant's translated title. */
	title: string
	message: string
}

type VariantOptions = Omit<ToastOptions, "variant" | "message">

const defaults = {
	position: "top-end" as ToastPosition,
	duration: 5000,
	showProgress: false,
	persistent: false
}

function createToastService() {
	let items = $state<ToastInstance[]>([])
	let counter = 0
	const timers = new Map<string, ReturnType<typeof setTimeout>>()

	function show(options: ToastOptions): string {
		const {
			variant = "info",
			title = "",
			message = "",
			position = defaults.position,
			duration = defaults.duration,
			showProgress = defaults.showProgress,
			persistent = defaults.persistent
		} = options
		const id = `fluent-toast-${++counter}`
		items = [...items, {id, variant, title, message, position, duration, showProgress, persistent}]
		if (!persistent)
			timers.set(
				id,
				setTimeout(() => dismiss(id), duration)
			)
		return id
	}

	function dismiss(id: string): void {
		clearTimeout(timers.get(id))
		timers.delete(id)
		items = items.filter((t) => t.id !== id)
	}

	return {
		/** The toasts currently shown (reactive). */
		get items(): ToastInstance[] {
			return items
		},

		/** Shows a toast with full control over its options. Returns its id (for `dismiss`). */
		show,

		/** Shows a success toast. Returns its id. */
		success: (message: string, options: VariantOptions = {}): string => show({...options, variant: "success", message}),

		/** Shows an error toast. Returns its id. */
		error: (message: string, options: VariantOptions = {}): string => show({...options, variant: "error", message}),

		/** Shows a warning toast. Returns its id. */
		warning: (message: string, options: VariantOptions = {}): string => show({...options, variant: "warning", message}),

		/** Shows an info toast. Returns its id. */
		info: (message: string, options: VariantOptions = {}): string => show({...options, variant: "info", message}),

		/** Dismisses one toast by the id `show` / `success` / … returned. */
		dismiss,

		/** Dismisses all toasts, or only those at `position`. */
		dismissAll(position?: ToastPosition): void {
			for (const t of items) if (!position || t.position === position) dismiss(t.id)
		}
	}
}

export const toast = createToastService()
