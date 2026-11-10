<script lang="ts" module>
	import {fluentButton} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentButton())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"

	type Props = {
		appearance?: string
		autofocus?: boolean
		disabled?: boolean
		form?: string
		formaction?: string
		formenctype?: string
		formmethod?: string
		formnovalidate?: string
		formtarget?: string
		name?: string
		type?: string
		value?: string
		start?: Snippet
		end?: Snippet
		children?: Snippet
		style?: string
		class?: string
		"aria-label"?: string
		/** Native HTML `title` — text shown as a browser tooltip when hovering the button. */
		title?: string
		onclick?: (ev: MouseEvent) => void
	}

	let {
		appearance = undefined,
		autofocus = undefined,
		disabled = undefined,
		form = undefined,
		formaction = undefined,
		formenctype = undefined,
		formmethod = undefined,
		formnovalidate = undefined,
		formtarget = undefined,
		name = undefined,
		type = undefined,
		value = undefined,
		start = undefined,
		end = undefined,
		children = undefined,
		style= "",
		class: className = undefined,
		"aria-label": ariaLabel = undefined,
		title = undefined,
		onclick = undefined
	}: Props = $props()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_autofocus -->
<fluent-button
	{...attrs({
		type, name, appearance, autofocus, formaction, form, formenctype, formmethod,
		formnovalidate, formtarget, disabled, style, class: className, "aria-label": ariaLabel,
		title
	})}
	{...(value != null ? { value } : {})}
	{onclick}
>
	{#if start}
		<span slot="start" class="button-icon-slot">
			{@render start()}
		</span>
	{/if}
	{@render children?.()}
	{#if end}
		<span slot="end" class="button-icon-slot">
			{@render end()}
		</span>
	{/if}
</fluent-button>

<style>
	.button-icon-slot {
		display: flex;
		align-items: center;
	}

	.button-icon-slot :global(svg) {
		display: block;
	}
</style>
