import * as v from "valibot";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { RatesRequestSchema } from "../core/messages";
import { OFF_STATUS, type SyncStatus, syncOnce } from "../core/syncEngine";
import { getRates } from "../pricing/ratesService";
import { listenForLibraryWrites } from "../storage/libraryStore";
import { browserSettings } from "../storage/settingsStore";
import { browserSyncPorts, browserSyncStatus } from "../storage/syncPorts";

/** Waits after a local edit so a burst of renames or drags syncs once. */
const PUSH_DELAY_MS = 5000;
const PULL_DELAY_MS = 500;
const WAIT_RETRY_MS = 3000;
/** Long enough for Chrome's per-minute storage.sync write limit to reset. */
const ERROR_RETRY_MS = 60_000;
/** After this many half-written reads in a row the remote is treated as damaged and replaced. */
const MAX_WAITS = 5;

export default defineBackground(() => {
	listenForLibraryWrites();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let running = false;
	let rerun = false;
	let waits = 0;

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
		if (status.state === "waiting") schedule(WAIT_RETRY_MS);
		else if (status.state === "error") schedule(ERROR_RETRY_MS);
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

	schedule(0);
});
