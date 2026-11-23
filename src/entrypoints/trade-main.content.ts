import { defineContentScript } from "wxt/utils/define-content-script";
import { TRADE_MATCHES } from "../core/sites";
import { installInterceptor, MESSAGE_SOURCE } from "../trade/interceptor";

export default defineContentScript({
	matches: TRADE_MATCHES,
	world: "MAIN",
	// Must patch fetch/XHR before the trade app makes its first search.
	runAt: "document_start",
	main() {
		installInterceptor(window, (payload) => {
			window.postMessage(
				{ source: MESSAGE_SOURCE, payload },
				window.location.origin,
			);
		});
	},
});
