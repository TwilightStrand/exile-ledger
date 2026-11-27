import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeShare } from "../../src/core/exchange";
import type { HistoryEntry } from "../../src/core/history";
import { en, messagesFor } from "../../src/core/i18n";
import {
	createMemoryLibrary,
	emptyLibrary,
	saveSearch,
} from "../../src/core/library";
import { createMemorySettings } from "../../src/core/settings";
import { createMemorySource } from "../../src/core/source";
import { OFF_STATUS, type SyncStatus } from "../../src/core/syncEngine";
import { THEMES } from "../../src/core/themes";
import type { Watcher } from "../../src/core/watchers";
import { SettingsMessages } from "../../src/ui/i18n";
import { SettingsPage } from "../../src/ui/settings/SettingsPage";

function seededLibrary() {
	let n = 0;
	const { library } = saveSearch(
		emptyLibrary(),
		{
			game: "poe2",
			league: "Standard",
			name: "Garb",
			query: { query: { term: "Garb" } },
			searchId: "g",
			live: false,
		},
		{ now: 1, newId: () => `s${++n}` },
	);
	return library;
}

let grantPricing = true;
let grantTrade = true;
let grantNotify = true;
let notifyAccess = true;

async function mount({
	equivalentPricing = false,
	hasAccess = false,
	notifications = false,
}: {
	equivalentPricing?: boolean;
	hasAccess?: boolean;
	notifications?: boolean;
} = {}) {
	const settings = createMemorySettings({ equivalentPricing, notifications });
	const hasPricingAccess = async () => hasAccess;
	const library = createMemoryLibrary(seededLibrary());
	const history = createMemorySource<HistoryEntry[]>([]);
	const watchers = createMemorySource<Watcher[]>([]);
	const downloads: { name: string; text: string }[] = [];
	const root = document.createElement("div");
	document.body.append(root);
	let n = 0;
	await act(async () => {
		render(
			<SettingsPage
				settings={settings}
				library={library}
				history={history}
				syncStatus={createMemorySource<SyncStatus>({
					...OFF_STATUS,
					state: "on",
					usedBytes: 20480,
					lastSyncAt: Date.UTC(2026, 10, 24) - 120_000,
				})}
				requestPricingAccess={async () => grantPricing}
				hasPricingAccess={hasPricingAccess}
				requestTradeAccess={async () => grantTrade}
				hasTradeAccess={async () => false}
				requestNotifications={async () => grantNotify}
				hasNotifications={async () => notifyAccess}
				watchers={watchers}
				version="1.2.3"
				download={(name, text) => downloads.push({ name, text })}
				now={() => Date.UTC(2026, 10, 24)}
				newId={() => `new${++n}`}
			/>,
			root,
		);
	});
	return { root, settings, library, downloads, watchers };
}

const button = (root: HTMLElement, text: string) =>
	[...root.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === text,
	);

