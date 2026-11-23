import { describe, expect, it } from "vitest";
import { type CaptureEvent, toCaptureEvent } from "../../src/trade/capture";
import { MESSAGE_SOURCE } from "../../src/trade/interceptor";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

const envelope = (payload: unknown) => ({
	source: MESSAGE_SOURCE,
	payload,
});

describe("toCaptureEvent", () => {
	it("turns a search exchange into a typed search event", () => {
		const event = toCaptureEvent(
			envelope({
				url: "https://www.pathofexile.com/api/trade2/search/poe2/Standard",
				method: "POST",
				requestBody: JSON.stringify(searchRequest),
				responseBody: JSON.stringify(searchResponse),
			}),
		);
		expect(event).toMatchObject<Partial<CaptureEvent>>({
			kind: "search",
		});
		if (event?.kind !== "search") throw new Error("expected search");
		expect(event.game).toBe("poe2");
		expect(event.league).toBe("Standard");
		expect(event.search.searchId).toBe(searchResponse.id);
	});

	it("turns a fetch exchange into a typed results event", () => {
		const event = toCaptureEvent(
			envelope({
				url: `https://www.pathofexile.com/api/trade2/fetch/${searchResponse.result.join(",")}?query=${searchResponse.id}&realm=poe2`,
				method: "GET",
				requestBody: null,
				responseBody: JSON.stringify(fetchResponse),
			}),
		);
		if (event?.kind !== "results") throw new Error("expected results");
		expect(event.queryId).toBe(searchResponse.id);
		expect(event.items).toHaveLength(3);
	});

	it.each([
		["a foreign message", { source: "someone-else", payload: {} }],
		["a malformed payload", envelope({ url: 5 })],
		[
			"invalid JSON",
			envelope({
				url: "https://www.pathofexile.com/api/trade/search/Standard",
				method: "POST",
				requestBody: "{",
				responseBody: "{}",
			}),
		],
		[
			"a non-API URL",
			envelope({
				url: "https://www.pathofexile.com/forum",
				method: "GET",
				requestBody: null,
				responseBody: "{}",
			}),
		],
		["a string", "hello"],
		["null", null],
	])("ignores %s", (_label, data) => {
		expect(toCaptureEvent(data)).toBeNull();
	});
});
