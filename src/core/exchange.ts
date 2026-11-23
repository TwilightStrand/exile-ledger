import * as v from "valibot";
import type { Clock } from "./library";
import {
	type Bookmark,
	BookmarkSchema,
	type Folder,
	FolderSchema,
	type Library,
} from "./model";
import { repairTree } from "./repair";
import { type Settings, SettingsSchema } from "./settings";
import { subtreeIds } from "./tree";

export const SHARE_PREFIX = "EL1:";
export const BACKUP_FORMAT = "exile-ledger-backup";

/** Folders and bookmarks as they travel; IDs are replaced on import. */
export interface Payload {
	folders: Folder[];
	bookmarks: Bookmark[];
}

const PayloadSchema = v.object({
	folders: v.array(FolderSchema),
	bookmarks: v.array(BookmarkSchema),
});

const BackupSchema = v.object({
	format: v.literal(BACKUP_FORMAT),
	version: v.literal(1),
	exportedAt: v.number(),
	library: PayloadSchema,
	settings: v.optional(SettingsSchema),
});
export type Backup = v.InferOutput<typeof BackupSchema>;

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

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
		return { ok: false, message: "This is not an Exile Ledger share string." };
	}
	const json = fromBase64Url(trimmed.slice(SHARE_PREFIX.length));
	const parsed = v.safeParse(
		PayloadSchema,
		json === null ? undefined : parseJson(json),
	);
	if (!parsed.success)
		return { ok: false, message: "The share string is damaged or incomplete." };
	if (parsed.output.folders.length === 0)
		return { ok: false, message: "The share string holds no folders." };
	return { ok: true, value: parsed.output };
}

export function createBackup(
	library: Library,
	settings: Settings,
	now: number,
): Backup {
	return {
		format: BACKUP_FORMAT,
		version: 1,
		exportedAt: now,
		library: { folders: library.folders, bookmarks: library.bookmarks },
		settings,
	};
}

export function parseBackup(text: string): Parsed<Backup> {
	const parsed = v.safeParse(BackupSchema, parseJson(text));
	if (!parsed.success)
		return {
			ok: false,
			message: "This file is not an Exile Ledger backup, or it is damaged.",
		};
	return { ok: true, value: parsed.output };
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
): { library: Library; folders: number; bookmarks: number } {
	const repaired = repairTree(payload.folders);
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
	const bookmarks = payload.bookmarks.flatMap((b): Bookmark[] => {
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
	};
}
