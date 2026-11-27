import { describe, expect, it } from "vitest";
import type { CaptureEvent } from "../../src/trade/capture";
import { CAPTURE_LIMIT, createCaptureFeed } from "../../src/trade/captureFeed";
import { scheduleEnhance } from "../../src/trade/enhanceScheduler";
import { syncPinButtons } from "../../src/trade/pinButtons";
import { annotateResults, TOOLS_ATTR } from "../../src/trade/resultHelpers";

const search = (searchId: string): CaptureEvent => ({
	kind: "search",
	game: "poe2",
	realm: "poe2",
	league: "Standard",
	search: { query: { query: {} }, searchId, total: 3, resultIds: [] },
});

const results = (queryId: string, id: string): CaptureEvent => ({
	kind: "results",
	game: "poe2",
	queryId,
	items: [
		{
			id,
			name: "",
			typeLine: "",
			baseType: "",
			ilvl: null,
			mods: [],
			price: null,
			indexed: null,
			rarity: null,
			text: null,
			corrupted: false,
			seller: null,
			card: null,
			affixes: null,
		},
	],
});

describe("captureFeed", () => {
	it("collects results for the current search and resets on a new one", () => {
		const feed = createCaptureFeed();
		const seen: number[] = [];
		feed.subscribe((s) => seen.push(s.results.size));

		feed.push(search("A"));
		feed.push(results("A", "1"));
		feed.push(results("A", "2"));
		feed.push(results("OLD", "x"));
		expect([...feed.get().results.keys()]).toEqual(["1", "2"]);

		feed.push(search("B"));
		expect(feed.get().results.size).toBe(0);
		expect(seen).toEqual([0, 1, 2, 0]);
	});
});

describe("captureFeed cap", () => {
	it("keeps the newest CAPTURE_LIMIT results, dropping the oldest", () => {
		const feed = createCaptureFeed();
		feed.push(search("A"));
		for (let i = 0; i < CAPTURE_LIMIT + 20; i++)
			feed.push(results("A", `${i}`));
		const ids = [...feed.get().results.keys()];
		expect(ids).toHaveLength(CAPTURE_LIMIT);
		expect(ids[0]).toBe("20");
		expect(ids.at(-1)).toBe(`${CAPTURE_LIMIT + 19}`);
	});

	it("keeps the latest copy of a result fetched twice", () => {
		const feed = createCaptureFeed();
		feed.push(search("A"));
		feed.push(results("A", "1"));
		feed.push(results("A", "2"));
		feed.push(results("A", "1"));
		expect([...feed.get().results.keys()]).toEqual(["2", "1"]);
	});
});

describe("captureFeed cap with rows on the page", () => {
	it("never drops a result whose row the page still shows", () => {
		const count = CAPTURE_LIMIT + 100;
		document.body.innerHTML = `<div class="resultset">${Array.from(
			{ length: count },
			(_, i) =>
				`<div class="row" data-id="${i}"><div class="details"><div class="btns"></div></div></div>`,
		).join("")}</div>`;
		const feed = createCaptureFeed();
		feed.push(search("A"));
		for (let i = 0; i < count; i++) feed.push(results("A", `${i}`));
		expect(feed.get().results.size).toBe(count);

		// A full pass over every row still finds each listing, and Pin reaches it.
		const capture = feed.get();
		annotateResults(document, capture, {
			listingTime: false,
			socketWarning: false,
			affixCount: false,
			itemTools: true,
		});
		expect(document.querySelectorAll(`[${TOOLS_ATTR}]`)).toHaveLength(count);
		const toggled: string[] = [];
		syncPinButtons(document, [], (id) => {
			if (feed.get().results.has(id)) toggled.push(id);
		});
		document
			.querySelector<HTMLButtonElement>('[data-id="0"] [data-exile-ledger-pin]')
			?.click();
		expect(toggled).toEqual(["0"]);

		// Rows the page dropped are capped again on the next fetch.
		for (const row of [...document.querySelectorAll(".row")].slice(0, 200))
			row.remove();
		feed.push(results("A", "new"));
		expect(feed.get().results.size).toBe(CAPTURE_LIMIT);
		expect(feed.get().results.has("0")).toBe(false);
		expect(feed.get().results.has("200")).toBe(true);
		expect(feed.get().results.has("new")).toBe(true);
		document.body.innerHTML = "";
	});

	it("keeps a just-fetched batch whose rows the site has not drawn yet", () => {
		document.body.innerHTML = '<div class="resultset"></div>';
		const list = document.querySelector(".resultset");
		const feed = createCaptureFeed();
		feed.push(search("A"));
		const count = CAPTURE_LIMIT + 100;
		for (let i = 0; i < count; i++) {
			feed.push(results("A", `${i}`));
			list?.insertAdjacentHTML(
				"afterbegin",
				`<div class="row" data-id="${i}"></div>`,
			);
		}
		expect(feed.get().results.size).toBe(count);
		document.body.innerHTML = "";
	});
});

describe("captureFeed with batches the site draws late", () => {
	it("keeps two batches fetched before either is drawn, so a full pass marks every row", async () => {
		const row = (id: string) =>
			`<div class="row" data-id="${id}"><div class="details"><div class="btns"></div></div></div>`;
		document.body.innerHTML = '<div class="resultset"></div>';
		const list = document.querySelector(".resultset");
		if (!list) throw new Error("no list");
		const feed = createCaptureFeed();
		const enhance = (rows: HTMLElement[]) =>
			annotateResults(rows, feed.get(), {
				listingTime: false,
				socketWarning: false,
				affixCount: false,
				itemTools: true,
			});
		const scheduler = scheduleEnhance(document, enhance);
		feed.subscribe((_, event) =>
			event.kind === "search"
				? scheduler.all()
				: scheduler.items(event.items.map((item) => item.id)),
		);
		feed.push(search("A"));
		for (let i = 0; i < CAPTURE_LIMIT - 5; i++) {
			feed.push(results("A", `${i}`));
			list.insertAdjacentHTML("afterbegin", row(`${i}`));
		}
		const first = Array.from({ length: 10 }, (_, k) => `a${k}`);
		const second = Array.from({ length: 10 }, (_, k) => `b${k}`);
		for (const id of first) feed.push(results("A", id));
		for (const id of second) feed.push(results("A", id));
		// The site draws both batches in one step.
		list.insertAdjacentHTML(
			"afterbegin",
			[...first, ...second].map(row).join(""),
		);
		scheduler.all();
		await new Promise((r) => setTimeout(r, 40));
		scheduler.stop();
		expect(list.querySelectorAll(".row")).toHaveLength(CAPTURE_LIMIT + 15);
		expect(document.querySelectorAll(`[${TOOLS_ATTR}]`)).toHaveLength(
			CAPTURE_LIMIT + 15,
		);
		document.body.innerHTML = "";
	});
});
