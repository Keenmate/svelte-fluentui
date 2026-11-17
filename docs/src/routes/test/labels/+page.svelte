<script lang="ts">
	import {
		Alert, Autocomplete, Badge, BadgeGroup, Button, Calendar, Chip, Combobox, CommandPalette, CompositeBadge,
		DatePicker, Dialog, Paginator, Tab, Tabs, TimePicker, Toast
	} from "svelte-fluentui"

	const fruits = [
		{value: "a", label: "Apple"},
		{value: "b", label: "Banana"}
	]

	let paletteDefault = $state(false)
	let paletteCustom = $state(false)
	let dialogOpen = $state({def: false, cus: false})
</script>

{#snippet set(kind: "def" | "cus")}
	{@const c = kind === "cus"}
	<section id="{kind}" style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 420px">
		<TimePicker
			id="{kind}-tp"
			hourCycle="h12"
			value="09:30"
			labels={c ? {placeholder: "Vyberte čas", openPopupAriaLabel: "Otevřít hodiny", popupAriaLabel: "Zvolte čas", clearAriaLabel: "Vymazat čas", clearTooltip: "Vymazat čas",
				hour: "Hodina", minute: "Minuta", period: "Část dne", am: "dop.", pm: "odp.", apply: "Použít"} : undefined}
		/>
		<TimePicker id="{kind}-tp-empty" labels={c ? {placeholder: "Vyberte čas"} : undefined} />

		<DatePicker
			id="{kind}-dp"
			value={new Date(2026, 4, 10)}
			labels={c ? {openPopupAriaLabel: "Otevřít kalendář", popupAriaLabel: "Zvolte datum", clearAriaLabel: "Vymazat datum",
				clearTooltip: "Vymazat datum", previousPeriodAriaLabel: "Předchozí: {title}"} : undefined}
		/>
		<DatePicker id="{kind}-dp-empty" labels={c ? {placeholder: "Vyberte datum"} : undefined} />

		<div id="{kind}-cal">
			<Calendar
				pickerMonth={new Date(2026, 4, 1)}
				labels={c ? {previousPeriodAriaLabel: "Předchozí: {title}", nextPeriodAriaLabel: "Další: {title}", nextPeriodTooltip: "Další: {title}"} : undefined}
			/>
		</div>

		<Paginator
			id="{kind}-pg"
			totalItemCount={200}
			lastPageIndex={9}
			labels={c ? {paginationAriaLabel: "Stránkování", firstPageAriaLabel: "První strana", previousPageAriaLabel: "Předchozí strana",
				nextPageAriaLabel: "Další strana", lastPageAriaLabel: "Poslední strana", lastPageTooltip: "Poslední strana",
				pageInfo: "Strana {page} z {pageCount}", itemCount: "{count} položek"} : undefined}
		/>

		<Combobox
			id="{kind}-cb"
			multiple
			options={fruits}
			value={["a"]}
			labels={c ? {removeAriaLabel: "Odebrat {item}", noMatches: "Nic nenalezeno"} : undefined}
		/>

		<Autocomplete
			id="{kind}-ac"
			options={fruits}
			value={["a"]}
			labels={c ? {removeAriaLabel: "Odebrat {item}", openPopupAriaLabel: "Zobrazit možnosti", noMatches: "Nic nenalezeno"} : undefined}
		/>
		<Autocomplete id="{kind}-ac-empty" options={fruits} labels={c ? {placeholder: "Hledejte..."} : undefined} />

		<Chip id="{kind}-chip" text="Praha" labels={c ? {removeAriaLabel: "Smazat {item}", removeTooltip: "Smazat {item}"} : undefined} />

		<CompositeBadge id="{kind}-cbadge" labels={c ? {dismissAriaLabel: "Zavřít"} : undefined}>
			{#snippet label()}Stav{/snippet}
		</CompositeBadge>

		<Alert id="{kind}-alert" dismissible labels={c ? {dismissAriaLabel: "Skrýt"} : undefined}>Upozornění</Alert>

		<Toast id="{kind}-toast" title="Uloženo" topCTAType="dismiss" labels={c ? {dismissAriaLabel: "Zavřít oznámení", dismissTooltip: "Zavřít"} : undefined} />

		<div id="{kind}-tabs">
			<Tabs labels={c ? {closeAriaLabel: "Zavřít kartu", closeTooltip: "Zavřít"} : undefined}>
				<Tab id="{kind}-tab-1" label="Jedna" showClose>Obsah</Tab>
			</Tabs>
		</div>

		<div id="{kind}-bg">
			<BadgeGroup maxVisibleBadgeCount={1} expandable labels={c ? {showMore: "+{count} další"} : undefined}>
				<Badge>A</Badge>
				<Badge>B</Badge>
				<Badge>C</Badge>
			</BadgeGroup>
		</div>

		<div id="{kind}-dialog">
			<Button id="{kind}-dialog-open" onclick={() => (dialogOpen[kind] = true)}>Dialog</Button>
			<Dialog id="{kind}-dlg" bind:open={dialogOpen[kind]} modal={false} title="Titulek" dismissible labels={c ? {closeAriaLabel: "Zavřít dialog", dismiss: "Zrušit"} : undefined}>
				Obsah
			</Dialog>
		</div>

		<Button id="{kind}-palette-open" onclick={() => c ? (paletteCustom = true) : (paletteDefault = true)}>Palette</Button>
	</section>
{/snippet}

<div style="display: flex; gap: 2rem">
	{@render set("def")}
	{@render set("cus")}
</div>

<CommandPalette items={[]} bind:open={paletteDefault} enableShortcut={false} />
<CommandPalette
	items={[]}
	bind:open={paletteCustom}
	enableShortcut={false}
	labels={{dialogAriaLabel: "Paleta příkazů", placeholder: "Hledat…", resultsAriaLabel: "Výsledky", escapeHint: "esc zavře",
		empty: "Žádné položky", navigateHint: "pohyb", selectHint: "výběr", toggleHint: "přepnout"}}
/>
