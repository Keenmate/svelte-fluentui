<script lang="ts">
	import {QuickGrid} from "svelte-fluentui"

	const options = Array.from({length: 40}, (_, i) => ({value: `v${i}`, label: `Option ${i}`}))
	let items = $state([{id: 1, pick: "v0"}])

	const columns = [
		{field: "id", title: "Id", width: "60px"},
		{field: "pick", title: "Pick", width: "200px", isEditable: true, editor: "select" as const, editorOptions: {options}}
	]
</script>

<div id="grid-wrap" style="max-width: 400px">
	<QuickGrid {items} {columns} editable editTrigger="dblclick" />
</div>