describe("SettingsPage", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		// The page themes <html>, which outlives each test's mount.
		document.documentElement.removeAttribute("style");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("switches theme live from the picker", async () => {
		const { root, settings } = await mount();
		const html = document.documentElement;
		expect(html.style.getPropertyValue("--color-ledger-bg")).toBe(
			THEMES.gold.colors.bg,
		);
		const bone = root.querySelector<HTMLInputElement>(
			"input[type=radio][value=bone]",
		);
		expect(bone?.closest("label")?.textContent).toBe("Bone");
		await act(async () => bone?.click());
		expect((await settings.load()).theme).toBe("bone");
		expect(html.style.getPropertyValue("--color-ledger-bg")).toBe(
			THEMES.bone.colors.bg,
		);
		expect(html.style.colorScheme).toBe("light");
		expect(bone?.checked).toBe(true);
	});

	it("switches the width unit keeping the size, then saves pixels", async () => {
		vi.spyOn(window, "innerWidth", "get").mockReturnValue(1600);
		const { root, settings } = await mount();
		await act(async () => settings.save({ panelWidth: 25 }));
		const hint = () => root.textContent ?? "";
		expect(hint()).toContain("Percent of the browser window");
		const px = root.querySelector<HTMLInputElement>(
			"input[type=radio][value=px]",
		);
		await act(async () => px?.click());
		expect(await settings.load()).toMatchObject({
			panelWidthUnit: "px",
			panelWidthPx: 400,
			panelWidth: 25,
		});
		expect(hint()).toContain("A fixed width in pixels");
		expect(hint()).toContain("400 px");
		const range = root.querySelector<HTMLInputElement>("input[type=range]");
		expect(range?.min).toBe("260");
		expect(range?.max).toBe("640");
		if (!range) throw new Error("no width slider");
		range.value = "500";
		await act(async () => {
			range.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(await settings.load()).toMatchObject({
			panelWidthPx: 500,
			panelWidth: 25,
		});
	});

	it("shows sync state and quota", async () => {
		const { root } = await mount();
		expect(root.textContent).toContain(
			"Synced 2m ago · 20% of sync space used",
		);
	});

	it("turns on equivalent prices only when poe.ninja access is granted", async () => {
		const { root, settings } = await mount();
		const toggle = () =>
			root.querySelector<HTMLButtonElement>(
				"[role=switch][aria-label='Equivalent prices']",
			);
		grantPricing = false;
		await act(async () => toggle()?.click());
		expect((await settings.load()).equivalentPricing).toBe(false);
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"need access to poe.ninja",
		);
		grantPricing = true;
		await act(async () => toggle()?.click());
		expect((await settings.load()).equivalentPricing).toBe(true);
	});

	it("shows prices as off when the setting synced from a browser that has access", async () => {
		const { root, settings } = await mount({ equivalentPricing: true });
		const toggle = root.querySelector<HTMLButtonElement>(
			"[role=switch][aria-label='Equivalent prices']",
		);
		expect(toggle?.getAttribute("aria-checked")).toBe("false");
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"has not been allowed to read poe.ninja",
		);
		grantPricing = true;
		await act(async () => toggle?.click());
		expect(toggle?.getAttribute("aria-checked")).toBe("true");
		expect(root.querySelector("[role=alert]")).toBeNull();
		expect((await settings.load()).equivalentPricing).toBe(true);
	});

	it("leaves prices on when this browser already has access", async () => {
		const { root } = await mount({ equivalentPricing: true, hasAccess: true });
		expect(
			root
				.querySelector("[role=switch][aria-label='Equivalent prices']")
				?.getAttribute("aria-checked"),
		).toBe("true");
		expect(root.querySelector("[role=alert]")).toBeNull();
	});

	it("changes panel settings", async () => {
		const { root, settings } = await mount();
		const push = root.querySelector<HTMLInputElement>("input[value=push]");
		await act(async () => push?.click());
		const toggle = root.querySelector<HTMLButtonElement>(
			"[role=switch][aria-label='Record searches']",
		);
		await act(async () => toggle?.click());
		expect(await settings.load()).toMatchObject({
			panelMode: "push",
			historyEnabled: false,
		});
	});

	it("saves a backup file and restores it as new folders", async () => {
		const { root, library, downloads } = await mount();
		await act(async () => button(root, "Save backup file")?.click());
		expect(downloads[0]?.name).toBe("exile-ledger-backup-2026-11-24.json");

		const input = root.querySelector<HTMLInputElement>("input[type=file]");
		if (!input) throw new Error("no file input");
		const file = new File([downloads[0]?.text ?? ""], "backup.json", {
			type: "application/json",
		});
		Object.defineProperty(input, "files", { value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event("change"));
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(root.textContent).toContain("1 folder and 1 bookmark");
		await act(async () => button(root, "Import")?.click());

		const stored = await library.load();
		expect(stored.folders).toHaveLength(2);
		expect(stored.bookmarks.map((b) => b.name)).toEqual(["Garb", "Garb"]);
		expect(root.textContent).toContain("Imported 1 folder and 1 bookmark.");
	});

	it("imports a share string and rejects junk without writing", async () => {
		const { root, library } = await mount();
		const area = root.querySelector<HTMLTextAreaElement>("textarea");
		if (!area) throw new Error("no textarea");

		area.value = "garbage that is not an export";
		await act(async () => {
			area.dispatchEvent(new Event("input"));
		});
		await act(async () => button(root, "Read")?.click());
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"not an Exile Ledger, Better Trading or Poe Trade Plus export",
		);
		expect((await library.load()).folders).toHaveLength(1);

		const share = encodeShare(seededLibrary(), "s1") ?? "";
		area.value = share;
		await act(async () => {
			area.dispatchEvent(new Event("input"));
		});
		await act(async () => button(root, "Read")?.click());
		await act(async () => button(root, "Import")?.click());
		expect((await library.load()).folders).toHaveLength(2);
	});
});

