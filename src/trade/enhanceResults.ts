import {
	matchedMods,
	normaliseModText,
	wantedStatIds,
} from "../core/highlight";
import { THEMES, type ThemeId } from "../core/themes";
import type { CaptureState } from "./captureFeed";
import { PRICE_ATTR } from "./equivalentPrices";
import { FLASH_ATTR, PINNED_ROW_ATTR } from "./pinButtons";
import { LISTED_ATTR, SOCKETS_ATTR } from "./resultHelpers";
import { SELECTORS } from "./selectors";

export const HIGHLIGHT_ATTR = "data-exile-ledger-match";
const STYLE_ID = "exile-ledger-page-styles";
const THEME_STYLE_ID = "exile-ledger-page-theme";
const ACCENT = "--exile-ledger-accent";
const MARKED = [
	HIGHLIGHT_ATTR,
	PRICE_ATTR,
	PINNED_ROW_ATTR,
	FLASH_ATTR,
	LISTED_ATTR,
	SOCKETS_ATTR,
]
	.map((attr) => `[${attr}]`)
	.join(", ");

const tint = (percent: number) =>
	`color-mix(in srgb, var(${ACCENT}) ${percent}%, transparent)`;

/**
 * Styles for marks we add to the trade site's own DOM. They cannot live in the
 * panel's shadow root, so they go into the page once, scoped by our attribute.
 */
export function installPageStyles(doc: Document): void {
	if (doc.getElementById(STYLE_ID)) return;
	const style = doc.createElement("style");
	style.id = STYLE_ID;
	style.textContent = [
		`[${HIGHLIGHT_ATTR}] { background: ${tint(16)}; box-shadow: inset 3px 0 0 var(${ACCENT}); border-radius: 2px; }`,
		`[${PRICE_ATTR}] { display: block; margin-top: 2px; font-size: 11px; color: var(${ACCENT}); opacity: 0.9; }`,
		`[${LISTED_ATTR}] { font-size: 11px; opacity: 0.75; }`,
		`[${SOCKETS_ATTR}] { font-size: 11px; color: var(${ACCENT}); }`,
		`[${PINNED_ROW_ATTR}] { box-shadow: inset 3px 0 0 var(${ACCENT}); }`,
		`@keyframes exile-ledger-flash { 0%, 40% { background: ${tint(25)}; } }`,
		`[${FLASH_ATTR}] { animation: exile-ledger-flash 1.5s ease-out; }`,
		`@media (prefers-reduced-motion: reduce) { [${FLASH_ATTR}] { animation: none; outline: 2px solid var(${ACCENT}); } }`,
	].join("\n");
	doc.head.append(style);
}

/**
 * Sets the accent on our marks only; the variable is scoped to our attributes
 * so the site's own elements never see it.
 */
export function setPageTheme(doc: Document, id: ThemeId): void {
	let style = doc.getElementById(THEME_STYLE_ID);
	if (!style) {
		style = doc.createElement("style");
		style.id = THEME_STYLE_ID;
		doc.head.append(style);
	}
	style.textContent = `:is(${MARKED}) { ${ACCENT}: ${THEMES[id].siteAccent}; }`;
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
