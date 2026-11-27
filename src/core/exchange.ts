import * as v from "valibot";
import type { Clock } from "./library";
import {
	type Bookmark,
	BookmarkSchema,
	type Folder,
	FolderSchema,
	type Library,
} from "./model";
import { queryFits } from "./query";
import { repairTree } from "./repair";
import { parseSettings, type Settings } from "./settings";
import { subtreeIds } from "./tree";
import { parseWatchers, type Watcher } from "./watchers";

export const SHARE_PREFIX = "EL1:";
export const BACKUP_FORMAT = "exile-ledger-backup";

/** Folders and bookmarks as they travel; IDs are replaced on import. */
export interface Payload {
	folders: Folder[];
	bookmarks: Bookmark[];
	/** Records left out while reading because they were invalid or too large. */
	skipped?: number;
	/** Bookmarks kept without their query, which was over QUERY_MAX_BYTES. */
	queriesDropped?: number;
}

/**
 * Upper bounds for one imported record's text, in UTF-16 units. Real names
 * and leagues sit far below; longer ones, which the app does not stop anyone
 * typing, are cut to fit rather than dropped, so restoring the app's own
 * backup never loses a record. Trade search ids are about 10 characters.
 * Queries are capped by QUERY_MAX_BYTES.
 */
export const IMPORT_LIMITS = {
	name: 200,
	league: 100,
	searchId: 64,
};

