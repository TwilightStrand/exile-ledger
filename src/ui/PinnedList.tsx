import { useState } from "preact/hooks";
import type { PinnedItem } from "../core/pins";
import { useMessages } from "./i18n";
import { Pin, Trash } from "./icons";
import { EmptyState } from "./parts";

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint transition-colors hover:bg-ledger-border hover:text-ledger-danger focus-visible:outline-2 focus-visible:outline-ledger-gold";

export function PinnedList({
	pins,
	onJump,
	onUnpin,
}: {
	pins: PinnedItem[];
	/** False when the result is no longer on the page. */
	onJump: (id: string) => boolean;
	onUnpin: (id: string) => void;
}) {
	const t = useMessages();
	const [missing, setMissing] = useState<string | null>(null);
	if (pins.length === 0) {
		return (
			<EmptyState icon={Pin} title={t.pins.emptyTitle}>
				{t.pins.emptyBody}
			</EmptyState>
		);
	}
	return (
		<ul class="px-2 py-2">
			{pins.map((pin) => (
				<li
					key={pin.id}
					class="group flex items-center gap-1 rounded hover:bg-ledger-raised"
				>
					<button
						type="button"
						class="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ledger-gold"
						onClick={() => setMissing(onJump(pin.id) ? null : pin.id)}
					>
						<span class="w-full truncate text-[13px] text-ledger-text">
							{[pin.name, pin.baseType].filter(Boolean).join(" ")}
						</span>
						<span class="text-[11px] text-ledger-faint">
							{missing === pin.id
								? t.pins.gone
								: pin.price
									? `${pin.price.amount} ${pin.price.currency}`
									: t.pins.noPrice}
						</span>
					</button>
					<button
						type="button"
						class={`${ICON_BUTTON} mr-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100`}
						aria-label={t.pins.unpin(pin.name || pin.baseType)}
						onClick={() => onUnpin(pin.id)}
					>
						<Trash class="size-3.5" />
					</button>
				</li>
			))}
		</ul>
	);
}
