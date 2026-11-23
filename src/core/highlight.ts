import type { TradeQuery } from "./query";
import type { ResultItem } from "./tradeApi";

/** Stat ids the search filters on, skipping disabled filters and groups. */
export function wantedStatIds(query: TradeQuery): Set<string> {
	const ids = new Set<string>();
	for (const group of query.query.stats ?? []) {
		if (group.disabled) continue;
		for (const filter of group.filters) {
			if (!filter.disabled) ids.add(filter.id);
		}
	}
	return ids;
}

export const normaliseModText = (text: string) =>
	text.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The mod lines of an item that a search filter matched, keyed by normalised
 * text. The trade API tells us the stat id behind every line, so this needs no
 * guessing from the filter's wording.
 */
export function matchedMods(
	item: ResultItem,
	wanted: Set<string>,
): Set<string> {
	const matched = new Set<string>();
	for (const mod of item.mods) {
		if (mod.statIds.some((id) => wanted.has(id)))
			matched.add(normaliseModText(mod.text));
	}
	return matched;
}
