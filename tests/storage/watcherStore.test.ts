import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { importWatchers } from "../../src/core/exchange";
import {
	forgetBookmark,
	forgetBookmarks,
	listingWatcherFrom,
	markSeen,
	mergeCheckResults,
	removeWatcher,
	retargetSearchWatch,
	type SearchWatcher,
	searchWatcherFrom,
	toggleListingWatch,
	toggleSearchWatch,
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

// Taken before any test wraps it, so a wrapper never calls itself.
const realSend = fakeBrowser.runtime.sendMessage.bind(fakeBrowser.runtime);

afterEach(() => vi.restoreAllMocks());

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

	it("refuses a batch whose update does not validate, so the tab rolls back", async () => {
		await writeWatchers(() => [listing("a")]);
		const reply: unknown = await fakeBrowser.runtime.sendMessage({
			type: "exile-ledger:watchers-write",
			ops: [
				{ op: "add", watcher: listing("b") },
				{ op: "update", id: "a", patch: { intervalMin: 0 } },
			],
		});
		expect(reply).toBe(false);
		expect((await browserWatchers.load()).map((w) => w.id)).toEqual(["a"]);
	});

	it("rolls back when sending throws synchronously", async () => {
		await writeWatchers(() => [listing("a")]);
		const seen: string[][] = [];
		const stop = browserWatchers.watch((ws) => seen.push(ws.map((w) => w.id)));
		vi.spyOn(fakeBrowser.runtime, "sendMessage").mockImplementation(() => {
			throw new Error("Extension context invalidated.");
		});
		await expect(
			browserWatchers.update((ws) => toggleListingWatch(ws, listing("b"))),
		).rejects.toThrow();
		expect(seen.at(-1)).toEqual(["a"]);
		stop();
	});
});

/**
 * A pass that lands after the tab read the list and before the background
 * applies the tab's operations: the order the stale-read bugs need.
 */
describe("a pass between a tab's read and its write", () => {
	const searchOn = (id: string): SearchWatcher => ({
		...search(id),
		query: { query: { term: id } },
	});
	const seed = (): Watcher[] => [searchOn("s"), searchOn("t"), listing("a")];
	/** Each watcher checked at 2; each search found result "y" on top of "x". */
	const checkedOf = (before: Watcher[]): Watcher[] =>
		before.map((w) =>
			w.kind === "search"
				? {
						...w,
						lastCheckedAt: 2,
						newIds: [...w.newIds, "y"],
						seenIds: ["y", ...w.seenIds],
						total: 7,
					}
				: { ...w, lastCheckedAt: 2 },
		);

	/** Stores the seed, then makes the next send wait for a pass to land first. */
	async function withPassBetween(): Promise<Watcher[]> {
		await writeWatchers(seed);
		const before = await browserWatchers.load();
		const checked = checkedOf(before);
		vi.spyOn(fakeBrowser.runtime, "sendMessage").mockImplementation(
			async (message: unknown) => {
				await passMerge(before, checked);
				return realSend(message);
			},
		);
		return mergeCheckResults(before, checked, before).watchers;
	}

	const clock = { now: 5, newId: () => "imported" };
	const cases: [string, (ws: Watcher[]) => Watcher[]][] = [
		[
			"deleting a bookmark (Panel onDelete)",
			(ws) => forgetBookmark(ws, "bm-s"),
		],
		[
			"deleting a folder (Panel onDeleteFolder)",
			(ws) => forgetBookmarks(ws, new Set(["bm-s", "bm-t"])),
		],
		[
			"overwriting a bookmark (Panel onOverwrite)",
			(ws) =>
				retargetSearchWatch(ws, "bm-s", {
					query: { query: { term: "other" } },
					name: "s",
					league: "Standard",
				}),
		],
		[
			"watching a bookmark (Panel onWatch)",
			(ws) => toggleSearchWatch(ws, searchOn("u")),
		],
		[
			"unwatching a bookmark (Panel onWatch)",
			(ws) => toggleSearchWatch(ws, { ...searchOn("s"), id: "other" }),
		],
		["removing a watcher (Panel onRemove)", (ws) => removeWatcher(ws, "a")],
		[
			"watching a result (trade page Watch button)",
			(ws) => toggleListingWatch(ws, listing("b")),
		],
		[
			"restoring watchers from a backup (settings page)",
			(ws) => importWatchers(ws, [listing("c")], clock).watchers,
		],
	];

	it.each(cases)(
		"ends as if the tab had read after the pass: %s",
		async (_name, change) => {
			const afterPass = await withPassBetween();
			await browserWatchers.update(change);
			expect(await browserWatchers.load()).toEqual(change(afterPass));
		},
	);

	it("keeps results the pass found when the tab opens the search (Panel onOpenSearch)", async () => {
		await withPassBetween();
		await browserWatchers.update((ws) =>
			ws.map((w) => (w.id === "s" && w.kind === "search" ? markSeen(w) : w)),
		);
		const stored = await browserWatchers.load();
		const s = stored.find((w) => w.id === "s");
		expect(s?.kind === "search" && s.newIds).toEqual(["y"]);
		expect(s?.lastCheckedAt).toBe(2);
	});

	it("drops the old search's results on an overwrite even when the tab's copy had none", async () => {
		await writeWatchers(() => [
			{ ...searchOn("s"), newIds: [], seenIds: [], total: null },
		]);
		const before = await browserWatchers.load();
		const checked = checkedOf(before);
		vi.spyOn(fakeBrowser.runtime, "sendMessage").mockImplementation(
			async (message: unknown) => {
				await passMerge(before, checked);
				return realSend(message);
			},
		);
		await browserWatchers.update((ws) =>
			retargetSearchWatch(ws, "bm-s", {
				query: { query: { term: "other" } },
				name: "s",
				league: "Standard",
			}),
		);
		const [stored] = await browserWatchers.load();
		expect(stored).toMatchObject({
			lastCheckedAt: null,
			newIds: [],
			seenIds: [],
			total: null,
			query: { query: { term: "other" } },
		});
	});
});
