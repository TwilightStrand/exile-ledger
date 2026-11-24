import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { titleOfQuery } from "../core/describe";
import { encodeShare } from "../core/exchange";
import { clearHistory, type HistoryEntry } from "../core/history";
import {
	type Clock,
	deleteBookmark,
	emptyLibrary,
	type LibrarySource,
	renameBookmark,
	saveSearch,
} from "../core/library";
import { type PinnedItem, unpin } from "../core/pins";
import { applyPlace } from "../core/placement";
import {
	clampWidth,
	DEFAULT_SETTINGS,
	PANEL_WIDTH,
	type PanelSide,
	panelWidthCss,
	type Settings,
	type SettingsSource,
} from "../core/settings";
import { createMemorySource, type Source } from "../core/source";
import { OFF_STATUS, type SyncStatus } from "../core/syncEngine";
import type { Game, ParsedTradeUrl } from "../core/tradeUrl";
import {
	createFolder,
	deleteFolder,
	renameFolder,
	setArchived,
	setFolderIcon,
} from "../core/tree";
import { DEFAULT_UI_STATE, setCollapsed, type UiState } from "../core/uiState";
import type { CaptureFeed, CaptureState } from "../trade/captureFeed";
import { BookmarkTree, type TreeActions } from "./BookmarkTree";
import { CurrentSearch } from "./CurrentSearch";
import { type HistoryActions, HistoryList } from "./HistoryList";
import { ChevronLeft, ChevronRight, Mark } from "./icons";
import { archivedView, historyView, libraryView } from "./libraryView";
import { PinnedList } from "./PinnedList";
import { SYNC_DOT, syncStatusText } from "./syncStatusText";
import { countBookmarks } from "./viewModels";

function useCapture(feed: CaptureFeed): CaptureState {
	const [state, setState] = useState(feed.get);
	useEffect(() => {
		const unsubscribe = feed.subscribe(setState);
		return () => {
			unsubscribe();
		};
	}, [feed]);
	return state;
}

/** Loads a source and follows its changes. */
function useSource<T>(source: Source<T>, initial: () => T): T {
	const [value, setValue] = useState<T>(initial);
	useEffect(() => {
		let active = true;
		source.load().then((v) => {
			if (active) setValue(() => v);
		});
		const stop = source.watch((v) => setValue(() => v));
		return () => {
			active = false;
			stop();
		};
	}, [source]);
	return value;
}

function useSettings(settings: SettingsSource): Settings {
	const [value, setValue] = useState<Settings>(DEFAULT_SETTINGS);
	useEffect(() => {
		let active = true;
		settings.load().then((s) => {
			if (active) setValue(s);
		});
		const stop = settings.watch(setValue);
		return () => {
			active = false;
			stop();
		};
	}, [settings]);
	return value;
}

const KEY_RESIZE_SAVE_MS = 400;

/**
 * Drag the panel's inner edge to resize; saved once, when the drag ends.
 * Tracks pixels from the rendered width so the edge stays under the pointer
 * even where the pixel bounds override the percentage.
 */
function useResize(
	side: PanelSide,
	width: number,
	onDone: (width: number) => void,
): {
	width: number;
	onPointerDown: (e: PointerEvent) => void;
	nudge: (delta: number) => void;
	resizing: boolean;
} {
	const [dragWidth, setDragWidth] = useState<number | null>(null);
	const onPointerDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		const panel =
			e.currentTarget instanceof HTMLElement
				? e.currentTarget.parentElement
				: null;
		if (!panel) return;
		e.preventDefault();
		const startX = e.clientX;
		const startPx = panel.getBoundingClientRect().width;
		const viewport = window.innerWidth;
		const direction = side === "left" ? 1 : -1;
		let latest = width;
		const move = (ev: PointerEvent) => {
			const px = Math.min(
				PANEL_WIDTH.maxPx,
				Math.max(
					PANEL_WIDTH.minPx,
					startPx + (ev.clientX - startX) * direction,
				),
			);
			latest = clampWidth((px / viewport) * 100);
			setDragWidth(latest);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			setDragWidth(null);
			if (latest !== width) onDone(latest);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};
	// Arrow keys repeat about 30 times a second while held; saving each step
	// would burn through Chrome's 120 storage.sync writes a minute.
	const nudgeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	useEffect(() => () => clearTimeout(nudgeTimer.current), []);
	const nudge = (delta: number) => {
		const next = clampWidth((dragWidth ?? width) + delta);
		setDragWidth(next);
		clearTimeout(nudgeTimer.current);
		nudgeTimer.current = setTimeout(() => {
			setDragWidth(null);
			if (next !== width) onDone(next);
		}, KEY_RESIZE_SAVE_MS);
	};
	return {
		width: dragWidth ?? width,
		onPointerDown,
		nudge,
		resizing: dragWidth !== null,
	};
}

