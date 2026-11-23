import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encodeShare } from "../../../src/core/exchange";
import { decodeImport } from "../../../src/core/importers";
import { emptyLibrary, saveSearch } from "../../../src/core/library";

describe("decodeImport", () => {
	it("recognises our share strings", () => {
		const { library } = saveSearch(
			emptyLibrary(),
			{
				game: "poe1",
				league: "Standard",
				name: "x",
				query: { query: {} },
				searchId: null,
				live: false,
			},
			{ now: 1, newId: () => "f" },
		);
		const result = decodeImport(encodeShare(library, "f") ?? "", 1);
		expect(result.ok && result.value.source).toBe("exile-ledger");
	});

	it("recognises Better Trading exports", () => {
		const text = readFileSync(
			join(process.cwd(), "tests/fixtures/better-trading/v3.txt"),
			"utf8",
		);
		const result = decodeImport(text, 1);
		expect(result.ok && result.value.source).toBe("better-trading");
	});

	it("explains what it accepts when it reads neither", () => {
		const result = decodeImport("nope", 1);
		expect(result.ok).toBe(false);
	});
});
