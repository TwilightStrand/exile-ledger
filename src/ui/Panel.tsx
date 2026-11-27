import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "preact/hooks";
import { titleOfQuery } from "../core/describe";
import { encodeShare } from "../core/exchange";
import { clearHistory, type HistoryEntry } from "../core/history";
import {
	type Clock,
	deleteBookmark,
	emptyLibrary,
	type LibrarySource,
	overwriteBookmark,
	renameBookmark,
	saveSearch,
	setBookmarkDone,
} from "../core/library";
import { searchWatcherHref } from "../core/openUrl";
import { type PinnedItem, unpin } from "../core/pins";
import { applyPlace } from "../core/placement";
import {
	clampPanelWidth,
	DEFAULT_SETTINGS,
	PANEL_WIDTH,
	type PanelSide,
	type PanelWidthUnit,
	panelWidthCss,
	panelWidthValue,
	type Settings,
	type SettingsSource,
} from "../core/settings";
import { createMemorySource, type Source } from "../core/source";
import { OFF_STATUS, type SyncStatus } from "../core/syncEngine";
import type { Game, ParsedTradeUrl } from "../core/tradeUrl";
import {
	changeFolderLeague,
	createFolder,
	deleteFolder,
	renameFolder,
	setArchived,
	setFolderDone,
	setFolderIcon,
	subtreeIds,
} from "../core/tree";
import { DEFAULT_UI_STATE, setCollapsed, type UiState } from "../core/uiState";
import {
	forgetBookmark,
	forgetBookmarks,
	markSeen,
	removeWatcher,
	retargetSearchWatch,
	searchWatcherFrom,
	toggleSearchWatch,
	type Watcher,
} from "../core/watchers";
import type { CaptureFeed, CaptureState } from "../trade/captureFeed";
import { BookmarkTree, type TreeActions } from "./BookmarkTree";
import { CurrentSearch } from "./CurrentSearch";
import { type HistoryActions, HistoryList } from "./HistoryList";
import { useMessages } from "./i18n";
import { ChevronLeft, ChevronRight, Mark } from "./icons";
import { archivedView, historyView, libraryView } from "./libraryView";
import { PinnedList } from "./PinnedList";
import { SYNC_DOT, syncStatusText } from "./syncStatusText";
import { themeStyle } from "./theme";
import { countBookmarks } from "./viewModels";
import { type WatcherActions, WatcherList } from "./WatcherList";
import { useWriteFailures, WriteFailureNotice } from "./writeFailure";

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

