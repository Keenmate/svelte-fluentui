<script lang="ts">
	import {CommandPalette, type CommandPaletteItem} from "svelte-fluentui"

	let open = $state(false)
	let log = $state<string[]>([])
	let blockLinks = $state(true)

	const items: CommandPaletteItem[] = [
		{id: "new", text: "New document", onClick: () => log.push("click:new")},
		{id: "off", text: "Disabled thing", isDisabled: true, onClick: () => log.push("click:off")},
		{id: "go", text: "Go somewhere", href: "/test/menus"}
	]
</script>

<button id="open" onclick={() => (open = true)}>open</button>
<button id="allow-links" onclick={() => (blockLinks = false)}>allow links</button>
<CommandPalette bind:open {items} enableShortcut={false}
	onAction={({id, term}) => log.push(`action:${id}:${term}`)}
	beforeActionCallback={({item}) => (item.href && blockLinks ? false : undefined)}
	filterCallback={({items, term}) => items.filter((i) => i.text.toLowerCase().includes(term.toLowerCase()))} />
<output id="log">{log.join(" | ")}</output>
<output id="hash">{typeof location !== "undefined" ? location.hash : ""}</output>
