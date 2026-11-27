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
		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(watcher))
			if (!same(value, oldFields.get(key))) patch[key] = value;
		if (Object.keys(patch).length > 0)
			ops.push({ op: "update", id: watcher.id, patch });
	}
	return ops;
}

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

function patched(watcher: Watcher, patch: Record<string, unknown>): Watcher {
	const parsed = v.safeParse(WatcherSchema, {
		...watcher,
		...patch,
		id: watcher.id,
	});
	return parsed.success ? parsed.output : watcher;
}

/**
 * Applies operations to the stored list. An update or removal of a watcher
 * that is gone does nothing, so a late edit never brings one back.
 */
export function applyWatcherOps(
	current: readonly Watcher[],
	ops: readonly WatcherOp[],
): Watcher[] {
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
			case "update":
				out = out.map((w) => (w.id === op.id ? patched(w, op.patch) : w));
				break;
		}
	}
	return out;
}
