import * as v from "valibot";
import { en } from "./i18n/en";
import {
	type Bookmark,
	BookmarkSchema,
	type Folder,
	FolderSchema,
	type Library,
	type Tombstone,
	TombstoneSchema,
} from "./model";
import type { TradeQuery } from "./query";
import { createMemorySource, type Source } from "./source";
import type { Game } from "./tradeUrl";

export function emptyLibrary(): Library {
	return { folders: [], bookmarks: [], tombstones: [] };
}

/** Keeps every record that validates, so one corrupt entry does not lose the rest. */
function validItems<T>(schema: v.GenericSchema<unknown, T>, raw: unknown): T[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		const parsed = v.safeParse(schema, item);
		return parsed.success ? [parsed.output] : [];
	});
}

const LibraryShape = v.object({
	folders: v.array(v.unknown()),
	bookmarks: v.array(v.unknown()),
	tombstones: v.array(v.unknown()),
});

export function parseLibrary(raw: unknown): Library {
	const shape = v.safeParse(LibraryShape, raw);
	if (!shape.success) return emptyLibrary();
	return {
		folders: validItems(FolderSchema, shape.output.folders),
		bookmarks: validItems(BookmarkSchema, shape.output.bookmarks),
		tombstones: validItems(TombstoneSchema, shape.output.tombstones),
	};
}

export interface SaveInput {
	game: Game;
	league: string;
	name: string;
	query: TradeQuery;
	searchId: string | null;
	live: boolean;
}

export interface Clock {
	now: number;
	newId: () => string;
}

function nextOrder(items: { order: number }[]): number {
	return items.reduce((max, item) => Math.max(max, item.order + 1), 0);
}

/** Saves into the game's default root folder, creating it on first use. */
export function saveSearch(
	library: Library,
	input: SaveInput,
	{ now, newId }: Clock,
	defaultFolder: string = en.bookmarks.defaultFolder,
): { library: Library; bookmark: Bookmark } {
	let folders = library.folders;
	let folder = folders.find(
		(f) =>
			f.game === input.game &&
			f.parentId === null &&
			f.name === defaultFolder &&
			!f.archived,
	);
	if (!folder) {
		folder = {
			id: newId(),
			parentId: null,
			name: defaultFolder,
			game: input.game,
			order: nextOrder(
				folders.filter((f) => f.game === input.game && f.parentId === null),
			),
			archived: false,
			updatedAt: now,
		};
		folders = [...folders, folder];
	}
	const folderId = folder.id;
	const bookmark: Bookmark = {
		id: newId(),
		folderId,
		name: input.name,
		game: input.game,
		league: input.league,
		query: input.query,
		...(input.searchId ? { searchId: input.searchId } : {}),
		live: input.live,
		order: nextOrder(library.bookmarks.filter((b) => b.folderId === folderId)),
		createdAt: now,
		updatedAt: now,
	};
	return {
		library: {
			...library,
			folders,
			bookmarks: [...library.bookmarks, bookmark],
		},
		bookmark,
	};
}

export function renameBookmark(
	library: Library,
	id: string,
	name: string,
	now: number,
): Library {
	const trimmed = name.trim();
	if (!trimmed) return library;
	return {
		...library,
		bookmarks: library.bookmarks.map((b) =>
			b.id === id ? { ...b, name: trimmed, updatedAt: now } : b,
		),
	};
}

/**
 * Points a bookmark at a new search. Id, name, folder and order stay, so it
 * keeps its place; the new updatedAt carries the change to other machines.
 */
export function overwriteBookmark(
	library: Library,
	id: string,
	search: {
		query: TradeQuery;
		searchId: string | null;
		league: string;
		live: boolean;
	},
	now: number,
): Library {
	return {
		...library,
		bookmarks: library.bookmarks.map((b) => {
			if (b.id !== id) return b;
			const { searchId: _stale, tradeType: _type, ...rest } = b;
			return {
				...rest,
				query: search.query,
				...(search.searchId ? { searchId: search.searchId } : {}),
				league: search.league,
				live: search.live,
				updatedAt: now,
			};
		}),
	};
}

/** Sets `done` on the given bookmarks, skipping ones already there so sync is not churned. */
export function markDone(
	library: Library,
	ids: ReadonlySet<string>,
	done: boolean,
	now: number,
): Library {
	return {
		...library,
		bookmarks: library.bookmarks.map((b) =>
			ids.has(b.id) && (b.done ?? false) !== done
				? { ...b, done, updatedAt: now }
				: b,
		),
	};
}

export function setBookmarkDone(
	library: Library,
	id: string,
	done: boolean,
	now: number,
): Library {
	return markDone(library, new Set([id]), done, now);
}

export function deleteBookmark(
	library: Library,
	id: string,
	now: number,
): Library {
	const tombstone: Tombstone = { id, deletedAt: now };
	return {
		...library,
		bookmarks: library.bookmarks.filter((b) => b.id !== id),
		tombstones: [...library.tombstones.filter((t) => t.id !== id), tombstone],
	};
}

export interface FolderNode {
	folder: Folder;
	folders: FolderNode[];
	bookmarks: Bookmark[];
}

const byOrder = (a: { order: number }, b: { order: number }) =>
	a.order - b.order;

/** The game's unarchived folders as a tree, with each level sorted by order. */
export function bookmarkTree(library: Library, game: Game): FolderNode[] {
	const folders = library.folders.filter((f) => f.game === game && !f.archived);
	const build = (parentId: string | null): FolderNode[] =>
		folders
			.filter((f) => f.parentId === parentId)
			.sort(byOrder)
			.map((folder) => ({
				folder,
				folders: build(folder.id),
				bookmarks: library.bookmarks
					.filter((b) => b.folderId === folder.id && b.game === game)
					.sort(byOrder),
			}));
	return build(null);
}

export type LibrarySource = Source<Library>;

export function createMemoryLibrary(
	initial: Library = emptyLibrary(),
): LibrarySource {
	return createMemorySource(initial);
}
