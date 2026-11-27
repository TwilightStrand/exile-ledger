import * as v from "valibot";
import { type Watcher, WatcherSchema } from "./watchers";

/**
 * One change a tab or the settings page asks the background to make to the
 * stored watchers. Changes travel as operations rather than whole lists, so
 * the background can apply them to what is stored at that moment: a list
 * read earlier would bring back watchers removed meanwhile and drop results
 * a background pass wrote meanwhile.
 */
export const WatcherOpSchema = v.variant("op", [
	v.object({ op: v.literal("add"), watcher: WatcherSchema }),
	v.object({ op: v.literal("remove"), id: v.string() }),
	/** Only the fields the sender changed, so fields it did not touch keep their latest values. */
	v.object({
		op: v.literal("update"),
		id: v.string(),
		patch: v.record(v.string(), v.unknown()),
	}),
	/**
	 * The new results the sender showed, now seen. Named rather than sent as
	 * the emptied list, so results a pass found after the sender read the
	 * list stay new.
	 */
	v.object({
		op: v.literal("markSeen"),
		id: v.string(),
		ids: v.array(v.string()),
	}),
]);
export type WatcherOp = v.InferOutput<typeof WatcherOpSchema>;

const same = (a: unknown, b: unknown) =>
	JSON.stringify(a) === JSON.stringify(b);

/** The operations that turn `before` into `after`. */
export function diffWatchers(
	before: readonly Watcher[],
	after: readonly Watcher[],
): WatcherOp[] {
	const was = new Map(before.map((w) => [w.id, w]));
	const kept = new Set(after.map((w) => w.id));
	const ops: WatcherOp[] = before
		.filter((w) => !kept.has(w.id))
		.map((w) => ({ op: "remove", id: w.id }));
	for (const watcher of after) {
		const old = was.get(watcher.id);
		if (!old) {
			ops.push({ op: "add", watcher });
			continue;
		}
		const oldFields = new Map<string, unknown>(Object.entries(old));
		const seen = seenIds(old, watcher);
		if (seen !== null && seen.length > 0)
			ops.push({ op: "markSeen", id: watcher.id, ids: seen });
		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(watcher))
			if (
				!(seen !== null && key === "newIds") &&
				!same(value, oldFields.get(key))
			)
				patch[key] = value;
		if (Object.keys(patch).length > 0)
			ops.push({ op: "update", id: watcher.id, patch });
	}
	return ops;
}

/**
 * The new results `after` dropped from `before`, when that is all that
 * happened to them on the same search; null when the list changed some other
 * way and has to travel as a value.
 */
function seenIds(before: Watcher, after: Watcher): string[] | null {
	if (before.kind !== "search" || after.kind !== "search") return null;
	if (!sameSearch(before, after)) return null;
	const kept = new Set(after.newIds);
	if (after.newIds.some((id) => !before.newIds.includes(id))) return null;
	return before.newIds.filter((id) => !kept.has(id));
}

const sameSearch = (a: Watcher, b: Watcher) =>
	a.league === b.league &&
	(a.kind !== "search" || b.kind !== "search" || same(a.query, b.query));

/**
 * Whether two watchers watch the same thing, the way the panel's toggles
 * tell: two tabs that both saw a listing unwatched would otherwise add it
 * twice.
 */
function sameTarget(a: Watcher, b: Watcher): boolean {
	if (a.kind === "listing" && b.kind === "listing")
		return a.itemId === b.itemId;
	return (
		a.kind === "search" &&
		b.kind === "search" &&
		a.bookmarkId !== null &&
		a.bookmarkId === b.bookmarkId
	);
}

/**
 * What a watcher knows from checking its search. Cleared whenever the search
 * or league changes, whatever the patch says: a sender that read the list
 * before a pass would otherwise leave that pass's results for the old search
 * on the new one.
 */
const FRESH_CHECKS = {
	lastCheckedAt: null,
	failures: 0,
	retryAt: null,
} as const;
const freshSearch = () => ({
	seenIds: [],
	newIds: [],
	total: null,
});

function patched(
	watcher: Watcher,
	patch: Record<string, unknown>,
): Watcher | null {
	const parsed = v.safeParse(WatcherSchema, {
		...watcher,
		...patch,
		id: watcher.id,
	});
	if (!parsed.success || parsed.output.kind !== watcher.kind) return null;
	const next = parsed.output;
	if (sameSearch(watcher, next)) return next;
	return next.kind === "search"
		? { ...next, ...FRESH_CHECKS, ...freshSearch() }
		: { ...next, ...FRESH_CHECKS };
}

/**
 * Applies operations to the stored list. An update or removal of a watcher
 * that is gone does nothing, so a late edit never brings one back. A batch
 * with an update that does not validate is refused whole (`ok` false), so
 * the sender can roll back instead of showing a change that was not stored.
 */
export function applyWatcherOps(
	current: readonly Watcher[],
	ops: readonly WatcherOp[],
): { ok: boolean; watchers: Watcher[] } {
	let out = [...current];
	for (const op of ops) {
		switch (op.op) {
			case "add":
				if (
					!out.some((w) => w.id === op.watcher.id || sameTarget(w, op.watcher))
				)
					out.push(op.watcher);
				break;
			case "remove":
				out = out.filter((w) => w.id !== op.id);
				break;
			case "update": {
				const target = out.find((w) => w.id === op.id);
				if (!target) break;
				const next = patched(target, op.patch);
				if (!next) return { ok: false, watchers: [...current] };
				out = out.map((w) => (w === target ? next : w));
				break;
			}
			case "markSeen": {
				const seen = new Set(op.ids);
				out = out.map((w) =>
					w.id === op.id && w.kind === "search"
						? { ...w, newIds: w.newIds.filter((id) => !seen.has(id)) }
						: w,
				);
				break;
			}
		}
	}
	return { ok: true, watchers: out };
}
