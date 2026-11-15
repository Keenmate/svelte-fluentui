<script lang="ts">
	import {MultiSplitter, MultiSplitterPane} from "svelte-fluentui"

	let log = $state<string[]>([])
	const collapse = (name: string) => ({paneIndex}: {paneIndex: number}) => log.push(`${name}:collapse:${paneIndex}`)
	const expand = (name: string) => ({paneIndex}: {paneIndex: number}) => log.push(`${name}:expand:${paneIndex}`)
</script>

<div style="inline-size: 600px">
	<MultiSplitter id="h3" height="120px" onPaneCollapse={collapse("h3")} onPaneExpand={expand("h3")}>
		<MultiSplitterPane size="200px" min="100px" minimize><div>A</div></MultiSplitterPane>
		<MultiSplitterPane min="100px"><div>B</div></MultiSplitterPane>
		<MultiSplitterPane size="150px" min="80px" max="250px" minimize><div>C</div></MultiSplitterPane>
	</MultiSplitter>

	<MultiSplitter id="v" orientation="vertical" height="300px" step={20}>
		<MultiSplitterPane size="100px"><div>Top</div></MultiSplitterPane>
		<MultiSplitterPane><div>Bottom</div></MultiSplitterPane>
	</MultiSplitter>

	<div style="inline-size: 250px">
		<MultiSplitter id="acc" height="80px">
			<MultiSplitterPane min="100px" minimize><div>One</div></MultiSplitterPane>
			<MultiSplitterPane min="100px" minimize><div>Two</div></MultiSplitterPane>
			<MultiSplitterPane min="100px" minimize><div>Three</div></MultiSplitterPane>
		</MultiSplitter>
	</div>

	<MultiSplitter id="pm" persistKey="e2e-split-min" height="80px">
		<MultiSplitterPane size="200px" minimize><div>Left <button data-multisplitter-toggle id="pm-toggle">toggle</button></div></MultiSplitterPane>
		<MultiSplitterPane><div>Right</div></MultiSplitterPane>
	</MultiSplitter>
</div>
<output id="log">{log.join(" | ")}</output>
