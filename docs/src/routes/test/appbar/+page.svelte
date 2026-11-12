<script lang="ts">
	import {AppBar, AppBarItem, ResourcesIcon} from "svelte-fluentui"

	let count = $state(3)
</script>

{#snippet itemIcon()}
	<ResourcesIcon aria-hidden="true" part="icon-rest" />
	<ResourcesIcon aria-hidden="true" part="icon-active" active />
{/snippet}

<button id="inc" onclick={() => (count += 1)}>inc</button>
<button id="zero" onclick={() => (count = 0)}>zero</button>
<button id="big" onclick={() => (count = 250)}>big</button>

<AppBar>
	<AppBarItem id="inbox" href="#inbox" icon={itemIcon} {count}>Inbox</AppBarItem>
	<AppBarItem id="capped" href="#capped" icon={itemIcon} count={120} maxCount={9}>Capped</AppBarItem>
	<AppBarItem id="none" href="#none" icon={itemIcon}>None</AppBarItem>
</AppBar>
