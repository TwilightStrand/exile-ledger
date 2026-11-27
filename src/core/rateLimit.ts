/**
 * Pacing for requests the extension makes to the trade API itself (watchers,
 * multi live search). GGG publishes its limits on every response:
 *
 *   X-Rate-Limit-Rules: Account,Ip
 *   X-Rate-Limit-Ip: 8:10:60,15:60:120        max hits : window s : penalty s
 *   X-Rate-Limit-Ip-State: 1:10:0,1:60:0      hits so far : window s : active penalty s
 *   Retry-After: 60                            on 429
 *
 * Each endpoint family has its own policy (search and fetch differ), so state
 * is kept per kind. The page's own requests share the same budget, which is
 * why the server's reported hits count, not just ours.
 */

import * as v from "valibot";

export const REQUEST_KINDS = ["search", "fetch"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

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
 * Gap between requests while no response has told us the limits yet: after a
 * browser restart, or when the server answers without rate limit headers.
 * GGG's tightest published search window is about one request per 10 s.
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

/** Everything the limiter knows, to carry across a background restart. */
export const LimiterSnapshotSchema = v.record(
	v.picklist(REQUEST_KINDS),
	KindStateSchema,
);
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
	const kinds = new Map<RequestKind, KindState>();
	const stateOf = (kind: RequestKind): KindState => {
		let state = kinds.get(kind);
		if (!state) {
			state = { rules: [], blockedUntil: 0, sent: [] };
			kinds.set(kind, state);
		}
		return state;
	};

	return {
		/** Milliseconds to wait before the next request of this kind may go out. */
		delayFor(kind: RequestKind, now: number): number {
			const state = stateOf(kind);
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

		record(kind: RequestKind, now: number): void {
			const state = stateOf(kind);
			const longest = Math.max(0, ...state.rules.map((r) => r.rule.periodMs));
			state.sent = [...state.sent.filter((t) => t > now - longest), now];
		},

		/** When the last running penalty ends, 0 when none is running. */
		blockedUntil(): number {
			return Math.max(0, ...[...kinds.values()].map((s) => s.blockedUntil));
		},

		/**
		 * The whole state, to keep across a background restart. The browser
		 * stops an idle background often; a fresh limiter that forgot the
		 * server's counts would send unpaced into a window that is already full.
		 */
		snapshot(): LimiterSnapshot {
			const out: LimiterSnapshot = {};
			for (const [kind, state] of kinds)
				out[kind] = {
					rules: state.rules.map((r) => ({ ...r, rule: { ...r.rule } })),
					blockedUntil: state.blockedUntil,
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
			for (const kind of REQUEST_KINDS) {
				const kept = saved[kind];
				if (!kept) continue;
				const state = stateOf(kind);
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
			kind: RequestKind,
			status: number,
			headers: HeaderSource,
			now: number,
		): void {
			const state = stateOf(kind);
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
