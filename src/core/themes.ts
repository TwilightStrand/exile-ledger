export const THEME_IDS = ["gold", "blood", "verdant", "azure", "bone"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Names of the `--color-ledger-*` tokens; Tailwind reads them as `ledger-<name>` colours. */
export const THEME_TOKENS = [
	"bg",
	"panel",
	"surface",
	"raised",
	"border",
	"line",
	"text",
	"muted",
	"faint",
	"gold",
	"gold-bright",
	"poe1",
	"poe2",
	"live",
	"warn",
	"warn-mark",
	"warn-edge",
	"danger",
	"danger-mark",
	"danger-bg",
	"header-from",
	"header-to",
	"shadow",
] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];

export interface Theme {
	scheme: "dark" | "light";
	/** `gold` is the accent in every theme; the name stays so class names keep working. */
	colors: Record<ThemeToken, string>;
	/**
	 * Accent for the marks we add to the trade site's results. The site is dark
	 * whatever theme is picked, so a light theme needs a lighter accent there.
	 */
	siteAccent: string;
}

export const THEMES: Record<ThemeId, Theme> = {
	gold: {
		scheme: "dark",
		colors: {
			bg: "#0b0907",
			panel: "#12100d",
			surface: "#1a1612",
			raised: "#221d17",
			border: "#2e261d",
			line: "#4a3b27",
			text: "#e9dfcb",
			muted: "#9b8c74",
			faint: "#6b5f4e",
			gold: "#d6ad62",
			"gold-bright": "#f0cd8a",
			poe1: "#c98b4a",
			poe2: "#7fb0d8",
			live: "#7cc47f",
			warn: "#efc39a",
			"warn-mark": "#e0985a",
			"warn-edge": "#c9824a",
			// Tailwind's red-300, red-400 and red-950, which these replaced.
			danger: "#ffa2a2",
			"danger-mark": "#ff6467",
			"danger-bg": "#460809",
			"header-from": "#1f1912",
			"header-to": "#14110d",
			shadow: "#000000",
		},
		siteAccent: "#d6ad62",
	},
	blood: {
		scheme: "dark",
		colors: {
			bg: "#0a0606",
			panel: "#110a0a",
			surface: "#190f0f",
			raised: "#231414",
			border: "#331c1c",
			line: "#5a2a2a",
			text: "#eddcd6",
			muted: "#a88f89",
			faint: "#7f625d",
			gold: "#e0807a",
			"gold-bright": "#f0948a",
			poe1: "#d08a50",
			poe2: "#8fb0d0",
			live: "#86c47c",
			warn: "#f0c49a",
			"warn-mark": "#e0985a",
			"warn-edge": "#c9824a",
			danger: "#ffb0a8",
			"danger-mark": "#ff6a5e",
			"danger-bg": "#4a0a0a",
			"header-from": "#231212",
			"header-to": "#150c0c",
			shadow: "#000000",
		},
		siteAccent: "#d4504a",
	},
	verdant: {
		scheme: "dark",
		colors: {
			bg: "#060a08",
			panel: "#0b110d",
			surface: "#111a14",
			raised: "#17231b",
			border: "#203026",
			line: "#2f4d3a",
			text: "#dbe8dd",
			muted: "#8ea595",
			faint: "#607868",
			gold: "#5cbf8a",
			"gold-bright": "#9ee0b8",
			poe1: "#c98b4a",
			poe2: "#7fb0d8",
			live: "#b5d66a",
			warn: "#efc39a",
			"warn-mark": "#e0985a",
			"warn-edge": "#c9824a",
			danger: "#ffa2a2",
			"danger-mark": "#ff6467",
			"danger-bg": "#460809",
			"header-from": "#132019",
			"header-to": "#0d1510",
			shadow: "#000000",
		},
		siteAccent: "#5cbf8a",
	},
	azure: {
		scheme: "dark",
		colors: {
			bg: "#06080c",
			panel: "#0b0f15",
			surface: "#10161f",
			raised: "#161e2a",
			border: "#202c3b",
			line: "#2e4560",
			text: "#dce5f0",
			muted: "#8c9db3",
			faint: "#5f7086",
			gold: "#5ea2e6",
			"gold-bright": "#a2cbf5",
			poe1: "#c98b4a",
			poe2: "#8fc0e8",
			live: "#7cc47f",
			warn: "#efc39a",
			"warn-mark": "#e0985a",
			"warn-edge": "#c9824a",
			danger: "#ffa2a2",
			"danger-mark": "#ff6467",
			"danger-bg": "#460809",
			"header-from": "#141c28",
			"header-to": "#0d121a",
			shadow: "#000000",
		},
		siteAccent: "#5ea2e6",
	},
	bone: {
		scheme: "light",
		colors: {
			bg: "#e6d9bf",
			panel: "#f2e9d5",
			surface: "#ebdfc6",
			raised: "#e1d2b3",
			border: "#cdb890",
			line: "#a88f5e",
			text: "#2a1f12",
			muted: "#5c4a33",
			faint: "#857153",
			gold: "#5e3911",
			"gold-bright": "#6a420f",
			poe1: "#844815",
			poe2: "#24577f",
			live: "#23652b",
			warn: "#7a4510",
			"warn-mark": "#a35c1c",
			"warn-edge": "#b8732f",
			danger: "#9e1f1a",
			"danger-mark": "#c0392b",
			"danger-bg": "#f0c4bc",
			"header-from": "#f5edde",
			"header-to": "#e9dcc2",
			shadow: "#3a2a10",
		},
		siteAccent: "#c8955a",
	},
};

export const DEFAULT_THEME: ThemeId = "gold";

/** The `--color-ledger-*` custom properties a theme sets. */
export function themeProperties(id: ThemeId): Record<string, string> {
	const colors = THEMES[id].colors;
	const properties: Record<string, string> = {};
	for (const token of THEME_TOKENS) {
		properties[`--color-ledger-${token}`] = colors[token];
	}
	return properties;
}
