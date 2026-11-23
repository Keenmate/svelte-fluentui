<script lang="ts">
	import {Button, Toast, QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"
	let showToast = $state(false)
	let toastId = "demo-toast"

	// One handler for every link: `id` is "top" / "primary" / "secondary" for plain-text actions.
	function handleAction({id}: {id?: string}) {
		if (id === "secondary") showToast = false
		console.log(`${id} action clicked`)
	}

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "id", type: "string", default: "undefined", description: "Unique toast ID"},
		{name: "title", type: "string", default: "undefined", description: "Main message or heading"},
		{name: "timestamp", type: "Date", default: "undefined", description: 'Displayed (as local HH:mm) if topCTAType is "timestamp"'},
		{name: "topCTAType", type: '"dismiss" | "timestamp" | "action"', default: "undefined", description: "What to show at the header's end"},
		{name: "topAction", type: "string | ActionItem", default: "undefined", description: "Top right action link (with topCTAType=\"action\"); a plain string gets id \"top\""},
		{name: "primaryAction", type: "string | ActionItem", default: "undefined", description: "Primary link at the bottom; a plain string gets id \"primary\""},
		{name: "secondaryAction", type: "string | ActionItem", default: "undefined", description: "Secondary link at the bottom; a plain string gets id \"secondary\""},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the root div"},
		{name: "labels", type: "ToastLabels", default: "undefined", description: "Overrides the built-in text for this instance (svelteFluentUI.toast.* keys; see Guides → Translations). Keys: dismissAriaLabel (× button name), dismissTooltip (× tooltip)."},
	]

	const callbacks: Property[] = [
		{name: "onDismiss", type: "(ctx: {sourceEvent: MouseEvent}) => void", default: "undefined", description: "Fires when the user clicks the dismiss (×) button; the toast does not remove itself"},
		{name: "onAction", type: "(detail: {action, id, item, source, sourceEvent}) => void", default: "undefined", description: "Fires after any action link ran; id tells which"},
		{name: "beforeActionCallback", type: "(detail) => unknown", default: "undefined", description: "Called before an action link runs; return false (or resolve to false) to cancel"}
	]

	const slots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Additional message or markup content"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="Toast"
		description="Declarative Svelte notification card with title, subtitle, timestamp, and primary/secondary actions, rendered in place. Inspired by FluentUI Blazor."
		keywords="svelte, fluentui, toast, notification, snackbar, message, alert"
	/>

	<h1>Toast (Declarative Component)</h1>

	<p>
		A notification card with title, subtitle, timestamp, and primary/secondary actions, rendered
		declaratively in place. Inspired by the FluentUI Blazor Toast component. For programmatic toasts
		triggered from anywhere, see <code>ToastService</code>.
	</p>

	<Card>
		<p>
			<strong>ℹ️ Note:</strong> This is the declarative <code>&lt;Toast&gt;</code> component for manual state management.
			For programmatic toasts (call <code>toast.success()</code> from anywhere), see the
			<a href="/components/toast-service"><strong>Toast Service</strong></a> instead.
		</p>
	</Card>

	<References links={[
		{label: "MessageBar", href: "https://storybooks.fluentui.dev/web-components/?path=/docs/components-messagebar-messagebar--docs"},
		{label: "FluentUI Blazor MessageBar", href: "https://www.fluentui-blazor.net/MessageBar"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Toast with timestamp</h3>
		<Toast title="Auto-saved" timestamp={new Date()} topCTAType="timestamp" />
		<Button onclick={() => (showToast = true)}>Show Toast</Button>

		{#if showToast}
			<div class="toast-container">
				<Toast
					id={toastId}
					title="Saved Successfully"
					timestamp={new Date()}
					topCTAType="action"
					topAction="Undo"
					primaryAction="View Details"
					secondaryAction="Dismiss"
					onAction={handleAction}
				></Toast>
			</div>
		{/if}
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Properties</h2>
				<QuickGrid items={properties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Callbacks</h2>
				<QuickGrid items={callbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Slots</h2>
				<QuickGrid items={slots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>
</Stack>

<style>
	.toast-container {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		width: 300px;
	}
</style>
