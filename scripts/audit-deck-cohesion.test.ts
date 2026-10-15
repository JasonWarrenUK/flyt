import { describe, expect, it } from 'vitest';
import * as fixtures from '../tests/fixtures/audit-deck-cohesion';
import { parseDryText } from './audit-dendry-features.js';
import {
	assignmentTargets,
	auditBlocks,
	auditStory,
	groupName,
	identifiersRead,
	outgoingLinks,
	renderMarkdown
} from './audit-deck-cohesion.js';

const blocks = [
	...parseDryText(fixtures.qualities, 'qualities.dry'),
	...parseDryText(fixtures.hub, 'scenes/hub.scene.dry'),
	...parseDryText(fixtures.deckA, 'scenes/deck-a.scene.dry'),
	...parseDryText(fixtures.deckB, 'scenes/deck-b.scene.dry')
];
const audit = auditBlocks(blocks, 'start');
const groupByName = (name: string) => audit.groups.find((g) => g.name === name);

describe('groupName', () => {
	it('strips the directory and the .scene.dry suffix', () => {
		expect(groupName('scenes/skalds.scene.dry')).toBe('skalds');
		expect(groupName('qualities.dry')).toBe('qualities');
	});
});

describe('identifiersRead and assignmentTargets', () => {
	it('reads identifiers from a predicate, skipping keywords and numbers', () => {
		expect(identifiersRead('gold >= 2 and not key')).toEqual(['gold', 'key']);
	});

	it('reads only the right-hand side of an assignment', () => {
		expect(identifiersRead('gold = silver + 1')).toEqual(['silver']);
		expect(assignmentTargets(['gold = gold + 1', 'key = 1'])).toEqual(['gold', 'key']);
	});
});

describe('outgoingLinks', () => {
	it('collects choices, tag choices, every go-to branch, check targets and call', () => {
		const byId = Object.fromEntries(blocks.map((b) => [b.id, b]));
		expect(outgoingLinks(byId.start)).toEqual([
			{ to: 'deck_a', kind: 'choice' },
			{ to: 'deck_b', kind: 'choice' },
			{ to: 'vault', kind: 'choice' },
			{ to: '#event', kind: 'tag' }
		]);
		expect(outgoingLinks(byId.a1_lose)).toEqual([
			{ to: 'start', kind: 'go-to' },
			{ to: 'deck_a', kind: 'go-to' }
		]);
		expect(outgoingLinks(byId.card_a1).map((l) => l.kind)).toEqual(['check', 'check']);
		expect(outgoingLinks(byId.deck_b)).toContainEqual({ to: 'helper', kind: 'call' });
	});
});

describe('auditBlocks', () => {
	it('groups scenes by file and tallies writes, gates and reads', () => {
		expect(audit.groups.map((g) => g.name)).toEqual(['deck-a', 'deck-b', 'hub']);
		expect(groupByName('deck-a')?.writes).toEqual({ key: 1, gold: 1 });
		expect(groupByName('deck-a')?.gates).toEqual({ gold: 3 });
		expect(groupByName('hub')?.reads).toEqual({ gold: 2 });
	});

	it('lists the scene links that cross a group boundary', () => {
		const edges = audit.crossLinks.map((l) => `${l.from}>${l.to}:${l.kind}`);
		expect(edges).toContain('hub>deck-a:choice');
		expect(edges).toContain('hub>deck-b:tag');
		expect(edges).toContain('deck-a>hub:go-to');
		expect(edges).not.toContain('deck-a>deck-a:go-to');
	});

	it('derives which groups affect which through shared qualities', () => {
		expect(audit.effects).toContainEqual({ from: 'deck-a', to: 'hub', qualities: ['key'] });
		expect(audit.effects.find((e) => e.from === 'hub' && e.to === 'deck-b')?.qualities).toEqual(['gold']);
	});

	it('finds unreachable scenes, dead ends, dangling targets and undeclared identifiers', () => {
		expect(audit.unreachable).toEqual([{ scene: 'orphan', group: 'deck-b' }]);
		expect(audit.deadEnds.map((d) => d.scene)).toEqual(['card_b1', 'helper']);
		expect(audit.danglingTargets).toEqual([{ from: 'deck-b', to: '?missing_scene', kind: 'choice', scene: 'deck_b' }]);
		expect(audit.undeclared).toEqual({ fame: ['card_b1'] });
	});

	it('reaches tag-expanded scenes', () => {
		expect(audit.unreachable.map((u) => u.scene)).not.toContain('card_b1');
	});
});

describe('renderMarkdown', () => {
	it('renders every section with the audit data in it', () => {
		const md = renderMarkdown(audit);
		expect(md).toContain('| deck-a | 4 |');
		expect(md).toContain('| deck-a → hub | 3 | choice, go-to |');
		expect(md).toContain('| deck-a → hub | `key` |');
		expect(md).toContain('9 of 10 scenes are reachable');
		expect(md).toContain('| `orphan` | deck-b |');
		expect(md).toContain('| `deck_b` | `missing_scene` | choice |');
		expect(md).toContain('| `fame` | `card_b1` |');
	});
});

describe('auditStory against story/great-hall', () => {
	it('reaches every scene and finds no dangling link target', () => {
		const result = auditStory('story/great-hall');
		expect(result.firstScene).toBe('intro');
		expect(result.unreachable).toEqual([]);
		expect(result.danglingTargets).toEqual([]);
		expect(result.groups.map((g) => g.name)).toEqual(['hall', 'intro', 'merchants', 'showcase', 'skalds', 'warriors']);
	});
});
