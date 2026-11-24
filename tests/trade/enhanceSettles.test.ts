import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseOverview } from "../../src/core/pricing";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { highlightMods } from "../../src/trade/enhanceResults";
import { annotatePrices } from "../../src/trade/equivalentPrices";
import { observeResults } from "../../src/trade/observeResults";
import { syncPinButtons } from "../../src/trade/pinButtons";
import poe2Rates from "../fixtures/poe-ninja/poe2-currency-standard.json";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

describe("result enhancers with the results observer", () => {
	it("settle after one pass instead of waking themselves every frame", async () => {
		document.body.innerHTML = readFileSync(
			join(process.cwd(), "tests/fixtures/trade-dom/poe2-results.html"),
			"utf8",
		);
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
		const rates = parseOverview(poe2Rates, "poe2", "Standard", 0);
		let passes = 0;
		const enhance = () => {
			passes++;
			highlightMods(document, feed.get(), true);
			syncPinButtons(document, [], () => {});
			annotatePrices(document, feed.get(), rates, true);
		};
		enhance();
		const stop = observeResults(document, enhance);
		await new Promise((r) => setTimeout(r, 50));
		enhance();
		await new Promise((r) => setTimeout(r, 200));
		stop();
		expect(passes).toBe(2);
	});
});
