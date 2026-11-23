import { useState } from "preact/hooks";
import { Bolt, ChevronRight, Folder, Plus } from "./icons";
import { EmptyState, GameTag } from "./parts";
import {
	type BookmarkView,
	countBookmarks,
	type FolderView,
	type TreeNodeView,
} from "./viewModels";

const ROW =
	"flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[13px] transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold";

function BookmarkRow({ bookmark }: { bookmark: BookmarkView }) {
	return (
		<a
			class={`${ROW} text-ledger-text no-underline`}
			href={bookmark.href}
			title={`${bookmark.title} · ${bookmark.league}`}
		>
			<span class="min-w-0 flex-1 truncate">{bookmark.title}</span>
			{bookmark.live && (
				<span class="shrink-0 text-ledger-live" title="Live search">
					<Bolt class="size-3.5" />
					<span class="sr-only">Live search</span>
				</span>
			)}
			<GameTag game={bookmark.game} />
		</a>
	);
}

function FolderRow({ folder }: { folder: FolderView }) {
	const [open, setOpen] = useState(true);
	const count = countBookmarks(folder.children);
	return (
		<li>
			<button
				type="button"
				class={`${ROW} text-ledger-text`}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
			>
				<ChevronRight
					class={`size-3.5 shrink-0 text-ledger-faint transition-transform ${open ? "rotate-90" : ""}`}
				/>
				<Folder class="size-4 shrink-0 text-ledger-gold/75" />
				<span class="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
				<span class="text-[11px] text-ledger-faint tabular-nums">{count}</span>
			</button>
			{open && folder.children.length > 0 && (
				<TreeLevel nodes={folder.children} nested />
			)}
		</li>
	);
}

function TreeLevel({
	nodes,
	nested = false,
}: {
	nodes: TreeNodeView[];
	nested?: boolean;
}) {
	return (
		<ul
			class={
				nested ? "ml-[15px] border-l border-ledger-border pl-1.5" : undefined
			}
		>
			{nodes.map((node) =>
				node.kind === "folder" ? (
					<FolderRow key={node.id} folder={node} />
				) : (
					<li key={node.id}>
						<BookmarkRow bookmark={node} />
					</li>
				),
			)}
		</ul>
	);
}

export function BookmarkTree({ nodes }: { nodes: TreeNodeView[] }) {
	if (nodes.length === 0) {
		return (
			<EmptyState icon={Plus} title="No bookmarks yet">
				Save a search to keep it here. Folders sync to your other browsers.
			</EmptyState>
		);
	}
	return (
		<nav aria-label="Bookmarks" class="px-2 py-2">
			<TreeLevel nodes={nodes} />
		</nav>
	);
}
