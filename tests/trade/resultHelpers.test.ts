import { afterEach, describe, expect, it } from "vitest";
import { parseFetchResponse } from "../../src/core/tradeApi";
import type { CaptureState } from "../../src/trade/captureFeed";
import {
	annotateResults,
	LISTED_ATTR,
	SOCKETS_ATTR,
} from "../../src/trade/resultHelpers";
import poe1Fetch from "../fixtures/trade/poe1-fetch-response.json";

const items = parseFetchResponse(poe1Fetch) ?? [];
const capture: CaptureState = { search: null, results: items };

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
			listingTime: false,
			socketWarning: true,
		});
		// Fixture levels 86, 35 and 75: only the level 35 body armour is capped (5).
		expect(marks(SOCKETS_ATTR)).toEqual(["Item level 35: at most 5 sockets"]);
	});

	it("removes its notes when switched off and does not duplicate them", () => {
		rows();
		const on = { listingTime: true, socketWarning: true };
		annotateResults(document, capture, on);
		annotateResults(document, capture, on);
		expect(marks(LISTED_ATTR)).toHaveLength(items.length);
		annotateResults(document, capture, {
			listingTime: false,
			socketWarning: false,
		});
		expect(marks(LISTED_ATTR)).toEqual([]);
		expect(marks(SOCKETS_ATTR)).toEqual([]);
	});
});
