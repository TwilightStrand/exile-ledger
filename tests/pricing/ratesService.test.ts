import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { RATES_TTL_MS } from "../../src/core/pricing";
import { getRates, RATES_KEEP_MS } from "../../src/pricing/ratesService";
import poe2 from "../fixtures/poe-ninja/poe2-currency-standard.json";

describe("getRates", () => {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(poe2)));

	beforeEach(() => {
		fakeBrowser.reset();
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockClear();
	});
	afterEach(() => vi.unstubAllGlobals());

	it("does not contact poe.ninja without the permission", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => false,
		);
		expect(await getRates("poe2", "Standard", 1)).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fetches once and serves from cache for 30 minutes", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => true,
		);
		const first = await getRates("poe2", "Standard", 1000);
		expect(first?.values.exalted).toBeCloseTo(0.006241);
		await getRates("poe2", "Standard", 1000 + RATES_TTL_MS - 1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await getRates("poe2", "Standard", 1000 + RATES_TTL_MS);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("falls back to stale rates when poe.ninja fails", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => true,
		);
		await getRates("poe2", "Standard", 1000);
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		const stale = await getRates("poe2", "Standard", 1000 + RATES_TTL_MS * 3);
		expect(stale?.fetchedAt).toBe(1000);
	});
});

describe("getRates storage", () => {
	beforeEach(() => {
		fakeBrowser.reset();
		vi.stubGlobal("fetch", async () => new Response(JSON.stringify(poe2)));
	});
	afterEach(() => vi.unstubAllGlobals());

	it("drops other leagues' rates once they are past keeping, and leaves other keys alone", async () => {
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => true,
		);
		const now = RATES_KEEP_MS * 3;
		await getRates("poe2", "Old League", 1);
		await getRates("poe2", "Recent League", now - RATES_KEEP_MS + 1);
		await browser.storage.local.set({
			"ninja:poe1:Broken": { nope: true },
			library: { kept: true },
		});
		await getRates("poe2", "Standard", now);
		const keys = Object.keys(await browser.storage.local.get(null)).sort();
		expect(keys).toEqual([
			"library",
			"ninja:poe2:Recent League",
			"ninja:poe2:Standard",
		]);
	});
});

describe("getRates cleanup failures and races", () => {
	beforeEach(() => {
		fakeBrowser.reset();
		vi.stubGlobal("fetch", async () => new Response(JSON.stringify(poe2)));
		vi.spyOn(browser.permissions, "contains").mockImplementation(
			async () => true,
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns fresh rates when the cleanup cannot read storage", async () => {
		const get = browser.storage.local.get.bind(browser.storage.local);
		vi.spyOn(browser.storage.local, "get").mockImplementation((keys) =>
			keys === null ? Promise.reject(new Error("quota")) : get(keys),
		);
		const rates = await getRates("poe2", "Standard", 1000);
		expect(rates?.fetchedAt).toBe(1000);
	});

	it("keeps a key another call refreshed after the cleanup looked", async () => {
		const now = RATES_KEEP_MS * 3;
		await getRates("poe2", "Other", 1);
		const get = browser.storage.local.get.bind(browser.storage.local);
		vi.spyOn(browser.storage.local, "get").mockImplementation(async (keys) => {
			const result = await get(keys);
			// Between the cleanup's snapshot and its removal, another tab refreshes Other.
			const old = result["ninja:poe2:Other"];
			if (keys === null && typeof old === "object" && old !== null)
				await browser.storage.local.set({
					"ninja:poe2:Other": { ...old, fetchedAt: now },
				});
			return result;
		});
		await getRates("poe2", "Standard", now);
		vi.restoreAllMocks();
		const stored = await browser.storage.local.get("ninja:poe2:Other");
		expect(stored["ninja:poe2:Other"]).toMatchObject({ fetchedAt: now });
	});
});
