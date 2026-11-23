import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { MAX_DEPTH } from "../core/tree";
import {
	Archive,
	Bolt,
	ChevronRight,
	Folder,
	FolderPlus,
	Pencil,
	Plus,
	Restore,
	Trash,
} from "./icons";
import { EmptyState, GameTag } from "./parts";
import {
	type ArchivedFolderView,
	type BookmarkView,
	countBookmarks,
	type FolderView,
	type TreeNodeView,
} from "./viewModels";

export interface TreeActions {
	/** The bookmark saved last, flashed once so the eye finds it. */
	highlightId?: string | null;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	onCreateFolder: (parentId: string | null, name: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onArchiveFolder: (id: string, archived: boolean) => void;
	onDeleteFolder: (id: string) => void;
	isCollapsed: (id: string) => boolean;
	onToggleFolder: (id: string, collapsed: boolean) => void;
}

const ROW =
	"flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[13px] transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold";

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint transition-colors hover:bg-ledger-border hover:text-ledger-text focus-visible:outline-2 focus-visible:outline-ledger-gold";

const HOVER_ACTIONS =
	"pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 rounded bg-ledger-raised pl-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100";

function NameField({
	initial,
	label,
	placeholder,
	onDone,
}: {
	initial: string;
	label: string;
	placeholder?: string;
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
		<div class="animate-fade-in px-1 py-0.5">
			<input
				ref={input}
				aria-label={label}
				placeholder={placeholder}
				class="h-7 w-full rounded border border-ledger-gold/60 bg-ledger-bg px-2 text-[13px] text-ledger-text outline-none placeholder:text-ledger-faint"
				defaultValue={initial}
				onKeyDown={(e) => {
					if (e.key === "Enter") finish(e.currentTarget.value);
					if (e.key === "Escape") finish(null);
				}}
				onBlur={(e) => finish(e.currentTarget.value)}
			/>
		</div>
	);
}

function ConfirmRow({
	message,
	onConfirm,
	onCancel,
}: {
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div class="flex min-h-8 animate-fade-in items-center gap-2 rounded bg-red-950/40 px-2 py-1 text-[12px]">
			<span class="min-w-0 flex-1 text-ledger-text">{message}</span>
			<button
				type="button"
				class="rounded px-2 py-0.5 font-semibold text-red-300 hover:bg-red-900/50"
				onClick={onConfirm}
			>
				Delete
			</button>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-ledger-muted hover:bg-ledger-raised"
				onClick={onCancel}
			>
				Keep
			</button>
		</div>
	);
}

function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function BookmarkRow({
	bookmark,
	actions,
}: {
	bookmark: BookmarkView;
	actions: TreeActions | undefined;
}) {
	const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">(
		"view",
	);

	if (mode === "rename" && actions) {
		return (
			<NameField
				initial={bookmark.title}
				label="Bookmark name"
				onDone={(name) => {
					if (name !== null && name !== bookmark.title) {
						actions.onRename(bookmark.id, name);
					}
					setMode("view");
				}}
			/>
		);
	}

	if (mode === "confirm-delete" && actions) {
		return (
			<ConfirmRow
				message={`Delete “${bookmark.title}”?`}
				onConfirm={() => actions.onDelete(bookmark.id)}
				onCancel={() => setMode("view")}
			/>
		);
	}

