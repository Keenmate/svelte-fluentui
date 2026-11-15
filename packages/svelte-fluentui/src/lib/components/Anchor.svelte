<!-- @component
Wrapper for `<fluent-anchor>` — a link styled like a FluentUI button or hyperlink.

```svelte
<Anchor href="/docs" appearance="hypertext">Docs</Anchor>
```
-->

<script lang="ts" module>
	import {fluentAnchor} from "@fluentui/web-components"
	import {registerFluentElements} from "../fluent-ui/register.js"

	registerFluentElements(fluentAnchor())
</script>

<script lang="ts">
	import {attrs} from "../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {AnchorRestProps} from "../types/index.js"

	type OwnProps = {
		/** Element id. */
		id?: string
		/** Extra classes for `<fluent-anchor>`. */
		class?: string
		/** Inline style for `<fluent-anchor>`. */
		style?: string
		/** `download` attribute (suggested file name). */
		download?: string
		/** Link target URL (`href` attribute). */
		href?: string
		/** `hreflang` attribute. */
		hreflang?: string
		/** `ping` attribute (space-separated URLs). */
		ping?: string
		/** `referrerpolicy` attribute. */
		referrerpolicy?: string
		/** `rel` attribute. */
		rel?: string
		/** `target` attribute (`_blank`, `_self`, …). */
		target?: string
		/** `type` attribute (MIME hint). */
		type?: string
		/** Visual style (`appearance` attribute). Default (element): `"neutral"`. */
		appearance?: "neutral" | "accent" | "hypertext" | "stealth" | "transparent"
		/** Content in the `start` slot (before the text). */
		start?: Snippet
		/** Content in the `end` slot (after the text). */
		end?: Snippet
		/** Link text/content. */
		children?: Snippet
		/** Call `preventDefault()` on click (stop navigation) before `onclick` runs. */
		preventDefault?: boolean
		/** Action applied to the inner shadow-DOM `<a>` element. */
		use?: ((node: HTMLElement) => any) | undefined
		/** Native `click` event, forwarded untouched. */
		onclick?: (event: MouseEvent) => void
	}

	/** Other native attributes and events (`onkeydown`, `aria-*`, `title`, …) go to `<fluent-anchor>`. */
	type Props = OwnProps & AnchorRestProps<OwnProps>

	let element: HTMLElement

	let {
		id = undefined,
		class: className = "",
		style = "",
		download = undefined,
		href = undefined,
		hreflang = undefined,
		ping = undefined,
		referrerpolicy = undefined,
		rel = undefined,
		target = undefined,
		type = undefined,
		appearance = undefined,
		start = undefined,
		end = undefined,
		children = undefined,
		preventDefault = false,
		use = undefined,
		onclick = undefined,
		...rest
	}: Props = $props()

	$effect(() => {
		const a = element.shadowRoot?.querySelector("a")
		if (a) use?.(a)
	})

	function handleClick(event: MouseEvent) {
		if (preventDefault) {
			event.preventDefault()
		}
		if (onclick) {
			onclick(event)
		}
	}
</script>

<fluent-anchor
	bind:this={element}
	{...rest}
	{...attrs({
		id, class: className, style, download, href, hreflang, ping, referrerpolicy, rel, target,
		type, appearance
	})}
	onclick={handleClick}
>
	{#if start}
		<span slot="start">
			{@render start()}
		</span>
	{/if}

	{#if children}
		{@render children()}
	{/if}

	{#if end}
		<span slot="end">
			{@render end()}
		</span>
	{/if}
</fluent-anchor>