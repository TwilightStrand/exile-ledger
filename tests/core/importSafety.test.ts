import { describe, expect, it } from "vitest";
import {
	createBackup,
	decodeShare,
	IMPORT_LIMITS,
	importPayload,
	parseBackup,
	SHARE_PREFIX,
} from "../../src/core/exchange";
import { decodeImport } from "../../src/core/importers";
import { emptyLibrary } from "../../src/core/library";
import type { TradeQuery } from "../../src/core/query";
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
	it("still imports a query with 160 stat filters", () => {
		const query = heavyQuery(160);
		expect(JSON.stringify(query).length).toBeGreaterThan(10_000);
		const decoded = decodeShare(
			share({ folders: [folder()], bookmarks: [bookmark({ query })] }),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.bookmarks).toHaveLength(1);
		expect(decoded.value.skipped).toBe(0);
	});

	it.each([
		["a long name", { name: "n".repeat(IMPORT_LIMITS.name + 1) }],
		["a long league", { league: "l".repeat(IMPORT_LIMITS.league + 1) }],
		["a long search id", { searchId: "s".repeat(IMPORT_LIMITS.searchId + 1) }],
		[
			"a huge query",
			{
				query: {
					query: { term: "t".repeat(IMPORT_LIMITS.queryChars) },
				},
			},
		],
	])(
		"skips and counts a bookmark with %s instead of cutting it",
		(_name, extra) => {
			const decoded = decodeShare(
				share({
					folders: [folder()],
					bookmarks: [bookmark({ id: "ok" }), bookmark(extra)],
				}),
			);
			if (!decoded.ok) throw new Error(decoded.error);
			expect(decoded.value.bookmarks.map((b) => b.id)).toEqual(["ok"]);
			expect(decoded.value.skipped).toBe(1);
			const result = importPayload(emptyLibrary(), decoded.value, clock());
			expect(result.bookmarks).toBe(1);
			expect(result.skipped).toBe(1);
		},
	);

	it("skips a folder with a long name together with its bookmarks", () => {
		const decoded = decodeShare(
			share({
				folders: [
					folder(),
					folder({ id: "g", name: "n".repeat(IMPORT_LIMITS.name + 1) }),
				],
				bookmarks: [bookmark(), bookmark({ id: "c", folderId: "g" })],
			}),
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.folders.map((f) => f.id)).toEqual(["f"]);
		expect(decoded.value.skipped).toBe(2);
	});

	it("applies the limits to other tools' exports too", () => {
		const decoded = decodeImport(
			tftCode({
				folders: [
					{
						id: "a",
						name: "n".repeat(IMPORT_LIMITS.name + 1),
						bookmarks: [{ name: "x", endpoint: "AAA1" }],
					},
					{
						id: "b",
						name: "Fine",
						bookmarks: [{ name: "y", endpoint: "BBB2" }],
					},
				],
			}),
			1,
		);
		if (!decoded.ok) throw new Error(decoded.error);
		expect(decoded.value.payload.folders.map((f) => f.name)).toEqual(["Fine"]);
		expect(decoded.value.payload.skipped).toBe(2);
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
	const nestedLegacy = (depth: number) => {
		let f: unknown = { name: "x", searches: [], subFolders: [] };
		for (let i = 0; i < depth; i++)
			f = {
				name: "x",
				searches: [{ name: "s", url: "AAA1" }],
				subFolders: [f],
			};
		return tftCode({ searches: [f] });
	};

	it("refuses a TFT legacy code nested 20,000 levels deep with a message", () => {
		expect(() => decodeImport(nestedLegacy(20_000), 1)).not.toThrow();
		expect(decodeImport(nestedLegacy(20_000), 1)).toEqual({
			ok: false,
			error: "unknown-format",
		});
	});

	it("still reads a TFT legacy code nested as deep as people nest folders", () => {
		const decoded = decodeImport(nestedLegacy(10), 1);
		expect(decoded.ok).toBe(true);
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
