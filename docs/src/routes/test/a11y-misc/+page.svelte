<script lang="ts">
	import {
		Tooltip, Dialog, Badge, Label, CompositeBadge, NavMenu, NavGroup, NavLinkItem,
		Tabs, Tab, Paginator, CommandPalette, CommandPaletteTrigger, Accordion, AccordionItem,
		type CommandPaletteItem
	} from "svelte-fluentui"

	let dialogOpen = $state(false)
	let log = $state<string[]>([])
	let groupExpanded = $state(false)
	let pageIndex = $state(0)
	let paletteOpen = $state(false)
	let tabs = $state(["a", "b"])

	const items: CommandPaletteItem[] = [
		{id: "new", text: "New document", group: "Files", onClick: () => log.push("run:new")},
		{id: "open", text: "Open document", group: "Files", onClick: () => log.push("run:open")},
		{id: "theme", text: "Toggle theme", group: "View", onClick: () => log.push("run:theme")}
	]
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 420px">
	<button id="tip-anchor">Save</button>
	<Tooltip anchor="tip-anchor" delay={0}>Save the document</Tooltip>

	<button id="open-dialog" onclick={() => (dialogOpen = true)}>open dialog</button>

	<div id="badges">
		<Badge onclick={() => log.push("badge")}>Clickable badge</Badge>
		<Badge>Static badge</Badge>
		<Label onclick={() => log.push("label")}>Clickable label</Label>
		<CompositeBadge onLabelClick={() => log.push("composite")}>{#snippet label()}Composite{/snippet}</CompositeBadge>
	</div>

	<NavMenu width="250px">
		<NavGroup id="nav-group" bind:expanded={groupExpanded}>
			{#snippet linkText()}Reports{/snippet}
			<NavLinkItem onclick={() => log.push("nav-child")}>Child</NavLinkItem>
		</NavGroup>
	</NavMenu>

	<Tabs>
		{#each tabs as id (id)}
			<Tab {id} label={`Tab ${id}`} showClose onTabClose={({tab}) => { log.push(`close:${tab.id}`); tabs = tabs.filter(t => t !== tab.id) }}>
				Panel {id}
			</Tab>
		{/each}
	</Tabs>

	<Paginator bind:currentPageIndex={pageIndex} lastPageIndex={4} />

	<CommandPaletteTrigger id="palette-trigger" onclick={() => (paletteOpen = true)} />
	<CommandPalette bind:open={paletteOpen} {items} enableShortcut={false} />

	<Accordion>
		<AccordionItem id="acc-one" heading="One">Body one</AccordionItem>
		<AccordionItem id="acc-two" heading="Two">Body two</AccordionItem>
	</Accordion>
</div>

<Dialog bind:open={dialogOpen} title="With tooltip">
	<button id="dialog-tip-anchor">Inside</button>
	<Tooltip anchor="dialog-tip-anchor" delay={0}>Hint inside the dialog</Tooltip>
</Dialog>

<output id="log">{log.join(" | ")}</output>
<output id="dialog-open">{dialogOpen}</output>
<output id="group-expanded">{groupExpanded}</output>
<output id="page-index">{pageIndex}</output>
