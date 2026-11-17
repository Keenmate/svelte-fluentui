<script lang="ts">
	import { Autocomplete, Stack, Grid, GridItem, Card, QuickGrid, Icon, Slider } from "svelte-fluentui"
	import {References, Meta} from "$lib/components"
	import { countries } from "$lib/demo-data/datasets"

	// searchBehavior example
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
	const searchBehaviors = ["normalized", "case-insensitive", "exact"] as const

	const colors = [
		{ value: "red", label: "Red" },
		{ value: "blue", label: "Blue" },
		{ value: "green", label: "Green" },
		{ value: "yellow", label: "Yellow" },
		{ value: "purple", label: "Purple" },
		{ value: "orange", label: "Orange" },
		{ value: "pink", label: "Pink" },
		{ value: "brown", label: "Brown" },
		{ value: "black", label: "Black" },
		{ value: "white", label: "White" }
	]

	const programmingLanguages = [
		{ value: "js", label: "JavaScript" },
		{ value: "ts", label: "TypeScript" },
		{ value: "py", label: "Python" },
		{ value: "java", label: "Java" },
		{ value: "cs", label: "C#" },
		{ value: "cpp", label: "C++" },
		{ value: "go", label: "Go" },
		{ value: "rust", label: "Rust" },
		{ value: "swift", label: "Swift" },
		{ value: "kotlin", label: "Kotlin" }
	]

	// Elixir and Erlang are intentionally NOT in programmingLanguages, so the
	// "initial values + search" demo can show the base list on focus while these
	// two surface only when the user searches.
	const searchOnlyLanguages = [
		...programmingLanguages,
		{ value: "elixir", label: "Elixir" },
		{ value: "erlang", label: "Erlang" }
	]

	// People data with icons
	const people = [
		{ value: "1", label: "John Doe", email: "john.doe@example.com", icon: "Person" },
		{ value: "2", label: "Jane Smith", email: "jane.smith@example.com", icon: "Person" },
		{ value: "3", label: "Bob Johnson", email: "bob.johnson@example.com", icon: "Person" },
		{ value: "4", label: "Alice Williams", email: "alice.williams@example.com", icon: "Person" },
		{ value: "5", label: "Charlie Brown", email: "charlie.brown@example.com", icon: "Person" }
	]

	// Popular countries for initial options
	const popularCountries = [
		{ value: "us", label: "United States" },
		{ value: "uk", label: "United Kingdom" },
		{ value: "ca", label: "Canada" },
		{ value: "de", label: "Germany" },
		{ value: "fr", label: "France" }
	]

	// State for examples
	let basicValue = $state<string[]>([])
	let preselectedValue = $state<string[]>(["us", "uk"])
	let singleSelectValue = $state<string[]>([])
	let maxSelectValue = $state<string[]>([])
	let stayOpenValue = $state<string[]>([])
	let closeOnSelectValue = $state<string[]>([])
	let langSearchValue = $state<string[]>([])
	let asyncValue = $state<string[]>([])
	let initialOptionsValue = $state<string[]>([])
	let debounceValue = $state<string[]>([])
	let minSearchLengthValue = $state<string[]>([])
	let minSearchLengthCalls = $state<number>(0)
	let disabledValue = $state<string[]>(["us"])
	let readonlyValue = $state<string[]>(["uk", "ca"])
	let requiredValue = $state<string[]>([])
	let filledValue = $state<string[]>([])
	let outlineValue = $state<string[]>([])
	let widthValue = $state<string[]>([])
	let maxHeightAcValue = $state<string[]>([])
	let acMaxHeightPx = $state(240)
	let dropdownWidthAcValue = $state<string[]>([])
	let acDropdownWidthPx = $state(360)
	let templateValue = $state<string[]>([])
	let headerFooterValue = $state<string[]>([])
	let iconValue = $state<string[]>([])
	let endIconValue = $state<string[]>([])
	let callbackValue = $state<string[]>([])
	let callbackMessage = $state<string>("")
	let dismissedMessage = $state<string>("")
	let selectOnTabValue = $state<string[]>([])
	let tagsInlineValue = $state<string[]>(["us", "uk"])
	let tagsAboveValue = $state<string[]>(["red", "blue"])
	let tagsBelowValue = $state<string[]>(["js", "ts"])

	async function handleAsyncSearch({term: searchText}: {term: string}) {
		await new Promise(resolve => setTimeout(resolve, 500))
		return countries.filter(c =>
			c.label.toLowerCase().includes(searchText.toLowerCase())
		)
	}

	// Alias kept for the "initial options" example — now just hits the full list
	const handleCountrySearch = handleAsyncSearch

	// Search used by the minSearchLength demo — counts calls so we can show
	// that the function is NOT invoked for sub-threshold queries.
	async function handleMinSearchLengthSearch({term: searchText}: {term: string}) {
		minSearchLengthCalls += 1
		await new Promise(resolve => setTimeout(resolve, 300))
		return countries.filter(c =>
			c.label.toLowerCase().includes(searchText.toLowerCase())
		)
	}

	// Search across the extended language list (which includes Elixir & Erlang).
	// Used with showInitialOptions + options={programmingLanguages}: the base list
	// shows on focus, and typing surfaces the search-only entries.
	async function handleLanguageSearch({term: searchText}: {term: string}) {
		await new Promise(resolve => setTimeout(resolve, 300))
		return searchOnlyLanguages.filter(l =>
			l.label.toLowerCase().includes(searchText.toLowerCase())
		)
	}

	async function handlePeopleSearch({term: searchText}: {term: string}) {
		await new Promise(resolve => setTimeout(resolve, 400))
		return people.filter(p =>
			p.label.toLowerCase().includes(searchText.toLowerCase()) ||
			p.email.toLowerCase().includes(searchText.toLowerCase())
		)
	}

	function handleSelectionChange({value: selected}: {value: string[]}) {
		callbackMessage = `Selection changed: ${selected.length > 0 ? selected.join(", ") : "None"}`
	}

	function handleOpenChange({open}: {open: boolean}) {
		if (open) return
		dismissedMessage = `Dropdown closed at ${new Date().toLocaleTimeString()}`
	}

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "value", type: "T[]", default: "[]", description: "Array of selected values (bindable)"},
		{name: "options", type: "OptionItem[]", default: "[]", description: "Available options for selection"},
		{name: "placeholder", type: "string", default: '"Type to search..."', description: "Placeholder text for input Wins over labels.placeholder."},
		{name: "label", type: "string", default: "undefined", description: "Label text above component"},
		{name: "disabled", type: "boolean", default: "false", description: "Disable the component"},
		{name: "readonly", type: "boolean", default: "false", description: "Read-only mode"},
		{name: "required", type: "boolean", default: "false", description: "Shows a * marker, sets aria-required on the input and makes the form invalid while nothing is selected"},
		{name: "autofocus", type: "boolean", default: "undefined", description: "Auto focus on mount"},
		{name: "appearance", type: "string", default: "undefined", description: "Visual style (filled, outline)"},
		{name: "autocomplete", type: "string", default: "undefined", description: "Browser autocomplete behavior"},
		{name: "multiple", type: "boolean", default: "undefined", description: "Explicitly enable multi-select mode"},
		{name: "maxSelectionCount", type: "number", default: "undefined", description: "Max selections allowed (1 = single-select)"},
		{name: "maxResultCount", type: "number", default: "9", description: "Max options shown in dropdown"},
		{name: "minSearchLength", type: "number", default: "undefined", description: "Minimum typed characters before search runs. Below the threshold, searchCallback is NOT called and the dropdown stays closed."},
		{name: "searchBehavior", type: '"normalized" | "case-insensitive" | "exact"', default: '"normalized"', description: "How the local search compares text: normalized ignores case and diacritics (zurich finds Zürich), case-insensitive ignores case only, exact matches both. No effect on searchCallback."},
		{name: "showOverlayOnEmptyResults", type: "boolean", default: "true", description: "Show dropdown on no results"},
		{name: "showInitialOptions", type: "boolean", default: "false", description: "Show options on focus when empty"},
		{name: "initialOptionsCount", type: "number", default: "maxResultCount", description: "Initial options count limit"},
		{name: "closeOnSelect", type: "boolean", default: "!multiple", description: "Close the dropdown after a pick. Multi-select defaults to false (stays open so several can be chosen in a row); set true to close on each selection. Single-select always closes."},
		{name: "emptyText", type: "string", default: "\"No results found\"", description: "Text shown in the dropdown when the search matches no options (with showOverlayOnEmptyResults) Wins over labels.noMatches."},
		{name: "selectValueOnTab", type: "boolean", default: "true", description: "Select highlighted option on Tab key"},
		{name: "tagsPosition", type: '"inline" | "top" | "bottom"', default: '"inline"', description: "Position of selected tags: inside input (inline), above input, or below input"},
		{name: "searchDelay", type: "number", default: "0", description: "Debounce delay in ms before search"},
		{name: "loading", type: "boolean", default: "undefined", description: "External loading state control"},
		{name: "id", type: "string", default: "undefined", description: "Element ID"},
		{name: "title", type: "string", default: "undefined", description: "Tooltip text"},
		{name: "ariaLabel", type: "string", default: "undefined", description: "Accessible name of the search input (the role=\"combobox\"); defaults to the label text."},
		{name: "width", type: "string", default: "undefined", description: "Component width"},
		{name: "height", type: "string", default: "undefined", description: "Component height"},
		{name: "maxDropdownHeight", type: "string", default: '"300px"', description: "Cap the dropdown listbox height (e.g. '240px', '50vh'). Always also capped to the viewport-available space, whichever is smaller."},
		{name: "dropdownWidth", type: "string", default: "undefined (matches control)", description: "Width of the dropdown listbox (e.g. '360px'). When unset the list matches the control width; when set it uses this width instead."},
		{name: "showSearchIcon", type: "boolean", default: "true", description: "Built-in magnifier in the end slot when nothing higher-priority (spinner, custom end) occupies it"},
		{name: "showClear", type: "boolean", default: "true", description: "A clear (×) button before the end slot while something is selected or typed, visible while the control is hovered or focused (like fluent-search); empties the value (every chip in multi-select) and the search text, fires onChange({value: []}). Not a Tab stop; focus stays in the input."},
		{name: "initialSearchQuery", type: "string", default: '""', description: "Text to prefill and search with on mount (opens the dropdown)"},
		{name: "class", type: "string", default: '""', description: "Additional CSS classes"},
		{name: "style", type: "string", default: '""', description: "Inline styles"},
		{name: "labels", type: "AutocompleteLabels", default: "undefined", description: "Overrides the built-in text for this instance (svelteFluentUI.autocomplete.* keys; see Guides → Translations). Keys: placeholder, noMatches ({query}), loadingAriaLabel, clearAriaLabel, clearTooltip, openPopupAriaLabel, closePopupAriaLabel, removeAriaLabel ({item}), removeTooltip ({item}), maxSelectionReached ({max}, ICU plural). The placeholder / emptyText props win when set."},
	]

	const callbacks: Property[] = [
		{name: "searchCallback", type: "(ctx: {term: string, signal: AbortSignal}) => Promise<OptionItem[]> | OptionItem[]", default: "undefined", description: "Called when the user types. Return matching options (sync or async); signal aborts when a newer search starts. If omitted, a case-insensitive contains filter is used."},
		{name: "onChange", type: "(ctx: {value: T[]}) => void", default: "undefined", description: "Fires when the user adds or removes a selection."},
		{name: "open", type: "boolean", default: "undefined", description: "Bindable open state of the dropdown. Setting true opens the list (same as the dropdown toggle); false closes it."},
		{name: "onOpenChange", type: "(ctx: {open: boolean}) => void", default: "undefined", description: "Fires on every open/close after mount (user interaction or bind:open); not on initial render, even when open starts true."},
		{name: "...rest", type: "HTMLAttributes", default: "undefined", description: "Other native attributes and DOM events (onkeydown, onfocusin, data-*, aria-*, …), forwarded untouched to the root <div>"}
	]

	const slots: Property[] = [
		{name: "labelTemplate", type: "Snippet", default: "undefined", description: "Custom label content rendered above the input. Replaces the plain text label prop when provided."},
		{name: "optionTemplate", type: "Snippet<[OptionItem]>", default: "undefined", description: "Custom rendering for each option in the dropdown list. Receives the OptionItem as a parameter."},
		{name: "headerContent", type: "Snippet", default: "undefined", description: "Custom content rendered at the top of the dropdown overlay, above the option list."},
		{name: "footerContent", type: "Snippet", default: "undefined", description: "Custom content rendered at the bottom of the dropdown overlay, below the option list."},
		{name: "empty", type: "Snippet", default: "undefined", description: "Custom content shown when the search matches no options; overrides emptyText."},
		{name: "start", type: "Snippet", default: "undefined", description: "Decorative content (typically an icon) rendered at the start (left) of the input."},
		{name: "end", type: "Snippet", default: "undefined", description: "Decorative content rendered at the end of the input. The loading spinner takes precedence — end shows while it isn't active. The showClear × sits before it."}
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
		title="Autocomplete"
		description="Multi-select Svelte component with tag chips, custom filtering, and initial-options support for popular items before async search."
		keywords="svelte, fluentui, autocomplete, tags, chips, multi-select, search"
	/>

	<h1>Autocomplete</h1>

	<p>
		The Autocomplete component provides multiple selection with tag/chip display and custom filtering.
		Inspired by the FluentUI Blazor Autocomplete component.
	</p>

	<References links={[
		{label: "FluentUI Web Component", na: true},
		{label: "FluentUI Blazor", href: "https://www.fluentui-blazor.net/Autocomplete"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Default</h3>
		<Grid columns={3} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Basic</strong>
					<Autocomplete
						bind:value={basicValue}
						options={countries}
						label="Select countries"
						placeholder="Type to search..."
					/>
					<small>Selected: {basicValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Pre-selected</strong>
					<Autocomplete
						bind:value={preselectedValue}
						options={countries}
						label="Countries"
					/>
					<small>Selected: {preselectedValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Single-select (maxSelectionCount=1)</strong>
					<Autocomplete
						bind:value={singleSelectValue}
						options={colors}
						maxSelectionCount={1}
						label="Select a color"
						placeholder="Choose one..."
					/>
					<small>Selected: {singleSelectValue[0] || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Tags Position</h3>
		<p>Control where selected tags appear using the <code>tagsPosition</code> prop. Default is <code>"inline"</code> (inside the input field, like FluentUI Blazor).</p>
		<Grid columns={3} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Inline (default)</strong>
					<small style="color: var(--neutral-foreground-hint);">Tags appear inside the input field</small>
					<Autocomplete
						bind:value={tagsInlineValue}
						options={countries}
						tagsPosition="inline"
						label="Countries"
						placeholder="Search..."
					/>
					<small>Selected: {tagsInlineValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Above</strong>
					<small style="color: var(--neutral-foreground-hint);">Tags appear above the input field</small>
					<Autocomplete
						bind:value={tagsAboveValue}
						options={colors}
						tagsPosition="top"
						label="Colors"
						placeholder="Search..."
					/>
					<small>Selected: {tagsAboveValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Below</strong>
					<small style="color: var(--neutral-foreground-hint);">Tags appear below the input field</small>
					<Autocomplete
						bind:value={tagsBelowValue}
						options={programmingLanguages}
						tagsPosition="bottom"
						label="Languages"
						placeholder="Search..."
					/>
					<small>Selected: {tagsBelowValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Multiple = false</h3>
		<p>When the <code>multiple</code> prop is explicitly set to <code>false</code>, it behaves like a single-select autocomplete.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Explicit single-select</strong>
					<Autocomplete
						bind:value={singleSelectValue}
						options={colors}
						multiple={false}
						label="Select a color"
						placeholder="Choose one..."
					/>
					<small>Selected: {singleSelectValue[0] || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Many Items</h3>
		<p>Use <code>maxResultCount</code> to control the dropdown display and limit results.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Max 5 options shown</strong>
					<Autocomplete
						bind:value={asyncValue}
						searchCallback={handleAsyncSearch}
						maxResultCount={5}
						label="Search countries"
						placeholder="Type to search..."
					/>
					<small>Selected: {asyncValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>With max selections</strong>
					<Autocomplete
						bind:value={maxSelectValue}
						options={colors}
						maxSelectionCount={3}
						label="Select up to 3 colors"
					/>
					<small>Selected ({maxSelectValue.length}/3): {maxSelectValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Close on selection (closeOnSelect)</h3>
		<p>
			In multi-select, <code>closeOnSelect</code> defaults to <code>false</code>, so the dropdown stays open after
			each pick and you can select several options in a row. Set it to <code>true</code> to close the
			dropdown on every selection. (Single-select always closes on pick.)
		</p>
		<p>
			Both use <code>showInitialOptions</code> + <code>searchCallback</code>: focus shows the core
			languages, and typing searches the extended set — <strong>Elixir</strong> and <strong>Erlang</strong>
			appear only when you search (type <code>e</code>, <code>eli</code>, or <code>erl</code>).
		</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>closeOnSelect = false (default)</strong>
					<small style="color: var(--neutral-foreground-hint);">Dropdown stays open — pick several in a row.</small>
					<Autocomplete
						bind:value={stayOpenValue}
						options={programmingLanguages}
						searchCallback={handleLanguageSearch}
						showInitialOptions={true}
						closeOnSelect={false}
						label="Programming languages"
						placeholder="Focus for core list, search for Elixir/Erlang..."
					/>
					<small>Selected: {stayOpenValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>closeOnSelect = true</strong>
					<small style="color: var(--neutral-foreground-hint);">Dropdown closes after each pick.</small>
					<Autocomplete
						bind:value={closeOnSelectValue}
						options={programmingLanguages}
						searchCallback={handleLanguageSearch}
						showInitialOptions={true}
						closeOnSelect={true}
						label="Programming languages"
						placeholder="Focus for core list, search for Elixir/Erlang..."
					/>
					<small>Selected: {closeOnSelectValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Different object instances from search results</h3>
		<p>Show initial options before user types, then use async search for full dataset.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Initial popular options</strong>
					<Autocomplete
						bind:value={initialOptionsValue}
						options={popularCountries}
						searchCallback={handleCountrySearch}
						showInitialOptions={true}
						initialOptionsCount={5}
						label="Select country"
						placeholder="Select from popular or search all..."
					/>
					<small>Selected: {initialOptionsValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Search-only items with initial values</h3>
		<p>
			Combine <code>showInitialOptions</code> with <code>searchCallback</code>: the initial list (shown
			on focus, from <code>options</code>) holds the core languages, while <strong>Elixir</strong> and
			<strong>Erlang</strong> live only in the search dataset. Focus to see the initial values, then type
			<code>e</code>, <code>eli</code>, or <code>erl</code> to surface the search-only entries.
		</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Initial values + search</strong>
					<Autocomplete
						bind:value={langSearchValue}
						options={programmingLanguages}
						searchCallback={handleLanguageSearch}
						showInitialOptions={true}
						label="Programming languages"
						placeholder="Focus for core list, search for Elixir/Erlang..."
					/>
					<small>Selected: {langSearchValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>States</h3>
		<Grid columns={3} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Disabled</strong>
					<Autocomplete
						bind:value={disabledValue}
						options={countries}
						disabled={true}
						label="Disabled"
					/>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Readonly</strong>
					<Autocomplete
						bind:value={readonlyValue}
						options={countries}
						readonly={true}
						label="Readonly"
					/>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Required</strong>
					<Autocomplete
						bind:value={requiredValue}
						options={countries}
						required={true}
						label="Required"
					/>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Appearance</h3>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Outline (default)</strong>
					<Autocomplete
						bind:value={outlineValue}
						options={colors}
						appearance="outline"
						label="Outline appearance"
					/>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Filled</strong>
					<Autocomplete
						bind:value={filledValue}
						options={colors}
						appearance="filled"
						label="Filled appearance"
					/>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Width</h3>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Custom width (300px)</strong>
					<Autocomplete
						bind:value={widthValue}
						options={colors}
						width="300px"
						label="Fixed width"
					/>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Full width (100%)</strong>
					<Autocomplete
						options={colors}
						width="100%"
						label="Full width"
					/>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Dropdown max height</h3>
		<p>
			Use <code>maxDropdownHeight</code> to cap the dropdown listbox height (e.g. <code>"240px"</code>, <code>"50vh"</code>);
			it defaults to <code>300px</code>. The listbox is always <em>also</em> capped to the space available to the
			viewport edge, so this acts as an upper bound — whichever is smaller wins. Drag the slider to change it live,
			then focus the input to open the list.
		</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<Slider id="ac-maxheight" bind:value={acMaxHeightPx} min={100} max={400} step={20} label={`maxDropdownHeight: ${acMaxHeightPx}px`} />
					<Autocomplete
						bind:value={maxHeightAcValue}
						options={countries}
						showInitialOptions={true}
						initialOptionsCount={30}
						maxResultCount={30}
						maxDropdownHeight={`${acMaxHeightPx}px`}
						width="300px"
						label="Search countries"
						placeholder="Focus to see the list scroll..."
					/>
					<small>Focus the input — the list scrolls once the options exceed {acMaxHeightPx}px.</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Dropdown width</h3>
		<p>
			By default the dropdown matches the input width. Set <code>dropdownWidth</code> to give the listbox its own
			width — wider than the input (to show long labels) or narrower — independent of the control. Drag the slider
			to change it live, then focus the input to open the list.
		</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<Slider id="ac-ddwidth" bind:value={acDropdownWidthPx} min={160} max={520} step={20} label={`dropdownWidth: ${acDropdownWidthPx}px`} />
					<Autocomplete
						bind:value={dropdownWidthAcValue}
						options={countries}
						showInitialOptions={true}
						initialOptionsCount={30}
						maxResultCount={30}
						dropdownWidth={`${acDropdownWidthPx}px`}
						width="220px"
						label="Search countries"
						placeholder="Focus to see the list..."
					/>
					<small>The input stays 220px wide; the dropdown is {acDropdownWidthPx}px.</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Debounce (searchDelay)</h3>
		<p>Use <code>searchDelay</code> to add a debounce delay before triggering search.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>300ms delay</strong>
					<Autocomplete
						bind:value={debounceValue}
						searchCallback={handleAsyncSearch}
						searchDelay={300}
						label="Search with debounce"
						placeholder="Type to search (300ms delay)..."
					/>
					<small>Selected: {debounceValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Search and accents (searchBehavior)</h3>
		<p>
			Without <code>searchCallback</code>, Autocomplete searches <code>options</code> itself. Type <code>zurich</code>:
			<code>normalized</code> (default) finds Zürich, <code>case-insensitive</code> needs <code>zürich</code>,
			<code>exact</code> needs <code>Zürich</code>.
		</p>
		<Grid columns={3} gap="1rem">
			{#each searchBehaviors as behavior (behavior)}
				<GridItem>
					<Autocomplete label={`searchBehavior="${behavior}"`} searchBehavior={behavior} options={cities} placeholder="Type zurich…" />
				</GridItem>
			{/each}
		</Grid>

		<h3>Minimum search length</h3>
		<p>Use <code>minSearchLength</code> to skip the search entirely until the user has typed enough characters. Below the threshold, <code>searchCallback</code> is never invoked — essential when searching against large/expensive backends.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>minSearchLength={3}</strong>
					<small style="color: var(--neutral-foreground-hint);">The call counter stays at 0 until you type 3 characters.</small>
					<Autocomplete
						bind:value={minSearchLengthValue}
						searchCallback={handleMinSearchLengthSearch}
						minSearchLength={3}
						searchDelay={200}
						label="Search countries"
						placeholder="Type at least 3 characters..."
					/>
					<small>Search calls fired: <strong>{minSearchLengthCalls}</strong></small>
					<small>Selected: {minSearchLengthValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Option Template</h3>
		<p>Use <code>optionTemplate</code> snippet to customize how options are rendered.</p>
		<Grid columns={1} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<Autocomplete
						bind:value={templateValue}
						searchCallback={handlePeopleSearch}
						label="Search people"
						placeholder="Search by name or email..."
					>
						{#snippet optionTemplate(option)}
							<div style="display: flex; align-items: center; gap: 0.5rem;">
								<Icon name="person" size={16} />
								<div>
									<div>{option.label}</div>
									<small style="color: var(--neutral-foreground-hint);">{(option as any).email}</small>
								</div>
							</div>
						{/snippet}
					</Autocomplete>
					<small>Selected: {templateValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Header and Footer Content</h3>
		<p>Use <code>headerContent</code> and <code>footerContent</code> snippets for custom dropdown sections.</p>
		<Grid columns={1} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<Autocomplete
						bind:value={headerFooterValue}
						options={colors}
						showInitialOptions={true}
						label="Select colors"
					>
						{#snippet headerContent()}
							<div style="font-weight: 600; color: var(--accent-fill-rest);">
								Popular choices
							</div>
						{/snippet}
						{#snippet footerContent()}
							<div style="font-size: 0.75rem; color: var(--neutral-foreground-hint);">
								{colors.length} options available
							</div>
						{/snippet}
					</Autocomplete>
					<small>Selected: {headerFooterValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Start &amp; End Icons</h3>
		<p>
			Use the <code>start</code> and <code>end</code> snippets to render decorative content (typically icons) inside the input.
			The loading spinner takes precedence over <code>end</code>. The clear (×) button (<code>showClear</code>) sits before the end icon.
		</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Search icon (start)</strong>
					<Autocomplete
						bind:value={iconValue}
						options={colors}
						showInitialOptions={true}
						label="Search colors"
						placeholder="Type to search..."
					>
						{#snippet start()}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
								<path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.03a.75.75 0 1 1-1.06 1.06l-3.04-3.03Z" />
							</svg>
						{/snippet}
					</Autocomplete>
					<small>Selected: {iconValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>Filter icon (end)</strong>
					<Autocomplete
						bind:value={endIconValue}
						options={colors}
						showInitialOptions={true}
						label="Filter colors"
						placeholder="Filter..."
					>
						{#snippet end()}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
								<path d="M2.5 3a.5.5 0 0 0-.4.8l4.4 5.87V13a.5.5 0 0 0 .29.45l2 .92A.5.5 0 0 0 9.5 14V9.67l4.4-5.87A.5.5 0 0 0 13.5 3h-11Z" />
							</svg>
						{/snippet}
					</Autocomplete>
					<small>Selected: {endIconValue.join(", ") || "None"} &nbsp;<em style="color: var(--neutral-foreground-hint);">(pick a value, then hover — the × sits before the filter icon)</em></small>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Select Value on Tab</h3>
		<p>Control whether Tab key selects the highlighted option with <code>selectValueOnTab</code>.</p>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>selectValueOnTab = true (default)</strong>
					<Autocomplete
						bind:value={selectOnTabValue}
						options={colors}
						selectValueOnTab={true}
						label="Tab to select"
						placeholder="Use arrow keys then Tab..."
					/>
					<small>Selected: {selectOnTabValue.join(", ") || "None"}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>selectValueOnTab = false</strong>
					<Autocomplete
						options={colors}
						selectValueOnTab={false}
						label="Tab moves focus"
						placeholder="Tab will move to next field..."
					/>
				</Stack>
			</GridItem>
		</Grid>

		<h3>Callbacks</h3>
		<Grid columns={2} gap="1rem">
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>onChange</strong>
					<Autocomplete
						bind:value={callbackValue}
						options={colors}
						onChange={handleSelectionChange}
						label="Select colors"
					/>
					<small>{callbackMessage || "Make a selection..."}</small>
				</Stack>
			</GridItem>
			<GridItem>
				<Stack orientation="vertical" gap="0.5rem">
					<strong>onOpenChange</strong>
					<Autocomplete
						options={colors}
						onOpenChange={handleOpenChange}
						showInitialOptions={true}
						label="Open then close dropdown"
					/>
					<small>{dismissedMessage || "Close the dropdown..."}</small>
				</Stack>
			</GridItem>
		</Grid>
	</Card>

	<Card>
		<h2>Usage Examples</h2>

		<h3>Basic Usage</h3>
		<pre><code>{`${'<'}script lang="ts">
  import { Autocomplete } from "svelte-fluentui"

  const options = [
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2" },
    { value: "3", label: "Option 3" }
  ]

  let selected = $state${'<'}string[]>([])
${'<'}/script>

${'<'}Autocomplete
  bind:value={selected}
  options={options}
  label="Select options"
  placeholder="Type to search..."
/>`}</code></pre>

		<h3>With Async Search</h3>
		<pre><code>{`${'<'}script lang="ts">
  async function searchItems({term, signal}) {
    const response = await fetch(\`/api/search?q=\${term}\`, {signal})
    const data = await response.json()
    return data.map(item => ({
      value: item.id,
      label: item.name
    }))
  }

  let selected = $state${'<'}string[]>([])
${'<'}/script>

${'<'}Autocomplete
  bind:value={selected}
  searchCallback={searchItems}
  label="Search items"
  searchDelay={300}
/>`}</code></pre>

		<h3>Custom Option Template</h3>
		<pre><code>{`<Autocomplete
  bind:value={selected}
  options={people}
  label="Select person"
>
  {#snippet optionTemplate(option)}
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <Icon name="person" size={16} />
      <span>{option.label}</span>
    </div>
  {/snippet}
</Autocomplete>`}</code></pre>
	</Card>

	<Card>
		<h2>Keyboard: selected-value chips</h2>
		<p>
			In multiple mode with inline chips (<code>tagsPosition="inline"</code>, the default), every chip can be reached and removed from the keyboard.
			The chips' × buttons stay out of the <kbd>Tab</kbd> order; focus moves onto them with the arrow keys.
		</p>
		<ul>
			<li><kbd>ArrowLeft</kbd> with the caret at the start of the input — focus the last chip (<kbd>ArrowRight</kbd> in right-to-left).</li>
			<li><kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> on a chip — previous / next chip; past the last chip, back to the input.</li>
			<li><kbd>Home</kbd> — first chip; <kbd>End</kbd> — back to the input.</li>
			<li><kbd>Backspace</kbd> — remove the focused chip and focus the previous one; <kbd>Delete</kbd> — remove it and focus the next one (the input when none is left).</li>
			<li><kbd>Enter</kbd> / <kbd>Space</kbd> — remove the focused chip and return to the input.</li>
			<li>Typing a character — back to the input, which receives it.</li>
			<li><kbd>Backspace</kbd> in an empty input still removes the last chip.</li>
		</ul>
		<p>Each × is named by <code>labels.removeAriaLabel</code> / <code>labels.removeTooltip</code> (default <code>"Remove {"{item}"}"</code>).</p>
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

	<Card>
		<h2>OptionItem Type</h2>
		<pre><code>{`type OptionItem<T = any> = {
  value: T          // Unique identifier
  label: string     // Display text
  disabled?: boolean // Optional disabled state
}`}</code></pre>
	</Card>
</Stack>

<style>
	pre {
		background: var(--neutral-layer-3);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 1rem 0;
	}

	pre code {
		background: none;
		padding: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	code {
		background: var(--neutral-layer-3);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.875rem;
	}
</style>
