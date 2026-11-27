import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
	listingWatcherFrom,
	markSeen,
	mergeCheckResults,
	removeWatcher,
	type SearchWatcher,
	searchWatcherFrom,
	toggleListingWatch,
	type Watcher,
} from "../../src/core/watchers";
import {
	browserWatchers,
	listenForWatcherWrites,
	writeWatchers,
} from "../../src/storage/watcherStore";

const site = {
	origin: "https://www.pathofexile.com",
	game: "poe1",
	realm: null,
	league: "Standard",
} as const;

const listing = (id: string) =>
	listingWatcherFrom(
		{ id: `item-${id}`, name: id, baseType: "", seller: "s", price: null },
		{ ...site, searchId: "q" },
		5,
		1,
		id,
	);

const search = (id: string): SearchWatcher => ({
	...searchWatcherFrom(
		{ id: `bm-${id}`, name: id, query: { query: {} } },
		site,
		5,
		1,
		id,
	),
	lastCheckedAt: 1,
	seenIds: ["x"],
	newIds: ["x"],
});

const checkedAt = (watchers: readonly Watcher[], at: number) =>
	watchers.map((w) => ({ ...w, lastCheckedAt: at }));

/** The background's end-of-pass merge, as runWatchers writes it. */
const passMerge = (before: Watcher[], checked: Watcher[]) =>
	writeWatchers(
		(current) => mergeCheckResults(before, checked, current).watchers,
	);

type Order = "tab first" | "pass first";
const ORDERS: Order[] = ["tab first", "pass first"];

/** Starts both writes without waiting between them, in the given order. */
async function together(
	order: Order,
	tab: () => Promise<unknown>,
	pass: () => Promise<unknown>,
) {
	const [first, second] = order === "tab first" ? [tab, pass] : [pass, tab];
	const a = first();
	const b = second();
	await Promise.all([a, b]);
}

describe("watcher writes", () => {
	beforeEach(() => {
		fakeBrowser.reset();
		listenForWatcherWrites();
	});

	it.each(ORDERS)(
		"keeps a watcher a tab adds during a pass (%s)",
		async (order) => {
			await writeWatchers(() => [listing("a")]);
			const before = await browserWatchers.load();
			await together(
				order,
				() =>
					browserWatchers.update((ws) => toggleListingWatch(ws, listing("b"))),
				() => passMerge(before, checkedAt(before, 2)),
			);
			const stored = await browserWatchers.load();
			expect(stored.map((w) => w.id)).toEqual(["a", "b"]);
			expect(stored.find((w) => w.id === "a")?.lastCheckedAt).toBe(2);
		},
	);

	it.each(ORDERS)(
		"does not bring back a watcher a tab removes during a pass (%s)",
		async (order) => {
			await writeWatchers(() => [listing("a"), listing("b")]);
			const before = await browserWatchers.load();
			await together(
				order,
				() => browserWatchers.update((ws) => removeWatcher(ws, "b")),
				() => passMerge(before, checkedAt(before, 2)),
			);
			const stored = await browserWatchers.load();
			expect(stored.map((w) => w.id)).toEqual(["a"]);
			expect(stored[0]?.lastCheckedAt).toBe(2);
		},
	);

	it.each(ORDERS)(
		"keeps a pass's results when a tab edits the same watcher (%s)",
		async (order) => {
			await writeWatchers(() => [search("s")]);
			const before = await browserWatchers.load();
			await together(
				order,
				() =>
					browserWatchers.update((ws) =>
						ws.map((w) => (w.kind === "search" ? markSeen(w) : w)),
					),
				() => passMerge(before, checkedAt(before, 2)),
			);
			const [stored] = await browserWatchers.load();
			expect(stored?.lastCheckedAt).toBe(2);
			expect(stored?.kind === "search" && stored.newIds).toEqual([]);
		},
	);

	it("adds a listing once when two tabs both saw it unwatched", async () => {
		// Two tabs each diff against an empty list, so both send an add.
		const add = (watcher: Watcher) =>
			fakeBrowser.runtime.sendMessage({
				type: "exile-ledger:watchers-write",
				ops: [{ op: "add", watcher }],
			});
		await Promise.all([add(listing("a")), add({ ...listing("a"), id: "a2" })]);
		expect((await browserWatchers.load()).map((w) => w.id)).toEqual(["a"]);
	});

	it("applies two quick toggles in one tab in order", async () => {
		const toggle = () =>
			browserWatchers.update((ws) => toggleListingWatch(ws, listing("a")));
		await Promise.all([toggle(), toggle()]);
		expect(await browserWatchers.load()).toEqual([]);
	});

	it("shows a tab's change to its own listeners before the background stores it", async () => {
		const seen: string[][] = [];
		const stop = browserWatchers.watch((ws) => seen.push(ws.map((w) => w.id)));
		let atSend: string[] | undefined;
		fakeBrowser.runtime.onMessage.addListener(() => {
			atSend ??= seen.at(-1);
			return undefined;
		});
		await browserWatchers.update(() => [listing("a")]);
		expect(atSend).toEqual(["a"]);
		stop();
	});

	it("rejects and restores the stored list when the background is not listening", async () => {
		fakeBrowser.runtime.onMessage.removeAllListeners();
		await writeWatchers(() => [listing("a")]);
		const seen: string[][] = [];
		const stop = browserWatchers.watch((ws) => seen.push(ws.map((w) => w.id)));
		await expect(
			browserWatchers.update((ws) => removeWatcher(ws, "a")),
		).rejects.toThrow();
		expect(seen.at(-1)).toEqual(["a"]);
		expect((await browserWatchers.load()).map((w) => w.id)).toEqual(["a"]);
		stop();
	});

	it("ignores a write message whose watcher does not validate", async () => {
		const reply: unknown = await fakeBrowser.runtime
			.sendMessage({
				type: "exile-ledger:watchers-write",
				ops: [
					{
						op: "add",
						watcher: { ...listing("a"), origin: "https://evil.example" },
					},
				],
			})
			.catch(() => "no reply");
		expect(reply).not.toBe(true);
		expect(await browserWatchers.load()).toEqual([]);
	});
});
