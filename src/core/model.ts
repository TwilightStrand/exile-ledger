import * as v from "valibot";
import { TradeQuerySchema } from "./query";

const GameSchema = v.picklist(["poe1", "poe2"]);

export const FOLDER_ICONS = [
	"folder",
	"sword",
	"bow",
	"shield",
	"helmet",
	"ring",
	"amulet",
	"gem",
	"flask",
	"map",
	"coin",
	"star",
] as const;
export type FolderIcon = (typeof FOLDER_ICONS)[number];

export const FolderSchema = v.object({
	id: v.string(),
	parentId: v.nullable(v.string()),
	name: v.string(),
	// Folders belong to one game, since the panel only ever shows one game's set.
	game: GameSchema,
	order: v.number(),
	archived: v.boolean(),
	// Unknown icons from a newer build fall back to the plain folder.
	icon: v.optional(v.fallback(v.picklist(FOLDER_ICONS), "folder")),
	/**
	 * Marks the folder saves go to, so it is found again after a rename or a
	 * language switch. Older data has none and is found by its English name.
	 * A plain string, so a role from a newer build does not drop the folder.
	 */
	role: v.optional(v.string()),
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
	// Bulk exchange bookmarks come from Better Trading imports; saving here is search only.
	tradeType: v.optional(v.picklist(["search", "exchange"])),
	live: v.boolean(),
	/** Ticked off by the user, e.g. an item already bought; absent means not done. */
	done: v.optional(v.boolean()),
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
