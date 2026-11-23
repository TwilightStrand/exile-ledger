import * as v from "valibot";

export const PANEL_SIDES = ["left", "right"] as const;
export type PanelSide = (typeof PANEL_SIDES)[number];

export interface Settings {
	panelSide: PanelSide;
}

// Left matches where Better Trading docks, so people switching over find it in the same place.
export const DEFAULT_SETTINGS: Settings = { panelSide: "left" };

// Each field falls back on its own, so one bad value from another device or an
// older build does not reset the rest.
const SettingsSchema = v.fallback(
	v.object({
		panelSide: v.fallback(v.picklist(PANEL_SIDES), DEFAULT_SETTINGS.panelSide),
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