/** The strip of page the panel takes in push mode, as a CSS length; null when it floats or is closed. */
export interface Reserve {
	side: PanelSide;
	width: string | null;
}

export const TABS = ["bookmarks", "history", "pinned"] as const;
export type TabId = (typeof TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
	bookmarks: "Bookmarks",
	history: "History",
	pinned: "Pinned",
};

// Literal class strings so Tailwind's scanner picks them up.
const SIDE_CLASSES = {
	left: {
		aside: "left-0",
		panel: "border-r animate-panel-in-left",
		handle: "-right-1",
		tab: "left-0 rounded-r-md border-l-0",
	},
	right: {
		aside: "right-0",
		panel: "border-l animate-panel-in-right",
		handle: "-left-1",
		tab: "right-0 rounded-l-md border-r-0",
	},
} as const;

// Box shadows set by hand: Tailwind's shadow utilities rely on @property, which
// shadow roots ignore.
const PANEL_SHADOW =
	"[box-shadow:0_0_0_1px_rgb(0_0_0/0.4),0_12px_40px_rgb(0_0_0/0.55)]";

export interface PanelProps {
	feed: CaptureFeed;
	settings: SettingsSource;
	library: LibrarySource;
	/** Per-machine view state such as collapsed folders. */
	uiState?: Source<UiState>;
	/** Read on each render: the trade site changes its URL without reloading. */
	page: () => ParsedTradeUrl | null;
	/** Results pinned in this tab; shared with the page's Pin buttons. */
	pins?: Source<PinnedItem[]>;
	/** Scrolls the page to a result; false when it is no longer there. */
	onJumpToPin?: (id: string) => boolean;
	/** Written by the background sync; shown as a dot in the header. */
	syncStatus?: Source<SyncStatus>;
	/** Searches the page ran; recorded by the content script, read here. */
	history?: Source<HistoryEntry[]>;
	/** Clipboard write; injectable because tests and previews have no clipboard. */
	copyText?: (text: string) => Promise<void>;
	/** Push mode: the host narrows the page by this much on this side. */
	onReserve?: (reserve: Reserve) => void;
	/** Previews pass these to show a given state. */
	initiallyOpen?: boolean;
	initialTab?: TabId;
	now?: () => number;
	newId?: () => string;
}

