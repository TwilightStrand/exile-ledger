import { parseWatchers } from "../core/watchers";
import { localSource } from "./localSource";

// Local only: watcher state changes on every check and is tied to this
// machine's session with the trade site.
export const browserWatchers = localSource("local:watchers", parseWatchers);
