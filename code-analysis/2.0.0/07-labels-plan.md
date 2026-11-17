# 07 — Translations: one app-wide dictionary (2.0.0)

Status: **done 2026-11-17** (commit after 13a6890). All components converted; docs guide `/guides/translations`.

Decided by the user:
- Built-in UI text moves to **one flat, app-wide dictionary** in the pure-admin style
  (`../svelte-pure-admin/TRANSLATIONS.md`, `../keen-pure-admin/lib/keen_pure_admin/translations.ex`):
  easy to keep in a file or a database, easy to reorder.
- Key prefix **`svelteFluentUI.`** (`svelteFluentUI.datePicker.openPopupAriaLabel`).
- Built-in locales: **English and German** (no Czech).
- The shared vocabulary (`close`, `clear`, `remove`, …) is approved as the *purpose* part of keys.
- **Where the text lands matters**: visible text, tooltip and screen-reader label are separate keys
  (a "Save" button and its "Save changes (Ctrl+S)" tooltip differ).
- **The service mirrors svelte-pure-admin's** (`packages/svelte-pure-admin/src/lib/i18n/`): named
  `i18n`, same API, built on **svelte-i18n** (2026-11-17).

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

## Values: plain strings, ICU syntax

Everything is a plain string so it can live in JSON or a DB row. Today ~30 labels are functions;
they become svelte-i18n (ICU MessageFormat) strings:

```
svelteFluentUI.paginator.pageInfo     = "Page {page} of {pageCount}"
svelteFluentUI.inputFile.fileCount    = "{count, plural, one {# file} other {# files}}"
```

Plurals are ICU `plural` inside the one string (German / English need `one` / `other`; languages
with `few` / `many` just add them) — no `.one` / `.other` key variants.

## API — mirrors svelte-pure-admin's `i18n` service

Same structure and names as `../svelte-pure-admin/packages/svelte-pure-admin/src/lib/i18n/`:

```
src/lib/i18n/
  i18n-service.svelte.ts   reactive singleton `i18n` (Svelte 5 runes) over svelte-i18n
  index.ts                 exports `i18n`, built-in locales, re-exports from svelte-i18n
  types.ts                 Language, I18nInitOptions, SvelteFluentUITranslations
  locales/en.ts, de.ts     flat Record<string, string>, `svelteFluentUI.*` keys
```

- **Dependency:** `svelte-i18n` (as in svelte-pure-admin). Built-in `en` / `de` are registered with
  `addMessages` and svelte-i18n is initialised on import (`autoInit`), so nothing is needed for English.
- **`i18n` service** — same members as pure-admin:
  - state: `currentLocale`, `languages`, `isLoading`, `fallbackLocale`, `loadedLocales`;
  - `init({locale, fallbackLocale, languages, translations, loadTranslations})`;
  - `setLocale(code)` (async; runs the loader for a locale not loaded yet);
  - `addTranslations(code, obj)`, `setTranslationLoader(fn)`;
  - `addLanguage` / `removeLanguage` / `setLanguages` / `getLanguage` / `isLocaleLoaded`.
- **`Language`**: `{code, nameText?, nativeNameText?}` (pure-admin naming); built-ins English /
  Deutsch.
- **Re-exports** from svelte-i18n: `_`, `locale`, `locales`, `isLoading`, `addMessages`, `register`,
  `init`, `getLocaleFrom*` — the app imports them from `svelte-fluentui` so `autoInit` has run.
- **App keys and library keys share one dictionary and one locale**: the app puts `app.*` and
  overrides of `svelteFluentUI.*` in the same `translations` / `loadTranslations`; one `setLocale`
  switches both. File or DB loading goes through `loadTranslations` (pure-admin Patterns A–C).
- **No Provider**: we have no `PureAdminProvider` equivalent, so apps call `i18n.init(…)` in the root
  layout (pure-admin Pattern A).
- **Per-instance `labels` prop** stays as the top override. Components read text through one helper
  (`const t = useTranslations("datePicker", () => labels)`, then `t("openPopupAriaLabel")` /
  `t("pageInfo", {page, pageCount})`): `labels[key]` if set (same ICU syntax), else
  `$_("svelteFluentUI.datePicker." + key, {values})`. Replaces the `{...defaultX, ...labels}` merge
  in every component; switching locale updates open UI.
- Missing key in the current locale → svelte-i18n `fallbackLocale` (`en`).
- The `defaultXLabels` objects and `X.labels.ts` files go away; `XLabels` types stay (key unions
  checked against `en.ts`, so a missing key is a type error).
- SSR: svelte-i18n's locale is a module singleton, shared across server requests — the same
  limitation svelte-pure-admin accepts; fine for SPAs and one-locale-per-deployment sites.
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
| Autocomplete | `maxSelectionReached(max)` | `maxSelectionReached` "{max, plural, one {Maximum # selection} other {Maximum # selections}} reached" |
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

Default-value fix on the way: Paginator `itemCount` says "1 items" — becomes an ICU plural.

## Standalone props folded into `labels` (00-plan question 1)

| Component | Removed prop | Use instead |
|---|---|---|
| DatePicker | `openCalendarIconAriaLabel` / `popupAriaLabel` | `labels.openPopupAriaLabel` / `labels.popupAriaLabel` |
| TimePicker | `openClockIconAriaLabel` / `popupAriaLabel` | same |
| Combobox | `loadingText` | `labels.loading` |
| BadgeGroup | `moreLabel` / `lessLabel` | `labels.showMore` / `labels.showLess` |
| Chip | `removeLabel` | `labels.removeAriaLabel` |

Stay standalone: `placeholder` and `emptyText` / the `empty` snippet (per-instance content).

## Decisions (formerly open questions)

- T2. **Decided 2026-11-17: yes** — `i18n.currentLocale` becomes the default `culture` of Calendar / DatePicker /
  TimePicker (month / weekday names via `Intl`)? Today they default to `navigator.language`.

(T1 service name → `i18n`, as pure-admin; T3 SSR → accepted as in pure-admin. Both settled 2026-11-17.)

## Order of work (once approved)

1. `npm i svelte-i18n`; `i18n/` (service, types, `locales/en.ts` + `de.ts`) ported from svelte-pure-admin + `useTranslations` helper, unit-tested.
2. Components one by one: keys renamed / split per the table, `labels` override via the helper,
   docs page + e2e in the same commit; `X.labels.ts` files removed.
3. Fold the standalone props.
4. Docs: a Translations page (keys table generated from `en.ts`, file / DB / translator examples,
   English / Deutsch switch in the docs header).
5. CHANGELOG + release-notes rows; `npm run check` (lib + docs), full Playwright run.
