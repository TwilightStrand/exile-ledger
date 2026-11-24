import { en, type Messages } from "../core/i18n";
import { buildItemText, itemClassOf, wikiUrl } from "../core/items/itemText";
import { socketShortfall } from "../core/items/sockets";
import type { ResultItem } from "../core/tradeApi";
import type { Game } from "../core/tradeUrl";
import type { CaptureState } from "./captureFeed";
import { SELECTORS } from "./selectors";

export const LISTED_ATTR = "data-exile-ledger-listed";
export const SOCKETS_ATTR = "data-exile-ledger-sockets";
export const TOOLS_ATTR = "data-exile-ledger-tools";

export interface ResultHelperOptions {
	listingTime: boolean;
	socketWarning: boolean;
	affixCount: boolean;
	itemTools: boolean;
}

/** Writes text to the clipboard; navigator.clipboard on the page, a spy in tests. */
export type CopyText = (text: string) => Promise<void>;

const defaultCopy: CopyText = (text) => navigator.clipboard.writeText(text);

/** PoE1 sends the game's own text; PoE2 does not, so it is built from the API fields. */
export function copyTextOf(item: ResultItem): string {
	return item.text ?? buildItemText(item);
}

/**
 * Affix count, Copy item and Wiki in one line. Rebuilt only when what it shows
 * changes, so re-running on every results mutation does not loop the observer;
 * the copy handler is a property, which the observer does not see.
 */
function placeTools(
	host: Element,
	before: Element | null,
	item: ResultItem | undefined,
	game: Game | null,
	options: ResultHelperOptions,
	t: Messages,
	copy: CopyText,
): boolean {
	const existing = host.querySelector<HTMLElement>(`:scope > [${TOOLS_ATTR}]`);
	const affixes = options.affixCount ? (item?.affixes ?? null) : null;
	const wiki = options.itemTools && item && game ? wikiUrl(game, item) : null;
	const canCopy = options.itemTools && item !== undefined;
	if (!item || (!affixes && !wiki && !canCopy)) {
		existing?.remove();
		return false;
	}
	const key = JSON.stringify([item.id, affixes, wiki, canCopy]);
	const doc = host.ownerDocument;
	let el = existing;
	if (!el || el.dataset.key !== key) {
		el?.remove();
		el = doc.createElement("div");
		el.setAttribute(TOOLS_ATTR, "");
		el.dataset.key = key;
		if (affixes) {
			const count = doc.createElement("span");
			count.textContent = t.trade.affixes(affixes.prefixes, affixes.suffixes);
			count.title = t.trade.affixesTitle(affixes.prefixes, affixes.suffixes);
			el.append(count);
		}
		if (canCopy) {
			const button = doc.createElement("button");
			button.type = "button";
			button.textContent = t.trade.copyItem;
			button.title = t.trade.copyItemTitle;
			el.append(button);
		}
		if (wiki) {
			const link = doc.createElement("a");
			link.href = wiki;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = t.trade.wiki;
			link.title = t.trade.wikiTitle(
				decodeURIComponent(wiki.split("/wiki/")[1] ?? "").replaceAll("_", " "),
			);
			el.append(link);
		}
		host.insertBefore(el, before);
	}
	const button = el.querySelector("button");
	if (button) {
		const text = copyTextOf(item);
		button.onclick = () => {
			copy(text).then(
				() => flash(button, t.trade.copied, t.trade.copyItem),
				() => flash(button, t.trade.copyFailed, t.trade.copyItem),
			);
		};
	}
	return true;
}

function flash(button: HTMLButtonElement, text: string, back: string): void {
	button.textContent = text;
	setTimeout(() => {
		button.textContent = back;
	}, 1500);
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
	copy: CopyText = defaultCopy,
): number {
	const game = capture.search?.game ?? null;
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
		if (placeTools(host, before, item, game, options, t, copy)) added++;
	}
	return added;
}
