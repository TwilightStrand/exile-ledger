import { describe, expect, it } from "vitest";
import { MatchPattern } from "wxt/utils/match-patterns";
import { isTradePage, TRADE_MATCHES } from "../../src/core/sites";

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
