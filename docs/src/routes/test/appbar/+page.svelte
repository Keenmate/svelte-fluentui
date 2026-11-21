<script lang="ts">
	import {AppBar, AppBarItem, NavMenu, NavLinkItem, ResourcesIcon} from "svelte-fluentui"

	let count = $state(3)
	let barHeight = $state(200)
	let actionCount = $state(0)
	let activeId = $state("ov-1")
	let clicked = $state("")
	let overflowEvents = $state<boolean[]>([])
	const overflowItems = ["Resources", "Console", "Logs", "Traces", "Metrics", "Žurnál", "Settings"]
</script>

{#snippet itemIcon()}
	<ResourcesIcon aria-hidden="true" part="icon-rest" />
	<ResourcesIcon aria-hidden="true" part="icon-active" active />
{/snippet}

<button id="inc" onclick={() => (count += 1)}>inc</button>
<button id="zero" onclick={() => (count = 0)}>zero</button>
<button id="big" onclick={() => (count = 250)}>big</button>

<span id="ext-label">Messages</span>

<AppBar>
	<AppBarItem id="inbox" href="#inbox" icon={itemIcon} {count}>Inbox</AppBarItem>
	<AppBarItem id="capped" href="#capped" icon={itemIcon} count={120} maxCount={9}>Capped</AppBarItem>
	<AppBarItem id="none" href="#none" icon={itemIcon}>None</AppBarItem>
	<AppBarItem id="worded" href="#worded" icon={itemIcon} {count} countLabel={(n) => `${n} unread`}>Worded</AppBarItem>
	<AppBarItem id="labelled" href="#labelled" icon={itemIcon} {count} countLabel={(n) => `${n} unread`} aria-label="Mailbox">Inbox</AppBarItem>
	<AppBarItem id="labelledby" href="#labelledby" icon={itemIcon} {count} aria-labelledby="ext-label">Inbox</AppBarItem>
	<AppBarItem id="labelled-nocount" href="#labelled-nocount" icon={itemIcon} aria-label="Plain label">Other</AppBarItem>
	<AppBarItem id="ext" href="https://example.com" target="_blank" rel="noopener noreferrer" icon={itemIcon}>External</AppBarItem>
</AppBar>

<NavMenu>
	<NavLinkItem
		id="nav-download"
		class="outer-class"
		data-outer="yes"
		href="/files/report.csv"
		linkProps={{download: "report.csv", "data-inner": "yes", hreflang: "en"}}
	>Download</NavLinkItem>
	<NavLinkItem
		id="nav-external"
		href="https://example.com"
		target="_blank"
		linkProps={{rel: "noopener", target: "_self"}}
	>External</NavLinkItem>
</NavMenu>

<!-- Overflow: a 200px-high vertical bar fits 3 of 7 items; the rest go into the "…" popover. -->
<button id="grow" onclick={() => (barHeight = 600)}>grow</button>
<span id="clicked">{clicked}</span>
<span id="overflow-events">{overflowEvents.join(",")}</span>
<div id="ov-box" style="block-size: {barHeight}px">
	<AppBar id="ov-bar" showSearch onOverflowOpenChange={({open}) => (overflowEvents = [...overflowEvents, open])}>
		{#each overflowItems as label, i (label)}
			<AppBarItem
				id="ov-{i}"
				href="#ov-{i}"
				icon={itemIcon}
				active={activeId === `ov-${i}`}
				count={i === 5 ? 4 : undefined}
				tooltip={i === 0 ? "Resources tooltip" : undefined}
				onclick={(ev) => { ev.preventDefault(); activeId = `ov-${i}`; clicked = label }}
			>{label}</AppBarItem>
		{/each}
	</AppBar>
</div>

<span id="action-count">{actionCount}</span>
<AppBar id="btn-bar">
	<AppBarItem id="action" icon={itemIcon} onclick={() => (actionCount += 1)}>Action</AppBarItem>
</AppBar>

<div id="h-box" style="inline-size: 260px">
	<AppBar id="h-bar" orientation="horizontal">
		<AppBarItem id="h-0" href="#h-0" icon={itemIcon} active>One</AppBarItem>
		<AppBarItem id="h-1" href="#h-1" icon={itemIcon}>Two</AppBarItem>
		<AppBarItem id="h-2" href="#h-2" icon={itemIcon}>Three</AppBarItem>
		<AppBarItem id="h-3" href="#h-3" icon={itemIcon}>Four</AppBarItem>
		<AppBarItem id="h-4" href="#h-4" icon={itemIcon}>Five</AppBarItem>
	</AppBar>
</div>