function useSettings(
	settings: SettingsSource,
	initial: Settings | undefined,
): Settings {
	const [value, setValue] = useState<Settings>(initial ?? DEFAULT_SETTINGS);
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
	unit: PanelWidthUnit,
	width: number,
	onDone: (width: number) => void,
): {
	width: number;
	onPointerDown: (e: PointerEvent) => void;
	nudge: (delta: number) => void;
	resizing: boolean;
} {
	// The unit travels with the in-progress width: a unit change from the
	// settings tab or sync mid-drag must not read 21 (%) as 21 px.
	const [drag, setDrag] = useState<{
		unit: PanelWidthUnit;
		value: number;
	} | null>(null);
	const dragWidth = drag?.unit === unit ? drag.value : null;
	const setDragWidth = (value: number | null) =>
		setDrag(value === null ? null : { unit, value });
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
			latest = clampPanelWidth(
				unit,
				unit === "px" ? px : (px / viewport) * 100,
			);
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
	const pendingNudge = useRef<(() => void) | null>(null);
	// Closing the panel right after an arrow key still saves that width.
	useEffect(
		() => () => {
			clearTimeout(nudgeTimer.current);
			pendingNudge.current?.();
		},
		[],
	);
	const nudge = (delta: number) => {
		const next = clampPanelWidth(unit, (dragWidth ?? width) + delta);
		setDragWidth(next);
		clearTimeout(nudgeTimer.current);
		const save = () => {
			pendingNudge.current = null;
			if (next !== width) onDone(next);
		};
		pendingNudge.current = save;
		nudgeTimer.current = setTimeout(() => {
			setDragWidth(null);
			save();
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

export const TABS = ["bookmarks", "history", "pinned", "watchers"] as const;
export type TabId = (typeof TABS)[number];

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
	"[box-shadow:0_0_0_1px_color-mix(in_srgb,var(--color-ledger-shadow)_40%,transparent),0_12px_40px_color-mix(in_srgb,var(--color-ledger-shadow)_55%,transparent)]";

export interface PanelProps {
	feed: CaptureFeed;
	settings: SettingsSource;
	/** Settings already loaded by the caller, so the first paint has the right theme. */
	initialSettings?: Settings;
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
	/** Listing and search watchers, checked by the background. */
	watchers?: Source<Watcher[]>;
	/** Whether the background may call the trade API; watchers wait without it. */
	tradeAccess?: Source<boolean>;
	/** Content scripts cannot open the settings page themselves. */
	onOpenSettings?: () => void;
	/** Goes to a URL in this tab; injectable for tests. */
	navigate?: (href: string) => void;
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
	initialSettings,
	library: rawLibrarySource,
	uiState,
	page,
	history: historySource,
	syncStatus: syncStatusSource,
	pins: pinsSource,
	watchers: watchersSource,
	tradeAccess: tradeAccessSource,
	onOpenSettings = () => {},
	navigate = (href) => location.assign(href),
	onJumpToPin = () => false,
	onReserve,
	copyText = (text) => navigator.clipboard.writeText(text),
	initiallyOpen = true,
	initialTab = "bookmarks",
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: PanelProps) {
	const t = useMessages();
	const writes = useWriteFailures(rawLibrarySource);
	const librarySource = writes.source;
	const [tab, setTab] = useState<TabId>(initialTab);
	const [lastSavedId, setLastSavedId] = useState<string | null>(null);
	const capture = useCapture(feed);
	const prefs = useSettings(settings, initialSettings);
	const themeVars = useMemo(() => themeStyle(prefs.theme), [prefs.theme]);
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
	const [ownWatchers] = useState(() => createMemorySource<Watcher[]>([]));
	const watcherStore = watchersSource ?? ownWatchers;
	const watchers = useSource(watcherStore, (): Watcher[] => []);
	// A failed write puts the stored list back on screen, which is the only
	// sign the user needs; the rejection is handled here so it is not lost.
	const changeWatchers = (change: (ws: Watcher[]) => Watcher[]) =>
		watcherStore.update(change).then(
			() => true,
			() => false,
		);
	const [ownAccess] = useState(() => createMemorySource(true));
	const hasTradeAccess = useSource(tradeAccessSource ?? ownAccess, () => true);
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
	const widthUnit = prefs.panelWidthUnit;
	const resize = useResize(side, widthUnit, panelWidthValue(prefs), (value) =>
		settings.save(
			widthUnit === "px" ? { panelWidthPx: value } : { panelWidth: value },
		),
	);
	const widthCss = panelWidthCss(widthUnit, resize.width);
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
		? historyView(historyEntries, library, game, currentPage, t)
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
					name: titleOfQuery(query, t),
					query,
					searchId: event.search.searchId,
					live: currentPage?.location.live ?? false,
				},
				clock(),
				t.bookmarks.defaultFolder,
			);
			setLastSavedId(saved.bookmark.id);
			return saved.library;
		});
	};
	const actions: TreeActions = {
		highlightId: lastSavedId,
		onRename: (id, name) =>
			librarySource.update((lib) => renameBookmark(lib, id, name, now())),
		onDelete: (id) => {
			librarySource.update((lib) => deleteBookmark(lib, id, now()));
			if (watchers.some((w) => w.kind === "search" && w.bookmarkId === id))
				changeWatchers((ws) => forgetBookmark(ws, id));
		},
		onOverwrite:
			capture.search && capture.search.game === game
				? (id) => {
						const event = capture.search;
						if (!event) return;
						librarySource.update((lib) =>
							overwriteBookmark(
								lib,
								id,
								{
									query: event.search.query,
									searchId: event.search.searchId,
									league: event.league,
									live: currentPage?.location.live ?? false,
								},
								now(),
							),
						);
						const name = library.bookmarks.find((b) => b.id === id)?.name;
						if (
							name !== undefined &&
							watchers.some((w) => w.kind === "search" && w.bookmarkId === id)
						)
							changeWatchers((ws) =>
								retargetSearchWatch(ws, id, {
									query: event.search.query,
									name,
									league: event.league,
								}),
							);
					}
				: undefined,
		watched: new Set(
			watchers.flatMap((w) =>
				w.kind === "search" && w.bookmarkId ? [w.bookmarkId] : [],
			),
		),
		onToggleWatch: (id) => {
			const bookmark = library.bookmarks.find((b) => b.id === id);
			if (!bookmark?.query || !currentPage) return;
			const sameGame = currentPage.location.game === bookmark.game;
			const league = sameGame ? currentPage.location.league : bookmark.league;
			const watching = watchers.some(
				(w) => w.kind === "search" && w.bookmarkId === bookmark.id,
			);
			// A league-less bookmark cannot be searched; unwatching still works.
			if (!league && !watching) return;
			const watcher = searchWatcherFrom(
				{ id: bookmark.id, name: bookmark.name, query: bookmark.query },
				{
					origin: currentPage.origin,
					game: bookmark.game,
					// Bookmarks open in the page's league (see bookmarkHref), so they are watched there too.
					realm: sameGame
						? currentPage.location.realm
						: bookmark.game === "poe2"
							? "poe2"
							: null,
					league,
				},
				prefs.watchInterval,
				now(),
				newId(),
			);
			changeWatchers((ws) => toggleSearchWatch(ws, watcher));
		},
		onSetDone: (id, done) =>
			librarySource.update((lib) => setBookmarkDone(lib, id, done, now())),
		onSetFolderDone: (id, done) =>
			librarySource.update((lib) => setFolderDone(lib, id, done, now())),
		onChangeLeague: async (id, league) => {
			let changed = 0;
			await librarySource.update((lib) => {
				const result = changeFolderLeague(lib, id, league, now());
				changed = result.changed;
				return result.library;
			});
			return changed;
		},
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
		onDeleteFolder: (id) => {
			const folders = subtreeIds(library.folders, id);
			const removed = new Set(
				library.bookmarks
					.filter((b) => folders.has(b.folderId))
					.map((b) => b.id),
			);
			librarySource.update((lib) => deleteFolder(lib, id, now()));
			if (
				watchers.some(
					(w) =>
						w.kind === "search" && w.bookmarkId && removed.has(w.bookmarkId),
				)
			)
				changeWatchers((ws) => forgetBookmarks(ws, removed));
		},
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
						name: titleOfQuery(entry.query, t),
						query: entry.query,
						searchId: entry.searchId,
						live: false,
					},
					clock(),
					t.bookmarks.defaultFolder,
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
		watchers: watchers.length,
	};
	const watcherActions: WatcherActions = {
		onRemove: (id) => changeWatchers((ws) => removeWatcher(ws, id)),
		onOpenSearch: (watcher) => {
			// Opens the search even when marking it seen failed: that is what
			// the user asked for.
			changeWatchers((ws) =>
				ws.map((w) =>
					w.id === watcher.id && w.kind === "search" ? markSeen(w) : w,
				),
			).then(() => navigate(searchWatcherHref(watcher)));
		},
		onOpenSettings,
	};

	return (
		<aside
			class={`fixed top-0 z-[2147483000] h-full font-sans text-[13px] leading-5 text-ledger-text antialiased ${classes.aside}`}
			style={themeVars}
			aria-label={t.app.name}
			data-side={side}
			data-density={prefs.compact ? "compact" : undefined}
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
						aria-label={t.panel.resize}
						aria-valuemin={
							widthUnit === "px" ? PANEL_WIDTH.minPx : PANEL_WIDTH.min
						}
						aria-valuemax={
							widthUnit === "px" ? PANEL_WIDTH.maxPx : PANEL_WIDTH.max
						}
						aria-valuenow={resize.width}
						aria-valuetext={
							widthUnit === "px"
								? t.panel.resizeValuePx(resize.width)
								: t.panel.resizeValue(resize.width)
						}
						tabIndex={0}
						class={`group/handle absolute top-0 z-10 h-full w-2 cursor-col-resize ${classes.handle}`}
						onPointerDown={resize.onPointerDown}
						onKeyDown={(e) => {
							// 20 px is about 1% of a 1920 px window, so both units step alike.
							const step = (e.shiftKey ? 4 : 1) * (widthUnit === "px" ? 20 : 1);
							const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
							const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
							if (e.key !== grow && e.key !== shrink) return;
							e.preventDefault();
							resize.nudge(e.key === grow ? step : -step);
						}}
					>
						<span class="mx-auto block h-full w-px bg-transparent transition-colors group-hover/handle:bg-ledger-gold/60 group-focus-visible/handle:bg-ledger-gold" />
					</div>
					<header class="flex h-12 shrink-0 items-center gap-2.5 border-b border-ledger-line/60 bg-[linear-gradient(180deg,var(--color-ledger-header-from),var(--color-ledger-header-to))] px-3.5">
						<Mark class="size-5 text-ledger-gold" />
						<h1 class="font-display text-[17px] tracking-[0.04em] text-ledger-gold-bright">
							{t.app.name}
						</h1>
						<span
							class={`ml-auto size-2 rounded-full ${SYNC_DOT[sync.state]}`}
							title={syncStatusText(sync, now(), t)}
						>
							<span class="sr-only">{syncStatusText(sync, now(), t)}</span>
						</span>
						<button
							type="button"
							class="grid size-7 place-items-center rounded text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-gold focus-visible:outline-2 focus-visible:outline-ledger-gold"
							aria-expanded={true}
							aria-controls="exile-ledger-panel"
							aria-label={t.panel.collapse}
							onClick={() => setOpen(false)}
						>
							<CollapseIcon class="size-4" />
						</button>
					</header>

					<WriteFailureNotice
						failure={writes.failure}
						onDismiss={writes.dismiss}
					/>
					<CurrentSearch capture={capture} saved={saved} onSave={saveCurrent} />

					<div
						role="tablist"
						aria-label={t.panel.sections}
						class="relative mt-3 flex shrink-0 border-b border-ledger-border px-3"
					>
						<span
							aria-hidden="true"
							class="absolute bottom-[-1px] left-3 h-0.5 w-[calc((100%-1.5rem)/4)] rounded-full bg-ledger-gold transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
							style={{ transform: `translateX(${TABS.indexOf(tab) * 100}%)` }}
						/>
						{TABS.map((id) => {
							const label = t.panel.tabs[id];
							const selected = tab === id;
							return (
								<button
									key={id}
									type="button"
									role="tab"
									id={`exile-ledger-tab-${id}`}
									aria-selected={selected}
									aria-controls="exile-ledger-tabpanel"
									title={label}
									class={`flex min-w-0 flex-1 items-center justify-center gap-1 py-2 font-display text-[14px] tracking-[0.03em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ledger-gold ${
										selected
											? "text-ledger-gold-bright"
											: "text-ledger-muted hover:text-ledger-text"
									}`}
									onClick={() => setTab(id)}
								>
									<span class="truncate">{label}</span>
									{counts[id] > 0 && (
										<span class="shrink-0 rounded-full bg-ledger-raised px-1.5 text-[10px] leading-4 text-ledger-muted tabular-nums">
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
						class="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--color-ledger-line)_transparent] [scrollbar-width:thin]"
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
							{tab === "watchers" && (
								<WatcherList
									watchers={watchers}
									hasAccess={hasTradeAccess}
									now={now()}
									actions={watcherActions}
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
					aria-label={t.panel.expand}
					onClick={() => setOpen(true)}
				>
					<Mark class="size-4" />
					<span class="font-display text-[12px] tracking-[0.08em] [writing-mode:vertical-rl]">
						{t.panel.expandTab}
					</span>
					<ExpandIcon class="size-3.5" />
				</button>
			)}
		</aside>
	);
}
