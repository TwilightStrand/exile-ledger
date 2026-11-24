import { describe, expect, it } from "vitest";
import { parseOverview } from "../../src/core/pricing";
import type { ResultItem } from "../../src/core/tradeApi";
import { parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { highlightMods } from "../../src/trade/enhanceResults";
import { annotatePrices } from "../../src/trade/equivalentPrices";
import { syncPinButtons } from "../../src/trade/pinButtons";
import poe2Rates from "../fixtures/poe-ninja/poe2-currency-standard.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

const MODS = [
	"+28 to Evasion Rating",
	"+207 to maximum Life",
	"+27% to Lightning Resistance",
	"+22 to Stun Threshold",
	"5.7 Life Regeneration per second",
	"+12 to maximum Energy Shield",
];

function page(rows: number) {
	const items: ResultItem[] = [];
	const html: string[] = [];
	for (let i = 0; i < rows; i++) {
		const id = `row-${i}`;
		items.push({
			id,
			name: `Item ${i}`,
			typeLine: "Hatungo Garb",
			baseType: "Hatungo Garb",
			ilvl: 80,
			indexed: null,
			rarity: null,
			text: null,
			corrupted: false,
			seller: null,
			card: null,
			affixes: null,
			price: { amount: 1 + (i % 5), currency: i % 2 ? "exalted" : "divine" },
			mods: MODS.map((text, k) => ({
				kind: "explicit",
				text,
				statIds: [k === 1 ? "explicit.stat_3299347043" : `explicit.stat_${k}`],
			})),
		});
		html.push(
			`<div class="row" data-id="${id}"><div class="content">${MODS.map((m) => `<div class="explicitMod">${m}</div>`).join("")}</div><div class="details"><div class="price">x</div><div class="btns"></div></div></div>`,
		);
	}
	document.body.innerHTML = `<div class="resultset">${html.join("")}</div>`;
	const feed = createCaptureFeed();
	const search = parseSearch(searchRequest, searchResponse);
	if (!search) throw new Error("fixture");
	feed.push({
		kind: "search",
		game: "poe2",
		realm: "poe2",
		league: "Standard",
		search,
	});
	feed.push({ kind: "results", game: "poe2", queryId: search.searchId, items });
	return feed.get();
}

describe("enhance pass on a 100-result page", () => {
	it("stays under the 100 ms budget (happy-dom; a real browser is faster)", () => {
		const capture = page(100);
		const rates = parseOverview(poe2Rates, "poe2", "Standard", 0);
		const run = () => {
			highlightMods(document, capture, true);
			annotatePrices(document, capture, rates, true);
			syncPinButtons(document, [], () => {});
		};
		run();
		const start = performance.now();
		for (let i = 0; i < 5; i++) run();
		const perPass = (performance.now() - start) / 5;
		expect(document.querySelectorAll("[data-exile-ledger-match]")).toHaveLength(
			100,
		);
		expect(perPass).toBeLessThan(100);
		console.info(`enhance pass over 100 rows: ${perPass.toFixed(1)} ms`);
	});
});
