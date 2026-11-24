import type { CSSProperties } from "preact";
import { THEMES, type ThemeId, themeProperties } from "../core/themes";

/** Inline style that themes an element and everything inside it. */
export function themeStyle(id: ThemeId): CSSProperties {
	return { ...themeProperties(id), colorScheme: THEMES[id].scheme };
}

/** Themes an element Preact does not render, such as the page's <html>. */
export function applyTheme(element: HTMLElement, id: ThemeId): void {
	for (const [name, value] of Object.entries(themeProperties(id))) {
		element.style.setProperty(name, value);
	}
	element.style.colorScheme = THEMES[id].scheme;
}
