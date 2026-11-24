import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { createRatesClient, RATES_RETRY_MS } from "../../src/trade/ratesClient";

describe("createRatesClient", () => {
	let requests = 0;
	beforeEach(() => {
		fakeBrowser.reset();
		requests = 0;
		// No rates for this league: the background answers with nothing.
		browser.runtime.onMessage.addListener(() => {
			requests++;
			return undefined;
		});
	});

	it("asks once per league while a miss is cooling down, then again", async () => {
		let clock = 0;
		const client = createRatesClient(
			() => {},
			() => clock,
		);
		client.get("poe1", "Private");
		await vi.waitFor(() => expect(requests).toBe(1));
		for (let i = 0; i < 20; i++) {
			client.get("poe1", "Private");
			await new Promise((r) => setTimeout(r, 0));
		}
		expect(requests).toBe(1);
		clock = RATES_RETRY_MS;
		client.get("poe1", "Private");
		await vi.waitFor(() => expect(requests).toBe(2));
	});

	it("asks again right away after reset", async () => {
		const client = createRatesClient(() => {});
		client.get("poe2", "Standard");
		await vi.waitFor(() => expect(requests).toBe(1));
		client.reset();
		client.get("poe2", "Standard");
		await vi.waitFor(() => expect(requests).toBe(2));
	});
});
