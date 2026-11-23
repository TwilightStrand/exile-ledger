import "../../styles/tailwind.css";
import { render } from "preact";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { isTradePage, TRADE_MATCHES } from "../../core/sites";
import { listenForCaptures } from "../../trade/capture";
import { createCaptureFeed } from "../../trade/captureFeed";
import { Panel } from "../../ui/Panel";

export default defineContentScript({
	matches: TRADE_MATCHES,
	cssInjectionMode: "ui",
	async main(ctx) {
		if (!isTradePage(new URL(location.href))) return;

		const feed = createCaptureFeed();
		ctx.onInvalidated(listenForCaptures(window, feed.push));

		const ui = await createShadowRootUi(ctx, {
			name: "exile-ledger",
			position: "overlay",
			anchor: "body",
			onMount(container) {
				render(<Panel feed={feed} />, container);
				return container;
			},
			onRemove(container) {
				if (container) render(null, container);
			},
		});
		ui.mount();
	},
});
