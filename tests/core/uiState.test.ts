import { describe, expect, it } from "vitest";
import { parseUiState, setCollapsed } from "../../src/core/uiState";

describe("uiState", () => {
	it("defaults to nothing collapsed", () => {
		expect(parseUiState(undefined)).toEqual({ collapsed: [] });
		expect(parseUiState({ collapsed: [1] })).toEqual({ collapsed: [] });
	});

	it("adds and removes collapsed folders without duplicates", () => {
		const once = setCollapsed({ collapsed: [] }, "a", true);
		expect(setCollapsed(once, "a", true)).toEqual({ collapsed: ["a"] });
		expect(setCollapsed(once, "a", false)).toEqual({ collapsed: [] });
	});
});
