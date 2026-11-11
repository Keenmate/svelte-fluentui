<script lang="ts">
	import type {TabInfo} from "./Tabs.svelte"
	import {tabsContext} from "../contexts.js"
	import type {Snippet} from "svelte"
	import { onDestroy, untrack } from "svelte"

	type Props = {
		class?: string
		style?: string
		id: string
		disabled?: boolean
		ariaLabel?: string
		label?: string
		icon?: Snippet
		header?: Snippet
		content?: Snippet
		childContent?: Snippet
		labelEditable?: boolean
		showClose?: boolean
		visible?: boolean
		/** Arbitrary data, passed back as `tab.data` in Tabs events and callbacks. */
		data?: Record<string, unknown>
		/**
		 * Called before Tabs navigates away from this tab while it is active.
		 * Return `false` (or a Promise resolving to `false`) to veto the switch —
		 * e.g. when the tab has unsaved changes. May be async.
		 */
		beforeLeaveCallback?: (ctx: {tab: TabInfo; newTab: TabInfo}) => unknown
		/**
		 * Called before this tab's close (×) button fires `onTabClose`. Return
		 * `false` (or a Promise resolving to `false`) to veto the close. May be async.
		 */
		beforeCloseCallback?: (ctx: {tab: TabInfo}) => unknown
		/** Fires when the user closes this tab with its × button. */
		onTabClose?: (ctx: {tab: TabInfo}) => void
	}

	let {
		class: className = "",
		style = "",
		id,
		disabled = false,
		ariaLabel = undefined,
		label = undefined,
		icon = undefined,
		header = undefined,
		content = undefined,
		childContent = undefined,
		labelEditable = false,
		showClose = false,
		visible = true,
		data = undefined,
		beforeLeaveCallback = undefined,
		beforeCloseCallback = undefined,
		onTabClose = undefined
	}: Props = $props()

	const ctx = tabsContext.get()

	if (!ctx && typeof console !== "undefined") {
		console.warn("<Tab> must be placed inside a <Tabs> component. Nothing will render.")
	}

	/*
	 * Tab.svelte renders no DOM of its own — it only registers its props
	 * with the parent <Tabs> via context. <Tabs> reads the registered
	 * entries and renders the real tab buttons + panels from them.
	 *
	 * The property reads in the `entry` literal below subscribe this effect
	 * to Tab's props — so when the consumer changes `label`, `disabled`, a
	 * snippet reference, etc., we re-register. The `register()` call itself
	 * is wrapped in `untrack(…)` because Tabs.svelte's register() reads the
	 * `tabs` $state array (to find/update the entry) and then writes to it.
	 * Without untrack, those reads would make this effect subscribe to the
	 * very array register() mutates, causing an immediate effect-update-
	 * depth-exceeded loop (Svelte 5: an effect must not read the state it
	 * writes). untrack prevents the read-side of register from being
	 * tracked, while the prop reads in the object literal above remain
	 * tracked and still drive re-registration on real prop changes.
	 */
	$effect(() => {
		if (!ctx) return
		const entry = {
			id,
			label,
			icon,
			header,
			content,
			childContent,
			disabled,
			ariaLabel,
			labelEditable,
			showClose,
			visible,
			data,
			beforeLeaveCallback,
			beforeCloseCallback,
			onTabClose,
			class: className,
			style
		}
		untrack(() => ctx.register(entry))
	})

	onDestroy(() => {
		if (ctx) untrack(() => ctx.unregister(id))
	})
</script>