describe("keyboard shortcuts", () => {
	const shortcut = (root: HTMLElement, name: string) => {
		const found = root.querySelector<HTMLButtonElement>(
			`button[aria-label="Change the shortcut for ${name}"]`,
		);
		if (!found) throw new Error(`no shortcut button for ${name}`);
		return found;
	};
	const pressKeys = (code: string, init: KeyboardEventInit = {}) =>
		act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { code, cancelable: true, ...init }),
			);
		});

	it("records a new combo", async () => {
		const { root, settings } = await mount();
		await act(() => shortcut(root, "Show or hide the panel").click());
		expect(root.textContent).toContain("Press the new shortcut");
		await pressKeys("ShiftLeft", { shiftKey: true });
		await pressKeys("KeyK", { altKey: true, shiftKey: true });
		expect((await settings.load()).hotkeys.togglePanel).toEqual({
			code: "KeyK",
			ctrl: false,
			alt: true,
			shift: true,
			meta: false,
		});
	});

	it("refuses a combo another shortcut has, and says which", async () => {
		const { root, settings } = await mount();
		const before = (await settings.load()).hotkeys;
		await act(() => shortcut(root, "Show or hide the panel").click());
		await pressKeys("KeyC", { altKey: true, shiftKey: true });
		expect(root.querySelector('[role="alert"]')?.textContent).toContain(
			'already used for "Clear the search"',
		);
		expect((await settings.load()).hotkeys).toEqual(before);
	});

	it("refuses browser shortcuts", async () => {
		const { root } = await mount();
		await act(() => shortcut(root, "Show or hide the panel").click());
		await pressKeys("KeyT", { ctrlKey: true });
		expect(root.querySelector('[role="alert"]')?.textContent).toContain(
			"browser shortcut",
		);
	});

	it("Escape cancels without changing anything", async () => {
		const { root, settings } = await mount();
		const before = (await settings.load()).hotkeys;
		await act(() => shortcut(root, "Clear the search").click());
		await pressKeys("Escape");
		expect(root.textContent).not.toContain("Press the new shortcut");
		expect((await settings.load()).hotkeys).toEqual(before);
	});

	it("removes one and resets all", async () => {
		const { root, settings } = await mount();
		const remove = root.querySelector<HTMLButtonElement>(
			'button[aria-label="Remove the shortcut for Clear the search"]',
		);
		await act(() => remove?.click());
		expect((await settings.load()).hotkeys.clearSearch).toBe(null);
		expect(shortcut(root, "Clear the search").textContent).toBe("Not set");
		await act(() => button(root, "Reset to defaults")?.click());
		expect((await settings.load()).hotkeys.clearSearch).not.toBe(null);
	});
});

describe("result helper switches", () => {
	const cases: [
		string,
		(
			| "listingTime"
			| "socketWarning"
			| "tildePrefixFilters"
			| "affixCount"
			| "itemTools"
		),
		boolean,
	][] = [
		["Exact listing time", "listingTime", true],
		["Socket warning (PoE1)", "socketWarning", false],
		["Fuzzy stat filter search", "tildePrefixFilters", true],
		["Prefix and suffix count", "affixCount", true],
		["Copy item and wiki link", "itemTools", true],
	];
	it.each(cases)(
		"%s starts as the default and saves",
		async (label, key, initial) => {
			const { root, settings } = await mount();
			const toggle = root.querySelector<HTMLButtonElement>(
				`button[role=switch][aria-label="${label}"]`,
			);
			expect(toggle?.getAttribute("aria-checked")).toBe(String(initial));
			await act(() => toggle?.click());
			expect((await settings.load())[key]).toBe(!initial);
		},
	);
});

