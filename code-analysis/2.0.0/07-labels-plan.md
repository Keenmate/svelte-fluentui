# 07 — Translations: one app-wide dictionary (2.0.0)

Status: **proposal, revised 2026-11-17** after the user's review. Nothing changed in code yet.

Decided by the user:
- Built-in UI text moves to **one flat, app-wide dictionary** in the pure-admin style
  (`../svelte-pure-admin/TRANSLATIONS.md`, `../keen-pure-admin/lib/keen_pure_admin/translations.ex`):
  easy to keep in a file or a database, easy to reorder.
- Key prefix **`svelteFluentUI.`** (`svelteFluentUI.datePicker.openPopupAriaLabel`).
- Built-in locales: **English and German** (no Czech).
- The shared vocabulary (`close`, `clear`, `remove`, …) is approved as the *purpose* part of keys.
- **Where the text lands matters**: visible text, tooltip and screen-reader label are separate keys
  (a "Save" button and its "Save changes (Ctrl+S)" tooltip differ).

The per-instance `labels` prop stays as an override for one instance.

## Key format

```
svelteFluentUI.<component>.<purpose><Surface>
```

- `<component>` — camelCase component name: `datePicker`, `quickGrid`, `inputFile`, `commandPalette`.
- `<purpose>` — what the text is for, from the shared vocabulary where one fits.
- `<Surface>` — where it is rendered:

| Ending | Rendered as | Example |
|---|---|---|
| none | visible text (caption, message, status, hint) | `timePicker.apply` "OK", `quickGrid.empty` "No items to display" |
| `Placeholder` | input placeholder | `datePicker.placeholder` (the purpose *is* the surface — no double suffix) |
| `Tooltip` | hover `title` | `tabs.closeTooltip` "Close" |
| `AriaLabel` | screen-reader-only name (`aria-label`) | `tabs.closeAriaLabel` "Close tab" |

One key per surface. Where one string feeds both `aria-label` and `title` today (most icon
buttons), it splits into `…AriaLabel` + `…Tooltip` with the same English default, so either can be
changed alone. `Text`/`Title` endings go away (`emptyText` → `empty`, `closeTabTitle` → `closeTooltip`).

The local key (`openPopupAriaLabel`) is what the `labels` prop and the `XLabels` type use; the
dictionary key is the same with `svelteFluentUI.<component>.` in front.

### Shared vocabulary (purpose part)

| Purpose | Meaning | Components |
|---|---|---|
| `close` | closes a container | Dialog, Panel, ToastContainer, Tabs (per tab) |
| `dismiss` | makes a message / chip go away | Alert, Toast, CompositeBadge, Dialog (`dismissible` button) |
| `clear` | the field's `showClear` × | Select, Combobox, Autocomplete, DatePicker, TimePicker |
| `remove` | removes one item (`{item}`) | Chip, Combobox, Autocomplete, InputFile |
| `empty` | nothing at all to show | CommandPalette, QuickGrid, InputFile |
| `noMatches` | a search found nothing (`{query}` available) | Combobox, Autocomplete, CommandPalette |
| `loading` | waiting for data | Combobox, Autocomplete |
| `openPopup` / `closePopup` | button that opens / closes the field's popup | DatePicker, TimePicker, Autocomplete |
| `popup` | the popup itself | DatePicker, TimePicker |
| `showMore` / `showLess` | reveal / hide overflow (`{count}`) | BadgeGroup, InputFile |
| `firstPage` `previousPage` `nextPage` `lastPage` `pageInfo` `itemCount` `pagination` | paging | Paginator, QuickGrid |

## Values: strings with `{param}`, plurals by suffix

Everything is a plain string so it can live in JSON or a DB row. Today ~30 labels are functions;
they become templates:

```
svelteFluentUI.paginator.pageInfo          = "Page {page} of {pageCount}"
svelteFluentUI.inputFile.fileCount.one     = "{count} file"
svelteFluentUI.inputFile.fileCount.other   = "{count} files"
```

Plurals: a key with a `count` param looks up `<key>.<category>` with `Intl.PluralRules(locale)`
(`one` / `other` for English and German; `few` / `many` work for languages that need them), then
`<key>.other`, then `<key>`. No ICU parser, no dependency.

