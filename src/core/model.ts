import * as v from "valibot";
import { TradeQuerySchema } from "./query";

const GameSchema = v.picklist(["poe1", "poe2"]);

export const FolderSchema = v.object({
	id: v.string(),
	parentId: v.nullable(v.string()),
	name: v.string(),
	// Folders belong to one game, since the panel only ever shows one game's set.
	game: GameSchema,
	order: v.number(),
	archived: v.boolean(),
	updatedAt: v.number(),
});
export type Folder = v.InferOutput<typeof FolderSchema>;

export const BookmarkSchema = v.object({
	id: v.string(),
	folderId: v.string(),
	name: v.string(),
	game: GameSchema,
	league: v.string(),
	// Optional because legacy imports may only carry a search ID.
	query: v.optional(TradeQuerySchema),
	searchId: v.optional(v.string()),
	live: v.boolean(),
	order: v.number(),
	createdAt: v.number(),
	updatedAt: v.number(),
});
export type Bookmark = v.InferOutput<typeof BookmarkSchema>;

export const TombstoneSchema = v.object({
	id: v.string(),
	deletedAt: v.number(),
});
export type Tombstone = v.InferOutput<typeof TombstoneSchema>;

export interface Library {
	folders: Folder[];
	bookmarks: Bookmark[];
	tombstones: Tombstone[];
}
