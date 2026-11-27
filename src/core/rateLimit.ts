/**
 * Pacing for requests the extension makes to the trade API itself (watchers,
 * multi live search). GGG publishes its limits on every response:
 *
 *   X-Rate-Limit-Rules: Account,Ip
 *   X-Rate-Limit-Ip: 8:10:60,15:60:120        max hits : window s : penalty s
 *   X-Rate-Limit-Ip-State: 1:10:0,1:60:0      hits so far : window s : active penalty s
 *   Retry-After: 60                            on 429
 *
 * Each endpoint family has its own policy (search and fetch differ), and each
 * trade host counts on its own, so state is kept per host and kind. PoE1 and
 * PoE2 on the same host share one bucket: whether GGG counts /api/trade and
 * /api/trade2 apart is not published, and sharing can only wait too long.
 * The page's own requests share the same budget, which is why the server's
 * reported hits count, not just ours.
 */

import * as v from "valibot";

export const REQUEST_KINDS = ["search", "fetch"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

/** Which budget a request draws on: its trade host plus the endpoint kind. */
export function limiterBucket(url: string, kind: RequestKind): string {
	const origin = URL.canParse(url) ? new URL(url).origin : url;
	return `${origin} ${kind}`;
}

export interface HeaderSource {
	get(name: string): string | null;
}

interface Rule {
	max: number;
	periodMs: number;
}

interface RuleState {
	rule: Rule;
	/** Hits the server reported for this window when we last heard from it. */
	reportedHits: number;
	observedAt: number;
}

interface KindState {
	rules: RuleState[];
	blockedUntil: number;
	sent: number[];
}

/**
 * The share of every window the extension may fill. The page's own requests
 * only show up in the next response we get, so the rest is room for the user's
 * own searches between two of ours; an overshoot costs them a timeout on the
 * whole site, which is worse than a watcher checking late.
 */
const OUR_SHARE = 0.5;

const ourLimit = (max: number) => Math.max(1, Math.floor(max * OUR_SHARE));

/**
 * Gap between requests until any response has reported the limits, as after
 * a browser restart. GGG's tightest published search window is about one
 * request per 10 s.
 */
const UNKNOWN_LIMITS_GAP_MS = 10_000;

/**
 * Upper bound for a restored penalty. GGG's longest published penalties are
 * an hour; anything far past that is a clock that went back.
 */
const MAX_PENALTY_MS = 2 * 60 * 60_000;

const RuleStateSchema = v.object({
	rule: v.object({ max: v.number(), periodMs: v.number() }),
	reportedHits: v.number(),
	observedAt: v.number(),
});

const KindStateSchema = v.object({
	rules: v.array(RuleStateSchema),
	blockedUntil: v.number(),
	sent: v.array(v.number()),
});

/**
 * Everything the limiter knows, to carry across a background restart. The
 * version tag makes a snapshot saved by an older build, keyed by kind alone,
 * fail to parse and be dropped instead of being read as a host.
 */
export const LimiterSnapshotSchema = v.object({
	version: v.literal(2),
	buckets: v.record(v.string(), KindStateSchema),
});
export type LimiterSnapshot = v.InferOutput<typeof LimiterSnapshotSchema>;

function parseTriples(value: string | null): [number, number, number][] {
	if (!value) return [];
	return value.split(",").flatMap((part) => {
		const [a, b, c] = part.split(":").map((n) => Number.parseInt(n, 10));
		return a !== undefined &&
			b !== undefined &&
			c !== undefined &&
			Number.isFinite(a) &&
			Number.isFinite(b) &&
			Number.isFinite(c)
			? [[a, b, c]]
			: [];
	});
}

export function createRateLimiter() {
	const buckets = new Map<string, KindState>();
	const stateOf = (bucket: string): KindState => {
		let state = buckets.get(bucket);
		if (!state) {
			state = { rules: [], blockedUntil: 0, sent: [] };
			buckets.set(bucket, state);
		}
		return state;
	};

	return {
		/** Milliseconds to wait before the next request in this bucket (see limiterBucket) may go out. */
		delayFor(bucket: string, now: number): number {
			const state = stateOf(bucket);
			let readyAt = state.blockedUntil;
			const last = state.sent.at(-1);
			if (state.rules.length === 0 && last !== undefined)
				readyAt = Math.max(readyAt, last + UNKNOWN_LIMITS_GAP_MS);
			for (const { rule, reportedHits, observedAt } of state.rules) {
				const windowEnd = observedAt + rule.periodMs;
				const limit = ourLimit(rule.max);
				if (now < windowEnd) {
					const ours = state.sent.filter((t) => t > observedAt).length;
					if (reportedHits + ours >= limit)
						readyAt = Math.max(readyAt, windowEnd);
				}
				// Our own sliding window, for when the server has not answered yet.
				const recent = state.sent.filter((t) => t > now - rule.periodMs);
				const oldest = recent[0];
				if (recent.length >= limit && oldest !== undefined)
					readyAt = Math.max(readyAt, oldest + rule.periodMs);
			}
			return Math.max(0, readyAt - now);
		},

		record(bucket: string, now: number): void {
			const state = stateOf(bucket);
			const longest = Math.max(0, ...state.rules.map((r) => r.rule.periodMs));
			state.sent = [...state.sent.filter((t) => t > now - longest), now];
		},

		/** When the last running penalty ends, 0 when none is running. */
		blockedUntil(): number {
			return Math.max(0, ...[...buckets.values()].map((s) => s.blockedUntil));
		},

		/**
		 * The whole state, to keep across a background restart. The browser
		 * stops an idle background often; a fresh limiter that forgot the
		 * server's counts would send unpaced into a window that is already full.
		 */
		snapshot(now: number): LimiterSnapshot {
			const out: LimiterSnapshot = { version: 2, buckets: {} };
			for (const [bucket, state] of buckets)
				out.buckets[bucket] = {
					rules: state.rules.map((r) => ({ ...r, rule: { ...r.rule } })),
					// A penalty already over is dropped: after a clock set back, a
					// stored end time would read as a penalty still running.
					blockedUntil: state.blockedUntil > now ? state.blockedUntil : 0,
					sent: [...state.sent],
				};
			return out;
		},

		/**
		 * Only before the first request of this limiter's life. Anything stamped
		 * after `now` means the clock went back; kept, it would block every
		 * request for as long as the jump, and survive every restart after.
		 */
		restore(saved: LimiterSnapshot, now: number): void {
			for (const [bucket, kept] of Object.entries(saved.buckets)) {
				const state = stateOf(bucket);
				state.rules = kept.rules
					.filter((r) => r.observedAt <= now)
					.map((r) => ({ ...r, rule: { ...r.rule } }));
				state.blockedUntil = Math.max(
					state.blockedUntil,
					Math.min(kept.blockedUntil, now + MAX_PENALTY_MS),
				);
				state.sent = kept.sent.filter((t) => t <= now).sort((a, b) => a - b);
			}
		},

		observe(
			bucket: string,
			status: number,
			headers: HeaderSource,
			now: number,
		): void {
			const state = stateOf(bucket);
			const names = (headers.get("X-Rate-Limit-Rules") ?? "")
				.split(",")
				.map((n) => n.trim())
				.filter(Boolean);
			const rules: RuleState[] = [];
			for (const name of names) {
				const limits = parseTriples(headers.get(`X-Rate-Limit-${name}`));
				const states = parseTriples(headers.get(`X-Rate-Limit-${name}-State`));
				limits.forEach(([max, periodS], i) => {
					const current = states[i];
					rules.push({
						rule: { max, periodMs: periodS * 1000 },
						reportedHits: current?.[0] ?? 0,
						observedAt: now,
					});
					const penalty = current?.[2] ?? 0;
					if (penalty > 0)
						state.blockedUntil = Math.max(
							state.blockedUntil,
							now + penalty * 1000,
						);
				});
			}
			if (rules.length > 0) state.rules = rules;
			if (status === 429) {
				const retry = Number.parseInt(headers.get("Retry-After") ?? "", 10);
				// Without a Retry-After, wait out the longest window we know of.
				const wait = Number.isFinite(retry)
					? retry * 1000
					: Math.max(60_000, ...rules.map((r) => r.rule.periodMs));
				state.blockedUntil = Math.max(state.blockedUntil, now + wait);
			}
		},
	};
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
