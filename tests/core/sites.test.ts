import { describe, expect, it } from "vitest";
import { MatchPattern } from "wxt/utils/match-patterns";
import {
	isTradePage,
	isTradePattern,
	TRADE_MATCHES,
	TRADE_ORIGINS,
	tradeDomain,
} from "../../src/core/sites";

const tradePages = [
	"https://www.pathofexile.com/trade/search/Standard",
	"https://www.pathofexile.com/trade2/search/poe2/Standard/abc123",
	"https://pathofexile.com/trade/search/Standard",
	"https://br.pathofexile.com/trade/search/Standard",
	"https://jp.pathofexile.com/trade2/search/poe2/Standard",
	"https://pathofexile.tw/trade/search/Standard",
	"https://web.pathofexile.tw/trade2/search/poe2/Standard",
	"https://pathofexile.com.tw/trade/search/Standard",
	"https://www.pathofexile.com.tw/trade/search/Standard",
	"https://poe.kakaogames.com/trade/search/Standard",
	"https://poe2.kakaogames.com/trade2/search/poe2/Standard",
];

const otherPages = [
	"https://www.pathofexile.com/forum",
	"https://www.pathofexile.com/",
	"https://www.pathofexile.com/trader",
	"https://pathofexile.com.evil.example/trade/search/Standard",
	"https://kakaogames.com/trade/search/Standard",
	"http://www.pathofexile.com/trade/search/Standard",
	"https://poe.ninja/economy",
];

describe("isTradePage", () => {
	it.each(tradePages)("accepts %s", (url) => {
		expect(isTradePage(new URL(url))).toBe(true);
	});

	it.each(otherPages)("rejects %s", (url) => {
		expect(isTradePage(new URL(url))).toBe(false);
	});
});

describe("TRADE_MATCHES", () => {
	const patterns = TRADE_MATCHES.map((m) => new MatchPattern(m));
	const matchesAny = (url: string) => patterns.some((p) => p.includes(url));

	it.each(tradePages)("manifest pattern covers %s", (url) => {
		expect(matchesAny(url)).toBe(true);
	});

	it.each(otherPages.filter((u) => !u.includes("/trader")))(
		"manifest pattern skips %s",
		(url) => {
			expect(matchesAny(url)).toBe(false);
		},
	);
});

describe("tradeDomain", () => {
	it("maps every pathofexile.com front end to one backend", () => {
		for (const host of [
			"www.pathofexile.com",
			"pathofexile.com",
			"br.pathofexile.com",
		])
			expect(tradeDomain(host)).toBe("pathofexile.com");
		expect(tradeDomain("www.pathofexile.com.tw")).toBe("pathofexile.com.tw");
		expect(tradeDomain("pathofexile.tw")).toBe("pathofexile.tw");
		expect(tradeDomain("example.com")).toBeNull();
	});
});

describe("isTradePattern", () => {
	it("accepts the requested patterns and single trade hosts", () => {
		for (const pattern of TRADE_ORIGINS)
			expect(isTradePattern(pattern)).toBe(true);
		expect(isTradePattern("https://www.pathofexile.com/*")).toBe(true);
		expect(isTradePattern("https://poe.ninja/*")).toBe(false);
		expect(isTradePattern("https://evilpathofexile.com/*")).toBe(false);
	});
});
