import * as v from "valibot";
import {
	decodeChunks,
	encodeChunks,
	SYNC_BUDGET_BYTES,
	syncBytes,
} from "./chunk";
import { emptyLibrary, parseLibrary } from "./library";
import { mergeLibraries } from "./merge";
import type { Library } from "./model";

export const META_KEY = "el:meta";
export const chunkKey = (i: number) => `el:c${i}`;
/** storage.sync's total quota in both browsers. */
export const SYNC_QUOTA_BYTES = 102_400;

/** Storage access, injected so two simulated installs can share one sync area in tests. */
export interface SyncPorts {
	readLocal(): Promise<Library>;
	writeLocal(library: Library): Promise<void>;
	readSync(): Promise<Record<string, unknown>>;
	writeSync(items: Record<string, unknown>): Promise<void>;
	removeSync(keys: string[]): Promise<void>;
	now(): number;
	newWriteId(): string;
}

export type SyncState = "on" | "off" | "error" | "quota" | "waiting";

export interface SyncStatus {
	state: SyncState;
	usedBytes: number;
	quotaBytes: number;
	lastSyncAt: number | null;
	/** The browser's own error text, only in the "error" state; the UI words every other state. */
	error: string | null;
}

export const OFF_STATUS: SyncStatus = {
	state: "off",
	usedBytes: 0,
	quotaBytes: SYNC_QUOTA_BYTES,
	lastSyncAt: null,
	error: null,
};

const MetaSchema = v.object({
	version: v.literal(1),
	chunks: v.pipe(v.number(), v.integer(), v.minValue(1)),
	writeId: v.string(),
});

const MetaShape = v.object({ version: v.literal(1) });

type Remote =
	| { kind: "empty" }
	| { kind: "ok"; library: Library }
	| { kind: "partial" };

/**
 * Every chunk is prefixed with the write id from the meta item, so a reader
 * that lands between another machine's chunk writes sees a mismatch and
 * waits, instead of merging half a document.
 */
async function readRemote(items: Record<string, unknown>): Promise<Remote> {
	const meta = v.safeParse(MetaSchema, items[META_KEY]);
	if (!meta.success) {
		// A meta we wrote but cannot read is damage, not an empty sync area.
		return v.is(MetaShape, items[META_KEY])
			? { kind: "partial" }
			: { kind: "empty" };
	}
	const parts: string[] = [];
	for (let i = 0; i < meta.output.chunks; i++) {
		const raw = items[chunkKey(i)];
		const prefix = `${meta.output.writeId}|`;
		if (typeof raw !== "string" || !raw.startsWith(prefix))
			return { kind: "partial" };
		parts.push(raw.slice(prefix.length));
	}
	const decoded = await decodeChunks(parts);
	return decoded === null
		? { kind: "partial" }
		: { kind: "ok", library: parseLibrary(decoded) };
}

const same = (a: Library, b: Library) =>
	JSON.stringify(a) === JSON.stringify(b);

export interface SyncOptions {
	/**
	 * Overwrite a remote that keeps reading as half-written. That happens when a
	 * write was cut off between chunks and meta (a quota error, or two machines
	 * interleaving), and no reader would ever rewrite it otherwise. Nothing is
	 * lost: every machine still holds its own edits and merges them back in.
	 */
	replaceDamaged?: boolean;
}

/** One pull-merge-push pass. Writes each side only when it actually changed. */
export async function syncOnce(
	ports: SyncPorts,
	options: SyncOptions = {},
): Promise<SyncStatus> {
	const now = ports.now();
	try {
		const items = await ports.readSync();
		const read = await readRemote(items);
		const remote: Remote =
			read.kind === "partial" && options.replaceDamaged
				? { kind: "empty" }
				: read;
		if (remote.kind === "partial") {
			return {
				state: "waiting",
				usedBytes: syncBytes(items),
				quotaBytes: SYNC_QUOTA_BYTES,
				lastSyncAt: null,
				error: null,
			};
		}
		const remoteLibrary =
			remote.kind === "ok" ? remote.library : emptyLibrary();
		const local = await ports.readLocal();
		const merged = mergeLibraries(local, remoteLibrary, now);

		if (!same(merged, local)) await ports.writeLocal(merged);

		let usedBytes = syncBytes(items);
		if (remote.kind === "empty" || !same(merged, remoteLibrary)) {
			const writeId = ports.newWriteId();
			const chunks = await encodeChunks(merged);
			const next: Record<string, unknown> = {
				[META_KEY]: { version: 1, chunks: chunks.length, writeId },
			};
			chunks.forEach((c, i) => {
				next[chunkKey(i)] = `${writeId}|${c}`;
			});
			const bytes = syncBytes(next);
			if (bytes > SYNC_BUDGET_BYTES) {
				return {
					state: "quota",
					usedBytes,
					quotaBytes: SYNC_QUOTA_BYTES,
					lastSyncAt: null,
					error: null,
				};
			}
			// Chunks first, meta last: readers trust only chunks that match the meta's write id.
			const { [META_KEY]: meta, ...chunkItems } = next;
			await ports.writeSync(chunkItems);
			await ports.writeSync({ [META_KEY]: meta });
			const stale = Object.keys(items).filter(
				(key) => key.startsWith("el:c") && !(key in next),
			);
			if (stale.length > 0) await ports.removeSync(stale);
			usedBytes = bytes;
		}
		return {
			state: "on",
			usedBytes,
			quotaBytes: SYNC_QUOTA_BYTES,
			lastSyncAt: now,
			error: null,
		};
	} catch (error) {
		return {
			state: "error",
			usedBytes: 0,
			quotaBytes: SYNC_QUOTA_BYTES,
			lastSyncAt: null,
			error: error instanceof Error ? error.message : null,
		};
	}
}

const StatusSchema = v.object({
	state: v.picklist(["on", "off", "error", "quota", "waiting"]),
	usedBytes: v.number(),
	quotaBytes: v.number(),
	lastSyncAt: v.nullable(v.number()),
	error: v.nullable(v.string()),
});

export function parseSyncStatus(raw: unknown): SyncStatus {
	const parsed = v.safeParse(StatusSchema, raw);
	return parsed.success ? parsed.output : OFF_STATUS;
}
