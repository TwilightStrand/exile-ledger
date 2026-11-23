import "../src/styles/tailwind.css";
import { render } from "preact";
import { useMemo, useState } from "preact/hooks";
import { createMemorySettings, type PanelSide } from "../src/core/settings";
import { parseFetchResponse, parseSearch } from "../src/core/tradeApi";
import { createCaptureFeed } from "../src/trade/captureFeed";
import { Panel } from "../src/ui/Panel";
import { SettingsForm } from "../src/ui/SettingsForm";
import fetchResponse from "../tests/fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../tests/fixtures/trade/poe2-search-request.json";
import searchResponse from "../tests/fixtures/trade/poe2-search-response.json";

// URL parameters pick the starting state, so screenshots of each state are one link away:
// ?search=1&side=right&open=0
const params = new URLSearchParams(location.search);
const startSide: PanelSide = params.get("side") === "right" ? "right" : "left";

const search = parseSearch(searchRequest, searchResponse);
const items = parseFetchResponse(fetchResponse) ?? [];

function feedFor(withSearch: boolean) {
	const feed = createCaptureFeed();
	if (withSearch && search) {
		feed.push({
			kind: "search",
			game: "poe2",
			realm: "poe2",
			league: "Standard",
			search,
		});
		feed.push({
			kind: "results",
			game: "poe2",
			queryId: search.searchId,
			items,
		});
	}
	return feed;
}

function FakeTradePage() {
	return (
		<main class="mx-auto max-w-3xl space-y-3 p-6">
			<div class="h-40 rounded border border-ledger-border bg-ledger-panel/60" />
			{items.map((item) => (
				<article
					key={item.id}
					class="rounded border border-ledger-border bg-ledger-panel/60 p-3"
				>
					<h2 class="font-semibold text-ledger-accent">
						{item.name} {item.baseType}
					</h2>
					<ul class="mt-1 text-ledger-text">
						{item.mods.map((mod) => (
							<li key={`${mod.kind}:${mod.text}`}>{mod.text}</li>
						))}
					</ul>
				</article>
			))}
		</main>
	);
}

function Preview() {
	const settings = useMemo(
		() => createMemorySettings({ panelSide: startSide }),
		[],
	);
	const [withSearch, setWithSearch] = useState(params.get("search") === "1");
	const feed = useMemo(() => feedFor(withSearch), [withSearch]);
	const open = params.get("open") !== "0";

	return (
		<div class="min-h-screen bg-ledger-bg font-sans text-sm text-ledger-text">
			<div class="mx-auto flex max-w-3xl flex-wrap items-center gap-6 border-b border-ledger-border px-6 py-3">
				<label class="flex items-center gap-1">
					<input
						type="checkbox"
						checked={withSearch}
						onChange={() => setWithSearch((v) => !v)}
					/>
					Captured search
				</label>
				<SettingsForm settings={settings} />
			</div>
			<FakeTradePage />
			<Panel
				key={String(withSearch)}
				feed={feed}
				settings={settings}
				initiallyOpen={open}
			/>
		</div>
	);
}

const root = document.getElementById("app");
if (root) render(<Preview />, root);
