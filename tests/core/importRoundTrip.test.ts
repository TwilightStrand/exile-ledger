import { describe, expect, it } from "vitest";
import {
	createBackup,
	decodeShare,
	encodeShare,
	importPayload,
	parseBackup,
} from "../../src/core/exchange";
import {
	type Clock,
	emptyLibrary,
	overwriteBookmark,
	renameBookmark,
	saveSearch,
} from "../../src/core/library";
import type { Library } from "../../src/core/model";
import { placeBookmark } from "../../src/core/placement";
import { queryFits, type TradeQuery } from "../../src/core/query";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import type { Game } from "../../src/core/tradeUrl";
import {
	changeFolderLeague,
	createFolder,
	renameFolder,
	setFolderIcon,
	subtreeIds,
} from "../../src/core/tree";

/** Small seeded generator, so a failing seed can be replayed. */
function random(seed: number) {
	let state = seed;
	const next = () => {
		state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
		return state / 2 ** 31;
	};
	return {
		int: (max: number) => Math.floor(next() * max),
		pick: <T>(items: readonly T[]): T => {
			const item = items[Math.floor(next() * items.length)];
			if (item === undefined) throw new Error("empty");
			return item;
		},
	};
}

/** A timeless jewel "count" search: the kind of query that grows longest in real use. */
function bigQuery(filters: number): TradeQuery {
	return {
		query: {
			status: { option: "online" },
			stats: [
				{
					type: "count",
					value: { min: 1 },
					filters: Array.from({ length: filters }, (_, i) => ({
						id: "explicit.pseudo_timeless_jewel_elegant_hubris",
						value: { min: 100 + i * 20, max: 100 + i * 20 },
						disabled: false,
					})),
				},
			],
		},
		sort: { price: "asc" },
	};
}

const NAMES = [
	"Rings",
	"  Körper ⚔ 😀 ",
	"x".repeat(250),
	`${"名".repeat(199)}😀`,
	"Maps / T17",
];
const LEAGUES = ["Standard", "Settlers", "l".repeat(140), "Хардкор"];

/** A library built only through the app's own editing functions. */
function ownLibrary(seed: number): Library {
	const r = random(seed);
	let n = 0;
	const clock: Clock = { now: 1000, newId: () => `s${seed}-${++n}` };
	let lib = emptyLibrary();
	const folders: { id: string; game: Game }[] = [];
	for (let i = 0; i < 6; i++) {
		const game: Game = r.pick(["poe1", "poe2"]);
		const sameGame = folders.filter((f) => f.game === game);
		const parentId =
			sameGame.length > 0 && r.int(3) > 0 ? r.pick(sameGame).id : null;
		const created = createFolder(
			lib,
			{ name: r.pick(NAMES), game, parentId },
			clock,
		);
		if (!created.ok) continue;
		lib = created.library;
		folders.push({ id: created.folder.id, game });
	}
	for (let i = 0; i < 8; i++) {
		const game: Game = r.pick(["poe1", "poe2"]);
		const saved = saveSearch(
			lib,
			{
				game,
				league: r.pick(LEAGUES),
				name: r.pick(NAMES),
				query: r.int(3) === 0 ? bigQuery(150) : { query: { term: `t${i}` } },
				searchId: r.int(2) === 0 ? `Ab${i}cD` : null,
				live: r.int(2) === 0,
			},
			clock,
			r.pick(NAMES),
		);
		lib = saved.library;
		const homes = folders.filter((f) => f.game === game);
		if (homes.length > 0 && r.int(2) === 0) {
			const placed = placeBookmark(
				lib,
				saved.bookmark.id,
				r.pick(homes).id,
				0,
				1001,
			);
			if (placed.ok) lib = placed.library;
		}
		if (r.int(2) === 0)
			lib = renameBookmark(lib, saved.bookmark.id, r.pick(NAMES), 1002);
		if (r.int(3) === 0)
			lib = overwriteBookmark(
				lib,
				saved.bookmark.id,
				{
					query: bigQuery(140),
					searchId: null,
					league: r.pick(LEAGUES),
					live: false,
				},
				1003,
			);
	}
	for (const f of folders) {
		if (r.int(2) === 0) lib = renameFolder(lib, f.id, r.pick(NAMES), 1004);
		if (r.int(3) === 0)
			lib = changeFolderLeague(lib, f.id, r.pick(LEAGUES), 1005).library;
		if (r.int(3) === 0) lib = setFolderIcon(lib, f.id, "ring", 1006);
	}
	return lib;
}

const restoreClock = (): Clock => {
	let n = 0;
	return { now: 2000, newId: () => `r${++n}` };
};

