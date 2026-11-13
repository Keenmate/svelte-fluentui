# Open questions (recorded while working unattended)

Answer inline; each item says what I did in the meantime.

## Q1 — Is SSR a supported target for 2.0?

The docs app runs with `ssr = false` (root `+layout.ts`), so server rendering is never exercised.
Beyond the Phase 1 fixes (`navigator.language` default, `customElements.get`, `Math.random` ids),
every wrapper calls `provideFluentDesignSystem().register()` at the top of its script, and importing
`@fluentui/web-components` on the server likely fails anyway (FAST extends `HTMLElement`).
**Meanwhile:** fixed the obvious spots only; Phase 2 "central, browser-guarded registration" is where
real SSR support would land. If SSR should be supported, I'd add one SSR smoke route to the docs app
(with `ssr = true`) and an e2e check.

## Q2 — `lib/actions/` already exists

The plan puts the ActionItem port (core `/actions`) in `lib/actions/`, but that folder already holds
Svelte actions (`portal.ts`, `use-actions.ts`). **Proposal:** put the ActionItem model in
`lib/action-items/` (types + `resolveActionItem` / `resolveMenuEntries` / `runAction`) and leave
`lib/actions/` for `use:` actions (or move those to `lib/attachments/` when they become attachments).

## Q3 — Names for the renamed store types

`Toast` (store) → `ToastInstance`, `SiteSettings` (store) → `SiteSettingsState` (commit cf07faf).
They clashed with the component names. Fine, or prefer other names? Both stores get reworked again
in Phase 2 (runes classes) and Phase 4 (`error` → `danger`, positions), so renaming is cheap now.

## Q4 — Dialog `trapFocus={false}`: not a bug

The audit said `trapFocus={false}` is never sent. It isn't sent as an attribute, but `setFocusTrap`
applies it whenever the dialog opens; e2e `dialog.spec.ts` confirms focus can leave. Dropped from Phase 1.

## Q5 — Prettier: no config and not installed

`npm run format` / `lint` call Prettier, but there is no `.prettierrc` and Prettier isn't a dependency,
so the planned "Prettier pass" would apply Prettier's defaults (semicolons, 2-space indent) to a
codebase that is tab-indented, semicolon-free, double-quoted. Measured in `src/lib` (127 files):
~89% of statements have no `;`, 367 vs 18 double- vs single-quoted imports, `import {x}` 85 vs
`import { x }` 28. **Proposal** (matches the majority, minimal churn):

```json
{ "useTabs": true, "semi": false, "singleQuote": false, "bracketSpacing": false,
  "trailingComma": "none", "printWidth": 120, "plugins": ["prettier-plugin-svelte"] }
```

plus `prettier` + `prettier-plugin-svelte` as devDependencies. **Skipped until you confirm** (it
touches every file, and adds dependencies). ESLint is referenced by `lint` but not installed either —
drop it from the script, or add a config?

## Q6 — Autocomplete e2e is flaky under parallel workers

`e2e/autocomplete.spec.ts` runs 30+ tests against one fixture page with 25+ Autocompletes; with
4 workers a random test occasionally misses its dropdown (passes on rerun, also flaky before my
changes). Options: split the fixture into smaller routes, or run that file serially
(`test.describe.configure({mode: "serial"})`). Not changed yet.
Update: a different test fails each time and none reproduces alone (12/12 and 6/6 in isolation), which
points at the dev server reloading pages under load rather than component bugs. Running the suite
against `vite preview` (a build) instead of `npm run dev` would likely make it deterministic.
Update 2: after restarting the dev server, the full suite (79 tests) passed with no flakes — the
long-running dev server (hundreds of HMR updates) seems to be the cause.

## Q7 — Pre-existing problems noticed (not fixed, outside Phase 1 scope)

- (Fixed 2026-11-11: docs svelte-check is at 0 errors.) `docs` svelte-check: 25 type errors at baseline (layout, appbar demo, quickgrid demos, text-field
  demo, order-form). Fix as part of the Phase 4 docs updates, or a separate cleanup commit?
