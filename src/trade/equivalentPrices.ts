import { equivalents, formatEquivalent, type Rates } from "../core/pricing";
import type { CaptureState } from "./captureFeed";
import { SELECTORS } from "./selectors";

export const PRICE_ATTR = "data-exile-ledger-price";

/**
 * Adds "≈ 74.1 c · 0.088 div" under each listing's price. The price comes from
 * the captured API data, not the page text, so a site restyle cannot break the
 * numbers, only where they are placed.
 */
export function annotatePrices(
	root: ParentNode,
	capture: CaptureState,
	rates: Rates | null,
	enabled: boolean,
): number {
	if (!enabled || !rates) {
		for (const el of root.querySelectorAll(`[${PRICE_ATTR}]`)) el.remove();
		return 0;
	}
	const byId = new Map(capture.results.map((item) => [item.id, item]));
	let annotated = 0;
	for (const row of root.querySelectorAll<HTMLElement>(SELECTORS.resultRow)) {
		const item = row.dataset.id ? byId.get(row.dataset.id) : undefined;
		const priceEl = row.querySelector(SELECTORS.price);
		const existing = row.querySelector(`[${PRICE_ATTR}]`);
		const parts = item?.price
			? equivalents(item.price.amount, item.price.currency, rates)
			: [];
		if (!priceEl || parts.length === 0) {
			existing?.remove();
			continue;
		}
		const text = `≈ ${parts.map(formatEquivalent).join(" · ")}`;
		const el = existing ?? priceEl.ownerDocument.createElement("span");
		el.setAttribute(PRICE_ATTR, "");
		el.textContent = text;
		if (!existing) priceEl.append(el);
		annotated++;
	}
	return annotated;
}