describe("the app's own data survives a backup and a share", () => {
	it("a 150-filter query is under the cap", () => {
		expect(JSON.stringify(bigQuery(150)).length).toBeGreaterThan(15_000);
		expect(queryFits(bigQuery(150))).toBe(true);
	});

	it.each(Array.from({ length: 25 }, (_, seed) => seed + 1))(
		"restores every record of library %i from a backup",
		(seed) => {
			const lib = ownLibrary(seed);
			const parsed = parseBackup(
				JSON.stringify(createBackup(lib, DEFAULT_SETTINGS, 1)),
			);
			if (!parsed.ok) throw new Error(parsed.error);
			const result = importPayload(
				emptyLibrary(),
				parsed.value.library,
				restoreClock(),
			);
			expect(result.skipped).toBe(0);
			expect(result.folders).toBe(lib.folders.length);
			expect(result.bookmarks).toBe(lib.bookmarks.length);
			// The tree keeps its shape: every folder sits at the same depth.
			const depths = (l: Library) => {
				const byId = new Map(l.folders.map((f) => [f.id, f]));
				const depth = (id: string | null): number => {
					const f = id === null ? undefined : byId.get(id);
					return f ? 1 + depth(f.parentId) : 0;
				};
				return l.folders.map((f) => depth(f.id)).sort();
			};
			expect(depths(result.library)).toEqual(depths(lib));
		},
	);

	it.each(Array.from({ length: 25 }, (_, seed) => seed + 1))(
		"shares every folder of library %i whole",
		(seed) => {
			const lib = ownLibrary(seed);
			for (const folder of lib.folders) {
				const decoded = decodeShare(encodeShare(lib, folder.id) ?? "");
				if (!decoded.ok) throw new Error(decoded.error);
				expect(decoded.value.skipped).toBe(0);
				const result = importPayload(
					emptyLibrary(),
					decoded.value,
					restoreClock(),
				);
				expect(result.skipped).toBe(0);
				const ids = subtreeIds(lib.folders, folder.id);
				expect(result.folders).toBe(ids.size);
				expect(result.bookmarks).toBe(
					lib.bookmarks.filter((b) => ids.has(b.folderId)).length,
				);
			}
		},
	);
});

describe("data saved before the query cap", () => {
	const oversize = bigQuery(400);
	const bookmark = (id: string, extra: object) => ({
		id,
		folderId: "saved",
		name: id,
		game: "poe1",
		league: "Settlers",
		query: oversize,
		live: false,
		order: 0,
		createdAt: 1,
		updatedAt: 1,
		...extra,
	});
	/** A backup file as v0.1.0 wrote it: that version saved queries of any size. */
	const v010Backup = {
		format: "exile-ledger-backup",
		version: 1,
		exportedAt: 1_760_000_000_000,
		library: {
			folders: [
				{
					id: "saved",
					parentId: null,
					name: "Saved searches",
					game: "poe1",
					order: 0,
					archived: false,
					role: "saved-searches",
					updatedAt: 1,
				},
			],
			bookmarks: [
				bookmark("small", { query: { query: { term: "ring" } } }),
				bookmark("with-id", { searchId: "Ab12cD", live: true }),
				bookmark("without-id", {}),
			],
		},
		settings: {},
		watchers: [],
	};

	it("is over the cap, which the save path would refuse today", () => {
		expect(queryFits(oversize)).toBe(false);
	});

	it("keeps an over-cap bookmark that has a search id, without its query", () => {
		const parsed = parseBackup(JSON.stringify(v010Backup));
		if (!parsed.ok) throw new Error(parsed.error);
		const result = importPayload(
			emptyLibrary(),
			parsed.value.library,
			restoreClock(),
		);
		expect(result.library.bookmarks.map((b) => b.name)).toEqual([
			"small",
			"with-id",
		]);
		const withId = result.library.bookmarks[1];
		expect(withId).not.toHaveProperty("query");
		expect(withId).toMatchObject({ searchId: "Ab12cD", live: true });
		// Only the bookmark left with nothing to open is skipped, and counted.
		expect(result.skipped).toBe(1);
	});

	it("restores a library seeded with an over-cap bookmark, as v0.1.0 stored it", () => {
		const own = ownLibrary(7);
		const folder = own.folders[0];
		if (!folder) throw new Error("no folder");
		const seeded: Library = {
			...own,
			bookmarks: [
				...own.bookmarks,
				{
					id: "old",
					folderId: folder.id,
					name: "From v0.1.0",
					game: folder.game,
					league: "Settlers",
					query: oversize,
					searchId: "Old1",
					live: false,
					order: 99,
					createdAt: 1,
					updatedAt: 1,
				},
			],
		};
		const parsed = parseBackup(
			JSON.stringify(createBackup(seeded, DEFAULT_SETTINGS, 1)),
		);
		if (!parsed.ok) throw new Error(parsed.error);
		const result = importPayload(
			emptyLibrary(),
			parsed.value.library,
			restoreClock(),
		);
		expect(result.skipped).toBe(0);
		expect(result.bookmarks).toBe(seeded.bookmarks.length);
		const old = result.library.bookmarks.find((b) => b.name === "From v0.1.0");
		expect(old?.searchId).toBe("Old1");
		expect(old?.query).toBeUndefined();

		const decoded = decodeShare(encodeShare(seeded, folder.id) ?? "");
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.skipped).toBe(0);
		expect(decoded.value.bookmarks.some((b) => b.name === "From v0.1.0")).toBe(
			true,
		);
	});
});
