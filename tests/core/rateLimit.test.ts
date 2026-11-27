import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../src/core/rateLimit";
import { createTradeQueue, type QueuePorts } from "../../src/core/tradeQueue";

const headers = (values: Record<string, string>) => ({
	get: (name: string) => values[name] ?? null,
});

/**
 * A stand-in for GGG's trade API: counts every hit (ours and, optionally, the
 * page's own) per rule window, reports it in the state headers like the real
 * API, and answers 429 once a window is exceeded.
 */
function fakeServer(rules: { max: number; periodS: number }[]) {
	const clock = { now: 0 };
	const hits: number[] = [];
	let overLimit = 0;
	const stateFor = (at: number) =>
		rules
			.map(({ periodS }) => {
				const inWindow = hits.filter((t) => t > at - periodS * 1000).length;
				return `${inWindow}:${periodS}:0`;
			})
			.join(",");
	const limitHeader = rules.map((r) => `${r.max}:${r.periodS}:60`).join(",");
	const ports: QueuePorts = {
		now: () => clock.now,
		sleep: async (ms) => {
			clock.now += ms;
		},
		fetch: async () => {
			hits.push(clock.now);
			const exceeded = rules.some(
				({ max, periodS }) =>
					hits.filter((t) => t > clock.now - periodS * 1000).length > max,
			);
			if (exceeded) overLimit++;
			clock.now += 50;
			return {
				status: exceeded ? 429 : 200,
				headers: headers({
					"X-Rate-Limit-Rules": "Ip",
					"X-Rate-Limit-Ip": limitHeader,
					"X-Rate-Limit-Ip-State": stateFor(clock.now),
					...(exceeded ? { "Retry-After": "60" } : {}),
				}),
				json: async () => ({ result: [] }),
			};
		},
	};
	return {
		ports,
		clock,
		pageRequest: () => hits.push(clock.now),
		overLimit: () => overLimit,
		hitCount: () => hits.length,
		/** Most hits that fell in any one window of this length. */
		peak: (periodS: number) =>
			Math.max(
				0,
				...hits.map(
					(t) => hits.filter((u) => u >= t && u < t + periodS * 1000).length,
				),
			),
	};
}