- `/components/tabs` logs "lock_16_regular.svg not found" — icon referenced by a dynamic name;
  needs `iconsInclude` in the docs Vite config or a static reference.

## Q8 — Names I picked where the 05 mapping table was silent (applied rule 1)

The 05 table doesn't list every function prop. Where the return value is used I renamed per rule 1
(`get…Callback` / `…Callback`, one ctx object). Easy to rename again if you prefer other words:
- Calendar `selectableDates` → `getIsDateSelectableCallback({date})` (also DatePicker)
- Calendar `highlightDates` → `getDatesToHighlightCallback({date})`
- Calendar `selectDates` → `getDatesToSelectCallback({date})`
- Combobox `filter` → `filterCallback({term, option})`
- Calendar `onSelectionError` → `onSelectionReject` (as in the table) and its code value is now
  kebab-case `max-selectable-days-exceeded` (value-casing rule).
- `maxSelectableDays` left as is for now; rulebook D-NC-22 would make it `maxSelectedDayCount` —
  will do it with the other limit renames (`maxSelectedOptions` → `maxSelectionCount`) unless you object.

**Decided 2026-11-12: apply D-NC-22 to all limits:** `maxSelectionCount`, `maxResultCount` (Autocomplete `maxOptionsSearch`, CommandPalette `maxResults`), `maxVisibleBadgeCount` (BadgeGroup `limit`), `maxSelectedDayCount`, `minFileCount`, `maxVisibleFileCount`, `maxVisibleOptionCount`.

## Q9 — Dialog `preventClose`: kept (the 05 mapping said drop it)

`beforeCloseCallback({reason})` now replaces `onbeforeclose` (veto with `false`, async OK). The table also
said to drop `preventClose`, but it does more than veto: it hides the × button and makes Escape /
overlay clicks inert. Without it a "must answer" dialog would show a × that does nothing. **Kept for
now.** Options: keep it (maybe rename to `closable={false}` / `dismissible`-style), or drop it and add a
`showCloseButton` prop. Your call.

## Q10 — QuickGrid `beforeCommitCallback` result vs the before* contract

Renamed `onbeforecommit` → `beforeCommitCallback` but **kept its result semantics**:
`ValidationResult | boolean | string | null`, where a returned *string is an error message*. The generic
before* contract (05 rule 6) says any returned value *replaces* the value. Options:
(a) keep as is and document QuickGrid's commit callback as a validation callback (maybe rename to
`validateCallback` and fold the old `validate` into it), or (b) follow the contract strictly:
`false` rejects, `{error}` rejects with a message, `{value}` / other value replaces.
Also: `editCallback` is my name for the old `oncelledit` (custom editor hook; 05 said "verify →
renderEditorCallback" — it doesn't render, it hands you commit/cancel).

## Q11 — `danger` vs `error` for validation / message intent

The plan follows the BlissFramework rulebook (D-NC-23: `info | success | warning | danger`). Microsoft
Fluent UI itself uses `error` (Fluent v9 `MessageBar intent`, `Field validationState`, `Toast intent`).
Alert already uses `danger`; Toast (`variant: "error"` + `toast.error()`) and Field
(`validationState: "error"`) don't. Not changed yet — which wins for 2.0: the rulebook (`danger`
everywhere, `toast.danger()`?) or Fluent naming (`error`, and Alert moves back to `error`)?

**Decided 2026-11-12: `error` (Microsoft Fluent).** Alert `danger` → `error`; Toast / Field unchanged. Recorded as an exception in BlissFramework D-NC-23.

## Q12 — Panel `side`: keep `"left"` / `"right"`?

Everything else that positions things now uses logical values (Tooltip, PositioningRegion,
Select/Combobox, Toast, column `align`). Panel accepts both `"left" | "right"` (physical) and
`"start" | "end"` (logical, flips with `dir="rtl"`), default `"right"`. Options: (a) keep both —
physical sides are sometimes intended (e.g. a fixed settings drawer); (b) drop `left`/`right`, default
`"end"`.

