<script lang="ts">
	import {Tabs, Tab} from "svelte-fluentui"

	const ids = Array.from({length: 12}, (_, i) => `t${i + 1}`)
	let menuActive = $state("m-t1")
	let ltrActive = $state("l-t1")
	let rtlActive = $state("r-t1")
	let rtlVActive = $state("v-t1")
</script>

<section id="menu" style="width: 320px">
	<Tabs responsive="menu" bind:activeId={menuActive}>
		{#each ids as id (id)}
			<Tab id={`m-${id}`} label={`Menu tab ${id}`}>{#snippet content()}{id}{/snippet}</Tab>
		{/each}
	</Tabs>
	<button id="outside">outside</button>
	<div id="scroller" style="height: 80px; overflow: auto"><div style="height: 400px">scroll me</div></div>
</section>

<section id="ltr" dir="ltr" style="width: 320px">
	<Tabs responsive="scroll" bind:activeId={ltrActive}>
		{#each ids as id (id)}
			<Tab id={`l-${id}`} label={`Tab ${id}`}>{#snippet content()}{id}{/snippet}</Tab>
		{/each}
	</Tabs>
</section>

<section id="rtl" dir="rtl" style="width: 320px">
	<Tabs responsive="scroll" bind:activeId={rtlActive}>
		{#each ids as id (id)}
			<Tab id={`r-${id}`} label={`Tab ${id}`}>{#snippet content()}{id}{/snippet}</Tab>
		{/each}
	</Tabs>
</section>

<section id="rtl-v" dir="rtl" style="width: 320px">
	<Tabs orientation="vertical" bind:activeId={rtlVActive}>
		{#each ids.slice(0, 3) as id (id)}
			<Tab id={`v-${id}`} label={`Tab ${id}`}>{#snippet content()}{id}{/snippet}</Tab>
		{/each}
	</Tabs>
</section>
