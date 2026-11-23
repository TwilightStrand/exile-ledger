import type { FunctionComponent } from "preact";
import type { FolderIcon } from "../core/model";
import { Folder } from "./icons";

interface IconProps {
	class?: string;
}

function Glyph({ d, class: className = "size-4" }: IconProps & { d: string }) {
	return (
		<svg
			class={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d={d} />
		</svg>
	);
}

const glyph =
	(d: string): FunctionComponent<IconProps> =>
	(p) => <Glyph d={d} {...p} />;

export const FOLDER_ICON_COMPONENTS: Record<
	FolderIcon,
	FunctionComponent<IconProps>
> = {
	folder: Folder,
	sword: glyph("M14.5 4H20v5.5L10 19.5 4.5 14zM7 13l4 4M5 17l2 2M3.5 20.5l2-2"),
	bow: glyph("M6 3c8 2 13 7 15 15M6 3 21 18M6 3v5M6 3h5M14 13l5 5"),
	shield: glyph(
		"M12 3 19.5 6v5.5c0 4.4-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5.1-7.5-9.5V6z",
	),
	helmet: glyph("M4 15a8 8 0 0 1 16 0v3H4zM12 7v11M8 18v-4h8v4"),
	ring: glyph("M12 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM9.5 3h5L16 6l-4 3-4-3z"),
	amulet: glyph("M5 3c1 6 4 8 7 8s6-2 7-8M12 11v2M12 13l3 3.5-3 4.5-3-4.5z"),
	gem: glyph("M7 4h10l4 5-9 11L3 9zM3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"),
	flask: glyph(
		"M9.5 3h5M10 3v6L5 18.5A1.5 1.5 0 0 0 6.3 21h11.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3M7.5 15h9",
	),
	map: glyph(
		"M3.5 6.5 9 4l6 2.5 5.5-2.5v13L15 19.5 9 17l-5.5 2.5zM9 4v13M15 6.5v13",
	),
	coin: glyph(
		"M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9 9.5h4.5a1.75 1.75 0 0 1 0 3.5H10a1.75 1.75 0 0 0 0 3.5H15M12 7.5v2M12 16.5v2",
	),
	star: glyph(
		"m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.7 1.1-5.9L3.5 9.7l5.9-.8z",
	),
};

export const FOLDER_ICON_LABELS: Record<FolderIcon, string> = {
	folder: "Folder",
	sword: "Sword",
	bow: "Bow",
	shield: "Shield",
	helmet: "Helmet",
	ring: "Ring",
	amulet: "Amulet",
	gem: "Gem",
	flask: "Flask",
	map: "Map",
	coin: "Currency",
	star: "Star",
};
