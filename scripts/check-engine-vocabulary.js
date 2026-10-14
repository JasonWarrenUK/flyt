/**
 * Engine vocabulary guard (docs/adr/0001-riffle-boundary.md, follow-up).
 *
 * src/engine/ is the Riffle engine's source and must stay game-agnostic.
 * This script reads a unified diff on stdin and fails when a line ADDED under
 * src/engine/ carries flyting vocabulary: the game's own concepts (acclaim,
 * crowd, insult, flyting) or one of the contest arena's zone labels. A hit
 * means the code belongs in Flyt, not in the engine.
 *
 * Only added lines count, so existing text never fails a PR that did not
 * touch it. The proper noun "Flyt" (capitalised, naming this repository) is
 * allowed, because the engine's own docs legitimately say which project
 * hosts it; "flyt" in lower case, "flyting" and "flyter" are game vocabulary
 * and are flagged. A line containing `vocab-ok` is skipped, for the rare
 * case where a reviewer has agreed a match is not game content.
 *
 * Usage:
 *   git diff origin/main...HEAD -- src/engine | node scripts/check-engine-vocabulary.js
 *   node scripts/check-engine-vocabulary.js --files src/engine/types.ts ...
 */

import { readFileSync } from 'fs';

/** Directory the guard applies to, as it appears in diff paths */
export const GUARDED_PREFIX = 'src/engine/';

/** Marker a line may carry to opt out of the check */
export const ALLOW_MARKER = 'vocab-ok';

/**
 * Build a pattern for one word as it appears in code: as a plain word, in
 * any case, or as a segment of a camelCase or snake_case identifier
 * (`crowdMood`, `CROWD_SIZE`, `acclaim_level`). The stem must not follow a
 * letter and must not run straight into a lower-case letter, so `crowds`
 * matches through its inflection and `crowdfunding` does not.
 * @param {string} stem lower-case word
 * @param {string} [inflections] alternation of endings, e.g. 'ed|s|ing'
 * @param {{ requireInflection?: boolean }} [opts]
 */
function word(stem, inflections = '', opts = {}) {
	const optional = opts.requireInflection ? '' : '?';
	const ending = inflections ? `(?:${inflections})${optional}` : '';
	const endingUpper = inflections ? `(?:${inflections.toUpperCase()})${optional}` : '';
	const capitalised = stem[0].toUpperCase() + stem.slice(1);
	// lower-case word: must not follow a letter (`crowd`, `crowd_mood`)
	const lower = `(?<![A-Za-z])${stem}${ending}(?![a-z])`;
	// upper-case constant: must not follow a letter (`CROWD`, `CROWD_SIZE`)
	const upper = `(?<![A-Za-z])${stem.toUpperCase()}${endingUpper}(?![a-z])`;
	// capitalised: may follow a lower-case letter, the camelCase segment case
	// (`Crowd`, `crowdMood` is caught by `lower`, `playerCrowd` by this)
	const camel = `(?<![A-Z])${capitalised}${ending}(?![a-z])`;
	return new RegExp(`${lower}|${upper}|${camel}`);
}

/**
 * Build a pattern for a multi-word zone label, in any case, tolerating an
 * escaped apostrophe (`'Player\'s End'` inside a string literal).
 * @param {string} label
 */
