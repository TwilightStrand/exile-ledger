import * as v from "valibot";

/** Content script to background: rates for one game and league. */
export const RatesRequestSchema = v.object({
	type: v.literal("exile-ledger:rates"),
	game: v.picklist(["poe1", "poe2"]),
	league: v.string(),
});
export type RatesRequest = v.InferOutput<typeof RatesRequestSchema>;
