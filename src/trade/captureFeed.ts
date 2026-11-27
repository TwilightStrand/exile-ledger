import type { ResultItem } from "../core/tradeApi";
import type { CaptureEvent } from "./capture";

type SearchEvent = Extract<CaptureEvent, { kind: "search" }>;

/**
 * Live search keeps fetching for as long as the tab is open, so results are
 * capped. Well above the 100 a normal search shows; the oldest go first.
 */
export const CAPTURE_LIMIT = 500;

export interface CaptureState {
	search: SearchEvent | null;
	/** By listing id, oldest first; a result fetched again replaces its earlier copy. */
	results: ReadonlyMap<string, ResultItem>;
}

/** Holds the latest search and the results the page has fetched for it. */
export function createCaptureFeed() {
	let results = new Map<string, ResultItem>();
	let state: CaptureState = { search: null, results };
	const listeners = new Set<(s: CaptureState, event: CaptureEvent) => void>();

	return {
		get: () => state,
		push(event: CaptureEvent) {
			if (event.kind === "search") {
				results = new Map();
				state = { search: event, results };
			} else if (event.queryId === state.search?.search.searchId) {
				for (const item of event.items) {
					// Re-inserting moves a refetched result to the newest end.
					results.delete(item.id);
					results.set(item.id, item);
				}
				for (const id of results.keys()) {
					if (results.size <= CAPTURE_LIMIT) break;
					results.delete(id);
				}
				state = { search: state.search, results };
			} else {
				return;
			}
			for (const l of listeners) l(state, event);
		},
		subscribe(listener: (s: CaptureState, event: CaptureEvent) => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export type CaptureFeed = ReturnType<typeof createCaptureFeed>;
