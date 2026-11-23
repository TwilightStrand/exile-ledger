import { type LibrarySource, parseLibrary } from "../core/library";
import { localSource } from "./localSource";

// Local for now; the sync adapter (Task 12) mirrors this into storage.sync.
export const browserLibrary: LibrarySource = localSource(
	"local:library",
	parseLibrary,
);