function phrase(label) {
	const body = label
		.replace(/'/g, "\\\\?'?")
		.replace(/ /g, '[ _-]');
	return new RegExp(body, 'i');
}

/**
 * Patterns that identify flyting vocabulary. Each entry names the concept
 * so a report can say what was matched, not only where.
 */
export const VOCABULARY = [
	{ name: 'acclaim', pattern: word('acclaim', 'ed|s|ing') },
	{ name: 'crowd', pattern: word('crowd', 's') },
	{ name: 'insult', pattern: word('insult', 's|ed|ing') },
	{ name: 'flyting', pattern: word('flyt', 'ing|ers|er|ed|s', { requireInflection: true }) },
	{ name: 'flyt (not the proper noun Flyt)', pattern: /(?<![A-Za-z])(?:flyt|FLYT)(?![a-z])/ },
	{ name: "zone label 'Player's End'", pattern: phrase("Player's End") },
	{ name: "zone label 'Centre Ground'", pattern: phrase('Centre Ground') },
	{ name: "zone label 'Opponent's End'", pattern: phrase("Opponent's End") },
	{ name: "zone label 'Behind Player'", pattern: phrase('Behind Player') },
	{ name: "zone label 'Behind-Left'", pattern: phrase('Behind-Left') },
	{ name: "zone label 'Beyond Opponent'", pattern: phrase('Beyond Opponent') }
];

/**
 * Return every vocabulary match in one line of text.
 * @param {string} text
 * @returns {string[]} the names of the matched entries, in VOCABULARY order
 */
export function findVocabulary(text) {
	if (text.includes(ALLOW_MARKER)) return [];
	return VOCABULARY.filter(entry => entry.pattern.test(text)).map(entry => entry.name);
}

/**
 * Pull the added lines out of a unified diff, keeping only files under the
 * guarded prefix. Line numbers follow the "+" side of each hunk header.
 * @param {string} diff
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function parseAddedLines(diff) {
	const added = [];
	let file = null;
	let lineNo = 0;
	for (const raw of diff.split('\n')) {
		if (raw.startsWith('+++ ')) {
			const path = raw.slice(4).replace(/^b\//, '').trim();
			file = path.startsWith(GUARDED_PREFIX) ? path : null;
			continue;
		}
		if (raw.startsWith('--- ')) continue;
		const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
		if (hunk) {
			lineNo = Number(hunk[1]);
			continue;
		}
		if (!file) continue;
		if (raw.startsWith('+')) {
			added.push({ file, line: lineNo, text: raw.slice(1) });
			lineNo += 1;
		} else if (!raw.startsWith('-') && raw !== '\\ No newline at end of file') {
			lineNo += 1;
		}
	}
	return added;
}

/**
 * Scan a unified diff for added engine lines carrying vocabulary.
 * @param {string} diff
 * @returns {{ file: string, line: number, text: string, matches: string[] }[]}
 */
export function scanDiff(diff) {
	return parseAddedLines(diff)
		.map(entry => ({ ...entry, matches: findVocabulary(entry.text) }))
		.filter(entry => entry.matches.length > 0);
}

/**
 * Scan whole files, every line, for vocabulary. Used for a local sweep.
 * @param {{ path: string, content: string }[]} files
 * @returns {{ file: string, line: number, text: string, matches: string[] }[]}
 */
export function scanFiles(files) {
	const hits = [];
	for (const { path, content } of files) {
		content.split('\n').forEach((text, i) => {
			const matches = findVocabulary(text);
			if (matches.length > 0) hits.push({ file: path, line: i + 1, text, matches });
		});
	}
	return hits;
}

/**
 * Format hits for the terminal, one line each, GitHub-annotation friendly.
 * @param {{ file: string, line: number, text: string, matches: string[] }[]} hits
 */
export function formatReport(hits) {
	if (hits.length === 0) return 'engine vocabulary: clean';
	const lines = hits.map(h => `${h.file}:${h.line}: ${h.matches.join(', ')}\n    ${h.text.trim()}`);
	const noun = hits.length === 1 ? 'line' : 'lines';
	return `engine vocabulary: ${hits.length} ${noun} under ${GUARDED_PREFIX} carry flyting vocabulary\n${lines.join('\n')}\n\nsrc/engine/ is the Riffle engine's source and must stay game-agnostic (docs/adr/0001-riffle-boundary.md). Move the content to Flyt, or mark a reviewed line with ${ALLOW_MARKER}.`;
}

function main(argv) {
	let hits;
	if (argv[0] === '--files') {
		const files = argv.slice(1).map(path => ({ path, content: readFileSync(path, 'utf-8') }));
		hits = scanFiles(files);
	} else {
		const diff = readFileSync(0, 'utf-8');
		hits = scanDiff(diff);
	}
	console.log(formatReport(hits));
	process.exit(hits.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
	main(process.argv.slice(2));
}
