<script lang="ts" module>
	import {fluentDialog} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentDialog())

	import type {Snippet} from "svelte"
	export type HTMLDialogElement = HTMLElement & {
		show: VoidFunction
		hide: VoidFunction
		toggle: VoidFunction
	}

	/**
	 * Global stack of currently-open Dialog instances, used to keep the FAST
	 * focus trap on the topmost one. Escape is routed by the shared layer stack
	 * (helpers/layer-stack.ts), so a dropdown open inside a dialog gets it first.
	 */
	type DialogHandle = {
		closeOnEscape: () => boolean
		preventClose: () => boolean
		requestClose: (reason: DialogCloseReason) => void
		hide: () => void
		/** Enable/disable this instance's FAST focus trap. See {@link syncFocusTrap}. */
		setFocusTrap: (active: boolean) => void
	}
	const openDialogStack: DialogHandle[] = []

	/**
	 * Keep the FAST focus trap active on only the topmost open dialog.
	 *
	 * `<fluent-dialog>` defaults `trapFocus` to true and installs a document-level
	 * `focusin` listener that yanks focus back inside whenever it escapes. With two
	 * dialogs open at once, both listeners fire on every focus change and pull focus
	 * into each other in turn — an infinite ping-pong that overflows the call stack
	 * (`RangeError`). Releasing the trap on every dialog beneath the top lets the
	 * topmost one own focus uncontested; closing it re-traps the new top.
	 */
	function syncFocusTrap() {
		for (let i = 0; i < openDialogStack.length; i++) {
			openDialogStack[i].setFocusTrap(i === openDialogStack.length - 1)
		}
	}

	/** Escape on the topmost layer; `false` declines (the key passes through). */
	function escapeDialog(handle: DialogHandle): boolean {
		if (handle.preventClose()) return false
		if (!handle.closeOnEscape()) return false
		handle.requestClose("escape")
		return true
	}

	function pushDialog(handle: DialogHandle) {
		openDialogStack.push(handle)
		syncFocusTrap()
	}

	function popDialog(handle: DialogHandle) {
		const idx = openDialogStack.lastIndexOf(handle)
		if (idx >= 0) openDialogStack.splice(idx, 1)
		syncFocusTrap()
	}

	/**
	 * Body scroll lock for modal dialogs. Without this, scrolling while the
	 * pointer is over a non-scrollable part of the dialog (header, tab strip,
	 * gaps) chains up to the document and scrolls the page behind the modal.
	 *
	 * Reference-counted so stacked/nested modals only release the lock once the
	 * last one closes. The original inline `overflow` / `paddingRight` are saved
	 * on lock and restored on unlock; padding compensates for the disappearing
	 * scrollbar so the page doesn't shift sideways when the lock engages.
	 */
	let scrollLockCount = 0
	let savedBodyOverflow = ""
	let savedBodyPaddingRight = ""

	function lockBodyScroll() {
		if (typeof document === "undefined") return
		if (scrollLockCount === 0) {
			const body = document.body
			savedBodyOverflow = body.style.overflow
			savedBodyPaddingRight = body.style.paddingRight
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
			if (scrollbarWidth > 0) {
				const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0
				body.style.paddingRight = `${current + scrollbarWidth}px`
			}
			body.style.overflow = "hidden"
		}
		scrollLockCount++
	}

	function unlockBodyScroll() {
		if (typeof document === "undefined") return
		if (scrollLockCount === 0) return
		scrollLockCount--
		if (scrollLockCount === 0) {
			document.body.style.overflow = savedBodyOverflow
			document.body.style.paddingRight = savedBodyPaddingRight
		}
	}

	import type {ActionEventDetail, ActionItem} from "../action-items/index.js"

	/**
	 * A footer button: an action item (`text`, `icon`, `isDisabled`, `onClick`, …) plus the
	 * button `appearance`. The dialog closes after it runs unless `shouldCloseOnClick` is
	 * `false` (or `beforeCloseCallback` / `beforeActionCallback` vetoes).
	 */
	export type DialogAction = ActionItem<object> & {
		appearance?: "accent" | "neutral" | "outline" | "stealth" | "lightweight"
		/** Close the dialog after the action ran. Default `true`. */
		shouldCloseOnClick?: boolean
	}
	export type DialogActionDetail = ActionEventDetail<object>

	/** Why a close was requested — passed to `beforeCloseCallback`. */
	export type DialogCloseReason = "escape" | "close-button" | "overlay" | "dismiss" | "action"
</script>

<!--
@component
Wrapper for `<fluent-dialog>` (portalled): header with title and ×, body, and a footer with optional primary / secondary actions.

