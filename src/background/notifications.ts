import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";
import { messagesFor, resolveLocale } from "../core/i18n";
import { noticeFor } from "../core/watcherNotices";
import type { WatcherEvent } from "../core/watcherRun";
import { browserSettings } from "../storage/settingsStore";

const PREFIX = "exile-ledger:";

/**
 * Most notifications one pass shows. Past this the rest are folded into one
 * summary: a pass after a long sleep can find dozens of changes, and a stack
 * of notifications is noise the user dismisses unread.
 */
export const MAX_NOTICES_PER_PASS = 5;

/**
 * Where each shown notification leads. Session storage, because the browser
 * may stop the background between showing a notification and its click.
 */
const targets = storage.defineItem<Record<string, string>>(
	"session:noticeTargets",
	{ fallback: {} },
);

let queue: Promise<unknown> = Promise.resolve();

/**
 * Changes the stored targets one at a time: a click that read them while a
 * pass was writing them would find no URL, or its removal would be undone.
 */
function changeTargets<T>(
	change: (all: Record<string, string>) => {
		next: Record<string, string>;
		result: T;
	},
): Promise<T> {
	const run = queue.then(async () => {
		const { next, result } = change(await targets.getValue());
		await targets.setValue(next);
		return result;
	});
	queue = run.catch(() => {});
	return run;
}

const hasPermission = () =>
	browser.permissions.contains({ permissions: ["notifications"] });

async function show(
	id: string,
	notice: { title: string; message: string },
): Promise<boolean> {
	try {
		await browser.notifications.create(id, {
			type: "basic",
			iconUrl: browser.runtime.getURL("/icon/128.png"),
			title: notice.title,
			message: notice.message,
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Shows one notification per event, at most MAX_NOTICES_PER_PASS and then a
 * summary, when the user turned them on and allowed them.
 */
export async function notify(events: readonly WatcherEvent[]): Promise<void> {
	if (events.length === 0) return;
	const prefs = await browserSettings.load();
	if (!prefs.notifications) return;
	const t = messagesFor(resolveLocale(prefs.language, navigator.languages));
	if (!(await hasPermission())) return;
	const stamp = Date.now();
	const shown = events.slice(0, MAX_NOTICES_PER_PASS);
	for (const event of shown) {
		const notice = noticeFor(event, t);
		const id = `${PREFIX}${event.watcher.id}:${stamp}`;
		// Stored before it is shown, so even an instant click finds where to go.
		await changeTargets((all) => ({
			next: { ...all, [id]: notice.url },
			result: undefined,
		}));
		// One failed notification should not hide the others.
		if (!(await show(id, notice)))
			await changeTargets(({ [id]: _failed, ...rest }) => ({
				next: rest,
				result: undefined,
			}));
	}
	const more = events.length - shown.length;
	if (more > 0)
		await show(`${PREFIX}more:${stamp}`, {
			title: t.notices.moreTitle(more),
			message: t.notices.moreBody,
		});
}

/** A notification's URL, removed from the stored targets as it is read. */
function takeTarget(id: string): Promise<string | undefined> {
	return changeTargets(({ [id]: url, ...rest }) => ({
		next: rest,
		result: url,
	}));
}

/** Opens a URL in a new tab, or a new window when none is open (Firefox on macOS keeps running without one). */
async function openUrl(url: string): Promise<void> {
	try {
		await browser.tabs.create({ url });
	} catch {
		await browser.windows.create({ url });
	}
}

async function onClicked(id: string): Promise<void> {
	if (!id.startsWith(PREFIX)) return;
	const url = await takeTarget(id);
	browser.notifications.clear(id).catch(() => {});
	if (url) await openUrl(url);
}

async function onClosed(id: string): Promise<void> {
	if (!id.startsWith(PREFIX)) return;
	await takeTarget(id);
}

const clickListener = (id: string) => {
	onClicked(id).catch(() => {});
};
const closeListener = (id: string) => {
	onClosed(id).catch(() => {});
};

/**
 * Adds the click handlers. Called synchronously at startup: a click usually
 * comes after the browser has stopped the idle background, and the click
 * that restarts it is only delivered to listeners added in the first turn.
 * Without the permission Chrome has no notifications API at all, so a grant
 * later in the session adds them then. Chrome removes the API on a revoke and
 * puts a fresh one in place on the next grant, so after a revoke and grant in
 * one worker life a "listening" flag would leave the listeners on the old
 * object. Asking the current object whether it has them binds again only
 * when needed.
 */
export function listen(): void {
	const api = browser.notifications;
	if (!api) return;
	if (!api.onClicked.hasListener(clickListener))
		api.onClicked.addListener(clickListener);
	if (!api.onClosed.hasListener(closeListener))
		api.onClosed.addListener(closeListener);
}

export function startNotifications(): void {
	listen();
	browser.permissions.onAdded.addListener((granted) => {
		if (granted.permissions?.includes("notifications")) listen();
	});
}
