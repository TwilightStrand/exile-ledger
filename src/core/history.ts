import * as v from "valibot";
import { TradeQuerySchema } from "./query";
import type { Game } from "./tradeUrl";

/** Per game; matches the spec and keeps the list scannable. */
export const HISTORY_CAP = 200;

export const HistoryEntrySchema = v.object({
	id: v.string(),
	game: v.picklist(["poe1", "poe2"]),
	league: v.string(),
	query: TradeQuerySchema,
	searchId: v.string(),
	total: v.number(),
	at: v.number(),
});
export type HistoryEntry = v.InferOutput<typeof HistoryEntrySchema>;

export function parseHistory(raw: unknown): HistoryEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		const parsed = v.safeParse(HistoryEntrySchema, item);
		return parsed.success ? [parsed.output] : [];
	});
}

/**
 * Newest first. The same search ID in the same game and league is one search,
 * so running it again moves it to the top instead of adding a duplicate.
 */
export function recordSearch(
	history: HistoryEntry[],
	entry: HistoryEntry,
): HistoryEntry[] {
	const same = (h: HistoryEntry) =>
		h.game === entry.game &&
		h.league === entry.league &&
		h.searchId === entry.searchId;
	const next = [entry, ...history.filter((h) => !same(h))];
	const kept: Record<Game, number> = { poe1: 0, poe2: 0 };
	return next.filter((h) => ++kept[h.game] <= HISTORY_CAP);
}

export function historyFor(
	history: HistoryEntry[],
	game: Game,
): HistoryEntry[] {
	return history.filter((h) => h.game === game).sort((a, b) => b.at - a.at);
}

export function clearHistory(
	history: HistoryEntry[],
	game: Game,
): HistoryEntry[] {
	return history.filter((h) => h.game !== game);
}
