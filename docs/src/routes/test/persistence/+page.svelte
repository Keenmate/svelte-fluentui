<script lang="ts">
	import {MultiSplitter, MultiSplitterPane, NavMenu, NavGroup, NavLinkItem} from "svelte-fluentui"
</script>

<div style="inline-size: 600px">
	<MultiSplitter id="split-persisted" persistKey="e2e-persisted" height="120px">
		<MultiSplitterPane size="200px" min="100px"><div>A</div></MultiSplitterPane>
		<MultiSplitterPane><div>B</div></MultiSplitterPane>
	</MultiSplitter>

	<MultiSplitter id="split-plain" height="120px">
		<MultiSplitterPane size="200px" min="100px"><div>A</div></MultiSplitterPane>
		<MultiSplitterPane><div>B</div></MultiSplitterPane>
	</MultiSplitter>
</div>

<NavMenu width="250px">
	<NavGroup id="group-persisted" persistKey="e2e-group">
		{#snippet linkText()}Persisted group{/snippet}
		<NavLinkItem>Persisted child</NavLinkItem>
	</NavGroup>
	<NavGroup id="group-plain" title="Plain group tooltip">
		{#snippet linkText()}Plain group{/snippet}
		<NavLinkItem>Plain child</NavLinkItem>
	</NavGroup>
</NavMenu>
