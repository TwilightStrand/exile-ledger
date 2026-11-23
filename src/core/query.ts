import * as v from "valibot";

/**
 * The trade site's search body. Objects are loose on purpose: GGG adds filters
 * every league, and a stored query must round-trip with fields we do not model.
 */
const NameOrDiscriminated = v.union([
	v.string(),
	v.looseObject({ option: v.string(), discriminator: v.optional(v.string()) }),
]);

export const StatFilterSchema = v.looseObject({
	id: v.string(),
	value: v.optional(
		v.looseObject({
			min: v.optional(v.number()),
			max: v.optional(v.number()),
			option: v.optional(v.union([v.number(), v.string()])),
			weight: v.optional(v.number()),
		}),
	),
	disabled: v.optional(v.boolean()),
});

export const StatGroupSchema = v.looseObject({
	type: v.string(),
	filters: v.array(StatFilterSchema),
	value: v.optional(
		v.looseObject({
			min: v.optional(v.number()),
			max: v.optional(v.number()),
		}),
	),
	disabled: v.optional(v.boolean()),
});

export const TradeQuerySchema = v.looseObject({
	query: v.looseObject({
		status: v.optional(v.looseObject({ option: v.string() })),
		name: v.optional(NameOrDiscriminated),
		type: v.optional(NameOrDiscriminated),
		term: v.optional(v.string()),
		stats: v.optional(v.array(StatGroupSchema)),
		filters: v.optional(v.record(v.string(), v.unknown())),
	}),
	sort: v.optional(v.record(v.string(), v.string())),
});

export type TradeQuery = v.InferOutput<typeof TradeQuerySchema>;
export type StatGroup = v.InferOutput<typeof StatGroupSchema>;
export type StatFilter = v.InferOutput<typeof StatFilterSchema>;
