<script lang="ts">
	import {Autocomplete} from "svelte-fluentui"

	type Fruit = {value: string; label: string; disabled?: boolean}

	const fruits: Fruit[] = [
		{value: "apple", label: "Apple"},
		{value: "apricot", label: "Apricot"},
		{value: "banana", label: "Banana"},
		{value: "blackberry", label: "Blackberry"},
		{value: "blueberry", label: "Blueberry"},
		{value: "cherry", label: "Cherry"},
		{value: "coconut", label: "Coconut", disabled: true},
		{value: "date", label: "Date"},
		{value: "elderberry", label: "Elderberry"},
		{value: "fig", label: "Fig"},
		{value: "grape", label: "Grape"},
		{value: "kiwi", label: "Kiwi"},
		{value: "lemon", label: "Lemon"},
		{value: "lime", label: "Lime"},
		{value: "mango", label: "Mango"}
	]

	let singleSelected = $state<string[]>([])
	let multiSelected = $state<string[]>([])
	let prefilledSelected = $state<string[]>(["apple", "banana"])
	let initialSelected = $state<string[]>([])
	let maxSelected = $state<string[]>([])
	let asyncSelected = $state<string[]>([])
	let minLenSelected = $state<string[]>([])
	let asyncCallCount = $state(0)

	async function asyncSearch({term: text}: {term: string}): Promise<Fruit[]> {
		asyncCallCount++
		await new Promise((r) => setTimeout(r, 50))
		const q = text.toLowerCase()
		return fruits.filter((f) => f.label.toLowerCase().includes(q))
	}

	// Out-of-order responses: a one-letter query answers slower than a longer one
	let staleSelected = $state<string[]>([])
	let abortedSearches = $state(0)
	async function outOfOrderSearch({term: text, signal}: {term: string; signal: AbortSignal}): Promise<Fruit[]> {
		signal.addEventListener("abort", () => abortedSearches++)
		const slow = text.length === 1
		await new Promise(r => setTimeout(r, slow ? 600 : 50))
		return slow ? [{value: "stale", label: "Stale result"}] : [{value: "fresh", label: "Fresh result"}]
	}

	// Slow async search for loading-indicator assertion
	async function slowAsyncSearch({term: text}: {term: string}): Promise<Fruit[]> {
		await new Promise((r) => setTimeout(r, 400))
		const q = text.toLowerCase()
		return fruits.filter((f) => f.label.toLowerCase().includes(q))
	}

	// Debounced async — tracks how many times the callback ran
	let debouncedCallCount = $state(0)
	async function debouncedSearch({term: text}: {term: string}): Promise<Fruit[]> {
		debouncedCallCount++
		const q = text.toLowerCase()
		return fruits.filter((f) => f.label.toLowerCase().includes(q))
	}

	// Dismiss tracker
	let dismissCount = $state(0)
	let dismissTrackerSelected = $state<string[]>([])

	// State buckets for the rest of the fixtures
	let labeledSel = $state<string[]>([])
	let labelTplSel = $state<string[]>([])
	let tagsAboveSel = $state<string[]>(["apple", "banana"])
	let tagsBelowSel = $state<string[]>(["apple", "banana"])
	let stayOpenSel = $state<string[]>([])
	let noTabSel = $state<string[]>([])
	let limitedSel = $state<string[]>([])
	let noEmptyOverlaySel = $state<string[]>([])
	let slotsSel = $state<string[]>([])
	let optionTplSel = $state<string[]>([])
	let iconsSel = $state<string[]>([])

	// initial-query is intentionally NOT included on this shared page —
	// its $effect opens the dropdown on mount, which would put a second
	// portaled .options-list on the page during every other test and break
	// strict-mode locator assertions. It lives at /test/autocomplete/initial-query
	// instead.
</script>

<h1>autocomplete</h1>
<p>Targeted by <code>e2e/autocomplete.spec.ts</code>.</p>

<div class="fixture">
	<div class="fixture-label">single — maxSelectionCount=1, replaces value on each pick</div>
	<div id="single-wrap" style="max-width: 320px">
		<Autocomplete
			id="single"
			options={fruits}
			bind:value={singleSelected}
			maxSelectionCount={1}
			placeholder="Pick one"
		/>
	</div>
	<div id="single-value" data-value={singleSelected.join(",")}></div>