```svelte
<Dialog bind:open modal title="Delete item?" primaryAction={{text: "Delete", onClick: remove}} secondaryAction={{text: "Cancel"}}>
	This can't be undone.
</Dialog>
```
-->
<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import {onDestroy} from "svelte"
	import Button from "./Button.svelte"
	import {portal} from "../actions/portal.js"
	import {pushLayer} from "../helpers/layer-stack.js"
	import {resolveActionItem, runAction} from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"
	import {useTranslations} from "../i18n/translate.svelte.js"
	import type {DialogLabels} from "../i18n/labels.js"

	type OwnProps = {
		/** Modal dialog: locks page scroll while open (`modal` on `<fluent-dialog>`, which sets `aria-modal`).
		 * `false` makes `<fluent-dialog>` non-modal; unset keeps its modal default but skips the scroll lock. */
		modal?: boolean
		/** Whether the dialog is open (bindable). */
		open?: boolean
		/** Hide the × button and ignore overlay clicks and Escape. */
		preventClose?: boolean
		/** Render a "Dismiss" button in the footer (label via `dismissButtonText`). */
		dismissible?: boolean
		/** Keep Tab focus inside the dialog (`trap-focus` on `<fluent-dialog>`). Default: `true`; `false` disables it. */
		trapFocus?: boolean
		/** Id of the element describing the dialog (`aria-describedby`). */
		ariaDescribedby?: string
		/** Id of the element labelling the dialog (`aria-labelledby`). */
		ariaLabelledby?: string
		/** Accessible name of the dialog (`aria-label`). */
		ariaLabel?: string
		/** Title text shown in the header row (start side). Ignored when `header` snippet is provided. */
		title?: string
		/** Fully custom header content (replaces the default title + close button row). */
		header?: Snippet
		/** Default slot — body content. */
		children?: Snippet
		/** Fully custom footer content (replaces primary/secondary action buttons and the legacy `actions` slot). */
		footer?: Snippet
		/** Convenience action — renders as a styled button (default `appearance="accent"`) at the end of the footer. */
		primaryAction?: DialogAction
		/** Convenience action — renders as a styled button (default `appearance="neutral"`) next to the primary action. */
		secondaryAction?: DialogAction
		/** Extra footer content rendered before the Dismiss / action buttons. Ignored when `footer` is set. */
		actions?: Snippet
		/** Label of the `dismissible` button. Default: the `dismiss` text ("Dismiss"). */
		dismissButtonText?: Snippet
		/** Fires when the dialog opens or closes. */
		onOpenChange?: (ctx: {open: boolean}) => void
		/** Fires after a footer action ran. */
		onAction?: (detail: DialogActionDetail) => void
		/** Called before a footer action runs; return `false` (or a Promise resolving to `false`) to cancel it. */
		beforeActionCallback?: (detail: DialogActionDetail) => unknown
		/**
		 * Called before a user-initiated close (Escape, ×, overlay, Dismiss, an action).
		 * Return `false` (or a Promise resolving to `false`) to keep the dialog open.
		 * Not called for `hide()` from code.
		 */
		beforeCloseCallback?: (ctx: {reason: DialogCloseReason}) => unknown
		/** Close on Escape (topmost layer only). Default: `true`. */
		closeOnEscape?: boolean
		/** Preset size: 400 / 600 / 800 / 1000 px wide, or `full` (90vw × 90vh). Default: `medium`. */
		size?: "small" | "medium" | "large" | "extra-large" | "full"
		/** CSS width; overrides the `size` width. */
		width?: string
		/** CSS height; overrides the `size` height (`auto` for presets). */
		height?: string
		/** Overrides of the built-in text (`svelteFluentUI.dialog.*` keys) for this instance. */
		labels?: DialogLabels
		/** Extra class on `<fluent-dialog>`. */
		class?: string
		/** Inline style on `<fluent-dialog>`. */
		style?: string
	}

	/** Other native attributes and events (`id`, `data-*`, `onkeydown`, …) go to `<fluent-dialog>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		modal = undefined,
		open = $bindable(undefined),
		trapFocus = undefined,
		ariaDescribedby = undefined,
		ariaLabelledby = undefined,
		ariaLabel = undefined,
		preventClose = false,
		dismissible = false,
		title = undefined,
		header = undefined,
		children = undefined,
		footer = undefined,
		primaryAction = undefined,
		secondaryAction = undefined,
		actions = undefined,
		dismissButtonText = undefined,
		onOpenChange = undefined,
		onAction = undefined,
		beforeActionCallback = undefined,
		beforeCloseCallback = undefined,
		closeOnEscape = true,
		size = "medium",
		width = undefined,
		height = undefined,
		labels: labelsProp = undefined,
		class: className = undefined,
		style = undefined,
		...rest
	}: Props = $props()

	const t = useTranslations("dialog", () => labelsProp)

	// Size mappings
	const sizeMap = {
		small: {width: "400px", height: "auto"},
		medium: {width: "600px", height: "auto"},
		large: {width: "800px", height: "auto"},
		"extra-large": {width: "1000px", height: "auto"},
		full: {width: "90vw", height: "90vh"}
	}

	const dialogWidth = $derived(width || sizeMap[size].width)
	const dialogHeight = $derived(height || sizeMap[size].height)
	const dialogStyle = $derived(`--dialog-width: ${dialogWidth}; --dialog-height: ${dialogHeight};`)

	let element:
		| (HTMLElement & {
				show: Function
				hide: Function
		  })
		| undefined = undefined

	export function show() {
		if (!element) {
			return
		}

		if (open) return
		open = true
		element.show()
		onOpenChange?.({open: true})
	}

	export function hide() {
		if (!element) {
			return
		}

		if (!open) return
		open = false
		element.hide()
		onOpenChange?.({open: false})
	}

	export function toggle() {
		if (!element) {
			return
		}

		if (open) hide()
		else show()
	}

	// User-initiated close. Runs beforeCloseCallback (may be async; `false` or a
	// throw keeps the dialog open). A second request while one is pending is ignored.
	let closing = false
	async function requestClose(reason: DialogCloseReason) {
		if (closing) return
		if (beforeCloseCallback) {
			closing = true
			try {
				if ((await beforeCloseCallback({reason})) === false) return
			} catch (error) {
				console.error("[Dialog] beforeCloseCallback failed:", error)
				return
			} finally {
				closing = false
			}
		}
		hide()
	}

	// Wire this instance into the global Escape stack while visible. Listener
	// lives on `document` so Esc works regardless of where focus is.
	const handle: DialogHandle = {
		closeOnEscape: () => closeOnEscape,
		preventClose: () => preventClose,
		requestClose,
		hide,
		// Topmost dialog keeps the trap; the rest release it. We never re-enable a
		// trap the author explicitly disabled (trapFocus={false}).
		//
		// Setting the `trapFocus` *property* alone is not enough: FAST's
		// `trapFocusChanged` reflection does not reliably tear down the document
		// `focusin` listener, so a released dialog keeps trapping (isTrappingFocus
		// stays true) and two live traps ping-pong focus into a stack overflow.
		// Calling the internal `updateTrapFocus(shouldTrap)` forces the listener
		// on/off immediately; we still set the property to keep FAST's own
		// `shouldTrapFocus()` coherent for any later internal recompute.
		setFocusTrap: (active: boolean) => {
			if (!element) return
			const fast = element as unknown as {
				trapFocus: boolean
				updateTrapFocus?: (shouldTrapFocusOverride?: boolean) => void
			}
			const shouldTrap = active && trapFocus !== false
			fast.trapFocus = shouldTrap
			fast.updateTrapFocus?.(shouldTrap)
		}
	}
	$effect(() => {
		if (open) {
			pushDialog(handle)
			const popLayer = pushLayer({onEscape: () => escapeDialog(handle)})
			return () => {
				popLayer()
				popDialog(handle)
			}
		}
	})

	// Lock the page scroll while a *modal* dialog is open so wheel events over
	// the dialog don't chain to the document. Non-modal dialogs leave the page
	// scrollable on purpose.
	$effect(() => {
		if (open && modal) {
			lockBodyScroll()
			return () => unlockBodyScroll()
		}
	})

	onDestroy(() => popDialog(handle))

	// FAST's `modal` is a boolean attribute that defaults to `true`, so an absent
	// attribute can't express `modal={false}`; set the property instead (drops
	// `aria-modal` and FAST's own overlay for non-modal dialogs).
	$effect(() => {
		if (element) (element as unknown as {modal: boolean}).modal = modal !== false
	})

	const actionHost = {}
	async function runFooterAction(action: DialogAction, fallbackId: string, event: MouseEvent) {
		const ran = await runAction({
			host: actionHost,
			detail: {
				action: action.action ?? "custom",
				id: action.id ?? fallbackId,
				item: action,
				source: "dialog",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			},
			beforeActionCallback,
			emitAction: (detail) => onAction?.(detail)
		})
		if (ran && action.shouldCloseOnClick !== false) await requestClose("action")
	}

	const primary = $derived(primaryAction ? resolveActionItem(primaryAction, {}) : undefined)
	const secondary = $derived(secondaryAction ? resolveActionItem(secondaryAction, {}) : undefined)

	const hasFooterContent = $derived(!!footer || !!actions || dismissible || !!primaryAction || !!secondaryAction)
	// A dedicated header row is rendered only when there's an actual title or custom
	// header snippet — otherwise the close X floats in the top-right corner so legacy
	// dialogs that put their own heading in the body don't get an empty strip on top.
	const hasHeaderRow = $derived(!!header || !!title)
	const showFloatingClose = $derived(!hasHeaderRow && !preventClose)
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div use:portal class="dialog-overlay" onclick={!preventClose ? () => requestClose("overlay") : undefined}></div>
{/if}

<fluent-dialog
	use:portal
	bind:this={element}
	{...rest}
	{...attrs({
		modal,
		"trap-focus": trapFocus,
		"aria-describedby": ariaDescribedby,
		"aria-labelledby": ariaLabelledby,
		"aria-label": ariaLabel
	})}
	hidden={!open}
	class={["dialog-positioned", className]}
	style={dialogStyle + (style ? ` ${style}` : "")}
>
	<div class="dialog-container">
		{#if hasHeaderRow}
			<div class="dialog-header">
				{#if header}
					{@render header()}
				{:else}
					<div class="dialog-title">{title}</div>
					{#if !preventClose}
						<Button appearance="stealth" onclick={() => requestClose("close-button")} aria-label={t("closeAriaLabel")}>
							<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
								<path
									d="M2.09 2.22a.75.75 0 0 1 1.06-.13L6 4.94l2.85-2.85a.75.75 0 1 1 1.06 1.06L7.06 6l2.85 2.85a.75.75 0 1 1-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 0 1-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 0 1-.13-1.06z"
								/>
							</svg>
						</Button>
					{/if}
				{/if}
			</div>
		{:else if showFloatingClose}
			<button
				type="button"
				class="dialog-close-floating"
				onclick={() => requestClose("close-button")}
				aria-label={t("closeAriaLabel")}
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
					<path
						d="M2.09 2.22a.75.75 0 0 1 1.06-.13L6 4.94l2.85-2.85a.75.75 0 1 1 1.06 1.06L7.06 6l2.85 2.85a.75.75 0 1 1-1.06 1.06L6 7.06l-2.85 2.85a.75.75 0 0 1-1.06-1.06L4.94 6 2.09 3.15a.75.75 0 0 1-.13-1.06z"
					/>
				</svg>
			</button>
		{/if}

		<div class="dialog-content">
			{@render children?.()}
		</div>

		{#if hasFooterContent}
			<div class="dialog-footer">
				{#if footer}
					{@render footer()}
				{:else}
					{#if actions}
						<div class="dialog-actions">
							{@render actions()}
						</div>
					{/if}
					{#if dismissible}
						<Button onclick={() => requestClose("dismiss")}>
							{#if dismissButtonText}
								{@render dismissButtonText()}
							{:else}
								{t("dismiss")}
							{/if}
						</Button>
					{/if}
					{#if primaryAction && primary?.isVisible}
						<Button
							appearance={primaryAction.appearance ?? "accent"}
							disabled={primary.isDisabled}
							title={primary.tooltip}
							onclick={(event) => runFooterAction(primaryAction, "primary", event)}
						>
							{primary.text}
						</Button>
					{/if}
					{#if secondaryAction && secondary?.isVisible}
						<Button
							appearance={secondaryAction.appearance ?? "neutral"}
							disabled={secondary.isDisabled}
							title={secondary.tooltip}
							onclick={(event) => runFooterAction(secondaryAction, "secondary", event)}
						>
							{secondary.text}
						</Button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</fluent-dialog>

<style>
	@layer reset, variables, component, overrides;

	@layer component {
		.dialog-overlay {
			position: fixed;
			inset: 0;
			background-color: rgba(0, 0, 0, 0.4);
			z-index: var(--fluent-z-modal-backdrop);
		}

		.dialog-positioned {
			position: fixed;
			z-index: var(--fluent-z-modal);
		}

		fluent-dialog::part(control) {
			padding: 1rem;
		}

		.dialog-container {
			display: flex;
			flex-direction: column;
			height: 100%;
			gap: 1rem;
			position: relative;
		}

		.dialog-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.5rem;
			flex: none;
		}

		.dialog-title {
			font-size: 1.25rem;
			font-weight: 600;
			color: var(--neutral-foreground-rest);
			flex: 1;
			min-width: 0;
		}

		/* Used when no title/header is provided — keeps legacy "X in the corner" look. */
		.dialog-close-floating {
			position: absolute;
			top: 0;
			inset-inline-end: 0;
			background: transparent;
			border: none;
			cursor: pointer;
			padding: 0.5rem;
			color: var(--neutral-foreground-rest);
			border-radius: var(--fluent-border-radius-md);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.dialog-close-floating:hover {
			background: var(--neutral-fill-stealth-hover, rgba(0, 0, 0, 0.05));
		}

		.dialog-content {
			flex: 1;
			min-height: 0;
		}

		.dialog-footer {
			flex: none;
			display: flex;
			justify-content: flex-end;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.dialog-actions {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}
	}
</style>
