import * as v from "valibot";
import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";
import {
	createRateLimiter,
	LimiterSnapshotSchema,
	type RequestKind,
} from "../core/rateLimit";
import { TRADE_ORIGINS } from "../core/sites";
import { createTradeQueue, type QueueResult } from "../core/tradeQueue";

/** Whether the user has allowed the background to call the trade API. */
export function hasTradeAccess(): Promise<boolean> {
	return browser.permissions.contains({ origins: TRADE_ORIGINS });
}

/**
 * Longest one watcher pass may take. Chrome stops a service worker after 30 s
 * without extension events or API calls (pending timers and fetches do not
 * count), and Firefox unloads idle event pages, so a pass stops starting new
 * requests well before that.
 */
export const PASS_BUDGET_MS = 20_000;

const limiter = createRateLimiter();
const queue = createTradeQueue(limiter, {
	// The session cookie goes along because the trade API answers watchers the
	// same way it answers the user's own tab; the extension never reads it.
	fetch: (url, init) =>
		fetch(url, { ...init, credentials: "include", cache: "no-store" }),
	now: Date.now,
	sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

// Session storage survives the background being stopped and restarted but not
// a browser restart. After a browser restart the limiter starts cold and paces
// by a fixed gap until the first response reports the limits.
const limiterState = storage.defineItem<unknown>("session:tradeLimiter");

// Storage failures only lose the saved state; the request path must go on,
// or a pass would abort after sending and repeat the request on every alarm.
const restored = limiterState
	.getValue()
	.then((saved) => {
		const parsed = v.safeParse(LimiterSnapshotSchema, saved);
		if (parsed.success) limiter.restore(parsed.output, Date.now());
	})
	.catch(() => {});

/** The background's single path to the trade API, paced and penalty-aware. */
export async function tradeRequest(
	kind: RequestKind,
	url: string,
	init: RequestInit,
	maxWaitMs: number,
): Promise<QueueResult> {
	await restored;
	const result = await queue.enqueue(kind, url, init, maxWaitMs);
	await limiterState.setValue(limiter.snapshot()).catch(() => {});
	return result;
}

/** When the last running penalty ends, so alarms are not set to fire into one. */
export async function penaltyEndsAt(): Promise<number> {
	await restored;
	return limiter.blockedUntil();
}
