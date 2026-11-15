<script lang="ts">
	import {QuickGrid, Dialog, Button, Checkbox, Stack} from "svelte-fluentui"
	import type {
		QuickGridBeforeCommitContext,
		QuickGridCellValidationState,
		QuickGridColumn,
		QuickGridCustomEditorContext,
		QuickGridEditorOption,
		QuickGridRowChangeDetail
	} from "svelte-fluentui"

	// A project task tracker that uses every QuickGrid editor type in one grid,
	// including a dependent dropdown, row-aware validation and a multi-value cell.

	type Task = {
		id: number
		title: string
		assignee: string | null
		team: string
		component: string | null
		start: string
		due: string
		estimate: number
		done: boolean
		labels: string[]
	}

	let tasks = $state<Task[]>([
		{id: 1, title: "Login page redesign", assignee: "jose", team: "web", component: "auth-ui", start: "2026-11-02", due: "2026-11-20", estimate: 16, done: false, labels: ["ux", "frontend"]},
		{id: 2, title: "Token refresh endpoint", assignee: "zoe", team: "api", component: "auth-api", start: "2026-11-05", due: "2026-11-12", estimate: 6, done: true, labels: ["backend"]},
		{id: 3, title: "Offline sync", assignee: "francois", team: "mobile", component: "sync", start: "2026-11-10", due: "2026-12-04", estimate: 40, done: false, labels: ["backend", "risk"]},
		{id: 4, title: "Invoice PDF export", assignee: null, team: "api", component: null, start: "2026-11-16", due: "2026-11-27", estimate: 12, done: false, labels: []}
	])

	// --- Assignee: async autocomplete (simulated API, accent-insensitive) ---
	const people: QuickGridEditorOption[] = [
		{value: "jose", label: "José García"},
		{value: "francois", label: "François Müller"},
		{value: "zoe", label: "Zoë Brontë"},
		{value: "soren", label: "Søren Østergård"},
		{value: "agnes", label: "Ágnes Németh"},
		{value: "renee", label: "Renée Lefèvre"},
		{value: "lukasz", label: "Łukasz Wójcik"},
		{value: "hakon", label: "Håkon Ødegård"}
	]
	const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
	async function searchPeople({term, signal}: {term: string; signal?: AbortSignal}) {
		await new Promise(resolve => setTimeout(resolve, 300)) // fake network delay
		if (signal?.aborted) return []
		return people.filter(p => fold(p.label).includes(fold(term)))
	}

	// --- Team: static select ---
	const teams: QuickGridEditorOption[] = [
		{value: "web", label: "Web"},
		{value: "api", label: "API"},
		{value: "mobile", label: "Mobile"}
	]

	// --- Component: combobox whose options depend on the row's team ---
	const componentsByTeam: Record<string, QuickGridEditorOption[]> = {
		web: [{value: "auth-ui", label: "Auth UI"}, {value: "dashboard", label: "Dashboard"}, {value: "settings-ui", label: "Settings"}],
		api: [{value: "auth-api", label: "Auth service"}, {value: "billing", label: "Billing"}, {value: "reports", label: "Reports"}],
		mobile: [{value: "sync", label: "Offline sync"}, {value: "push", label: "Push notifications"}, {value: "camera", label: "Camera"}]
	}
	const allComponents = Object.values(componentsByTeam).flat()
	async function loadComponents({row, signal}: {row: Task; signal: AbortSignal}) {
		await new Promise(resolve => setTimeout(resolve, 200))
		if (signal.aborted) return []
		return componentsByTeam[row.team] ?? []
	}

	// --- Labels: custom editor (several values in one cell, edited in a dialog) ---
	const allLabels = ["frontend", "backend", "ux", "risk", "tech-debt"]
	let labelsContext = $state<QuickGridCustomEditorContext<Task> | null>(null)
	let labelsDraft = $state<string[]>([])
	function openLabels(ctx: QuickGridCustomEditorContext<Task>) {
		labelsContext = ctx
		labelsDraft = [...((ctx.value as string[]) ?? [])]
	}
	function toggleLabel(label: string, checked: boolean | null) {
		labelsDraft = checked ? [...labelsDraft, label] : labelsDraft.filter(l => l !== label)
	}
	function saveLabels() {
		labelsContext?.commit(allLabels.filter(l => labelsDraft.includes(l)))
		labelsContext = null
	}
	function cancelLabels() {
		labelsContext?.cancel()
		labelsContext = null
	}

	const labelOf = (options: QuickGridEditorOption[], value: unknown) =>
		options.find(o => o.value === value)?.label ?? ""
	const formatDate = (value: string) =>
		value ? new Date(value).toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : ""
	const isoDay = (value: unknown) =>
		value ? new Date(value as string).toISOString().slice(0, 10) : ""

	const columns: QuickGridColumn<Task>[] = [
		{
			field: "title",
			title: "Task (text)",
			width: "200px",
			editable: true,
			editor: "text",
			editorOptions: {maxLength: 60, placeholder: "What needs doing?"},
			beforeCommitCallback: ({value}: QuickGridBeforeCommitContext<Task>) => {
				const text = String(value ?? "").trim()
				if (text.length < 3) return "A task needs at least 3 characters"
				return {valid: true, transformedValue: text}
			}
		},
		{
			field: "assignee",
			title: "Assignee (autocomplete)",
			headerInfo: "Async search; accents don't matter (try jose, soren, lukasz)",
			width: "190px",
			editable: true,
			editor: "autocomplete",
			getDisplayValueCallback: ({value}) => labelOf(people, value) || "Unassigned",
			editorOptions: {
				initialOptions: people.slice(0, 4),
				searchCallback: searchPeople,
				minSearchLength: 1,
				searchDelay: 200,
				allowEmpty: true,
				placeholder: "Search people…"
			}
		},
		{
			field: "team",
			title: "Team (select)",
			width: "120px",
			editable: true,
			editor: "select",
			getDisplayValueCallback: ({value}) => labelOf(teams, value),
			editorOptions: {options: teams}
		},
		{
			field: "component",
			title: "Component (combobox)",
			headerInfo: "Options depend on the row's team; changing the team clears it",
			width: "180px",
			editable: true,
			editor: "combobox",
			getDisplayValueCallback: ({value}) => labelOf(allComponents, value) || "—",
			editorOptions: {loadOptionsCallback: loadComponents, allowEmpty: true, placeholder: "Filter…"}
		},
		{
			field: "start",
			title: "Start (date)",
			width: "130px",
			editable: true,
			editor: "date",
			getDisplayValueCallback: ({value}) => formatDate(value),
			editorOptions: {outputFormat: "iso"},
			beforeCommitCallback: ({value, row}: QuickGridBeforeCommitContext<Task>) => {
				if (!value) return "Start date is required"
				const day = isoDay(value)
				if (day > row.due) return "Start can't be after the due date"
				return {valid: true, transformedValue: day}
			}
		},
		{
			field: "due",
			title: "Due (date)",
			width: "130px",
			editable: true,
			editor: "date",
			getDisplayValueCallback: ({value}) => formatDate(value),
			editorOptions: {outputFormat: "iso"},
			beforeCommitCallback: ({value, row}: QuickGridBeforeCommitContext<Task>) => {
				if (!value) return "Due date is required"
				const day = isoDay(value)
				if (day < row.start) return "Due date can't be before the start"
				return {valid: true, transformedValue: day}
			}
		},
		{
			field: "estimate",
			title: "Estimate h (number)",
			width: "130px",
			align: "end",
			editable: true,
			editor: "number",
			editorOptions: {min: 0.5, max: 80, step: 0.5},
			beforeCommitCallback: ({value}: QuickGridBeforeCommitContext<Task>) => {
				const hours = Number(value)
				if (!Number.isFinite(hours) || hours < 0.5 || hours > 80) return "Between 0.5 and 80 hours"
				return {valid: true, transformedValue: Math.round(hours * 2) / 2}
			}
		},
		{
			field: "done",
			title: "Done (checkbox)",
			width: "110px",
			align: "center",
			editable: true,
			editor: "checkbox"
		},
		{
			field: "labels",
			title: "Labels (custom)",
			headerInfo: "Several values in one cell — edited in a dialog",
			width: "170px",
			editable: true,
			editor: "custom",
			showEditButton: true,
			getDisplayValueCallback: ({value}) => (value as string[])?.length ? (value as string[]).join(", ") : "—",
			editCallback: openLabels
		}
	]

	let invalidCells = $state<QuickGridCellValidationState[]>([])
	let log = $state<string[]>([])

	function handleRowChange(detail: QuickGridRowChangeDetail<Task>) {
		if (!detail.isValid) {
			log = [`✗ ${detail.field}: ${detail.validationError}`, ...log].slice(0, 6)
			return
		}
		// Store the committed field only: `draftRow` would also carry the row's other pending
		// invalid values (listed in `invalidFields`), which stay in the grid until fixed.
		const next = {...detail.row, [detail.field]: detail.newValue} as Task
		// Dependent field: a component belongs to one team, so a team change clears it.
		if (detail.field === "team" && detail.oldValue !== detail.newValue) next.component = null
		tasks[detail.itemIndex] = next
		const pending = detail.isRowValid ? "" : ` (still invalid: ${detail.invalidFields.map((f) => f.field).join(", ")})`
		log = [`✓ #${next.id} ${detail.field}: ${JSON.stringify(detail.oldValue)} → ${JSON.stringify(detail.newValue)}${pending}`, ...log].slice(0, 6)
	}

	const totalHours = $derived(tasks.reduce((sum, t) => sum + t.estimate, 0))
	const doneHours = $derived(tasks.filter(t => t.done).reduce((sum, t) => sum + t.estimate, 0))
	const doneCount = $derived(tasks.filter(t => t.done).length)
