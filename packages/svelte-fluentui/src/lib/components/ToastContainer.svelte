<!-- @component
Renders the toasts queued through the `toast` store (`toast.success(…)`, `toast.error(…)`, …) at their positions,
in the browser top layer. Mount it once, e.g. in the root layout; its only prop is `labels`.

```svelte
<ToastContainer />
<Button onclick={() => toast.success("Saved")}>Save</Button>
```
-->
<script lang="ts">
	import {toast, type ToastInstance, type ToastPosition} from "../stores/toast.js"
	import {onDestroy} from "svelte"
	import DismissIcon from "./icons/DismissIcon.svelte"
	import {portal} from "../actions/portal.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {ToastContainerLabels} from "../i18n/labels.js"

	let {
		/** Overrides of the built-in text (`svelteFluentUI.toastContainer.*` keys) for this instance. */
		labels: labelsProp = undefined
	}: {labels?: ToastContainerLabels} = $props()

	const t = useTranslations("toastContainer", () => labelsProp)

	// Promote the toast container into the browser top layer via the Popover API.
	// The top layer paints above ALL z-indexed content — including elements that
	// other components (e.g. QuickGrid's context menu, column filters, and floating
	// row toolbar) put in the top layer through PositioningRegion. A plain z-index
	// (even our $z-index-toast: 1080) can never beat a top-layer popover, so without
	// this a grid popover would render on top of toasts. Falls back to the CSS
	// z-index when the API is unavailable (older browsers).
	function topLayer(node: HTMLElement & {showPopover?: () => void; hidePopover?: () => void}) {
		// Unsupported: drop the `popover` attribute so the UA's
		// `:not(:popover-open){display:none}` can't hide the element; z-index fallback.
		if (typeof node.showPopover !== "function") {
			node.removeAttribute("popover")
			return
		}
		try {
			node.showPopover()
		} catch {
			node.removeAttribute("popover")
			return
		}
		return {
			destroy() {
				try { node.hidePopover?.() } catch { /* already hidden */ }
			}
		}
	}

	let toasts = $state<ToastInstance[]>([])
	let mountedToasts = $state(new Set<string>())

	// Group toasts by position
	let toastsByPosition = $derived.by(() => {
		const grouped: Record<ToastPosition, ToastInstance[]> = {
			"top-end": [],
			"top-start": [],
			"top-center": [],
			"bottom-end": [],
			"bottom-start": [],
			"bottom-center": []
		}

		toasts.forEach((t) => {
			grouped[t.position].push(t)
		})

		return grouped
	})

	// Subscribe to toast store
	const unsubscribe = toast.subscribe((value) => {
		toasts = value
	})
	onDestroy(unsubscribe)

	// Icons for variants
	const icons: Record<string, string> = {
		success: "✓",
		error: "✕",
		warning: "⚠",
		info: "ℹ"
	}

	function handleDismiss(id: string) {
		toast.dismiss(id)
	}

	function handleToastClick(id: string) {
		toast.dismiss(id)
	}

	// Mark new toasts as mounted one tick after they render so the show
	// animation runs. One timer per change (cleared on re-run / destroy), and ids
	// of dismissed toasts are dropped so the set doesn't grow forever.
	$effect(() => {
		const current = toasts.map((t) => t.id)
		if (current.every((id) => mountedToasts.has(id)) && mountedToasts.size === current.length) return
		const timer = setTimeout(() => {
			mountedToasts = new Set(current)
		}, 10)
		return () => clearTimeout(timer)
	})
</script>

{#each Object.entries(toastsByPosition) as [position, positionToasts]}
	{#if positionToasts.length > 0}
		<div
			use:portal
			use:topLayer
			popover="manual"
			id="toast-container-{position}"
			class="fluent-toast-container fluent-toast-container--{position}"
		>
			{#each positionToasts as toastItem (toastItem.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					id={toastItem.id}
					class="fluent-toast fluent-toast--{toastItem.variant}"
					class:fluent-toast--show={mountedToasts.has(toastItem.id)}
					role="alert"
					aria-live="polite"
					onclick={() => handleToastClick(toastItem.id)}
				>
					<div class="fluent-toast__icon">{icons[toastItem.variant] || "ℹ"}</div>
					<div class="fluent-toast__content">
						<div class="fluent-toast__title">{toastItem.title}</div>
						{#if toastItem.message}
							<div class="fluent-toast__message">{toastItem.message}</div>
						{/if}
					</div>
					<button
						class="fluent-toast__close"
						aria-label={t("closeAriaLabel")}
						onclick={(e) => {
							e.stopPropagation()
							handleDismiss(toastItem.id)
						}}
					>
						<DismissIcon size={14} />
					</button>
					{#if toastItem.showProgress && !toastItem.persistent}
						<div
							class="fluent-toast__progress"
							style="animation-duration: {toastItem.duration}ms;"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{/each}

<style>
	/* Styles are in src/assets/styles/components/_toast.scss */
</style>
