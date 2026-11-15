/** Every UI text of Paginator; pass a partial object as `labels` to override. */
export type PaginatorLabels = {
	/** Accessible name of the `<nav>` landmark. */
	pagination: string
	/** Accessible name / tooltip of the four buttons. */
	firstPage: string
	previousPage: string
	nextPage: string
	lastPage: string
	/** "Page X of Y" text (1-based); digit runs render bold. `paginationTextTemplate` replaces it. */
	pageInfo: (page: number, pageCount: number) => string
	/** "N items" summary; digit runs render bold. `summaryTemplate` replaces it. */
	itemCount: (count: number) => string
}

/** Paginator's English strings; spread a partial over them via the `labels` prop. */
export const defaultPaginatorLabels: PaginatorLabels = {
	pagination: "Pagination",
	firstPage: "Go to first page",
	previousPage: "Go to previous page",
	nextPage: "Go to next page",
	lastPage: "Go to last page",
	pageInfo: (page, pageCount) => `Page ${page} of ${pageCount}`,
	itemCount: (count) => `${count} items`
}
