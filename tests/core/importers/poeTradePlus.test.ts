import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importPayload } from "../../../src/core/exchange";
import { decodeImport } from "../../../src/core/importers";
import { parsePoeTradePlus } from "../../../src/core/importers/poeTradePlus";
import { emptyLibrary } from "../../../src/core/library";
import { depthOf } from "../../../src/core/tree";

const fixture = (name: string) =>
	readFileSync(
		join(process.cwd(), "tests/fixtures/poe-trade-plus", name),
		"utf8",
	);

describe("parsePoeTradePlus", () => {
	it("reads a v5 folder string with categories as subfolders", () => {
		const payload = parsePoeTradePlus(fixture("folder-v5.txt"), 1);
		expect(
			payload?.folders.map((f) => [f.name, f.parentId === null, f.game]),
		).toEqual([
			["Witch build ✦", true, "poe2"],
			["Weapons", false, "poe2"],
			["Jewellery", false, "poe2"],
		]);
		const byName = Object.fromEntries(
			(payload?.bookmarks ?? []).map((b) => [b.name, b]),
		);
		expect(byName.Wand).toMatchObject({
			league: "Rise of the Abyssal",
			searchId: "Ww1",
			live: false,
		});
		expect(byName.Amulet).toMatchObject({ live: true, tradeType: "search" });
		expect(byName.Uncategorised?.folderId).toBe(payload?.folders[0]?.id);
		expect(byName.Whatever).toBeUndefined();
	});

	it("reads a bookmark document with categories, bulk and archived folders", () => {
		const payload = parsePoeTradePlus(fixture("document-poe1.json"), 1);
		expect(payload?.folders.map((f) => [f.name, f.archived])).toEqual([
			["Flipping", false],
			["Currency", false],
			["Old", true],
		]);
		expect(
			payload?.bookmarks.map((b) => [b.name, b.tradeType, b.league]),
		).toEqual([
			["Divines", "exchange", "Mercenaries"],
			["Mageblood", "search", ""],
			["HH", "search", "Standard"],
		]);
	});

	it("reads both games from an extension backup and imports within the depth limit", () => {
		const payload = parsePoeTradePlus(fixture("extension-backup.json"), 1);
		expect(new Set(payload?.folders.map((f) => f.game))).toEqual(
			new Set(["poe1", "poe2"]),
		);
		const result = importPayload(
			emptyLibrary(),
			payload ?? { folders: [], bookmarks: [] },
			{
				now: 2,
				newId: crypto.randomUUID.bind(crypto),
			},
		);
		expect(result).toMatchObject({ folders: 4, bookmarks: 4 });
		for (const f of result.library.folders)
			expect(depthOf(result.library.folders, f.id)).toBeLessThanOrEqual(2);
	});

	it.each([
		"",
		"{}",
		'{"format":"poe-trade-plus","version":2}',
		"5:@@@",
		"3:abc",
	])("rejects %j", (text) => {
		expect(parsePoeTradePlus(text, 1)).toBeNull();
	});

	it("is picked by the import detector", () => {
		const result = decodeImport(fixture("folder-v5.txt"), 1);
		expect(result.ok && result.value.source).toBe("poe-trade-plus");
	});
});
