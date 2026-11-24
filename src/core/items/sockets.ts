/**
 * PoE1 socket caps. An item can only roll as many sockets as its item level
 * allows, so a low-level six-socket base will never reach six; buyers who
 * plan to Jeweller it need to know before paying.
 */

/** Most sockets an item of this level can have, from the PoE wiki's item level table. */
export function socketsForItemLevel(itemLevel: number): number {
	if (itemLevel < 2) return 2;
	if (itemLevel < 25) return 3;
	if (itemLevel < 35) return 4;
	if (itemLevel < 50) return 5;
	return 6;
}

const SIX = [
	"Body Armours",
	"Two Hand Swords",
	"Two Hand Axes",
	"Two Hand Maces",
	"Staves",
	"Warstaves",
	"Bows",
];
const FOUR = ["Helmets", "Gloves", "Boots"];
const THREE = [
	"One Hand Swords",
	"Thrusting One Hand Swords",
	"One Hand Axes",
	"One Hand Maces",
	"Sceptres",
	"Daggers",
	"Rune Daggers",
	"Claws",
	"Wands",
	"Shields",
];

/** Most sockets the item class can have at any level, or null for classes without sockets. */
export function socketsForClass(itemClass: string): number | null {
	if (SIX.includes(itemClass)) return 6;
	if (FOUR.includes(itemClass)) return 4;
	if (THREE.includes(itemClass)) return 3;
	return null;
}

/**
 * The cap when the item level keeps the item below what its class allows,
 * otherwise null. Uniques are skipped: many have fixed socket counts.
 */
export function socketShortfall(item: {
	itemClass: string | null;
	itemLevel: number;
	rarity: string | null;
}): number | null {
	if (!item.itemClass || item.rarity === "Unique") return null;
	const classMax = socketsForClass(item.itemClass);
	if (classMax === null) return null;
	const levelMax = socketsForItemLevel(item.itemLevel);
	return levelMax < classMax ? levelMax : null;
}
