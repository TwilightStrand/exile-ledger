import * as v from "valibot";

/** Per-machine view state; never synced, so collapsing a folder at work leaves home alone. */
export interface UiState {
	collapsed: string[];
}

const UiStateSchema = v.fallback(
	v.object({ collapsed: v.fallback(v.array(v.string()), []) }),
	{ collapsed: [] },
);

export function parseUiState(raw: unknown): UiState {
	return v.parse(UiStateSchema, raw ?? {});
}

export function setCollapsed(
	state: UiState,
	id: string,
	collapsed: boolean,
): UiState {
	const rest = state.collapsed.filter((c) => c !== id);
	return { ...state, collapsed: collapsed ? [...rest, id] : rest };
}
