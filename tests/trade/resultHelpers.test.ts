import { afterEach, describe, expect, it } from "vitest";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import type { CaptureState } from "../../src/trade/captureFeed";
import {
	annotateResults,
	LISTED_ATTR,
	SOCKETS_ATTR,
	TOOLS_ATTR,
} from "../../src/trade/resultHelpers";
import poe1Fetch from "../fixtures/trade/poe1-fetch-response.json";
import poe1SearchRequest from "../fixtures/trade/poe1-search-request.json";
import poe1SearchResponse from "../fixtures/trade/poe1-search-response.json";

const items = parseFetchResponse(poe1Fetch) ?? [];
const OFF = {
	listingTime: false,
	socketWarning: false,
	affixCount: false,
	itemTools: false,
};
const capture: CaptureState = { search: null, results: items };
const poe1Capture = (): CaptureState => {
	const search = parseSearch(poe1SearchRequest, poe1SearchResponse);
	if (!search) throw new Error("fixture");
	return {
		search: {
			kind: "search",
			game: "poe1",
			realm: null,
			league: "Standard",
			search,
		},
		results: items,
	};
};

function rows() {
	document.body.innerHTML = `<div class="resultset">${items
		.map(
			(item) =>
				`<div class="row" data-id="${item.id}"><div class="details"><div class="btns"></div></div></div>`,
		)
		.join("")}</div>`;
}

const marks = (attr: string) =>
	[...document.querySelectorAll(`[${attr}]`)].map((el) => el.textContent);

afterEach(() => {
	document.body.innerHTML = "";
});

describe("annotateResults", () => {
	it("shows the exact listing time on every row, before the buttons", () => {
		rows();
		annotateResults(document, capture, {
			...OFF,
			listingTime: true,
			socketWarning: false,
		});
		expect(marks(LISTED_ATTR)).toHaveLength(items.length);
		const first = document.querySelector(`[${LISTED_ATTR}]`);
		expect(first?.textContent).toMatch(/^Listed .*2022/);
		expect(first?.nextElementSibling?.className).toBe("btns");
	});

	it("warns only where item level caps the sockets", () => {
		rows();
		annotateResults(document, capture, {
			...OFF,
			listingTime: false,
			socketWarning: true,
		});
		// Fixture levels 86, 35 and 75: only the level 35 body armour is capped (5).
		expect(marks(SOCKETS_ATTR)).toEqual(["Item level 35: at most 5 sockets"]);
	});

	it("removes its notes when switched off and does not duplicate them", () => {
		rows();
		const on = { ...OFF, listingTime: true, socketWarning: true };
		annotateResults(document, capture, on);
		annotateResults(document, capture, on);
		expect(marks(LISTED_ATTR)).toHaveLength(items.length);
		annotateResults(document, capture, {
			...OFF,
			listingTime: false,
			socketWarning: false,
		});
		expect(marks(LISTED_ATTR)).toEqual([]);
		expect(marks(SOCKETS_ATTR)).toEqual([]);
	});
});

describe("item tools", () => {
	it("shows the affix count from mod tiers", () => {
		rows();
		annotateResults(document, poe1Capture(), { ...OFF, affixCount: true });
		const tools = document.querySelector(`[${TOOLS_ATTR}]`);
		expect(tools?.textContent).toBe("2P · 3S");
		expect(tools?.querySelector("span")?.title).toBe("2 prefixes, 3 suffixes");
	});

	it("copies PoE1's own game text", async () => {
		rows();
		const copied: string[] = [];
		annotateResults(
			document,
			poe1Capture(),
			{ ...OFF, itemTools: true },
			undefined,
			async (text) => {
				copied.push(text);
			},
		);
		document
			.querySelector<HTMLButtonElement>(`[${TOOLS_ATTR}] button`)
			?.click();
		await Promise.resolve();
		expect(copied).toEqual([items[0]?.text]);
		expect(copied[0]).toMatch(/^Item Class: Body Armours/);
	});

	it("links the base type's wiki page in a new tab without an opener", () => {
		rows();
		annotateResults(document, poe1Capture(), { ...OFF, itemTools: true });
		const link = document.querySelector<HTMLAnchorElement>(`[${TOOLS_ATTR}] a`);
		expect(link?.href).toBe("https://www.poewiki.net/wiki/Astral_Plate");
		expect(link?.target).toBe("_blank");
		expect(link?.rel).toContain("noopener");
	});

	it("does not rebuild unchanged tools", () => {
		rows();
		const options = { ...OFF, affixCount: true, itemTools: true };
		annotateResults(document, poe1Capture(), options);
		const first = document.querySelector(`[${TOOLS_ATTR}]`);
		annotateResults(document, poe1Capture(), options);
		expect(document.querySelector(`[${TOOLS_ATTR}]`)).toBe(first);
		annotateResults(document, poe1Capture(), OFF);
		expect(document.querySelector(`[${TOOLS_ATTR}]`)).toBe(null);
	});
});
