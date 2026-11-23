import * as v from "valibot";
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
import type { Game } from "./tradeUrl";

export const DEFAULT_FOLDER_NAME = "Saved searches";

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
): { library: Library; bookmark: Bookmark } {
	let folders = library.folders;
	let folder = folders.find(
		(f) =>
			f.game === input.game &&
			f.parentId === null &&
			f.name === DEFAULT_FOLDER_NAME &&
			!f.archived,
	);
	if (!folder) {
		folder = {
			id: newId(),
			parentId: null,
			name: DEFAULT_FOLDER_NAME,
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

/** What the UI needs from the library; browser storage in the extension, memory in previews and tests. */
export interface LibrarySource {
	load(): Promise<Library>;
	update(change: (library: Library) => Library): Promise<Library>;
	watch(onChange: (library: Library) => void): () => void;
}

export function createMemoryLibrary(
	initial: Library = emptyLibrary(),
): LibrarySource {
	let current = initial;
	const listeners = new Set<(library: Library) => void>();
	return {
		load: async () => current,
		update: async (change) => {
			current = change(current);
			for (const listener of listeners) listener(current);
			return current;
		},
		watch: (onChange) => {
			listeners.add(onChange);
			return () => listeners.delete(onChange);
		},
	};
}
