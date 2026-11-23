import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Bolt, ChevronRight, Folder, Pencil, Plus, Trash } from "./icons";
import { EmptyState, GameTag } from "./parts";
import {
	type BookmarkView,
	countBookmarks,
	type FolderView,
	type TreeNodeView,
} from "./viewModels";

export interface BookmarkActions {
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}

const ROW =
	"flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[13px] transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold";

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint transition-colors hover:bg-ledger-border hover:text-ledger-text focus-visible:outline-2 focus-visible:outline-ledger-gold";

function RenameField({
	initial,
	onDone,
}: {
	initial: string;
	onDone: (name: string | null) => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	// Enter unmounts the field, which then fires blur; finish only once.
	const finished = useRef(false);
	const finish = (name: string | null) => {
		if (finished.current) return;
		finished.current = true;
		onDone(name);
	};
	// Layout effect so keys typed right after the click land in the field.
	useLayoutEffect(() => {
		input.current?.focus();
		input.current?.select();
	}, []);
	return (
		<input
			ref={input}
			aria-label="Bookmark name"
			class="h-7 w-full rounded border border-ledger-gold/60 bg-ledger-bg px-2 text-[13px] text-ledger-text outline-none"
			defaultValue={initial}
			onKeyDown={(e) => {
				if (e.key === "Enter") finish(e.currentTarget.value);
				if (e.key === "Escape") finish(null);
			}}
			onBlur={(e) => finish(e.currentTarget.value)}
		/>
	);
}

function BookmarkRow({
	bookmark,
	actions,
}: {
	bookmark: BookmarkView;
	actions: BookmarkActions | undefined;
}) {
	const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">(
		"view",
	);

	if (mode === "rename" && actions) {
		return (
			<div class="px-1 py-0.5">
				<RenameField
					initial={bookmark.title}
					onDone={(name) => {
						if (name !== null && name !== bookmark.title) {
							actions.onRename(bookmark.id, name);
						}
						setMode("view");
					}}
				/>
			</div>
		);
	}

	if (mode === "confirm-delete" && actions) {
		return (
			<div class="flex h-8 items-center gap-2 rounded bg-red-950/40 px-2 text-[12px]">
				<span class="min-w-0 flex-1 truncate text-ledger-text">
					Delete “{bookmark.title}”?
				</span>
				<button
					type="button"
					class="rounded px-2 py-0.5 font-semibold text-red-300 hover:bg-red-900/50"
					onClick={() => actions.onDelete(bookmark.id)}
				>
					Delete
				</button>
				<button
					type="button"
					class="rounded px-2 py-0.5 text-ledger-muted hover:bg-ledger-raised"
					onClick={() => setMode("view")}
				>
					Keep
				</button>
			</div>
		);
	}

	return (
		<div class="group relative">
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
			{actions && (
				<div class="absolute inset-y-0 right-1 hidden items-center gap-0.5 rounded bg-ledger-raised pl-1 group-focus-within:flex group-hover:flex">
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={`Rename ${bookmark.title}`}
						onClick={() => setMode("rename")}
					>
						<Pencil class="size-3.5" />
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} hover:text-red-300`}
						aria-label={`Delete ${bookmark.title}`}
						onClick={() => setMode("confirm-delete")}
					>
						<Trash class="size-3.5" />
					</button>
				</div>
			)}
		</div>
	);
}

function FolderRow({
	folder,
	actions,
}: {
	folder: FolderView;
	actions: BookmarkActions | undefined;
}) {
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
				<TreeLevel nodes={folder.children} actions={actions} nested />
			)}
		</li>
	);
}

function TreeLevel({
	nodes,
	actions,
	nested = false,
}: {
	nodes: TreeNodeView[];
	actions: BookmarkActions | undefined;
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
					<FolderRow key={node.id} folder={node} actions={actions} />
				) : (
					<li key={node.id}>
						<BookmarkRow bookmark={node} actions={actions} />
					</li>
				),
			)}
		</ul>
	);
}

export function BookmarkTree({
	nodes,
	actions,
}: {
	nodes: TreeNodeView[];
	actions?: BookmarkActions;
}) {
	if (countBookmarks(nodes) === 0) {
		return (
			<EmptyState icon={Plus} title="No bookmarks yet">
				Save a search to keep it here. Folders sync to your other browsers.
			</EmptyState>
		);
	}
	return (
		<nav aria-label="Bookmarks" class="px-2 py-2">
			<TreeLevel nodes={nodes} actions={actions} />
		</nav>
	);
}
