<script lang="ts">
	import {QuickGrid, Stack, Grid, GridItem, Card, Dialog, Button, Select, Option} from "svelte-fluentui"
	import type {ActionItem, MenuDivider, QuickGridCellValidationState, QuickGridCustomEditorContext} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"
	import TaskTrackerDemo from "./TaskTrackerDemo.svelte"

	// === API Documentation ===

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const editableProperties: Property[] = [
		{name: "editable", type: "boolean", default: "false", description: "Enable inline editing mode for the grid"},
		{name: "rowEditable / getIsRowEditableCallback", type: "boolean / ({row}) => boolean", default: "true", description: "Row-level editability gate. Returns false to make the entire row read-only (useful in tree grids where parent / category rows are not editable)"},
		{name: "editTrigger", type: "'click' | 'dblclick' | 'button' | 'always' | 'navigate'", default: "'dblclick'", description: "How to trigger cell editing at the grid level (can be overridden per column)"},
		{name: "dropdownShowOnFocus", type: "boolean", default: "true", description: "Auto-show editor for dropdown types (select, combobox, autocomplete) when cell is focused in navigate mode"},
		{name: "checkboxAlwaysEditable", type: "boolean", default: "false", description: "Make checkboxes always interactive, even when editTrigger is 'navigate'"},
		{name: "invalidCells", type: "QuickGridCellValidationState[]", default: "[]", description: "Bindable array of invalid cells; each entry has rowKey, field, and error"}
	]

	const editableCallbacks: Property[] = [
		{name: "onRowChange", type: "(ctx: QuickGridRowChangeDetail<T>) => void", default: "undefined", description: "Called when a cell value is committed; detail includes row, draftRow, viewIndex, itemIndex, rowKey, field, oldValue, newValue, isValid, validationError, invalidFields, isRowValid"},
		{name: "onEditStart", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column }) => void", default: "undefined", description: "Called when a cell enters edit mode"},
		{name: "onEditCancel", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column }) => void", default: "undefined", description: "Called when editing is cancelled (e.g. Escape key)"},
		{name: "onValidationError", type: "(ctx: { row, viewIndex, itemIndex, rowKey, field, column, error }) => void", default: "undefined", description: "Called when a value fails validation"}
	]

	const editableSlots: Property[] = [
		{name: "cellTemplate", type: "Snippet", default: "undefined", description: "Custom cell template for rendering cell content (applies to all columns unless overridden by column.snippet)"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]

	// === Data ===

	type Person = {
		id: number
		name: string
		email: string
		age: number
		city: string
		active: boolean
		role?: string
		metadata?: Record<string, any> | null
	}

	// Type for validation state (exported by the library)
	type CellValidationState = QuickGridCellValidationState

	let sampleData: Person[] = $state([
		{id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28, city: "New York", active: true, role: "admin", metadata: {theme: "dark", notifications: true}},
		{id: 2, name: "Bob Smith", email: "bob@example.com", age: 34, city: "Los Angeles", active: true, role: "user", metadata: {theme: "light", language: "en"}},
		{id: 3, name: "Carol White", email: "carol@example.com", age: 26, city: "Chicago", active: false, role: "user", metadata: null},
		{id: 4, name: "David Brown", email: "david@example.com", age: 42, city: "Houston", active: true, role: "moderator", metadata: {permissions: ["read", "write"]}},
		{id: 5, name: "Eve Davis", email: "eve@example.com", age: 31, city: "Phoenix", active: true, role: "user", metadata: {theme: "auto"}},
		{id: 6, name: "Frank Miller", email: "frank@example.com", age: 29, city: "Philadelphia", active: false, role: "user"},
		{id: 7, name: "Grace Lee", email: "grace@example.com", age: 37, city: "San Antonio", active: true, role: "admin", metadata: {dashboard: {widgets: ["stats", "chart"]}}},
		{id: 8, name: "Henry Wilson", email: "henry@example.com", age: 25, city: "San Diego", active: true, role: "user"},
		{id: 9, name: "Iris Moore", email: "iris@example.com", age: 33, city: "Dallas", active: false, role: "moderator", metadata: {notes: "VIP customer"}},
		{id: 10, name: "Jack Taylor", email: "jack@example.com", age: 39, city: "San Jose", active: true, role: "user"},
		{id: 11, name: "Karen Anderson", email: "karen@example.com", age: 27, city: "Austin", active: true, role: "user"},
		{id: 12, name: "Leo Thomas", email: "leo@example.com", age: 36, city: "Jacksonville", active: false, role: "user"},
		{id: 13, name: "Mary Martinez", email: "mary@example.com", age: 30, city: "Fort Worth", active: true, role: "moderator"},
		{id: 14, name: "Nancy Garcia", email: "nancy@example.com", age: 32, city: "Columbus", active: true, role: "user"},
		{id: 15, name: "Oscar Rodriguez", email: "oscar@example.com", age: 41, city: "Charlotte", active: false, role: "admin", metadata: {verified: true, level: 5}}
	])

	// Editable columns configuration
	// searchBehavior example: the same combobox editor under each mode
	const cities = [
		{value: "amsterdam", label: "Amsterdam"},
		{value: "arhus", label: "Århus"},
		{value: "avila", label: "Ávila"},
		{value: "edinburgh", label: "Edinburgh"},
		{value: "evora", label: "Évora"},
		{value: "geneve", label: "Genève"},
		{value: "koln", label: "Köln"},
		{value: "malaga", label: "Málaga"},
		{value: "montreal", label: "Montréal"},
		{value: "sao-paulo", label: "São Paulo"},
		{value: "zurich", label: "Zürich"}
	]
	const cityName = (value: string | null) => cities.find(c => c.value === value)?.label ?? ""
	let searchBehaviorRows = $state([
		{id: 1, normalized: "amsterdam", caseInsensitive: "amsterdam", exact: "amsterdam"},
		{id: 2, normalized: "koln", caseInsensitive: "koln", exact: "koln"}
	])
	const searchBehaviorColumn = (field: string, title: string, searchBehavior: "normalized" | "case-insensitive" | "exact") => ({
		field,
		title,
		editable: true,
		editor: "combobox" as const,
		getDisplayValueCallback: ({value}: {value: string | null}) => cityName(value),
		editorOptions: {options: cities, valueMember: "value", displayMember: "label", searchBehavior, placeholder: "Type zurich…"}
	})
	const searchBehaviorColumns = [
		searchBehaviorColumn("normalized", "normalized (default)", "normalized"),
		searchBehaviorColumn("caseInsensitive", "case-insensitive", "case-insensitive"),
		searchBehaviorColumn("exact", "exact", "exact")
	]

	const editableColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "age", title: "Age", width: "100px", align: "center" as const, editable: true, editor: "number" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const},
		{field: "active", title: "Active", width: "100px", align: "center" as const, editable: true, editor: "checkbox" as const},
		{
			field: "role",
			title: "Role",
			width: "150px",
			editable: true,
			editor: "select" as const,
			editorOptions: {
				options: [
					{value: "admin", label: "Administrator"},
					{value: "moderator", label: "Moderator"},
					{value: "user", label: "User"}
				]
			}
		}
	]

	// Always editable columns (Excel-like spreadsheet)
	const alwaysEditableColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const, editTrigger: "always" as const},
		{field: "age", title: "Age", width: "80px", align: "center" as const, editable: true, editor: "number" as const, editTrigger: "always" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const, editTrigger: "always" as const},
		{field: "active", title: "Active", width: "80px", align: "center" as const, editable: true, editor: "checkbox" as const, editTrigger: "always" as const}
	]

	// Navigate mode columns (arrow keys to move, type to edit)
	const navigateColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "age", title: "Age", width: "80px", align: "center" as const, editable: true, editor: "number" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const},
		{field: "active", title: "Active", width: "80px", align: "center" as const, editable: true, editor: "checkbox" as const},
		{
			field: "metadata",
			title: "Metadata",
			width: "150px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			getDisplayValueCallback: ({value}: {value: any}) => value ? JSON.stringify(value).substring(0, 20) + (JSON.stringify(value).length > 20 ? "..." : "") : "(empty)",
			editCallback: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	// Mixed edit triggers columns
	const mixedTriggerColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name (dblclick)", editable: true, editor: "text" as const, editTrigger: "dblclick" as const},
		{field: "city", title: "City (click)", editable: true, editor: "text" as const, editTrigger: "click" as const},
		{field: "age", title: "Age (button)", width: "100px", align: "center" as const, editable: true, editor: "number" as const, editTrigger: "button" as const, showEditButton: true},
		{field: "active", title: "Active (always)", width: "100px", align: "center" as const, editable: true, editor: "checkbox" as const, editTrigger: "always" as const}
	]

	// Custom JSON editor columns
	// The editor dialog is shared by grids with different row shapes.
	type CustomEditorContext = QuickGridCustomEditorContext<any>

	let jsonDialogOpen = $state(false)
	let jsonEditorContext = $state<CustomEditorContext | null>(null)
	let jsonEditorValue = $state("")
	let jsonError = $state<string | null>(null)
	let jsonTextarea: HTMLTextAreaElement | undefined = $state()

	// Autofocus textarea when dialog opens
	$effect(() => {
		if (jsonDialogOpen && jsonTextarea) {
			// Small delay to ensure dialog is fully rendered
			setTimeout(() => jsonTextarea?.focus({ preventScroll: true }), 50)
		}
	})

	const jsonEditorColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "email", title: "Email", editable: true, editor: "text" as const},
		{
			field: "metadata",
			title: "Metadata (JSON)",
			width: "200px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			getDisplayValueCallback: ({value}: {value: any}) => value ? JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? "..." : "") : "(empty)",
			editCallback: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	function handleJsonSave() {
		if (!jsonEditorContext) return

		try {
			const parsed = jsonEditorValue.trim() ? JSON.parse(jsonEditorValue) : null
			jsonEditorContext.commit(parsed)
			jsonDialogOpen = false
			jsonEditorContext = null
			jsonError = null
		} catch (e) {
			jsonError = "Invalid JSON: " + (e as Error).message
		}
	}

	function handleJsonCancel() {
		jsonEditorContext?.cancel()
		jsonDialogOpen = false
		jsonEditorContext = null
		jsonError = null
	}

	let lastChange = $state<string>("")

	function handleRowChange(detail: {row: Person; draftRow: Person; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		// Only update data if validation passed
		if (detail.isValid) {
			// Store the committed field (draftRow would also carry other cells' pending invalid values)
			sampleData[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
			lastChange = `Changed ${detail.field}: "${JSON.stringify(detail.oldValue)}" → "${JSON.stringify(detail.newValue)}" (row ${detail.itemIndex + 1})`
		} else {
			// The grid keeps the invalid value in the cell (user can fix it)
			lastChange = `Validation failed for ${detail.field}: ${detail.validationError} (row ${detail.itemIndex + 1})`
		}
	}

	// === Validation Example ===

	// All countries with ISO codes
	const allCountries = [
		{value: "US", label: "United States"},
		{value: "GB", label: "United Kingdom"},
		{value: "DE", label: "Germany"},
		{value: "FR", label: "France"},
		{value: "IT", label: "Italy"},
		{value: "ES", label: "Spain"},
		{value: "PT", label: "Portugal"},
		{value: "NL", label: "Netherlands"},
		{value: "BE", label: "Belgium"},
		{value: "AT", label: "Austria"},
		{value: "CH", label: "Switzerland"},
		{value: "PL", label: "Poland"},
		{value: "CZ", label: "Czech Republic"},
		{value: "SK", label: "Slovakia"},
		{value: "HU", label: "Hungary"},
		{value: "RO", label: "Romania"},
		{value: "BG", label: "Bulgaria"},
		{value: "GR", label: "Greece"},
		{value: "SE", label: "Sweden"},
		{value: "NO", label: "Norway"},
		{value: "DK", label: "Denmark"},
		{value: "FI", label: "Finland"},
		{value: "IE", label: "Ireland"},
		{value: "CA", label: "Canada"},
		{value: "AU", label: "Australia"},
		{value: "NZ", label: "New Zealand"},
		{value: "JP", label: "Japan"},
		{value: "KR", label: "South Korea"},
		{value: "CN", label: "China"},
		{value: "IN", label: "India"},
		{value: "BR", label: "Brazil"},
		{value: "MX", label: "Mexico"},
		{value: "AR", label: "Argentina"},
		{value: "ZA", label: "South Africa"}
	]

	// Initial popular countries to show before search
	const popularCountries = allCountries.slice(0, 10)

	// Fake API search with delay - supports AbortSignal for cancellation
	async function searchCountries({term: query, signal}: {term: string; signal?: AbortSignal}): Promise<typeof allCountries> {
		// Simulate network delay (300-800ms) with abort support
		const delay = 300 + Math.random() * 500
		await new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(resolve, delay)
			signal?.addEventListener('abort', () => {
				clearTimeout(timeoutId)
				reject(new DOMException('Aborted', 'AbortError'))
			})
		})

		// Check if aborted after delay
		if (signal?.aborted) {
			throw new DOMException('Aborted', 'AbortError')
		}

		const lowerQuery = query.toLowerCase()
		return allCountries.filter(c =>
			c.label.toLowerCase().includes(lowerQuery) ||
			c.value.toLowerCase().includes(lowerQuery)
		)
	}

	// Helper to get country name from ISO code
	function getCountryName(isoCode: string | null): string {
		if (!isoCode) return ""
		const country = allCountries.find(c => c.value === isoCode)
		return country?.label || isoCode
	}

	// Status options for select editor
	const statusOptions = [
		{value: "active", label: "Active"},
		{value: "inactive", label: "Inactive"},
		{value: "pending", label: "Pending"},
		{value: "suspended", label: "Suspended"}
	]

	// City options for combobox editor (static filterable list)
	const cityOptions = [
		{value: "new_york", label: "New York"},
		{value: "los_angeles", label: "Los Angeles"},
		{value: "chicago", label: "Chicago"},
		{value: "houston", label: "Houston"},
		{value: "phoenix", label: "Phoenix"},
		{value: "philadelphia", label: "Philadelphia"},
		{value: "san_antonio", label: "San Antonio"},
		{value: "san_diego", label: "San Diego"},
		{value: "dallas", label: "Dallas"},
		{value: "austin", label: "Austin"}
	]

	let validationData = $state([
		{id: 1, name: "Alice", email: "alice@example.com", age: 28, score: 85, country: "US", status: "active", city: "new_york", verified: true, settings: {theme: "dark"}},
		{id: 2, name: "Bob", email: "bob@example.com", age: 34, score: 92, country: "GB", status: "active", city: "chicago", verified: true, settings: {notifications: true}},
		{id: 3, name: "Carol", email: "carol@example.com", age: 26, score: 78, country: "DE", status: "pending", city: "austin", verified: false, settings: null},
		{id: 4, name: "David", email: "invalid-email", age: -5, score: 150, country: null, status: "inactive", city: null, verified: false, settings: {level: 5}},  // Pre-invalid data
		{id: 5, name: "", email: "eve@example.com", age: 31, score: 88, country: "FR", status: "suspended", city: "dallas", verified: true, settings: {premium: true}}  // Empty name
	])

	let validationInvalidCells = $state<CellValidationState[]>([])
	let validationLastChange = $state("")

	// Helper to get city name from value
	function getCityName(cityValue: string | null): string {
		if (!cityValue) return ""
		const city = cityOptions.find(c => c.value === cityValue)
		return city?.label || cityValue
	}

	// Helper to get status label
	function getStatusLabel(statusValue: string | null): string {
		if (!statusValue) return ""
		const status = statusOptions.find(s => s.value === statusValue)
		return status?.label || statusValue
	}

	const validationColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{
			field: "name",
			title: "Name (text)",
			editable: true,
			editor: "text" as const,
			beforeCommitCallback: ({value}: {value: unknown}) => {
				const strValue = String(value || "").trim()
				if (!strValue) return "Name is required"
				if (strValue.length < 2) return "Name must be at least 2 characters"
				// Transform: capitalize first letter
				return {
					valid: true,
					transformedValue: strValue.charAt(0).toUpperCase() + strValue.slice(1)
				}
			}
		},
		{
			field: "age",
			title: "Age (number)",
			width: "120px",
			align: "center" as const,
			editable: true,
			editor: "number" as const,
			editorOptions: {min: 0, max: 150},
			beforeCommitCallback: ({value}: {value: unknown}) => {
				const numValue = Number(value)
				if (isNaN(numValue)) return "Age must be a number"
				if (numValue < 0) return "Age cannot be negative"
				if (numValue > 150) return "Age seems unrealistic"
				return true
			}
		},
		{
			field: "score",
			title: "Score (number)",
			width: "130px",
			align: "center" as const,
			editable: true,
			editor: "number" as const,
			beforeCommitCallback: ({value}: {value: unknown}) => {
				const numValue = Number(value)
				if (numValue < 0 || numValue > 100) {
					return "Score must be between 0 and 100"
				}
				// Transform: round to integer
				return {
					valid: true,
					transformedValue: Math.round(numValue)
				}
			}
		},
		{
			field: "status",
			title: "Status (select)",
			headerInfo: "Click cell to show dropdown toggle, then click toggle to open options",
			width: "150px",
			editable: true,
			editor: "select" as const,
			getDisplayValueCallback: ({value}: {value: string | null}) => getStatusLabel(value),
			editorOptions: {
				options: statusOptions,
				valueMember: "value",
				displayMember: "label"
			}
		},
		{
			field: "city",
			title: "City (combobox)",
			headerInfo: "Type to filter options, or click toggle to see all",
			width: "170px",
			editable: true,
			editor: "combobox" as const,
			getDisplayValueCallback: ({value}: {value: string | null}) => getCityName(value),
			editorOptions: {
				options: cityOptions,
				valueMember: "value",
				displayMember: "label",
				allowEmpty: true,
				placeholder: "Filter cities..."
			}
		},
		{
			field: "country",
			title: "Country (autocomplete)",
			headerInfo: "Type to search countries via async API",
			width: "210px",
			editable: true,
			editor: "autocomplete" as const,
			// Display country name instead of ISO code
			getDisplayValueCallback: ({value}: {value: string | null}) => getCountryName(value),
			editorOptions: {
				// Initial options shown before user types
				initialOptions: popularCountries,
				// Async search with fake API delay
				searchCallback: searchCountries,
				// Start searching after 1 character
				minSearchLength: 1,
				// Debounce search calls
				debounceMs: 200,
				// Use ISO code as value, label as display
				valueMember: "value",
				displayMember: "label",
				// Allow clearing
				allowEmpty: true,
				emptyLabel: "-- Select country --",
				placeholder: "Search countries..."
			},
			beforeCommitCallback: ({value}: {value: unknown}) => {
				// Country is optional, but if provided must be valid
				if (value && !allCountries.find(c => c.value === value)) {
					return "Please select a valid country"
				}
				return true
			}
		},
		{
			field: "verified",
			title: "Verified (checkbox)",
			headerInfo: "Toggle verification status",
			width: "130px",
			align: "center" as const,
			editable: true,
			editor: "checkbox" as const
		},
		{
			field: "settings",
			title: "Settings (JSON)",
			headerInfo: "Click edit button to open JSON editor",
			width: "150px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			getDisplayValueCallback: ({value}: {value: any}) => value ? JSON.stringify(value).substring(0, 15) + (JSON.stringify(value).length > 15 ? "..." : "") : "(empty)",
			editCallback: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	function handleValidationRowChange(detail: {row: typeof validationData[0]; draftRow: typeof validationData[0]; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		if (detail.isValid) {
			// Store the committed field only; other invalid cells of the row stay pending in the grid
			validationData[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
			validationLastChange = `✓ ${detail.field} updated to "${detail.newValue}"`
		} else {
			// The grid keeps the invalid value as the cell's draft and displays it
			validationLastChange = `✗ ${detail.field}: ${detail.validationError} (invalid value "${detail.newValue}" shown in cell)`
		}
	}

	// === Async Validation Example ===
	let asyncValidationData = $state([
		{id: 1, username: "alice", email: "alice@example.com"},
		{id: 2, username: "bob", email: "bob@example.com"},
		{id: 3, username: "admin", email: "admin@example.com"}  // Reserved username
	])

	let asyncInvalidCells = $state<CellValidationState[]>([])
	let asyncLastChange = $state("")
	let isCheckingUsername = $state(false)

	// Simulated API call to check username availability
	async function checkUsernameAvailable(username: string): Promise<boolean> {
		await new Promise(resolve => setTimeout(resolve, 500))  // Simulate network delay
		const reserved = ["admin", "root", "system", "test"]
		return !reserved.includes(username.toLowerCase())
	}

	const asyncValidationColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{
			field: "username",
			title: "Username",
			editable: true,
			editor: "text" as const,
			beforeCommitCallback: async ({value}: {value: unknown}) => {
				const strValue = String(value || "").trim().toLowerCase()
				if (!strValue) return "Username is required"
				if (strValue.length < 3) return "Username must be at least 3 characters"
				if (!/^[a-z0-9_]+$/.test(strValue)) return "Username can only contain letters, numbers, and underscores"

				// Async validation - check availability
				const available = await checkUsernameAvailable(strValue)
				if (!available) return `Username "${strValue}" is reserved`

				return {valid: true, transformedValue: strValue}
			}
		},
		{
			field: "email",
			title: "Email",
			editable: true,
			editor: "text" as const,
			beforeCommitCallback: ({value}: {value: unknown}) => {
				const strValue = String(value || "")
				if (!strValue.includes("@")) return "Invalid email"
				return {valid: true, transformedValue: strValue.toLowerCase()}
			}
		}
	]

	function handleAsyncValidationRowChange(detail: {row: typeof asyncValidationData[0]; draftRow: typeof asyncValidationData[0]; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		if (detail.isValid) {
			// Store the committed field only
			asyncValidationData[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
			asyncLastChange = `✓ ${detail.field} updated`
		} else {
			// Invalid value shown in cell - user can fix it
			asyncLastChange = `✗ ${detail.field}: ${detail.validationError}`
		}
	}

	// === Row Actions Demo ===
	type SimpleItem = {
		id: number
		name: string
		value: number
	}

	let rowActionsData: SimpleItem[] = $state([
		{id: 1, name: "Item One", value: 100},
		{id: 2, name: "Item Two", value: 200},
		{id: 3, name: "Item Three", value: 300}
	])

	// Separate data for the second row actions example
	let rowActionsData2: SimpleItem[] = $state([
		{id: 1, name: "Alpha", value: 10},
		{id: 2, name: "Beta", value: 20},
		{id: 3, name: "Gamma", value: 30},
		{id: 4, name: "Delta", value: 40},
		{id: 5, name: "Epsilon", value: 50}
	])

	let nextRowId = $state(4)
	let nextRowId2 = $state(6)
	let lastRowAction = $state("")
	let lastRowAction2 = $state("")

	const rowActionsColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "value", title: "Value", width: "120px", align: "end" as const, editable: true, editor: "number" as const}
	]

	function handleRowAction(detail: {action: string; itemIndex: number; row: SimpleItem}) {
		const { action, itemIndex, row } = detail

		switch (action) {
			case 'add': {
				const newRow: SimpleItem = {id: nextRowId++, name: "", value: 0}
				rowActionsData = [
					...rowActionsData.slice(0, itemIndex + 1),
					newRow,
					...rowActionsData.slice(itemIndex + 1)
				]
				lastRowAction = `Added empty row after row ${itemIndex + 1}`
				break
			}
			case 'delete': {
				rowActionsData = rowActionsData.filter((_, i) => i !== itemIndex)
				lastRowAction = `Deleted row ${itemIndex + 1}`
				break
			}
			case 'duplicate': {
				const newRow = {...row, id: nextRowId++}
				rowActionsData = [
					...rowActionsData.slice(0, itemIndex + 1),
					newRow,
					...rowActionsData.slice(itemIndex + 1)
				]
				lastRowAction = `Duplicated row ${itemIndex + 1}`
				break
			}
			case 'move-up': {
				if (itemIndex > 0) {
					const items = [...rowActionsData]
					;[items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]]
					rowActionsData = items
					lastRowAction = `Moved row ${itemIndex + 1} up`
				}
				break
			}
			case 'move-down': {
				if (itemIndex < rowActionsData.length - 1) {
					const items = [...rowActionsData]
					;[items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]]
					rowActionsData = items
					lastRowAction = `Moved row ${itemIndex + 1} down`
				}
				break
			}
		}
	}

	function handleRowActionsRowChange(detail: {row: SimpleItem; draftRow: SimpleItem; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			rowActionsData[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
		}
	}

	// Handler for second row actions example
	function handleRowAction2(detail: {action: string; itemIndex: number; row: SimpleItem}) {
		const { action, itemIndex, row } = detail

		switch (action) {
			case 'add': {
				const newRow: SimpleItem = {id: nextRowId2++, name: "", value: 0}
				rowActionsData2 = [
					...rowActionsData2.slice(0, itemIndex + 1),
					newRow,
					...rowActionsData2.slice(itemIndex + 1)
				]
				lastRowAction2 = `Added empty row after row ${itemIndex + 1}`
				break
			}
			case 'delete': {
				rowActionsData2 = rowActionsData2.filter((_, i) => i !== itemIndex)
				lastRowAction2 = `Deleted row ${itemIndex + 1}`
				break
			}
			case 'duplicate': {
				const newRow = {...row, id: nextRowId2++}
				rowActionsData2 = [
					...rowActionsData2.slice(0, itemIndex + 1),
					newRow,
					...rowActionsData2.slice(itemIndex + 1)
				]
				lastRowAction2 = `Duplicated row ${itemIndex + 1}`
				break
			}
			case 'move-up': {
				if (itemIndex > 0) {
					const items = [...rowActionsData2]
					;[items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]]
					rowActionsData2 = items
					lastRowAction2 = `Moved row ${itemIndex + 1} up`
				}
				break
			}
			case 'move-down': {
				if (itemIndex < rowActionsData2.length - 1) {
					const items = [...rowActionsData2]
					;[items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]]
					rowActionsData2 = items
					lastRowAction2 = `Moved row ${itemIndex + 1} down`
				}
				break
			}
		}
	}

	function handleRowActionsRowChange2(detail: {row: SimpleItem; draftRow: SimpleItem; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			rowActionsData2[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
		}
	}

	// === Advanced Row Toolbar Demo ===
	let toolbarData: SimpleItem[] = $state([
		{id: 1, name: "Project Alpha", value: 1000},
		{id: 2, name: "Project Beta", value: 2500},
		{id: 3, name: "Project Gamma", value: 750},
		{id: 4, name: "Project Delta", value: 3200}
	])

	let nextToolbarId = $state(5)
	let lastToolbarAction = $state("")
	let toolbarAlignment = $state<'center' | 'top'>('center')
	let toolbarTriggerMode = $state<'hover' | 'click' | 'button'>('hover')

	// Custom async export handler
	async function handleExportRow(detail: RowCtx) {
		lastToolbarAction = `Exporting "${detail.row.name}"...`
		// Simulate async operation
		await new Promise(resolve => setTimeout(resolve, 800))
		lastToolbarAction = `✓ Exported "${detail.row.name}" (ID: ${detail.row.id})`
	}

	// Custom preview handler
	function handlePreviewRow(detail: RowCtx) {
		lastToolbarAction = `Preview: ${detail.row.name} - Value: $${detail.row.value.toLocaleString()}`
	}

	// Advanced toolbar: two lines, dividers between groups, built-ins and custom actions.
	// Items are action items (text, icon, onClick, getIsDisabledCallback, …); built-in
	// names ("add", "delete", …) only bring a preset icon/text — onAction does the work.
	type RowCtx = {row: SimpleItem; itemIndex: number}
	type ToolbarEntry =
		| 'add' | 'delete' | 'duplicate' | 'move-up' | 'move-down'
		| MenuDivider
		| (ActionItem<RowCtx, 'add' | 'delete' | 'duplicate' | 'move-up' | 'move-down'> & {toolbarRow?: number; isTextVisible?: boolean})

	const advancedToolbar: ToolbarEntry[] = [
		// Line 1: move | add, duplicate, delete
		{action: 'move-up', text: 'Move up', getIsDisabledCallback: ({itemIndex}) => itemIndex === 0},
		{action: 'move-down', text: 'Move down', getIsDisabledCallback: ({itemIndex}) => itemIndex === toolbarData.length - 1},
		{divider: true},
		'add',
		{action: 'duplicate', text: 'Duplicate'},
		{action: 'delete', text: 'Delete'},

		// Line 2: custom actions (async onClick) | test buttons
		{id: 'export', icon: 'share', text: 'Export row', toolbarRow: 2, onClick: handleExportRow},
		{id: 'preview', icon: 'eye', text: 'View', isTextVisible: true, toolbarRow: 2, onClick: handlePreviewRow},
		{divider: true},
		{id: 'test1', icon: 'flash', text: 'Test 1', toolbarRow: 2},
		{id: 'test2', icon: 'wrench', text: 'Test 2', toolbarRow: 2},
		{id: 'test3', icon: 'clipboard', text: 'Test 3', toolbarRow: 2},
		{id: 'test4', icon: 'search', text: 'Test 4', toolbarRow: 2},
		{id: 'test5', icon: 'data_bar_vertical', text: 'Test 5', toolbarRow: 2},
		{divider: true},
		{id: 'test6', icon: 'star', text: 'Test 6', toolbarRow: 2},
		{id: 'test7', icon: 'target', text: 'Test 7', toolbarRow: 2},
		{id: 'test8', icon: 'lightbulb', text: 'Test 8', toolbarRow: 2},
		{id: 'test9', icon: 'alert', text: 'Test 9', toolbarRow: 2},
		{id: 'test10', icon: 'pin', text: 'Test 10', toolbarRow: 2}
	]

	function handleToolbarClick(detail: {action: string; itemIndex: number; row: SimpleItem}) {
		const {action, itemIndex, row} = detail

		// Built-in actions: the grid only supplies icon/text — the work happens here
		{
			switch (action) {
				case 'add': {
					const newRow: SimpleItem = {id: nextToolbarId++, name: "New Project", value: 0}
					toolbarData = [
						...toolbarData.slice(0, itemIndex + 1),
						newRow,
						...toolbarData.slice(itemIndex + 1)
					]
					lastToolbarAction = `Added new row after "${row.name}"`
					break
				}
				case 'delete': {
					toolbarData = toolbarData.filter((_, i) => i !== itemIndex)
					lastToolbarAction = `Deleted "${row.name}"`
					break
				}
				case 'duplicate': {
					const newRow = {...row, id: nextToolbarId++, name: row.name + " (copy)"}
					toolbarData = [
						...toolbarData.slice(0, itemIndex + 1),
						newRow,
						...toolbarData.slice(itemIndex + 1)
					]
					lastToolbarAction = `Duplicated "${row.name}"`
					break
				}
				case 'move-up': {
					if (itemIndex > 0) {
						const items = [...toolbarData]
						;[items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]]
						toolbarData = items
						lastToolbarAction = `Moved "${row.name}" up`
					}
					break
				}
				case 'move-down': {
					if (itemIndex < toolbarData.length - 1) {
						const items = [...toolbarData]
						;[items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]]
						toolbarData = items
						lastToolbarAction = `Moved "${row.name}" down`
					}
					break
				}
			}
		}
	}

	function handleToolbarRowChange(detail: {row: SimpleItem; draftRow: SimpleItem; itemIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			toolbarData[detail.itemIndex] = {...detail.row, [detail.field]: detail.newValue}
		}
	}
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="QuickGrid Editable"
		description="Inline editing in QuickGrid with multiple editor types, edit triggers, validation, and advanced callbacks for add, update, and delete flows."
		keywords="svelte, fluentui, quickgrid, editable, inline edit, data grid, validation"
	/>

	<h1>QuickGrid Editable</h1>

	<p>
		QuickGrid supports inline editing with multiple editor types, edit triggers, validation, and advanced callbacks. This page covers all editable features.
	</p>

	<References links={[
		{label: "QuickGrid (Basic)", href: "/components/quickgrid"},
		{label: "QuickGrid Editable", custom: true},
		{label: "QuickGrid Context Menu", href: "/components/quickgrid-contextmenu"}
	]} />



	<!-- JSON Editor Dialog -->
	<Dialog
		open={jsonDialogOpen}
		modal
		size="small"
		onOpenChange={({open}) => { if (!open) handleJsonCancel() }}
	>
		<div class="json-editor-dialog">
			<h3>Edit JSON Metadata</h3>
			<p style="margin-bottom: 0.5rem; color: var(--neutral-foreground-hint, #707070);">
				Editing: {jsonEditorContext?.row?.name ?? ""}
			</p>
			<textarea
				bind:this={jsonTextarea}
				class="json-textarea"
				bind:value={jsonEditorValue}
				placeholder={'{"key": "value"}'}
				rows={12}
			></textarea>
			{#if jsonError}
				<p class="json-error">{jsonError}</p>
			{/if}
			<div class="json-dialog-actions">
				<Button appearance="neutral" onclick={handleJsonCancel}>Cancel</Button>
				<Button appearance="accent" onclick={handleJsonSave}>Save</Button>
			</div>
		</div>
	</Dialog>

	<Card>
		<h2>Examples</h2>

		<h3>Complex scenario: task tracker (every editor type)</h3>
		<p>
			One grid using all editors together. Click a cell and use the arrow keys, type or press <strong>Enter</strong> / <strong>F2</strong> to edit:
		</p>
		<ul style="margin: 0.5rem 0 1rem 1.5rem;">
			<li><strong>Task</strong> (text) — required, trimmed by <code>beforeCommitCallback</code></li>
			<li><strong>Assignee</strong> (autocomplete) — async <code>searchCallback</code> with <code>initialOptions</code>; accents don't matter (<code>jose</code> finds José)</li>
			<li><strong>Team</strong> (select) and <strong>Component</strong> (combobox) — the component list comes from <code>loadOptionsCallback</code> for the row's team; changing the team clears the component</li>
			<li><strong>Start / Due</strong> (date) — stored as ISO days; row-aware validation keeps due ≥ start</li>
			<li><strong>Estimate</strong> (number) — 0.5–80 h, rounded to half hours</li>
			<li><strong>Done</strong> (checkbox) — always clickable; updates the summary</li>
			<li><strong>Labels</strong> (custom) — several values in one cell, edited in a dialog via <code>editCallback</code></li>
		</ul>
		<TaskTrackerDemo />

		<h3>Editable Grid (Double-click)</h3>
		<p>Double-click any editable cell to edit. Press <strong>Enter</strong> to save, <strong>Escape</strong> to cancel. Supports text, number, checkbox, and select editors.</p>
		<QuickGrid
			items={sampleData}
			columns={editableColumns}
			editable
			editTrigger="dblclick"
			onRowChange={handleRowChange}
			pageable
			pageSize={8}
		/>
		{#if lastChange}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				<strong>Last change:</strong> {lastChange}
			</p>
		{/if}

		<h3>Search and accents (editorOptions.searchBehavior)</h3>
		<p>
			Select, combobox and autocomplete editors take <code>searchBehavior</code> in <code>editorOptions</code>. Double-click a cell
			and type <code>zurich</code>: <code>normalized</code> finds Zürich, <code>case-insensitive</code> needs <code>zürich</code>,
			<code>exact</code> needs <code>Zürich</code>.
		</p>
		<QuickGrid items={searchBehaviorRows} columns={searchBehaviorColumns} editable editTrigger="dblclick" />

		<h3>Always Editable (Spreadsheet Mode)</h3>
		<p>All cells are always in edit mode - like a spreadsheet. Try using <strong>Tab</strong> to move between cells.</p>
		<QuickGrid
			items={sampleData}
			columns={alwaysEditableColumns}
			editable
			onRowChange={handleRowChange}
			pageable
			pageSize={10}
			striped={false}
		/>

		<h3>Navigate Mode (Excel-like)</h3>
		<p>Click a cell to focus, then use keyboard to navigate and edit:</p>
		<table class="member-table" style="margin-bottom: 1rem;">
			<thead>
				<tr>
					<th>Key</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>Arrow keys</td><td>Move between editable cells</td></tr>
				<tr><td>Tab / Shift+Tab</td><td>Move to next/previous cell</td></tr>
				<tr><td>Enter / F2</td><td>Enter edit mode</td></tr>
				<tr><td>Space</td><td>Toggle checkbox</td></tr>
				<tr><td>Escape</td><td>Cancel editing, return to navigation</td></tr>
				<tr><td>Any character</td><td>Start editing and type (text/number fields)</td></tr>
				<tr><td>Enter (while editing)</td><td>Commit and move to cell below</td></tr>
			</tbody>
		</table>
		<QuickGrid
			items={sampleData}
			columns={navigateColumns}
			editable
			editTrigger="navigate"
			onRowChange={handleRowChange}
			pageable
			pageSize={10}
		/>

		<h3>Mixed Edit Triggers</h3>
		<p>Different columns can have different edit triggers:</p>
		<QuickGrid
			items={sampleData}
			columns={mixedTriggerColumns}
			editable
			onRowChange={handleRowChange}
			pageable
			pageSize={8}
		/>
		<div style="margin-top: 1rem; padding: 1rem; background: var(--neutral-layer-2); border-radius: 4px;">
			<p><strong>Test checkboxes (outside grid):</strong></p>
			<label><input type="checkbox" /> Checkbox 1</label><br/>
			<label><input type="checkbox" /> Checkbox 2</label><br/>
			<label><input type="checkbox" /> Checkbox 3</label>
		</div>

		<h3>Custom Editor: JSON in Dialog</h3>
		<p>Click the edit button (✎) in the Metadata column to open a JSON editor dialog. This demonstrates using <code>editor: "custom"</code> with <code>editCallback</code> callback.</p>
		<QuickGrid
			items={sampleData}
			columns={jsonEditorColumns}
			editable
			onRowChange={handleRowChange}
			pageable
			pageSize={8}
		/>

		<h3>Validation with beforeCommitCallback (Excel-like)</h3>
		<p>
			Use <code>beforeCommitCallback</code> for validation and value transformation. Invalid cells stay marked until fixed.
			Click a cell and use arrow keys to navigate, type to edit. Try entering invalid values:
		</p>
		<ul style="margin: 0.5rem 0 1rem 1.5rem;">
			<li><strong>Name:</strong> Empty or less than 2 characters</li>
			<li><strong>Email:</strong> Missing @ or domain</li>
			<li><strong>Age:</strong> Negative or over 150</li>
			<li><strong>Score:</strong> Less than 0 or more than 100</li>
		</ul>
		<QuickGrid
			items={validationData}
			columns={validationColumns}
			editable
			editTrigger="navigate"
			checkboxAlwaysEditable
			bind:invalidCells={validationInvalidCells}
			onRowChange={handleValidationRowChange}
		/>
		<div style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
			{#if validationLastChange}
				<p style="padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px; margin: 0;">
					{validationLastChange}
				</p>
			{/if}
			{#if validationInvalidCells.length > 0}
				<p style="padding: 0.5rem; background: var(--error-fill-rest, #fde7e9); border-radius: 4px; margin: 0; color: var(--error-foreground, #d13438);">
					Invalid cells: {validationInvalidCells.length}
				</p>
			{/if}
		</div>

		<h3>Async Validation</h3>
		<p>
			<code>beforeCommitCallback</code> supports async validation. Try changing a username to "admin", "root", "system", or "test" - these are reserved and will show a validation error after the async check.
		</p>
		<QuickGrid
			items={asyncValidationData}
			columns={asyncValidationColumns}
			editable
			editTrigger="dblclick"
			bind:invalidCells={asyncInvalidCells}
			onRowChange={handleAsyncValidationRowChange}
		/>
		{#if asyncLastChange}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{asyncLastChange}
			</p>
		{/if}

		<h3>Row Action Popup</h3>
		<p>
			Hover over a row to see a popup with action buttons below the first cell. Actions include: <strong>Add</strong> (+), <strong>Delete</strong> (−), and <strong>Duplicate</strong> (⧉).
		</p>
		<QuickGrid
			items={rowActionsData}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowToolbar
			onAction={handleRowAction}
			onRowChange={handleRowActionsRowChange}
		/>
		{#if lastRowAction}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastRowAction}
			</p>
		{/if}

		<h3>Row Actions with Move Up/Down</h3>
		<p>
			You can customize which actions appear using the <code>rowActions</code> prop:
		</p>
		<QuickGrid
			items={rowActionsData2}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowToolbar
			rowToolbar={['move-up', 'move-down', 'duplicate', 'delete']}
			onAction={handleRowAction2}
			onRowChange={handleRowActionsRowChange2}
		/>
		{#if lastRowAction2}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastRowAction2}
			</p>
		{/if}

		<h3>Advanced Row Toolbar (Multi-row, Groups, Custom Actions)</h3>
		<p>
			The <code>rowToolbar</code> prop supports advanced configurations:
		</p>
		<ul style="margin: 0.5rem 0 1rem 1.5rem;">
			<li><strong>Multi-row layout:</strong> Items can be placed in different rows (<code>row: 1</code> = closest to grid)</li>
			<li><strong>Groups with dividers:</strong> Items with different <code>group</code> numbers are separated by <code>|</code></li>
			<li><strong>Custom actions:</strong> Define <code>onclick</code> handlers with async support</li>
			<li><strong>Dynamic disabled:</strong> Use <code>getIsDisabledCallback(&#123;row, itemIndex&#125;)</code> to disable conditionally</li>
			<li><strong>Labels:</strong> Add text labels next to icons with <code>label</code> property</li>
			<li><strong>Toolbar alignment:</strong> Use <code>toolbarAlign</code> to control vertical alignment (<code>center</code> or <code>top</code>)</li>
			<li><strong>Toolbar trigger:</strong> Use <code>toolbarTrigger</code> to control how toolbar appears (<code>hover</code>, <code>click</code>, or <code>button</code>)</li>
		</ul>
		<div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<label for="toolbar-align">Alignment:</label>
				<Select id="toolbar-align" value={toolbarAlignment} onChange={({ value }) => toolbarAlignment = value as 'center' | 'top'}>
					<Option value="center">Center (default)</Option>
					<Option value="top">Top (first row aligned)</Option>
				</Select>
			</div>
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<label for="toolbar-trigger">Trigger:</label>
				<Select id="toolbar-trigger" value={toolbarTriggerMode} onChange={({ value }) => toolbarTriggerMode = value as 'hover' | 'click' | 'button'}>
					<Option value="hover">Hover (default)</Option>
					<Option value="click">Click on row</Option>
					<Option value="button">Button in first column</Option>
				</Select>
			</div>
		</div>
		<QuickGrid
			items={toolbarData}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowToolbar
			rowToolbar={advancedToolbar}
			toolbarAlign={toolbarAlignment}
			toolbarTrigger={toolbarTriggerMode}
			onAction={handleToolbarClick}
			onRowChange={handleToolbarRowChange}
		/>
		{#if lastToolbarAction}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastToolbarAction}
			</p>
		{/if}

		<h3>Advanced Row Toolbar Code Example</h3>
		<pre>{`// Toolbar entries: built-in names, action items, {divider: true}; toolbarRow stacks lines
const advancedToolbar = [
  // Line 1: move | add, duplicate, delete
  { action: 'move-up', getIsDisabledCallback: ({ itemIndex }) => itemIndex === 0 },
  { action: 'move-down', getIsDisabledCallback: ({ itemIndex }) => itemIndex === items.length - 1 },
  { divider: true },
  'add', 'duplicate', 'delete',

  // Line 2: custom actions with async onClick
  { id: 'export', icon: 'share', text: 'Export', toolbarRow: 2,
    onClick: async ({ row }) => {
      await exportToCSV(row)
    }
  },
  { id: 'preview', icon: 'eye', text: 'View', isTextVisible: true, toolbarRow: 2,
    onClick: ({ row }) => showPreviewDialog(row)
  }
]

<QuickGrid
  {items}
  {columns}
  showRowToolbar
  rowToolbar={advancedToolbar}
  onAction={handleToolbarClick}   // ({ action, id, row, itemIndex, source }) — built-ins land here
/>`}</pre>

		<h3>Row Actions Code Example</h3>
		<pre>{`${'<'}script lang="ts">
  let items = $state([
    { id: 1, name: "Item One", value: 100 },
    { id: 2, name: "Item Two", value: 200 }
  ])

  let nextId = 3

  function handleRowAction(detail) {
    const { action, itemIndex, row } = detail

    switch (action) {
      case 'add':
        items = [
          ...items.slice(0, itemIndex + 1),
          { id: nextId++, name: "", value: 0 },
          ...items.slice(itemIndex + 1)
        ]
        break
      case 'delete':
        items = items.filter((_, i) => i !== itemIndex)
        break
      case 'duplicate':
        items = [
          ...items.slice(0, itemIndex + 1),
          { ...row, id: nextId++ },
          ...items.slice(itemIndex + 1)
        ]
        break
    }
  }
${'<'}/script>

${'<'}QuickGrid
  {items}
  {columns}
  editable
  showRowToolbar
  onAction={handleRowAction}
/>

<!-- Or customize which actions to show -->
${'<'}QuickGrid
  {items}
  {columns}
  showRowToolbar
  rowToolbar={['add', 'duplicate']}
  onAction={handleRowAction}
/>`}</pre>

		<h3>Basic Editable Code Example</h3>
		<pre>{`${'<'}script lang="ts">
  type Person = {
    id: number
    name: string
    age: number
    active: boolean
    role: string
  }

  let data: Person[] = $state([
    { id: 1, name: "Alice", age: 28, active: true, role: "admin" },
    { id: 2, name: "Bob", age: 34, active: false, role: "user" }
  ])

  const columns = [
    { field: "id", title: "ID", width: "80px" },
    { field: "name", title: "Name", editable: true, editor: "text" },
    { field: "age", title: "Age", editable: true, editor: "number",
      editorOptions: { min: 0, max: 120 } },
    { field: "active", title: "Active", editable: true, editor: "checkbox" },
    {
      field: "role",
      title: "Role",
      editable: true,
      editor: "select",
      editorOptions: {
        options: [
          { value: "admin", label: "Administrator" },
          { value: "user", label: "User" }
        ]
      }
    }
  ]

  function handleRowChange(detail) {
    // Update data - the component does NOT mutate your data
    data[detail.itemIndex] = {
      ...detail.row,
      [detail.field]: detail.newValue
    }
  }
${'<'}/script>

${'<'}QuickGrid
  items={data}
  columns={columns}
  editable
  editTrigger="dblclick"
  onRowChange={handleRowChange}
/>`}</pre>

		<h3>Async Validation Code Example</h3>
		<p>QuickGrid supports both synchronous and asynchronous validation. The cell shows a loading state during async validation.</p>
		<pre>{`const columns = [
  {
    field: "email",
    title: "Email",
    editable: true,
    editor: "text",
    // Supports both sync and async validation
    validateCallback: async ({value, row}) => {
      // Async API call to check uniqueness
      const exists = await checkEmailExists(value, row.id)
      return exists ? "Email already in use" : null
    }
  }
]

<QuickGrid
  items={data}
  columns={columns}
  editable
  onValidationError={(detail) => {
    console.log(\`Validation failed: \${detail.error}\`)
  }}
/>`}</pre>

		<h3>Dynamic Options Loading</h3>
		<p>Select and autocomplete editors can load options dynamically with configurable timing.</p>
		<table class="member-table" style="margin-bottom: 1rem;">
			<thead>
				<tr>
					<th>optionsLoadTrigger</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>immediate</td><td>Load once when grid mounts, cache forever</td></tr>
				<tr><td>edit-start</td><td>Load when cell enters edit mode (default)</td></tr>
				<tr><td>dropdown-open</td><td>Load when dropdown opens (lazy)</td></tr>
			</tbody>
		</table>
		<pre>{`const columns = [
  {
    field: "departmentId",
    title: "Department",
    editable: true,
    editor: "select",
    editorOptions: {
      // Load options dynamically
      loadOptionsCallback: async ({row, signal}) => {
        const departments = await fetchDepartments(row.companyId, {signal})
        return departments.map(d => ({ value: d.id, label: d.name }))
      },
      optionsLoadTrigger: "dropdown-open"
    }
  }
]`}</pre>

		<h3>Custom Editor (Dialog)</h3>
		<p>Use <code>editor: "custom"</code> with <code>editCallback</code> callback to implement custom editors like dialogs, JSON editors, color pickers, etc.</p>
		<pre>{`${'<'}script>
  let showJsonDialog = false
  let jsonEditorContext = null

  const columns = [
    {
      field: "metadata",
      title: "Metadata",
      editable: true,
      editor: "custom",
      showEditButton: true,  // Shows edit icon in cell
      getDisplayValueCallback: ({value}) => value ? "{ ... }" : "(empty)",
      editCallback: (context) => {
        // context provides: value, row, viewIndex, itemIndex, rowKey, field, commit(), cancel()
        jsonEditorContext = context
        showJsonDialog = true
      }
    }
  ]

  function handleJsonSave(newJson) {
    jsonEditorContext?.commit(newJson)  // Fires onRowChange
    showJsonDialog = false
  }
${'<'}/script>

${'<'}QuickGrid {items} {columns} editable onRowChange={handleRowChange} />

{#if showJsonDialog}
  ${'<'}Dialog open onOpenChange={({open}) => { if (!open) jsonEditorContext?.cancel() }}>
    ${'<'}JsonEditor
      value={jsonEditorContext?.value}
      onsave={handleJsonSave}
    />
  ${'<'}/Dialog>
{/if}`}</pre>

		<h3>beforeCommitCallback Code Example</h3>
		<pre>{`const columns = [
  {
    field: "email",
    title: "Email",
    editable: true,
    editor: "text",
    beforeCommitCallback: ({ value, row }) => {
      const email = String(value || "").trim()

      // Validation
      if (!email) return "Email is required"
      if (!email.includes("@")) return "Invalid email format"

      // Transform (normalize to lowercase)
      return {
        valid: true,
        transformedValue: email.toLowerCase()
      }
    }
  },
  {
    field: "age",
    title: "Age",
    editable: true,
    editor: "number",
    beforeCommitCallback: async ({ value }) => {
      // Async validation example
      const num = Number(value)
      if (num < 0) return "Age cannot be negative"

      // Simulate API call
      const isValid = await validateAge(num)
      return isValid ? true : "Age validation failed"
    }
  }
]

// Handle changes
function handleRowChange(detail) {
  if (detail.isValid) {
    // Safe to update - newValue may be transformed
    data[detail.itemIndex][detail.field] = detail.newValue
    // detail.isRowValid / detail.invalidFields: the row's other invalid cells
  } else {
    // Cell marked invalid, user can see error
    console.log("Validation error:", detail.validationError)
  }
}

<QuickGrid
  items={data}
  columns={columns}
  editable
  bind:invalidCells={invalidCells}
  onRowChange={handleRowChange}
/>`}</pre>

		<h3>Using invalidCells</h3>
		<p>Use <code>bind:invalidCells</code> to track which cells have validation errors:</p>
		<pre>{`let invalidCells = $state([])

// Check if form is valid before saving
function canSave() {
  return invalidCells.length === 0
}

// Clear a specific cell's error
function clearError(rowKey, field) {
  invalidCells = invalidCells.filter(c =>
    !(c.rowKey === rowKey && c.field === field)
  )
}`}</pre>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card><h2>Properties</h2><QuickGrid items={editableProperties} columns={propertyColumns} sortable filterable striped /></Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card><h2>Callbacks</h2><QuickGrid items={editableCallbacks} columns={propertyColumns} sortable filterable striped /></Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card><h2>Slots</h2><QuickGrid items={editableSlots} columns={propertyColumns} sortable filterable striped /></Card>
		</GridItem>
	</Grid>

	<Card>
		<h2>Column Editing Props</h2>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Default</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>editable / getIsEditableCallback</td>
					<td>boolean / (&#123;row, column&#125;) =&gt; boolean</td>
					<td>false</td>
					<td>Enable editing for this column; the callback decides per row (e.g. only leaf rows in a tree) and wins</td>
				</tr>
				<tr>
					<td>editor</td>
					<td>"text" | "number" | "checkbox" | "select" | "combobox" | "date" | "autocomplete" | "custom"</td>
					<td>"text"</td>
					<td>Editor type for this column</td>
				</tr>
				<tr>
					<td>editTrigger</td>
					<td>"click" | "dblclick" | "button" | "always" | "navigate"</td>
					<td>grid default</td>
					<td>Per-column edit trigger override</td>
				</tr>
				<tr>
					<td>editorOptions</td>
					<td>object</td>
					<td>undefined</td>
					<td>Editor options (min/max, options, loadOptionsCallback, etc.)</td>
				</tr>
				<tr>
					<td>beforeCommitCallback</td>
					<td>(context) =&gt; ValidationResult | boolean | string | null | Promise</td>
					<td>undefined</td>
					<td>Validate and optionally transform value before commit</td>
				</tr>
				<tr>
					<td>validateCallback</td>
					<td>(&#123;value, row, column&#125;) =&gt; string | null | Promise</td>
					<td>undefined</td>
					<td>Simple validation — return an error message or null (prefer beforeCommitCallback)</td>
				</tr>
				<tr>
					<td>editCallback</td>
					<td>(context) =&gt; void</td>
					<td>undefined</td>
					<td>Custom editor callback (for editor="custom")</td>
				</tr>
				<tr>
					<td>showEditButton</td>
					<td>boolean</td>
					<td>false</td>
					<td>Show edit button in cell</td>
				</tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Edit Triggers</h2>
		<table class="member-table">
			<thead>
				<tr>
					<th>Trigger</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>dblclick</td>
					<td>Double-click to enter edit mode (default)</td>
				</tr>
				<tr>
					<td>click</td>
					<td>Single-click to enter edit mode</td>
				</tr>
				<tr>
					<td>button</td>
					<td>Click the edit button to enter edit mode</td>
				</tr>
				<tr>
					<td>always</td>
					<td>Cell is always in edit mode (spreadsheet-like)</td>
				</tr>
				<tr>
					<td>navigate</td>
					<td>Arrow key navigation with type-to-edit (Excel-like)</td>
				</tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Row Actions Props</h2>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Default</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>showRowToolbar</td>
					<td>boolean</td>
					<td>false</td>
					<td>Show the floating row toolbar</td>
				</tr>
				<tr>
					<td>rowToolbar</td>
					<td>(built-in name | action item | divider)[]</td>
					<td>['add', 'delete', 'duplicate']</td>
					<td>Toolbar entries; items take text, icon, isDisabled / getIsDisabledCallback, onClick, toolbarRow, isTextVisible</td>
				</tr>
				<tr>
					<td>onAction</td>
					<td>(detail) =&gt; void</td>
					<td>undefined</td>
					<td>Fires after a toolbar (or context-menu) item ran</td>
				</tr>
				<tr>
					<td>beforeActionCallback</td>
					<td>(detail) =&gt; unknown</td>
					<td>undefined</td>
					<td>Return false (or resolve to false) to cancel an item</td>
				</tr>
			</tbody>
		</table>
		<h3>Built-in toolbar actions</h3>
		<table class="member-table">
			<thead>
				<tr>
					<th>Action</th>
					<th>Icon</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>'add'</td><td>add</td><td>Add a new row below</td></tr>
				<tr><td>'delete'</td><td>delete</td><td>Delete the row (shown in red on hover)</td></tr>
				<tr><td>'duplicate'</td><td>copy</td><td>Duplicate the row</td></tr>
				<tr><td>'move-up'</td><td>arrow_up</td><td>Move the row up</td></tr>
				<tr><td>'move-down'</td><td>arrow_down</td><td>Move the row down</td></tr>
			</tbody>
		</table>
		<h3>onAction detail</h3>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>action</td><td>string</td><td>Built-in name, or "custom"</td></tr>
				<tr><td>id</td><td>string</td><td>The item's id (custom items)</td></tr>
				<tr><td>item</td><td>ActionItem</td><td>The clicked item</td></tr>
				<tr><td>source</td><td>"row-toolbar" | "context-menu"</td><td>Where it was clicked</td></tr>
				<tr><td>viewIndex</td><td>number</td><td>Position in the displayed list (after filter, sort, tree collapse, paging)</td></tr>
				<tr><td>itemIndex</td><td>number</td><td>Index of the row in <code>items</code> (−1 if gone) — use it to update your data</td></tr>
				<tr><td>rowKey</td><td>string</td><td>Stable row key (<code>idMember</code>, default <code>"id"</code> when rows have one, else a generated per-object key)</td></tr>
				<tr><td>row</td><td>T</td><td>The row data</td></tr>
				<tr><td>column / columnIndex / cellValue</td><td></td><td>The right-clicked cell (context menu only)</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>QuickGridCustomEditorContext</h2>
		<p>The context object passed to <code>editCallback</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>value</td><td>any</td><td>Current cell value (its pending invalid value, if it has one)</td></tr>
				<tr><td>row</td><td>T</td><td>Full row data</td></tr>
				<tr><td>viewIndex</td><td>number</td><td>Position in the displayed list (after filter, sort, tree collapse, paging)</td></tr>
				<tr><td>itemIndex</td><td>number</td><td>Index of the row in <code>items</code> (−1 if gone) — use it to update your data</td></tr>
				<tr><td>rowKey</td><td>string</td><td>Stable row key (<code>idMember</code>, default <code>"id"</code> when rows have one, else a generated per-object key)</td></tr>
				<tr><td>field</td><td>string</td><td>Field name being edited</td></tr>
				<tr><td>commit</td><td>(newValue) =&gt; void</td><td>Validates (beforeCommitCallback / validateCallback) and commits the value, firing onRowChange. One-shot; ignored once another edit started</td></tr>
				<tr><td>cancel</td><td>() =&gt; void</td><td>Abandons the edit (fires onEditCancel). One-shot</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>QuickGridEditorOptions</h2>
		<p>All QuickGrid model types (<code>QuickGridColumn</code>, <code>QuickGridEditorOptions</code>, <code>QuickGridRowChangeDetail</code>, …) are exported: <code>import type &#123;QuickGridColumn&#125; from "svelte-fluentui"</code>.</p>
		<p>Options available in <code>editorOptions</code> depending on editor type:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Editors</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>options</td><td>QuickGridEditorOption[]</td><td>select, autocomplete</td><td>Static options array</td></tr>
				<tr><td>loadOptionsCallback</td><td>(&#123;row, column, signal&#125;) =&gt; Promise&lt;QuickGridEditorOption[]&gt;</td><td>select, autocomplete</td><td>Dynamic options loader</td></tr>
				<tr><td>optionsLoadTrigger</td><td>"immediate" | "edit-start" | "dropdown-open"</td><td>select, autocomplete</td><td>When to load dynamic options</td></tr>
				<tr><td>min</td><td>number</td><td>number</td><td>Minimum value</td></tr>
				<tr><td>max</td><td>number</td><td>number</td><td>Maximum value</td></tr>
				<tr><td>step</td><td>number</td><td>number</td><td>Step increment</td></tr>
				<tr><td>maxLength</td><td>number</td><td>text</td><td>Maximum character length</td></tr>
				<tr><td>searchCallback</td><td>(&#123;term, row, column, signal&#125;) =&gt; Promise&lt;QuickGridEditorOption[]&gt;</td><td>autocomplete</td><td>Server-side search for the autocomplete editor</td></tr>
				<tr><td>valueMember</td><td>string</td><td>select, autocomplete</td><td>Property to use as value (default: "value")</td></tr>
				<tr><td>displayMember</td><td>string</td><td>select, autocomplete</td><td>Property to use for display (default: "label")</td></tr>
				<tr><td>allowEmpty</td><td>boolean</td><td>select, autocomplete</td><td>Allow null/empty selection</td></tr>
				<tr><td>emptyLabel</td><td>string</td><td>select</td><td>Label for empty option (default: "-- Select --")</td></tr>
				<tr><td>placeholder</td><td>string</td><td>text, number, autocomplete</td><td>Input placeholder text</td></tr>
				<tr><td>initialOptions</td><td>QuickGridEditorOption[]</td><td>autocomplete</td><td>Options shown before search</td></tr>
				<tr><td>searchBehavior</td><td>"normalized" | "case-insensitive" | "exact"</td><td>select, combobox, autocomplete</td><td>How filtering and type-ahead compare text (default: "normalized", ignores case and diacritics). No effect on searchCallback</td></tr>
				<tr><td>minSearchLength</td><td>number</td><td>autocomplete</td><td>Min chars before search (default: 1)</td></tr>
				<tr><td>debounceMs</td><td>number</td><td>autocomplete</td><td>Search debounce delay (default: 300)</td></tr>
				<tr><td>trueValue</td><td>any</td><td>checkbox</td><td>Value to store when checked (default: true)</td></tr>
				<tr><td>falseValue</td><td>any</td><td>checkbox</td><td>Value to store when unchecked (default: false)</td></tr>
				<tr><td>minDate</td><td>Date | string</td><td>date</td><td>Minimum selectable date</td></tr>
				<tr><td>maxDate</td><td>Date | string</td><td>date</td><td>Maximum selectable date</td></tr>
				<tr><td>outputFormat</td><td>"date" | "iso" | "timestamp"</td><td>date</td><td>How to store the date value</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>QuickGridRowChangeDetail</h2>
		<p>The detail object passed to <code>onRowChange</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>row</td><td>T</td><td>The row as it is in <code>items</code> (unchanged)</td></tr>
				<tr><td>draftRow</td><td>T</td><td>The row's current state: <code>row</code> + every pending invalid value of the row + this commit's value</td></tr>
				<tr><td>viewIndex</td><td>number</td><td>Position in the displayed list (after filter, sort, tree collapse, paging)</td></tr>
				<tr><td>itemIndex</td><td>number</td><td>Index of the row in <code>items</code> (−1 if gone) — use it to update your data</td></tr>
				<tr><td>rowKey</td><td>string</td><td>Stable row key (<code>idMember</code>, default <code>"id"</code> when rows have one, else a generated per-object key)</td></tr>
				<tr><td>field</td><td>string</td><td>Field name that changed</td></tr>
				<tr><td>oldValue</td><td>any</td><td>Previous value</td></tr>
				<tr><td>newValue</td><td>any</td><td>New value (may be transformed)</td></tr>
				<tr><td>isValid</td><td>boolean</td><td>True if the edited field passed validation</td></tr>
				<tr><td>validationError</td><td>string | null</td><td>Error message if validation failed</td></tr>
				<tr><td>invalidFields</td><td>QuickGridInvalidField[]</td><td>Every invalid cell of the row after this commit: <code>{"{"}field, error, value{"}"}</code></td></tr>
				<tr><td>isRowValid</td><td>boolean</td><td><code>invalidFields.length === 0</code></td></tr>
			</tbody>
		</table>
		<p><strong>Note:</strong> An invalid value is kept by the grid as that cell's draft and displayed, so users can see and fix it; a valid commit drops the cell's draft. Store <code>{"{"}...row, [field]: newValue{"}"}</code> on a valid commit, or <code>draftRow</code> once <code>isRowValid</code>. Clearing <code>invalidCells</code> (or calling the instance method <code>discardDrafts(rowKey?)</code> via <code>bind:this</code>) drops the drafts.</p>
	</Card>

	<Card>
		<h2>QuickGridBeforeCommitContext</h2>
		<p>The context object passed to <code>beforeCommitCallback</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>value</td><td>unknown</td><td>The new value being committed</td></tr>
				<tr><td>oldValue</td><td>unknown</td><td>The previous value</td></tr>
				<tr><td>row</td><td>T</td><td>Full row data</td></tr>
				<tr><td>viewIndex</td><td>number</td><td>Position in the displayed list (after filter, sort, tree collapse, paging)</td></tr>
				<tr><td>itemIndex</td><td>number</td><td>Index of the row in <code>items</code> (−1 if gone) — use it to update your data</td></tr>
				<tr><td>rowKey</td><td>string</td><td>Stable row key (<code>idMember</code>, default <code>"id"</code> when rows have one, else a generated per-object key)</td></tr>
				<tr><td>field</td><td>string</td><td>Field name being edited</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>QuickGridValidationResult</h2>
		<p><code>beforeCommitCallback</code> can return various types:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Return Value</th>
					<th>Meaning</th>
				</tr>
			</thead>
			<tbody>
				<tr><td><code>true</code> / <code>null</code> / <code>undefined</code></td><td>Valid - commit proceeds</td></tr>
				<tr><td><code>false</code></td><td>Invalid - shows "Validation failed"</td></tr>
				<tr><td><code>"Error message"</code></td><td>Invalid - shows the error message</td></tr>
				<tr><td><code>{'{'}valid: true{'}'}</code></td><td>Valid - commit proceeds</td></tr>
				<tr><td><code>{'{'}valid: false, message: "Error"{'}'}</code></td><td>Invalid - shows the error message</td></tr>
				<tr><td><code>{'{'}valid: true, transformedValue: x{'}'}</code></td><td>Valid - commit with transformed value</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>QuickGridCellValidationState</h2>
		<p>The <code>invalidCells</code> array contains objects with this shape:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>rowKey</td><td>string</td><td>Stable key of the invalid cell's row (idMember or <code>id</code> / tree path / generated per row object) — the same rowKey events carry</td></tr>
				<tr><td>field</td><td>string</td><td>Field name of the invalid cell</td></tr>
				<tr><td>error</td><td>string</td><td>Validation error message</td></tr>
			</tbody>
		</table>
	</Card>
</Stack>

<style>
	.json-editor-dialog {
		padding: 1rem;
	}

	.json-editor-dialog h3 {
		margin: 0 0 0.5rem 0;
	}

	.json-textarea {
		width: 100%;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		padding: 0.75rem;
		border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		background: var(--neutral-layer-1, #ffffff);
		color: var(--neutral-foreground-rest, #242424);
		resize: vertical;
		box-sizing: border-box;
	}

	.json-textarea:focus {
		outline: none;
		border-color: var(--accent-fill-rest, #0078d4);
		box-shadow: 0 0 0 1px var(--accent-fill-rest, #0078d4);
	}

	.json-error {
		color: var(--error-foreground, #d13438);
		font-size: 0.875rem;
		margin: 0.5rem 0;
	}

	.json-dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	:global([data-theme="dark"]) .json-textarea {
		background: var(--neutral-layer-1, #1f1f1f);
		color: var(--neutral-foreground-rest, #e0e0e0);
		border-color: var(--neutral-stroke-input-rest, #5a5a5a);
	}
</style>
