import * as v from "valibot";
import { type TradeQuery, TradeQuerySchema } from "./query";
import { isTradeHost } from "./sites";

/** Default and floor for how often a watcher checks, in minutes. */
export const WATCH_INTERVAL: { min: number; default: number } = {
	min: 1,
	default: 5,
};
/**
 * Result ids a search watcher remembers. A search returns at most 100 ids per
 * call, so a few hundred is enough to tell new listings from ones already seen
 * while keeping storage bounded.
 */
export const SEEN_CAP = 500;

const GameSchema = v.picklist(["poe1", "poe2"]);
const PriceSchema = v.object({ amount: v.number(), currency: v.string() });

/**
 * An official trade site's origin, exactly as `URL.origin` writes it. The
 * background sends credentialed requests to it, so anything else is refused
 * rather than trusted from storage or an import.
 */
const OriginSchema = v.pipe(
	v.string(),
	v.check((value) => {
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				url.origin === value &&
				isTradeHost(url.hostname)
			);
		} catch {
			return false;
		}
	}),
);

/** Longest a failing watcher waits between tries. */
export const MAX_BACKOFF_MS = 6 * 60 * 60_000;

const Common = {
	id: v.string(),
	/** The trade site the watcher was made on; regional sites have their own API host. */
	origin: OriginSchema,
	game: GameSchema,
	realm: v.nullable(v.string()),
	league: v.string(),
	intervalMin: v.pipe(v.number(), v.integer(), v.minValue(WATCH_INTERVAL.min)),
	createdAt: v.number(),
	lastCheckedAt: v.nullable(v.number()),
	/**
	 * Refused checks in a row (error status, rate limited). GGG restricts
	 * clients that keep sending invalid requests, so each failure doubles the
	 * wait instead of retrying on the next alarm.
	 */
	failures: v.pipe(v.number(), v.integer(), v.minValue(0)),
	retryAt: v.nullable(v.number()),
};

export const ListingWatcherSchema = v.object({
	...Common,
	kind: v.literal("listing"),
	/** The search the item was found in; the fetch API wants it alongside the id. */
	searchId: v.string(),
	itemId: v.string(),
	name: v.string(),
	seller: v.string(),
	price: v.nullable(PriceSchema),
	previousPrice: v.nullable(PriceSchema),
	status: v.picklist(["listed", "gone", "back"]),
	changedAt: v.nullable(v.number()),
});

export const SearchWatcherSchema = v.object({
	...Common,
	kind: v.literal("search"),
	bookmarkId: v.nullable(v.string()),
	name: v.string(),
	query: TradeQuerySchema,
	seenIds: v.array(v.string()),
	newIds: v.array(v.string()),
	total: v.nullable(v.number()),
});

export const WatcherSchema = v.variant("kind", [
	ListingWatcherSchema,
	SearchWatcherSchema,
]);

export type ListingWatcher = v.InferOutput<typeof ListingWatcherSchema>;
export type SearchWatcher = v.InferOutput<typeof SearchWatcherSchema>;
export type Watcher = v.InferOutput<typeof WatcherSchema>;
export type Price = v.InferOutput<typeof PriceSchema>;

/** Keeps every watcher that validates, so one bad entry does not cost the rest. */
export function parseWatchers(raw: unknown): Watcher[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		const parsed = v.safeParse(WatcherSchema, item);
		return parsed.success ? [parsed.output] : [];
	});
}

const backoffMs = (intervalMin: number, failures: number) =>
	Math.min(MAX_BACKOFF_MS, intervalMin * 60_000 * 2 ** (failures - 1));

/**
 * When the watcher is next due. Stored times come from the clock at the time,
 * so after the clock is set back a check can read as made in the future, and
 * a retry as further off than any backoff sets it: either is due now, or the
 * watcher would pause for as long as the clock jumped.
 */
function dueAt(watcher: Watcher, now: number): number {
	const checked = watcher.lastCheckedAt;
	const scheduled =
		checked === null || checked > now
			? 0
			: checked + watcher.intervalMin * 60_000;
	const retry = watcher.retryAt;
	const longestRetry =
		now + backoffMs(watcher.intervalMin, Math.max(1, watcher.failures));
	return Math.max(
		scheduled,
		retry === null || retry > longestRetry ? 0 : retry,
	);
}

