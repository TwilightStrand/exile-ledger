import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importPayload } from "../../../src/core/exchange";
import {
	iconFromBetterTrading,
	parseBetterTrading,
} from "../../../src/core/importers/betterTrading";
import { emptyLibrary } from "../../../src/core/library";

// Resolved from the project root: under happy-dom import.meta.url is not a file URL.
const fixture = (name: string) =>
	readFileSync(
		join(process.cwd(), "tests/fixtures/better-trading", name),
		"utf8",
	);

describe("parseBetterTrading", () => {
	it("reads a v1 string as a PoE1 folder with search and exchange bookmarks", () => {
		const payload = parseBetterTrading(fixture("v1.txt"), 5);
		expect(payload?.folders).toMatchObject([
			{ name: "Flasks", game: "poe1", icon: "coin", archived: false },
		]);
		expect(
			payload?.bookmarks.map((b) => [
				b.name,
				b.searchId,
				b.tradeType,
				b.league,
			]),
		).toEqual([
			["Divine Life Flask", "Ab12Cd", "search", ""],
			["Bulk chaos", "Zx9", "exchange", ""],
		]);
	});

	it("reads a v2 string with non-Latin text", () => {
		const payload = parseBetterTrading(fixture("v2.txt"), 5);
		expect(payload?.folders[0]).toMatchObject({
			name: "Deadeye ⚔ gear",
			game: "poe1",
			icon: "bow",
		});
		expect(payload?.bookmarks[0]?.name).toBe("Bow – 6L");
	});

	it("reads a v3 PoE2 string", () => {
		const payload = parseBetterTrading(fixture("v3.txt"), 5);
		expect(payload?.folders[0]).toMatchObject({
			name: "Monk upgrades",
			game: "poe2",
			icon: "coin",
		});
		expect(payload?.bookmarks.map((b) => b.searchId)).toEqual(["Pp1", "Pp2"]);
	});

	it("reads a backup with archived folders after the separator", () => {
		const payload = parseBetterTrading(fixture("backup.txt"), 5);
		expect(payload?.folders.map((f) => [f.name, f.game, f.archived])).toEqual([
			["Monk upgrades", "poe2", false],
			["Deadeye ⚔ gear", "poe1", false],
			["Old league", "poe1", true],
		]);
		const imported = importPayload(
			emptyLibrary(),
			payload ?? { folders: [], bookmarks: [] },
			{
				now: 9,
				newId: crypto.randomUUID.bind(crypto),
			},
		);
		expect(imported).toMatchObject({ folders: 3, bookmarks: 4 });
	});

	it.each(["", "EL1:abc", "3:@@@", `2:${btoa("{}")}`, "hello world"])(
		"rejects %j",
		(text) => {
			expect(parseBetterTrading(text, 5)).toBeNull();
		},
	);
});

describe("iconFromBetterTrading", () => {
	it.each([
		["poe2-divine", "coin"],
		["map", "map"],
		["poe2-waystone", "map"],
		["fossil", "gem"],
		["scarab", "star"],
		["poe2-amazon", "bow"],
		["juggernaut", "sword"],
		[null, "folder"],
	])("maps %s to %s", (icon, expected) => {
		expect(iconFromBetterTrading(icon)).toBe(expected);
	});
});
