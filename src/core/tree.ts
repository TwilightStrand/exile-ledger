import type { Clock } from "./library";
import type { Folder, Library, Tombstone } from "./model";
import type { Game } from "./tradeUrl";

/** Five levels keeps the side panel readable; see the spec's open questions. */
export const MAX_DEPTH = 5;

export type TreeError = "not-found" | "cycle" | "too-deep" | "blank-name";
export type TreeResult<T> =
	| ({ ok: true } & T)
	| { ok: false; reason: TreeError };

function byId(folders: Folder[]): Map<string, Folder> {
	return new Map(folders.map((f) => [f.id, f]));
}

/** 1 for a root folder. Stops on a cycle so corrupt synced data cannot hang the panel. */
export function depthOf(folders: Folder[], id: string): number {
	const index = byId(folders);
	const seen = new Set<string>();
	let depth = 0;
	let current = index.get(id);
	while (current && !seen.has(current.id)) {
		seen.add(current.id);
		depth++;
		current = current.parentId ? index.get(current.parentId) : undefined;
	}
	return depth;
}

/** The folder and everything below it. */
export function subtreeIds(folders: Folder[], id: string): Set<string> {
	const ids = new Set<string>([id]);
	let added = true;
	while (added) {
		added = false;
		for (const f of folders) {
			if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
				ids.add(f.id);
				added = true;
			}
		}
	}
	return ids;
}

/** Levels in the subtree, counting the folder itself. */
function subtreeHeight(folders: Folder[], id: string): number {
	const children = folders.filter((f) => f.parentId === id && f.id !== id);
	return 1 + Math.max(0, ...children.map((c) => subtreeHeight(folders, c.id)));
}

function nextOrder(
	folders: Folder[],
	parentId: string | null,
	game: Game,
): number {
	return folders
		.filter((f) => f.parentId === parentId && f.game === game)
		.reduce((max, f) => Math.max(max, f.order + 1), 0);
}

export function createFolder(
	library: Library,
	input: { name: string; game: Game; parentId: string | null },
	{ now, newId }: Clock,
): TreeResult<{ library: Library; folder: Folder }> {
	const name = input.name.trim();
	if (!name) return { ok: false, reason: "blank-name" };
	if (input.parentId !== null) {
		const parent = library.folders.find((f) => f.id === input.parentId);
		if (!parent || parent.game !== input.game)
			return { ok: false, reason: "not-found" };
		if (depthOf(library.folders, parent.id) >= MAX_DEPTH) {
			return { ok: false, reason: "too-deep" };
		}
	}
	const folder: Folder = {
		id: newId(),
		parentId: input.parentId,
		name,
		game: input.game,
		order: nextOrder(library.folders, input.parentId, input.game),
		archived: false,
		updatedAt: now,
	};
	return {
		ok: true,
		library: { ...library, folders: [...library.folders, folder] },
		folder,
	};
}

export function renameFolder(
	library: Library,
	id: string,
	name: string,
	now: number,
): Library {
	const trimmed = name.trim();
	if (!trimmed) return library;
	return {
		...library,
		folders: library.folders.map((f) =>
			f.id === id ? { ...f, name: trimmed, updatedAt: now } : f,
		),
	};
}

export function moveFolder(
	library: Library,
	id: string,
	parentId: string | null,
	now: number,
): TreeResult<{ library: Library }> {
	const folder = library.folders.find((f) => f.id === id);
	if (!folder) return { ok: false, reason: "not-found" };
	if (parentId !== null) {
		const parent = library.folders.find((f) => f.id === parentId);
		if (!parent || parent.game !== folder.game)
			return { ok: false, reason: "not-found" };
		if (subtreeIds(library.folders, id).has(parentId))
			return { ok: false, reason: "cycle" };
		const depth =
			depthOf(library.folders, parentId) + subtreeHeight(library.folders, id);
		if (depth > MAX_DEPTH) return { ok: false, reason: "too-deep" };
	}
	const order = nextOrder(library.folders, parentId, folder.game);
	return {
		ok: true,
		library: {
			...library,
			folders: library.folders.map((f) =>
				f.id === id ? { ...f, parentId, order, updatedAt: now } : f,
			),
		},
	};
}

export function subtreeStats(
	library: Library,
	id: string,
): { folders: number; bookmarks: number } {
	const ids = subtreeIds(library.folders, id);
	return {
		folders: library.folders.filter((f) => ids.has(f.id)).length,
		bookmarks: library.bookmarks.filter((b) => ids.has(b.folderId)).length,
	};
}

export function deleteFolder(
	library: Library,
	id: string,
	now: number,
): Library {
	const ids = subtreeIds(library.folders, id);
	const removedBookmarks = library.bookmarks
		.filter((b) => ids.has(b.folderId))
		.map((b) => b.id);
	const gone = new Set([...ids, ...removedBookmarks]);
	const tombstones: Tombstone[] = [...gone].map((goneId) => ({
		id: goneId,
		deletedAt: now,
	}));
	return {
		folders: library.folders.filter((f) => !ids.has(f.id)),
		bookmarks: library.bookmarks.filter((b) => !ids.has(b.folderId)),
		tombstones: [
			...library.tombstones.filter((t) => !gone.has(t.id)),
			...tombstones,
		],
	};
}

/**
 * Archives or restores the folder and its subtree. A restored folder whose
 * parent no longer exists comes back at the root rather than vanishing.
 */
export function setArchived(
	library: Library,
	id: string,
	archived: boolean,
	now: number,
): Library {
	const ids = subtreeIds(library.folders, id);
	const present = new Set(library.folders.map((f) => f.id));
	return {
		...library,
		folders: library.folders.map((f) => {
			if (!ids.has(f.id)) return f;
			const orphaned =
				f.id === id && f.parentId !== null && !present.has(f.parentId);
			return {
				...f,
				archived,
				updatedAt: now,
				...(orphaned ? { parentId: null } : {}),
			};
		}),
	};
}

/** Archived folders whose parent is not archived: the ones a user archived directly. */
export function archivedRoots(library: Library, game: Game): Folder[] {
	const index = byId(library.folders);
	return library.folders.filter((f) => {
		if (f.game !== game || !f.archived) return false;
		const parent = f.parentId ? index.get(f.parentId) : undefined;
		return !parent?.archived;
	});
}
