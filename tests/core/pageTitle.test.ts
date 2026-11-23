import { describe, expect, it } from "vitest";
import { shouldPushInstead } from "../../src/core/navigation";
import { composeTitle, siteTitleOf } from "../../src/core/pageTitle";

const SITE = "Trade - Path of Exile";

describe("composeTitle", () => {
	it.each([
		[
			"Trade - Path of Exile",
			{ siteTitle: SITE, segment: "Body Armour (Standard)", live: false },
			"Body Armour (Standard) - Trade - Path of Exile",
		],
		[
			"(3) Trade - Path of Exile",
			{ siteTitle: SITE, segment: "Bow", live: true },
			"(3) ⚡ Bow - Trade - Path of Exile",
		],
		[
			"Trade - Path of Exile",
			{ siteTitle: SITE, segment: null, live: false },
			"Trade - Path of Exile",
		],
	])("from %j", (current, parts, expected) => {
		expect(composeTitle(current, parts)).toBe(expected);
	});

	it("recovers the site title from one we set, and takes a new one the site sets", () => {
		const ours = "Bow - Trade - Path of Exile";
		expect(siteTitleOf(`(2) ${ours}`, ours, SITE)).toBe(SITE);
		expect(siteTitleOf("Handel - Path of Exile", ours, SITE)).toBe(
			"Handel - Path of Exile",
		);
	});
});

describe("shouldPushInstead", () => {
	const base = "https://www.pathofexile.com/trade2/search/poe2/Standard";
	it.each([
		[base, `${base}/abc`, true],
		[`${base}/abc`, `${base}/def`, true],
		[`${base}/abc`, `${base}/abc/live`, false],
		[`${base}/abc`, base, false],
		[`${base}/abc`, "/trade2/search/poe2/Standard/xyz", true],
		["https://www.pathofexile.com/forum", `${base}/abc`, false],
	])("%s -> %s is %s", (from, to, expected) => {
		expect(shouldPushInstead(from, to)).toBe(expected);
	});
});
