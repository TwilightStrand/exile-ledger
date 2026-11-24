import { describe, expect, it } from "vitest";
import {
	equivalents,
	formatEquivalent,
	isFresh,
	overviewUrl,
	parseCardOverview,
	parseOverview,
	RATES_TTL_MS,
	stackValue,
} from "../../src/core/pricing";
import cards from "../fixtures/poe-ninja/poe1-cards-standard.json";
import poe1 from "../fixtures/poe-ninja/poe1-currency-standard.json";
import poe2 from "../fixtures/poe-ninja/poe2-currency-standard.json";

describe("parseOverview and equivalents", () => {
	it("converts a PoE1 price into chaos and divine", () => {
		const rates = parseOverview(poe1, "poe1", "Standard", 0);
		if (!rates) throw new Error("fixture");
		const fromExalts = equivalents(10, "exalted", rates).map((e) =>
			formatEquivalent(e),
		);
		expect(fromExalts).toEqual(["74.1 c", "0.088 div"]);
		expect(
			equivalents(1, "divine", rates).map((e) => formatEquivalent(e)),
		).toEqual(["846 c"]);
	});

	it("converts a PoE2 price into exalted and divine", () => {
		const rates = parseOverview(poe2, "poe2", "Standard", 0);
		if (!rates) throw new Error("fixture");
		expect(rates.primary).toBe("divine");
		expect(
			equivalents(1, "divine", rates).map((e) => formatEquivalent(e)),
		).toEqual(["160 ex"]);
		expect(
			equivalents(2, "chaos", rates).map((e) => formatEquivalent(e)),
		).toEqual(["166 ex", "1.04 div"]);
	});

	it("gives nothing for unknown currencies, zero prices and bad data", () => {
		const rates = parseOverview(poe2, "poe2", "Standard", 0);
		if (!rates) throw new Error("fixture");
		expect(equivalents(1, "made-up-orb", rates)).toEqual([]);
		expect(equivalents(0, "divine", rates)).toEqual([]);
		expect(parseOverview({ lines: [] }, "poe2", "Standard", 0)).toBeNull();
	});

	it("builds the overview URL and ages the cache", () => {
		expect(overviewUrl("poe2", "Runes of Aldur")).toBe(
			"https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Runes+of+Aldur&type=Currency",
		);
		const rates = parseOverview(poe1, "poe1", "Standard", 1000);
		if (!rates) throw new Error("fixture");
		expect(isFresh(rates, 1000 + RATES_TTL_MS - 1)).toBe(true);
		expect(isFresh(rates, 1000 + RATES_TTL_MS)).toBe(false);
	});
});

describe("divination card stacks", () => {
	it("maps poe.ninja card ids to the names the trade API uses", () => {
		expect(parseCardOverview(cards)).toEqual({
			"Abandoned Wealth": 2,
			"Broken Truce": 4,
			"Blind Venture": 4,
			"Cursed Words": 100,
		});
		expect(parseCardOverview({ nope: true })).toEqual({});
	});

	it("values a stack at per-card price times stack size", () => {
		const base = parseOverview(poe1, "poe1", "Standard", 0);
		if (!base) throw new Error("fixture");
		const rates = { ...base, cards: parseCardOverview(cards) };
		const value = stackValue({ name: "Broken Truce", stackSize: 5 }, rates);
		expect(value.map((e) => formatEquivalent(e))).toEqual([
			"20 c",
			"0.024 div",
		]);
		expect(stackValue({ name: "Unknown Card", stackSize: 5 }, rates)).toEqual(
			[],
		);
	});

	it("asks poe.ninja for cards with the same endpoint", () => {
		expect(overviewUrl("poe1", "Mercenaries", "DivinationCard")).toBe(
			"https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Mercenaries&type=DivinationCard",
		);
	});
});
