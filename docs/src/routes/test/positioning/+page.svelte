<script lang="ts">
	import {Select, Combobox, DatePicker, Option} from "svelte-fluentui"

	// Fixture for e2e/positioning.spec.ts (helpers/floating.ts). Every field is `position: fixed`
	// at a known spot, so the room above / below doesn't depend on page scroll.
	const many = Array.from({length: 40}, (_, i) => ({value: `i${i}`, label: `Item ${i}`}))

	let asyncOptions = $state(many.slice(0, 1))
	function loadLater({open}: {open: boolean}) {
		if (open) setTimeout(() => (asyncOptions = many), 400)
		else asyncOptions = many.slice(0, 1)
	}
</script>

<div id="top-select" style="position: fixed; top: 10px; left: 10px; width: 240px">
	<Select>
		{#each many as o (o.value)}<Option value={o.value}>{o.label}</Option>{/each}
	</Select>
</div>

<div id="capped-select" style="position: fixed; top: 10px; left: 820px; width: 240px">
	<Select maxDropdownHeight="120px">
		{#each many as o (o.value)}<Option value={o.value}>{o.label}</Option>{/each}
	</Select>
</div>

<div id="bottom-select" style="position: fixed; top: 640px; left: 410px; width: 240px">
	<Select>
		{#each many as o (o.value)}<Option value={o.value}>{o.label}</Option>{/each}
	</Select>
</div>

<div id="filter-combo" style="position: fixed; top: 600px; left: 10px; width: 240px">
	<Combobox options={many} />
</div>

<div id="async-combo" style="position: fixed; top: 560px; left: 820px; width: 240px">
	<Combobox options={asyncOptions} onOpenChange={loadLater} />
</div>

<div id="date" style="position: fixed; top: 150px; left: 410px">
	<DatePicker />
</div>
