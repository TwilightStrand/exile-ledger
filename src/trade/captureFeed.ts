import type { ResultItem } from "../core/tradeApi";
import type { CaptureEvent } from "./capture";
import { SELECTORS } from "./selectors";

type SearchEvent = Extract<CaptureEvent, { kind: "search" }>;

/**
 * Live search keeps fetching for as long as the tab is open, so results are
 * capped. Well above the 100 a normal search shows; the oldest go first, but
 * never while the page still shows their row, which would lose its marks and
 * leave its Pin and Watch buttons with nothing to act on.
 */
export const CAPTURE_LIMIT = 500;

export interface CaptureState {
	search: SearchEvent | null;
	/** By listing id, oldest first; a result fetched again replaces its earlier copy. */
	results: ReadonlyMap<string, ResultItem>;
}

/** Listing ids of the result rows on the page. */
export function shownResultIds(root: ParentNode): Set<string> {
	const ids = new Set<string>();
	for (const row of root.querySelectorAll<HTMLElement>(SELECTORS.resultRow)) {
		if (row.dataset.id) ids.add(row.dataset.id);
	}
	return ids;
}

/**
 * Holds the latest search and the results the page has fetched for it.
 * `shown` lists the ids the page still displays; read only when over the cap.
 * It defaults to this document's result rows.
 */
export function createCaptureFeed(
	shown: () => ReadonlySet<string> = () => shownResultIds(document),
) {
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
				if (results.size > CAPTURE_LIMIT) {
					const onPage = shown();
					// The site draws rows after the fetch we just captured, so this
					// batch has no rows yet and must not be what makes room.
					const arriving = new Set(event.items.map((item) => item.id));
					for (const id of results.keys()) {
						if (results.size <= CAPTURE_LIMIT) break;
						if (!onPage.has(id) && !arriving.has(id)) results.delete(id);
					}
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
