import { describe, expect, it } from "vitest";
import {
	createBackup,
	cutTo,
	decodeShare,
	IMPORT_LIMITS,
	importPayload,
	parseBackup,
	SHARE_PREFIX,
} from "../../src/core/exchange";
import { decodeImport } from "../../src/core/importers";
import { emptyLibrary } from "../../src/core/library";
import {
	QUERY_MAX_BYTES,
	queryFits,
	type TradeQuery,
} from "../../src/core/query";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import searchRequest from "../fixtures/trade/poe1-search-request.json";

const share = (data: unknown) =>
	`${SHARE_PREFIX}${Buffer.from(JSON.stringify(data), "utf8").toString("base64url")}`;
const tftCode = (data: unknown) =>
	Buffer.from(JSON.stringify(data), "utf8").toString("base64");

const folder = (extra: object = {}) => ({
	id: "f",
	parentId: null,
	name: "F",
	game: "poe1",
	order: 0,
	archived: false,
	updatedAt: 1,
	...extra,
});
const bookmark = (extra: object = {}) => ({
	id: "b",
	folderId: "f",
	name: "B",
	game: "poe1",
	league: "Standard",
	searchId: "abc123",
	live: false,
	order: 0,
	createdAt: 1,
	updatedAt: 1,
	...extra,
});

const clock = () => {
	let n = 0;
	return { now: 50, newId: () => `new${++n}` };
};

/** A query with many weighted stat filters, larger than any seen in real use. */
function heavyQuery(filters: number): TradeQuery {
	return {
		query: {
			status: { option: "online" },
			stats: Array.from({ length: 4 }, (_, g) => ({
				type: g === 0 ? "and" : "weight",
				filters: Array.from({ length: filters / 4 }, (_, i) => ({
					id: `explicit.stat_${3_299_347_043 + g * 1000 + i}`,
					value: { min: 10 + i, max: 200 + i, weight: 1.5 },
					disabled: false,
				})),
			})),
		},
		sort: { price: "asc" },
	};
}

