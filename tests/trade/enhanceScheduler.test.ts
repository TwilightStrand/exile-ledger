import { afterEach, describe, expect, it } from "vitest";
import { CAPTURE_LIMIT } from "../../src/trade/captureFeed";
import { scheduleEnhance } from "../../src/trade/enhanceScheduler";

const row = (id: string) =>
	`<div class="row" data-id="${id}"><div class="content"><div class="explicitMod">mod</div></div><div class="details"><div class="btns"></div></div></div>`;

function page(count: number) {
	const ids = Array.from({ length: count }, (_, i) => `id-${i}`);
	document.body.innerHTML = `<div class="resultset">${ids.map(row).join("")}</div><div id="other"></div>`;
}

const frame = () => new Promise((r) => setTimeout(r, 40));

/** Writes a mark into each row it gets, as the real enhancers do. */
function recorder() {
	const passes: string[][] = [];
	const enhance = (rows: HTMLElement[]) => {
		passes.push(rows.map((r) => r.dataset.id ?? ""));
		for (const r of rows) {
			r.querySelector(".btns")?.append(document.createElement("button"));
		}
	};
	return { passes, enhance };
}

let stop = () => {};
afterEach(() => {
	stop();
	Object.defineProperty(document, "hidden", {
		configurable: true,
		get: () => false,
	});
	document.body.innerHTML = "";
});

describe("scheduleEnhance", () => {
	it("batches triggers into one pass per frame and ignores other DOM changes", async () => {
		page(3);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		scheduler.items(["id-1"]);
		scheduler.all();
		await frame();
		expect(passes).toEqual([["id-0", "id-1", "id-2"]]);

		document.getElementById("other")?.append(document.createElement("span"));
		await frame();
		expect(passes).toHaveLength(1);
	});

	it("does not wake again for its own marks", async () => {
		page(5);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		await frame();
		await frame();
		expect(passes).toHaveLength(1);
	});

	it("handles a new live-search result with one pass over its row only", async () => {
		page(500);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		await frame();
		passes.length = 0;

		// The capture arrives and the site inserts the row in the same frame.
		scheduler.items(["new"]);
		document
			.querySelector(".resultset")
			?.insertAdjacentHTML("afterbegin", row("new"));
		await frame();
		await frame();
		expect(passes).toEqual([["new"]]);
	});

	it("reworks rows the site reuses or rebuilds, and rows whose listing just arrived", async () => {
		page(3);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		await frame();
		passes.length = 0;

		const rows = document.querySelectorAll<HTMLElement>(".row");
		const [first, second] = rows;
		if (!first || !second) throw new Error("rows");
		first.dataset.id = "reused";
		second.querySelector(".content")?.replaceChildren();
		await frame();
		expect(passes).toEqual([["reused", "id-1"]]);

		scheduler.items(["id-2"]);
		await frame();
		expect(passes.at(-1)).toEqual(["id-2"]);
	});

	it("still runs for a results change with no row work, so the caller can refresh the title", async () => {
		page(2);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		await frame();
		document
			.querySelector(".resultset")
			?.append(document.createElement("span"));
		await frame();
		expect(passes).toEqual([["id-0", "id-1"], []]);
	});

	it("waits while the tab is hidden and catches up when it shows", async () => {
		page(2);
		let hidden = true;
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => hidden,
		});
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		scheduler.items(["id-1"]);
		await frame();
		expect(passes).toHaveLength(0);

		hidden = false;
		document.dispatchEvent(new Event("visibilitychange"));
		await frame();
		expect(passes).toEqual([["id-0", "id-1"]]);
	});

	it("stops collecting ids in a hidden tab past the feed's cap and redoes every row instead", async () => {
		page(3);
		const { passes, enhance } = recorder();
		const scheduler = scheduleEnhance(document, enhance);
		stop = scheduler.stop;
		scheduler.all();
		await frame();
		let hidden = true;
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => hidden,
		});
		scheduler.items(
			Array.from({ length: CAPTURE_LIMIT + 1 }, (_, i) => `gone-${i}`),
		);
		hidden = false;
		document.dispatchEvent(new Event("visibilitychange"));
		await frame();
		expect(passes.at(-1)).toEqual(["id-0", "id-1", "id-2"]);
	});
});
