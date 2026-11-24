import type { TradeQuery } from "./query";
import { parseFetchResponse, type ResultItem } from "./tradeApi";
import { FETCH_BATCH } from "./tradeApiUrls";
import {
	applyListingCheck,
	applySearchCheck,
	isDue,
	type ListingWatcher,
	type SearchWatcher,
	type Watcher,
} from "./watchers";

/** What the runner needs from the network; the background supplies the real one. */
export interface WatcherApi {
	/** Raw fetch-endpoint body for these ids, or null when the request did not happen. */
	fetchListings(group: {
		origin: string;
		game: Watcher["game"];
		realm: string | null;
		searchId: string;
		ids: string[];
	}): Promise<unknown | null>;
	/** Search-endpoint result, or null when the request did not happen. */
	runSearch(watcher: SearchWatcher): Promise<{
		ids: string[];
		total: number;
	} | null>;
}

/** Changes worth telling the user about, for notifications and the panel badge. */
export type WatcherEvent =
	| { kind: "gone"; watcher: ListingWatcher }
	| { kind: "back"; watcher: ListingWatcher }
	| { kind: "repriced"; watcher: ListingWatcher }
	| { kind: "new-results"; watcher: SearchWatcher; count: number };

const groupKey = (w: ListingWatcher) =>
	[w.origin, w.game, w.realm ?? "", w.searchId].join("\n");

function chunks<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
}

function listingEvent(
	before: ListingWatcher,
	after: ListingWatcher,
): WatcherEvent | null {
	if (after.status === "gone" && before.status !== "gone")
		return { kind: "gone", watcher: after };
	if (after.status === "back" && before.status === "gone")
		return { kind: "back", watcher: after };
	if (after.changedAt !== before.changedAt && after.status !== "gone")
		return { kind: "repriced", watcher: after };
	return null;
}

/**
 * Checks every due watcher once. A watcher whose request did not go out
 * (rate limited, deferred, offline) is left as it was, so it stays due and the
 * next run picks it up.
 */
export async function runDueWatchers(
	watchers: readonly Watcher[],
	api: WatcherApi,
	now: () => number,
): Promise<{ watchers: Watcher[]; events: WatcherEvent[] }> {
	const updated = new Map<string, Watcher>();
	const events: WatcherEvent[] = [];
	const due = watchers.filter((w) => isDue(w, now()));

	const listingGroups = new Map<string, ListingWatcher[]>();
	for (const w of due) {
		if (w.kind !== "listing") continue;
		const key = groupKey(w);
		listingGroups.set(key, [...(listingGroups.get(key) ?? []), w]);
	}
	for (const group of listingGroups.values()) {
		for (const batch of chunks(group, FETCH_BATCH)) {
			const first = batch[0];
			if (!first) continue;
			const body = await api.fetchListings({
				origin: first.origin,
				game: first.game,
				realm: first.realm,
				searchId: first.searchId,
				ids: batch.map((w) => w.itemId),
			});
			if (body === null) continue;
			const items = parseFetchResponse(body);
			if (items === null) continue;
			const byId = new Map<string, ResultItem>(items.map((i) => [i.id, i]));
			for (const w of batch) {
				const item = byId.get(w.itemId);
				const next = applyListingCheck(
					w,
					item ? { listed: true, price: item.price } : { listed: false },
					now(),
				);
				updated.set(w.id, next);
				const event = listingEvent(w, next);
				if (event) events.push(event);
			}
		}
	}

	for (const w of due) {
		if (w.kind !== "search") continue;
		const result = await api.runSearch(w);
		if (result === null) continue;
		const next = applySearchCheck(w, result, now());
		updated.set(w.id, next);
		const count = next.newIds.length - w.newIds.length;
		if (count > 0) events.push({ kind: "new-results", watcher: next, count });
	}

	return {
		watchers: watchers.map((w) => updated.get(w.id) ?? w),
		events,
	};
}

/** The JSON body the trade site posts for a search. */
export function searchBody(query: TradeQuery): string {
	return JSON.stringify(query);
}
