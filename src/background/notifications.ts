import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";
import { en, type Messages } from "../core/i18n";
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
export async function notify(
	events: readonly WatcherEvent[],
	t: Messages = en,
): Promise<void> {
	if (events.length === 0) return;
	if (!(await browserSettings.load()).notifications) return;
	if (!(await hasPermission())) return;
	const shown: Record<string, string> = {};
	for (const event of events) {
		const notice = noticeFor(event, t);
		const id = `${PREFIX}${event.watcher.id}:${Date.now()}`;
		await browser.notifications.create(id, {
			type: "basic",
			iconUrl: browser.runtime.getURL("/icon/128.png"),
			title: notice.title,
			message: notice.message,
		});
		shown[id] = notice.url;
	}
	await targets.setValue({ ...(await targets.getValue()), ...shown });
}

let listening = false;

/**
 * Click handling is added only once the permission exists: without it the
 * notifications API is not there at all in Chrome.
 */
async function listen(): Promise<void> {
	if (listening || !(await hasPermission())) return;
	listening = true;
	browser.notifications.onClicked.addListener(async (id) => {
		if (!id.startsWith(PREFIX)) return;
		const all = await targets.getValue();
		const url = all[id];
		const { [id]: _done, ...rest } = all;
		await targets.setValue(rest);
		browser.notifications.clear(id).catch(() => {});
		if (url) await browser.tabs.create({ url });
	});
	browser.notifications.onClosed.addListener(async (id) => {
		if (!id.startsWith(PREFIX)) return;
		const { [id]: _done, ...rest } = await targets.getValue();
		await targets.setValue(rest);
	});
}

export function startNotifications(): void {
	listen().catch(() => {});
	browser.permissions.onAdded.addListener((granted) => {
		if (granted.permissions?.includes("notifications"))
			listen().catch(() => {});
	});
}
