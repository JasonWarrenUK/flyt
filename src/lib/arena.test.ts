import { describe, expect, it } from 'vitest';
import {
	ZONES,
	INNER_ZONES,
	MIDDLE_SECTORS,
	OUTER_QUARTERS,
	areAdjacent,
	buildZoneMap,
	getAdjacent,
	getZone,
	type Zone,
	type ZoneMap
} from './arena.js';

// A two-ring arena with ring names Flyt never uses, to prove the helpers
// carry no assumption about the contest's rings or ID prefixes.
type TestRing = 'hub' | 'rim';
const hub: Zone<TestRing> = { id: 'core', ring: 'hub', index: 1, label: 'Core', adjacent: ['north', 'south'] };
const north: Zone<TestRing> = { id: 'north', ring: 'rim', index: 1, label: 'North', adjacent: ['core', 'south'] };
const south: Zone<TestRing> = { id: 'south', ring: 'rim', index: 2, label: 'South', adjacent: ['core', 'north', 'ghost'] };
const testArena: ZoneMap<TestRing> = buildZoneMap([hub], [north, south]);

describe('buildZoneMap', () => {
	it('keys every zone from every group by its ID', () => {
		expect(Object.keys(testArena).sort()).toEqual(['core', 'north', 'south']);
		expect(testArena.north).toBe(north);
	});
});

describe('getZone', () => {
	it('finds a zone by ring and index without relying on ID prefixes', () => {
		expect(getZone(testArena, 'rim', 2)).toBe(south);
		expect(getZone(testArena, 'hub', 1)).toBe(hub);
	});

	it('returns undefined for an index the ring does not have', () => {
		expect(getZone(testArena, 'hub', 2)).toBeUndefined();
	});
});

describe('getAdjacent', () => {
	it('resolves adjacent IDs to zones', () => {
		expect(getAdjacent(testArena, 'core')).toEqual([north, south]);
	});

	it('drops adjacent IDs that are not in the map', () => {
		expect(getAdjacent(testArena, 'south')).toEqual([hub, north]);
	});

	it('returns an empty list for an unknown zone', () => {
		expect(getAdjacent(testArena, 'nowhere')).toEqual([]);
	});
});

describe('areAdjacent', () => {
	it('reads adjacency from the first zone\'s list', () => {
		expect(areAdjacent(testArena, 'core', 'north')).toBe(true);
		expect(areAdjacent(testArena, 'north', 'ghost')).toBe(false);
	});

	it('is false when the first zone is unknown', () => {
		expect(areAdjacent(testArena, 'nowhere', 'core')).toBe(false);
	});
});

describe('contest arena data', () => {
	it('holds thirteen zones across three rings', () => {
		expect(Object.keys(ZONES)).toHaveLength(13);
		expect(INNER_ZONES).toHaveLength(3);
		expect(MIDDLE_SECTORS).toHaveLength(6);
		expect(OUTER_QUARTERS).toHaveLength(4);
	});

	it('resolves the documented examples', () => {
		expect(getZone(ZONES, 'middle', 3)?.id).toBe('m3');
		expect(getAdjacent(ZONES, 'i2').map(z => z.id)).toEqual(['i1', 'i3', 'm2', 'm3', 'm5', 'm6']);
		expect(areAdjacent(ZONES, 'm1', 'o1')).toBe(true);
		expect(ZONES.i1.label).toBe('Player\'s End');
	});

	it('has symmetric adjacency: every edge is listed from both ends', () => {
		for (const zone of Object.values(ZONES)) {
			for (const id of zone.adjacent) {
				expect(ZONES[id], `${zone.id} lists unknown zone ${id}`).toBeDefined();
				expect(areAdjacent(ZONES, id, zone.id), `${id} does not list ${zone.id} back`).toBe(true);
			}
		}
	});
});
