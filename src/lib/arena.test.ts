import { describe, expect, it } from 'vitest';
import { areAdjacent, getAdjacent, getZone } from '@jasonwarrenuk/riffle';
import { ZONES, INNER_ZONES, MIDDLE_SECTORS, OUTER_QUARTERS } from './arena.js';

// The adjacency helpers are Riffle's and are tested there. These tests cover
// what is Flyt's own: the thirteen contest zones, and that they work with the
// package helpers as the arena map component uses them.

describe('contest arena data', () => {
	it('holds thirteen zones across three rings', () => {
		expect(Object.keys(ZONES)).toHaveLength(13);
		expect(INNER_ZONES).toHaveLength(3);
		expect(MIDDLE_SECTORS).toHaveLength(6);
		expect(OUTER_QUARTERS).toHaveLength(4);
	});

	it('resolves the documented examples through the package helpers', () => {
		expect(getZone(ZONES, 'middle', 3)?.id).toBe('m3');
		expect(getAdjacent(ZONES, 'i2').map(z => z.id)).toEqual(['i1', 'i3', 'm2', 'm3', 'm5', 'm6']);
		expect(areAdjacent(ZONES, 'm1', 'o1')).toBe(true);
		expect(ZONES.i1.label).toBe('Player\'s End');
	});

	it('numbers zones within each ring from one, matching the ID suffix', () => {
		for (const zone of Object.values(ZONES)) {
			expect(zone.id).toBe(`${zone.ring[0]}${zone.index}`);
		}
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
