import type { ResultItem } from "./tradeApi";

/** A result kept for comparison while the user keeps searching; per tab, not stored. */
export interface PinnedItem {
	id: string;
	name: string;
	baseType: string;
	price: { amount: number; currency: string } | null;
	pinnedAt: number;
}

export function togglePin(
	pins: PinnedItem[],
	item: ResultItem,
	now: number,
): PinnedItem[] {
	if (pins.some((p) => p.id === item.id))
		return pins.filter((p) => p.id !== item.id);
	return [
		...pins,
		{
			id: item.id,
			name: item.name,
			baseType: item.baseType,
			price: item.price,
			pinnedAt: now,
		},
	];
}

export const unpin = (pins: PinnedItem[], id: string) =>
	pins.filter((p) => p.id !== id);
