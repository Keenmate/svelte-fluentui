<script lang="ts">
	import {page} from "$app/state"
	import {QuickGrid} from "svelte-fluentui"
	import type {QuickGridColumn} from "svelte-fluentui"

	// QuickGrid performance fixture: N rows × 8 columns, display callbacks on most of them.
	// Query: ?rows=2000 (default), &virtualize. Spec: e2e/quickgrid-perf.spec.ts (timings with QG_PERF=1).

	type PerfRow = {id: number; name: string; city: string; amount: number; created: Date; status: string; email: string; score: number}

	const rowCount = Number(page.url.searchParams.get("rows") ?? 2000)
	const virtualize = page.url.searchParams.has("virtualize")
	const cities: Record<string, string> = {ZRH: "Zürich", PRG: "Praha", OSL: "Oslo", MUC: "München", LDZ: "Łódź", WAW: "Warszawa"}
	const cityCodes = Object.keys(cities)
	const statuses: Record<string, string> = {o: "Open", c: "Closed", p: "Pending", a: "Archived"}
	const statusCodes = Object.keys(statuses)
	const first = ["Anna", "Bořek", "Chloé", "Dmitri", "Eva", "František", "Göran", "Hana", "Ivo", "Jürgen"]
	const last = ["Novák", "Müller", "Dvořák", "Søren", "Kowalski", "Smith", "Øberg", "Černý"]

	function makeRows(n: number): PerfRow[] {
		const rows: PerfRow[] = []
		for (let i = 1; i <= n; i++) {
			const name = `${first[i % first.length]} ${last[(i * 7) % last.length]} ${i}`
			rows.push({
				id: i,
				name,
				city: cityCodes[i % cityCodes.length],
				amount: (i * 7919) % 100000 / 7,
				created: new Date(2020, i % 12, (i % 28) + 1),
				status: statusCodes[i % statusCodes.length],
				email: `user${i}@example.com`,
				score: (i * 31) % 101
			})
		}
		return rows
	}

	let rows = $state(makeRows(rowCount))
	let show = $state(false)

	// Counts how often the display callbacks run (read by the perf spec as window.__qgDisplayCalls).
	const counter = globalThis as unknown as {__qgDisplayCalls: number}
	counter.__qgDisplayCalls = 0
	const count = () => counter.__qgDisplayCalls++
	let culture = $state(new Intl.Locale("en-US"))
	let money = $derived(new Intl.NumberFormat(culture.baseName, {style: "currency", currency: "EUR"}))

	let columns = $derived<QuickGridColumn<PerfRow>[]>([
		{field: "id", title: "Id", width: "70px"},
		{field: "name", title: "Name"},
		{field: "city", title: "City", getDisplayValueCallback: ({value}) => (count(), cities[value as string] ?? String(value))},
		{field: "amount", title: "Amount", getDisplayValueCallback: ({value}) => (count(), money.format(value as number))},
		{field: "created", title: "Created"},
		{field: "status", title: "Status", getDisplayValueCallback: ({value}) => (count(), statuses[value as string] ?? "")},
		{field: "email", title: "E-mail"},
		{field: "score", title: "Score", getDisplayValueCallback: ({value}) => (count(), `${value} pts`)}
	])
</script>

<h1>QuickGrid perf</h1>
<p>
	<button type="button" id="perf-mount" onclick={() => (show = !show)}>Toggle grid</button>
	<span id="perf-row-count">{rows.length}</span>
</p>

{#if show}
	<div id="perf-wrap">
		<QuickGrid items={rows} idMember="id" {columns} {culture} filterable sortMode="single" {virtualize} />
	</div>
{/if}
