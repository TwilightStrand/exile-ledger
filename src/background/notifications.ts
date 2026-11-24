import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";
import { messagesFor, resolveLocale } from "../core/i18n";
import { noticeFor } from "../core/watcherNotices";
import type { WatcherEvent } from "../core/watcherRun";
import { browserSettings } from "../storage/settingsStore";

const PREFIX = "exile-ledger:";

/**
 * Where each shown notification leads. Session storage, because the browser
 * may stop the background between showing a notification and its click.
 */
const targets = storage.defineItem<Record<string, string>>(
	"session:noticeTargets",
	{ fallback: {} },
);

const hasPermission = () =>
	browser.permissions.contains({ permissions: ["notifications"] });

/** Shows one notification per event when the user turned them on and allowed them. */
export async function notify(events: readonly WatcherEvent[]): Promise<void> {
	if (events.length === 0) return;
	const prefs = await browserSettings.load();
	if (!prefs.notifications) return;
	const t = messagesFor(resolveLocale(prefs.language, navigator.languages));
	if (!(await hasPermission())) return;
	const shown: Record<string, string> = {};
	for (const event of events) {
		const notice = noticeFor(event, t);
		const id = `${PREFIX}${event.watcher.id}:${Date.now()}`;
		try {
			await browser.notifications.create(id, {
				type: "basic",
				iconUrl: browser.runtime.getURL("/icon/128.png"),
				title: notice.title,
				message: notice.message,
			});
			shown[id] = notice.url;
		} catch {
			// One failed notification should not hide the others.
		}
	}
	await targets.setValue({ ...(await targets.getValue()), ...shown });
}

let listening = false;

async function onClicked(id: string): Promise<void> {
	if (!id.startsWith(PREFIX)) return;
	const all = await targets.getValue();
	const url = all[id];
	const { [id]: _done, ...rest } = all;
	await targets.setValue(rest);
	browser.notifications.clear(id).catch(() => {});
	if (url) await browser.tabs.create({ url });
}

async function onClosed(id: string): Promise<void> {
	if (!id.startsWith(PREFIX)) return;
	const { [id]: _done, ...rest } = await targets.getValue();
	await targets.setValue(rest);
}

/**
 * Adds the click handlers. Called synchronously at startup: a click usually
 * comes after the browser has stopped the idle background, and the click
 * that restarts it is only delivered to listeners added in the first turn.
 * Without the permission Chrome has no notifications API at all, so a grant
 * later in the session adds them then.
 */
function listen(): void {
	if (listening || !browser.notifications) return;
	listening = true;
	browser.notifications.onClicked.addListener((id) => {
		onClicked(id).catch(() => {});
	});
	browser.notifications.onClosed.addListener((id) => {
		onClosed(id).catch(() => {});
	});
}

export function startNotifications(): void {
	listen();
	browser.permissions.onAdded.addListener((granted) => {
		if (granted.permissions?.includes("notifications")) listen();
	});
}
