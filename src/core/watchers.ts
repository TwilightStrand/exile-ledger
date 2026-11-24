import * as v from "valibot";
import { TradeQuerySchema } from "./query";
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

function dueAt(watcher: Watcher): number {
	const scheduled =
		watcher.lastCheckedAt === null
			? 0
			: watcher.lastCheckedAt + watcher.intervalMin * 60_000;
	return Math.max(scheduled, watcher.retryAt ?? 0);
}

export function isDue(watcher: Watcher, now: number): boolean {
	return now >= dueAt(watcher);
}

/** Minutes until the soonest watcher is due, for the next alarm. */
export function nextDueInMinutes(
	watchers: readonly Watcher[],
	now: number,
): number | null {
	if (watchers.length === 0) return null;
	const soonest = Math.min(...watchers.map(dueAt));
	return Math.max(WATCH_INTERVAL.min, (soonest - now) / 60_000);
}

/** A check the server refused: wait the interval, doubled per failure in a row. */
export function applyFailure<W extends Watcher>(watcher: W, now: number): W {
	const failures = watcher.failures + 1;
	const wait = Math.min(
		MAX_BACKOFF_MS,
		watcher.intervalMin * 60_000 * 2 ** (failures - 1),
	);
	return { ...watcher, failures, retryAt: now + wait };
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
