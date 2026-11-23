import "../../styles/tailwind.css";
import { render } from "preact";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { titleOfQuery } from "../../core/describe";
import { recordSearch } from "../../core/history";
import { type PinnedItem, togglePin } from "../../core/pins";
import { isTradePage, TRADE_MATCHES } from "../../core/sites";
import { createMemorySource } from "../../core/source";
import { parseTradeUrl } from "../../core/tradeUrl";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserSyncStatus } from "../../storage/syncPorts";
import { browserUiState } from "../../storage/uiStateStore";
import { type CaptureEvent, listenForCaptures } from "../../trade/capture";
import { createCaptureFeed } from "../../trade/captureFeed";
import { highlightMods, installPageStyles } from "../../trade/enhanceResults";
import { annotatePrices } from "../../trade/equivalentPrices";
import { BACK_FORWARD_FLAG } from "../../trade/historyPatch";
import { observeResults } from "../../trade/observeResults";
import { jumpToResult, syncPinButtons } from "../../trade/pinButtons";
import { createRatesClient } from "../../trade/ratesClient";
import { historyEntryFrom } from "../../trade/recordHistory";
import { applyReserve } from "../../trade/reserve";
import { installTildePrefix } from "../../trade/tildePrefix";
import { createTitleKeeper } from "../../trade/titleKeeper";
import { Panel } from "../../ui/Panel";

export default defineContentScript({
	matches: TRADE_MATCHES,
	cssInjectionMode: "ui",
	async main(ctx) {
		if (!isTradePage(new URL(location.href))) return;

		const feed = createCaptureFeed();
		ctx.onInvalidated(() => applyReserve(document, { side: "left", px: 0 }));
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

		installPageStyles(document);
		let prefs = await browserSettings.load();
		const pins = createMemorySource<PinnedItem[]>([]);
		const togglePinned = (id: string) => {
			const item = feed.get().results.find((r) => r.id === id);
			if (item) pins.update((current) => togglePin(current, item, Date.now()));
		};
		const rates = createRatesClient(() => enhance());
		let library = await browserLibrary.load();
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
					`${titleOfQuery(search.search.query)} (${search.league})`,
				live: page?.location.live ?? false,
			});
		};
		const setBackForwardFlag = () => {
			document.documentElement.dataset[BACK_FORWARD_FLAG] = prefs.backForward
				? "on"
				: "off";
		};
		setBackForwardFlag();
		ctx.onInvalidated(installTildePrefix(document, () => prefs.tildePrefix));
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
		const enhance = () => {
			const capture = feed.get();
			const search = capture.search;
			highlightMods(document, capture, prefs.highlightMods);
			updateTitle();
			pins
				.load()
				.then((current) => syncPinButtons(document, current, togglePinned));
			annotatePrices(
				document,
				capture,
				search && prefs.equivalentPricing
					? rates.get(search.game, search.league)
					: null,
				prefs.equivalentPricing,
			);
		};
		ctx.onInvalidated(
			browserSettings.watch((next) => {
				// Turning pricing on after a denied or missing permission should retry.
				if (next.equivalentPricing && !prefs.equivalentPricing) rates.reset();
				prefs = next;
				setBackForwardFlag();
				enhance();
			}),
		);
		ctx.onInvalidated(feed.subscribe(enhance));
		ctx.onInvalidated(pins.watch(enhance));
		ctx.onInvalidated(observeResults(document, enhance));

		const ui = await createShadowRootUi(ctx, {
			name: "exile-ledger",
			position: "overlay",
			anchor: "body",
			onMount(container) {
				render(
					<Panel
						feed={feed}
						settings={browserSettings}
						library={browserLibrary}
						uiState={browserUiState}
						history={browserHistory}
						syncStatus={browserSyncStatus}
						pins={pins}
						onJumpToPin={(id) => jumpToResult(document, id)}
						onReserve={(reserve) => applyReserve(document, reserve)}
						page={() => parseTradeUrl(new URL(location.href))}
					/>,
					container,
				);
				return container;
			},
			onRemove(container) {
				if (container) render(null, container);
			},
		});
		ui.mount();
	},
});
