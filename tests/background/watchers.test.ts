import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TRADE_ACCESS_KEY } from "../../src/core/messages";
import { listingWatcherFrom } from "../../src/core/watchers";

const listingOn = (origin: string, id: string) =>
	listingWatcherFrom(
		{ id: `item-${id}`, name: id, baseType: "", seller: "s", price: null },
		{ origin, game: "poe1", realm: null, league: "Standard", searchId: "q" },
		5,
		1,
		id,
	);

const WWW = "https://www.pathofexile.com";
const TW = "https://pathofexile.tw";

/** fetch's `init.signal`, narrowed from fetch's loose parameter types. */
function signalOf(init: unknown): AbortSignal | undefined {
	if (typeof init !== "object" || init === null || !("signal" in init))
		return undefined;
	return init.signal instanceof AbortSignal ? init.signal : undefined;
}

const urlOf = (input: unknown) =>
	typeof input === "string"
		? input
		: input instanceof URL
			? input.href
			: input instanceof Request
				? input.url
				: "";

beforeEach(() => {
	fakeBrowser.reset();
	vi.resetModules();
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("trade requests", () => {
	it("gives up on a request that hangs and reports a network failure", async () => {
		const controller = new AbortController();
		const timeout = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValue(controller.signal);
		vi.stubGlobal(
			"fetch",
			(_input: unknown, init: unknown) =>
				new Promise((_resolve, reject) => {
					signalOf(init)?.addEventListener("abort", () =>
						reject(new DOMException("timed out", "TimeoutError")),
					);
				}),
		);
		const { tradeRequest, REQUEST_TIMEOUT_MS } = await import(
			"../../src/background/tradeQueue"
		);
		const pending = tradeRequest(
			"search",
			`${WWW}/api/trade/search/Standard`,
			{},
			20_000,
		);
		await vi.waitFor(() => expect(timeout).toHaveBeenCalled());
		expect(REQUEST_TIMEOUT_MS).toBe(10_000);
		expect(timeout).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
		controller.abort();
		expect(await pending).toEqual({ ok: false, status: 0, reason: "network" });
	});
});

describe("watcher passes", () => {
	it("runs watchers on granted sites and keeps the others waiting", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async (request) =>
				(request.origins ?? []).every((o) => o.startsWith(`${WWW}/`)),
		);
		const fetched: string[] = [];
		vi.stubGlobal("fetch", async (input: unknown) => {
			fetched.push(urlOf(input));
			return new Response(JSON.stringify({ result: [] }));
		});
		const { writeWatchers, browserWatchers } = await import(
			"../../src/storage/watcherStore"
		);
		const { runWatchers, startWatchers } = await import(
			"../../src/background/watchers"
		);
		await writeWatchers(() => [listingOn(WWW, "a"), listingOn(TW, "b")]);
		// The fake browser has no permission events.
		vi.spyOn(browser.permissions.onAdded, "addListener").mockImplementation(
			() => {},
		);
		vi.spyOn(browser.permissions.onRemoved, "addListener").mockImplementation(
			() => {},
		);
		startWatchers(() => {});
		await runWatchers(() => {});

		expect(fetched.length).toBe(1);
		expect(fetched[0]?.startsWith(`${WWW}/api/trade/fetch/`)).toBe(true);
		const stored = await browserWatchers.load();
		expect(stored.find((w) => w.id === "a")?.lastCheckedAt).not.toBeNull();
		expect(stored.find((w) => w.id === "b")?.lastCheckedAt).toBeNull();
		await vi.waitFor(async () =>
			expect(
				(await browser.storage.local.get(TRADE_ACCESS_KEY))[TRADE_ACCESS_KEY],
			).toBe(false),
		);
	});

	it("starts a pass when the browser grants one trade host on its own", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => true,
		);
		const fetched: string[] = [];
		vi.stubGlobal("fetch", async (input: unknown) => {
			fetched.push(urlOf(input));
			return new Response(JSON.stringify({ result: [] }));
		});
		const added: ((granted: { origins?: string[] }) => void)[] = [];
		vi.spyOn(browser.permissions.onAdded, "addListener").mockImplementation(
			(listener) => {
				added.push(listener);
			},
		);
		vi.spyOn(browser.permissions.onRemoved, "addListener").mockImplementation(
			() => {},
		);
		const { writeWatchers } = await import("../../src/storage/watcherStore");
		const { startWatchers } = await import("../../src/background/watchers");
		await writeWatchers(() => [listingOn(WWW, "a")]);
		startWatchers(() => {});
		for (const listener of added)
			listener({ origins: ["https://www.pathofexile.com/*"] });
		await vi.waitFor(() => expect(fetched.length).toBe(1));
	});

	it("does not set an alarm when no watcher's site is granted", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => false,
		);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const { writeWatchers } = await import("../../src/storage/watcherStore");
		const { runWatchers, WATCHER_ALARM } = await import(
			"../../src/background/watchers"
		);
		await writeWatchers(() => [listingOn(TW, "b")]);
		await runWatchers(() => {});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(await browser.alarms.get(WATCHER_ALARM)).toBeUndefined();
	});
});
