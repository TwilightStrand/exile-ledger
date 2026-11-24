import * as v from "valibot";
import { DEFAULT_HOTKEYS, type Hotkeys, parseHotkeys } from "./hotkeys";
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from "./themes";
import { WATCH_INTERVAL } from "./watchers";

export const PANEL_SIDES = ["left", "right"] as const;
export type PanelSide = (typeof PANEL_SIDES)[number];

export const PANEL_MODES = ["overlay", "push"] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

/**
 * Width is a share of the window, so one synced setting suits a laptop and a
 * 4K screen alike. The pixel bounds still apply: below 260 px bookmark names
 * are cut off, and past 640 px the panel covers most of the results.
 */
export const PANEL_WIDTH = {
	min: 14,
	max: 40,
	default: 20,
	minPx: 260,
	maxPx: 640,
} as const;

export interface Settings {
	panelSide: PanelSide;
	/** Overlay floats over the page; push narrows the page so nothing is covered. */
	panelMode: PanelMode;
	/** Percent of the window width, within PANEL_WIDTH's pixel bounds. */
	panelWidth: number;
	historyEnabled: boolean;
	/** Bookmarks through storage.sync; settings themselves always sync. */
	syncEnabled: boolean;
	/** Mark the result mod lines the search filtered on. */
	highlightMods: boolean;
	/** Off until the user grants access to poe.ninja. */
	equivalentPricing: boolean;
	/** Bookmark name or item and league in the browser tab title. */
	tabTitles: boolean;
	/** Prefix "~" (fuzzy match) in the item search box. */
	tildePrefix: boolean;
	/** The same in the stat filter pickers, where exact matches matter more often. */
	tildePrefixFilters: boolean;
	/** Exact date and time under each result. */
	listingTime: boolean;
	/** Prefix and suffix count from mod tiers. */
	affixCount: boolean;
	/** Copy-as-game-text button and wiki link on each result. */
	itemTools: boolean;
	/** PoE1 note when item level caps sockets below the base's maximum. */
	socketWarning: boolean;
	/** Browser Back and Forward move between searches. */
	backForward: boolean;
	/** Colours for the panel, the settings page and the marks on the trade site. */
	theme: ThemeId;
	/** Shorter rows in the panel, for long bookmark lists on small screens. */
	compact: boolean;
	/** Minutes between checks for newly added watchers. */
	watchInterval: number;
	/** Keyboard shortcuts on the trade page; null leaves an action unbound. */
	hotkeys: Hotkeys;
}

// Left matches where Better Trading docks, so people switching over find it in the same place.
export const DEFAULT_SETTINGS: Settings = {
	panelSide: "left",
	panelMode: "push",
	panelWidth: PANEL_WIDTH.default,
	historyEnabled: true,
	syncEnabled: true,
	highlightMods: true,
	equivalentPricing: false,
	tabTitles: true,
	tildePrefix: true,
	tildePrefixFilters: true,
	listingTime: true,
	affixCount: true,
	itemTools: true,
	socketWarning: false,
	backForward: true,
	theme: DEFAULT_THEME,
	compact: false,
	hotkeys: DEFAULT_HOTKEYS,
	watchInterval: WATCH_INTERVAL.default,
};

export function clampWidth(percent: number): number {
	const clamped = Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, percent));
	return Math.round(clamped * 10) / 10;
}

export function panelWidthCss(percent: number): string {
	return `clamp(${PANEL_WIDTH.minPx}px, ${percent}vw, ${PANEL_WIDTH.maxPx}px)`;
}

// Each field falls back on its own, so one bad value from another device or an
// older build does not reset the rest.
export const SettingsSchema = v.fallback(
	v.object({
		panelSide: v.fallback(v.picklist(PANEL_SIDES), DEFAULT_SETTINGS.panelSide),
		panelMode: v.fallback(v.picklist(PANEL_MODES), DEFAULT_SETTINGS.panelMode),
		panelWidth: v.fallback(
			v.pipe(v.number(), v.finite(), v.transform(clampWidth)),
			DEFAULT_SETTINGS.panelWidth,
		),
		historyEnabled: v.fallback(v.boolean(), DEFAULT_SETTINGS.historyEnabled),
		syncEnabled: v.fallback(v.boolean(), DEFAULT_SETTINGS.syncEnabled),
		highlightMods: v.fallback(v.boolean(), DEFAULT_SETTINGS.highlightMods),
		tabTitles: v.fallback(v.boolean(), DEFAULT_SETTINGS.tabTitles),
		tildePrefix: v.fallback(v.boolean(), DEFAULT_SETTINGS.tildePrefix),
		tildePrefixFilters: v.fallback(
			v.boolean(),
			DEFAULT_SETTINGS.tildePrefixFilters,
		),
		listingTime: v.fallback(v.boolean(), DEFAULT_SETTINGS.listingTime),
		affixCount: v.fallback(v.boolean(), DEFAULT_SETTINGS.affixCount),
		itemTools: v.fallback(v.boolean(), DEFAULT_SETTINGS.itemTools),
		socketWarning: v.fallback(v.boolean(), DEFAULT_SETTINGS.socketWarning),
		backForward: v.fallback(v.boolean(), DEFAULT_SETTINGS.backForward),
		theme: v.fallback(v.picklist(THEME_IDS), DEFAULT_SETTINGS.theme),
		compact: v.fallback(v.boolean(), DEFAULT_SETTINGS.compact),
		watchInterval: v.fallback(
			v.pipe(
				v.number(),
				v.integer(),
				v.minValue(WATCH_INTERVAL.min),
				v.maxValue(1440),
			),
			DEFAULT_SETTINGS.watchInterval,
		),
		hotkeys: v.pipe(v.optional(v.unknown(), {}), v.transform(parseHotkeys)),
		equivalentPricing: v.fallback(
			v.boolean(),
			DEFAULT_SETTINGS.equivalentPricing,
		),
	}),
	DEFAULT_SETTINGS,
);

export function parseSettings(raw: unknown): Settings {
	return v.parse(SettingsSchema, raw ?? {});
}

/** What the UI needs from settings; the browser store in the extension, memory in previews and tests. */
export interface SettingsSource {
	load(): Promise<Settings>;
	save(patch: Partial<Settings>): Promise<void>;
	watch(onChange: (settings: Settings) => void): () => void;
}

export function createMemorySettings(
	initial: Partial<Settings> = {},
): SettingsSource {
	let current: Settings = { ...DEFAULT_SETTINGS, ...initial };
	const listeners = new Set<(settings: Settings) => void>();
	return {
		load: async () => current,
		save: async (patch) => {
			current = { ...current, ...patch };
			for (const listener of listeners) listener(current);
		},
		watch: (onChange) => {
			listeners.add(onChange);
			return () => listeners.delete(onChange);
		},
	};
}
