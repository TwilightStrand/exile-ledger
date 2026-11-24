import { titleOfQuery } from "../core/describe";
import { type HistoryEntry, historyFor } from "../core/history";
import { en, type Messages } from "../core/i18n";
import { bookmarkTree, type FolderNode } from "../core/library";
import type { Library } from "../core/model";
import { bookmarkHref } from "../core/openUrl";
import type { Game, ParsedTradeUrl } from "../core/tradeUrl";
import { archivedRoots, subtreeStats } from "../core/tree";
import type {
	ArchivedFolderView,
	HistoryEntryView,
	TreeNodeView,
} from "./viewModels";

/** The game's folders and bookmarks as panel rows, with links for the open page. */
export function libraryView(
	library: Library,
	game: Game,
	page: ParsedTradeUrl | null,
): TreeNodeView[] {
	const toView = (node: FolderNode, depth: number): TreeNodeView => ({
		kind: "folder",
		id: node.folder.id,
		name: node.folder.name,
		depth,
		icon: node.folder.icon ?? "folder",
		children: [
			...node.folders.map((child) => toView(child, depth + 1)),
			...node.bookmarks.map(
				(b): TreeNodeView => ({
					kind: "bookmark",
					id: b.id,
					title: b.name,
					game: b.game,
					league: b.league,
					live: b.live,
					href: page ? bookmarkHref(b, page) : "#",
				}),
			),
		],
	});
	return bookmarkTree(library, game).map((node) => toView(node, 1));
}

export function archivedView(
	library: Library,
	game: Game,
): ArchivedFolderView[] {
	return archivedRoots(library, game).map((folder) => ({
		id: folder.id,
		name: folder.name,
		bookmarks: subtreeStats(library, folder.id).bookmarks,
	}));
}

export function historyView(
	history: HistoryEntry[],
	library: Library,
	game: Game,
	page: ParsedTradeUrl | null,
	t: Messages = en,
): HistoryEntryView[] {
	const savedIds = new Set(library.bookmarks.map((b) => b.searchId));
	return historyFor(history, game).map((h) => ({
		id: h.id,
		title: titleOfQuery(h.query, t),
		game: h.game,
		league: h.league,
		at: h.at,
		total: h.total,
		saved: savedIds.has(h.searchId),
		href: page ? bookmarkHref({ ...h, live: false }, page) : "#",
	}));
}
