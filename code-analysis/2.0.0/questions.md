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
