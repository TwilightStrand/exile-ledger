import type { SearchWarning } from "../searchChecks";
import type { Messages } from "./en";

/** The API key as words ("gem_level" becomes "Gem level"); the query holds no localised label. */
function filterLabel(key: string): string {
	const words = key.replace(/_/g, " ");
	return `${words[0]?.toUpperCase()}${words.slice(1)}`;
}

export function searchWarningText(t: Messages, warning: SearchWarning): string {
	const m = t.searchChecks;
	switch (warning.kind) {
		case "gem-level-out-of-reach":
			return m.gemLevelOutOfReach(
				m.gems[warning.gem],
				warning.corruptedMaxLevel,
				warning.wanted,
			);
		case "gem-level-needs-corruption":
			return m.gemLevelNeedsCorruption(m.gems[warning.gem], warning.maxLevel);
		case "gem-quality-out-of-reach":
			return m.gemQualityOutOfReach(
				m.gems[warning.gem],
				warning.corruptedMaxQuality,
				warning.wanted,
			);
		case "gem-quality-needs-corruption":
			return m.gemQualityNeedsCorruption(
				m.gems[warning.gem],
				warning.maxQuality,
			);
		case "sockets-out-of-reach":
			return m.socketsOutOfReach(
				m.socketItems[warning.items],
				warning.max,
				warning.wanted,
			);
		case "links-out-of-reach":
			return m.linksOutOfReach(
				m.socketItems[warning.items],
				warning.max,
				warning.wanted,
			);
		case "mirrored-and-corrupted":
			return m.mirroredAndCorrupted;
		case "fractured-unique":
			return m.fracturedUnique;
		case "filter-min-above-max":
			return m.filterMinAboveMax(
				filterLabel(warning.filter),
				warning.min,
				warning.max,
			);
		case "stat-group-min-above-max":
			return m.statGroupMinAboveMax(warning.min, warning.max);
		case "stat-filter-min-above-max":
			return m.statFilterMinAboveMax(warning.min, warning.max);
	}
}
