<script lang="ts">
	import {Dialog, Combobox, Select, DatePicker, Option} from "svelte-fluentui"

	let noTrapOpen = $state(false)
	let comboOpen = $state(false)
	let combo = $state<string[] | null | undefined>(null)
	let selectValue = $state<string | string[] | undefined>(undefined)
	let date = $state<Date | null>(null)
	let guardedOpen = $state(false)
	let allowClose = $state(false)
	let guardLog = $state<string[]>([])
	let actionsOpen = $state(false)
	let actionLog = $state<string[]>([])
</script>

<button id="outside-button">outside</button>

<button id="open-notrap" onclick={() => (noTrapOpen = true)}>open no-trap</button>
<Dialog bind:open={noTrapOpen} modal={false} trapFocus={false} title="No trap">
	<button id="inside-notrap">inside</button>
</Dialog>

<button id="open-combo" onclick={() => (comboOpen = true)}>open combo dialog</button>
<Dialog bind:open={comboOpen} title="Combo">
	<Combobox id="dialog-combo" bind:value={combo}>
		<Option value="a">Alpha</Option>
		<Option value="b">Bravo</Option>
	</Combobox>
	<Select id="dialog-select" bind:value={selectValue}>
		<Option value="x">Xray</Option>
		<Option value="y">Yankee</Option>
	</Select>
	<DatePicker id="dialog-date" bind:value={date} />
</Dialog>
<output id="combo-open">{comboOpen}</output>

<button id="open-guarded" onclick={() => (guardedOpen = true)}>open guarded</button>
<Dialog bind:open={guardedOpen} title="Guarded"
	beforeCloseCallback={async ({reason}) => { guardLog.push(`before:${reason}`); return allowClose ? undefined : false }}
	onOpenChange={({open}) => guardLog.push(`open:${open}`)}>
	<button id="allow-close" onclick={() => (allowClose = true)}>allow</button>
</Dialog>
<output id="guarded-open">{guardedOpen}</output>
<output id="guard-log">{guardLog.join(",")}</output>

<button id="open-actions" onclick={() => (actionsOpen = true)}>open actions</button>
<Dialog bind:open={actionsOpen} title="Actions"
	primaryAction={{id: "save", text: "Save", onClick: () => { actionLog.push("click:save") }}}
	secondaryAction={{id: "apply", text: "Apply", shouldCloseOnClick: false}}
	onAction={({id}) => actionLog.push(`action:${id}`)}>
	body
</Dialog>
<output id="actions-open">{actionsOpen}</output>
<output id="action-log">{actionLog.join(",")}</output>
