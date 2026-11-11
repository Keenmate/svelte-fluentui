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

- `docs` svelte-check: 25 type errors at baseline (layout, appbar demo, quickgrid demos, text-field
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

## Q12 — Panel `side`: keep `"left"` / `"right"`?

Everything else that positions things now uses logical values (Tooltip, PositioningRegion,
Select/Combobox, Toast, column `align`). Panel accepts both `"left" | "right"` (physical) and
`"start" | "end"` (logical, flips with `dir="rtl"`), default `"right"`. Options: (a) keep both —
physical sides are sometimes intended (e.g. a fixed settings drawer); (b) drop `left`/`right`, default
`"end"`.

**Decided 2026-11-11: (b) start/end only, default `"end"`.** Done.

## Q13 — NumberField `value` is a `string`, Slider's is a `number`

Should NumberField become `number | null` (empty field = `null`)? Not changed.

## Q14 — Where `...rest` lands on composite components

Pickers, Select, Combobox, Autocomplete, QuickGrid and Field spread `...rest` on their root wrapper, so
`aria-describedby`, `oninput`, … don't reach the inner input / trigger. Alternative: send rest to the
focusable element (and chain any handler the component uses itself). Root wrapper for now.

## Q15 — Combobox `height`

Documented as accepted but a no-op. Remove in 2.0?

## Q16 — Select / Combobox `onOpenChange`

Both have a bindable `open` but no `onOpenChange` (DatePicker, TimePicker and Autocomplete have one).
Add it for consistency? (Recommended: yes, cheap.)

## Q17 — Leftovers noticed, not done yet

- Autocomplete's local `OptionItem<T>` uses `text`; the exported `OptionItem` uses `label` (plan §6:
  one generic `OptionItem<T>` with `label`).
- Field `ValidationState` → `FieldValidationState` rename (plan §6).
- ~24 physical `left`/`right` CSS properties remain in form component styles (DatePicker, Switch,
  OptionGroup, …) — Phase 5 logical-properties sweep.
