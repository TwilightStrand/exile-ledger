import { SELECTORS } from "./selectors";

/** A whole page or document, or just the result rows that need another look. */
export type RowScope = ParentNode | readonly HTMLElement[];

export function resultRows(scope: RowScope): Iterable<HTMLElement> {
	return "querySelectorAll" in scope
		? scope.querySelectorAll<HTMLElement>(SELECTORS.resultRow)
		: scope;
}
