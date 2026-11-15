<script lang="ts">
	import {Tabs, Tab} from "svelte-fluentui"

	let kbActive = $state("k1")
	let swipeActive = $state("s1")
	let vActive = $state("v1")
	let menuActive = $state("m1")
	let log = $state<string[]>([])
	const ids = Array.from({length: 10}, (_, i) => i + 1)
</script>

<section id="kb" style="inline-size: 600px">
	<Tabs bind:activeId={kbActive}>
		<Tab id="k1" label="One">{#snippet content()}1{/snippet}</Tab>
		<Tab id="k2" label="Two" disabled>{#snippet content()}2{/snippet}</Tab>
		<Tab id="k3" label="Three" showClose onTabClose={({tab}) => log.push(`close:${tab.id}`)}>{#snippet content()}3{/snippet}</Tab>
		<Tab id="k4" label="Four">{#snippet content()}4{/snippet}</Tab>
		<Tab id="k5" label="Hidden" visible={false}>{#snippet content()}5{/snippet}</Tab>
	</Tabs>
</section>

<section id="swipe" style="inline-size: 600px">
	<Tabs bind:activeId={swipeActive}>
		<Tab id="s1" label="S one">{#snippet content()}<div class="pad" style="block-size: 120px">one <input id="swipe-input" /></div>{/snippet}</Tab>
		<Tab id="s2" label="S two" disabled>{#snippet content()}<div class="pad" style="block-size: 120px">two</div>{/snippet}</Tab>
		<Tab id="s3" label="S three">{#snippet content()}<div class="pad" style="block-size: 120px">three</div>{/snippet}</Tab>
	</Tabs>
</section>

<section id="noswipe" style="inline-size: 600px">
	<Tabs swipe={false}>
		<Tab id="n1" label="N one">{#snippet content()}<div class="pad" style="block-size: 120px">one</div>{/snippet}</Tab>
		<Tab id="n2" label="N two">{#snippet content()}<div class="pad" style="block-size: 120px">two</div>{/snippet}</Tab>
	</Tabs>
</section>

<section id="vert" style="inline-size: 600px">
	<Tabs orientation="vertical" bind:activeId={vActive} stripWidth="120px">
		<Tab id="v1" label="Vertical one">{#snippet content()}1{/snippet}</Tab>
		<Tab id="v2" label="Vertical two with a long label">{#snippet content()}2{/snippet}</Tab>
		<Tab id="v3" label="Vertical three">{#snippet content()}3{/snippet}</Tab>
	</Tabs>
</section>

<section id="wrap" style="inline-size: 300px">
	<Tabs responsive="wrap" activeId="w8">
		{#each ids as n (n)}
			<Tab id={`w${n}`} label={`Wrap ${n}`}>{#snippet content()}{n}{/snippet}</Tab>
		{/each}
	</Tabs>
</section>

<section id="menu" style="inline-size: 360px">
	<Tabs responsive="menu" bind:activeId={menuActive}>
		{#each ids as n (n)}
			<Tab id={`m${n}`} label={`Menu ${n}`}>{#snippet content()}{n}{/snippet}</Tab>
		{/each}
	</Tabs>
	<button id="set-m9" onclick={() => (menuActive = "m9")}>activate m9</button>
</section>

<output id="log">{log.join(" | ")}</output>
