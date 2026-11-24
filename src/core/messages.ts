import * as v from "valibot";

/** Content script to background: rates for one game and league. */
export const RatesRequestSchema = v.object({
	type: v.literal("exile-ledger:rates"),
	game: v.picklist(["poe1", "poe2"]),
	league: v.string(),
});
export type RatesRequest = v.InferOutput<typeof RatesRequestSchema>;

/**
 * Extension page or content script to background: a library edited from the
 * stored copy. The background merges it into the latest copy, one write at a
 * time, so edits made at the same moment in different tabs all survive.
 */
export const LibraryWriteSchema = v.object({
	type: v.literal("exile-ledger:library-write"),
	library: v.unknown(),
});