</div>

<div class="fixture">
	<div class="fixture-label">multi — default; appends; backspace removes last chip</div>
	<div id="multi-wrap" style="max-width: 320px">
		<Autocomplete
			id="multi"
			options={fruits}
			bind:value={multiSelected}
			placeholder="Pick many"
		/>
	</div>
	<div id="multi-value" data-value={multiSelected.join(",")}></div>
</div>

<div class="fixture">
	<div class="fixture-label">prefilled — starts with apple + banana selected</div>
	<div id="prefilled-wrap" style="max-width: 320px">
		<Autocomplete
			id="prefilled"
			options={fruits}
			bind:value={prefilledSelected}
			placeholder="Has chips"
		/>
	</div>
	<div id="prefilled-value" data-value={prefilledSelected.join(",")}></div>
</div>

<div class="fixture">
	<div class="fixture-label">initial options — shows top 5 on focus, before typing</div>
	<div id="initial-wrap" style="max-width: 320px">
		<Autocomplete
			id="initial"
			options={fruits}
			bind:value={initialSelected}
			showInitialOptions
			initialOptionsCount={5}
			placeholder="Focus to see options"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">max selected = 3 — fourth pick is rejected, max-message renders</div>
	<div id="max-wrap" style="max-width: 320px">
		<Autocomplete
			id="max"
			options={fruits}
			bind:value={maxSelected}
			maxSelectionCount={3}
			placeholder="Max 3"
		/>
	</div>
	<div id="max-value" data-value={maxSelected.join(",")}></div>
</div>

<div class="fixture">
	<div class="fixture-label">async — uses searchCallback with 50ms latency</div>
	<div id="async-wrap" style="max-width: 320px">
		<Autocomplete
			id="async"
			bind:value={asyncSelected}
			searchCallback={asyncSearch}
			placeholder="Type to search"
		/>
	</div>
	<div id="async-call-count" data-value={asyncCallCount}></div>
</div>

<div class="fixture">
	<div class="fixture-label">slow async (400ms) — for asserting loading indicator</div>
	<div id="slow-async-wrap" style="max-width: 320px">
		<Autocomplete
			id="slow-async"
			searchCallback={slowAsyncSearch}
			placeholder="Type to search"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">debounced — searchDelay=300ms; rapid typing collapses to one call</div>
	<div id="debounced-wrap" style="max-width: 320px">
		<Autocomplete
			id="debounced"
			searchCallback={debouncedSearch}
			searchDelay={300}
			placeholder="Type fast"
		/>
	</div>
	<div id="debounced-call-count" data-value={debouncedCallCount}></div>
</div>

