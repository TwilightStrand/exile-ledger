import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	THEME_IDS,
	THEME_TOKENS,
	THEMES,
	type ThemeToken,
	themeProperties,
} from "../../src/core/themes";

function luminance(hex: string): number {
	if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`not #rrggbb: ${hex}`);
	const channel = (offset: number) => {
		const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2 contrast ratio. */
function contrast(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const BACKGROUNDS: ThemeToken[] = ["bg", "panel", "surface"];

// Body text and text-coloured tokens need 4.5:1 on every background they sit on.
const TEXT: ThemeToken[] = [
	"text",
	"muted",
	"gold-bright",
	"live",
	"warn",
	"danger",
];
// Accent and faint mark controls, icons and placeholders: 3:1 for UI parts.
const MARKS: ThemeToken[] = ["gold", "faint", "danger-mark", "warn-mark"];

const cases = THEME_IDS.flatMap((id) => [
	...TEXT.flatMap((fg) => BACKGROUNDS.map((bg) => ({ id, fg, bg, min: 4.5 }))),
	...MARKS.map((fg) => ({ id, fg, bg: "panel" as const, min: 3 })),
]);

describe("theme contrast", () => {
	it.each(cases)("$id: $fg on $bg reaches $min:1", ({ id, fg, bg, min }) => {
		const colors = THEMES[id].colors;
		expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
	});

	// The trade site stays dark whatever theme is picked; its result rows are about #0d0d0d.
	it.each(THEME_IDS)("%s: the trade-page accent reads on the site", (id) => {
		expect(contrast(THEMES[id].siteAccent, "#0d0d0d")).toBeGreaterThanOrEqual(
			4.5,
		);
	});
});

describe("themes", () => {
	it("uses a light colour scheme only for bone", () => {
		expect(THEME_IDS.filter((id) => THEMES[id].scheme === "light")).toEqual([
			"bone",
		]);
	});

	it("gives every token a custom property", () => {
		expect(Object.keys(themeProperties("azure"))).toEqual(
			THEME_TOKENS.map((token) => `--color-ledger-${token}`),
		);
	});

	it("seeds Tailwind with exactly the gold theme", () => {
		const css = readFileSync(
			join(process.cwd(), "src/styles/tailwind.css"),
			"utf8",
		);
		const seeded = Object.fromEntries(
			[...css.matchAll(/(--color-ledger-[\w-]+):\s*([^;]+);/g)].map((m) => [
				m[1],
				m[2],
			]),
		);
		expect(seeded).toEqual(themeProperties("gold"));
	});
});
