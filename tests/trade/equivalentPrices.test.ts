import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseOverview } from "../../src/core/pricing";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { annotatePrices, PRICE_ATTR } from "../../src/trade/equivalentPrices";
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
