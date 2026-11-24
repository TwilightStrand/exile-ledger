import * as v from "valibot";
import { browser } from "wxt/browser";
import { TRADE_ACCESS_KEY } from "../core/messages";
import { TRADE_ORIGINS } from "../core/sites";
import { fetchApiUrl, searchApiUrl } from "../core/tradeApiUrls";
import type { QueueResult } from "../core/tradeQueue";
import {
	type Outcome,
	runDueWatchers,
	searchBody,
	type WatcherApi,
	type WatcherEvent,
} from "../core/watcherRun";
import { nextDueInMinutes, type Watcher } from "../core/watchers";
import { browserWatchers } from "../storage/watcherStore";
import {
	hasTradeAccess,
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

/**
 * Sets the alarm for the next due watcher, never inside a running penalty,
 * and never later than an alarm already set: storage writes from a tab would
 * otherwise keep pushing a due check back.
 */
async function schedule(watchers: readonly Watcher[]): Promise<void> {
	const now = Date.now();
	const minutes = nextDueInMinutes(watchers, now);
	if (minutes === null) {
		await browser.alarms.clear(WATCHER_ALARM);
		return;
	}
	const when = Math.max(now + minutes * 60_000, penaltyEndsAt());
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
 * is stored at the end, keeping watchers a tab added or removed meanwhile.
 */
export async function runWatchers(
	onEvents: (events: WatcherEvent[]) => void,
): Promise<void> {
	if (running) return;
	running = true;
	try {
		const watchers = await browserWatchers.load();
		if (watchers.length === 0 || !(await hasTradeAccess())) {
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
		const byId = new Map(checked.map((w) => [w.id, w]));
		const stored = await browserWatchers.update((current) =>
			current.map((w) => byId.get(w.id) ?? w),
		);
		await browser.alarms.clear(WATCHER_ALARM);
		await schedule(stored);
		if (events.length > 0) onEvents(events);
	} finally {
		running = false;
	}
}

async function publishAccess(): Promise<void> {
	await browser.storage.local.set({
		[TRADE_ACCESS_KEY]: await hasTradeAccess(),
	});
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
	});
	browser.permissions.onAdded.addListener((granted) => {
		if (granted.origins?.some((o) => TRADE_ORIGINS.includes(o))) {
			publishAccess().catch(() => {});
			runWatchers(onEvents).catch(() => {});
		}
	});
	runWatchers(onEvents).catch(() => {});
}
