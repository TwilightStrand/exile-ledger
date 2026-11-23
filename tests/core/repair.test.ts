import { describe, expect, it } from "vitest";
import type { Folder } from "../../src/core/model";
import { repairTree } from "../../src/core/repair";
import { depthOf, MAX_DEPTH } from "../../src/core/tree";

const folder = (
	id: string,
	parentId: string | null,
	game: Folder["game"] = "poe2",
): Folder => ({
	id,
	parentId,
	name: id,
	game,
	order: 0,
	archived: false,
	updatedAt: 0,
});
const parents = (folders: Folder[]) =>
	Object.fromEntries(folders.map((f) => [f.id, f.parentId]));

describe("repairTree", () => {
	it("leaves a valid tree alone", () => {
		const tree = [folder("a", null), folder("b", "a")];
		expect(repairTree(tree)).toEqual(tree);
	});

	it("moves orphans and cross-game children to the root", () => {
		expect(
			parents(
				repairTree([
					folder("a", "missing"),
					folder("x", null, "poe1"),
					folder("b", "x"),
				]),
			),
		).toEqual({
			a: null,
			x: null,
			b: null,
		});
	});

	it("breaks a cycle", () => {
		const repaired = repairTree([folder("a", "b"), folder("b", "a")]);
		expect(repaired.some((f) => f.parentId === null)).toBe(true);
		for (const f of repaired)
			expect(depthOf(repaired, f.id)).toBeLessThanOrEqual(2);
	});

	it("flattens folders past the depth limit into the last allowed level", () => {
		const ids = ["l1", "l2", "l3", "l4", "l5", "l6", "l7"];
		const tree = ids.map((id, i) =>
			folder(id, i === 0 ? null : (ids[i - 1] ?? null)),
		);
		const repaired = repairTree(tree);
		expect(Math.max(...repaired.map((f) => depthOf(repaired, f.id)))).toBe(
			MAX_DEPTH,
		);
		expect(parents(repaired)).toMatchObject({ l5: "l4", l6: "l4", l7: "l4" });
	});
});
