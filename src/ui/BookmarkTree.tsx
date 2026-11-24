import { createContext } from "preact";
import {
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "preact/hooks";
import { FOLDER_ICONS, type FolderIcon } from "../core/model";
import { MAX_DEPTH } from "../core/tree";
import { FOLDER_ICON_COMPONENTS } from "./folderIcons";
import { useMessages } from "./i18n";
import {
	Archive,
	Bolt,
	Check,
	ChevronRight,
	FolderPlus,
	Pencil,
	Plus,
	Restore,
	Share,
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

export interface DragItem {
	kind: "bookmark" | "folder";
	id: string;
}

/** Where to put an item: under `parentId`, before the sibling `beforeId` (null for the end). */
export interface PlaceTarget {
	parentId: string | null;
	beforeId: string | null;
}

export interface TreeActions {
	/** The bookmark saved last, flashed once so the eye finds it. */
	highlightId?: string | null;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	onCreateFolder: (parentId: string | null, name: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onArchiveFolder: (id: string, archived: boolean) => void;
	onDeleteFolder: (id: string) => void;
	onSetIcon: (id: string, icon: FolderIcon) => void;
	/** Resolves once the folder's share string is on the clipboard. */
	onShareFolder: (id: string) => Promise<void>;
	onPlace: (item: DragItem, target: PlaceTarget) => void;
	isCollapsed: (id: string) => boolean;
	onToggleFolder: (id: string, collapsed: boolean) => void;
}

/** A row's neighbours, for drop targets and keyboard moves. */
interface RowPlace {
	parentId: string | null;
	grandParentId: string | null;
	prevId: string | null;
	nextId: string | null;
	nextNextId: string | null;
}

type DropWhere = "before" | "after" | "into";

interface DragState {
	dragging: DragItem | null;
	hint: { id: string; where: DropWhere } | null;
	setDragging: (item: DragItem | null) => void;
	setHint: (hint: { id: string; where: DropWhere } | null) => void;
}

const DragContext = createContext<DragState>({
	dragging: null,
	hint: null,
	setDragging: () => {},
	setHint: () => {},
});

const ROW =
	"flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[13px] transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold";

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint transition-colors hover:bg-ledger-border hover:text-ledger-text focus-visible:outline-2 focus-visible:outline-ledger-gold";

const HOVER_ACTIONS =
	"pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 rounded bg-ledger-raised pl-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100";

// Box shadows written out: Tailwind's shadow utilities need @property, which shadow roots ignore.
const HINT_CLASSES: Record<DropWhere, string> = {
	before: "[box-shadow:inset_0_2px_0_var(--color-ledger-gold)]",
	after: "[box-shadow:inset_0_-2px_0_var(--color-ledger-gold)]",
	into: "bg-ledger-gold/15 [box-shadow:inset_0_0_0_1px_color-mix(in_srgb,var(--color-ledger-gold)_60%,transparent)]",
};

const KEY_HINT = "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight";

function dropWhere(
	e: DragEvent,
	item: DragItem,
	rowKind: DragItem["kind"],
): DropWhere | null {
	const target = e.currentTarget;
	if (!(target instanceof HTMLElement)) return null;
	const rect = target.getBoundingClientRect();
	const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
	if (rowKind === "bookmark") {
		if (item.kind !== "bookmark") return null;
		return y < 0.5 ? "before" : "after";
	}
	if (item.kind === "bookmark") return "into";
	if (y < 0.25) return "before";
	if (y > 0.75) return "after";
	return "into";
}

/** Drag source and drop target wiring shared by bookmark and folder rows. */
function useDragRow(
	self: DragItem,
	place: RowPlace,
	actions: TreeActions | undefined,
) {
	const drag = useContext(DragContext);
	const hint = drag.hint?.id === self.id ? drag.hint.where : null;
	const isDragged = drag.dragging?.id === self.id;

	const targetFor = (where: DropWhere): PlaceTarget =>
		where === "into"
			? { parentId: self.id, beforeId: null }
			: {
					parentId: place.parentId,
					beforeId: where === "before" ? self.id : place.nextId,
				};

	const onKeyDown = (e: KeyboardEvent) => {
		if (!actions || !e.altKey) return;
		const moves: Record<string, PlaceTarget | null> = {
			ArrowUp: place.prevId
				? { parentId: place.parentId, beforeId: place.prevId }
				: null,
			ArrowDown: place.nextId
				? { parentId: place.parentId, beforeId: place.nextNextId }
				: null,
			// Bookmarks cannot sit at the root, so they only move out when there is a level above.
			ArrowLeft:
				place.parentId !== null &&
				(self.kind === "folder" || place.grandParentId !== null)
					? { parentId: place.grandParentId, beforeId: null }
					: null,
			ArrowRight:
				self.kind === "folder" && place.prevId
					? { parentId: place.prevId, beforeId: null }
					: null,
		};
		const target = moves[e.key];
		if (target === undefined) return;
		e.preventDefault();
		if (target) actions.onPlace(self, target);
	};

	const props = actions
		? {
				draggable: true,
				onDragStart: (e: DragEvent) => {
					e.stopPropagation();
					// Firefox starts a drag only when some data is set.
					e.dataTransfer?.setData("text/plain", self.id);
					if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
					drag.setDragging(self);
				},
				onDragEnd: () => {
					drag.setDragging(null);
					drag.setHint(null);
				},
				onDragOver: (e: DragEvent) => {
					const item = drag.dragging;
					if (!item || item.id === self.id) return;
					const where = dropWhere(e, item, self.kind);
					if (!where) return;
					e.preventDefault();
					e.stopPropagation();
					if (drag.hint?.id !== self.id || drag.hint.where !== where) {
						drag.setHint({ id: self.id, where });
					}
				},
				onDragLeave: (e: DragEvent) => {
					const next = e.relatedTarget;
					if (
						next instanceof Node &&
						e.currentTarget instanceof Node &&
						e.currentTarget.contains(next)
					) {
						return;
					}
					if (drag.hint?.id === self.id) drag.setHint(null);
				},
				onDrop: (e: DragEvent) => {
					const item = drag.dragging;
					const where = item ? dropWhere(e, item, self.kind) : null;
					drag.setDragging(null);
					drag.setHint(null);
					if (!item || !where || item.id === self.id) return;
					e.preventDefault();
					e.stopPropagation();
					actions.onPlace(item, targetFor(where));
				},
			}
		: {};

	const stateClass = `${hint ? HINT_CLASSES[hint] : ""} ${isDragged ? "opacity-40" : ""}`;
	return { props, onKeyDown, stateClass };
}

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
	const t = useMessages();
	return (
		<div class="flex min-h-8 animate-fade-in items-center gap-2 rounded bg-ledger-danger-bg/40 px-2 py-1 text-[12px]">
			<span class="min-w-0 flex-1 text-ledger-text">{message}</span>
			<button
				type="button"
				class="rounded px-2 py-0.5 font-semibold text-ledger-danger hover:bg-ledger-danger-mark/20"
				onClick={onConfirm}
			>
				{t.common.delete}
			</button>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-ledger-muted hover:bg-ledger-raised"
				onClick={onCancel}
			>
				{t.common.keep}
			</button>
		</div>
	);
}

function IconPicker({
	current,
	onPick,
}: {
	current: FolderIcon;
	onPick: (icon: FolderIcon | null) => void;
}) {
	const t = useMessages();
	return (
		<fieldset
			aria-label={t.bookmarks.folderIcon}
			class="ml-[15px] grid animate-fade-in grid-cols-6 gap-1 border-0 border-l border-ledger-border py-1 pl-2"
			onKeyDown={(e) => {
				if (e.key === "Escape") onPick(null);
			}}
		>
			{FOLDER_ICONS.map((icon) => {
				const Icon = FOLDER_ICON_COMPONENTS[icon];
				const selected = icon === current;
				return (
					<button
						key={icon}
						type="button"
						aria-pressed={selected}
						aria-label={t.bookmarks.folderIcons[icon]}
						title={t.bookmarks.folderIcons[icon]}
						class={`grid h-7 place-items-center rounded border transition-colors focus-visible:outline-2 focus-visible:outline-ledger-gold ${
							selected
								? "border-ledger-gold/60 bg-ledger-gold/15 text-ledger-gold-bright"
								: "border-transparent text-ledger-muted hover:bg-ledger-raised hover:text-ledger-gold"
						}`}
						onClick={() => onPick(icon)}
					>
						<Icon class="size-4" />
					</button>
				);
			})}
		</fieldset>
	);
}

function BookmarkRow({
	bookmark,
	place,
	actions,
}: {
	bookmark: BookmarkView;
	place: RowPlace;
	actions: TreeActions | undefined;
}) {
	const t = useMessages();
	const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">(
		"view",
	);
	const { props, onKeyDown, stateClass } = useDragRow(
		{ kind: "bookmark", id: bookmark.id },
		place,
		actions,
	);

	if (mode === "rename" && actions) {
		return (
			<NameField
				initial={bookmark.title}
				label={t.bookmarks.bookmarkName}
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
				message={t.bookmarks.confirmDeleteBookmark(bookmark.title)}
				onConfirm={() => actions.onDelete(bookmark.id)}
				onCancel={() => setMode("view")}
			/>
		);
	}

	return (
		<div class={`group relative rounded ${stateClass}`} {...props}>
			<a
				class={`${ROW} text-ledger-text no-underline ${actions?.highlightId === bookmark.id ? "animate-glow" : ""}`}
				href={bookmark.href}
				title={`${bookmark.title} · ${bookmark.league}`}
				draggable={false}
				aria-keyshortcuts={actions ? KEY_HINT : undefined}
				onKeyDown={onKeyDown}
			>
				<span class="min-w-0 flex-1 truncate">{bookmark.title}</span>
				{bookmark.live && (
					<span class="shrink-0 text-ledger-live" title={t.common.liveSearch}>
						<Bolt class="size-3.5" />
						<span class="sr-only">{t.common.liveSearch}</span>
					</span>
				)}
				<GameTag game={bookmark.game} />
			</a>
			{actions && (
				<div class={HOVER_ACTIONS}>
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={t.bookmarks.rename(bookmark.title)}
						onClick={() => setMode("rename")}
					>
						<Pencil class="size-3.5" />
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} hover:text-ledger-danger`}
						aria-label={t.bookmarks.delete(bookmark.title)}
						onClick={() => setMode("confirm-delete")}
					>
						<Trash class="size-3.5" />
					</button>
				</div>
			)}
		</div>
	);
}

type FolderMode = "view" | "rename" | "new-child" | "confirm-delete" | "icon";

function FolderRow({
	folder,
	place,
	actions,
}: {
	folder: FolderView;
	place: RowPlace;
	actions: TreeActions | undefined;
}) {
	const t = useMessages();
	const [mode, setMode] = useState<FolderMode>("view");
	const [copied, setCopied] = useState(false);
	const open = !(actions?.isCollapsed(folder.id) ?? false);
	const count = countBookmarks(folder.children);
	const subfolders = folder.children.filter((c) => c.kind === "folder").length;
	const canNest = folder.depth < MAX_DEPTH;
	const Icon = FOLDER_ICON_COMPONENTS[folder.icon];
	const { props, onKeyDown, stateClass } = useDragRow(
		{ kind: "folder", id: folder.id },
		place,
		actions,
	);

	let row = (
		<div class={`group relative rounded ${stateClass}`} {...props}>
			<button
				type="button"
				class={`${ROW} text-ledger-text`}
				aria-expanded={open}
				aria-keyshortcuts={actions ? KEY_HINT : undefined}
				onClick={() => actions?.onToggleFolder(folder.id, open)}
				onKeyDown={onKeyDown}
			>
				<ChevronRight
					class={`size-3.5 shrink-0 text-ledger-faint transition-transform duration-200 ${open ? "rotate-90" : ""}`}
				/>
				<Icon class="size-4 shrink-0 text-ledger-gold/75" />
				<span class="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
				<span class="text-[11px] text-ledger-faint tabular-nums">{count}</span>
			</button>
			{actions && (
				<div class={HOVER_ACTIONS}>
					{canNest && (
						<button
							type="button"
							class={ICON_BUTTON}
							aria-label={t.bookmarks.newFolderIn(folder.name)}
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
						aria-label={t.bookmarks.changeIcon(folder.name)}
						onClick={() => setMode(mode === "icon" ? "view" : "icon")}
					>
						<Icon class="size-3.5" />
					</button>
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={t.bookmarks.rename(folder.name)}
						onClick={() => setMode("rename")}
					>
						<Pencil class="size-3.5" />
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} ${copied ? "text-ledger-live" : ""}`}
						aria-label={
							copied
								? t.bookmarks.shareCopied
								: t.bookmarks.copyShareFor(folder.name)
						}
						title={copied ? t.bookmarks.copied : t.bookmarks.copyShare}
						onClick={() =>
							actions.onShareFolder(folder.id).then(() => {
								setCopied(true);
								setTimeout(() => setCopied(false), 1500);
							})
						}
					>
						{copied ? <Check class="size-3.5" /> : <Share class="size-3.5" />}
					</button>
					<button
						type="button"
						class={ICON_BUTTON}
						aria-label={t.bookmarks.archive(folder.name)}
						onClick={() => actions.onArchiveFolder(folder.id, true)}
					>
						<Archive class="size-3.5" />
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} hover:text-ledger-danger`}
						aria-label={t.bookmarks.delete(folder.name)}
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
				label={t.bookmarks.folderName}
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
		row = (
			<ConfirmRow
				message={t.bookmarks.confirmDeleteFolder(
					folder.name,
					count,
					subfolders,
				)}
				onConfirm={() => actions.onDeleteFolder(folder.id)}
				onCancel={() => setMode("view")}
			/>
		);
	}

	return (
		<li>
			{row}
			{mode === "icon" && actions && (
				<IconPicker
					current={folder.icon}
					onPick={(icon) => {
						if (icon) actions.onSetIcon(folder.id, icon);
						setMode("view");
					}}
				/>
			)}
			{mode === "new-child" && actions && (
				<div class="ml-[15px] border-l border-ledger-border pl-1.5">
					<NameField
						initial=""
						label={t.bookmarks.newFolderName}
						placeholder={t.bookmarks.folderNamePlaceholder}
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
						<TreeLevel
							nodes={folder.children}
							parentId={folder.id}
							grandParentId={place.parentId}
							actions={actions}
							nested
						/>
					</div>
				</div>
			)}
		</li>
	);
}

/** Neighbours among siblings of the same kind; folders and bookmarks order separately. */
function placesFor(
	nodes: TreeNodeView[],
	parentId: string | null,
	grandParentId: string | null,
): Map<string, RowPlace> {
	const places = new Map<string, RowPlace>();
	const kinds: DragItem["kind"][] = ["folder", "bookmark"];
	for (const kind of kinds) {
		const ids = nodes.filter((n) => n.kind === kind).map((n) => n.id);
		ids.forEach((id, i) => {
			places.set(id, {
				parentId,
				grandParentId,
				prevId: ids[i - 1] ?? null,
				nextId: ids[i + 1] ?? null,
				nextNextId: ids[i + 2] ?? null,
			});
		});
	}
	return places;
}

function TreeLevel({
	nodes,
	parentId,
	grandParentId,
	actions,
	nested = false,
}: {
	nodes: TreeNodeView[];
	parentId: string | null;
	grandParentId: string | null;
	actions: TreeActions | undefined;
	nested?: boolean;
}) {
	const places = placesFor(nodes, parentId, grandParentId);
	const fallback: RowPlace = {
		parentId,
		grandParentId,
		prevId: null,
		nextId: null,
		nextNextId: null,
	};
	return (
		<ul
			class={
				nested ? "ml-[15px] border-l border-ledger-border pl-1.5" : undefined
			}
		>
			{nodes.map((node) =>
				node.kind === "folder" ? (
					<FolderRow
						key={node.id}
						folder={node}
						place={places.get(node.id) ?? fallback}
						actions={actions}
					/>
				) : (
					<li key={node.id}>
						<BookmarkRow
							bookmark={node}
							place={places.get(node.id) ?? fallback}
							actions={actions}
						/>
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
	const t = useMessages();
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
				<span class="flex-1">{t.bookmarks.archived}</span>
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
									aria-label={t.bookmarks.restore(f.name)}
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
	const t = useMessages();
	const [creating, setCreating] = useState(false);
	const [dragging, setDragging] = useState<DragItem | null>(null);
	const [hint, setHint] = useState<DragState["hint"]>(null);
	const drag = useMemo(
		() => ({ dragging, hint, setDragging, setHint }),
		[dragging, hint],
	);

	return (
		<DragContext.Provider value={drag}>
			<div class="py-2">
				{actions && (
					<div class="flex justify-end px-3 pb-1">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-gold"
							onClick={() => setCreating(true)}
						>
							<FolderPlus class="size-3.5" />
							{t.bookmarks.newFolder}
						</button>
					</div>
				)}
				{creating && actions && (
					<div class="px-2">
						<NameField
							initial=""
							label={t.bookmarks.newFolderName}
							placeholder={t.bookmarks.folderNamePlaceholder}
							onDone={(name) => {
								if (name?.trim()) actions.onCreateFolder(null, name);
								setCreating(false);
							}}
						/>
					</div>
				)}
				{nodes.length === 0 && !creating ? (
					<EmptyState icon={Plus} title={t.bookmarks.emptyTitle}>
						{t.bookmarks.emptyBody}
					</EmptyState>
				) : (
					<nav aria-label={t.bookmarks.nav} class="px-2">
						<TreeLevel
							nodes={nodes}
							parentId={null}
							grandParentId={null}
							actions={actions}
						/>
					</nav>
				)}
				<ArchivedSection folders={archived} actions={actions} />
			</div>
		</DragContext.Provider>
	);
}
