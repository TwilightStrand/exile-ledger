/**
 * Every selector for the trade site's own DOM lives here, so a site update is
 * a one-file fix. Taken from Better Trading's enhancers (MIT), which target the
 * same pages; not yet checked against a live capture.
 */
export const SELECTORS = {
	resultRow: ".resultset > div.row[data-id]",
	resultList: ".resultset",
	modLine:
		".enchantMod, .implicitMod, .fracturedMod, .explicitMod, .craftedMod, .runeMod, .pseudoMod",
	price: '.price, [data-field="price"]',
	actions: ".details .btns",
	details: ".details",
	buttons: ".btns",
	// The search form; these match what TFT targets on both games' sites.
	itemSearch: ".search-left input",
	statPane: ".search-advanced-pane.brown",
	addStatFilter:
		".search-advanced-pane.brown .filter-group-body input.multiselect__input",
	statFilter: ".filter",
	minMax: "input.minmax",
	filtersHidden: ".search-advanced-hidden",
	toggleFilters: ".toggle-search-btn",
	clearButton: ".clear-btn",
} as const;