	return (
		<div class="group relative">
			<a
				class={`${ROW} text-ledger-text no-underline ${actions?.highlightId === bookmark.id ? "animate-glow" : ""}`}
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
				<div class={HOVER_ACTIONS}>
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

type FolderMode = "view" | "rename" | "new-child" | "confirm-delete";

function FolderRow({
	folder,
	actions,
}: {
	folder: FolderView;
	actions: TreeActions | undefined;
}) {
	const [mode, setMode] = useState<FolderMode>("view");
	const open = !(actions?.isCollapsed(folder.id) ?? false);
	const count = countBookmarks(folder.children);
	const subfolders = folder.children.filter((c) => c.kind === "folder").length;
	const canNest = folder.depth < MAX_DEPTH;

	let row = (
		<div class="group relative">
			<button
				type="button"
				class={`${ROW} text-ledger-text`}
				aria-expanded={open}
				onClick={() => actions?.onToggleFolder(folder.id, open)}
			>
				<ChevronRight
					class={`size-3.5 shrink-0 text-ledger-faint transition-transform duration-200 ${open ? "rotate-90" : ""}`}
				/>
				<Folder class="size-4 shrink-0 text-ledger-gold/75" />
				<span class="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
				<span class="text-[11px] text-ledger-faint tabular-nums">{count}</span>
			</button>
			{actions && (
				<div class={HOVER_ACTIONS}>
					{canNest && (
						<button
							type="button"
							class={ICON_BUTTON}
							aria-label={`New folder in ${folder.name}`}
							onClick={() => {
								if (!open) actions.onToggleFolder(folder.id, false);
								setMode("new-child");
							}}
						>
							<FolderPlus class="size-3.5" />
						</button>
					)}
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={`Rename ${folder.name}`}
						onClick={() => setMode("rename")}
					>
						<Pencil class="size-3.5" />
					</button>
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={`Archive ${folder.name}`}
						onClick={() => actions.onArchiveFolder(folder.id, true)}
					>
						<Archive class="size-3.5" />
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} hover:text-red-300`}
						aria-label={`Delete ${folder.name}`}
						onClick={() => setMode("confirm-delete")}
					>
						<Trash class="size-3.5" />
					</button>
				</div>
			)}
		</div>
	);

	if (mode === "rename" && actions) {
		row = (
			<NameField
				initial={folder.name}
				label="Folder name"
				onDone={(name) => {
					if (name !== null && name !== folder.name) {
						actions.onRenameFolder(folder.id, name);
					}
					setMode("view");
				}}
			/>
		);
	}
	if (mode === "confirm-delete" && actions) {
		const inside = [
			count > 0 ? plural(count, "bookmark") : null,
			subfolders > 0 ? plural(subfolders, "subfolder") : null,
		].filter(Boolean);
		row = (
			<ConfirmRow
				message={`Delete “${folder.name}”${inside.length ? ` and its ${inside.join(" and ")}` : ""}?`}
				onConfirm={() => actions.onDeleteFolder(folder.id)}
				onCancel={() => setMode("view")}
			/>
		);
	}

	return (
		<li>
			{row}
			{mode === "new-child" && actions && (
				<div class="ml-[15px] border-l border-ledger-border pl-1.5">
					<NameField
						initial=""
						label="New folder name"
						placeholder="Folder name"
						onDone={(name) => {
							if (name?.trim()) actions.onCreateFolder(folder.id, name);
							setMode("view");
						}}
					/>
				</div>
			)}
			{folder.children.length > 0 && (
				// Grid rows animate between 0fr and 1fr, which gives a height
				// transition without measuring content.
				<div
					class={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
					inert={!open}
				>
					<div class="min-h-0 overflow-hidden">
						<TreeLevel nodes={folder.children} actions={actions} nested />
					</div>
				</div>
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
	actions: TreeActions | undefined;
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

function ArchivedSection({
	folders,
	actions,
}: {
	folders: ArchivedFolderView[];
	actions: TreeActions | undefined;
}) {
	const [open, setOpen] = useState(false);
	if (folders.length === 0) return null;
	return (
		<section class="mx-2 mt-2 border-t border-ledger-border pt-2">
			<button
				type="button"
				class={`${ROW} text-ledger-muted`}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
			>
				<ChevronRight
					class={`size-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
				/>
				<Archive class="size-4 shrink-0" />
				<span class="flex-1">Archived</span>
				<span class="text-[11px] tabular-nums">{folders.length}</span>
			</button>
			{open && (
				<ul class="animate-fade-in">
					{folders.map((f) => (
						<li
							key={f.id}
							class="flex h-8 items-center gap-2 rounded px-2 pl-7 text-[13px] text-ledger-muted hover:bg-ledger-raised"
						>
							<span class="min-w-0 flex-1 truncate">{f.name}</span>
							<span class="text-[11px] tabular-nums">{f.bookmarks}</span>
							{actions && (
								<button
									type="button"
									class={ICON_BUTTON}
									aria-label={`Restore ${f.name}`}
									onClick={() => actions.onArchiveFolder(f.id, false)}
								>
									<Restore class="size-3.5" />
								</button>
							)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function BookmarkTree({
	nodes,
	archived = [],
	actions,
}: {
	nodes: TreeNodeView[];
	archived?: ArchivedFolderView[];
	actions?: TreeActions;
}) {
	const [creating, setCreating] = useState(false);

	return (
		<div class="py-2">
			{actions && (
				<div class="flex justify-end px-3 pb-1">
					<button
						type="button"
						class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-gold"
						onClick={() => setCreating(true)}
					>
						<FolderPlus class="size-3.5" />
						New folder
					</button>
				</div>
			)}
			{creating && actions && (
				<div class="px-2">
					<NameField
						initial=""
						label="New folder name"
						placeholder="Folder name"
						onDone={(name) => {
							if (name?.trim()) actions.onCreateFolder(null, name);
							setCreating(false);
						}}
					/>
				</div>
			)}
			{nodes.length === 0 && !creating ? (
				<EmptyState icon={Plus} title="No bookmarks yet">
					Save a search to keep it here. Folders sync to your other browsers.
				</EmptyState>
			) : (
				<nav aria-label="Bookmarks" class="px-2">
					<TreeLevel nodes={nodes} actions={actions} />
				</nav>
			)}
			<ArchivedSection folders={archived} actions={actions} />
		</div>
	);
}