describe("imported records keep only known fields", () => {
	it("drops a hidden field so a share string cannot bloat the synced library", () => {
		const hidden = "x".repeat(150_000);
		const decoded = decodeImport(
			share({
				folders: [folder({ hidden })],
				bookmarks: [bookmark({ notes: hidden })],
			}),
			1,
		);
		if (!decoded.ok) throw new Error(decoded.error);
		const { library } = importPayload(
			emptyLibrary(),
			decoded.value.payload,
			clock(),
		);
		expect(library.bookmarks).toHaveLength(1);
		expect(library.bookmarks[0]).not.toHaveProperty("notes");
		expect(library.folders[0]).not.toHaveProperty("hidden");
		expect(JSON.stringify(library).length).toBeLessThan(1000);
	});

	it("rebuilds records handed straight to importPayload, as an importer would", () => {
		const { library } = importPayload(
			emptyLibrary(),
			{
				folders: [{ ...folder(), game: "poe1", extra: "y".repeat(10_000) }],
				bookmarks: [{ ...bookmark(), game: "poe1", extra: "y".repeat(10_000) }],
			},
			clock(),
		);
		expect(Object.keys(library.folders[0] ?? {})).not.toContain("extra");
		expect(Object.keys(library.bookmarks[0] ?? {})).not.toContain("extra");
	});

	it("keeps every known field, the query's own extra filters included", () => {
		const query = { ...searchRequest, futureKey: { kept: true } };
		const decoded = decodeShare(
			share({
				folders: [folder({ icon: "ring" })],
				bookmarks: [bookmark({ query, tradeType: "search", done: true })],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		const { library } = importPayload(emptyLibrary(), decoded.value, clock());
		expect(library.folders[0]?.icon).toBe("ring");
		expect(library.bookmarks[0]).toMatchObject({
			name: "B",
			league: "Standard",
			searchId: "abc123",
			tradeType: "search",
			done: true,
			query,
		});
	});
});

describe("import size limits", () => {
	it("still imports a query with 150 stat filters", () => {
		const query = heavyQuery(152);
		expect(JSON.stringify(query).length).toBeGreaterThan(10_000);
		expect(queryFits(query)).toBe(true);
		const decoded = decodeShare(
			share({ folders: [folder()], bookmarks: [bookmark({ query })] }),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.bookmarks).toHaveLength(1);
		expect(decoded.value.skipped).toBe(0);
	});

	it.each([
		["ASCII", "t".repeat(QUERY_MAX_BYTES)],
		// Under the cap in UTF-16 units but over it in UTF-8 bytes.
		["multibyte", "가".repeat(QUERY_MAX_BYTES / 2)],
	])(
		"keeps a bookmark whose %s query is over the byte cap, without the query",
		(_name, term) => {
			const query = { query: { term } };
			expect(JSON.stringify(query).length).toBeLessThan(QUERY_MAX_BYTES * 1.1);
			const decoded = decodeShare(
				share({
					folders: [folder()],
					bookmarks: [
						bookmark({ id: "withId", query, live: true }),
						bookmark({ id: "noId", query, searchId: undefined }),
					],
				}),
			);
			if (!decoded.ok) throw new Error(decoded.error);
			expect(decoded.value.bookmarks.map((b) => b.id)).toEqual(["withId"]);
			expect(decoded.value.bookmarks[0]).not.toHaveProperty("query");
			expect(decoded.value.bookmarks[0]).toMatchObject({
				searchId: "abc123",
				live: true,
			});
			expect(decoded.value.skipped).toBe(1);
			expect(decoded.value.queriesDropped).toBe(1);
			const result = importPayload(emptyLibrary(), decoded.value, clock());
			expect(result.bookmarks).toBe(1);
			expect(result.skipped).toBe(1);
			// Counted once, though importPayload cleans the payload a second time.
			expect(result.queriesDropped).toBe(1);
		},
	);

	it("cuts a long name and league instead of dropping the bookmark", () => {
		const decoded = decodeShare(
			share({
				folders: [folder()],
				bookmarks: [
					bookmark({
						name: "n".repeat(IMPORT_LIMITS.name + 50),
						league: "l".repeat(IMPORT_LIMITS.league + 50),
					}),
				],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.skipped).toBe(0);
		expect(decoded.value.bookmarks[0]?.name).toHaveLength(IMPORT_LIMITS.name);
		expect(decoded.value.bookmarks[0]?.league).toHaveLength(
			IMPORT_LIMITS.league,
		);
	});

	it.each([
		["a surrogate pair", "😀"],
		["an emoji with a variation selector", "⚔️"],
		["a family joined with ZWJ", "👨‍👩‍👧‍👦"],
		["a skin tone", "👍🏽"],
		["a flag", "🇩🇰"],
		["a combining accent", "e\u0301"],
	])("keeps %s whole or leaves it out when cutting", (_name, cluster) => {
		const head = "a".repeat(9);
		expect(cutTo(`${head}${cluster}tail`, 9 + cluster.length)).toBe(
			`${head}${cluster}`,
		);
		expect(cutTo(`${head}${cluster}tail`, 9 + cluster.length - 1)).toBe(head);
	});

	it("cuts at a code point when one cluster is longer than the limit", () => {
		expect(cutTo("👨‍👩‍👧‍👦", 3)).toBe("👨\u200d");
	});

	it("drops an over-long search id and its live flag but keeps a bookmark with a query", () => {
		const searchId = "s".repeat(IMPORT_LIMITS.searchId + 1);
		const decoded = decodeShare(
			share({
				folders: [folder()],
				bookmarks: [
					bookmark({ id: "q", searchId, live: true, query: { query: {} } }),
					bookmark({ id: "bare", searchId }),
				],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.bookmarks.map((b) => b.id)).toEqual(["q"]);
		expect(decoded.value.bookmarks[0]).not.toHaveProperty("searchId");
		expect(decoded.value.bookmarks[0]?.live).toBe(false);
		expect(decoded.value.skipped).toBe(1);
	});

	it("keeps a folder with a long name, its bookmarks and its subfolders", () => {
		const decoded = decodeShare(
			share({
				folders: [
					folder({ name: "n".repeat(IMPORT_LIMITS.name + 1) }),
					folder({ id: "child", parentId: "f", name: "Child" }),
				],
				bookmarks: [bookmark(), bookmark({ id: "c", folderId: "child" })],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.skipped).toBe(0);
		const { library } = importPayload(emptyLibrary(), decoded.value, clock());
		const top = library.folders.find((f) => f.parentId === null);
		expect(top?.name).toHaveLength(IMPORT_LIMITS.name);
		expect(library.folders.find((f) => f.name === "Child")?.parentId).toBe(
			top?.id,
		);
		expect(library.bookmarks).toHaveLength(2);
	});

	it("keeps the game suffix on a TFT stray folder with a long name", () => {
		const decoded = decodeImport(
			tftCode({
				folders: [
					{
						id: "a",
						name: "n".repeat(IMPORT_LIMITS.name),
						bookmarks: [
							{ name: "x", endpoint: "AAA1" },
							{ name: "y", endpoint: "AAA2" },
							{ name: "z", endpoint: "BBB2", poeVersion: "Poe2" },
						],
					},
				],
			}),
			1,
		);
		if (!decoded.ok) throw new Error(decoded.error);
		const stray = decoded.value.payload.folders.find((f) => f.game === "poe2");
		expect(stray?.name.endsWith(" (PoE2)")).toBe(true);
		expect(stray?.name).toHaveLength(IMPORT_LIMITS.name);
	});
});

describe("one bad record does not reject the rest", () => {
	it("restores a backup with a record from a newer game, skipping only that one", () => {
		const backup = {
			...createBackup(emptyLibrary(), DEFAULT_SETTINGS, 1),
			library: {
				folders: [folder(), { id: "broken" }],
				bookmarks: [bookmark(), bookmark({ id: "c", game: "poe3" })],
			},
		};
		const parsed = parseBackup(JSON.stringify(backup));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value.library.folders.map((f) => f.id)).toEqual(["f"]);
		expect(parsed.value.library.bookmarks.map((b) => b.id)).toEqual(["b"]);
		expect(parsed.value.library.skipped).toBe(2);
	});

	it("reads a share string around an invalid bookmark", () => {
		const decoded = decodeShare(
			share({
				folders: [folder()],
				bookmarks: [bookmark(), bookmark({ id: "c", live: "yes" })],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.bookmarks.map((b) => b.id)).toEqual(["b"]);
		expect(decoded.value.skipped).toBe(1);
	});

	it("calls a share string damaged when none of its folders can be read", () => {
		expect(decodeShare(share({ folders: [{ id: 1 }], bookmarks: [] }))).toEqual(
			{ ok: false, error: "share-damaged" },
		);
	});

	it("still rejects a file that is not a backup at all", () => {
		expect(parseBackup(JSON.stringify({ format: "other" }))).toEqual({
			ok: false,
			error: "not-backup",
		});
	});
});

describe("malformed input never throws", () => {
	/** A chain of `levels` legacy folders, each holding the next. */
	// Built as text: Node 24's JSON.stringify overflows the stack at this depth,
	// which would fail the test before the importer ever sees the input.
	const nestedLegacy = (levels: number) => {
		const open =
			'{"name":"x","searches":[{"name":"s","url":"AAA1"}],"subFolders":[';
		const json = `{"searches":[${open.repeat(levels)}${"]}".repeat(levels)}]}`;
		return Buffer.from(json, "utf8").toString("base64");
	};

	it("refuses a TFT legacy code nested 20,000 levels deep with a message", () => {
		expect(() => decodeImport(nestedLegacy(20_000), 1)).not.toThrow();
		expect(decodeImport(nestedLegacy(20_000), 1)).toEqual({
			ok: false,
			error: "unknown-format",
		});
	});

	it("reads exactly 64 levels of TFT legacy folders and refuses 65", () => {
		const at64 = decodeImport(nestedLegacy(64), 1);
		if (!at64.ok) throw new Error(at64.error);
		expect(at64.value.payload.folders).toHaveLength(64);
		expect(decodeImport(nestedLegacy(65), 1)).toEqual({
			ok: false,
			error: "unknown-format",
		});
	});

	it("reports a deeply nested query in a share string instead of throwing", () => {
		const text = `${SHARE_PREFIX}${Buffer.from(
			`{"folders":[${JSON.stringify(folder())}],"bookmarks":[{"id":"b","folderId":"f","name":"B","game":"poe1","league":"","live":false,"order":0,"createdAt":1,"updatedAt":1,"query":{"query":{"filters":{"x":${'{"a":'.repeat(20_000)}1${"}".repeat(20_000)}}}}}]}`,
			"utf8",
		).toString("base64url")}`;
		expect(() => decodeImport(text, 1)).not.toThrow();
		const decoded = decodeImport(text, 1);
		if (decoded.ok) {
			expect(decoded.value.payload.bookmarks).toHaveLength(0);
			expect(decoded.value.payload.skipped).toBe(1);
		}
	});

	it("parseBackup returns the error result for deeply nested JSON", () => {
		const text = `{"format":"exile-ledger-backup","version":1,"exportedAt":1,"library":{"folders":[],"bookmarks":[]},"watchers":[${"[".repeat(20_000)}${"]".repeat(20_000)}]}`;
		expect(() => parseBackup(text)).not.toThrow();
	});
});

describe("TFT folders that share an id", () => {
	it("imports both folders with their own bookmarks", () => {
		const decoded = decodeImport(
			tftCode({
				folders: [
					{
						id: "a",
						name: "One",
						bookmarks: [{ name: "x", endpoint: "AAA1" }],
					},
					{
						id: "a",
						name: "Two",
						bookmarks: [{ name: "y", endpoint: "BBB2" }],
					},
				],
			}),
			1,
		);
		if (!decoded.ok) throw new Error(decoded.error);
		const { library } = importPayload(
			emptyLibrary(),
			decoded.value.payload,
			clock(),
		);
		expect(library.folders.map((f) => f.name)).toEqual(["One", "Two"]);
		const folderOf = (name: string) =>
			library.folders.find(
				(f) =>
					f.id === library.bookmarks.find((b) => b.name === name)?.folderId,
			)?.name;
		expect(folderOf("x")).toBe("One");
		expect(folderOf("y")).toBe("Two");
		expect(new Set(library.folders.map((f) => f.id)).size).toBe(2);
	});

	it("puts a child of a repeated id under the first folder that has it", () => {
		const decoded = decodeImport(
			tftCode({
				folders: [
					{ id: "a", name: "One" },
					{ id: "a", name: "Two" },
					{ id: "c", parentId: "a", name: "Child" },
				],
			}),
			1,
		);
		if (!decoded.ok) throw new Error(decoded.error);
		const byName = new Map(
			decoded.value.payload.folders.map((f) => [f.name, f]),
		);
		expect(byName.get("Child")?.parentId).toBe(byName.get("One")?.id);
	});
});
