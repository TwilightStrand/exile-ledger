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
} as const;
