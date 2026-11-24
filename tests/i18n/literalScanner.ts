/**
 * A small JS/JSX scanner that finds user-visible English written straight
 * into UI code instead of read from the catalogue. It is a heuristic, not a
 * parser: it knows strings, templates, comments, regex literals and JSX well
 * enough for this codebase's style, and nothing about types.
 */

export interface Finding {
	line: number;
	text: string;
}

/** Attributes whose string value is read or shown to the player. */
const SHOWN_ATTRS = new Set([
	"aria-label",
	"aria-valuetext",
	"aria-description",
	"title",
	"placeholder",
	"alt",
	"label",
	"hint",
	"description",
	"message",
	"text",
]);

/** `label: "x"`, `text = "x"` and the like, at the start of a segment. */
const SHOWN_PROPERTY =
	/^\s*(?:(?:const|let|var)\s+)?(?:label|title|text|message|hint|description|placeholder|textContent|innerText|alt)\s*(?::|=(?!=))/;
const SHOWN_SET_ATTRIBUTE =
	/setAttribute\(\s*["'](?:aria-label|title|placeholder|alt)["']\s*,\s*$/;

const LETTER = /\p{L}/u;
const IDENT = /[\p{L}\p{N}_$]/u;

/**
 * plain: ordinary code, where only literals assigned to a shown property count.
 * shown: a shown attribute's expression or a JSX child expression, where any
 * literal that is not one side of a comparison counts.
 */
type Context = "plain" | "shown";

/** Tokens after which `<` opens JSX and `/` opens a regex. */
const EXPRESSION_START = new Set([
	"",
	"(",
	",",
	"=",
	"?",
	":",
	"[",
	"{",
	"}",
	";",
	"!",
	"&",
	"|",
	"=>",
	"return",
	"case",
	"typeof",
	"yield",
	"await",
	"default",
]);

export function scanSource(source: string, jsx: boolean): Finding[] {
	const findings: Finding[] = [];
	let i = 0;
	let prev = "";

	const lineAt = (pos: number) => source.slice(0, pos).split("\n").length;
	const report = (pos: number, text: string) =>
		findings.push({ line: lineAt(pos), text: text.trim().slice(0, 80) });

	const isComparison = (start: number, end: number) =>
		/(?:[=!]==?)\s*$/.test(source.slice(Math.max(0, start - 6), start)) ||
		/^\s*[=!]==?/.test(source.slice(end, end + 6));

	const isShownProperty = (start: number) => {
		const before = source.slice(0, start);
		const segment = before.slice(
			Math.max(
				...[";", "{", "}", ",", "\n", "("].map((c) => before.lastIndexOf(c)),
			) + 1,
		);
		const line = before.slice(
			Math.max(...[";", "{", "}", "\n"].map((c) => before.lastIndexOf(c))) + 1,
		);
		return SHOWN_PROPERTY.test(segment) || SHOWN_SET_ATTRIBUTE.test(line);
	};

	const judge = (start: number, end: number, text: string, ctx: Context) => {
		if (!LETTER.test(text)) return;
		if (ctx === "shown" ? !isComparison(start, end) : isShownProperty(start))
			report(start, text);
	};

	const skipString = (quote: string): string => {
		const start = i;
		i++;
		while (i < source.length && source[i] !== quote) {
			if (source[i] === "\\") i++;
			i++;
		}
		i++;
		return source.slice(start + 1, i - 1);
	};

	const skipRegex = () => {
		i++;
		let inClass = false;
		while (i < source.length) {
			const c = source[i];
			if (c === "/" && !inClass) break;
			if (c === "[") inClass = true;
			if (c === "]") inClass = false;
			i += c === "\\" ? 2 : 1;
		}
		i++;
		while (i < source.length && /[a-z]/.test(source[i] ?? "")) i++;
	};

	const scanTemplate = (ctx: Context) => {
		const start = i;
		i++;
		let text = "";
		while (i < source.length && source[i] !== "`") {
			if (source[i] === "\\") {
				text += source.slice(i, i + 2);
				i += 2;
			} else if (source[i] === "$" && source[i + 1] === "{") {
				i += 2;
				prev = "{";
				scanJs("plain");
				i++;
			} else {
				text += source[i];
				i++;
			}
		}
		i++;
		judge(start, i, text, ctx);
		prev = "`";
	};

	/** Scans code until the `}` that closes the current expression, or the end. */
	function scanJs(ctx: Context): void {
		let depth = 0;
		while (i < source.length) {
			const c = source[i] ?? "";
			const next = source[i + 1] ?? "";
			if (/\s/.test(c)) {
				i++;
			} else if (c === "/" && next === "/") {
				while (i < source.length && source[i] !== "\n") i++;
			} else if (c === "/" && next === "*") {
				const end = source.indexOf("*/", i + 2);
				i = end === -1 ? source.length : end + 2;
			} else if (c === '"' || c === "'") {
				const start = i;
				const text = skipString(c);
				judge(start, i, text, ctx);
				prev = '"';
			} else if (c === "`") {
				scanTemplate(ctx);
			} else if (c === "/" && EXPRESSION_START.has(prev)) {
				skipRegex();
				prev = "/re/";
			} else if (
				jsx &&
				c === "<" &&
				EXPRESSION_START.has(prev) &&
				/[A-Za-z>]/.test(next)
			) {
				scanElement();
				prev = ")";
			} else if (c === "{" || c === "(" || c === "[") {
				if (c === "{") depth++;
				prev = c;
				i++;
			} else if (c === "}") {
				if (depth === 0) return;
				depth--;
				prev = c;
				i++;
			} else if (c === "=" && next === ">") {
				prev = "=>";
				i += 2;
			} else if (IDENT.test(c)) {
				const start = i;
				while (i < source.length && IDENT.test(source[i] ?? "")) i++;
				prev = source.slice(start, i);
			} else {
				prev = c;
				i++;
			}
		}
	}

	/** Scans one JSX element starting at its `<`, up to and including its end. */
	function scanElement(): void {
		i++;
		const nameStart = i;
		while (i < source.length && /[\w.:-]/.test(source[i] ?? "")) i++;
		const isFragment = i === nameStart;
		while (!isFragment && i < source.length) {
			const c = source[i] ?? "";
			if (/\s/.test(c)) {
				i++;
			} else if (c === "/" && source[i + 1] === ">") {
				i += 2;
				return;
			} else if (c === ">") {
				break;
			} else if (c === "{") {
				i++;
				prev = "{";
				scanJs("plain");
				i++;
			} else {
				const attrStart = i;
				while (i < source.length && /[\w:-]/.test(source[i] ?? "")) i++;
				const name = source.slice(attrStart, i);
				if (i === attrStart) i++;
				if (source[i] !== "=") continue;
				i++;
				const quote = source[i] ?? "";
				if (quote === '"' || quote === "'") {
					const start = i;
					const text = skipString(quote);
					if (SHOWN_ATTRS.has(name) && LETTER.test(text)) report(start, text);
				} else if (quote === "{") {
					i++;
					prev = "{";
					scanJs(SHOWN_ATTRS.has(name) ? "shown" : "plain");
					i++;
				}
			}
		}
		i++;
		scanChildren();
	}

	function scanChildren(): void {
		while (i < source.length) {
			if (source[i] === "<" && source[i + 1] === "/") {
				i = source.indexOf(">", i) + 1;
				return;
			}
			if (source[i] === "<") {
				scanElement();
			} else if (source[i] === "{") {
				i++;
				prev = "{";
				scanJs("shown");
				i++;
			} else {
				const start = i;
				while (i < source.length && source[i] !== "<" && source[i] !== "{") i++;
				const text = source.slice(start, i);
				if (LETTER.test(text)) report(start + text.search(/\S/), text);
			}
		}
	}

	// A stray `}` (or a misread regex) ends scanJs early; carry on past it.
	while (i < source.length) {
		scanJs("plain");
		i++;
	}
	return findings;
}
