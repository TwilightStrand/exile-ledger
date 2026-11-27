import * as v from "valibot";
import { browser } from "wxt/browser";
import { TRADE_ACCESS_KEY } from "../core/messages";
import { isTradePattern } from "../core/sites";
import { fetchApiUrl, searchApiUrl } from "../core/tradeApiUrls";
import type { QueueResult } from "../core/tradeQueue";
import {
	type Outcome,
	runDueWatchers,
	searchBody,
	type WatcherApi,
	type WatcherEvent,
} from "../core/watcherRun";
import {
	mergeCheckResults,
	nextDueInMinutes,
	type Watcher,
} from "../core/watchers";
import { browserWatchers, writeWatchers } from "../storage/watcherStore";
import {
	grantedOrigins,
	PASS_BUDGET_MS,
	penaltyEndsAt,
	tradeRequest,
} from "./tradeQueue";

export const WATCHER_ALARM = "exile-ledger:watchers";

const SearchResponse = v.object({
	result: v.array(v.string()),
	total: v.number(),
});

function outcomeOf(result: QueueResult): Outcome<unknown> {
	if (result.ok) return { kind: "ok", value: result.body };
	return result.reason === "deferred" || result.reason === "network"
		? { kind: "skipped" }
		: { kind: "refused" };
}

function apiUntil(deadline: number): WatcherApi {
	const budget = () => Math.max(0, deadline - Date.now());
	return {
		async fetchListings({ origin, game, realm, searchId, ids }) {
			return outcomeOf(
				await tradeRequest(
					"fetch",
					fetchApiUrl(origin, game, realm, ids, searchId),
					{},
					budget(),
				),
			);
		},
		async runSearch(watcher) {
			const outcome = outcomeOf(
				await tradeRequest(
					"search",
					searchApiUrl(
						watcher.origin,
						watcher.game,
						watcher.realm,
						watcher.league,
					),
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: searchBody(watcher.query),
					},
					budget(),
				),
			);
			if (outcome.kind !== "ok") return outcome;
			const parsed = v.safeParse(SearchResponse, outcome.value);
			return parsed.success
				? {
						kind: "ok",
						value: { ids: parsed.output.result, total: parsed.output.total },
					}
				: { kind: "refused" };
		},
	};
}

/** The watchers whose trade site the background may call; the rest wait for access. */
async function runnable(watchers: readonly Watcher[]): Promise<Watcher[]> {
	const granted = await grantedOrigins(watchers.map((w) => w.origin));
	return watchers.filter((w) => granted.has(w.origin));
}

/**
 * Sets the alarm for the next due watcher that has access, never inside a running penalty,
 * and never later than an alarm already set: storage writes from a tab would
 * otherwise keep pushing a due check back.
 */
async function schedule(watchers: readonly Watcher[]): Promise<void> {
	const ready = await runnable(watchers);
	const now = Date.now();
	const minutes = nextDueInMinutes(ready, now);
	if (minutes === null) {
		await browser.alarms.clear(WATCHER_ALARM);
		return;
	}
	const when = Math.max(now + minutes * 60_000, await penaltyEndsAt());
	const existing = await browser.alarms.get(WATCHER_ALARM);
	if (
		existing &&
		existing.scheduledTime <= when &&
		existing.scheduledTime > now
	)
		return;
	browser.alarms.create(WATCHER_ALARM, { when });
}

let running = false;

/**
 * One pass over the due watchers. A fallback alarm is set first, so a pass the
 * browser cuts short still leads to another. Results are merged into whatever
 * is stored at the end, in turn with tab edits (see writeWatchers), keeping
 * watchers a tab added or removed meanwhile.
 */
export async function runWatchers(
	onEvents: (events: WatcherEvent[]) => void,
): Promise<void> {
	if (running) return;
	running = true;
	try {
		const watchers = await runnable(await browserWatchers.load());
		if (watchers.length === 0) {
			await browser.alarms.clear(WATCHER_ALARM);
			return;
		}
		browser.alarms.create(WATCHER_ALARM, { delayInMinutes: 1 });
		const deadline = Date.now() + PASS_BUDGET_MS;
		const { watchers: checked, events } = await runDueWatchers(
			watchers,
			apiUntil(deadline),
			Date.now,
			deadline,
		);
		let applied = new Set<string>();
		const stored = await writeWatchers((current) => {
			const merged = mergeCheckResults(watchers, checked, current);
			applied = merged.applied;
			return merged.watchers;
		});
		await browser.alarms.clear(WATCHER_ALARM);
		await schedule(stored);
		// Events for a watcher a tab changed or removed meanwhile are about a search it no longer watches.
		const current = events.filter((e) => applied.has(e.watcher.id));
		if (current.length > 0) onEvents(current);
	} finally {
		running = false;
	}
}

let publishing: Promise<unknown> = Promise.resolve();

/**
 * Tells the panel whether any watcher waits for access. Written only when it
 * changes, since every pass changes the watchers and a write wakes every tab.
 * One at a time: two overlapping calls could otherwise each compare against
 * the old value and land in the wrong order.
 */
function publishAccess(watchers?: readonly Watcher[]): Promise<void> {
	const run = publishing.then(() => writeAccess(watchers));
	publishing = run.catch(() => {});
	return run;
}

async function writeAccess(watchers?: readonly Watcher[]): Promise<void> {
	const all = watchers ?? (await browserWatchers.load());
	const ready = await runnable(all);
	const value = ready.length === all.length;
	const stored = await browser.storage.local.get(TRADE_ACCESS_KEY);
	if (stored[TRADE_ACCESS_KEY] === value) return;
	await browser.storage.local.set({ [TRADE_ACCESS_KEY]: value });
}

/** Wires the alarm, reschedules on edits, and restarts once access is granted. */
export function startWatchers(onEvents: (events: WatcherEvent[]) => void) {
	publishAccess().catch(() => {});
	browser.permissions.onRemoved.addListener(() => {
		publishAccess().catch(() => {});
	});
	browser.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === WATCHER_ALARM) runWatchers(onEvents).catch(() => {});
	});
	browserWatchers.watch((watchers) => {
		schedule(watchers).catch(() => {});
		publishAccess(watchers).catch(() => {});
	});
	browser.permissions.onAdded.addListener((granted) => {
		// Chrome may report a single host such as https://www.pathofexile.com/*
		// rather than one of the patterns the extension asked for.
		if (granted.origins?.some(isTradePattern)) {
			publishAccess().catch(() => {});
			runWatchers(onEvents).catch(() => {});
		}
	});
	// The background wakes for every message and storage change, so a pass
	// here would add an unplanned check per wake. Rescheduling is enough: the
	// browser may have dropped the alarm on restart, and an overdue watcher
	// runs at the next alarm, a minute at the most.
	rescheduleOnStart().catch(() => {});
}

async function rescheduleOnStart(): Promise<void> {
	// schedule only counts watchers with access: without it every alarm would
	// only wake the background to clear itself.
	await schedule(await browserWatchers.load());
}
