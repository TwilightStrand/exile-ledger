import type { HistoryEntry } from "../core/history";
import type { CaptureEvent } from "./capture";

type SearchEvent = Extract<CaptureEvent, { kind: "search" }>;

export function historyEntryFrom(
	event: SearchEvent,
	at: number,
	id: string,
): HistoryEntry {
	return {
		id,
		game: event.game,
		league: event.league,
		query: event.search.query,
		searchId: event.search.searchId,
		total: event.search.total,
		at,
	};
}
