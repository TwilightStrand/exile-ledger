import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { THEMES } from "../../src/core/themes";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import {
	HIGHLIGHT_ATTR,
	highlightMods,
	installPageStyles,
	setPageTheme,
} from "../../src/trade/enhanceResults";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

function captured(disabled = false) {
	const feed = createCaptureFeed();
	const request = disabled
		? {
				...searchRequest,
				query: {
					...searchRequest.query,
					stats: searchRequest.query.stats.map((g) => ({
						...g,
						disabled: true,
					})),
				},
			}
		: searchRequest;
	const search = parseSearch(request, searchResponse);
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

const marked = () =>
	[...document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`)].map((el) =>
		el.textContent?.trim(),
	);

describe("highlightMods", () => {
	beforeEach(() => {
		document.body.innerHTML = readFileSync(
			join(process.cwd(), "tests/fixtures/trade-dom/poe2-results.html"),
			"utf8",
		);
		document.head.innerHTML = "";
	});

	it("marks only the lines whose stat the search filtered on", () => {
		expect(highlightMods(document, captured(), true)).toBe(1);
		expect(marked()).toEqual(["+207 to maximum Life"]);
	});

	it("leaves rows it has no captured data for alone", () => {
		highlightMods(document, captured(), true);
		expect(
			document.querySelector(`[data-id="unknown-row"] [${HIGHLIGHT_ATTR}]`),
		).toBeNull();
	});

	it("clears marks when turned off or when filters are disabled", () => {
		highlightMods(document, captured(), true);
		highlightMods(document, captured(), false);
		expect(marked()).toEqual([]);
		highlightMods(document, captured(true), true);
		expect(marked()).toEqual([]);
	});

	it("themes only our marks and follows a theme change", () => {
		setPageTheme(document, "blood");
		setPageTheme(document, "azure");
		const styles = document.querySelectorAll("#exile-ledger-page-theme");
		expect(styles).toHaveLength(1);
		const css = styles[0]?.textContent ?? "";
		expect(css).toContain(THEMES.azure.siteAccent);
		expect(css).not.toContain(THEMES.blood.siteAccent);
		expect(css.startsWith(":is([data-exile-ledger-match]")).toBe(true);
	});

	it("installs page styles once", () => {
		installPageStyles(document);
		installPageStyles(document);
		expect(document.querySelectorAll("#exile-ledger-page-styles")).toHaveLength(
			1,
		);
	});
});