// Every browser the manifest allows has Intl.Segmenter (Firefox 140+, Chrome MV3).
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Cuts at a code point, never leaving half of a surrogate pair. */
function cutCodePoints(text: string, max: number): string {
	const cut = text.slice(0, max);
	return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

/**
 * Cuts to at most `max` UTF-16 units on a grapheme boundary, so a family
 * emoji, a flag, a skin tone or an accented letter is kept whole or left
 * out, never broken. When the first grapheme alone is longer than `max`,
 * it cuts at a code point instead, so a name is never left empty.
 */
export function cutTo(text: string, max: number): string {
	if (text.length <= max) return text;
	let end = 0;
	for (const { index, segment } of graphemes.segment(text)) {
		if (index + segment.length > max) break;
		end = index + segment.length;
	}
	return end > 0 ? text.slice(0, end) : cutCodePoints(text, max);
}

// Arrays of anything: each record is checked on its own so one bad entry does
// not reject the rest, as when reading storage.
const PayloadShape = v.object({
	folders: v.array(v.unknown()),
	bookmarks: v.array(v.unknown()),
});

/**
 * Rebuilt from the fields this version knows: unknown fields are kept when
 * syncing our own data, but an import must not carry hidden bulk into it.
 */
function importedFolder(raw: unknown): Folder | null {
	const parsed = v.safeParse(FolderSchema, raw);
	if (!parsed.success) return null;
	const f = parsed.output;
	return {
		id: f.id,
		parentId: f.parentId,
		name: cutTo(f.name, IMPORT_LIMITS.name),
		game: f.game,
		order: f.order,
		archived: f.archived,
		...(f.icon === undefined ? {} : { icon: f.icon }),
		// No role: an imported copy is never where saves go; the user's own folder stays that.
		updatedAt: f.updatedAt,
	};
}

function importedBookmark(
	raw: unknown,
): { bookmark: Bookmark; queryDropped: boolean } | null {
	const parsed = v.safeParse(BookmarkSchema, raw);
	if (!parsed.success) return null;
	const b = parsed.output;
	// A query over the cap is dropped, not the bookmark: older versions saved
	// any size, and the bookmark still opens from its search id.
	const query =
		b.query !== undefined && queryFits(b.query) ? b.query : undefined;
	// A cut search id would open another search, so an over-long one is
	// dropped. The app never stores one: trade ids are about 10 characters.
	const searchId =
		b.searchId !== undefined && b.searchId.length <= IMPORT_LIMITS.searchId
			? b.searchId
			: undefined;
	const lostSomething = query !== b.query || searchId !== b.searchId;
	if (lostSomething && query === undefined && searchId === undefined)
		return null;
	const bookmark: Bookmark = {
		id: b.id,
		folderId: b.folderId,
		name: cutTo(b.name, IMPORT_LIMITS.name),
		game: b.game,
		league: cutTo(b.league, IMPORT_LIMITS.league),
		// The query stays loose on purpose (see TradeQuerySchema); its size is capped above.
		...(query === undefined ? {} : { query }),
		...(searchId === undefined ? {} : { searchId }),
		...(b.tradeType === undefined ? {} : { tradeType: b.tradeType }),
		// A live search needs its id; without one the bookmark opens as a plain search.
		live: searchId === b.searchId ? b.live : false,
		...(b.done === undefined ? {} : { done: b.done }),
		order: b.order,
		createdAt: b.createdAt,
		updatedAt: b.updatedAt,
	};
	return { bookmark, queryDropped: query !== b.query };
}

/**
 * Keeps the records that validate and can still be opened, counting the rest.
 * A folder whose id repeats, and a bookmark whose folder is not kept, count
 * as skipped too, since importing them would merge or lose them silently.
 */
export function cleanPayload(
	rawFolders: readonly unknown[],
	rawBookmarks: readonly unknown[],
	earlier: { skipped?: number; queriesDropped?: number } = {},
): Payload {
	const folderIds = new Set<string>();
	const folders = rawFolders.flatMap((raw) => {
		const f = importedFolder(raw);
		if (!f || folderIds.has(f.id)) return [];
		folderIds.add(f.id);
		return [f];
	});
	let queriesDropped = earlier.queriesDropped ?? 0;
	const bookmarks = rawBookmarks.flatMap((raw) => {
		const kept = importedBookmark(raw);
		if (!kept || !folderIds.has(kept.bookmark.folderId)) return [];
		if (kept.queryDropped) queriesDropped++;
		return [kept.bookmark];
	});
	return {
		folders,
		bookmarks,
		queriesDropped,
		skipped:
			(earlier.skipped ?? 0) +
			rawFolders.length -
			folders.length +
			rawBookmarks.length -
			bookmarks.length,
	};
}

const BackupSchema = v.object({
	format: v.literal(BACKUP_FORMAT),
	version: v.literal(1),
	exportedAt: v.number(),
	library: v.pipe(
		PayloadShape,
		v.transform((p): Payload => cleanPayload(p.folders, p.bookmarks)),
	),
	// Kept raw: a restore applies only the keys the file has, so a backup from
	// an older version does not reset settings it never knew about.
	settings: v.optional(v.record(v.string(), v.unknown())),
	// Invalid entries are dropped one by one, as in storage.
	watchers: v.optional(
		v.pipe(
			v.array(v.unknown()),
			v.transform((raw: unknown[]) => parseWatchers(raw)),
		),
	),
});
export type Backup = v.InferOutput<typeof BackupSchema>;

/** Why a pasted string or picked file could not be read; the catalogue words it. */
export type ImportError =
	| "not-share"
	| "share-damaged"
	| "share-empty"
	| "not-backup"
	| "unknown-format";

export type Parsed<T> =
	| { ok: true; value: T }
	| { ok: false; error: ImportError };

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	// Chunked so large backups do not overflow the argument limit of fromCharCode.
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function fromBase64Url(text: string): string | null {
	try {
		const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** A folder and everything below it, as a string to paste elsewhere. */
export function encodeShare(library: Library, folderId: string): string | null {
	if (!library.folders.some((f) => f.id === folderId)) return null;
	const ids = subtreeIds(library.folders, folderId);
	const payload: Payload = {
		folders: library.folders
			.filter((f) => ids.has(f.id))
			.map((f) => (f.id === folderId ? { ...f, parentId: null } : f)),
		bookmarks: library.bookmarks.filter((b) => ids.has(b.folderId)),
	};
	return `${SHARE_PREFIX}${toBase64Url(JSON.stringify(payload))}`;
}

export function decodeShare(text: string): Parsed<Payload> {
	const trimmed = text.trim();
	if (!trimmed.startsWith(SHARE_PREFIX)) {
		return { ok: false, error: "not-share" };
	}
	const json = fromBase64Url(trimmed.slice(SHARE_PREFIX.length));
	const parsed = v.safeParse(
		PayloadShape,
		json === null ? undefined : parseJson(json),
	);
	if (!parsed.success) return { ok: false, error: "share-damaged" };
	if (parsed.output.folders.length === 0)
		return { ok: false, error: "share-empty" };
	const payload = cleanPayload(parsed.output.folders, parsed.output.bookmarks);
	if (payload.folders.length === 0)
		return { ok: false, error: "share-damaged" };
	return { ok: true, value: payload };
}

export function createBackup(
	library: Library,
	settings: Settings,
	now: number,
	watchers: readonly Watcher[] = [],
): Backup {
	return {
		format: BACKUP_FORMAT,
		version: 1,
		exportedAt: now,
		library: { folders: library.folders, bookmarks: library.bookmarks },
		settings: Object.fromEntries(Object.entries(settings)),
		watchers: [...watchers],
	};
}

const sameTarget = (a: Watcher, b: Watcher) =>
	a.kind === "listing" && b.kind === "listing"
		? a.itemId === b.itemId
		: a.kind === "search" &&
			b.kind === "search" &&
			a.league === b.league &&
			JSON.stringify(a.query) === JSON.stringify(b.query);

/**
 * Adds a backup's watchers that are not already watched, as new watchers with
 * fresh ids that start over: the old check state belongs to another machine.
 * Search watchers lose their bookmark link, since imported bookmarks get new
 * ids too. Existing watchers are never changed.
 */
export function importWatchers(
	current: readonly Watcher[],
	incoming: readonly Watcher[],
	{ now, newId }: Clock,
): { watchers: Watcher[]; added: number } {
	const added: Watcher[] = [];
	for (const watcher of incoming) {
		if ([...current, ...added].some((w) => sameTarget(w, watcher))) continue;
		const fresh = {
			id: newId(),
			createdAt: now,
			lastCheckedAt: null,
			failures: 0,
			retryAt: null,
		};
		added.push(
			watcher.kind === "listing"
				? { ...watcher, ...fresh }
				: {
						...watcher,
						...fresh,
						bookmarkId: null,
						seenIds: [],
						newIds: [],
						total: null,
					},
		);
	}
	return { watchers: [...current, ...added], added: added.length };
}

/** The settings a backup holds, validated, limited to the keys it actually has. */
export function backupSettings(backup: Backup): Partial<Settings> {
	const raw = backup.settings;
	if (!raw) return {};
	const parsed = parseSettings(raw);
	return Object.fromEntries(
		Object.entries(parsed).filter(([key]) => Object.hasOwn(raw, key)),
	);
}

/** Never throws: a file that cannot be read is reported, not fatal. */
export function parseBackup(text: string): Parsed<Backup> {
	try {
		const parsed = v.safeParse(BackupSchema, parseJson(text));
		if (!parsed.success) return { ok: false, error: "not-backup" };
		return { ok: true, value: parsed.output };
	} catch {
		return { ok: false, error: "not-backup" };
	}
}

/**
 * Adds imported folders and bookmarks as new copies with fresh IDs, after the
 * existing root folders. Existing data is never changed, so importing the same
 * string twice gives two copies rather than overwriting anything.
 */
export function importPayload(
	library: Library,
	payload: Payload,
	{ now, newId }: Clock,
): {
	library: Library;
	folders: number;
	bookmarks: number;
	skipped: number;
	queriesDropped: number;
} {
	// Cleaned again here so no caller can add records that skipped the limits.
	const clean = cleanPayload(payload.folders, payload.bookmarks, payload);
	const repaired = repairTree(clean.folders);
	const ids = new Map(repaired.map((f) => [f.id, newId()]));
	const rootOrder: Record<Folder["game"], number> = { poe1: 0, poe2: 0 };
	for (const f of library.folders) {
		if (f.parentId === null)
			rootOrder[f.game] = Math.max(rootOrder[f.game], f.order + 1);
	}

	const folders = repaired.flatMap((f): Folder[] => {
		const id = ids.get(f.id);
		if (!id) return [];
		const parentId = f.parentId === null ? null : (ids.get(f.parentId) ?? null);
		const order = parentId === null ? rootOrder[f.game]++ : f.order;
		return [{ ...f, id, parentId, order, updatedAt: now }];
	});
	const bookmarks = clean.bookmarks.flatMap((b): Bookmark[] => {
		const folderId = ids.get(b.folderId);
		return folderId ? [{ ...b, id: newId(), folderId, updatedAt: now }] : [];
	});

	return {
		library: {
			...library,
			folders: [...library.folders, ...folders],
			bookmarks: [...library.bookmarks, ...bookmarks],
		},
		folders: folders.length,
		bookmarks: bookmarks.length,
		skipped: clean.skipped ?? 0,
		queriesDropped: clean.queriesDropped ?? 0,
	};
}
