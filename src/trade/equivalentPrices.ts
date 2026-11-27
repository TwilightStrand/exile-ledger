import { en, type Messages } from "../core/i18n";
import {
	equivalents,
	formatEquivalent,
	type Rates,
	stackValue,
} from "../core/pricing";
import type { CaptureState } from "./captureFeed";
import { type RowScope, resultRows } from "./resultRows";
import { SELECTORS } from "./selectors";

export const PRICE_ATTR = "data-exile-ledger-price";

/**
 * Adds "≈ 74.1 c · 0.088 div" under each listing's price. The price comes from
 * the captured API data, not the page text, so a site restyle cannot break the
 * numbers, only where they are placed.
 */
export function annotatePrices(
	scope: RowScope,
	capture: CaptureState,
	rates: Rates | null,
	enabled: boolean,
	t: Messages = en,
): number {
	if (!enabled || !rates) {
		for (const row of resultRows(scope))
			for (const el of row.querySelectorAll(`[${PRICE_ATTR}]`)) el.remove();
		return 0;
	}
	let annotated = 0;
	for (const row of resultRows(scope)) {
		const item = row.dataset.id
			? capture.results.get(row.dataset.id)
			: undefined;
		const priceEl = row.querySelector(SELECTORS.price);
		const existing = row.querySelector(`[${PRICE_ATTR}]`);
		const parts = item?.price
			? equivalents(item.price.amount, item.price.currency, rates)
			: [];
		const stack = item?.card ? stackValue(item.card, rates) : [];
		if (!priceEl || (parts.length === 0 && stack.length === 0)) {
			existing?.remove();
			continue;
		}
		const show = (list: typeof parts) =>
			list.map((part) => formatEquivalent(part, t));
		// One element, lines split by CSS, so the observer sees a single text change.
		const text = [
			parts.length > 0 ? t.trade.priceEquivalents(show(parts)) : null,
			item?.card && stack.length > 0
				? t.trade.stackValue(item.card.stackSize, show(stack))
				: null,
		]
			.filter(Boolean)
			.join("\n");
		const el = existing ?? priceEl.ownerDocument.createElement("span");
		el.setAttribute(PRICE_ATTR, "");
		// Unchanged text is left alone so the results observer does not wake again.
		if (el.textContent !== text) el.textContent = text;
		if (!existing) priceEl.append(el);
		annotated++;
	}
	return annotated;
}
