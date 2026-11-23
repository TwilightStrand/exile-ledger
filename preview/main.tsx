/// <reference types="vite/client" />
import "../src/styles/tailwind.css";
import { type ComponentChildren, render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createMemorySettings, type PanelSide } from "../src/core/settings";
import { parseFetchResponse, parseSearch } from "../src/core/tradeApi";
import panelCss from "../src/styles/tailwind.css?inline";
import { createCaptureFeed } from "../src/trade/captureFeed";
import { Panel, TABS, type TabId } from "../src/ui/Panel";
import { SettingsForm } from "../src/ui/SettingsForm";
import fetchResponse from "../tests/fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../tests/fixtures/trade/poe2-search-request.json";
import searchResponse from "../tests/fixtures/trade/poe2-search-response.json";
import { MOCK_BOOKMARKS, MOCK_HISTORY, MOCK_NOW } from "./mocks";

// URL parameters pick the starting state, so each state is one link away:
// ?search=1&data=1&side=right&open=0&tab=history
const params = new URLSearchParams(location.search);
const startSide: PanelSide = params.get("side") === "right" ? "right" : "left";
const startTab: TabId =
	TABS.find((t) => t === params.get("tab")) ?? "bookmarks";

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

/** Mounts children in a shadow root with the panel CSS, as the content script does. */
function ShadowHost({ children }: { children: ComponentChildren }) {
	const host = useRef<HTMLDivElement>(null);
	const [root, setRoot] = useState<HTMLElement | null>(null);
	useEffect(() => {
		const el = host.current;
		if (!el || el.shadowRoot) return;
		const shadow = el.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = panelCss;
		const mount = document.createElement("div");
		shadow.append(style, mount);
		setRoot(mount);
	}, []);
	useEffect(() => {
		if (root) render(children, root);
	});
	return <div ref={host} />;
}

function FakeTradePage() {
	return (
		<main class="mx-auto max-w-[920px] space-y-2 px-6 py-6">
			<div class="h-44 rounded border border-[#2a2a2a] bg-[#111]" />
			{items.map((item) => (
				<article
					key={item.id}
					class="flex gap-4 rounded border border-[#2a2a2a] bg-[#0d0d0d] p-3"
				>
					<div class="h-28 w-16 shrink-0 rounded bg-[#1a1a1a]" />
					<div>
						<h2 class="font-display text-[15px] text-[#af6025]">
							{item.name} {item.baseType}
						</h2>
						<ul class="mt-1 text-[13px] text-[#8888ff]">
							{item.mods.map((mod) => (
								<li key={`${mod.kind}:${mod.text}`}>{mod.text}</li>
							))}
						</ul>
					</div>
				</article>
			))}
		</main>
	);
}

function Controls({
	withSearch,
	setWithSearch,
	withData,
	setWithData,
	settings,
}: {
	withSearch: boolean;
	setWithSearch: (v: boolean) => void;
	withData: boolean;
	setWithData: (v: boolean) => void;
	settings: ReturnType<typeof createMemorySettings>;
}) {
	return (
		<div class="fixed right-4 bottom-4 z-[2147483001] flex flex-col gap-2 rounded-md border border-ledger-border bg-ledger-surface/95 p-3 text-[12px] text-ledger-text">
			<p class="font-display text-ledger-gold">Preview</p>
			<label class="flex items-center gap-1.5">
				<input
					type="checkbox"
					checked={withSearch}
					onChange={() => setWithSearch(!withSearch)}
				/>
				Captured search
			</label>
			<label class="flex items-center gap-1.5">
				<input
					type="checkbox"
					checked={withData}
					onChange={() => setWithData(!withData)}
				/>
				Bookmarks and history
			</label>
			<SettingsForm settings={settings} />
		</div>
	);
}

function Preview() {
	const settings = useMemo(
		() => createMemorySettings({ panelSide: startSide }),
		[],
	);
	const [withSearch, setWithSearch] = useState(params.get("search") === "1");
	const [withData, setWithData] = useState(params.get("data") === "1");
	const feed = useMemo(() => feedFor(withSearch), [withSearch]);

	return (
		<div class="min-h-screen bg-[#000] font-sans text-ledger-text">
			<FakeTradePage />
			<ShadowHost>
				<Panel
					key={`${withSearch}`}
					feed={feed}
					settings={settings}
					bookmarks={withData ? MOCK_BOOKMARKS : []}
					history={withData ? MOCK_HISTORY : []}
					onSaveSearch={() => {}}
					initiallyOpen={params.get("open") !== "0"}
					initialTab={startTab}
					now={MOCK_NOW}
				/>
			</ShadowHost>
			{params.get("controls") !== "0" && (
				<Controls
					withSearch={withSearch}
					setWithSearch={setWithSearch}
					withData={withData}
					setWithData={setWithData}
					settings={settings}
				/>
			)}
		</div>
	);
}

const root = document.getElementById("app");
if (root) render(<Preview />, root);
