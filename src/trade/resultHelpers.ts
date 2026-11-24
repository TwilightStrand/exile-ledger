import { en, type Messages } from "../core/i18n";
import { itemClassOf } from "../core/items/itemText";
import { socketShortfall } from "../core/items/sockets";
import type { ResultItem } from "../core/tradeApi";
import type { CaptureState } from "./captureFeed";
import { SELECTORS } from "./selectors";

export const LISTED_ATTR = "data-exile-ledger-listed";
export const SOCKETS_ATTR = "data-exile-ledger-sockets";

export interface ResultHelperOptions {
	listingTime: boolean;
	socketWarning: boolean;
}

function socketNote(item: ResultItem, t: Messages): string | null {
	if (item.ilvl === null || !item.text) return null;
	const cap = socketShortfall({
		itemClass: itemClassOf(item.text),
		itemLevel: item.ilvl,
		rarity: item.rarity,
	});
	return cap === null ? null : t.trade.socketShortfall(item.ilvl, cap);
}

function listedNote(item: ResultItem, t: Messages): string | null {
	const at = item.indexed ? Date.parse(item.indexed) : Number.NaN;
	return Number.isFinite(at) ? t.trade.listedAt(at) : null;
}

/** Keeps one marker element per row in step with `text`; removes it when there is none. */
function place(
	host: Element,
	before: Element | null,
	attr: string,
	text: string | null,
): boolean {
	const existing = host.querySelector(`:scope > [${attr}]`);
	if (text === null) {
		existing?.remove();
		return false;
	}
	const el = existing ?? host.ownerDocument.createElement("div");
	el.setAttribute(attr, "");
	// Unchanged text is left alone so the results observer does not wake again.
	if (el.textContent !== text) el.textContent = text;
	if (!existing) host.insertBefore(el, before);
	return true;
}

/**
 * The exact listing time and, for PoE1, a note when the item level keeps an
 * item below its base's socket count. Both come from the captured API data.
 */
export function annotateResults(
	root: ParentNode,
	capture: CaptureState,
	options: ResultHelperOptions,
	t: Messages = en,
): number {
	const byId = new Map(capture.results.map((item) => [item.id, item]));
	let added = 0;
	for (const row of root.querySelectorAll<HTMLElement>(SELECTORS.resultRow)) {
		const host = row.querySelector(SELECTORS.details);
		if (!host) continue;
		const item = row.dataset.id ? byId.get(row.dataset.id) : undefined;
		const before = host.querySelector(`:scope > ${SELECTORS.buttons}`);
		const listed = item && options.listingTime ? listedNote(item, t) : null;
		const sockets = item && options.socketWarning ? socketNote(item, t) : null;
		if (place(host, before, LISTED_ATTR, listed)) added++;
		if (place(host, before, SOCKETS_ATTR, sockets)) added++;
	}
	return added;
}
