import {
	matchedMods,
	normaliseModText,
	wantedStatIds,
} from "../core/highlight";
import type { CaptureState } from "./captureFeed";
import { SELECTORS } from "./selectors";

export const HIGHLIGHT_ATTR = "data-exile-ledger-match";
const STYLE_ID = "exile-ledger-page-styles";

/**
 * Styles for marks we add to the trade site's own DOM. They cannot live in the
 * panel's shadow root, so they go into the page once, scoped by our attribute.
 */
export function installPageStyles(doc: Document): void {
	if (doc.getElementById(STYLE_ID)) return;
	const style = doc.createElement("style");
	style.id = STYLE_ID;
	style.textContent = [
		`[${HIGHLIGHT_ATTR}] { background: rgb(214 173 98 / 0.16); box-shadow: inset 3px 0 0 #d6ad62; border-radius: 2px; }`,
		"[data-exile-ledger-price] { display: block; margin-top: 2px; font-size: 11px; color: #d6ad62; opacity: 0.9; }",
	].join("\n");
	doc.head.append(style);
}

/** Marks the mod lines each captured result matched; clears marks that no longer apply. */
export function highlightMods(
	root: ParentNode,
	capture: CaptureState,
	enabled: boolean,
): number {
	const query = capture.search?.search.query;
	const wanted = query && enabled ? wantedStatIds(query) : new Set<string>();
	const byId = new Map(capture.results.map((item) => [item.id, item]));
	let marked = 0;
	for (const row of root.querySelectorAll<HTMLElement>(SELECTORS.resultRow)) {
		const item = row.dataset.id ? byId.get(row.dataset.id) : undefined;
		const matched =
			item && wanted.size > 0 ? matchedMods(item, wanted) : new Set<string>();
		for (const line of row.querySelectorAll<HTMLElement>(SELECTORS.modLine)) {
			const hit = matched.has(normaliseModText(line.textContent ?? ""));
			line.toggleAttribute(HIGHLIGHT_ATTR, hit);
			if (hit) marked++;
		}
	}
	return marked;
}
