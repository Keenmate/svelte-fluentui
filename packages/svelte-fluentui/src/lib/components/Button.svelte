<!-- @component
Wrapper for `<fluent-button>`.

```svelte
<Button appearance="accent" onclick={save}>Save</Button>
```
-->

<script lang="ts" module>
	import {fluentButton} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentButton())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../types/index.js"

	type OwnProps = {
		/** Visual style (`appearance` attribute): `neutral`, `accent`, `lightweight`, `outline`, `stealth`. Default (element): `"neutral"`. */
		appearance?: string
		/** Focus on page load (`autofocus` attribute). */
		autofocus?: boolean
		/** Disable the button (`disabled` attribute). */
		disabled?: boolean
		/** Id of the owning `<form>` (`form` attribute). */
		form?: string
		/** `formaction` attribute (submit buttons). */
		formaction?: string
		/** `formenctype` attribute (submit buttons). */
		formenctype?: string
		/** `formmethod` attribute (submit buttons). */
		formmethod?: string
		/** `formnovalidate` attribute (submit buttons). */
		formnovalidate?: string
		/** `formtarget` attribute (submit buttons). */
		formtarget?: string
		/** Form field name (`name` attribute). */
		name?: string
		/** `type` attribute: `button`, `submit` or `reset`. Default (element): `"submit"` inside a form. */
		type?: string
		/** Form value submitted with `name` (`value` attribute). */
		value?: string
		/** Content in the `start` slot (leading icon). */
		start?: Snippet
		/** Content in the `end` slot (trailing icon). */
		end?: Snippet
		/** Button label. */
		children?: Snippet
		/** Inline style for `<fluent-button>`. */
		style?: string
		/** Extra classes for `<fluent-button>`. */
		class?: string
		/** Accessible name (`aria-label`), needed for icon-only buttons. */
		"aria-label"?: string
		/** Native HTML `title` — text shown as a browser tooltip when hovering the button. */
		title?: string
		/** Native `click` event, forwarded untouched. */
		onclick?: (ev: MouseEvent) => void
	}

	/** Other native attributes and events (`onkeydown`, `onfocus`, `id`, `aria-*`, …) go to `<fluent-button>`. */
	type Props = OwnProps & RestProps<OwnProps>

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
		onclick = undefined,
		...rest
	}: Props = $props()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_autofocus -->
<fluent-button
	{...rest}
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
