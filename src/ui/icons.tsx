import type { ComponentChildren } from "preact";

interface IconProps {
	class?: string;
}

function Svg({
	children,
	class: className = "size-4",
}: IconProps & { children: ComponentChildren }) {
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
			{children}
		</svg>
	);
}

export const ChevronRight = (p: IconProps) => (
	<Svg {...p}>
		<path d="m9 6 6 6-6 6" />
	</Svg>
);

export const ChevronLeft = (p: IconProps) => (
	<Svg {...p}>
		<path d="m15 6-6 6 6 6" />
	</Svg>
);

export const Folder = (p: IconProps) => (
	<Svg {...p}>
		<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
	</Svg>
);

export const Bookmark = (p: IconProps) => (
	<Svg {...p}>
		<path d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-4-6 4V4.5a.5.5 0 0 1 .5-.5z" />
	</Svg>
);

export const Clock = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M12 7.5V12l3 2" />
	</Svg>
);

export const Pin = (p: IconProps) => (
	<Svg {...p}>
		<path d="M9 4h6l-1 6 3 3H7l3-3z" />
		<path d="M12 13v7" />
	</Svg>
);

export const Search = (p: IconProps) => (
	<Svg {...p}>
		<circle cx="11" cy="11" r="6.5" />
		<path d="m20 20-4.2-4.2" />
	</Svg>
);

export const Plus = (p: IconProps) => (
	<Svg {...p}>
		<path d="M12 5v14M5 12h14" />
	</Svg>
);

export const Bolt = (p: IconProps) => (
	<Svg {...p}>
		<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
	</Svg>
);

/** A ledger page with a gold rule; the extension's mark. */
export const Mark = ({ class: className = "size-5" }: IconProps) => (
	<svg class={className} viewBox="0 0 24 24" aria-hidden="true">
		<path
			d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"
			fill="currentColor"
			opacity="0.18"
		/>
		<path
			d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
		/>
		<path
			d="M8 9.5h8M8 12h8M8 14.5h5"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
	</svg>
);

export const Pencil = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
		<path d="m14.5 7.5 3 3" />
	</Svg>
);

export const Trash = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4.5 7h15M10 11v6M14 11v6" />
		<path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
		<path d="M9 7V4.5h6V7" />
	</Svg>
);

export const Check = (p: IconProps) => (
	<Svg {...p}>
		<path d="m5 12.5 4.5 4.5L19 7.5" />
	</Svg>
);

export const FolderPlus = (p: IconProps) => (
	<Svg {...p}>
		<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
		<path d="M12 11v5M9.5 13.5h5" />
	</Svg>
);

export const Archive = (p: IconProps) => (
	<Svg {...p}>
		<rect x="3.5" y="4.5" width="17" height="4" rx="1" />
		<path d="M5 8.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18V8.5M10 12.5h4" />
	</Svg>
);

export const Restore = (p: IconProps) => (
	<Svg {...p}>
		<path d="M4 12a8 8 0 1 0 2.3-5.6" />
		<path d="M4 4.5V9h4.5" />
	</Svg>
);

export const Share = (p: IconProps) => (
	<Svg {...p}>
		<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
	</Svg>
);

export const Warning = (p: IconProps) => (
	<Svg {...p}>
		<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
	</Svg>
);

export const Ellipsis = (p: IconProps) => (
	<Svg {...p}>
		<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="2.5" />
	</Svg>
);

export const Replace = (p: IconProps) => (
	<Svg {...p}>
		<path d="M20 12a8 8 0 0 1-13.7 5.6" />
		<path d="M4 12a8 8 0 0 1 13.7-5.6" />
		<path d="M18 3v4h-4M6 21v-4h4" />
	</Svg>
);
