import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseCardOverview, parseOverview } from "../../src/core/pricing";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { annotatePrices, PRICE_ATTR } from "../../src/trade/equivalentPrices";
import cards from "../fixtures/poe-ninja/poe1-cards-standard.json";
import poe1Rates from "../fixtures/poe-ninja/poe1-currency-standard.json";
import poe2Rates from "../fixtures/poe-ninja/poe2-currency-standard.json";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

function capture() {
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
	feed.push({
		kind: "results",
		game: "poe2",
		queryId: search.searchId,
		items: parseFetchResponse(fetchResponse) ?? [],
	});
	return feed.get();
}

const rates = parseOverview(poe2Rates, "poe2", "Standard", 0);
const notes = () =>
	[...document.querySelectorAll(`[${PRICE_ATTR}]`)].map((el) => el.textContent);

describe("annotatePrices", () => {
	beforeEach(() => {
		document.body.innerHTML = readFileSync(
			join(process.cwd(), "tests/fixtures/trade-dom/poe2-results.html"),
			"utf8",
		);
	});

	it("adds the divine equivalent of an exalted price once, even when run again", () => {
		annotatePrices(document, capture(), rates, true);
		annotatePrices(document, capture(), rates, true);
		expect(notes()).toEqual(["≈ 0.0062 div"]);
	});

	it("removes annotations when switched off or without rates", () => {
		annotatePrices(document, capture(), rates, true);
		annotatePrices(document, capture(), rates, false);
		expect(notes()).toEqual([]);
		annotatePrices(document, capture(), null, true);
		expect(notes()).toEqual([]);
	});
});

describe("divination card stacks", () => {
	it("adds the stack's worth under a card listing's price", () => {
		const base = parseOverview(poe1Rates, "poe1", "Standard", 0);
		if (!base) throw new Error("fixture");
		const [item] =
			parseFetchResponse({
				result: [
					{
						id: "card1",
						listing: { price: { amount: 15, currency: "chaos" } },
						item: { typeLine: "Broken Truce", frameType: 6, stackSize: 5 },
					},
				],
			}) ?? [];
		if (!item) throw new Error("no item");
		document.body.innerHTML =
			'<div class="resultset"><div class="row" data-id="card1"><span class="price">15 chaos</span></div></div>';
		annotatePrices(
			document,
			{ search: null, results: new Map([[item.id, item]]) },
			{ ...base, cards: parseCardOverview(cards) },
			true,
		);
		expect(notes()).toEqual([
			"≈ 0.018 div\nStack of 5 worth ≈ 20 c · 0.024 div",
		]);
	});
});
