import type { CaptureEvent } from "./capture";

type SearchEvent = Extract<CaptureEvent, { kind: "search" }>;
type ResultsEvent = Extract<CaptureEvent, { kind: "results" }>;

export interface CaptureState {
	search: SearchEvent | null;
	results: ResultsEvent["items"];
}

/** Holds the latest search and the results the page has fetched for it. */
export function createCaptureFeed() {
	let state: CaptureState = { search: null, results: [] };
	const listeners = new Set<(s: CaptureState) => void>();

	return {
		get: () => state,
		push(event: CaptureEvent) {
			if (event.kind === "search") {
				state = { search: event, results: [] };
			} else if (event.queryId === state.search?.search.searchId) {
				state = { ...state, results: [...state.results, ...event.items] };
			} else {
				return;
			}
			for (const l of listeners) l(state);
		},
		subscribe(listener: (s: CaptureState) => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export type CaptureFeed = ReturnType<typeof createCaptureFeed>;
