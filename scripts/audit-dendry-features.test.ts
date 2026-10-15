import { describe, expect, it } from 'vitest';
import * as fixtures from '../tests/fixtures/audit-dendry-features';
import {
	FEATURE_GROUPS,
	auditAll,
	parseDryText,
	renderMarkdown,
	spliceReport,
	splitChoices,
	tallyBlocks
} from './audit-dendry-features.js';

const tallyText = (text: string) => tallyBlocks(parseDryText(text, 'fixture.dry'));

describe('parseDryText', () => {
	it('splits scene and quality blocks, keeping properties apart from content', () => {
		const blocks = parseDryText(fixtures.twoScenesAndAQuality, 'f.dry');
		expect(blocks.map((b) => [b.type, b.id])).toEqual([
			['quality', 'gold'],
			['scene', 'start'],
			['scene', 'next']
		]);
		const start = blocks[1];
		expect(start.props).toEqual({
			title: 'Start',
			subtitle: 'The beginning',
			'on-arrival': 'gold = gold + 1'
		});
		expect(start.content.join('\n')).toContain('Prose with');
		expect(start.file).toBe('f.dry');
	});
});

describe('splitChoices', () => {
	it('separates @ and # choices with their indented properties from the prose', () => {
		const start = parseDryText(fixtures.twoScenesAndAQuality, 'f.dry')[1];
		const { choices, prose } = splitChoices(start.content);
		expect(choices).toEqual([
			{ kind: '@', id: 'next', props: { 'view-if': 'gold > 3', priority: '2' } },
			{ kind: '#', id: 'tavern', props: {} }
		]);
		expect(prose).toContain('Prose with');
		expect(prose).not.toContain('view-if');
	});
});

describe('tallyBlocks', () => {
	it('counts every catalogued feature the fixture uses', () => {
		const { tally, unknown, sceneCount } = tallyText(fixtures.twoScenesAndAQuality);
		expect(sceneCount).toBe(2);
		expect(unknown).toEqual({});
		expect(tally['title'].count).toBe(2);
		expect(tally['subtitle'].count).toBe(1);
		expect(tally['on-arrival'].count).toBe(1);
		expect(tally['go-to (simple)'].count).toBe(1);
		expect(tally['choice: @scene'].count).toBe(1);
		expect(tally['choice: #tag'].count).toBe(1);
		expect(tally['choice: view-if'].count).toBe(1);
		expect(tally['choice: priority'].count).toBe(1);
		expect(tally['markup: **bold**'].count).toBe(1);
		expect(tally['markup: *italic*'].count).toBe(1);
		expect(tally['markup: [+ quality +]'].count).toBe(1);
		expect(tally['quality: integer'].count).toBe(1);
		expect(tally['title'].examples).toEqual(['fixture.dry:start', 'fixture.dry:next']);
	});

	it('tells simple go-to from conditional go-to', () => {
		const { tally } = tallyText(fixtures.goToForms);
		expect(tally['go-to (simple)'].count).toBe(1);
		expect(tally['go-to (conditional)'].count).toBe(2);
		expect(tally['go-to (simple)'].examples).toEqual(['fixture.dry:simple']);
	});

	it('reports properties and quality types the catalogue does not know', () => {
		const { unknown } = tallyText(fixtures.unknownProperties);
		expect(Object.keys(unknown).sort()).toEqual(['choice-level weight', 'colour', 'quality type emoji']);
		expect(unknown['colour']).toEqual({ count: 1, examples: ['fixture.dry:odd'] });
	});

	it('counts each markup occurrence, not each scene', () => {
		const { tally } = tallyText(fixtures.markupVariety);
		expect(tally['markup: [? if : ?]'].count).toBe(2);
		expect(tally['markup: **bold**'].count).toBe(2);
		expect(tally['markup: *italic*'].count).toBe(1);
		expect(tally['markup: [+ quality +]'].count).toBe(2);
		expect(tally['markup: [? if : ?]'].examples).toEqual(['fixture.dry:markup']);
	});

	it('caps examples at three locations', () => {
		const text = ['a', 'b', 'c', 'd'].map((id) => `@scene ${id}\ntitle: ${id}\n`).join('\n');
		const { tally } = tallyText(text);
		expect(tally['title'].count).toBe(4);
		expect(tally['title'].examples).toHaveLength(3);
	});
});

describe('renderMarkdown', () => {
	it('summarises coverage and renders one table per group', () => {
		const subgame = { name: 'fixture', ...tallyText(fixtures.twoScenesAndAQuality) };
		const markdown = renderMarkdown([subgame]);
		const total = FEATURE_GROUPS.flatMap((g) => g.features).length;
		expect(markdown).toContain(`of ${total} catalogued features are exercised`);
		expect(markdown).toContain('| fixture | 2 |');
		for (const group of FEATURE_GROUPS) expect(markdown).toContain(`## ${group.name}`);
		expect(markdown).toContain('| `style` | ignored | 0 |  |');
		expect(markdown).toContain('| `title` | parsed | 2 | `fixture.dry:start`, `fixture.dry:next` |');
		expect(markdown).toContain('None: every property in the content appears in');
	});

	it('lists properties outside the catalogue when there are any', () => {
		const subgame = { name: 'odd', ...tallyText(fixtures.unknownProperties) };
		const markdown = renderMarkdown([subgame]);
		expect(markdown).toContain('| `colour` | odd | 1 | `fixture.dry:odd` |');
		expect(markdown).not.toContain('None: every property');
	});
});

describe('spliceReport', () => {
	it('replaces only the text between the generated markers', () => {
		const result = spliceReport(fixtures.emptyReport, '## Fresh\n\nnew text\n');
		expect(result).toContain('Hand-written intro.');
		expect(result).toContain('Hand-written outro.');
		expect(result).toContain('new text');
		expect(result).not.toContain('old generated text');
		expect(spliceReport(result, '## Fresh\n\nnew text\n')).toBe(result);
	});

	it('refuses a report without both markers', () => {
		expect(() => spliceReport('# No markers', 'x')).toThrow(/markers/);
	});
});

describe('auditAll against story/', () => {
	it('audits every subgame and finds no property outside the catalogue', () => {
		const subgames = auditAll('story');
		expect(subgames.map((s) => s.name)).toEqual(['contest', 'great-hall']);
		for (const subgame of subgames) expect(subgame.unknown).toEqual({});
		const greatHall = subgames.find((s) => s.name === 'great-hall');
		expect(greatHall?.sceneCount).toBeGreaterThan(0);
	});
});
