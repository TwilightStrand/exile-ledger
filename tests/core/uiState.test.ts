import { describe, expect, it } from "vitest";
import {
	DEFAULT_UI_STATE,
	parseUiState,
	setCollapsed,
} from "../../src/core/uiState";

describe("uiState", () => {
	it("defaults to nothing collapsed", () => {
		expect(parseUiState(undefined)).toEqual({ collapsed: [], panelOpen: true });
		expect(parseUiState({ collapsed: [1], panelOpen: false })).toEqual({
			collapsed: [],
			panelOpen: false,
		});
	});

	it("adds and removes collapsed folders without duplicates", () => {
		const once = setCollapsed(DEFAULT_UI_STATE, "a", true);
		expect(setCollapsed(once, "a", true).collapsed).toEqual(["a"]);
		expect(setCollapsed(once, "a", false).collapsed).toEqual([]);
	});
});
