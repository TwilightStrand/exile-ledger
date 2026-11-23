import type { FolderIcon } from "../core/model";
import type { Game } from "../core/tradeUrl";

/** What the panel shows; the stores in later tasks map their records onto these. */
export interface BookmarkView {
	kind: "bookmark";
	id: string;
	title: string;
	game: Game;
	league: string;
	live: boolean;
	href: string;
}

export interface FolderView {
	kind: "folder";
	id: string;
	name: string;
	/** 1 at the root; new subfolders are offered only below MAX_DEPTH. */
	depth: number;
	icon: FolderIcon;
	children: TreeNodeView[];
}

export interface ArchivedFolderView {
	id: string;
	name: string;
	bookmarks: number;
}

export type TreeNodeView = FolderView | BookmarkView;

export interface HistoryEntryView {
	id: string;
	title: string;
	game: Game;
	league: string;
	at: number;
	href: string;
	total: number | null;
	/** Already bookmarked, so the save action is not offered. */
	saved: boolean;
}

export function countBookmarks(nodes: TreeNodeView[]): number {
	return nodes.reduce(
		(sum, node) =>
			sum + (node.kind === "bookmark" ? 1 : countBookmarks(node.children)),
		0,
	);
}
