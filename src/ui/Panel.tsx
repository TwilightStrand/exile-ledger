import { useEffect, useState } from "preact/hooks";
import { titleOfQuery } from "../core/describe";
import {
	type Clock,
	deleteBookmark,
	emptyLibrary,
	type LibrarySource,
	renameBookmark,
	saveSearch,
} from "../core/library";
import type { Library } from "../core/model";
import {
	DEFAULT_SETTINGS,
	type PanelSide,
	type SettingsSource,
} from "../core/settings";
import type { Game, ParsedTradeUrl } from "../core/tradeUrl";
import type { CaptureFeed, CaptureState } from "../trade/captureFeed";
import { BookmarkTree } from "./BookmarkTree";
import { CurrentSearch } from "./CurrentSearch";
import { HistoryList } from "./HistoryList";
import { ChevronLeft, ChevronRight, Mark, Pin } from "./icons";
import { libraryView } from "./libraryView";
import { EmptyState } from "./parts";
import { countBookmarks, type HistoryEntryView } from "./viewModels";

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

function useLibrary(source: LibrarySource): Library {
	const [library, setLibrary] = useState<Library>(emptyLibrary);
	useEffect(() => {
		let active = true;
		source.load().then((l) => {
			if (active) setLibrary(l);
		});
		const stop = source.watch(setLibrary);
		return () => {
			active = false;
			stop();
		};
	}, [source]);
	return library;
}

function usePanelSide(settings: SettingsSource): PanelSide {
	const [side, setSide] = useState(DEFAULT_SETTINGS.panelSide);
	useEffect(() => {
		let active = true;
		settings.load().then((s) => {
			if (active) setSide(s.panelSide);
		});
		const stop = settings.watch((s) => setSide(s.panelSide));
		return () => {
			active = false;
			stop();
		};
	}, [settings]);
	return side;
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
		tab: "left-0 rounded-r-md border-l-0",
	},
	right: {
		aside: "right-0",
		panel: "border-l animate-panel-in-right",
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
	/** Read on each render: the trade site changes its URL without reloading. */
	page: () => ParsedTradeUrl | null;
	history?: HistoryEntryView[];
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
	page,
	history = [],
	initiallyOpen = true,
	initialTab = "bookmarks",
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: PanelProps) {
	const [open, setOpen] = useState(initiallyOpen);
	const [tab, setTab] = useState<TabId>(initialTab);
	const [lastSavedId, setLastSavedId] = useState<string | null>(null);
	const capture = useCapture(feed);
	const side = usePanelSide(settings);
	const library = useLibrary(librarySource);
	const currentPage = page();
	const game: Game | null =
		currentPage?.location.game ?? capture.search?.game ?? null;
	const bookmarks = game ? libraryView(library, game, currentPage) : [];
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
	const actions = {
		highlightId: lastSavedId,
		onRename: (id: string, name: string) =>
			librarySource.update((lib) => renameBookmark(lib, id, name, now())),
		onDelete: (id: string) =>
			librarySource.update((lib) => deleteBookmark(lib, id, now())),
	};
	const classes = SIDE_CLASSES[side];
	const CollapseIcon = side === "left" ? ChevronLeft : ChevronRight;
	const ExpandIcon = side === "left" ? ChevronRight : ChevronLeft;
	const counts: Record<TabId, number> = {
		bookmarks: countBookmarks(bookmarks),
		history: history.length,
		pinned: 0,
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
					class={`flex h-full w-[19rem] flex-col border-ledger-line/70 bg-ledger-panel ${classes.panel} ${PANEL_SHADOW}`}
				>
					<header class="flex h-12 shrink-0 items-center gap-2.5 border-b border-ledger-line/60 bg-[linear-gradient(180deg,#1f1912,#14110d)] px-3.5">
						<Mark class="size-5 text-ledger-gold" />
						<h1 class="font-display text-[17px] tracking-[0.04em] text-ledger-gold-bright">
							Exile Ledger
						</h1>
						<button
							type="button"
							class="ml-auto grid size-7 place-items-center rounded text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-gold focus-visible:outline-2 focus-visible:outline-ledger-gold"
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
								<BookmarkTree nodes={bookmarks} actions={actions} />
							)}
							{tab === "history" && (
								<HistoryList entries={history} now={now()} />
							)}
							{tab === "pinned" && (
								<EmptyState icon={Pin} title="Nothing pinned">
									Pin result rows to compare them while you keep searching.
								</EmptyState>
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
