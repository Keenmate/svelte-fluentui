/**
 * Each component's `labels` prop type: a partial of its `svelteFluentUI.<component>.*` keys
 * (see `locales/en.ts` for the full list and English text).
 */
import type {ComponentLabels} from "./types.js"

export type AlertLabels = ComponentLabels<"alert">
export type AutocompleteLabels = ComponentLabels<"autocomplete">
export type BadgeGroupLabels = ComponentLabels<"badgeGroup">
export type CalendarLabels = ComponentLabels<"calendar">
export type ChipLabels = ComponentLabels<"chip">
export type ComboboxLabels = ComponentLabels<"combobox">
export type CommandPaletteLabels = ComponentLabels<"commandPalette">
export type CompositeBadgeLabels = ComponentLabels<"compositeBadge">
/** DatePicker's own keys plus its popup Calendar's. */
export type DatePickerLabels = ComponentLabels<"datePicker"> & CalendarLabels
export type DialogLabels = ComponentLabels<"dialog">
export type InputFileLabels = ComponentLabels<"inputFile">
export type PaginatorLabels = ComponentLabels<"paginator">
export type PanelLabels = ComponentLabels<"panel">
export type QuickGridLabels = ComponentLabels<"quickGrid">
export type SelectLabels = ComponentLabels<"select">
export type SiteSettingsLabels = ComponentLabels<"siteSettings">
export type TabsLabels = ComponentLabels<"tabs">
export type TimePickerLabels = ComponentLabels<"timePicker">
export type ToastLabels = ComponentLabels<"toast">
export type ToastContainerLabels = ComponentLabels<"toastContainer">
export type TopNavLabels = ComponentLabels<"topNav">