<div class="fixture">
	<div class="fixture-label">minSearchLength=3 — no dropdown until 3 chars typed</div>
	<div id="minlen-wrap" style="max-width: 320px">
		<Autocomplete
			id="minlen"
			options={fruits}
			bind:value={minLenSelected}
			minSearchLength={3}
			placeholder="Type 3+ chars"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">disabled option — coconut option is disabled</div>
	<div id="disabled-opt-wrap" style="max-width: 320px">
		<Autocomplete
			id="disabled-opt"
			options={fruits}
			placeholder="Coconut is disabled"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">disabled component — input disabled, dropdown does not open</div>
	<div id="disabled-comp-wrap" style="max-width: 320px">
		<Autocomplete
			id="disabled-comp"
			options={fruits}
			disabled
			placeholder="No clicks"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">readonly component — input readonly, dropdown does not open</div>
	<div id="readonly-comp-wrap" style="max-width: 320px">
		<Autocomplete
			id="readonly-comp"
			options={fruits}
			readonly
			placeholder="Read only"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">label + required — renders label element and asterisk</div>
	<div id="labeled-wrap" style="max-width: 320px">
		<Autocomplete
			id="labeled"
			options={fruits}
			bind:value={labeledSel}
			label="Fruit"
			required
			placeholder="Pick a fruit"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">labelTemplate snippet — renders custom label content</div>
	<div id="label-tpl-wrap" style="max-width: 320px">
		<Autocomplete
			id="label-tpl"
			options={fruits}
			bind:value={labelTplSel}
			placeholder="Custom label"
		>
			{#snippet labelTemplate()}
				<span class="fluent-field-label" data-testid="custom-label">Fruit <em>(custom)</em></span>
			{/snippet}
		</Autocomplete>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">tagsPosition='top' — chips render above input</div>
	<div id="tags-above-wrap" style="max-width: 320px">
		<Autocomplete
			id="tags-above"
			options={fruits}
			bind:value={tagsAboveSel}
			tagsPosition="top"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">tagsPosition='bottom' — chips render below input</div>
	<div id="tags-below-wrap" style="max-width: 320px">
		<Autocomplete
			id="tags-below"
			options={fruits}
			bind:value={tagsBelowSel}
			tagsPosition="bottom"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">closeOnSelect={"{false}"} multi — dropdown stays open after pick</div>
	<div id="keepopen-wrap" style="max-width: 320px">
		<Autocomplete
			id="keepopen"
			options={fruits}
			bind:value={stayOpenSel}
			closeOnSelect={false}
			placeholder="Pick many, stay open"
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">selectValueOnTab=false — Tab does not pick highlighted</div>
	<div id="no-tab-wrap" style="max-width: 320px">
		<Autocomplete
			id="no-tab"
			options={fruits}
			bind:value={noTabSel}
			selectValueOnTab={false}
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">maxResultCount=2 — at most 2 options listed</div>
	<div id="limited-wrap" style="max-width: 320px">
		<Autocomplete
			id="limited"
			options={fruits}
			bind:value={limitedSel}
			maxResultCount={2}
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">showOverlayOnEmptyResults=false — empty search hides dropdown</div>
	<div id="no-empty-overlay-wrap" style="max-width: 320px">
		<Autocomplete
			id="no-empty-overlay"
			options={fruits}
			bind:value={noEmptyOverlaySel}
			showOverlayOnEmptyResults={false}
		/>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">headerContent + footerContent — render inside options list</div>
	<div id="slots-wrap" style="max-width: 320px">
		<Autocomplete
			id="slots"
			options={fruits}
			bind:value={slotsSel}
			showInitialOptions
		>
			{#snippet headerContent()}
				<div data-testid="header-slot">HEADER</div>
			{/snippet}
			{#snippet footerContent()}
				<div data-testid="footer-slot">FOOTER</div>
			{/snippet}
		</Autocomplete>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">optionTemplate — custom rendering per option</div>
	<div id="option-tpl-wrap" style="max-width: 320px">
		<Autocomplete
			id="option-tpl"
			options={fruits}
			bind:value={optionTplSel}
			showInitialOptions
		>
			{#snippet optionTemplate(option)}
				<span data-testid="custom-option">★ {option.label}</span>
			{/snippet}
		</Autocomplete>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">start + end — render inside input</div>
	<div id="icons-wrap" style="max-width: 320px">
		<Autocomplete
			id="icons"
			options={fruits}
			bind:value={iconsSel}
		>
			{#snippet start()}
				<span data-testid="start-icon">🔍</span>
			{/snippet}
			{#snippet end()}
				<span data-testid="end-icon">▼</span>
			{/snippet}
		</Autocomplete>
	</div>
</div>

<div class="fixture">
	<div class="fixture-label">onOpenChange tracker — counts dropdown close events</div>
	<div id="dismiss-wrap" style="max-width: 320px">
		<Autocomplete
			id="dismiss"
			options={fruits}
			bind:value={dismissTrackerSelected}
			onOpenChange={({open}) => { if (!open) dismissCount++ }}
		/>
	</div>
	<div id="dismiss-count" data-value={dismissCount}></div>
</div>

<div class="fixture">
	<div class="fixture-label">out-of-order async — the older, slower response must be dropped</div>
	<div id="stale-wrap" style="max-width: 320px">
		<Autocomplete id="stale" searchCallback={outOfOrderSearch} bind:value={staleSelected} />
		<div id="stale-aborted" data-value={abortedSearches}></div>
	</div>
</div>