**Decided 2026-11-11: (b) start/end only, default `"end"`.** Done.

## Q13 — NumberField `value` is a `string`, Slider's is a `number`

Should NumberField become `number | null` (empty field = `null`)? Not changed.

**Decided 2026-11-12: `number | null`** (empty field = `null`).

## Q14 — Where `...rest` lands on composite components

Pickers, Select, Combobox, Autocomplete, QuickGrid and Field spread `...rest` on their root wrapper, so
`aria-describedby`, `oninput`, … don't reach the inner input / trigger. Alternative: send rest to the
focusable element (and chain any handler the component uses itself). Root wrapper for now.

**Decided 2026-11-12: outer wrapper** (current behaviour).

## Q15 — Combobox `height`

Documented as accepted but a no-op. Remove in 2.0?

**Decided 2026-11-12: implement** like Autocomplete / Select / NumberField / Search (inline-style shortcut on the control).

## Q16 — Select / Combobox `onOpenChange`

Both have a bindable `open` but no `onOpenChange` (DatePicker, TimePicker and Autocomplete have one).
Add it for consistency? (Recommended: yes, cheap.)

**Decided 2026-11-12: add `onOpenChange({open})`** to Select and Combobox.

## Q17 — Leftovers noticed, not done yet

- Autocomplete's local `OptionItem<T>` uses `text`; the exported `OptionItem` uses `label` (plan §6:
  one generic `OptionItem<T>` with `label`).
- Field `ValidationState` → `FieldValidationState` rename (plan §6).
- ~24 physical `left`/`right` CSS properties remain in form component styles (DatePicker, Switch,
  OptionGroup, …) — Phase 5 logical-properties sweep.

## Q18 — PositioningRegion `visible`: bindable?

It never changes visibility itself (the consumer closes it), so `$bindable` would never be written —
the same trap as AppBarItem `active` (now a plain prop). Left as a plain prop.

**Decided 2026-11-12: keep a plain prop.** (Explain the reasoning to the user once the batch is done.)

## Q19 — AppBarItem `count`

Declared but never rendered. Implement (a badge on the item) or remove?

**Decided 2026-11-12: implement as a count badge** on the item.

## Q20 — `id` / `title` used as persistence keys

MultiSplitter `id` and NavGroup `title` double as localStorage keys, so a DOM `id`/`title` can't be
passed through `...rest`. Rename the persistence role to `persistKey`?

**Decided 2026-11-12: add `persistKey`**; persistence only when it's set, `id` / `title` become plain attributes.

## Q21 — Tabs `childContent`

Everything else uses `children`. Rename?

**Decided 2026-11-12: rename to `children`.**

## Q22 — Element-specific rest types

`RestProps` is based on `HTMLAttributes<HTMLElement>`, so `target`/`download`/`rel` on link-like
components (NavLink, Anchor, AppBarItem) aren't typed — AppBarItem got an explicit `target`. Add an
anchor-flavoured `RestProps` variant in `types/index.ts`?

**Decided 2026-11-12: add `AnchorRestProps`** (based on `HTMLAnchorAttributes`) for link components; AppBarItem drops its explicit `target`.

## Q23 — One warning hue

Alert and Toast use `#ffb900` for warning; the shared palette (`--fluent-color-warning*`, Field,
Label) uses `#c87018`. Pick one (Fluent v9 uses a darker orange for warning text/foreground, a yellow
for warning backgrounds). Once picked, the SCSS `$color-*` tokens can go.

## Q24 — Accent-insensitive matching everywhere?

Combobox matching ignores accents (`"cesky"` finds `"Český"`). Select type-ahead, Autocomplete and the
QuickGrid cell editor still treat accents as significant — kept as is by the helpers refactor. Make
them all accent-insensitive (one option flip each in `helpers/text.ts` callers)?

