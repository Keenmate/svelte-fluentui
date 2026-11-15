<script lang="ts">
	import {MenuButton, ContextMenu, Dialog, type MenuEntry} from "svelte-fluentui"

	let log = $state<string[]>([])
	let menuOpen = $state(false)
	let cmOpen = $state(false)
	let dialogOpen = $state(false)

	const items: MenuEntry[] = [
		{id: "cut", text: "Cut", onClick: () => log.push("mb:cut")},
		{id: "off", text: "Off", isDisabled: true, onClick: () => log.push("mb:off")},
		{divider: true},
		{id: "paste", text: "Paste", onClick: () => log.push("mb:paste")},
		{id: "last", text: "Last", onClick: () => log.push("mb:last")},
		{id: "last-off", text: "Last off", isDisabled: true}
	]

	const cmItems: MenuEntry<{x: number; y: number}>[] = [
		{id: "open", text: "Open", onClick: () => log.push("cm:open")},
		{id: "cm-off", text: "Disabled", isDisabled: true, onClick: () => log.push("cm:off")},
		{divider: true, text: "Group"},
		{id: "new", text: "New", children: [
			{id: "doc", text: "Document", onClick: () => log.push("cm:doc")},
			{id: "doc-off", text: "Doc off", isDisabled: true},
			{id: "sheet", text: "Sheet", onClick: () => log.push("cm:sheet")}
		]},
		{id: "rename", text: "Rename", onClick: () => log.push("cm:rename")}
	]
</script>

<div style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem; align-items: start">
	<button id="before">before</button>
	<MenuButton id="mb" {items} bind:open={menuOpen}>Actions</MenuButton>
	<input id="outside" placeholder="outside" />

	<ContextMenu items={cmItems} onOpenChange={({open}) => (cmOpen = open)}>
		<div id="cm-zone" tabindex="-1" style="width: 300px; height: 120px; background: #eee">right-click here</div>
	</ContextMenu>
	<div id="other-zone" style="width: 300px; height: 60px; background: #ddd">other</div>

	<div id="scroller" style="width: 300px; height: 60px; overflow: auto; border: 1px solid #ccc">
		<div style="height: 400px">scroll me</div>
	</div>

	<button id="open-dialog" onclick={() => (dialogOpen = true)}>open dialog</button>
</div>

<Dialog bind:open={dialogOpen} title="Menus">
	<MenuButton id="dialog-mb" {items}>Dialog actions</MenuButton>
</Dialog>

<output id="mb-open">{menuOpen}</output>
<output id="cm-open">{cmOpen}</output>
<output id="dialog-open">{dialogOpen}</output>
<output id="log">{log.join(" | ")}</output>
