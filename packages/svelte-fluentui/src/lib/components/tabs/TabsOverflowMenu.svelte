<!-- Internal (Tabs): menu-mode overflow popup listing the tabs that don't fit the strip. Not exported from the package. -->

<script lang="ts" module>
	import {fluentMenu, fluentMenuItem} from "@fluentui/web-components"
	import {registerFluentElements} from "../../fluent-ui/register.js"

	registerFluentElements(fluentMenu(), fluentMenuItem())
</script>

<script lang="ts">
	import PositioningRegion from "../PositioningRegion.svelte"
	import type {TabEntry} from "./tabs.types.js"

	type Props = {
		anchor: HTMLElement
		visible: boolean
		horizontal: boolean
		tabs: TabEntry[]
		/** The menu surface, for outside-dismiss bookkeeping in Tabs. */
		menuEl?: HTMLElement
		onPick: (tabId: string) => void
	}

	let {anchor, visible, horizontal, tabs, menuEl = $bindable(), onPick}: Props = $props()
</script>

<PositioningRegion
	{anchor}
	{visible}
	matchWidth={false}
	position={horizontal ? "bottom" : "end"}
>
	<div class="fluent-tabs-overflow-menu context-menu fluent-popup-elevation fluent-popup--layer" bind:this={menuEl}>
		<fluent-menu>
			{#each tabs as tab (tab.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<fluent-menu-item
					class={tab.disabled ? "disabled" : ""}
					role="menuitem"
					tabindex="-1"
					onclick={() => onPick(tab.id)}
				>
					{tab.label || tab.id}
				</fluent-menu-item>
			{/each}
		</fluent-menu>
	</div>
</PositioningRegion>

<style>
	/* Overflow menu — `<fluent-menu>` paints the surface; the wrapper adds the
	 * popup elevation (`.fluent-popup-elevation` + `--layer`: z-index + menu shadow,
	 * since fluent-menu's own shadow is too subtle on dark themes). Transparent, with
	 * the menu's border-radius so its rounded corners aren't framed by gray pixels. */
	.fluent-tabs-overflow-menu {
		background: transparent;
		border-radius: calc(var(--layer-corner-radius, var(--control-corner-radius, 4)) * 1px);
	}

	.fluent-tabs-overflow-menu fluent-menu {
		min-width: 160px;
	}
</style>