export function isDue(watcher: Watcher, now: number): boolean {
	return now >= dueAt(watcher, now);
}

/** Minutes until the soonest watcher is due, for the next alarm. */
export function nextDueInMinutes(
	watchers: readonly Watcher[],
	now: number,
): number | null {
	if (watchers.length === 0) return null;
	const soonest = Math.min(...watchers.map((w) => dueAt(w, now)));
	return Math.max(WATCH_INTERVAL.min, (soonest - now) / 60_000);
}

/** A check the server refused: wait the interval, doubled per failure in a row. */
export function applyFailure<W extends Watcher>(watcher: W, now: number): W {
	const failures = watcher.failures + 1;
	return {
		...watcher,
		failures,
		retryAt: now + backoffMs(watcher.intervalMin, failures),
	};
}

const samePrice = (a: Price | null, b: Price | null) =>
	a?.amount === b?.amount && a?.currency === b?.currency;

/** What one fetch said about a watched listing: still listed (with its price) or gone. */
export type ListingCheck =
	| { listed: true; price: Price | null }
	| { listed: false };

export function applyListingCheck(
	watcher: ListingWatcher,
	check: ListingCheck,
	now: number,
): ListingWatcher {
	if (!check.listed) {
		return {
			...watcher,
			failures: 0,
			retryAt: null,
			lastCheckedAt: now,
			status: "gone",
			changedAt: watcher.status === "gone" ? watcher.changedAt : now,
		};
	}
	const back = watcher.status === "gone";
	const repriced = !samePrice(watcher.price, check.price);
	return {
		...watcher,
		failures: 0,
		retryAt: null,
		lastCheckedAt: now,
		status: back ? "back" : watcher.status,
		price: check.price,
		previousPrice: repriced ? watcher.price : watcher.previousPrice,
		changedAt: back || repriced ? now : watcher.changedAt,
	};
}

/**
 * Records a search's current result ids. The first check only learns what is
 * already there; later checks add ids not seen before to the new list, which
 * the user clears by opening the search.
 */
export function applySearchCheck(
	watcher: SearchWatcher,
	result: { ids: readonly string[]; total: number },
	now: number,
): SearchWatcher {
	const seen = new Set(watcher.seenIds);
	const fresh =
		watcher.lastCheckedAt === null
			? []
			: result.ids.filter((id) => !seen.has(id));
	const known = new Set(watcher.newIds);
	return {
		...watcher,
		failures: 0,
		retryAt: null,
		lastCheckedAt: now,
		total: result.total,
		newIds: [...watcher.newIds, ...fresh.filter((id) => !known.has(id))],
		// Newest first, so the cap drops the ids seen longest ago.
		seenIds: (watcher.lastCheckedAt === null
			? [...result.ids]
			: [...fresh, ...watcher.seenIds]
		).slice(0, SEEN_CAP),
	};
}

export function markSeen(watcher: SearchWatcher): SearchWatcher {
	return { ...watcher, newIds: [] };
}

/** Where a watcher's requests go: the trade site and search it was made on. */
export interface WatchSite {
	origin: string;
	game: Watcher["game"];
	realm: string | null;
	league: string;
}

/** Watches one result row; the first check confirms it is still listed. */
export function listingWatcherFrom(
	item: {
		id: string;
		name: string;
		baseType: string;
		seller: string | null;
		price: Price | null;
	},
	site: WatchSite & { searchId: string },
	intervalMin: number,
	now: number,
	id: string,
): ListingWatcher {
	return {
		kind: "listing",
		id,
		origin: site.origin,
		game: site.game,
		realm: site.realm,
		league: site.league,
		intervalMin,
		createdAt: now,
		lastCheckedAt: null,
		failures: 0,
		retryAt: null,
		searchId: site.searchId,
		itemId: item.id,
		name: [item.name, item.baseType].filter(Boolean).join(" "),
		seller: item.seller ?? "",
		price: item.price,
		previousPrice: null,
		status: "listed",
		changedAt: null,
	};
}

/** Adds the watcher, or removes the one already watching that listing. */
export function toggleListingWatch(
	watchers: readonly Watcher[],
	watcher: ListingWatcher,
): Watcher[] {
	const existing = watchers.find(
		(w) => w.kind === "listing" && w.itemId === watcher.itemId,
	);
	return existing
		? watchers.filter((w) => w !== existing)
		: [...watchers, watcher];
}

