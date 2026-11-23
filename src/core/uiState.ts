import * as v from "valibot";

/** Per-machine view state; never synced, so collapsing a folder at work leaves home alone. */
export interface UiState {
	collapsed: string[];
	/** The panel itself, remembered so a reload does not reopen what the user closed. */
	panelOpen: boolean;
}

export const DEFAULT_UI_STATE: UiState = { collapsed: [], panelOpen: true };

const UiStateSchema = v.fallback(
	v.object({
		collapsed: v.fallback(v.array(v.string()), []),
		panelOpen: v.fallback(v.boolean(), true),
	}),
	DEFAULT_UI_STATE,
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
