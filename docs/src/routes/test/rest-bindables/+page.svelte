<script lang="ts">
	import {
		Accordion, AccordionItem, Badge, BadgeGroup, BreadcrumbItem, Breadcrumb, Button, Card, Stack,
		Tooltip
	} from "svelte-fluentui"

	let log = $state<string[]>([])
	let itemExpanded = $state(false)
	let standaloneExpanded = $state<boolean | undefined>(undefined)
	let showAll = $state(false)
	let tipVisible = $state<boolean | undefined>(undefined)
</script>

<section id="rest">
	<Button data-testid="btn" id="btn-id" onkeydown={(e) => log.push(`btn-key:${(e as KeyboardEvent).key}`)}>Button</Button>
	<Card data-testid="card" role="region" aria-label="Card label" onclick={() => log.push("card-click")}>Card</Card>
	<Badge data-testid="badge" id="badge-id">Badge</Badge>
	<Stack data-testid="stack" id="stack-id">stack</Stack>
	<Breadcrumb aria-label="Trail">
		<BreadcrumbItem data-testid="crumb" href="#x" onclick={(e) => { e.preventDefault(); log.push("crumb-click") }}>Crumb</BreadcrumbItem>
	</Breadcrumb>
	<output id="log">{log.join(",")}</output>
</section>

<section id="accordion">
	<Accordion>
		<AccordionItem id="acc-bound" heading="Bound" bind:expanded={itemExpanded}>Bound body</AccordionItem>
	</Accordion>
	<AccordionItem id="acc-standalone" heading="Standalone" bind:expanded={standaloneExpanded}>Standalone body</AccordionItem>
	<output id="acc-state">{String(itemExpanded)}|{String(standaloneExpanded)}</output>
</section>

<section id="group">
	<BadgeGroup limit={2} expandable bind:showAll>
		<Badge>A</Badge>
		<Badge>B</Badge>
		<Badge>C</Badge>
		<Badge>D</Badge>
	</BadgeGroup>
	<output id="group-state">{showAll}</output>
</section>

<section id="tooltip">
	<span id="tip-anchor">Anchor</span>
	<Tooltip anchor="tip-anchor" delay={0} bind:visible={tipVisible} data-testid="tip">Tip text</Tooltip>
	<button id="tip-toggle" onclick={() => (tipVisible = !tipVisible)}>toggle</button>
	<output id="tip-state">{String(tipVisible)}</output>
</section>
