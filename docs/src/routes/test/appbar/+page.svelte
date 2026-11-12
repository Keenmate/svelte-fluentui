<script lang="ts">
	import {AppBar, AppBarItem, NavMenu, NavLinkItem, ResourcesIcon} from "svelte-fluentui"

	let count = $state(3)
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
