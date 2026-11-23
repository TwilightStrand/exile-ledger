import * as v from "valibot";

export const PANEL_SIDES = ["left", "right"] as const;
export type PanelSide = (typeof PANEL_SIDES)[number];

export const PANEL_MODES = ["overlay", "push"] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

/** Narrower cuts off bookmark names; wider covers most of the trade results on a laptop. */
export const PANEL_WIDTH = { min: 260, max: 560, default: 304 } as const;

export interface Settings {
	panelSide: PanelSide;
	/** Overlay floats over the page; push narrows the page so nothing is covered. */
	panelMode: PanelMode;
	panelWidth: number;
	historyEnabled: boolean;
	/** Bookmarks through storage.sync; settings themselves always sync. */
	syncEnabled: boolean;
}

// Left matches where Better Trading docks, so people switching over find it in the same place.
export const DEFAULT_SETTINGS: Settings = {
	panelSide: "left",
	panelMode: "overlay",
	panelWidth: PANEL_WIDTH.default,
	historyEnabled: true,
	syncEnabled: true,
};

export function clampWidth(width: number): number {
	return Math.round(
		Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, width)),
	);
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
