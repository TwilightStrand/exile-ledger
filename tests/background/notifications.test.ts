import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
	listen,
	MAX_NOTICES_PER_PASS,
	notify,
} from "../../src/background/notifications";
import type { WatcherEvent } from "../../src/core/watcherRun";
import { listingWatcherFrom } from "../../src/core/watchers";
import { browserSettings } from "../../src/storage/settingsStore";

const gone = (id: string): WatcherEvent => ({
	kind: "gone",
	watcher: listingWatcherFrom(
		{ id: `item-${id}`, name: id, baseType: "", seller: "s", price: null },
		{
			origin: "https://www.pathofexile.com",
			game: "poe1",
			realm: null,
			league: "Standard",
			searchId: "q",
		},
		5,
		1,
		id,
	),
});

const shown = () =>
	Object.values(fakeBrowser.notifications.getAllCreateOptions());

beforeEach(async () => {
	fakeBrowser.reset();
	vi.spyOn(browser.permissions, "contains").mockImplementation(
		async () => true,
	);
	await browserSettings.save({ notifications: true, language: "en" });
});
afterEach(() => vi.restoreAllMocks());

describe("notify", () => {
	it("shows one per event up to the cap, then one summary", async () => {
		const events = Array.from({ length: MAX_NOTICES_PER_PASS + 3 }, (_, i) =>
			gone(`w${i}`),
		);
		await notify(events);
		const titles = shown().map((n) => n.title);
		expect(MAX_NOTICES_PER_PASS).toBe(5);
		expect(titles).toHaveLength(MAX_NOTICES_PER_PASS + 1);
		expect(titles.at(-1)).toBe("3 more watcher updates");
	});

	it("shows no summary when the events fit", async () => {
		await notify([gone("a"), gone("b")]);
		expect(shown()).toHaveLength(2);
	});
});

describe("clicks", () => {
	const clickFirst = async () => {
		const [id] = Object.keys(fakeBrowser.notifications.getAllCreateOptions());
		if (!id) throw new Error("no notification shown");
		await fakeBrowser.notifications.onClicked.trigger(id);
	};

	it("opens the watcher's search, in a new window when no window is open", async () => {
		listen();
		vi.spyOn(browser.tabs, "create").mockRejectedValue(
			new Error("No current window"),
		);
		const windows = vi
			.spyOn(browser.windows, "create")
			.mockImplementation(async () => ({
				id: 1,
				focused: true,
				incognito: false,
				alwaysOnTop: false,
			}));
		await notify([gone("a")]);
		await clickFirst();
		await vi.waitFor(() => expect(windows).toHaveBeenCalledTimes(1));
		expect(windows.mock.calls[0]?.[0]?.url).toContain(
			"https://www.pathofexile.com/trade/search/Standard/q",
		);
	});

	it("binds the click handler again after the API lost its listeners", async () => {
		listen();
		// What a revoke and grant leaves behind: an API without our listeners.
		fakeBrowser.notifications.onClicked.removeAllListeners();
		fakeBrowser.notifications.onClosed.removeAllListeners();
		listen();
		const tabs = vi
			.spyOn(browser.tabs, "create")
			.mockImplementation(async (props) => ({
				index: 0,
				pinned: false,
				highlighted: false,
				windowId: 1,
				active: true,
				incognito: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
				groupId: -1,
				frozen: false,
				url: props.url,
			}));
		await notify([gone("a")]);
		await clickFirst();
		await vi.waitFor(() => expect(tabs).toHaveBeenCalledTimes(1));
	});
});
