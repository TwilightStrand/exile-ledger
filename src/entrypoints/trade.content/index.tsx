import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { storage } from "wxt/utils/storage";
import { titleOfQuery } from "../../core/describe";
import { recordSearch } from "../../core/history";
import { messagesFor, resolveLocale } from "../../core/i18n";
import { PRICING_ACCESS_KEY } from "../../core/messages";
import { type PinnedItem, togglePin } from "../../core/pins";
import { isTradePage, TRADE_MATCHES } from "../../core/sites";
import { createMemorySource } from "../../core/source";
import { parseTradeUrl } from "../../core/tradeUrl";
import {
	listingWatcherFrom,
	toggleListingWatch,
	type Watcher,
} from "../../core/watchers";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserSyncStatus } from "../../storage/syncPorts";
import { browserUiState } from "../../storage/uiStateStore";
import {
	browserTradeAccess,
	browserWatchers,
} from "../../storage/watcherStore";
import { type CaptureEvent, listenForCaptures } from "../../trade/capture";
import { createCaptureFeed } from "../../trade/captureFeed";
import {
	highlightMods,
	installPageStyles,
	setPageTheme,
} from "../../trade/enhanceResults";
import { scheduleEnhance } from "../../trade/enhanceScheduler";
import { annotatePrices } from "../../trade/equivalentPrices";
import { BACK_FORWARD_FLAG } from "../../trade/historyPatch";
import { installHotkeys, TRADE_ACTIONS } from "../../trade/hotkeys";
import { jumpToResult, syncPinButtons } from "../../trade/pinButtons";
import { createRatesClient } from "../../trade/ratesClient";
import { historyEntryFrom } from "../../trade/recordHistory";
import { applyReserve, createReserver } from "../../trade/reserve";
import { annotateResults } from "../../trade/resultHelpers";
import { installTildePrefix } from "../../trade/tildePrefix";
import { createTitleKeeper } from "../../trade/titleKeeper";
import { syncWatchButtons } from "../../trade/watchButtons";
import { browserLanguages, SettingsMessages } from "../../ui/i18n";
import { Panel } from "../../ui/Panel";

function domReady(doc: Document): Promise<void> {
	if (doc.readyState !== "loading") return Promise.resolve();
	return new Promise((resolve) =>
		doc.addEventListener("DOMContentLoaded", () => resolve(), { once: true }),
	);
}