## API

Own small implementation (no svelte-i18n dependency — a component library shouldn't force one
on the app), a Svelte 5 reactive singleton like pure-admin's `i18n` service:

```ts
import {fluentTranslations} from "svelte-fluentui"

fluentTranslations.setLocale("de")                        // built-in: "en", "de"
fluentTranslations.addTranslations("de", {                // flat keys, from a file or DB
	"svelteFluentUI.dialog.closeAriaLabel": "Dialog schließen"
})
fluentTranslations.setTranslator((key, params) => myT(key, params))  // optional hook
```

- `setTranslator`: apps that already use svelte-i18n / i18next / a DB plug their lookup in (same
  idea as keen's `translate` callback). Returning `null`/`""` falls back.
- Lookup order: instance `labels` prop → translator → `addTranslations` for the current locale →
  built-in current locale → built-in English.
- Components read text through one helper (`const t = useTranslations("datePicker", () => labels)`,
  then `t("openPopupAriaLabel")` / `t("pageInfo", {page, pageCount})`), replacing the
  `{...defaultX, ...labels}` merge in every component. Reactive: switching locale updates open UI.
- Built-in dictionaries: `src/lib/translations/en.ts`, `de.ts` (flat `Record<string, string>`),
  exported (`translationsEn`, `translationsDe`) so apps can copy them as a starting file.
- The `defaultXLabels` objects and `X.labels.ts` files go away; `XLabels` types stay (generated
  from / checked against `en.ts` so a missing key is a type error).
- German defaults are drafted by me and need a native-speaker review before release.

## Rename table (local keys; dictionary key = `svelteFluentUI.<component>.` + local key)

Keys not listed keep their name. "→ A + T" = split into `…AriaLabel` + `…Tooltip`.

| Component | Before | After |
|---|---|---|
| Alert | `dismiss` | `dismissAriaLabel` |
| Autocomplete | `placeholder` | `placeholder` |
| Autocomplete | `emptyText` | `noMatches` |
| Autocomplete | `loading` | `loadingAriaLabel` |
| Autocomplete | `clearSelection` | `clearAriaLabel` + `clearTooltip` |
| Autocomplete | `showOptions` / `closeOptions` | `openPopupAriaLabel` / `closePopupAriaLabel` |
| Autocomplete | `removeChip(label)` | `removeAriaLabel` "Remove {item}" (passed to Chip) |
| Autocomplete | `maxSelectionReached(max)` | `maxSelectionReached` "Maximum {max} selections reached" + `.one` |
| BadgeGroup | `more(n)` / `less` | `showMore` "+{count} more" / `showLess` |
| Calendar | `previousPeriod` / `nextPeriod` | `previousPeriodAriaLabel` + `…Tooltip`, `nextPeriodAriaLabel` + `…Tooltip` |
| Chip | `remove(text)` | `removeAriaLabel` "Remove {item}" |
| Combobox | `emptyText` | `noMatches` |
| Combobox | `loadingText` | `loading` |
| Combobox | `removeChip(label)` | `removeAriaLabel` |
| Combobox | `clearSelection` | `clearAriaLabel` + `clearTooltip` |
| CommandPalette | `dialog` | `dialogAriaLabel` |
| CommandPalette | `results` | `resultsAriaLabel` |
| CommandPalette | `noItems` | `empty` |
| CompositeBadge | `dismiss` | `dismissAriaLabel` |
| DatePicker | `openCalendar` | `openPopupAriaLabel` |
| DatePicker | `popup` | `popupAriaLabel` |
| DatePicker | `clear` | `clearAriaLabel` + `clearTooltip` |
| Dialog | `close` | `closeAriaLabel` |
| Dialog | `dismiss` | `dismiss` (visible button text — unchanged) |
| InputFile | `browse` | `browse` + `browseAriaLabel` (used as both today) |
| InputFile | `selectFiles` | `selectFilesAriaLabel` |
| InputFile | `viewFiles` | `viewFilesAriaLabel` |
| InputFile | `remove` | `removeAriaLabel` + `removeTooltip` ("Remove {item}") |
| InputFile | `cancel` `pause` `resume` `retry` `download` | `…AriaLabel` |
| InputFile | `emptyText` | `empty` |
| InputFile | `uploadedAnnouncement` / `failedAnnouncement` | unchanged (live-region text) |
| Paginator | `pagination` | `paginationAriaLabel` |
| Paginator | `firstPage` `previousPage` `nextPage` `lastPage` | each → A + T |
| QuickGrid | `filterPlaceholder` | `filterPlaceholder` |
| QuickGrid | `filterAriaLabel(title)` | `filterAriaLabel` "Filter {column}" |
| QuickGrid | `emptyText` | `empty` |
| QuickGrid | `pagination` / `rowActions` | `…AriaLabel` (rowActions → A + T) |
| QuickGrid | `edit` `expand` `loadingOptions` `validating` | each → A + T |
| QuickGrid | `invalidValue` | `invalidValueTooltip` |
| QuickGrid | `editorEmptyText` / `editorFilterEmptyText` | `editorEmpty` / `editorNoMatches` |
| QuickGrid | `editorEmptyOption` | `editorEmptyOption` (visible + placeholder; one string) |
| Select | `clearSelection` | `clearTooltip` (the × is `aria-hidden`; Delete/Backspace is the keyboard path) |
| Tabs | `closeTab` / `closeTabTitle` | `closeAriaLabel` / `closeTooltip` |
| Tabs | `editTabName` | `editNameTooltip` |
| Tabs | `moreTabs` | `moreTabsAriaLabel` |
| Tabs | `scrollLeft` `scrollRight` `scrollUp` `scrollDown` | `scrollBackwardAriaLabel` / `scrollForwardAriaLabel` (no physical directions; drops the RTL swap) |
| TimePicker | `openPicker` | `openPopupAriaLabel` |
| TimePicker | `popup` | `popupAriaLabel` |
| TimePicker | `clear` | `clearAriaLabel` + `clearTooltip` |
| Toast | `dismiss` / `dismissTitle` | `dismissAriaLabel` / `dismissTooltip` |
| ToastContainer | `close` | `closeAriaLabel` |
| Panel | `close` | `closeAriaLabel` |
| TopNav | `openMenu` / `closeMenu` | `openMenuAriaLabel` / `closeMenuAriaLabel` |

Default-value fix on the way: Paginator `itemCount` says "1 items" — gets `.one` / `.other`.

## Standalone props folded into `labels` (00-plan question 1)

| Component | Removed prop | Use instead |
|---|---|---|
| DatePicker | `openCalendarIconAriaLabel` / `popupAriaLabel` | `labels.openPopupAriaLabel` / `labels.popupAriaLabel` |
| TimePicker | `openClockIconAriaLabel` / `popupAriaLabel` | same |
| Combobox | `loadingText` | `labels.loading` |
| BadgeGroup | `moreLabel` / `lessLabel` | `labels.showMore` / `labels.showLess` |
| Chip | `removeLabel` | `labels.removeAriaLabel` |

Stay standalone: `placeholder` and `emptyText` / the `empty` snippet (per-instance content).

## Open questions

- T1. `fluentTranslations` as the service name — OK? (pure-admin calls it `i18n`; ours would clash
  less with an app's own `i18n`.)
- T2. Should the translation locale also become the default `locale` of Calendar / DatePicker /
  TimePicker (month / weekday names via `Intl`)? Today they default to `navigator.language`.
- T3. SSR with several locales at once: a module singleton is shared across requests on the
  server. Fine for SPAs and single-locale sites; for multi-locale SSR we'd add a context override
  (`setFluentLocale` in the root layout). Needed now?

## Order of work (once approved)

1. `translations/` (service, `en.ts`, `de.ts`, plural + `{param}` lookup) + `useTranslations` helper, unit-tested.
2. Components one by one: keys renamed / split per the table, `labels` override via the helper,
   docs page + e2e in the same commit; `X.labels.ts` files removed.
3. Fold the standalone props.
4. Docs: a Translations page (keys table generated from `en.ts`, file / DB / translator examples,
   German demo switch).
5. CHANGELOG + release-notes rows; `npm run check` (lib + docs), full Playwright run.
