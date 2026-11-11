<script lang="ts">
	import {Tabs, Tab} from "svelte-fluentui"

	let activeId = $state("a")
	let block = $state(true)
	let log = $state<string[]>([])
</script>

<button id="toggle-block" onclick={() => (block = !block)}>toggle block</button>
<Tabs bind:activeId onActiveIdChange={({activeId: id, oldActiveId, tab}) => log.push(`active:${oldActiveId}->${id}:${tab.data?.n}`)}>
	{#snippet childContent()}
		<Tab id="a" label="Alpha" data={{n: 1}}
			beforeLeaveCallback={({tab, newTab}) => { log.push(`leave?${tab.id}->${newTab.id}`); return block ? false : undefined }}>
			{#snippet content()}A{/snippet}
		</Tab>
		<Tab id="b" label="Bravo" data={{n: 2}} showClose
			beforeCloseCallback={async () => false}
			onTabClose={({tab}) => log.push(`close:${tab.id}`)}>
			{#snippet content()}B{/snippet}
		</Tab>
		<Tab id="c" label="Charlie" data={{n: 3}} showClose onTabClose={({tab}) => log.push(`close:${tab.id}`)}>
			{#snippet content()}C{/snippet}
		</Tab>
	{/snippet}
</Tabs>
<output id="active">{activeId}</output>
<output id="log">{log.join(" | ")}</output>