export default defineContentScript({
	matches: TRADE_MATCHES,
	cssInjectionMode: "ui",
	// The page fires its first search while loading; the default (document_idle)
	// would start listening after those captures were already posted and lost.
	runAt: "document_start",
	async main(ctx) {
		if (!isTradePage(new URL(location.href))) return;

		const feed = createCaptureFeed();
		const reserver = createReserver(document);
		ctx.onInvalidated(() => {
			reserver.stop();
			applyReserve(document, { side: "left", width: null, resizing: false });
		});
		ctx.onInvalidated(
			listenForCaptures(window, (event) => {
				feed.push(event);
				if (event.kind === "search") {
					recordIfEnabled(event);
				}
			}),
		);
		function recordIfEnabled(event: Extract<CaptureEvent, { kind: "search" }>) {
			browserSettings.load().then((prefs) => {
				if (!prefs.historyEnabled) return;
				const entry = historyEntryFrom(event, Date.now(), crypto.randomUUID());
				browserHistory.update((history) => recordSearch(history, entry));
			});
		}

		await domReady(document);
		installPageStyles(document);
		let prefs = await browserSettings.load();
		const messagesOf = (p: typeof prefs) =>
			messagesFor(resolveLocale(p.language, browserLanguages()));
		let t = messagesOf(prefs);
		setPageTheme(document, prefs.theme);
		const pins = createMemorySource<PinnedItem[]>([]);
		let pinned: PinnedItem[] = [];
		const togglePinned = (id: string) => {
			const item = feed.get().results.get(id);
			if (item) pins.update((current) => togglePin(current, item, Date.now()));
		};
		const rates = createRatesClient(() => enhancer.all());
		let library = await browserLibrary.load();
		const watchedOf = (list: Watcher[]) =>
			new Set(list.flatMap((w) => (w.kind === "listing" ? [w.itemId] : [])));
		let watched = watchedOf(await browserWatchers.load());
		const toggleWatch = (id: string) => {
			const capture = feed.get();
			const item = capture.results.get(id);
			const search = capture.search;
			if (!item || !search) return;
			const watcher = listingWatcherFrom(
				item,
				{
					origin: location.origin,
					game: search.game,
					realm: search.realm,
					league: search.league,
					searchId: search.search.searchId,
				},
				prefs.watchInterval,
				Date.now(),
				crypto.randomUUID(),
			);
			// A failed write puts the stored list back, so the button shows the
			// real state again; nothing else to undo.
			browserWatchers
				.update((current) => toggleListingWatch(current, watcher))
				.catch(() => {});
		};
		const title = createTitleKeeper(document);
		ctx.onInvalidated(() => title.stop());
		const updateTitle = () => {
			const search = feed.get().search;
			const page = parseTradeUrl(new URL(location.href));
			if (!prefs.tabTitles || !search) {
				title.set({ segment: null, live: false });
				return;
			}
			const bookmark = library.bookmarks.find(
				(b) => b.searchId === search.search.searchId,
			);
			title.set({
				segment:
					bookmark?.name ??
					t.trade.titleSegment(
						titleOfQuery(search.search.query, t),
						search.league,
					),
				live: page?.location.live ?? false,
			});
		};
		const setBackForwardFlag = () => {
			document.documentElement.dataset[BACK_FORWARD_FLAG] = prefs.backForward
				? "on"
				: "off";
		};
		setBackForwardFlag();
		ctx.onInvalidated(
			installTildePrefix(document, (box) =>
				box === "item" ? prefs.tildePrefix : prefs.tildePrefixFilters,
			),
		);
		ctx.onInvalidated(
			browserLibrary.watch((next) => {
				library = next;
				updateTitle();
			}),
		);
		// If the site does not re-run the search Back returned to, load that URL so it does.
		const onPopState = () => {
			if (!prefs.backForward) return;
			const target = parseTradeUrl(new URL(location.href))?.location.searchId;
			if (!target) return;
			setTimeout(() => {
				const shown = feed.get().search?.search.searchId;
				if (shown !== target && location.href.includes(target))
					location.reload();
			}, 1500);
		};
		window.addEventListener("popstate", onPopState);
		ctx.onInvalidated(() => window.removeEventListener("popstate", onPopState));
		const enhance = (rows: HTMLElement[]) => {
			const capture = feed.get();
			const search = capture.search;
			updateTitle();
			highlightMods(rows, capture, prefs.highlightMods);
			annotateResults(rows, capture, prefs, t);
			syncWatchButtons(rows, watched, toggleWatch, t);
			syncPinButtons(rows, pinned, togglePinned, t);
			annotatePrices(
				rows,
				capture,
				search && prefs.equivalentPricing
					? rates.get(search.game, search.league)
					: null,
				prefs.equivalentPricing,
				t,
			);
		};
		const enhancer = scheduleEnhance(document, enhance);
		ctx.onInvalidated(() => enhancer.stop());
		ctx.onInvalidated(
			browserSettings.watch((next) => {
				// Turning pricing on after a denied or missing permission should retry.
				if (next.equivalentPricing && !prefs.equivalentPricing) rates.reset();
				prefs = next;
				t = messagesOf(prefs);
				setBackForwardFlag();
				setPageTheme(document, prefs.theme);
				updateTitle();
				enhancer.all();
			}),
		);
		ctx.onInvalidated(
			storage.defineItem<unknown>(`local:${PRICING_ACCESS_KEY}`).watch(() => {
				rates.reset();
				enhancer.all();
			}),
		);
		ctx.onInvalidated(
			browserWatchers.watch((next) => {
				// The background rewrites watchers after every check; only a change
				// in which listings are watched shows on the page.
				const nextWatched = watchedOf(next);
				const same =
					nextWatched.size === watched.size &&
					[...nextWatched].every((id) => watched.has(id));
				watched = nextWatched;
				if (!same) enhancer.all();
			}),
		);
		ctx.onInvalidated(
			feed.subscribe((_, event) => {
				if (event.kind === "search") {
					// Titles matter most in background tabs, where frames do not run.
					updateTitle();
					enhancer.all();
				} else {
					enhancer.items(event.items.map((item) => item.id));
				}
			}),
		);
		ctx.onInvalidated(
			pins.watch((next) => {
				pinned = next;
				enhancer.all();
			}),
		);
		enhancer.all();

		const ui = await createShadowRootUi(ctx, {
			name: "exile-ledger",
			position: "overlay",
			anchor: "body",
			onMount(container) {
				render(
					<SettingsMessages settings={browserSettings} initial={prefs.language}>
						<Panel
							feed={feed}
							settings={browserSettings}
							initialSettings={prefs}
							library={browserLibrary}
							uiState={browserUiState}
							history={browserHistory}
							syncStatus={browserSyncStatus}
							pins={pins}
							watchers={browserWatchers}
							tradeAccess={browserTradeAccess}
							onOpenSettings={() => {
								browser.runtime
									.sendMessage({ type: "exile-ledger:open-settings" })
									.catch(() => {});
							}}
							onJumpToPin={(id) => jumpToResult(document, id)}
							onReserve={reserver.apply}
							page={() => parseTradeUrl(new URL(location.href))}
						/>
					</SettingsMessages>,
					container,
				);
				return container;
			},
			onRemove(container) {
				if (container) render(null, container);
			},
		});
		ui.mount();
		ctx.onInvalidated(
			installHotkeys(document, {
				hotkeys: () => prefs.hotkeys,
				isOurs: (node) =>
					node instanceof Node && node.getRootNode() === ui.shadow,
				run: (action) => {
					if (action === "togglePanel")
						browserUiState.update((state) => ({
							...state,
							panelOpen: !state.panelOpen,
						}));
					else TRADE_ACTIONS[action](document);
				},
			}),
		);
	},
});
