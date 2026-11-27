import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../../src/core/i18n";
import { de } from "../../src/core/i18n/de";

const AT = Date.UTC(2026, 0, 2, 3, 4);

afterEach(() => vi.restoreAllMocks());

describe("listing time", () => {
	it("matches toLocaleString and builds no formatter per row", () => {
		const options = { dateStyle: "medium", timeStyle: "short" } as const;
		expect(en.trade.listedAt(AT)).toBe(
			`Listed ${new Date(AT).toLocaleString(undefined, options)}`,
		);
		expect(de.trade.listedAt(AT)).toBe(
			`Angeboten ${new Date(AT).toLocaleString("de", options)}`,
		);
		const built = vi.spyOn(Intl, "DateTimeFormat");
		for (let i = 0; i < 1000; i++) en.trade.listedAt(AT + i * 60_000);
		expect(built).not.toHaveBeenCalled();
	});
});
