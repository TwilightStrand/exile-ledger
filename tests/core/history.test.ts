import { describe, expect, it } from "vitest";
import {
	clearHistory,
	HISTORY_CAP,
	type HistoryEntry,
	historyFor,
	parseHistory,
	recordSearch,
} from "../../src/core/history";

const entry = (
	searchId: string,
	at: number,
	game: HistoryEntry["game"] = "poe2",
): HistoryEntry => ({
	id: `h-${game}-${searchId}-${at}`,
	game,
	league: "Standard",
	query: { query: { term: searchId } },
	searchId,
	total: 5,
	at,
});

describe("recordSearch", () => {
	it("puts new searches first", () => {
		const history = recordSearch(
			recordSearch([], entry("a", 1)),
			entry("b", 2),
		);
		expect(history.map((h) => h.searchId)).toEqual(["b", "a"]);
	});

	it("moves a repeated search to the top instead of duplicating it", () => {
		let history = recordSearch(recordSearch([], entry("a", 1)), entry("b", 2));
		history = recordSearch(history, entry("a", 3));
		expect(history.map((h) => `${h.searchId}@${h.at}`)).toEqual(["a@3", "b@2"]);
	});

	it("caps each game separately", () => {
		let history: HistoryEntry[] = [];
		for (let i = 0; i < HISTORY_CAP + 5; i++)
			history = recordSearch(history, entry(`p2-${i}`, i));
		history = recordSearch(history, entry("p1", 999, "poe1"));
		expect(historyFor(history, "poe2")).toHaveLength(HISTORY_CAP);
		expect(historyFor(history, "poe2")[HISTORY_CAP - 1]?.searchId).toBe("p2-5");
		expect(historyFor(history, "poe1")).toHaveLength(1);
	});

	it("keeps games apart when clearing", () => {
		const history = [entry("a", 1), entry("b", 2, "poe1")];
		expect(clearHistory(history, "poe2").map((h) => h.searchId)).toEqual(["b"]);
	});
});

describe("parseHistory", () => {
	it("keeps valid entries only", () => {
		expect(
			parseHistory([entry("a", 1), { nope: 1 }]).map((h) => h.searchId),
		).toEqual(["a"]);
		expect(parseHistory("x")).toEqual([]);
	});
});
