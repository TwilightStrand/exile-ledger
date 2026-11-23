import { parseHistory } from "../core/history";
import { localSource } from "./localSource";

// Local only: history is per machine and too large for storage.sync.
export const browserHistory = localSource("local:history", parseHistory);
