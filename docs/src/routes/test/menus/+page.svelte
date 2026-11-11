<script lang="ts">
	import {MenuButton, ContextMenu, type MenuEntry} from "svelte-fluentui"

	let log = $state<string[]>([])
	let veto = $state(false)

	const items: MenuEntry[] = [
		{id: "edit", text: "Edit", icon: "edit", onClick: () => log.push("click:edit")},
		{divider: true},
		{divider: true},
		{id: "hidden", text: "Hidden", isVisible: false},
		{id: "off", text: "Off", isDisabled: true, onClick: () => log.push("click:off")},
		{id: "delete", text: "Delete", isDanger: true}
	]

	const cmItems: MenuEntry<{x: number; y: number}>[] = [
		{id: "open", text: "Open", onClick: () => log.push("cm:open")},
		{id: "new", text: "New", children: [{id: "doc", text: "Document", onClick: () => log.push("cm:doc")}]},
		{id: "sec", text: "Section", isExpandable: true, isExpanded: false, children: [{id: "inner", text: "Inner", onClick: () => log.push("cm:inner")}]}
	]
</script>

<button id="toggle-veto" onclick={() => (veto = !veto)}>veto</button>
<MenuButton {items} onAction={({action, id}) => log.push(`action:${action}:${id}`)}
	beforeActionCallback={() => (veto ? false : undefined)}>Actions</MenuButton>

<ContextMenu items={cmItems} onAction={({id, x}) => log.push(`cm-action:${id}:${x > 0}`)}>
	<div id="cm-zone" style="width: 300px; height: 120px; background: #eee">right-click here</div>
</ContextMenu>

<output id="log">{log.join(" | ")}</output>
