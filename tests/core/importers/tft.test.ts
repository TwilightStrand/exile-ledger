import { describe, expect, it } from "vitest";
import { importPayload } from "../../../src/core/exchange";
import { decodeImport } from "../../../src/core/importers";
import { parseTft } from "../../../src/core/importers/tft";
import { emptyLibrary } from "../../../src/core/library";

/** What TFT's exportFolders writes: UTF-8 JSON, base64 encoded. */
const tftCode = (data: unknown) =>
	Buffer.from(JSON.stringify(data), "utf8").toString("base64");

const current = {
	folders: [
		{
			id: "f1",
			parentId: null,
			childIds: ["f2"],
			depth: 0,
			index: 0,
			name: "Rings ✦",
			isOpen: true,
			icon: "TFT",
			someNewField: { ignored: true },
			bookmarks: [
				{
					id: "b2",
					idx: 1,
					name: "Live rings",
					endpoint: "XyZ123/live",
					type: "search",
					isDone: false,
					league: "Auto",
					poeVersion: "Poe1",
				},
				{
					id: "b1",
					idx: 0,
					name: "Cheap rings",
					endpoint: "AbC987",
					type: "search",
					isDone: true,
					league: "Auto",
					poeVersion: "Poe1",
				},
			],
		},
		{
			id: "f2",
			parentId: "f1",
			childIds: [],
			depth: 1,
			index: 0,
			name: "Bulk",
			isOpen: false,
			icon: "TFT",
			bookmarks: [
				{
					id: "b3",
					idx: 0,
					name: "Divines",
					endpoint: "Ex1",
					type: "exchange",
					isDone: false,
					league: "Auto",
					poeVersion: "Poe1",
				},
			],
		},
		{
			id: "f3",
			parentId: null,
			childIds: [],
			depth: 0,
			index: 1,
			name: "PoE2 bows",
			isOpen: true,
			icon: "TFT",
			bookmarks: [
				{
					id: "b4",
					idx: 0,
					name: "Bows",
					endpoint: "https://www.pathofexile.com/trade2/search/poe2/Dawn/Bw42",
					type: "search",
					isDone: false,
					league: "Auto",
					poeVersion: "Poe2",
				},
			],
		},
	],
};

describe("parseTft", () => {
	it("reads nested folders, done marks, live and exchange searches, both games", () => {
		const payload = parseTft(tftCode(current), 5);
		expect(payload?.folders).toEqual([
			{
				id: "tft-folder-0",
				parentId: null,
				name: "Rings ✦",
				game: "poe1",
				order: 0,
				archived: false,
				updatedAt: 5,
			},
			{
				id: "tft-folder-1",
				parentId: "tft-folder-0",
				name: "Bulk",
				game: "poe1",
				order: 0,
				archived: false,
				updatedAt: 5,
			},
			{
				id: "tft-folder-2",
				parentId: null,
				name: "PoE2 bows",
				game: "poe2",
				order: 1,
				archived: false,
				updatedAt: 5,
			},
		]);
		expect(
			payload?.bookmarks.map((b) => [
				b.folderId,
				b.name,
				b.searchId,
				b.tradeType,
				b.live,
				b.done ?? false,
				b.game,
			]),
		).toEqual([
			["tft-folder-0", "Cheap rings", "AbC987", "search", false, true, "poe1"],
			["tft-folder-0", "Live rings", "XyZ123", "search", true, false, "poe1"],
			["tft-folder-1", "Divines", "Ex1", "exchange", false, false, "poe1"],
			["tft-folder-2", "Bows", "Bw42", "search", false, false, "poe2"],
		]);
	});

	it("reads the legacy searches format with subfolders", () => {
		const legacy = {
			searches: [
				{
					id: "old1",
					name: "Old",
					isFolded: false,
					searches: [
						{ name: "Chest", url: "Ch3st", isPoE2: false, isMarkedDone: true },
					],
					subFolders: [
						{
							id: "old2",
							name: "Inner",
							isFolded: true,
							searches: [
								{
									name: "Boots",
									url: "B00ts",
									isPoE2: false,
									isMarkedDone: false,
								},
							],
							subFolders: [],
						},
					],
				},
			],
		};
		const payload = parseTft(tftCode(legacy), 1);
		expect(payload?.folders.map((f) => [f.name, f.parentId])).toEqual([
			["Old", null],
			["Inner", "tft-folder-0"],
		]);
		expect(payload?.bookmarks.map((b) => [b.name, b.searchId, b.done])).toEqual(
			[
				["Chest", "Ch3st", true],
				["Boots", "B00ts", undefined],
			],
		);
	});

	it("turns down anything that is not a TFT code", () => {
		expect(parseTft("hello", 1)).toBe(null);
		expect(parseTft(tftCode({ settings: {} }), 1)).toBe(null);
		expect(parseTft(tftCode({ folders: [] }), 1)).toBe(null);
	});

	it("is recognised by decodeImport and imports as new copies", () => {
		const decoded = decodeImport(tftCode(current), 5);
		expect(decoded.ok && decoded.value.source).toBe("tft");
		if (!decoded.ok) return;
		let n = 0;
		const { library, folders, bookmarks } = importPayload(
			emptyLibrary(),
			decoded.value.payload,
			{ now: 6, newId: () => `id${++n}` },
		);
		expect([folders, bookmarks]).toEqual([3, 4]);
		expect(library.bookmarks.every((b) => b.id.startsWith("id"))).toBe(true);
	});
});
