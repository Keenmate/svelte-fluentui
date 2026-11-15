<!-- @component
Notification card: title header (dismiss button / timestamp / action link), body content and up to two footer links.
For queued, auto-dismissing toasts use `ToastContainer` with the toast service.

```svelte
<Toast title="Saved" topCTAType="dismiss" onDismiss={() => (shown = false)}>Your changes were saved.</Toast>
```
-->
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
		/** Id of the root element. */
		id?: string
		/** Bold heading text. */
		title?: string
		/** Time shown in the header (as `HH:mm`, local) with `topCTAType="timestamp"`. */
		timestamp?: Date
		/** What the header's end shows: a dismiss (×) button, the `timestamp`, or the `topAction` link. Default: nothing. */
		topCTAType?: 'dismiss' | 'timestamp' | 'action'
		/** Link in the header (with `topCTAType="action"`). */
		topAction?: ToastAction
		/** First link in the footer. */
		primaryAction?: ToastAction
		/** Second link in the footer. */
		secondaryAction?: ToastAction
		/** Fires when the user clicks the dismiss (×) button; the toast doesn't remove itself. */
		onDismiss?: (ctx: {sourceEvent: MouseEvent}) => void
		/** Fires after an action link ran; `id` is the item's id, or `top` / `primary` / `secondary` for plain-text actions. */
		onAction?: (detail: ToastActionDetail) => void
		/** Called before an action link runs; return `false` (or a Promise resolving to `false`) to cancel. */
		beforeActionCallback?: (detail: ToastActionDetail) => unknown
		/** Body content between the header and the footer links. */
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
	.fluent-toast-title {
		flex-grow: 1;
		font-weight: 600;
		font-size: 14px;
	}

	.fluent-toast-action {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
		width: 48px;
		min-width: 48px;
		height: 20px;
		font-weight: 400;
	}

	.fluent-toast-action:has(.timestamp) {
		cursor: initial;
		width: auto;
	}

	.fluent-toast-small {
		font-size: 12px;
		line-height: 16px;
	}

	.fluent-toast-actions {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		height: 28px;
		width: calc(100% - 12px);
		justify-content: flex-start;
		padding-inline-start: 24px;
		margin-top: 0.5rem;
	}

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
