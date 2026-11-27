import {
	type HeaderSource,
	limiterBucket,
	type RateLimiter,
	type RequestKind,
} from "./rateLimit";

export interface QueueResponse {
	status: number;
	headers: HeaderSource;
	json(): Promise<unknown>;
}

export interface QueuePorts {
	fetch(url: string, init: RequestInit): Promise<QueueResponse>;
	now(): number;
	sleep(ms: number): Promise<void>;
}

export type QueueResult =
	| { ok: true; status: number; body: unknown }
	| {
			ok: false;
			status: number;
			reason: "rate-limited" | "deferred" | "http" | "network";
	  };

// By name, not class: DOMException is not an Error subclass in every runtime.
const isAbort = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"name" in error &&
	(error.name === "TimeoutError" || error.name === "AbortError");

/**
 * Runs the extension's own trade requests one at a time, each after the rate
 * limiter allows it. Serial on purpose: watchers are background work, and a
 * burst would only spend budget the user needs for searching by hand.
 */
export function createTradeQueue(limiter: RateLimiter, ports: QueuePorts) {
	let tail: Promise<unknown> = Promise.resolve();

	const run = async (
		kind: RequestKind,
		url: string,
		init: RequestInit,
		maxWaitMs: number,
	): Promise<QueueResult> => {
		const bucket = limiterBucket(url, kind);
		const wait = limiter.delayFor(bucket, ports.now());
		// A background that waits too long is stopped by the browser mid-sleep;
		// the caller's next alarm tries again instead.
		if (wait > maxWaitMs) return { ok: false, status: 0, reason: "deferred" };
		if (wait > 0) await ports.sleep(wait);
		limiter.record(bucket, ports.now());
		let response: QueueResponse;
		try {
			response = await ports.fetch(url, init);
		} catch {
			return { ok: false, status: 0, reason: "network" };
		}
		limiter.observe(bucket, response.status, response.headers, ports.now());
		if (response.status === 429)
			return { ok: false, status: 429, reason: "rate-limited" };
		if (response.status < 200 || response.status >= 300)
			return { ok: false, status: response.status, reason: "http" };
		try {
			return { ok: true, status: response.status, body: await response.json() };
		} catch (error) {
			// The request timeout also aborts reading the body; that is the
			// connection failing, not the server refusing.
			return {
				ok: false,
				status: response.status,
				reason: isAbort(error) ? "network" : "http",
			};
		}
	};

	return {
		enqueue(
			kind: RequestKind,
			url: string,
			init: RequestInit = {},
			maxWaitMs = Number.POSITIVE_INFINITY,
		): Promise<QueueResult> {
			const result = tail.then(() => run(kind, url, init, maxWaitMs));
			tail = result.catch(() => {});
			return result;
		},
	};
}

export type TradeQueue = ReturnType<typeof createTradeQueue>;
