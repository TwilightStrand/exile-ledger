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
