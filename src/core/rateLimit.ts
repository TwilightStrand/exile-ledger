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

export type RequestKind = "search" | "fetch";
export const REQUEST_KINDS: readonly RequestKind[] = ["search", "fetch"];

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
 * Hits kept free in every window. The page's own requests only show up in the
 * next response we get, so this is room for one search the user makes by hand
 * between two of ours; an overshoot costs them a timeout on the whole site.
 */
const HEADROOM = 1;

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
			for (const { rule, reportedHits, observedAt } of state.rules) {
				const windowEnd = observedAt + rule.periodMs;
				const limit = rule.max - HEADROOM;
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

		/**
		 * Penalties still running, to keep across a background restart: the
		 * browser stops an idle background, and a fresh limiter that forgot a
		 * 429 would send straight into it.
		 */
		snapshot(): Partial<Record<RequestKind, number>> {
			const out: Partial<Record<RequestKind, number>> = {};
			for (const [kind, state] of kinds)
				if (state.blockedUntil > 0) out[kind] = state.blockedUntil;
			return out;
		},

		restore(saved: Partial<Record<RequestKind, number>>): void {
			for (const kind of REQUEST_KINDS) {
				const until = saved[kind];
				if (until !== undefined)
					stateOf(kind).blockedUntil = Math.max(
						stateOf(kind).blockedUntil,
						until,
					);
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
