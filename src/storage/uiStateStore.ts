import { parseUiState } from "../core/uiState";
import { localSource } from "./localSource";

export const browserUiState = localSource("local:uiState", parseUiState);
