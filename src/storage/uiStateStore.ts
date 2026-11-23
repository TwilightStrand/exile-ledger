import { storage } from "wxt/utils/storage";
import type { Source } from "../core/source";
import { parseUiState, type UiState } from "../core/uiState";

const item = storage.defineItem<unknown>("local:uiState");

export const browserUiState: Source<UiState> = {
	load: async () => parseUiState(await item.getValue()),
	update: async (change) => {
		const next = change(parseUiState(await item.getValue()));
		await item.setValue(next);
		return next;
	},
	watch: (onChange) => item.watch((value) => onChange(parseUiState(value))),
};
