<script lang="ts">
	import {MenuButton, ContextMenu, Dialog, DatePicker, TimePicker, Select, Option, type MenuEntry} from "svelte-fluentui"

	let dialogOpen = $state(false)
	let log = $state<string[]>([])
	let mbOpen = $state(false)
	let cmOpen = $state(false)
	let date = $state<Date | null>(new Date(2026, 4, 10))
	let dateOpen = $state(false)
	let time = $state<string | null>(null)
	let timeOpen = $state(false)
	let selected = $state<string | string[] | undefined>("a")

	const items: MenuEntry[] = [
		{id: "cut", text: "Cut", onClick: () => log.push("mb:cut")},
		{id: "paste", text: "Paste", onClick: () => log.push("mb:paste")}
	]
	const cmItems: MenuEntry<{x: number; y: number}>[] = [
		{id: "open", text: "Open", onClick: () => log.push("cm:open")},
		{id: "rename", text: "Rename", onClick: () => log.push("cm:rename")}
	]

	const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : ""
</script>

<button id="open-dialog" onclick={() => (dialogOpen = true)}>open dialog</button>

<Dialog bind:open={dialogOpen} title="Popups">
	<div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: start">
		<MenuButton id="dlg-mb" {items} bind:open={mbOpen}>Actions</MenuButton>
		<ContextMenu items={cmItems} onOpenChange={({open}) => (cmOpen = open)}>
			<div id="dlg-cm-zone" tabindex="-1" style="width: 200px; height: 40px; background: #eee">right-click here</div>
		</ContextMenu>
		<DatePicker id="dlg-dp" bind:value={date} bind:open={dateOpen} />
		<TimePicker id="dlg-tp" bind:value={time} bind:open={timeOpen} />
		<Select id="dlg-sel" bind:value={selected}>
			<Option value="a">Alpha</Option>
			<Option value="b">Bravo</Option>
		</Select>
	</div>
</Dialog>

<output id="dialog-open">{dialogOpen}</output>
<output id="mb-open">{mbOpen}</output>
<output id="cm-open">{cmOpen}</output>
<output id="dp-open">{dateOpen}</output>
<output id="dp-value">{fmt(date)}</output>
<output id="tp-open">{timeOpen}</output>
<output id="sel-value">{JSON.stringify(selected)}</output>
<output id="log">{log.join(" | ")}</output>