describe("trade queue with the rate limiter", () => {
	it("never exceeds GGG's advertised windows over a long burst", async () => {
		const server = fakeServer([
			{ max: 8, periodS: 10 },
			{ max: 15, periodS: 60 },
		]);
		const queue = createTradeQueue(createRateLimiter(), server.ports);
		const results = await Promise.all(
			Array.from({ length: 60 }, () =>
				queue.enqueue("fetch", "https://example.test/api/trade/fetch/x"),
			),
		);
		expect(results.every((r) => r.ok)).toBe(true);
		expect(server.overLimit()).toBe(0);
	});

	it("counts the page's own requests the server reports", async () => {
		const server = fakeServer([{ max: 5, periodS: 10 }]);
		const queue = createTradeQueue(createRateLimiter(), server.ports);
		for (let round = 0; round < 20; round++) {
			// The user searches by hand between our checks. Only one such
			// request fits in the headroom: the limiter hears about the page's
			// hits through our next response, not before.
			server.pageRequest();
			const result = await queue.enqueue("search", "https://example.test/s");
			expect(result.ok).toBe(true);
		}
		expect(server.overLimit()).toBe(0);
	});

	it("waits out Retry-After after a 429 before the next request", async () => {
		const limiter = createRateLimiter();
		limiter.observe(
			"fetch",
			429,
			headers({
				"X-Rate-Limit-Rules": "Ip",
				"X-Rate-Limit-Ip": "8:10:60",
				"X-Rate-Limit-Ip-State": "9:10:60",
				"Retry-After": "60",
			}),
			1000,
		);
		expect(limiter.delayFor("fetch", 1000)).toBe(60_000);
		expect(limiter.delayFor("fetch", 61_000)).toBe(0);
		// Search has its own policy and is not blocked by fetch's penalty.
		expect(limiter.delayFor("search", 1000)).toBe(0);
	});

	it("honours an active penalty reported in the state header", () => {
		const limiter = createRateLimiter();
		limiter.observe(
			"search",
			200,
			headers({
				"X-Rate-Limit-Rules": "Account",
				"X-Rate-Limit-Account": "3:5:60",
				"X-Rate-Limit-Account-State": "1:5:30",
			}),
			0,
		);
		expect(limiter.delayFor("search", 0)).toBe(30_000);
	});

	it("reports a 429 to the caller instead of retrying on its own", async () => {
		const ports: QueuePorts = {
			now: () => 0,
			sleep: async () => {},
			fetch: async () => ({
				status: 429,
				headers: headers({ "Retry-After": "5" }),
				json: async () => ({}),
			}),
		};
		const queue = createTradeQueue(createRateLimiter(), ports);
		expect(await queue.enqueue("fetch", "https://example.test")).toEqual({
			ok: false,
			status: 429,
			reason: "rate-limited",
		});
	});

	it("treats a thrown fetch as a network failure", async () => {
		const ports: QueuePorts = {
			now: () => 0,
			sleep: async () => {},
			fetch: async () => {
				throw new Error("offline");
			},
		};
		const queue = createTradeQueue(createRateLimiter(), ports);
		expect((await queue.enqueue("fetch", "https://example.test")).ok).toBe(
			false,
		);
	});

	it("defers instead of sleeping past the caller's limit", async () => {
		const limiter = createRateLimiter();
		limiter.observe("fetch", 429, headers({ "Retry-After": "120" }), 0);
		let fetched = false;
		const queue = createTradeQueue(limiter, {
			now: () => 0,
			sleep: async () => {},
			fetch: async () => {
				fetched = true;
				return { status: 200, headers: headers({}), json: async () => ({}) };
			},
		});
		expect(
			await queue.enqueue("fetch", "https://example.test", {}, 20_000),
		).toEqual({ ok: false, status: 0, reason: "deferred" });
		expect(fetched).toBe(false);
	});

	it("carries a running penalty into a restarted limiter", () => {
		const before = createRateLimiter();
		before.observe("fetch", 429, headers({ "Retry-After": "600" }), 0);
		const after = createRateLimiter();
		after.restore(before.snapshot(), 60_000);
		expect(after.delayFor("fetch", 60_000)).toBe(540_000);
		expect(after.delayFor("search", 60_000)).toBe(0);
	});

	it("carries the server's counts into a restarted limiter", () => {
		const before = createRateLimiter();
		before.observe(
			"search",
			200,
			headers({
				"X-Rate-Limit-Rules": "Ip",
				"X-Rate-Limit-Ip": "30:300:1800",
				"X-Rate-Limit-Ip-State": "29:300:0",
			}),
			0,
		);
		const after = createRateLimiter();
		after.restore(before.snapshot(), 30_000);
		expect(after.delayFor("search", 30_000)).toBe(270_000);
	});

	it("leaves half of every window for the user's own searches", async () => {
		const server = fakeServer([
			{ max: 8, periodS: 10 },
			{ max: 30, periodS: 300 },
		]);
		const queue = createTradeQueue(createRateLimiter(), server.ports);
		for (let i = 0; i < 40; i++)
			await queue.enqueue("search", "https://example.test/s");
		expect(server.peak(10)).toBeLessThanOrEqual(4);
		expect(server.peak(300)).toBeLessThanOrEqual(15);
	});

	it("stays within the windows when the background restarts between requests", async () => {
		const server = fakeServer([{ max: 30, periodS: 300 }]);
		let limiter = createRateLimiter();
		for (let i = 0; i < 40; i++) {
			const next = createRateLimiter();
			next.restore(limiter.snapshot(), server.clock.now);
			limiter = next;
			await createTradeQueue(limiter, server.ports).enqueue(
				"search",
				"https://example.test/s",
			);
		}
		expect(server.overLimit()).toBe(0);
		expect(server.peak(300)).toBeLessThanOrEqual(15);
	});

	it("forgets what a clock that went back stamped in the future", () => {
		const before = createRateLimiter();
		const rules = headers({
			"X-Rate-Limit-Rules": "Ip",
			"X-Rate-Limit-Ip": "8:10:60",
			"X-Rate-Limit-Ip-State": "8:10:0",
		});
		for (const at of [3_600_000, 3_603_000, 3_606_000, 3_609_000]) {
			before.record("search", at);
			before.observe("search", 200, rules, at);
		}
		before.observe(
			"fetch",
			429,
			headers({ "Retry-After": "86400" }),
			3_600_000,
		);
		const after = createRateLimiter();
		after.restore(before.snapshot(), 0);
		expect(after.delayFor("search", 0)).toBe(0);
		expect(after.delayFor("fetch", 0)).toBe(2 * 60 * 60_000);
	});

	it("paces by a fixed gap until a response reports the limits", () => {
		const limiter = createRateLimiter();
		expect(limiter.delayFor("search", 0)).toBe(0);
		limiter.record("search", 0);
		expect(limiter.delayFor("search", 1000)).toBe(9000);
		limiter.observe("search", 502, headers({}), 1000);
		expect(limiter.delayFor("search", 1000)).toBe(9000);
	});
});
