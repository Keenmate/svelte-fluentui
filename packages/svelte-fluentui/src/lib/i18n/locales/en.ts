/**
 * English translations (default + fallback).
 * Flat keys, `svelteFluentUI.<component>.<purpose><Surface>`; values use ICU MessageFormat
 * (`{param}`, `{count, plural, …}`). Key endings: none = visible text, `Placeholder`,
 * `Tooltip` = hover title, `AriaLabel` = screen-reader-only name.
 */
export const en = {
	// Alert
	"svelteFluentUI.alert.dismissAriaLabel": "Dismiss",

	// AppBar
	"svelteFluentUI.appBar.moreItemsTooltip": "View more apps",
	"svelteFluentUI.appBar.moreItemsAriaLabel": "View more apps",
	"svelteFluentUI.appBar.popupAriaLabel": "More apps",
	"svelteFluentUI.appBar.searchPlaceholder": "Search apps",
	"svelteFluentUI.appBar.searchAriaLabel": "Search apps",
	"svelteFluentUI.appBar.noResults": "No apps found",

	// Autocomplete
	"svelteFluentUI.autocomplete.placeholder": "Type to search...",
	"svelteFluentUI.autocomplete.noMatches": "No results found",
	"svelteFluentUI.autocomplete.loadingAriaLabel": "Loading",
	"svelteFluentUI.autocomplete.clearAriaLabel": "Clear selection",
	"svelteFluentUI.autocomplete.clearTooltip": "Clear selection",
	"svelteFluentUI.autocomplete.openPopupAriaLabel": "Show options",
	"svelteFluentUI.autocomplete.closePopupAriaLabel": "Close options",
	"svelteFluentUI.autocomplete.removeAriaLabel": "Remove {item}",
	"svelteFluentUI.autocomplete.removeTooltip": "Remove {item}",
	"svelteFluentUI.autocomplete.maxSelectionReached": "{max, plural, one {Maximum # selection reached} other {Maximum # selections reached}}",

	// BadgeGroup
	"svelteFluentUI.badgeGroup.showMore": "+{count} more",
	"svelteFluentUI.badgeGroup.showLess": "Show less",

	// Calendar (also inside DatePicker)
	"svelteFluentUI.calendar.previousPeriodAriaLabel": "{title}",
	"svelteFluentUI.calendar.previousPeriodTooltip": "{title}",
	"svelteFluentUI.calendar.nextPeriodAriaLabel": "{title}",
	"svelteFluentUI.calendar.nextPeriodTooltip": "{title}",
	"svelteFluentUI.calendar.maxSelectedDayCountExceeded": "{max, plural, one {You can select a maximum of # day.} other {You can select a maximum of # days.}} Delete a day to select a new one.",

	// Chip
	"svelteFluentUI.chip.removeAriaLabel": "Remove {item}",
	"svelteFluentUI.chip.removeTooltip": "Remove {item}",

	// Combobox
	"svelteFluentUI.combobox.noMatches": "No results found",
	"svelteFluentUI.combobox.loading": "Searching…",
	"svelteFluentUI.combobox.removeAriaLabel": "Remove {item}",
	"svelteFluentUI.combobox.removeTooltip": "Remove {item}",
	"svelteFluentUI.combobox.clearAriaLabel": "Clear selection",
	"svelteFluentUI.combobox.clearTooltip": "Clear selection",

	// CommandPalette
	"svelteFluentUI.commandPalette.dialogAriaLabel": "Command palette",
	"svelteFluentUI.commandPalette.placeholder": "Search…",
	"svelteFluentUI.commandPalette.resultsAriaLabel": "Command palette results",
	"svelteFluentUI.commandPalette.empty": "No items",
	"svelteFluentUI.commandPalette.noMatches": "No matches for \"{query}\"",
	"svelteFluentUI.commandPalette.escapeHint": "esc to close",
	"svelteFluentUI.commandPalette.navigateHint": "navigate",
	"svelteFluentUI.commandPalette.selectHint": "select",
	"svelteFluentUI.commandPalette.toggleHint": "toggle",

	// CompositeBadge
	"svelteFluentUI.compositeBadge.dismissAriaLabel": "Dismiss",

	// DatePicker
	"svelteFluentUI.datePicker.placeholder": "Select a date",
	"svelteFluentUI.datePicker.openPopupAriaLabel": "Open calendar",
	"svelteFluentUI.datePicker.popupAriaLabel": "Choose date",
	"svelteFluentUI.datePicker.clearAriaLabel": "Clear date",
	"svelteFluentUI.datePicker.clearTooltip": "Clear date",

	// Dialog
	"svelteFluentUI.dialog.closeAriaLabel": "Close dialog",
	"svelteFluentUI.dialog.dismiss": "Dismiss",

	// InputFile
	"svelteFluentUI.inputFile.dropHere": "Drop files here",
	"svelteFluentUI.inputFile.dragAndDrop": "Drag and drop files here, or",
	"svelteFluentUI.inputFile.browse": "Browse",
	"svelteFluentUI.inputFile.browseAriaLabel": "Browse",
	"svelteFluentUI.inputFile.browseTooltip": "Browse",
	"svelteFluentUI.inputFile.selectFiles": "Select files",
	"svelteFluentUI.inputFile.viewFilesAriaLabel": "View files",
	"svelteFluentUI.inputFile.accepted": "Accepted: {accept}",
	"svelteFluentUI.inputFile.maxSize": "Max size: {size}",
	"svelteFluentUI.inputFile.minSize": "Min size: {size}",
	"svelteFluentUI.inputFile.totalMaxSize": "Total max size: {size}",
	"svelteFluentUI.inputFile.totalMaxSizeRemaining": "Total max size: {size} · {remaining} left",
	"svelteFluentUI.inputFile.maxFiles": "Max files: {max}",
	"svelteFluentUI.inputFile.maxFilesRemaining": "Max files: {max} · {remaining} more",
	"svelteFluentUI.inputFile.minFiles": "Min files: {min}",
	"svelteFluentUI.inputFile.clearAll": "Clear all",
	"svelteFluentUI.inputFile.uploadAll": "Upload all",
	"svelteFluentUI.inputFile.addMore": "+ Add more",
	"svelteFluentUI.inputFile.showMore": "Show {count} more",
	"svelteFluentUI.inputFile.showLess": "Show less",
	"svelteFluentUI.inputFile.pending": "Pending",
	"svelteFluentUI.inputFile.uploading": "Uploading",
	"svelteFluentUI.inputFile.paused": "Paused",
	"svelteFluentUI.inputFile.completed": "Completed",
	"svelteFluentUI.inputFile.error": "Error",
	"svelteFluentUI.inputFile.cancelled": "Cancelled",
	"svelteFluentUI.inputFile.removeAriaLabel": "Remove {item}",
	"svelteFluentUI.inputFile.removeTooltip": "Remove {item}",
	"svelteFluentUI.inputFile.retryAriaLabel": "Retry upload",
	"svelteFluentUI.inputFile.pauseAriaLabel": "Pause upload",
	"svelteFluentUI.inputFile.resumeAriaLabel": "Resume upload",
	"svelteFluentUI.inputFile.cancelAriaLabel": "Cancel upload",
	"svelteFluentUI.inputFile.downloadAriaLabel": "Download",
	"svelteFluentUI.inputFile.pauseAll": "Pause all",
	"svelteFluentUI.inputFile.resumeAll": "Resume all",
	"svelteFluentUI.inputFile.retryAll": "Retry all",
	"svelteFluentUI.inputFile.fileTooLarge": "File size exceeds {max}",
	"svelteFluentUI.inputFile.totalSizeExceeded": "Total size would exceed {max}",
	"svelteFluentUI.inputFile.fileTooSmall": "File size below {min}",
	"svelteFluentUI.inputFile.fileTypeNotAccepted": "File type not accepted. Accepted: {accept}",
	"svelteFluentUI.inputFile.tooManyFiles": "Maximum {max} files allowed",
	"svelteFluentUI.inputFile.tooFewFiles": "{min, plural, one {At least # file required} other {At least # files required}}",
	"svelteFluentUI.inputFile.duplicate": "Duplicate file",
	"svelteFluentUI.inputFile.fileCount": "{count, plural, one {# file} other {# files}}",
	"svelteFluentUI.inputFile.totalProgress": "{completed} of {total} done · {uploadedSize} / {totalSize}",
	"svelteFluentUI.inputFile.totalProgressWithFailed": "{completed} of {total} done · {failed} failed · {uploadedSize} / {totalSize}",
	"svelteFluentUI.inputFile.empty": "No files selected",
	"svelteFluentUI.inputFile.uploadedAnnouncement": "Uploaded {name}",
	"svelteFluentUI.inputFile.failedAnnouncement": "Failed to upload {name}: {error}",

	// Paginator
	"svelteFluentUI.paginator.paginationAriaLabel": "Pagination",
	"svelteFluentUI.paginator.firstPageAriaLabel": "Go to first page",
	"svelteFluentUI.paginator.firstPageTooltip": "Go to first page",
	"svelteFluentUI.paginator.previousPageAriaLabel": "Go to previous page",
	"svelteFluentUI.paginator.previousPageTooltip": "Go to previous page",
	"svelteFluentUI.paginator.nextPageAriaLabel": "Go to next page",
	"svelteFluentUI.paginator.nextPageTooltip": "Go to next page",
	"svelteFluentUI.paginator.lastPageAriaLabel": "Go to last page",
	"svelteFluentUI.paginator.lastPageTooltip": "Go to last page",
	"svelteFluentUI.paginator.pageInfo": "Page {page} of {pageCount}",
	"svelteFluentUI.paginator.itemCount": "{count, plural, one {# item} other {# items}}",

	// Panel
	"svelteFluentUI.panel.closeAriaLabel": "Close panel",

	// QuickGrid
	"svelteFluentUI.quickGrid.filterPlaceholder": "Filter...",
	"svelteFluentUI.quickGrid.filterAriaLabel": "Filter {column}",
	"svelteFluentUI.quickGrid.empty": "No items to display",
	"svelteFluentUI.quickGrid.paginationAriaLabel": "Pagination",
	"svelteFluentUI.quickGrid.previousPage": "Previous",
	"svelteFluentUI.quickGrid.nextPage": "Next",
	"svelteFluentUI.quickGrid.pageInfo": "Page {page} of {pageCount}",
	"svelteFluentUI.quickGrid.itemCount": "{count, plural, one {# item} other {# items}}",
	"svelteFluentUI.quickGrid.perPage": "per page",
	"svelteFluentUI.quickGrid.sortedBy": "Sorted by {column}, {direction, select, ascending {ascending} other {descending}}",
	"svelteFluentUI.quickGrid.sortCleared": "Sort removed from {column}",
	"svelteFluentUI.quickGrid.expandAriaLabel": "Expand",
	"svelteFluentUI.quickGrid.expandTooltip": "Expand",
	"svelteFluentUI.quickGrid.collapseAriaLabel": "Collapse",
	"svelteFluentUI.quickGrid.collapseTooltip": "Collapse",
	"svelteFluentUI.quickGrid.clearFilterToCollapseTooltip": "Clear the filter to collapse",
	"svelteFluentUI.quickGrid.rowActionsAriaLabel": "Row actions",
	"svelteFluentUI.quickGrid.rowActionsTooltip": "Row actions",
	"svelteFluentUI.quickGrid.addRow": "Add row below",
	"svelteFluentUI.quickGrid.deleteRow": "Delete row",
	"svelteFluentUI.quickGrid.duplicateRow": "Duplicate row",
	"svelteFluentUI.quickGrid.moveRowUp": "Move row up",
	"svelteFluentUI.quickGrid.moveRowDown": "Move row down",
	"svelteFluentUI.quickGrid.expandAll": "Expand all",
	"svelteFluentUI.quickGrid.collapseAll": "Collapse all",
	"svelteFluentUI.quickGrid.expandTree": "Expand entire tree",
	"svelteFluentUI.quickGrid.collapseTree": "Collapse entire tree",
	"svelteFluentUI.quickGrid.editing": "Editing...",
	"svelteFluentUI.quickGrid.validatingAriaLabel": "Validating",
	"svelteFluentUI.quickGrid.validatingTooltip": "Validating",
	"svelteFluentUI.quickGrid.loadingOptionsAriaLabel": "Loading options",
	"svelteFluentUI.quickGrid.loadingOptionsTooltip": "Loading options",
	"svelteFluentUI.quickGrid.editAriaLabel": "Edit",
	"svelteFluentUI.quickGrid.editTooltip": "Edit",
	"svelteFluentUI.quickGrid.invalidValueTooltip": "Invalid value",
	"svelteFluentUI.quickGrid.editorEmptyOption": "-- Select --",
	"svelteFluentUI.quickGrid.editorSelectPlaceholder": "Select...",
	"svelteFluentUI.quickGrid.editorSearchPlaceholder": "Type to search...",
	"svelteFluentUI.quickGrid.editorLoading": "Loading...",
	"svelteFluentUI.quickGrid.editorSearching": "Searching...",
	"svelteFluentUI.quickGrid.editorEmpty": "No options",
	"svelteFluentUI.quickGrid.editorNoMatches": "No matching options",

	// Select
	"svelteFluentUI.select.clearTooltip": "Clear selection",

	// SiteSettings
	"svelteFluentUI.siteSettings.heading": "Site settings",
	"svelteFluentUI.siteSettings.theme": "Theme",
	"svelteFluentUI.siteSettings.themeSystem": "System",
	"svelteFluentUI.siteSettings.themeLight": "Light",
	"svelteFluentUI.siteSettings.themeDark": "Dark",
	"svelteFluentUI.siteSettings.color": "Color",
	"svelteFluentUI.siteSettings.neutralColor": "Neutral base color",
	"svelteFluentUI.siteSettings.direction": "Direction",
	"svelteFluentUI.siteSettings.leftToRight": "Left to Right",
	"svelteFluentUI.siteSettings.rightToLeft": "Right to Left",
	"svelteFluentUI.siteSettings.persistenceNote": "These values (except for Direction) are persisted in the LocalStorage and will be recovered during your next visits.",
	"svelteFluentUI.siteSettings.resetNote": "Use the “Reset settings” button below to go back to the system theme and default color.",
	"svelteFluentUI.siteSettings.reset": "Reset settings",
	"svelteFluentUI.siteSettings.ok": "OK",

	// Tabs
	"svelteFluentUI.tabs.closeAriaLabel": "Close tab",
	"svelteFluentUI.tabs.closeTooltip": "Close",
	"svelteFluentUI.tabs.editNameTooltip": "Click to edit this tab name",
	"svelteFluentUI.tabs.moreTabsAriaLabel": "Show more tabs",
	"svelteFluentUI.tabs.scrollBackwardAriaLabel": "Scroll to previous tabs",
	"svelteFluentUI.tabs.scrollForwardAriaLabel": "Scroll to next tabs",

	// TimePicker
	"svelteFluentUI.timePicker.placeholder": "Select time",
	"svelteFluentUI.timePicker.openPopupAriaLabel": "Open time picker",
	"svelteFluentUI.timePicker.popupAriaLabel": "Choose time",
	"svelteFluentUI.timePicker.clearAriaLabel": "Clear time",
	"svelteFluentUI.timePicker.clearTooltip": "Clear time",
	"svelteFluentUI.timePicker.hour": "Hour",
	"svelteFluentUI.timePicker.minute": "Minute",
	"svelteFluentUI.timePicker.second": "Second",
	"svelteFluentUI.timePicker.period": "Period",
	"svelteFluentUI.timePicker.am": "AM",
	"svelteFluentUI.timePicker.pm": "PM",
	"svelteFluentUI.timePicker.apply": "OK",

	// Toast
	"svelteFluentUI.toast.dismissAriaLabel": "Dismiss",
	"svelteFluentUI.toast.dismissTooltip": "Close",

	// ToastContainer
	"svelteFluentUI.toastContainer.closeAriaLabel": "Close",

	// TopNav
	"svelteFluentUI.topNav.openMenuAriaLabel": "Open menu",
	"svelteFluentUI.topNav.closeMenuAriaLabel": "Close menu"
} as const satisfies Record<string, string>
