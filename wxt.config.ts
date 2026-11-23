import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	manifestVersion: 3,
	manifest: {
		name: "Exile Ledger",
		description:
			"Bookmarks, history and price tools for the Path of Exile trade site, synced across machines.",
		permissions: ["storage"],
		// Asked for only when the user turns on equivalent prices; poe.ninja sends
		// no CORS headers, so the fetch needs host access.
		optional_host_permissions: ["https://poe.ninja/*"],
		browser_specific_settings: {
			gecko: {
				id: "exile-ledger@twilightstrand",
				// 140 (ESR) is the first release that understands
				// data_collection_permissions, which AMO requires for new add-ons.
				strict_min_version: "140.0",
				// No telemetry or analytics; bookmarks sync only through the
				// browser's own sync, which Firefox does not count as collection.
				data_collection_permissions: { required: ["none"] },
			},
			gecko_android: {
				strict_min_version: "142.0",
			},
		},
	},
	vite: () => ({
		plugins: [preact(), tailwindcss()],
	}),
});
