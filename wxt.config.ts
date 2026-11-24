import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "wxt";
import { TRADE_ORIGINS } from "./src/core/sites";

const PREACT_INNER_HTML = /\((\w+)\.innerHTML=(\w+)\.__html\)/;

/**
 * Preact ships a dangerouslySetInnerHTML code path even when nothing uses it,
 * and AMO's linter flags that assignment on every upload. The extension never
 * renders raw HTML, so the assignment is replaced with a throw. Failing the
 * build when the pattern is missing keeps a Preact upgrade from quietly
 * bringing the warning back.
 */
function stripPreactInnerHtml(): Plugin {
	return {
		name: "exile-ledger:strip-preact-inner-html",
		enforce: "pre",
		transform(code, id) {
			if (!id.includes("/node_modules/preact/dist/preact.mjs")) return null;
			if (!PREACT_INNER_HTML.test(code)) {
				this.error(
					"Preact's innerHTML assignment changed shape; update PREACT_INNER_HTML.",
				);
			}
			return {
				code: code.replace(
					PREACT_INNER_HTML,
					'(()=>{throw Error("dangerouslySetInnerHTML is not supported")})()',
				),
				map: null,
			};
		},
	};
}

export default defineConfig({
	srcDir: "src",
	manifestVersion: 3,
	manifest: {
		name: "Exile Ledger",
		description:
			"Bookmarks, history and price tools for the Path of Exile trade site, synced across machines.",
		// alarms lets watchers run with no trade tab open; it shows no install
		// warning.
		permissions: ["storage", "alarms"],
		optional_host_permissions: [
			// Asked for only when the user turns on equivalent prices; poe.ninja
			// sends no CORS headers, so the fetch needs host access.
			"https://poe.ninja/*",
			// Asked for when the first watcher is created: the background calls
			// the trade API itself.
			...TRADE_ORIGINS,
		],
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
			// Without this, AMO assumes Android 140, which predates
			// data_collection_permissions, and warns on every upload. It sets
			// the floor only; whether the add-on is offered on Android is the
			// platform choice made at upload.
			gecko_android: { strict_min_version: "142.0" },
		},
	},
	zip: {
		// Only what the build reads, so stray local files never reach AMO and a
		// reviewer's rebuild sees exactly the inputs the upload was built from.
		includeSources: [
			"src/**",
			"public/**",
			"assets/**",
			"package.json",
			"pnpm-lock.yaml",
			"tsconfig.json",
			"wxt.config.ts",
			"biome.json",
			"README.md",
			"BUILDING.md",
			"scripts/build-firefox.sh",
			"LICENSE",
			"PRIVACY.md",
			"THIRD_PARTY_NOTICES.md",
		],
	},
	vite: () => ({
		plugins: [stripPreactInnerHtml(), preact(), tailwindcss()],
	}),
});
