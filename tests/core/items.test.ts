import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countAffixes, type ModLine } from "../../src/core/items/affixes";
import {
	buildItemText,
	itemClassOf,
	itemTextFromBase64,
	wikiUrl,
} from "../../src/core/items/itemText";
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

describe("buildItemText", () => {
	it("writes PoE2 items in the game's Ctrl+C layout", () => {
		expect(
			buildItemText({
				rarity: "Rare",
				name: "Viper Wrap",
				typeLine: "Hatungo Garb",
				ilvl: 73,
				corrupted: true,
				mods: [
					{ kind: "explicit", text: "+28 to Evasion Rating" },
					{ kind: "implicit", text: "+10% to Cold Resistance" },
					{ kind: "rune", text: "+12% to Fire Resistance" },
					{ kind: "crafted", text: "+20 to maximum Life" },
				],
			}),
		).toBe(
			[
				"Rarity: Rare",
				"Viper Wrap",
				"Hatungo Garb",
				"--------",
				"Item Level: 73",
				"--------",
				"+12% to Fire Resistance (rune)",
				"--------",
				"+10% to Cold Resistance (implicit)",
				"--------",
				"+28 to Evasion Rating",
				"+20 to maximum Life (crafted)",
				"--------",
				"Corrupted",
			].join("\n"),
		);
	});

	it("leaves out a name a normal item does not have", () => {
		expect(
			buildItemText({
				rarity: "Normal",
				name: "",
				typeLine: "Hatungo Garb",
				ilvl: null,
				corrupted: false,
				mods: [],
			}),
		).toBe("Rarity: Normal\nHatungo Garb");
	});
});

describe("wikiUrl", () => {
	it("links uniques by name and everything else by base", () => {
		expect(
			wikiUrl("poe1", {
				rarity: "Unique",
				name: "Tabula Rasa",
				baseType: "Simple Robe",
			}),
		).toBe("https://www.poewiki.net/wiki/Tabula_Rasa");
		expect(
			wikiUrl("poe2", {
				rarity: "Rare",
				name: "Viper Wrap",
				baseType: "Hatungo Garb",
			}),
		).toBe("https://www.poe2wiki.net/wiki/Hatungo_Garb");
	});

	it("escapes characters that would break the path", () => {
		expect(
			wikiUrl("poe1", {
				rarity: "Unique",
				name: "Doryani's Fist",
				baseType: "x",
			}),
		).toBe("https://www.poewiki.net/wiki/Doryani's_Fist");
		expect(wikiUrl("poe1", { rarity: null, name: "", baseType: "" })).toBe(
			null,
		);
	});
});

describe("countAffixes without P or S tiers", () => {
	it("gives nothing rather than zero and zero", () => {
		expect(countAffixes([{ mods: [{ name: "Odd", tier: "U1" }] }])).toBeNull();
	});
});
