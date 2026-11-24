import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countAffixes, type ModLine } from "../../src/core/items/affixes";
import { itemClassOf, itemTextFromBase64 } from "../../src/core/items/itemText";
import {
	socketShortfall,
	socketsForItemLevel,
} from "../../src/core/items/sockets";

const fetchFixture = (game: string) =>
	JSON.parse(
		readFileSync(
			join(process.cwd(), `tests/fixtures/trade/${game}-fetch-response.json`),
			"utf8",
		),
	);

describe("socket caps", () => {
	it.each([
		[1, 2],
		[2, 3],
		[24, 3],
		[25, 4],
		[34, 4],
		[35, 5],
		[49, 5],
		[50, 6],
		[86, 6],
	])("item level %i allows %i sockets", (level, sockets) => {
		expect(socketsForItemLevel(level)).toBe(sockets);
	});

	it("warns only when the level keeps the item below its class maximum", () => {
		const armour = { itemClass: "Body Armours", rarity: "Rare" };
		expect(socketShortfall({ ...armour, itemLevel: 40 })).toBe(5);
		expect(socketShortfall({ ...armour, itemLevel: 50 })).toBeNull();
		expect(
			socketShortfall({ itemClass: "Gloves", rarity: "Rare", itemLevel: 30 }),
		).toBeNull();
		expect(
			socketShortfall({ itemClass: "Gloves", rarity: "Rare", itemLevel: 20 }),
		).toBe(3);
		expect(
			socketShortfall({ ...armour, rarity: "Unique", itemLevel: 10 }),
		).toBeNull();
		expect(
			socketShortfall({ itemClass: "Rings", rarity: "Rare", itemLevel: 1 }),
		).toBeNull();
	});
});

describe("item text", () => {
	it("decodes PoE1's Ctrl+C text and reads the item class", () => {
		const item = fetchFixture("poe1").result.find(Boolean).item;
		const text = itemTextFromBase64(item.extended.text);
		expect(text).toContain("Rarity: Rare");
		expect(text).toContain("Item Level: 86");
		expect(itemClassOf(text ?? "")).toBe("Body Armours");
	});

	it("returns null for text that is not base64 UTF-8", () => {
		expect(itemTextFromBase64("%%%")).toBeNull();
	});
});

describe("affix count", () => {
	it("counts each fixture item's prefixes and suffixes from tier codes", () => {
		const item = fetchFixture("poe1").result.find(Boolean).item;
		const lines: ModLine[] = item.explicitMods;
		const count = countAffixes(lines);
		expect(count).not.toBeNull();
		expect((count?.prefixes ?? 0) + (count?.suffixes ?? 0)).toBeLessThanOrEqual(
			6,
		);
	});

	it("counts a hybrid mod that spans two lines once", () => {
		const hybrid = { name: "Seething", tier: "P2" };
		expect(
			countAffixes([
				{ mods: [hybrid] },
				{ mods: [hybrid] },
				{ mods: [{ name: "of the Lynx", tier: "S1" }] },
			]),
		).toEqual({ prefixes: 1, suffixes: 1 });
	});

	it("gives nothing for items without tier data", () => {
		expect(countAffixes([{}, {}])).toBeNull();
	});
});
