<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"

	const options = Array.from({length: 40}, (_, i) => ({value: `v${i}`, label: `Option ${i}`}))
	const fruits = [{value: "apple", label: "Apple"}, {value: "banana", label: "Banana"}, {value: "cherry", label: "Cherry"}]
	let items = $state([{id: 1, pick: "v0", fruit: "apple"}])

	const columns = [
		{field: "id", title: "Id", width: "60px"},
		{field: "pick", title: "Pick", width: "200px", editable: true, editor: "select" as const, editorOptions: {options}},
		{field: "fruit", title: "Fruit", width: "120px", editable: true, editor: "select" as const, editorOptions: {options: fruits}}
	]
</script>

<div id="grid-wrap" style="max-width: 400px">
	<QuickGrid {items} {columns} editable editTrigger="dblclick" />
</div>
