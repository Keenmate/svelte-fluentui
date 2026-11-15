<!-- @component
Inline message bar with an intent colour, default icon, optional title and dismiss button.

```svelte
<Alert intent="warning" title="Heads up" dismissible>Body text</Alert>
```
-->

<script lang="ts">
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"
	import DismissIcon from "./icons/DismissIcon.svelte"

	type Intent = 'info' | 'success' | 'warning' | 'error'

	type OwnProps = {
		/** Colour and default icon: `info`, `success`, `warning` or `error`. Default: `"info"`. */
		intent?: Intent
		/** Bold title line above the body. */
		title?: string
		/** Show a × button that hides the alert (it stays hidden; fires `onDismiss`). */
		dismissible?: boolean
		/** Extra classes for the root `<div>`. */
		class?: string
		/** Inline style for the root `<div>`. */
		style?: string
		/** Fires when the user dismisses the alert. */
		onDismiss?: (ctx: {sourceEvent: MouseEvent}) => void
		/** Replaces the default intent icon. */
		icon?: Snippet
		/** Alert body. */
		children?: Snippet
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the root `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		intent = 'info',
		title = undefined,
		dismissible = false,
		class: classParam = undefined,
		style: styleParam = undefined,
		onDismiss = undefined,
		icon = undefined,
		children = undefined,
		...rest
	}: Props = $props()

	let dismissed = $state(false)

	function handleDismiss(event: MouseEvent) {
		dismissed = true
		onDismiss?.({sourceEvent: event})
	}

	let computedClass = $derived.by(() => {
		let classes = `fluent-alert fluent-alert--${intent}`
		if (classParam) classes += ` ${classParam}`
		return classes.trim()
	})

	// Default icons for each intent
	const defaultIcons: Record<Intent, string> = {
		info: 'ℹ',
		success: '✓',
		warning: '⚠',
		error: '✕'
	}
</script>

{#if !dismissed}
	<div role="alert" {...rest} class={computedClass} style={styleParam}>
		<div class="fluent-alert__icon">
			{#if icon}
				{@render icon()}
			{:else}
				<span class="fluent-alert__icon-default">{defaultIcons[intent]}</span>
			{/if}
		</div>

		<div class="fluent-alert__content">
			{#if title}
				<div class="fluent-alert__title">{title}</div>
			{/if}
			{#if children}
				<div class="fluent-alert__body">
					{@render children()}
				</div>
			{/if}
		</div>

		{#if dismissible}
			<button
				class="fluent-alert__dismiss"
				aria-label="Dismiss"
				onclick={handleDismiss}
			>
				<DismissIcon size={14} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.fluent-alert {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 16px;
		background-color: var(--neutral-layer-1, #ffffff);
		border: 1px solid var(--neutral-stroke-1, #e0e0e0);
		border-radius: var(--fluent-border-radius-md);
		border-inline-start-width: 4px;
		position: relative;
	}

	/* Intent variants */
	.fluent-alert--info {
		border-inline-start-color: var(--fluent-color-info-foreground, #0078d4);
	}

	.fluent-alert--info .fluent-alert__icon {
		background-color: color-mix(in srgb, var(--fluent-color-info-foreground, #0078d4) 10%, transparent);
		color: var(--fluent-color-info-foreground, #0078d4);
	}

	.fluent-alert--success {
		border-inline-start-color: var(--fluent-color-success-foreground, #107c10);
	}

	.fluent-alert--success .fluent-alert__icon {
		background-color: color-mix(in srgb, var(--fluent-color-success-foreground, #107c10) 10%, transparent);
		color: var(--fluent-color-success-foreground, #107c10);
	}

	.fluent-alert--warning {
		border-inline-start-color: var(--fluent-color-warning-foreground, #bc4b09);
	}

	.fluent-alert--warning .fluent-alert__icon {
		background-color: color-mix(in srgb, var(--fluent-color-warning-foreground, #bc4b09) 10%, transparent);
		color: var(--fluent-color-warning-foreground, #bc4b09);
	}

	.fluent-alert--error {
		border-inline-start-color: var(--fluent-color-danger-foreground, #d13438);
	}

	.fluent-alert--error .fluent-alert__icon {
		background-color: color-mix(in srgb, var(--fluent-color-danger-foreground, #d13438) 10%, transparent);
		color: var(--fluent-color-danger-foreground, #d13438);
	}

	/* Icon */
	.fluent-alert__icon {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--fluent-border-radius-md);
		font-size: 14px;
	}

	.fluent-alert__icon-default {
		font-weight: 600;
	}

	/* Content */
	.fluent-alert__content {
		flex: 1;
		min-width: 0;
	}

	.fluent-alert__title {
		font-weight: 600;
		font-size: 14px;
		color: var(--neutral-foreground-rest, #323130);
		margin-bottom: 4px;
	}

	.fluent-alert__title:last-child {
		margin-bottom: 0;
	}

	.fluent-alert__body {
		font-size: 14px;
		color: var(--neutral-foreground-rest, #323130);
		line-height: 1.5;
	}

	/* Dismiss button */
	.fluent-alert__dismiss {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--neutral-foreground-rest, #323130);
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--fluent-border-radius-md);
		transition: background-color 0.1s ease, color 0.1s ease;
	}

	.fluent-alert__dismiss:hover {
		background-color: var(--neutral-fill-secondary-hover, rgba(0, 0, 0, 0.05));
	}

	.fluent-alert__dismiss:focus {
		outline: 2px solid var(--accent-fill-rest, #0078d4);
		outline-offset: 2px;
	}
</style>
