/**
 * Arena topology — defines the concentric-circle layout and adjacency
 * relationships for the flyting contest play area.
 *
 * Three rings, each subdivided:
 *   Inner  (3 zones)  — player, centre, opponent
 *   Middle (6 sectors) — crowd/observers around the arena
 *   Outer  (4 quarters) — distant periphery
 *
 * Zone IDs use a ring prefix so they're unambiguous:
 *   "i1"–"i3", "m1"–"m6", "o1"–"o4"
 */

// ── Ring enum ────────────────────────────────────────────────────────

export type Ring = 'inner' | 'middle' | 'outer';

// ── Zone definition ──────────────────────────────────────────────────

export interface Zone {
	/** Unique zone ID, e.g. "m3" */
	id: string;
	/** Which ring this zone belongs to */
	ring: Ring;
	/** Numeric index within its ring (matches the quality value) */
	index: number;
	/** Human-readable label */
	label: string;
	/** IDs of all zones sharing an edge with this one */
	adjacent: string[];
}

// ── Inner circle (3 zones, divided by parallel chords) ──────────────
//
//    Player at bottom (zone 1), opponent at top (zone 3).
//    Zone 2 (centre) sits between the two chords — the contested ground.
//
//    Inner zones border middle sectors along the inner circle's perimeter:
//      i1 (bottom) faces m1, m2, m6
//      i2 (centre) faces m2, m3, m5, m6  (the chord-band spans both flanks)
//      i3 (top)    faces m3, m4, m5

export const INNER_ZONES: Zone[] = [
	{
		id: 'i1', ring: 'inner', index: 1,
		label: 'Player\'s End',
		adjacent: ['i2', 'm1', 'm2', 'm6'],
	},
	{
		id: 'i2', ring: 'inner', index: 2,
		label: 'Centre Ground',
		adjacent: ['i1', 'i3', 'm2', 'm3', 'm5', 'm6'],
	},
	{
		id: 'i3', ring: 'inner', index: 3,
		label: 'Opponent\'s End',
		adjacent: ['i2', 'm3', 'm4', 'm5'],
	},
];

// ── Middle circle (6 sectors, 60° each) ─────────────────────────────
//
//    Sectors are numbered counter-clockwise from behind the player:
//      1 = behind player         (centred at 270°)
//      2 = behind-left           (centred at 210°)
//      3 = left / beyond opp.    (centred at 150°)
//      4 = beyond opponent       (centred at  90°)
//      5 = right / beyond opp.   (centred at  30°)
//      6 = right / behind player (centred at 330°)
//
//    Each sector shares edges with:
//      • Its two lateral neighbours in the same ring
//      • The inner zone(s) it faces inward
//      • The outer quarter(s) it faces outward
//
//    Sector-to-quarter mapping (each 60° sector straddles or sits within
//    a 90° quarter):
//      m1 (240°–300°) → entirely within o1 (225°–315°)
//      m2 (180°–240°) → straddles o1 and o2
//      m3 (120°–180°) → straddles o2 and o3
//      m4 ( 60°–120°) → entirely within o3 (45°–135°)
//      m5 (  0°– 60°) → straddles o3 and o4
//      m6 (300°–360°) → straddles o4 and o1

export const MIDDLE_SECTORS: Zone[] = [
	{
		id: 'm1', ring: 'middle', index: 1,
		label: 'Behind Player',
		adjacent: ['m2', 'm6', 'i1', 'o1'],
	},
	{
		id: 'm2', ring: 'middle', index: 2,
		label: 'Behind-Left',
		adjacent: ['m1', 'm3', 'i1', 'i2', 'o1', 'o2'],
	},
	{
		id: 'm3', ring: 'middle', index: 3,
		label: 'Left / Beyond Opponent',
		adjacent: ['m2', 'm4', 'i2', 'i3', 'o2', 'o3'],
	},
	{
		id: 'm4', ring: 'middle', index: 4,
		label: 'Beyond Opponent',
		adjacent: ['m3', 'm5', 'i3', 'o3'],
	},
	{
		id: 'm5', ring: 'middle', index: 5,
		label: 'Right / Beyond Opponent',
		adjacent: ['m4', 'm6', 'i2', 'i3', 'o3', 'o4'],
	},
	{
		id: 'm6', ring: 'middle', index: 6,
		label: 'Right / Behind Player',
		adjacent: ['m5', 'm1', 'i1', 'i2', 'o4', 'o1'],
	},
];

// ── Outer circle (4 quarters, 90° each) ─────────────────────────────
//
//    Quarters are numbered counter-clockwise from behind the player:
//      1 = behind player   (centred at 270°, spanning 225°–315°)
//      2 = left             (centred at 180°, spanning 135°–225°)
//      3 = beyond opponent  (centred at  90°, spanning  45°–135°)
//      4 = right            (centred at   0°, spanning 315°– 45°)

export const OUTER_QUARTERS: Zone[] = [
	{
		id: 'o1', ring: 'outer', index: 1,
		label: 'Behind Player',
		adjacent: ['o2', 'o4', 'm1', 'm2', 'm6'],
	},
	{
		id: 'o2', ring: 'outer', index: 2,
		label: 'Left',
		adjacent: ['o1', 'o3', 'm2', 'm3'],
	},
	{
		id: 'o3', ring: 'outer', index: 3,
		label: 'Beyond Opponent',
		adjacent: ['o2', 'o4', 'm3', 'm4', 'm5'],
	},
	{
		id: 'o4', ring: 'outer', index: 4,
		label: 'Right',
		adjacent: ['o3', 'o1', 'm5', 'm6'],
	},
];

// ── Aggregate lookups ────────────────────────────────────────────────

/** All zones in the arena, keyed by ID */
export const ZONES: Record<string, Zone> = Object.fromEntries(
	[...INNER_ZONES, ...MIDDLE_SECTORS, ...OUTER_QUARTERS].map(z => [z.id, z])
);

/** Get a zone by its ring and index (e.g. ring='middle', index=3 → m3) */
export function getZone(ring: Ring, index: number): Zone | undefined {
	const prefix = ring[0]; // 'i', 'm', 'o'
	return ZONES[`${prefix}${index}`];
}

/** Get all zones adjacent to a given zone ID */
export function getAdjacent(zoneId: string): Zone[] {
	const zone = ZONES[zoneId];
	if (!zone) return [];
	return zone.adjacent.map(id => ZONES[id]).filter(Boolean);
}

/** Check whether two zone IDs share an edge */
export function areAdjacent(a: string, b: string): boolean {
	const zone = ZONES[a];
	return zone ? zone.adjacent.includes(b) : false;
}
