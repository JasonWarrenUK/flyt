export { RiffleEngine } from './engine.svelte.js';
export type { CheckResult } from './engine.svelte.js';
export type * from './types.js';
// Arena topology is Flyt game content and now lives in src/lib/arena.ts; this re-export
// is kept for one more step and goes with roadmap task 8EX.3.
export { INNER_ZONES, MIDDLE_SECTORS, OUTER_QUARTERS, ZONES, getZone, getAdjacent, areAdjacent } from '../lib/arena.js';
export type { Ring, Zone } from '../lib/arena.js';
