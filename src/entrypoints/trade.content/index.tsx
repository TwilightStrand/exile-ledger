import "../../styles/tailwind.css";
import { render } from "preact";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
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
import { observeResults } from "../../trade/observeResults";
import { jumpToResult, syncPinButtons } from "../../trade/pinButtons";
import { createRatesClient } from "../../trade/ratesClient";
import { historyEntryFrom } from "../../trade/recordHistory";
import { applyReserve } from "../../trade/reserve";
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
		const enhance = () => {
			const capture = feed.get();
			const search = capture.search;
			highlightMods(document, capture, prefs.highlightMods);
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