export function Panel({
	feed,
	settings,
	library: librarySource,
	uiState,
	page,
	history: historySource,
	syncStatus: syncStatusSource,
	pins: pinsSource,
	onJumpToPin = () => false,
	onReserve,
	copyText = (text) => navigator.clipboard.writeText(text),
	initiallyOpen = true,
	initialTab = "bookmarks",
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: PanelProps) {
	const [tab, setTab] = useState<TabId>(initialTab);
	const [lastSavedId, setLastSavedId] = useState<string | null>(null);
	const capture = useCapture(feed);
	const prefs = useSettings(settings);
	const side = prefs.panelSide;
	const library = useSource(librarySource, emptyLibrary);
	const [ownUiState] = useState(() =>
		createMemorySource<UiState>({
			...DEFAULT_UI_STATE,
			panelOpen: initiallyOpen,
		}),
	);
	const uiStateSource = uiState ?? ownUiState;
	const [ownPins] = useState(() => createMemorySource<PinnedItem[]>([]));
	const pinStore = pinsSource ?? ownPins;
	const pinned = useSource(pinStore, (): PinnedItem[] => []);
	const [ownSyncStatus] = useState(() => createMemorySource(OFF_STATUS));
	const sync = useSource(syncStatusSource ?? ownSyncStatus, () => OFF_STATUS);
	const [ownHistory] = useState(() => createMemorySource<HistoryEntry[]>([]));
	const historyStore = historySource ?? ownHistory;
	const historyEntries = useSource(historyStore, (): HistoryEntry[] => []);
	const ui = useSource(uiStateSource, () => ({
		...DEFAULT_UI_STATE,
		panelOpen: initiallyOpen,
	}));
	const open = ui.panelOpen;
	const setOpen = (panelOpen: boolean) =>
		uiStateSource.update((state) => ({ ...state, panelOpen }));
	const resize = useResize(side, prefs.panelWidth, (panelWidth) =>
		settings.save({ panelWidth }),
	);
	const widthCss = panelWidthCss(resize.width);
	const reserveWidth = prefs.panelMode === "push" && open ? widthCss : null;
	// Layout effect so the page margin changes in the same frame as the panel.
	useLayoutEffect(() => {
		onReserve?.({ side, width: reserveWidth });
	}, [onReserve, side, reserveWidth]);
	const currentPage = page();
	const game: Game | null =
		currentPage?.location.game ?? capture.search?.game ?? null;
	const bookmarks = game ? libraryView(library, game, currentPage) : [];
	const archived = game ? archivedView(library, game) : [];
	const history = game
		? historyView(historyEntries, library, game, currentPage)
		: [];
	const searchId = capture.search?.search.searchId;
	const saved =
		searchId !== undefined &&
		library.bookmarks.some((b) => b.searchId === searchId);
	const clock = (): Clock => ({ now: now(), newId });

	const saveCurrent = () => {
		const event = capture.search;
		if (!event) return;
		const query = event.search.query;
		librarySource.update((lib) => {
			const saved = saveSearch(
				lib,
				{
					game: event.game,
					league: event.league,
					name: titleOfQuery(query),
					query,
					searchId: event.search.searchId,
					live: currentPage?.location.live ?? false,
				},
				clock(),
			);
			setLastSavedId(saved.bookmark.id);
			return saved.library;
		});
	};
	const actions: TreeActions = {
		highlightId: lastSavedId,
		onRename: (id, name) =>
			librarySource.update((lib) => renameBookmark(lib, id, name, now())),
		onDelete: (id) =>
			librarySource.update((lib) => deleteBookmark(lib, id, now())),
		onCreateFolder: (parentId, name) => {
			if (!game) return;
			librarySource.update((lib) => {
				const created = createFolder(lib, { name, game, parentId }, clock());
				return created.ok ? created.library : lib;
			});
		},
		onRenameFolder: (id, name) =>
			librarySource.update((lib) => renameFolder(lib, id, name, now())),
		onArchiveFolder: (id, isArchived) =>
			librarySource.update((lib) => setArchived(lib, id, isArchived, now())),
		onDeleteFolder: (id) =>
			librarySource.update((lib) => deleteFolder(lib, id, now())),
		onSetIcon: (id, icon) =>
			librarySource.update((lib) => setFolderIcon(lib, id, icon, now())),
		onShareFolder: async (id) => {
			const text = encodeShare(await librarySource.load(), id);
			if (text) await copyText(text);
		},
		onPlace: (item, target) =>
			librarySource.update((lib) =>
				applyPlace(lib, { ...item, ...target }, now()),
			),
		isCollapsed: (id) => ui.collapsed.includes(id),
		onToggleFolder: (id, collapsed) =>
			uiStateSource.update((state) => setCollapsed(state, id, collapsed)),
	};
	const classes = SIDE_CLASSES[side];
	const CollapseIcon = side === "left" ? ChevronLeft : ChevronRight;
	const ExpandIcon = side === "left" ? ChevronRight : ChevronLeft;
	const historyActions: HistoryActions = {
		onSave: (id) => {
			const entry = historyEntries.find((h) => h.id === id);
			if (!entry) return;
			librarySource.update((lib) => {
				const saved = saveSearch(
					lib,
					{
						game: entry.game,
						league: entry.league,
						name: titleOfQuery(entry.query),
						query: entry.query,
						searchId: entry.searchId,
						live: false,
					},
					clock(),
				);
				setLastSavedId(saved.bookmark.id);
				return saved.library;
			});
		},
		onClear: () => {
			if (game) historyStore.update((h) => clearHistory(h, game));
		},
	};
	const counts: Record<TabId, number> = {
		bookmarks: countBookmarks(bookmarks),
		history: history.length,
		pinned: pinned.length,
	};

	return (
		<aside
			class={`fixed top-0 z-[2147483000] h-full font-sans text-[13px] leading-5 text-ledger-text antialiased [color-scheme:dark] ${classes.aside}`}
			aria-label="Exile Ledger"
			data-side={side}
		>
			{open ? (
				<div
					id="exile-ledger-panel"
					class={`relative flex h-full flex-col border-ledger-line/70 bg-ledger-panel ${classes.panel} ${PANEL_SHADOW} ${resize.resizing ? "select-none" : ""}`}
					style={{ width: widthCss }}
				>
					{/* biome-ignore lint/a11y/useSemanticElements: a focusable window splitter needs role=separator with a value; <hr> cannot take focus. */}
					<div
						role="separator"
						aria-orientation="vertical"
						aria-label="Resize panel"
						aria-valuemin={PANEL_WIDTH.min}
						aria-valuemax={PANEL_WIDTH.max}
						aria-valuenow={resize.width}
						aria-valuetext={`${resize.width}% of the window`}
						tabIndex={0}
						class={`group/handle absolute top-0 z-10 h-full w-2 cursor-col-resize ${classes.handle}`}
						onPointerDown={resize.onPointerDown}
						onKeyDown={(e) => {
							const step = e.shiftKey ? 4 : 1;
							const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
							const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
							if (e.key !== grow && e.key !== shrink) return;
							e.preventDefault();
							resize.nudge(e.key === grow ? step : -step);
						}}
					>
						<span class="mx-auto block h-full w-px bg-transparent transition-colors group-hover/handle:bg-ledger-gold/60 group-focus-visible/handle:bg-ledger-gold" />
					</div>
					<header class="flex h-12 shrink-0 items-center gap-2.5 border-b border-ledger-line/60 bg-[linear-gradient(180deg,#1f1912,#14110d)] px-3.5">
						<Mark class="size-5 text-ledger-gold" />
						<h1 class="font-display text-[17px] tracking-[0.04em] text-ledger-gold-bright">
							Exile Ledger
						</h1>
						<span
							class={`ml-auto size-2 rounded-full ${SYNC_DOT[sync.state]}`}
							title={syncStatusText(sync, now())}
						>
							<span class="sr-only">{syncStatusText(sync, now())}</span>
						</span>
						<button
							type="button"
							class="grid size-7 place-items-center rounded text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-gold focus-visible:outline-2 focus-visible:outline-ledger-gold"
							aria-expanded={true}
							aria-controls="exile-ledger-panel"
							aria-label="Collapse Exile Ledger"
							onClick={() => setOpen(false)}
						>
							<CollapseIcon class="size-4" />
						</button>
					</header>

					<CurrentSearch capture={capture} saved={saved} onSave={saveCurrent} />

					<div
						role="tablist"
						aria-label="Panel sections"
						class="relative mt-3 flex shrink-0 border-b border-ledger-border px-3"
					>
						<span
							aria-hidden="true"
							class="absolute bottom-[-1px] left-3 h-0.5 w-[calc((100%-1.5rem)/3)] rounded-full bg-ledger-gold transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
							style={{ transform: `translateX(${TABS.indexOf(tab) * 100}%)` }}
						/>
						{TABS.map((id) => {
							const label = TAB_LABELS[id];
							const selected = tab === id;
							return (
								<button
									key={id}
									type="button"
									role="tab"
									id={`exile-ledger-tab-${id}`}
									aria-selected={selected}
									aria-controls="exile-ledger-tabpanel"
									class={`flex flex-1 items-center justify-center gap-1.5 py-2 font-display text-[14px] tracking-[0.03em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ledger-gold ${
										selected
											? "text-ledger-gold-bright"
											: "text-ledger-muted hover:text-ledger-text"
									}`}
									onClick={() => setTab(id)}
								>
									{label}
									{counts[id] > 0 && (
										<span class="rounded-full bg-ledger-raised px-1.5 text-[10px] leading-4 text-ledger-muted tabular-nums">
											{counts[id]}
										</span>
									)}
								</button>
							);
						})}
					</div>

					<div
						id="exile-ledger-tabpanel"
						role="tabpanel"
						aria-labelledby={`exile-ledger-tab-${tab}`}
						class="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#4a3b27_transparent] [scrollbar-width:thin]"
					>
						<div key={tab} class="animate-fade-in">
							{tab === "bookmarks" && (
								<BookmarkTree
									nodes={bookmarks}
									archived={archived}
									actions={actions}
								/>
							)}
							{tab === "history" && (
								<HistoryList
									entries={history}
									now={now()}
									actions={historyActions}
								/>
							)}
							{tab === "pinned" && (
								<PinnedList
									pins={pinned}
									onJump={onJumpToPin}
									onUnpin={(id) => pinStore.update((p) => unpin(p, id))}
								/>
							)}
						</div>
					</div>
				</div>
			) : (
				<button
					type="button"
					class={`absolute top-24 flex h-32 w-8 animate-fade-in flex-col items-center justify-center gap-2 border border-ledger-line/70 bg-ledger-panel text-ledger-gold transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold ${classes.tab} ${PANEL_SHADOW}`}
					aria-expanded={false}
					aria-controls="exile-ledger-panel"
					aria-label="Expand Exile Ledger"
					onClick={() => setOpen(true)}
				>
					<Mark class="size-4" />
					<span class="font-display text-[12px] tracking-[0.08em] [writing-mode:vertical-rl]">
						Ledger
					</span>
					<ExpandIcon class="size-3.5" />
				</button>
			)}
		</aside>
	);
}
