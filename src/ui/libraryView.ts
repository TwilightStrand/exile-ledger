import { bookmarkTree, type FolderNode } from "../core/library";
import type { Library } from "../core/model";
import { bookmarkHref } from "../core/openUrl";
import type { Game, ParsedTradeUrl } from "../core/tradeUrl";
import type { TreeNodeView } from "./viewModels";

/** The game's folders and bookmarks as panel rows, with links for the open page. */
export function libraryView(
	library: Library,
	game: Game,
	page: ParsedTradeUrl | null,
): TreeNodeView[] {
	const toView = (node: FolderNode): TreeNodeView => ({
		kind: "folder",
		id: node.folder.id,
		name: node.folder.name,
		children: [
			...node.folders.map(toView),
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
	return bookmarkTree(library, game).map(toView);
}
