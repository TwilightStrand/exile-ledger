import type { Bookmark, Folder, Library, Tombstone } from "./model";
import { repairTree } from "./repair";
import type { Game } from "./tradeUrl";

/** Long enough for a machine that was offline for a few weeks to still learn about deletes. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERED_FOLDER_NAME = "Recovered";

/** Same id on every machine, so two machines recovering at once share one folder. */
export const recoveredFolderId = (game: Game) => `recovered-${game}`;

function newest<T extends { id: string; updatedAt: number }>(
	items: T[],
): Map<string, T> {
	const byId = new Map<string, T>();
	for (const item of items) {
		const current = byId.get(item.id);
		// Ties go first to the copy with more fields (one an older version
		// wrote may lack newer ones), then to the larger JSON, so every machine
		// picks the same winner.
		const fields = (x: T) => Object.keys(x).length;
		if (
			!current ||
			item.updatedAt > current.updatedAt ||
			(item.updatedAt === current.updatedAt &&
				(fields(item) > fields(current) ||
					(fields(item) === fields(current) &&
						JSON.stringify(item) > JSON.stringify(current))))
		) {
			byId.set(item.id, item);
		}
	}
	return byId;
}

/**
 * Merges two copies of the library per item: the newest write wins, a delete
 * wins over edits made before it, and the result is repaired so it is always
 * a valid tree. Commutative and idempotent, so machines converge whatever
 * order they sync in.
 */
export function mergeLibraries(a: Library, b: Library, now: number): Library {
	const deleted = new Map<string, number>();
	for (const t of [...a.tombstones, ...b.tombstones]) {
		if (now - t.deletedAt > TOMBSTONE_TTL_MS) continue;
		deleted.set(t.id, Math.max(deleted.get(t.id) ?? 0, t.deletedAt));
	}
	const alive = <T extends { id: string; updatedAt: number }>(item: T) =>
		(deleted.get(item.id) ?? Number.NEGATIVE_INFINITY) < item.updatedAt;

	const folders = [...newest([...a.folders, ...b.folders]).values()].filter(
		alive,
	);
	let bookmarks = [...newest([...a.bookmarks, ...b.bookmarks]).values()].filter(
		alive,
	);
	let repaired = repairTree(folders);

	const folderIds = new Set(repaired.map((f) => f.id));
	const orphans = bookmarks.filter((bm) => !folderIds.has(bm.folderId));
	if (orphans.length > 0) {
		const recovered = new Map<Game, Folder>();
		for (const bm of orphans) {
			const id = recoveredFolderId(bm.game);
			if (folderIds.has(id) || recovered.has(bm.game)) continue;
			recovered.set(bm.game, {
				id,
				parentId: null,
				name: RECOVERED_FOLDER_NAME,
				game: bm.game,
				// Sorts after anything a person creates; well inside safe integers when new folders add 1.
				order: 9999,
				archived: false,
				// Fixed timestamp: a later rename by the user always wins over the recovery itself.
				updatedAt: 0,
			});
		}
		repaired = [...repaired, ...recovered.values()];
		bookmarks = bookmarks.map(
			(bm): Bookmark =>
				folderIds.has(bm.folderId)
					? bm
					: { ...bm, folderId: recoveredFolderId(bm.game) },
		);
	}

	const tombstones: Tombstone[] = [...deleted].map(([id, deletedAt]) => ({
		id,
		deletedAt,
	}));
	const byId = (x: { id: string }, y: { id: string }) =>
		x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
	return {
		folders: repaired.sort(byId),
		bookmarks: bookmarks.sort(byId),
		tombstones: tombstones.sort(byId),
	};
}
