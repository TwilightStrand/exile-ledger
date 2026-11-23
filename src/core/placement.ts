import type { Bookmark, Folder, Library } from "./model";
import type { Game } from "./tradeUrl";
import { moveFolder, type TreeResult } from "./tree";

export type SiblingScope =
	| { kind: "bookmark"; folderId: string }
	| { kind: "folder"; parentId: string | null; game: Game };

const byOrder = (a: { order: number }, b: { order: number }) =>
	a.order - b.order;

export function siblingsOf(
	library: Library,
	scope: SiblingScope,
): (Bookmark | Folder)[] {
	if (scope.kind === "bookmark") {
		return library.bookmarks
			.filter((b) => b.folderId === scope.folderId)
			.sort(byOrder);
	}
	return library.folders
		.filter((f) => f.parentId === scope.parentId && f.game === scope.game)
		.sort(byOrder);
}

/** New order for each id, so only rows whose order changed get a new updatedAt. */
function orderMap(ordered: { id: string }[]): Map<string, number> {
	return new Map(ordered.map((item, index) => [item.id, index]));
}

function insertAt<T>(items: T[], item: T, index: number): T[] {
	const at = Math.max(0, Math.min(index, items.length));
	return [...items.slice(0, at), item, ...items.slice(at)];
}

function renumber<T extends { id: string; order: number; updatedAt: number }>(
	items: T[],
	orders: Map<string, number>,
	now: number,
	patch: (item: T) => Partial<T> = () => ({}),
): T[] {
	return items.map((item) => {
		const order = orders.get(item.id);
		const extra = patch(item);
		if (order === undefined) return item;
		if (order === item.order && Object.keys(extra).length === 0) return item;
		return { ...item, ...extra, order, updatedAt: now };
	});
}

/** Puts a bookmark at `index` among the bookmarks of `folderId`. */
export function placeBookmark(
	library: Library,
	id: string,
	folderId: string,
	index: number,
	now: number,
): TreeResult<{ library: Library }> {
	const bookmark = library.bookmarks.find((b) => b.id === id);
	const folder = library.folders.find((f) => f.id === folderId);
	if (!bookmark || !folder || folder.game !== bookmark.game) {
		return { ok: false, reason: "not-found" };
	}
	const target = siblingsOf(library, { kind: "bookmark", folderId }).filter(
		(b) => b.id !== id,
	);
	const source = siblingsOf(library, {
		kind: "bookmark",
		folderId: bookmark.folderId,
	}).filter((b) => b.id !== id);
	const orders = new Map([
		...orderMap(source),
		...orderMap(insertAt(target, bookmark, index)),
	]);
	return {
		ok: true,
		library: {
			...library,
			bookmarks: renumber(library.bookmarks, orders, now, (b) =>
				b.id === id && b.folderId !== folderId ? { folderId } : {},
			),
		},
	};
}

/** Puts a folder at `index` under `parentId`, with the same rules as moveFolder. */
export function placeFolder(
	library: Library,
	id: string,
	parentId: string | null,
	index: number,
	now: number,
): TreeResult<{ library: Library }> {
	const folder = library.folders.find((f) => f.id === id);
	if (!folder) return { ok: false, reason: "not-found" };
	let base = library;
	if (folder.parentId !== parentId) {
		const moved = moveFolder(library, id, parentId, now);
		if (!moved.ok) return moved;
		base = moved.library;
	}
	const moving = base.folders.find((f) => f.id === id);
	if (!moving) return { ok: false, reason: "not-found" };
	const scope: SiblingScope = { kind: "folder", parentId, game: folder.game };
	const target = siblingsOf(base, scope).filter((f) => f.id !== id);
	const source = siblingsOf(base, {
		kind: "folder",
		parentId: folder.parentId,
		game: folder.game,
	}).filter((f) => f.id !== id);
	const orders = new Map([
		...orderMap(source),
		...orderMap(insertAt(target, moving, index)),
	]);
	return {
		ok: true,
		library: { ...base, folders: renumber(base.folders, orders, now) },
	};
}

/** Index for "before `beforeId`" in a list that no longer holds the moving item; the end when absent. */
export function indexBefore(
	siblings: { id: string }[],
	beforeId: string | null,
): number {
	if (beforeId === null) return siblings.length;
	const at = siblings.findIndex((s) => s.id === beforeId);
	return at === -1 ? siblings.length : at;
}

export type PlaceRequest =
	| {
			kind: "bookmark";
			id: string;
			parentId: string | null;
			beforeId: string | null;
	  }
	| {
			kind: "folder";
			id: string;
			parentId: string | null;
			beforeId: string | null;
	  };

/** Applies a drag or keyboard move; refused moves leave the library unchanged. */
export function applyPlace(
	library: Library,
	request: PlaceRequest,
	now: number,
): Library {
	if (request.kind === "bookmark") {
		if (request.parentId === null) return library;
		const siblings = siblingsOf(library, {
			kind: "bookmark",
			folderId: request.parentId,
		}).filter((b) => b.id !== request.id);
		const result = placeBookmark(
			library,
			request.id,
			request.parentId,
			indexBefore(siblings, request.beforeId),
			now,
		);
		return result.ok ? result.library : library;
	}
	const folder = library.folders.find((f) => f.id === request.id);
	if (!folder) return library;
	const siblings = siblingsOf(library, {
		kind: "folder",
		parentId: request.parentId,
		game: folder.game,
	}).filter((f) => f.id !== request.id);
	const result = placeFolder(
		library,
		request.id,
		request.parentId,
		indexBefore(siblings, request.beforeId),
		now,
	);
	return result.ok ? result.library : library;
}
