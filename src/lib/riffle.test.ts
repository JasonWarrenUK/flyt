import { afterEach, describe, expect, it, vi } from 'vitest';
import { RiffleEngine } from '@jasonwarrenuk/riffle';
import type { CompiledGame } from '@jasonwarrenuk/riffle';

// Flyt consumes the engine from the published package rather than from a
// local directory. This test pins two things that would otherwise fail
// silently at runtime: the package resolves through Vite with its runes
// compiled, and the shape Flyt's compiler emits still loads.

const game: CompiledGame = {
	title: 'Smoke',
	firstScene: 'start',
	tagLookup: {},
	qualities: { wit: { id: 'wit', name: 'Wit', initial: 2, type: 'integer' } },
	scenes: {
		start: {
			id: 'start',
			title: 'Start',
			content: 'Wit [+ wit +].',
			options: [{ id: 'next', title: 'Onward' }]
		},
		next: { id: 'next', title: 'Next', content: 'Done.', onArrival: ['wit = wit + 1'] }
	}
};

afterEach(() => vi.unstubAllGlobals());

describe('@jasonwarrenuk/riffle from the registry', () => {
	it('loads compiled game JSON and navigates', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, statusText: '', json: async () => game })));
		const engine = new RiffleEngine();
		await engine.load('/smoke.json');
		expect(engine.error).toBeNull();
		expect(engine.display?.body).toContain('Wit 2.');
		engine.choose('next');
		expect(engine.state.currentSceneId).toBe('next');
		expect(engine.state.qualities.wit).toBe(3);
	});
});
