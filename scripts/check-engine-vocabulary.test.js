import { describe, expect, it } from 'vitest';
import {
	ALLOW_MARKER,
	findVocabulary,
	formatReport,
	parseAddedLines,
	scanDiff,
	scanFiles
} from './check-engine-vocabulary.js';

describe('findVocabulary', () => {
	it('matches the four flyting concepts in any case and common inflections', () => {
		expect(findVocabulary('const acclaimed = true')).toEqual(['acclaim']);
		expect(findVocabulary('// the Crowd reacts')).toEqual(['crowd']);
		expect(findVocabulary('insults: string[]')).toEqual(['insult']);
		expect(findVocabulary('a Flyting round')).toEqual(['flyting']);
	});

	it('allows the proper noun Flyt but flags lower-case flyt and FLYT', () => {
		expect(findVocabulary("Flyt's own compiler produces it")).toEqual([]);
		expect(findVocabulary('import { flyt } from "./flyt.js"')).toEqual(['flyt (not the proper noun Flyt)']);
		expect(findVocabulary('const FLYT_ROUNDS = 3')).toEqual(['flyt (not the proper noun Flyt)']);
	});

	it('matches a term used as a segment of an identifier', () => {
		expect(findVocabulary('const crowdMood = 1')).toEqual(['crowd']);
		expect(findVocabulary('CROWD_SIZE')).toEqual(['crowd']);
		expect(findVocabulary('acclaim_level')).toEqual(['acclaim']);
		expect(findVocabulary('playerInsultDeck')).toEqual(['insult']);
		expect(findVocabulary('flytRound')).toEqual(['flyt (not the proper noun Flyt)']);
	});

	it('matches contest zone labels regardless of case, with or without an escaped apostrophe', () => {
		expect(findVocabulary("label: 'Player\\'s End'")).toEqual(["zone label 'Player's End'"]);
		expect(findVocabulary("Player's End")).toEqual(["zone label 'Player's End'"]);
		expect(findVocabulary('CENTRE GROUND')).toEqual(["zone label 'Centre Ground'"]);
		expect(findVocabulary('beyond_opponent')).toEqual(["zone label 'Beyond Opponent'"]);
	});

	it('ignores words that merely contain a term', () => {
		expect(findVocabulary('crowdfunding')).toEqual([]);
		expect(findVocabulary('acclaimable')).toEqual([]);
		expect(findVocabulary('insultingly')).toEqual([]);
		expect(findVocabulary('overcrowded')).toEqual([]);
	});

	it('skips a line carrying the allow marker', () => {
		expect(findVocabulary(`// crowd of helpers, ${ALLOW_MARKER}`)).toEqual([]);
	});

	it('reports every match on a line, in vocabulary order', () => {
		expect(findVocabulary('the crowd shouts an insult')).toEqual(['crowd', 'insult']);
	});
});

const diff = `diff --git a/src/engine/types.ts b/src/engine/types.ts
--- a/src/engine/types.ts
+++ b/src/engine/types.ts
@@ -10,3 +10,5 @@
 context line
-removed crowd line
+added clean line
+added line about acclaim
 another context
@@ -40,2 +42,3 @@
 context
+second hunk insult
diff --git a/src/lib/arena.ts b/src/lib/arena.ts
--- a/src/lib/arena.ts
+++ b/src/lib/arena.ts
@@ -1,2 +1,3 @@
+label: 'Behind Player'
 context
`;

describe('parseAddedLines', () => {
	it('keeps only added lines under src/engine/ with correct line numbers', () => {
		expect(parseAddedLines(diff)).toEqual([
			{ file: 'src/engine/types.ts', line: 11, text: 'added clean line' },
			{ file: 'src/engine/types.ts', line: 12, text: 'added line about acclaim' },
			{ file: 'src/engine/types.ts', line: 43, text: 'second hunk insult' }
		]);
	});

	it('returns nothing for an empty diff', () => {
		expect(parseAddedLines('')).toEqual([]);
	});
});

describe('scanDiff', () => {
	it('reports only added engine lines with vocabulary', () => {
		const hits = scanDiff(diff);
		expect(hits.map(h => [h.line, h.matches])).toEqual([
			[12, ['acclaim']],
			[43, ['insult']]
		]);
	});

	it('ignores removed lines and files outside the engine', () => {
		const hits = scanDiff(diff);
		expect(hits.some(h => h.text.includes('removed'))).toBe(false);
		expect(hits.some(h => h.file.startsWith('src/lib/'))).toBe(false);
	});
});

describe('scanFiles', () => {
	it('scans every line of whole files', () => {
		const hits = scanFiles([
			{ path: 'src/engine/a.ts', content: 'clean\nthe crowd\nFlyt hosts this' },
			{ path: 'src/engine/b.ts', content: 'nothing here' }
		]);
		expect(hits).toEqual([{ file: 'src/engine/a.ts', line: 2, text: 'the crowd', matches: ['crowd'] }]);
	});
});

describe('formatReport', () => {
	it('says clean when there are no hits', () => {
		expect(formatReport([])).toBe('engine vocabulary: clean');
	});

	it('lists each hit with file, line and matched terms', () => {
		const report = formatReport([{ file: 'src/engine/x.ts', line: 7, text: '  crowd  ', matches: ['crowd'] }]);
		expect(report).toContain('1 line under src/engine/');
		expect(report).toContain('src/engine/x.ts:7: crowd');
		expect(report).toContain(ALLOW_MARKER);
	});
});
