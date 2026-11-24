import { browser } from "wxt/browser";
import { createRateLimiter } from "../core/rateLimit";
import { TRADE_ORIGINS } from "../core/sites";
import { createTradeQueue } from "../core/tradeQueue";

/** Whether the user has allowed the background to call the trade API. */
export function hasTradeAccess(): Promise<boolean> {
	return browser.permissions.contains({ origins: TRADE_ORIGINS });
}

/**
 * Longest a background request may wait for the rate limiter. Chrome stops an
 * idle service worker after about 30 seconds and Firefox unloads an idle event
 * page, so anything longer is left for the next alarm.
 */
export const BACKGROUND_MAX_WAIT_MS = 20_000;

/**
 * The background's single queue. The session cookie goes along because the
 * trade API answers watchers the same way it answers the user's own tab; the
 * extension never reads it.
 */
export const backgroundTradeQueue = createTradeQueue(createRateLimiter(), {
	fetch: (url, init) =>
		fetch(url, { ...init, credentials: "include", cache: "no-store" }),
	now: Date.now,
	sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
