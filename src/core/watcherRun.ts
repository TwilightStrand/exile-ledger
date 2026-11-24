import type { TradeQuery } from "./query";
import { parseFetchResponse, type ResultItem } from "./tradeApi";
import { FETCH_BATCH } from "./tradeApiUrls";
import {
	applyFailure,
	applyListingCheck,
	applySearchCheck,
	isDue,
	type ListingWatcher,
	type SearchWatcher,
	type Watcher,
} from "./watchers";

/**
 * How a request went. `skipped` means it never reached the server (held back
 * by the rate limiter, offline) and costs nothing to retry; `refused` means the
 * server answered with an error or a 429, so the watcher backs off.
 */
export type Outcome<T> =
	| { kind: "ok"; value: T }
	| { kind: "skipped" }
	| { kind: "refused" };

/** What the runner needs from the network; the background supplies the real one. */
export interface WatcherApi {
	/** The fetch endpoint's body for these ids. */
	fetchListings(group: {
		origin: string;
		game: Watcher["game"];
		realm: string | null;
		searchId: string;
		ids: string[];
	}): Promise<Outcome<unknown>>;
	runSearch(
		watcher: SearchWatcher,
	): Promise<Outcome<{ ids: string[]; total: number }>>;
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
 * Checks every due watcher once. A watcher whose request was skipped is left
 * as it was and stays due; one the server refused backs off. No new request
 * starts after `deadline`, so a run always finishes before the browser stops
 * an idle background.
 */
export async function runDueWatchers(
	watchers: readonly Watcher[],
	api: WatcherApi,
	now: () => number,
	deadline = Number.POSITIVE_INFINITY,
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
			if (!first || now() >= deadline) continue;
			const outcome = await api.fetchListings({
				origin: first.origin,
				game: first.game,
				realm: first.realm,
				searchId: first.searchId,
				ids: batch.map((w) => w.itemId),
			});
			if (outcome.kind === "skipped") continue;
			const items =
				outcome.kind === "ok" ? parseFetchResponse(outcome.value) : null;
			if (items === null) {
				for (const w of batch) updated.set(w.id, applyFailure(w, now()));
				continue;
			}
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
		if (w.kind !== "search" || now() >= deadline) continue;
		const outcome = await api.runSearch(w);
		if (outcome.kind === "skipped") continue;
		if (outcome.kind === "refused") {
			updated.set(w.id, applyFailure(w, now()));
			continue;
		}
		const next = applySearchCheck(w, outcome.value, now());
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
