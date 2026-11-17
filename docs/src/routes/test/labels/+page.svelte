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
			labels={c ? {placeholder: "Vyberte čas", openPicker: "Otevřít hodiny", popup: "Zvolte čas", clear: "Vymazat čas",
				hour: "Hodina", minute: "Minuta", period: "Část dne", am: "dop.", pm: "odp.", apply: "Použít"} : undefined}
		/>
		<TimePicker id="{kind}-tp-empty" labels={c ? {placeholder: "Vyberte čas"} : undefined} />

		<DatePicker
			id="{kind}-dp"
			value={new Date(2026, 4, 10)}
			labels={c ? {openCalendar: "Otevřít kalendář", popup: "Zvolte datum", clear: "Vymazat datum",
				previousPeriod: (t) => `Předchozí: ${t}`} : undefined}
		/>
		<DatePicker id="{kind}-dp-empty" labels={c ? {placeholder: "Vyberte datum"} : undefined} />

		<div id="{kind}-cal">
			<Calendar
				pickerMonth={new Date(2026, 4, 1)}
				labels={c ? {previousPeriod: (t) => `Předchozí: ${t}`, nextPeriod: (t) => `Další: ${t}`} : undefined}
			/>
		</div>

		<Paginator
			id="{kind}-pg"
			totalItemCount={200}
			lastPageIndex={9}
			labels={c ? {pagination: "Stránkování", firstPage: "První strana", previousPage: "Předchozí strana",
				nextPage: "Další strana", lastPage: "Poslední strana",
				pageInfo: (p, n) => `Strana ${p} z ${n}`, itemCount: (n) => `${n} položek`} : undefined}
		/>

		<Combobox
			id="{kind}-cb"
			multiple
			options={fruits}
			value={["a"]}
			labels={c ? {removeChip: (l) => `Odebrat ${l}`, emptyText: "Nic nenalezeno"} : undefined}
		/>

		<Autocomplete
			id="{kind}-ac"
			options={fruits}
			value={["a"]}
			labels={c ? {removeChip: (l) => `Odebrat ${l}`, showOptions: "Zobrazit možnosti", emptyText: "Nic nenalezeno"} : undefined}
		/>
		<Autocomplete id="{kind}-ac-empty" options={fruits} labels={c ? {placeholder: "Hledejte..."} : undefined} />

		<Chip id="{kind}-chip" text="Praha" labels={c ? {remove: (t) => `Smazat ${t}`} : undefined} />

		<CompositeBadge id="{kind}-cbadge" labels={c ? {dismiss: "Zavřít"} : undefined}>
			{#snippet label()}Stav{/snippet}
		</CompositeBadge>

		<Alert id="{kind}-alert" dismissible labels={c ? {dismissAriaLabel: "Skrýt"} : undefined}>Upozornění</Alert>

		<Toast id="{kind}-toast" title="Uloženo" topCTAType="dismiss" labels={c ? {dismiss: "Zavřít oznámení", dismissTitle: "Zavřít"} : undefined} />

		<div id="{kind}-tabs">
			<Tabs labels={c ? {closeTab: "Zavřít kartu", closeTabTitle: "Zavřít"} : undefined}>
				<Tab id="{kind}-tab-1" label="Jedna" showClose>Obsah</Tab>
			</Tabs>
		</div>

		<div id="{kind}-bg">
			<BadgeGroup maxVisibleBadgeCount={1} expandable labels={c ? {more: (n) => `+${n} další`} : undefined}>
				<Badge>A</Badge>
				<Badge>B</Badge>
				<Badge>C</Badge>
			</BadgeGroup>
		</div>

		<div id="{kind}-dialog">
			<Button id="{kind}-dialog-open" onclick={() => (dialogOpen[kind] = true)}>Dialog</Button>
			<Dialog id="{kind}-dlg" bind:open={dialogOpen[kind]} modal={false} title="Titulek" dismissible labels={c ? {close: "Zavřít dialog", dismiss: "Zrušit"} : undefined}>
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
	labels={{dialog: "Paleta příkazů", placeholder: "Hledat…", results: "Výsledky", escapeHint: "esc zavře",
		noItems: "Žádné položky", navigateHint: "pohyb", selectHint: "výběr", toggleHint: "přepnout"}}
/>
