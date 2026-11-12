<script lang="ts" module>
	import {fluentAnchor} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentAnchor())

	import type {ActionEventDetail, ActionItem} from "../action-items/index.js"

	/** A toast link: plain text (its `id` is the slot: `top`, `primary`, `secondary`) or an action item. */
	export type ToastAction = string | ActionItem<object>
	export type ToastActionDetail = ActionEventDetail<object>
</script>

<script lang="ts">
	import type {Snippet} from "svelte"
	import DismissIcon from "./icons/DismissIcon.svelte"
	import {resolveActionItem, runAction} from "../action-items/index.js"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		id?: string
		title?: string
		timestamp?: Date
		topCTAType?: 'dismiss' | 'timestamp' | 'action'
		/** Link in the header (with `topCTAType="action"`). */
		topAction?: ToastAction
		/** First link in the footer. */
		primaryAction?: ToastAction
		/** Second link in the footer. */
		secondaryAction?: ToastAction
		/** Fires when the user dismisses the toast. */
		onDismiss?: (ctx: {sourceEvent: MouseEvent}) => void
		/** Fires after an action link ran; `id` is the item's id, or `top` / `primary` / `secondary` for plain-text actions. */
		onAction?: (detail: ToastActionDetail) => void
		/** Called before an action link runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: ToastActionDetail) => unknown
		children?: Snippet
	}

	/** Other native attributes and events (`class`, `style`, `role`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		id,
		title,
		timestamp,
		topCTAType,
		topAction,
		primaryAction,
		secondaryAction,
		onDismiss,
		onAction,
		beforeActionCallback,
		children,
		class: className = undefined,
		...rest
	}: Props = $props()

	function handleDismiss(event: MouseEvent) {
		onDismiss?.({sourceEvent: event})
	}

	function toItem(action: ToastAction | undefined, slot: string): ActionItem<object> | undefined {
		if (action === undefined || action === "") return undefined
		return typeof action === "string" ? {id: slot, text: action} : {id: slot, ...action}
	}

	const top = $derived(toItem(topAction, "top"))
	const primary = $derived(toItem(primaryAction, "primary"))
	const secondary = $derived(toItem(secondaryAction, "secondary"))

	const host = {}
	async function runToastAction(item: ActionItem<object>, event: MouseEvent) {
		event.preventDefault() // the links are href="#" for styling only
		await runAction({
			host,
			detail: {
				action: item.action ?? "custom",
				id: item.id,
				item,
				source: "toast",
				sourceEvent: event,
				triggerElement: event.currentTarget as HTMLElement
			},
			beforeActionCallback,
			emitAction: (detail) => onAction?.(detail)
		})
	}
</script>

<style>
	.toast-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
	}

	.dismiss-button {
		background: none;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		color: var(--neutral-foreground-rest);
	}

	.toast-action-link {
		font-size: 14px;
		font-weight: 400;
	}

	.fluent-toast-actions {
		margin-top: 0.5rem;
	}

	.primary-action {
		margin-inline-end: 1rem;
	}
</style>

{#snippet actionLink(item: ActionItem<object>, cls: string)}
	{@const r = resolveActionItem(item, {})}
	{#if r.isVisible}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<fluent-anchor
			href="#"
			title={r.tooltip ?? r.text}
			class={[cls, r.cssClass].filter(Boolean).join(" ")}
			appearance="hypertext"
			aria-disabled={r.isDisabled ? "true" : null}
			onclick={(event: MouseEvent) => runToastAction(item, event)}
		>
			{r.text}
		</fluent-anchor>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div tabindex="0" {...rest} class={["fluent-toast fluent-toast--show", className]} id={id}>
	<div class="toast-header">
		<div class="fluent-toast-title">{title}</div>

		<div class="fluent-toast-action">
			{#if topCTAType === 'dismiss'}
				<button title="Close" onclick={handleDismiss} aria-label="Dismiss" class="dismiss-button">
					<DismissIcon size={14} />
				</button>
			{:else if topCTAType === 'timestamp' && timestamp}
				<span class="fluent-toast-small timestamp">{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			{:else if topCTAType === 'action' && top}
				{@render actionLink(top, "toast-action-link")}
			{/if}
		</div>
	</div>

	{#if children}
		{@render children?.()}
	{/if}

	{#if primary || secondary}
		<div class="fluent-toast-actions">
			{#if primary}
				{@render actionLink(primary, "toast-action-link primary-action")}
			{/if}
			{#if secondary}
				{@render actionLink(secondary, "toast-action-link")}
			{/if}
		</div>
	{/if}
</div>