</script>

<QuickGrid
	items={tasks}
	{columns}
	editable
	editTrigger="navigate"
	checkboxAlwaysEditable
	bind:invalidCells
	onRowChange={handleRowChange}
/>

<Stack orientation="horizontal" gap="1rem" style="margin-top: 0.75rem; flex-wrap: wrap;">
	<span class="task-summary">
		{doneCount}/{tasks.length} done · {doneHours} of {totalHours} h
		{#if invalidCells.length > 0}<span class="task-invalid"> · {invalidCells.length} invalid cell(s)</span>{/if}
	</span>
</Stack>

<div class="task-panels">
	<div>
		<strong>Change log</strong>
		<ul class="task-log">
			{#each log as entry, i (i)}<li>{entry}</li>{:else}<li class="task-hint">Edit a cell…</li>{/each}
		</ul>
	</div>
	<div>
		<strong>Data</strong>
		<pre class="task-json">{JSON.stringify(tasks, null, 1)}</pre>
	</div>
</div>

<Dialog
	open={labelsContext !== null}
	modal
	size="small"
	onOpenChange={({open}) => { if (!open && labelsContext) cancelLabels() }}
>
	<div class="labels-dialog">
		<h3>Labels for “{labelsContext?.row.title ?? ""}”</h3>
		<Stack orientation="vertical" gap="0.25rem">
			{#each allLabels as label (label)}
				<Checkbox checked={labelsDraft.includes(label)} onChange={({checked}) => toggleLabel(label, checked)}>{label}</Checkbox>
			{/each}
		</Stack>
		<div class="labels-actions">
			<Button appearance="neutral" onclick={cancelLabels}>Cancel</Button>
			<Button appearance="accent" onclick={saveLabels}>Save</Button>
		</div>
	</div>
</Dialog>

<style>
	.task-summary {
		font-weight: 600;
	}
	.task-invalid {
		color: var(--fluent-color-danger-foreground, #d13438);
	}
	.task-panels {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1rem;
		margin-top: 0.75rem;
	}
	.task-log {
		margin: 0.25rem 0 0;
		padding-inline-start: 1.25rem;
		font-family: monospace;
		font-size: 12px;
	}
	.task-hint {
		color: var(--neutral-foreground-hint, #707070);
	}
	.task-json {
		max-height: 220px;
		overflow: auto;
		margin: 0.25rem 0 0;
		font-size: 11px;
	}
	.labels-dialog {
		padding: 1rem;
	}
	.labels-dialog h3 {
		margin-block-start: 0;
	}
	.labels-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-block-start: 1rem;
	}
</style>
