import { readdirSync, readFileSync } from "node:fs";
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

/** Paints `fg` at `alpha` over `bg`, as `bg-ledger-gold/20` and `text-ledger-gold/80` do. */
function over(fg: string, alpha: number, bg: string): string {
	const channel = (hex: string, offset: number) =>
		Number.parseInt(hex.slice(offset, offset + 2), 16);
	return `#${[1, 3, 5]
		.map((o) =>
			Math.round(alpha * channel(fg, o) + (1 - alpha) * channel(bg, o))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}

// Text the UI draws on or with transparency: accent labels on their own tint
// (primary buttons, up to the /20 hover) and the /80 section headings.
const composited = THEME_IDS.flatMap((id) => {
	const c = THEMES[id].colors;
	return [
		...BACKGROUNDS.map((bg) => ({
			id,
			what: `accent text on accent/20 over ${bg}`,
			ratio: contrast(c.gold, over(c.gold, 0.2, c[bg])),
		})),
		{
			id,
			what: "accent/80 heading on surface",
			ratio: contrast(over(c.gold, 0.8, c.surface), c.surface),
		},
	];
});

describe("theme contrast", () => {
	it.each(cases)("$id: $fg on $bg reaches $min:1", ({ id, fg, bg, min }) => {
		const colors = THEMES[id].colors;
		expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
	});

	it.each(composited)("$id: $what reaches 4.5:1", ({ ratio }) => {
		expect(ratio).toBeGreaterThanOrEqual(4.5);
	});

	// faint only reaches 3:1, which is enough for icons but not for text.
	it("keeps the faint colour off text", () => {
		const files = readdirSync(join(process.cwd(), "src"), {
			recursive: true,
			encoding: "utf8",
		}).filter((f) => /\.tsx?$/.test(f));
		const textUse =
			/text-\[1\dpx\][^"`]*text-ledger-faint|text-ledger-faint[^"`]*text-\[1\dpx\]|placeholder:text-ledger-faint/;
		const offenders = files.filter((f) =>
			textUse.test(readFileSync(join(process.cwd(), "src", f), "utf8")),
		);
		expect(offenders).toEqual([]);
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
