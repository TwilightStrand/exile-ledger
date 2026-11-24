/// <reference types="vite/client" />
import "./preview.css";
import { type ComponentChildren, render } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createMemoryLibrary, emptyLibrary } from "../src/core/library";
import { createMemorySettings, type PanelSide } from "../src/core/settings";
import { createMemorySource } from "../src/core/source";
import { OFF_STATUS, type SyncStatus } from "../src/core/syncEngine";
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from "../src/core/themes";
import { parseFetchResponse, parseSearch } from "../src/core/tradeApi";
import { parseTradeUrl } from "../src/core/tradeUrl";
import type { Watcher } from "../src/core/watchers";
import { createCaptureFeed } from "../src/trade/captureFeed";
import { Panel, type Reserve, TABS, type TabId } from "../src/ui/Panel";
import { SettingsPage } from "../src/ui/settings/SettingsPage";
import { themeStyle } from "../src/ui/theme";
import fetchResponse from "../tests/fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../tests/fixtures/trade/poe2-search-request.json";
import searchResponse from "../tests/fixtures/trade/poe2-search-response.json";
import { MOCK_HISTORY, MOCK_LIBRARY, MOCK_NOW } from "./mocks";
import panelCss from "./preview.css?inline";

// URL parameters pick the starting state, so each state is one link away:
// ?search=1&data=1&side=right&open=0&tab=history&game=poe1&theme=bone
const params = new URLSearchParams(location.search);
const startCompact = params.get("compact") === "1";
const startTheme: ThemeId =
	THEME_IDS.find((id) => id === params.get("theme")) ?? DEFAULT_THEME;
const startSide: PanelSide = params.get("side") === "right" ? "right" : "left";
const startMode = params.get("mode") === "overlay" ? "overlay" : "push";
const startTab: TabId =
	TABS.find((t) => t === params.get("tab")) ?? "bookmarks";

const pageUrl = new URL(
	params.get("game") === "poe1"
		? "https://www.pathofexile.com/trade/search/Standard"
		: "https://www.pathofexile.com/trade2/search/poe2/Standard",
);
const page = () => parseTradeUrl(pageUrl);

const search = parseSearch(searchRequest, searchResponse);
const items = parseFetchResponse(fetchResponse) ?? [];

// ?search=empower shows a search the checks flag: an uncorrupted level 4 Empower.
const EMPOWER_SEARCH = {
	query: {
		query: {
			type: "Empower Support",
			filters: {
				misc_filters: {
					filters: { gem_level: { min: 4 }, corrupted: { option: "false" } },
				},
			},
		},
	},
	searchId: "empower",
	total: 0,
	resultIds: [],
};

const grantAccess = async () => true;

function feedFor(withSearch: boolean) {
	const feed = createCaptureFeed();
	if (withSearch && params.get("search") === "empower") {
		feed.push({
			kind: "search",
			game: "poe1",
			realm: null,
			league: "Standard",
			search: EMPOWER_SEARCH,
		});
		return feed;
	}
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
	// A portal keeps the panel in this tree; a second render() root updated from
	// an effect trips Preact's hook bookkeeping when the two trees talk.
	return <div ref={host}>{root && createPortal(children, root)}</div>;
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
	const [theme, setTheme] = useState<ThemeId>(startTheme);
	useEffect(() => settings.watch((s) => setTheme(s.theme)), [settings]);
	return (
		<div
			class="fixed right-4 bottom-4 z-[2147483001] flex flex-col gap-2 rounded-md border border-ledger-border bg-ledger-surface/95 p-3 text-[12px] text-ledger-text"
			style={themeStyle(theme)}
		>
			<p class="font-display text-ledger-gold">Preview</p>
			<label class="flex items-center justify-between gap-2">
				Theme
				<select
					class="rounded border border-ledger-border bg-ledger-bg px-1 py-0.5"
					value={theme}
					onChange={(e) => {
						const next = THEME_IDS.find((id) => id === e.currentTarget.value);
						if (next) settings.save({ theme: next });
					}}
				>
					{THEME_IDS.map((id) => (
						<option key={id} value={id}>
							{id}
						</option>
					))}
				</select>
			</label>
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
			<button
				type="button"
				class="rounded border border-ledger-border px-2 py-0.5"
				onClick={async () => {
					const { panelSide } = await settings.load();
					settings.save({ panelSide: panelSide === "left" ? "right" : "left" });
				}}
			>
				Switch side
			</button>
			<button
				type="button"
				class="rounded border border-ledger-border px-2 py-0.5"
				onClick={async () => {
					const { panelMode } = await settings.load();
					settings.save({
						panelMode: panelMode === "push" ? "overlay" : "push",
					});
				}}
			>
				Toggle push
			</button>
		</div>
	);
}

function Preview() {
	const settings = useMemo(
		() =>
			createMemorySettings({
				panelSide: startSide,
				panelMode: startMode,
				theme: startTheme,
				compact: startCompact,
			}),
		[],
	);
	const [withSearch, setWithSearch] = useState(
		params.get("search") === "1" || params.get("search") === "empower",
	);
	const [withData, setWithData] = useState(params.get("data") === "1");
	const [reserve, setReserve] = useState<Reserve>({
		side: "left",
		width: null,
	});
	const feed = useMemo(() => feedFor(withSearch), [withSearch]);
	const history = useMemo(
		() => createMemorySource(withData ? MOCK_HISTORY : []),
		[withData],
	);
	const library = useMemo(
		() => createMemoryLibrary(withData ? MOCK_LIBRARY : emptyLibrary()),
		[withData],
	);

	return (
		<div class="min-h-screen bg-[#000] font-sans text-ledger-text">
			<div
				class="transition-[margin] duration-200"
				style={{
					[reserve.side === "left" ? "marginLeft" : "marginRight"]:
						reserve.width ?? "0px",
				}}
			>
				<FakeTradePage />
			</div>
			<ShadowHost>
				<Panel
					key={`${withSearch}-${withData}`}
					feed={feed}
					settings={settings}
					library={library}
					page={page}
					history={history}
					initiallyOpen={params.get("open") !== "0"}
					initialTab={startTab}
					now={MOCK_NOW}
					onReserve={setReserve}
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

function SettingsPreview() {
	const settings = useMemo(
		() => createMemorySettings({ theme: startTheme }),
		[],
	);
	const library = useMemo(() => createMemoryLibrary(MOCK_LIBRARY), []);
	const history = useMemo(() => createMemorySource(MOCK_HISTORY), []);
	return (
		<SettingsPage
			settings={settings}
			library={library}
			history={history}
			syncStatus={createMemorySource<SyncStatus>({
				...OFF_STATUS,
				state: "on",
				usedBytes: 23_500,
				lastSyncAt: Date.now() - 90_000,
			})}
			requestPricingAccess={grantAccess}
			hasPricingAccess={grantAccess}
			requestTradeAccess={async () => true}
			hasTradeAccess={async () => true}
			requestNotifications={async () => true}
			hasNotifications={async () => true}
			watchers={createMemorySource<Watcher[]>([])}
			version="0.1.0"
			download={(name, text) => console.info("download", name, text.length)}
		/>
	);
}

const root = document.getElementById("app");
if (root)
	render(
		params.get("page") === "settings" ? <SettingsPreview /> : <Preview />,
		root,
	);
