import * as v from "valibot";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { startWatchers } from "../background/watchers";
import {
	OpenSettingsSchema,
	PRICING_ACCESS_KEY,
	RatesRequestSchema,
} from "../core/messages";
import { OFF_STATUS, type SyncStatus, syncOnce } from "../core/syncEngine";
import { getRates, NINJA_ORIGIN } from "../pricing/ratesService";
import { listenForLibraryWrites } from "../storage/libraryStore";
import { browserSettings } from "../storage/settingsStore";
import { browserSyncPorts, browserSyncStatus } from "../storage/syncPorts";

/** Waits after a local edit so a burst of renames or drags syncs once. */
const PUSH_DELAY_MS = 5000;
const PULL_DELAY_MS = 500;
const WAIT_RETRY_MS = 3000;
/**
 * Under the ~30 s after which Chrome stops an idle service worker and Firefox
 * unloads an idle event page; a longer timer would be dropped with it. If the
 * per-minute storage.sync write limit is still in effect, the next try waits
 * again.
 */
const ERROR_RETRY_MS = 25_000;
/**
 * An error that never clears (sync disabled in the browser, for one) would
 * otherwise keep the background awake for good; after this many the next
 * change or browser start tries again.
 */
const MAX_ERROR_RETRIES = 3;
/** After this many half-written reads in a row the remote is treated as damaged and replaced. */
const MAX_WAITS = 5;

export default defineBackground(() => {
	listenForLibraryWrites();
	// Notifications for these events arrive with the notifications permission.
	startWatchers(() => {});
	let timer: ReturnType<typeof setTimeout> | undefined;
	let running = false;
	let rerun = false;
	let waits = 0;
	let errors = 0;

	const schedule = (ms: number) => {
		clearTimeout(timer);
		timer = setTimeout(run, ms);
	};

	const run = async () => {
		if (running) {
			rerun = true;
			return;
		}
		running = true;
		let status: SyncStatus = OFF_STATUS;
		try {
			const prefs = await browserSettings.load();
			status = prefs.syncEnabled
				? await syncOnce(browserSyncPorts)
				: OFF_STATUS;
			if (status.state === "waiting") {
				waits++;
				if (waits >= MAX_WAITS) {
					waits = 0;
					status = await syncOnce(browserSyncPorts, { replaceDamaged: true });
				}
			} else {
				waits = 0;
			}
			await browserSyncStatus.update(() => status);
		} finally {
			running = false;
		}
		if (status.state !== "error") errors = 0;
		if (status.state === "waiting") schedule(WAIT_RETRY_MS);
		else if (status.state === "error" && errors++ < MAX_ERROR_RETRIES)
			schedule(ERROR_RETRY_MS);
		else if (rerun) {
			rerun = false;
			schedule(0);
		}
	};

	browser.storage.onChanged.addListener((changes, area) => {
		const keys = Object.keys(changes);
		if (area === "local" && keys.includes("library")) schedule(PUSH_DELAY_MS);
		if (area === "sync" && keys.some((k) => k.startsWith("el:")))
			schedule(PULL_DELAY_MS);
		if (area === "sync" && keys.includes("settings")) schedule(0);
	});

	browser.runtime.onMessage.addListener(
		(
			message: unknown,
			_sender: unknown,
			sendResponse: (rates: unknown) => void,
		) => {
			if (v.is(OpenSettingsSchema, message)) {
				browser.runtime.openOptionsPage().catch(() => {});
				return undefined;
			}
			const request = v.safeParse(RatesRequestSchema, message);
			if (!request.success) return undefined;
			// sendResponse plus `return true` is the async reply form every
			// supported Chrome and Firefox accepts.
			getRates(request.output.game, request.output.league).then(
				sendResponse,
				() => sendResponse(null),
			);
			return true;
		},
	);

	browser.permissions.onAdded.addListener((granted) => {
		if (granted.origins?.includes(NINJA_ORIGIN)) {
			// Best effort: open tabs also retry on their next settings change.
			browser.storage.local
				.set({ [PRICING_ACCESS_KEY]: Date.now() })
				.catch(() => {});
		}
	});

	schedule(0);
});
