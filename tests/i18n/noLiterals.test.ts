import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSource } from "./literalScanner";

const ROOT = process.cwd();
const SCANNED = ["src/ui", "src/trade", "src/entrypoints"];

function sourceFiles(dir: string): string[] {
	return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(
		(entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) return sourceFiles(path);
			return /\.tsx?$/.test(entry.name) ? [path] : [];
		},
	);
}

const scan = (code: string, jsx = true) =>
	scanSource(code, jsx).map((f) => f.text);

describe("literal scanner", () => {
	it.each([
		["JSX text", "const a = <p>Save search</p>;"],
		["JSX text beside an expression", "const a = <p>{n} results</p>;"],
		["a shown attribute", 'const a = <b aria-label="Close" />;'],
		["a ternary in a shown attribute", 'const a = <b title={x ? "A" : y} />;'],
		[
			"a template in a shown attribute",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: the scanned source holds a template literal.
			"const a = <b title={`Rename ${n}`} />;",
		],
		["a literal child expression", 'const a = <p>{x ? "Gone" : y}</p>;'],
		["a notice text", 'setMessage({ tone: "ok", text: "History cleared." });'],
		["a label variable", 'const label = pinned ? "Unpin" : t.pin;'],
		["a set attribute", 'el.setAttribute("aria-label", "Pin");'],
	])("catches %s", (_name, code) => {
		expect(scan(code)).toHaveLength(1);
	});

	it.each([
		["catalogue reads", "const a = <p title={t.x}>{t.y}</p>;"],
		["class names", 'const a = <p class={on ? "text-a" : "text-b"}>{"·"}</p>;'],
		["comparisons", 'const a = <p>{tab === "history" && <X />}</p>;'],
		["generics and less-than", "const s = useState<T>(x); const b = a < c;"],
		["regex literals", 'const r = /"x/g; const q = "y";'],
		["comments", '// <p>Hello</p>\nconst a = 1; /* title: "x" */'],
	])("ignores %s", (_name, code) => {
		expect(scan(code)).toEqual([]);
	});
});

describe("UI source", () => {
	it("has no user-visible English outside the catalogue", () => {
		const findings = SCANNED.flatMap(sourceFiles).flatMap((path) =>
			scanSource(
				readFileSync(join(ROOT, path), "utf8"),
				path.endsWith(".tsx"),
			).map((f) => `${relative(ROOT, join(ROOT, path))}:${f.line} ${f.text}`),
		);
		expect(findings).toEqual([]);
	});
});
