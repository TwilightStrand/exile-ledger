import { describe, expect, it, vi } from "vitest";
import {
	type CapturedExchange,
	installInterceptor,
} from "../../src/trade/interceptor";

const SEARCH_URL =
	"https://www.pathofexile.com/api/trade2/search/poe2/Standard";

function fakeWindow(fetchImpl: typeof fetch) {
	return {
		location: {
			href: "https://www.pathofexile.com/trade2/search/poe2/Standard",
		},
		fetch: fetchImpl,
		XMLHttpRequest: class {},
	};
}

describe("installInterceptor (fetch)", () => {
	it("reports API exchanges and leaves the page's response readable", async () => {
		const original = vi.fn(
			async () => new Response(JSON.stringify({ id: "abc" }), { status: 200 }),
		);
		const win = fakeWindow(original);
		const seen: CapturedExchange[] = [];
		installInterceptor(win, (e) => seen.push(e));

		const res = await win.fetch(SEARCH_URL, {
			method: "POST",
			body: JSON.stringify({ query: {} }),
		});

		expect(await res.json()).toEqual({ id: "abc" });
		await vi.waitFor(() => expect(seen).toHaveLength(1));
		expect(seen[0]).toEqual({
			url: SEARCH_URL,
			method: "POST",
			requestBody: '{"query":{}}',
			responseBody: '{"id":"abc"}',
		});
		expect(original).toHaveBeenCalledOnce();
	});

	it("ignores requests outside the trade API", async () => {
		const win = fakeWindow(async () => new Response("{}"));
		const seen: CapturedExchange[] = [];
		installInterceptor(win, (e) => seen.push(e));

		await win.fetch("https://www.pathofexile.com/api/trade/data/stats");
		await win.fetch("https://web.poecdn.com/image.png");
		await new Promise((r) => setTimeout(r, 0));
		expect(seen).toEqual([]);
	});

	it("does not report failed responses", async () => {
		const win = fakeWindow(async () => new Response("{}", { status: 429 }));
		const seen: CapturedExchange[] = [];
		installInterceptor(win, (e) => seen.push(e));

		await win.fetch(SEARCH_URL, { method: "POST", body: "{}" });
		await new Promise((r) => setTimeout(r, 0));
		expect(seen).toEqual([]);
	});
});

describe("installInterceptor (XMLHttpRequest)", () => {
	it("reports API exchanges made with XHR", async () => {
		const listeners: Array<() => void> = [];
		class FakeXhr {
			status = 0;
			responseText = "";
			open(_method: string, _url: string) {}
			send(_body?: string) {
				this.status = 200;
				this.responseText = '{"id":"xhr"}';
				for (const l of listeners) l();
			}
			addEventListener(_type: string, l: () => void) {
				listeners.push(l);
			}
		}
		const win = {
			location: { href: "https://www.pathofexile.com/trade/search/Standard" },
			fetch: async () => new Response("{}"),
			XMLHttpRequest: FakeXhr,
		};
		const seen: CapturedExchange[] = [];
		installInterceptor(win, (e) => seen.push(e));

		const xhr = new win.XMLHttpRequest();
		xhr.open("POST", "/api/trade/search/Standard");
		xhr.send('{"query":{}}');

		expect(seen).toEqual([
			{
				url: "https://www.pathofexile.com/api/trade/search/Standard",
				method: "POST",
				requestBody: '{"query":{}}',
				responseBody: '{"id":"xhr"}',
			},
		]);
	});
});
