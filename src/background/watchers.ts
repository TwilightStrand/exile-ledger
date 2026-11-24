import * as v from "valibot";
import { browser } from "wxt/browser";
import { fetchApiUrl, searchApiUrl } from "../core/tradeApiUrls";
import {
	runDueWatchers,
	searchBody,
	type WatcherApi,
	type WatcherEvent,
} from "../core/watcherRun";
import { nextDueInMinutes, type Watcher } from "../core/watchers";
import { browserWatchers } from "../storage/watcherStore";
import {
	BACKGROUND_MAX_WAIT_MS,
	backgroundTradeQueue,
	hasTradeAccess,
} from "./tradeQueue";

export const WATCHER_ALARM = "exile-ledger:watchers";

const SearchResponse = v.object({
	result: v.array(v.string()),
	total: v.number(),
});

const api: WatcherApi = {
	async fetchListings({ origin, game, realm, searchId, ids }) {
		const result = await backgroundTradeQueue.enqueue(
			"fetch",
			fetchApiUrl(origin, game, realm, ids, searchId),
			{},
			BACKGROUND_MAX_WAIT_MS,
		);
		return result.ok ? result.body : null;
	},
	async runSearch(watcher) {
		const result = await backgroundTradeQueue.enqueue(
			"search",
			searchApiUrl(watcher.origin, watcher.game, watcher.realm, watcher.league),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: searchBody(watcher.query),
			},
			BACKGROUND_MAX_WAIT_MS,
		);
		if (!result.ok) return null;
		const parsed = v.safeParse(SearchResponse, result.body);
		return parsed.success
			? { ids: parsed.output.result, total: parsed.output.total }
			: null;
	},
};

async function schedule(watchers: readonly Watcher[]): Promise<void> {
	const minutes = nextDueInMinutes(watchers, Date.now());
	if (minutes === null) await browser.alarms.clear(WATCHER_ALARM);
	else browser.alarms.create(WATCHER_ALARM, { delayInMinutes: minutes });
}

let running = false;

/**
 * One pass over the due watchers. Results are merged into whatever is stored
 * at the end, so a watcher added or removed from a tab while the pass ran is
 * kept as the tab left it.
 */
export async function runWatchers(
	onEvents: (events: WatcherEvent[]) => void,
): Promise<void> {
	if (running) return;
	running = true;
	try {
		const watchers = await browserWatchers.load();
		if (watchers.length === 0 || !(await hasTradeAccess())) {
			await schedule([]);
			return;
		}
		const { watchers: checked, events } = await runDueWatchers(
			watchers,
			api,
			Date.now,
		);
		const byId = new Map(checked.map((w) => [w.id, w]));
		const stored = await browserWatchers.update((current) =>
			current.map((w) => byId.get(w.id) ?? w),
		);
		await schedule(stored);
		if (events.length > 0) onEvents(events);
	} finally {
		running = false;
	}
}

/** Wires the alarm and re-schedules when watchers are added, removed or edited. */
export function startWatchers(onEvents: (events: WatcherEvent[]) => void) {
	browser.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === WATCHER_ALARM) runWatchers(onEvents);
	});
	browserWatchers.watch((watchers) => {
		schedule(watchers);
	});
	runWatchers(onEvents);
}