**Q23 answer pending — asked 2026-11-13 "which is standard for Microsoft?"** Answer given: Fluent 2 /
v9 (current Microsoft standard) uses an **orange** family for warning status (`colorStatusWarning*`
tokens, dark-orange foreground/icon, pale-orange background). The yellow `#ffb900` is the older
Fluent v8 / Office UI Fabric "warning" yellow. Recommendation: align Alert/Toast to the palette's
orange (`--fluent-color-warning*`, currently `#c87018`; verify against Fluent v9 values). Awaiting the
user's go-ahead.

**Q24 decided 2026-11-13: copy web-multiselect.** It has `searchBehavior?: "normalized" |
"case-insensitive" | "exact"` (default `"normalized"`; `normalized` ignores case and diacritics,
`case-insensitive` ignores case only, `exact` is both-sensitive; every mode compares NFC text; the
match highlight follows the same rules; no effect on `searchCallback` / regex). See
`C:/Git/KM/web-multiselect/src/types.ts` (~line 1000) and `normalizeSearchText` in its
`src/multiselect.ts`. **To do:** replace `helpers/text.ts`'s `{diacritics}` option with
`SearchBehavior` (exported type), add a `searchBehavior` prop (default `"normalized"`) to Combobox,
Select (type-ahead), Autocomplete and the QuickGrid cell editor (column `editorOptions`), docs rows,
e2e (`ces` → `Český` in each), release-notes row (behaviour change: Select type-ahead, Autocomplete
and cell editor become accent-insensitive by default).


**Q24 done 2026-11-13.** `helpers/text.ts` is a port of web-components-core `search/normalize.ts`
(hand folds `ł ø ß æ …`, NFKD, marks kept outside Latin/Greek/Cyrillic). No component highlights
matches, so the highlight rule has nothing to apply to. Select type-ahead no longer lowercases its
buffer (`exact` would otherwise never match an uppercase label). Found while wiring: QuickGrid
`editorOptions.maxSelections` is declared but unused (and misnamed per D-NC-22) — open.

**Q23 done 2026-11-13 (user: yes).** Verified against `@fluentui/tokens` 9.75: warning → `orange`;
light Foreground1/3 `#bc4b09`, Background1 `#fff9f5`, Border1 `#fdcfb4`; dark Foreground1 `#faa06b`.
`--fluent-color-warning-foreground` `#c87018` → `#bc4b09`; Alert and Toast warning read it (were
hard-coded `#ffb900`). Badge/Label/CompositeBadge yellow fill (`--fluent-color-warning`) unchanged.

**Q-QG-1 decided 2026-11-13:** `onRowChange` provides the row's full current state (`draftRow`, invalid
values included) plus `invalidFields` (`{field, error, value}[]`) and `isRowValid`; consumer decides
what to store. Details in `06-quickgrid-plan.md`.

**Q-QG-2 decided 2026-11-13:** port web-grid's sort/paging model (`sortMode`, `bind:sort`, `paginationMode`,
`bind:currentPage`/`pageSize`, `totalItems`, `beforePageChangeCallback`, `onDataRequest`). **Q-QG-3 decided:**
`rowIndex` → `viewIndex` + `itemIndex` + `rowKey`. Details in `06-quickgrid-plan.md`.

## Open for 2026-11-14 (QuickGrid)

**Q-QG-4 — editable grids without `idMember`.** After Phase 1 a row without `idMember` is identified by
its object. Consumers that update immutably (`items = items.map(...)`, `items[i] = {...draftRow}`)
create a new object, so that row loses its pending invalid values, invalid markers and an open
toolbar — exactly the pattern the docs use. Options: (a) keep the console warning and document
"editable grids need `idMember`"; (b) make `idMember` required when `editable` (type-level / dev error);
(c) default `idMember` to `"id"` when rows have an `id` field. Recommendation: (c) + (a) — most data has
`id`, and the warning still covers the rest.

**Q-QG-5 — next step.** Phase 2 (editing state machine: edit token, per-cell draft overrides,
`invalidFields` / `isRowValid` per Q-QG-1, validation on every commit path) is next per the plan. Go?
Also: fix the clipped advanced row toolbar on the editable docs page now (small, pre-existing) or in Phase 5?
