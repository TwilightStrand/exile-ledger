import "../../styles/tailwind.css";
import { render } from "preact";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { recordSearch } from "../../core/history";
import { isTradePage, TRADE_MATCHES } from "../../core/sites";
import { parseTradeUrl } from "../../core/tradeUrl";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserUiState } from "../../storage/uiStateStore";
import { type CaptureEvent, listenForCaptures } from "../../trade/capture";
import { createCaptureFeed } from "../../trade/captureFeed";
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
