<script lang="ts">
	import {TopNav, type TopNavItem} from "svelte-fluentui"

	let log = $state<string[]>([])
	let block = $state(true)
	const items: TopNavItem[] = [
		{id: "act", text: "Do it", onClick: () => log.push("click:act")},
		{id: "nav", text: "Go", href: "/test/menus"},
		{id: "off", text: "Off", isDisabled: true, onClick: () => log.push("click:off")}
	]
</script>

<button id="unblock" onclick={() => (block = false)}>unblock</button>
<TopNav brand="Test" {items} collapse="never"
	onAction={({id}) => log.push(`action:${id}`)}
	beforeActionCallback={({item}) => (item.href && block ? false : undefined)} />
<output id="log">{log.join(" | ")}</output>
