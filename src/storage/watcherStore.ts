import * as v from "valibot";
import { browser } from "wxt/browser";
import {
	TRADE_ACCESS_KEY,
	type WatcherWrite,
	WatcherWriteSchema,
} from "../core/messages";
import type { Source } from "../core/source";
import { applyWatcherOps, diffWatchers } from "../core/watcherOps";
import { parseWatchers, type Watcher } from "../core/watchers";
import { localSource } from "./localSource";

// Local only: watcher state changes on every check and is tied to this
// machine's session with the trade site.
const stored = localSource("local:watchers", parseWatchers);

let queue: Promise<unknown> = Promise.resolve();

/**
 * Background only, and the only way the watcher list is written. Writes run
 * one after another, each on the list stored at that moment: a tab's
 * read-modify-write racing the background's end-of-pass merge lost one side
 * (a new watcher dropped, a removed one brought back, a pass's results
 * repeated).
 */
export function writeWatchers(
	change: (current: Watcher[]) => Watcher[],
): Promise<Watcher[]> {
	const run = queue.then(() => stored.update(change));
	queue = run.catch(() => {});
	return run;
}

/** Background only: accepts watcher changes from tabs and extension pages. */
export function listenForWatcherWrites(): () => void {
	// sendResponse plus `return true` is the async reply form every supported
	// Chrome and Firefox accepts; returning a promise is not.
	const listener = (
		message: unknown,
		_sender: unknown,
		sendResponse: (ok: boolean) => void,
	) => {
		const request = v.safeParse(WatcherWriteSchema, message);
		if (!request.success) return undefined;
		const { ops } = request.output;
		let ok = false;
		writeWatchers((current) => {
			const result = applyWatcherOps(current, ops);
			ok = result.ok;
			return result.watchers;
		}).then(
			() => sendResponse(ok),
			() => sendResponse(false),
		);
		return true;
	};
	browser.runtime.onMessage.addListener(listener);
	return () => browser.runtime.onMessage.removeListener(listener);
}

const local = new Set<(watchers: Watcher[]) => void>();
let sending: Promise<unknown> = Promise.resolve();

async function send(change: (value: Watcher[]) => Watcher[]) {
	const before = await stored.load();
	const next = change(before);
	const ops = diffWatchers(before, next);
	if (ops.length === 0) return next;
	// Shown at once; the stored list follows when the background has written it.
	for (const listener of local) listener(next);
	const write: WatcherWrite = { type: "exile-ledger:watchers-write", ops };
	// Through a promise, so a synchronous throw (the extension was reloaded
	// under this tab) rolls back like a rejected send.
	const ok: unknown = await Promise.resolve()
		.then(() => browser.runtime.sendMessage(write))
		.catch(() => false);
	if (ok !== true) {
		const latest = await stored.load();
		for (const listener of local) listener(latest);
		throw new Error("Saving watchers failed.");
	}
	return next;
}

/**
 * For tabs and extension pages. `update` sends the change to the background
 * as operations (see WatcherWriteSchema). Never call it from the background:
 * a context does not receive its own runtime messages. The background uses
 * `writeWatchers`.
 */
export const browserWatchers: Source<Watcher[]> = {
	load: stored.load,
	// One at a time per context, so a second quick click diffs against the
	// list the first one produced.
	update: (change) => {
		const run = sending.then(() => send(change));
		sending = run.catch(() => {});
		return run;
	},
	watch: (onChange) => {
		local.add(onChange);
		const stop = stored.watch(onChange);
		return () => {
			local.delete(onChange);
			stop();
		};
	},
};

/** Written by the background (see TRADE_ACCESS_KEY); anything but true reads as no access. */
export const browserTradeAccess = localSource(
	`local:${TRADE_ACCESS_KEY}`,
	(raw) => raw === true,
);
