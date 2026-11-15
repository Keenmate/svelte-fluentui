<script lang="ts">
	import {Chip, Dialog, Grid, GridItem, Listbox, Option, SiteSettings, Spacer, TabPanel} from "svelte-fluentui"

	let panelActive = $state(false)
	let settingsOpen = $state(false)
	let dialogOpen = $state(false)
	let nonModalOpen = $state(false)
	let removed = $state(0)
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 600px">
	<!-- TabPanel defer -->
	<button id="toggle-panel" onclick={() => (panelActive = !panelActive)}>toggle panel</button>
	<TabPanel id="deferred-panel" defer active={panelActive}>
		<span class="deferred-content">Deferred content</span>
	</TabPanel>
	<TabPanel id="eager-panel" active={false}>
		<span class="eager-content">Eager content</span>
	</TabPanel>

	<!-- SiteSettings children -->
	<button id="open-settings" onclick={() => (settingsOpen = true)}>open settings</button>
	<SiteSettings bind:open={settingsOpen}>
		<p class="extra-setting">Extra app setting</p>
	</SiteSettings>

	<!-- Listbox height -->
	<Listbox id="lb-height" height="100px" ariaLabel="Tall list">
		{#each Array.from({length: 12}, (_, i) => i) as i (i)}
			<Option value={`v${i}`}>Item {i}</Option>
		{/each}
	</Listbox>

	<!-- Grid adaptiveRendering without onBreakpointChange (grid is 500px → xs) -->
	<div style="width: 500px">
		<Grid adaptiveRendering>
			<GridItem xs={12}><span id="adaptive-xs">xs item</span></GridItem>
			<GridItem md={6}><span id="adaptive-md">md-only item</span></GridItem>
		</Grid>
	</div>

	<!-- GridItem hiddenWhen reacts to resize -->
	<Grid>
		<GridItem xs={12} hiddenWhen="md-up"><span id="hidden-md-up">hidden from md up</span></GridItem>
	</Grid>

	<!-- Spacer widths -->
	<div style="display: flex">
		<span>a</span><Spacer id="spacer-rem" width="1rem" /><span>b</span>
		<Spacer id="spacer-num" width={20} /><span>c</span>
		<Spacer id="spacer-numstr" width="30" /><span>d</span>
	</div>

	<!-- Dialog ARIA attributes -->
	<button id="open-dialog" onclick={() => (dialogOpen = true)}>open dialog</button>
	<span id="dlg-desc">Dialog description</span>
	<span id="dlg-title">Dialog title</span>
	<Dialog
		id="aria-dialog"
		bind:open={dialogOpen}
		ariaLabel="Labelled dialog"
		ariaLabelledby="dlg-title"
		ariaDescribedby="dlg-desc"
	>
		Body
	</Dialog>
	<button id="open-nonmodal" onclick={() => (nonModalOpen = true)}>open non-modal</button>
	<Dialog id="nonmodal-dialog" bind:open={nonModalOpen} modal={false} title="Non-modal">Body</Dialog>

	<!-- Chip smoke -->
	<Chip id="chip" text="Prague" onRemove={() => removed++} />
	<Chip id="chip-focusable" text="Tab" removeFocusable onRemove={() => removed++} />
	<Chip id="chip-static" text="Static" showRemove={false} />
	<output id="chip-removed">{removed}</output>
</div>