export function removeWatcher(
	watchers: readonly Watcher[],
	id: string,
): Watcher[] {
	return watchers.filter((w) => w.id !== id);
}

/**
 * Watches a saved search for new results. The first check only learns what
 * is already listed (see applySearchCheck).
 */
export function searchWatcherFrom(
	bookmark: { id: string; name: string; query: TradeQuery },
	site: WatchSite,
	intervalMin: number,
	now: number,
	id: string,
): SearchWatcher {
	return {
		kind: "search",
		id,
		origin: site.origin,
		game: site.game,
		realm: site.realm,
		league: site.league,
		intervalMin,
		createdAt: now,
		lastCheckedAt: null,
		failures: 0,
		retryAt: null,
		bookmarkId: bookmark.id,
		name: bookmark.name,
		query: bookmark.query,
		seenIds: [],
		newIds: [],
		total: null,
	};
}

/** Adds the watcher, or removes the one already watching that bookmark. */
export function toggleSearchWatch(
	watchers: readonly Watcher[],
	watcher: SearchWatcher,
): Watcher[] {
	const existing = watchers.find(
		(w) => w.kind === "search" && w.bookmarkId === watcher.bookmarkId,
	);
	return existing
		? watchers.filter((w) => w !== existing)
		: [...watchers, watcher];
}

/**
 * Points a bookmark's search watcher at the bookmark's new search after an
 * overwrite. What it saw of the old search says nothing about the new one, so
 * it starts over.
 */
export function retargetSearchWatch(
	watchers: readonly Watcher[],
	bookmarkId: string,
	search: { query: TradeQuery; name: string; league: string },
): Watcher[] {
	return watchers.map((w) =>
		w.kind === "search" && w.bookmarkId === bookmarkId
			? {
					...w,
					query: search.query,
					name: search.name,
					league: search.league,
					lastCheckedAt: null,
					failures: 0,
					retryAt: null,
					seenIds: [],
					newIds: [],
					total: null,
				}
			: w,
	);
}

/** Drops the search watcher of a deleted bookmark. */
export function forgetBookmark(
	watchers: readonly Watcher[],
	bookmarkId: string,
): Watcher[] {
	return watchers.filter(
		(w) => !(w.kind === "search" && w.bookmarkId === bookmarkId),
	);
}

/**
 * Folds a background pass's results into what is stored now. A tab may have
 * changed a watcher while the pass ran: new results it marked seen stay seen,
 * and a search watcher pointed at a new query keeps that and drops the old
 * query's results.
 */
export function mergeCheckResults(
	before: readonly Watcher[],
	checked: readonly Watcher[],
	current: readonly Watcher[],
): { watchers: Watcher[]; applied: Set<string> } {
	const was = new Map(before.map((w) => [w.id, w]));
	const now = new Map(checked.map((w) => [w.id, w]));
	const applied = new Set<string>();
	const watchers = current.map((stored): Watcher => {
		const result = now.get(stored.id);
		const start = was.get(stored.id);
		if (!result || !start || result.kind !== stored.kind) return stored;
		// Pointed at another search or league meanwhile: the pass checked the old one.
		if (
			stored.league !== start.league ||
			(stored.kind === "search" &&
				start.kind === "search" &&
				JSON.stringify(stored.query) !== JSON.stringify(start.query))
		)
			return stored;
		applied.add(stored.id);
		if (
			result.kind === "search" &&
			stored.kind === "search" &&
			start.kind === "search"
		) {
			return {
				...result,
				name: stored.name,
				intervalMin: stored.intervalMin,
				newIds: result.newIds.filter(
					(id) => stored.newIds.includes(id) || !start.newIds.includes(id),
				),
			};
		}
		return { ...result, intervalMin: stored.intervalMin };
	});
	return { watchers, applied };
}

/** Search watchers of the given bookmarks removed, for a deleted folder. */
export function forgetBookmarks(
	watchers: readonly Watcher[],
	bookmarkIds: ReadonlySet<string>,
): Watcher[] {
	return watchers.filter(
		(w) =>
			!(w.kind === "search" && w.bookmarkId && bookmarkIds.has(w.bookmarkId)),
	);
}