describe("watcher settings", () => {
	it("asks for trade site access and says when it was refused", async () => {
		grantTrade = false;
		const { root } = await mount();
		await act(async () => button(root, "Allow")?.click());
		expect(root.querySelector('[role="alert"]')?.textContent).toContain(
			"Watchers stay paused",
		);
		grantTrade = true;
		await act(async () => button(root, "Allow")?.click());
		expect(root.textContent).toContain("Allowed");
	});

	it("saves the check interval, never below a minute", async () => {
		const { root, settings } = await mount();
		const input = root.querySelector<HTMLInputElement>(
			'input[aria-label="Minutes between checks"]',
		);
		if (!input) throw new Error("no interval input");
		input.value = "0";
		await act(() => {
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect((await settings.load()).watchInterval).toBe(1);
		input.value = "15";
		await act(() => {
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect((await settings.load()).watchInterval).toBe(15);
	});
});

describe("watcher notifications and backups", () => {
	it("turns notifications on only when the browser allows them", async () => {
		grantNotify = false;
		const { root, settings } = await mount();
		const toggle = root.querySelector<HTMLButtonElement>(
			'button[role=switch][aria-label="Notifications"]',
		);
		await act(async () => toggle?.click());
		expect((await settings.load()).notifications).toBe(false);
		expect(root.querySelector('[role="alert"]')?.textContent).toContain(
			"permission",
		);
		grantNotify = true;
		await act(async () => toggle?.click());
		expect((await settings.load()).notifications).toBe(true);
	});

	it("puts watchers in the backup file", async () => {
		const { root, downloads, watchers } = await mount();
		await watchers.update(() => [
			{
				kind: "listing",
				id: "w1",
				origin: "https://www.pathofexile.com",
				game: "poe2",
				realm: "poe2",
				league: "Dawn",
				intervalMin: 5,
				createdAt: 0,
				lastCheckedAt: null,
				failures: 0,
				retryAt: null,
				searchId: "s",
				itemId: "i",
				name: "Garb",
				seller: "",
				price: null,
				previousPrice: null,
				status: "listed",
				changedAt: null,
			},
		]);
		await act(async () => button(root, "Save backup file")?.click());
		expect(JSON.parse(downloads[0]?.text ?? "{}").watchers).toHaveLength(1);
	});
});

describe("language", () => {
	it("switches the page's language without a reload", async () => {
		const settings = createMemorySettings({ language: "en" });
		const root = document.createElement("div");
		document.body.append(root);
		await act(async () => {
			render(
				<SettingsMessages settings={settings} initial="en">
					<SettingsPage
						settings={settings}
						library={createMemoryLibrary()}
						watchers={createMemorySource<Watcher[]>([])}
						history={createMemorySource<HistoryEntry[]>([])}
						syncStatus={createMemorySource<SyncStatus>(OFF_STATUS)}
						requestPricingAccess={async () => false}
						hasPricingAccess={async () => false}
						requestTradeAccess={async () => false}
						hasTradeAccess={async () => false}
						requestNotifications={async () => false}
						hasNotifications={async () => notifyAccess}
						version="1.2.3"
						download={() => {}}
					/>
				</SettingsMessages>,
				root,
			);
		});
		const headings = () =>
			[...root.querySelectorAll("h2")].map((h) => h.textContent);
		expect(headings()).toContain(en.settings.appearance.title);
		const select = root.querySelector<HTMLSelectElement>(
			`select[aria-label="${en.settings.appearance.language}"]`,
		);
		if (!select) throw new Error("no language picker");
		select.value = "de";
		await act(async () => {
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect((await settings.load()).language).toBe("de");
		expect(headings()).toContain(messagesFor("de").settings.appearance.title);
		expect(headings()).not.toContain(en.settings.appearance.title);
	});
});

describe("notifications without permission on this machine", () => {
	it("shows the switch off with a notice when the permission is missing", async () => {
		notifyAccess = false;
		try {
			const { root } = await mount({ notifications: true });
			await act(async () => {});
			const toggle = root.querySelector<HTMLButtonElement>(
				'button[role=switch][aria-label="Notifications"]',
			);
			expect(toggle?.getAttribute("aria-checked")).toBe("false");
			expect(root.querySelector('[role="alert"]')?.textContent).toContain(
				"has not allowed them",
			);
		} finally {
			notifyAccess = true;
		}
	});
});
