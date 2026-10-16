/**
 * Audits which DendryNexus features the story content actually exercises.
 *
 * Walks every subgame under story/, tallies each feature from
 * docs/dendrynexus-reference.md (scene properties, choice forms, choice-level
 * properties, content markup, quality types) and reports use counts with an
 * example location for each. Properties found in content but absent from the
 * reference are listed separately so the catalogue and the content drift
 * visibly rather than silently.
 *
 * Usage:
 *   node scripts/audit-dendry-features.js            # print the report
 *   node scripts/audit-dendry-features.js --write    # splice it into docs/reports/DENDRYNEXUS_FEATURE_COVERAGE.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const REPORT_PATH = 'docs/reports/DENDRYNEXUS_FEATURE_COVERAGE.md';
const GENERATED_START = '<!-- generated:start -->';
const GENERATED_END = '<!-- generated:end -->';

/**
 * The feature catalogue, grouped as docs/dendrynexus-reference.md groups it.
 * `compiler` records whether scripts/compile-dendry.js carries the property
 * into the JSON; keep it in step with that file when either changes.
 */
export const FEATURE_GROUPS = [
	{
		name: 'Scene: core display',
		features: [
			{ key: 'title', compiler: true },
			{ key: 'subtitle', compiler: true },
			{ key: 'unavailable-subtitle', compiler: true },
			{ key: 'style', compiler: false },
			{ key: 'signal', compiler: false },
			{ key: 'tags', compiler: true }
		]
	},
	{
		name: 'Scene: conditions and gating',
		features: [
			{ key: 'view-if', compiler: true },
			{ key: 'choose-if', compiler: true },
			{ key: 'max-visits', compiler: true },
			{ key: 'count-visits-max', compiler: true }
		]
	},
	{
		name: 'Scene: navigation',
		features: [
			{ key: 'go-to (simple)', compiler: true },
			{ key: 'go-to (conditional)', compiler: true },
			{ key: 'go-to-ref', compiler: true },
			{ key: 'set-root', compiler: true },
			{ key: 'set-jump', compiler: false },
			{ key: 'new-page', compiler: true },
			{ key: 'is-special', compiler: false },
			{ key: 'game-over', compiler: true },
			{ key: 'go-sub', compiler: false },
			{ key: 'go-sub-end', compiler: false }
		]
	},
	{
		name: 'Scene: actions',
		features: [
			{ key: 'on-arrival', compiler: true },
			{ key: 'on-departure', compiler: true },
			{ key: 'on-display', compiler: true },
			{ key: 'call', compiler: true }
		]
	},
	{
		name: 'Scene: choice selection',
		features: [
			{ key: 'order', compiler: true },
			{ key: 'priority', compiler: true },
			{ key: 'frequency', compiler: true },
			{ key: 'frequency-var', compiler: false },
			{ key: 'min-choices', compiler: true },
			{ key: 'max-choices', compiler: true }
		]
	},
	{
		name: 'Scene: card/deck/hand',
		features: [
			{ key: 'is-hand', compiler: true },
			{ key: 'is-deck', compiler: true },
			{ key: 'is-card', compiler: true },
			{ key: 'is-pinned-card', compiler: true },
			{ key: 'card-image', compiler: true },
			{ key: 'face-image', compiler: false },
			{ key: 'max-cards', compiler: true }
		]
	},
	{
		name: 'Scene: difficulty checks',
		features: [
			{ key: 'check-quality', compiler: true },
			{ key: 'broad-difficulty', compiler: true },
			{ key: 'narrow-difficulty', compiler: true },
			{ key: 'difficulty-scaler', compiler: true },
			{ key: 'difficulty-increment', compiler: true },
			{ key: 'check-success-go-to', compiler: true },
			{ key: 'check-failure-go-to', compiler: true }
		]
	},
	{
		name: 'Scene: multimedia',
		features: [
			{ key: 'set-bg', compiler: false },
			{ key: 'set-sprites', compiler: false },
			{ key: 'audio', compiler: false },
			{ key: 'achievement', compiler: false }
		]
	},
	{
		name: 'Choices',
		features: [
			{ key: 'choice: @scene', compiler: true },
			{ key: 'choice: #tag', compiler: true },
			{ key: 'choice: view-if', compiler: true },
			{ key: 'choice: choose-if', compiler: true },
			{ key: 'choice: order', compiler: true },
			{ key: 'choice: priority', compiler: true },
			{ key: 'choice: frequency', compiler: true }
		]
	},
	{
		name: 'Content markup',
		features: [
			{ key: 'markup: *italic*', compiler: true },
			{ key: 'markup: **bold**', compiler: true },
			{ key: 'markup: [+ quality +]', compiler: true },
			{ key: 'markup: [? if : ?]', compiler: true }
		]
	},
	{
		name: 'Quality types',
		features: [
			{ key: 'quality: integer', compiler: true },
			{ key: 'quality: fudge', compiler: true },
			{ key: 'quality: onOff', compiler: true },
			{ key: 'quality: wordScale', compiler: true },
			{ key: 'quality: raw', compiler: true }
		]
	}
];

/** Scene property keys that map straight onto a catalogue feature of the same name */
const SCENE_PROPERTY_KEYS = new Set(
	FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key)).filter(
		(key) => !key.includes(':') && !key.includes(' (')
	)
);

const CHOICE_PROPERTY_KEYS = new Set(['view-if', 'choose-if', 'order', 'priority', 'frequency']);

const MARKUP_PATTERNS = {
	'markup: *italic*': /(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)/g,
	'markup: **bold**': /\*\*[^*\n]+\*\*/g,
	'markup: [+ quality +]': /\[\+\s*[^+\]]+?\s*\+\]/g,
	'markup: [? if : ?]': /\[\?\s*if\b[\s\S]*?\?\]/g
};

/**
 * @typedef {{ count: number, examples: string[] }} Usage
 * @typedef {Record<string, Usage>} Tally
 * @typedef {{ type: 'scene' | 'quality', id: string, file: string, props: Record<string, string>, content: string[] }} Block
 * @typedef {{ kind: string, id: string, props: Record<string, string> }} Choice
 * @typedef {{ name: string, tally: Tally, unknown: Tally, sceneCount: number }} SubgameAudit
 */

/**
 * Recursively find all .dry files
 * @param {string} dir
 * @returns {string[]}
 */
function findDryFiles(dir) {
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir).sort()) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			files.push(...findDryFiles(path));
		} else if (entry.endsWith('.dry')) {
			files.push(path);
		}
	}
	return files;
}

/**
 * Parse one .dry file into blocks. Mirrors the block/property/content split in
 * scripts/compile-dendry.js but keeps the raw lines: the audit needs to see
 * indented choice properties and markup, which the compiler consumes.
 * @param {string} text
 * @param {string} file
 * @returns {Block[]}
 */
export function parseDryText(text, file) {
	/** @type {Block[]} */
	const blocks = [];
	/** @type {Block | null} */
	let current = null;

	for (const line of text.split('\n')) {
		const header = line.match(/^@(scene|quality)\s+(\S+)/);
		if (header) {
			if (current) blocks.push(current);
			current = { type: header[1] === 'scene' ? 'scene' : 'quality', id: header[2], file, props: {}, content: [] };
			continue;
		}
		// Bare @id header: the compiler accepts it as a scene, so the audit must too
		const bare = line.match(/^@(\w+)\s*$/);
		if (bare) {
			if (current) blocks.push(current);
			current = { type: 'scene', id: bare[1], file, props: {}, content: [] };
			continue;
		}
		if (!current) continue;

		const prop = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
		if (prop && current.content.length === 0) {
			current.props[prop[1]] = prop[2].trim();
			continue;
		}
		current.content.push(line);
	}
	if (current) blocks.push(current);
	return blocks;
}

/**
 * Split a scene's content lines into choices (with their indented properties) and prose
 * @param {string[]} lines
 * @returns {{ choices: Choice[], prose: string }}
 */
export function splitChoices(lines) {
	/** @type {Choice[]} */
	const choices = [];
	/** @type {string[]} */
	const prose = [];
	for (let i = 0; i < lines.length; i++) {
		const choice = lines[i].match(/^-\s+([@#])(\S+)\s*:\s*(.+)$/);
		if (choice) {
			/** @type {Choice} */
			const entry = { kind: choice[1], id: choice[2], props: {} };
			for (let j = i + 1; j < lines.length; j++) {
				const prop = lines[j].match(/^\s+(\w[\w-]*)\s*:\s*(.+)$/);
				if (!prop) break;
				entry.props[prop[1]] = prop[2].trim();
				i = j;
			}
			choices.push(entry);
			continue;
		}
		prose.push(lines[i]);
	}
	return { choices, prose: prose.join('\n') };
}

/** @returns {Tally} */
function emptyTally() {
	/** @type {Tally} */
	const tally = {};
	for (const group of FEATURE_GROUPS) {
		for (const feature of group.features) {
			tally[feature.key] = { count: 0, examples: [] };
		}
	}
	return tally;
}

/**
 * @param {Tally} tally
 * @param {string} key
 * @param {string} location
 */
function record(tally, key, location) {
	const entry = tally[key];
	entry.count += 1;
	if (entry.examples.length < 3 && !entry.examples.includes(location)) entry.examples.push(location);
}

/**
 * Tally one subgame's blocks into feature counts plus any unrecognised property keys
 * @param {Block[]} blocks
 * @returns {{ tally: Tally, unknown: Tally, sceneCount: number }}
 */
export function tallyBlocks(blocks) {
	const tally = emptyTally();
	/** @type {Tally} */
	const unknown = {};
	/** @param {string} key @param {string} location */
	const noteUnknown = (key, location) => {
		unknown[key] ??= { count: 0, examples: [] };
		unknown[key].count += 1;
		if (unknown[key].examples.length < 3) unknown[key].examples.push(location);
	};

	for (const block of blocks) {
		const location = `${block.file}:${block.id}`;

		if (block.type === 'quality') {
			const type = block.props.type ?? 'integer';
			const key = `quality: ${type}`;
			if (tally[key]) record(tally, key, location);
			else noteUnknown(`quality type ${type}`, location);
			continue;
		}

		for (const [key, value] of Object.entries(block.props)) {
			if (key === 'go-to') {
				const conditional = value.includes(';') || /\sif\s/.test(value);
				record(tally, conditional ? 'go-to (conditional)' : 'go-to (simple)', location);
			} else if (SCENE_PROPERTY_KEYS.has(key)) {
				record(tally, key, location);
			} else {
				noteUnknown(key, location);
			}
		}

		const { choices, prose } = splitChoices(block.content);
		for (const choice of choices) {
			record(tally, choice.kind === '#' ? 'choice: #tag' : 'choice: @scene', location);
			for (const key of Object.keys(choice.props)) {
				if (CHOICE_PROPERTY_KEYS.has(key)) record(tally, `choice: ${key}`, location);
				else noteUnknown(`choice-level ${key}`, location);
			}
		}

		for (const [key, pattern] of Object.entries(MARKUP_PATTERNS)) {
			const hits = prose.match(pattern)?.length ?? 0;
			for (let i = 0; i < hits; i++) record(tally, key, location);
		}
	}

	return { tally, unknown, sceneCount: blocks.filter((b) => b.type === 'scene').length };
}

/**
 * Audit one story directory (a subgame)
 * @param {string} storyDir
 * @returns {SubgameAudit}
 */
export function auditStory(storyDir) {
	const files = findDryFiles(storyDir);
	const blocks = files.flatMap((f) => parseDryText(readFileSync(f, 'utf-8'), relative(storyDir, f)));
	return { name: basename(storyDir), ...tallyBlocks(blocks) };
}

/**
 * Audit every subgame under story/ (or story/ itself when it has no subgames)
 * @param {string} storyRoot
 * @returns {SubgameAudit[]}
 */
export function auditAll(storyRoot = 'story') {
	const subdirs = readdirSync(storyRoot)
		.filter((entry) => statSync(join(storyRoot, entry)).isDirectory())
		.filter((entry) => existsSync(join(storyRoot, entry, 'game.dry')))
		.sort();
	const targets = subdirs.length === 0 ? [storyRoot] : subdirs.map((d) => join(storyRoot, d));
	return targets.map(auditStory);
}

/** @param {string[]} examples */
function formatExamples(examples) {
	return examples.length === 0 ? '' : examples.map((e) => `\`${e}\``).join(', ');
}

/**
 * Render the audit as the markdown block that sits between the generated markers
 * @param {SubgameAudit[]} subgames
 * @returns {string}
 */
export function renderMarkdown(subgames) {
	/** @type {string[]} */
	const lines = [];
	/** @param {{ key: string, compiler: boolean }} feature */
	const used = (feature) => subgames.some((s) => s.tally[feature.key].count > 0);
	const allFeatures = FEATURE_GROUPS.flatMap((g) => g.features);
	const exercised = allFeatures.filter(used);
	const unused = allFeatures.filter((f) => !used(f));
	const unusedParsed = unused.filter((f) => f.compiler);
	const unusedUnparsed = unused.filter((f) => !f.compiler);

	lines.push('## Coverage summary');
	lines.push('');
	lines.push(
		`${exercised.length} of ${allFeatures.length} catalogued features are exercised by current content. ` +
			`${unusedParsed.length} are parsed by the compiler but never used; ${unusedUnparsed.length} are neither parsed nor used.`
	);
	lines.push('');
	lines.push('| Subgame | Scenes |');
	lines.push('|---|---|');
	for (const s of subgames) lines.push(`| ${s.name} | ${s.sceneCount} |`);
	lines.push('');

	for (const group of FEATURE_GROUPS) {
		lines.push(`## ${group.name}`);
		lines.push('');
		lines.push(`| Feature | Compiler | ${subgames.map((s) => s.name).join(' | ')} | Examples |`);
		lines.push(`|---|---|${subgames.map(() => '---|').join('')}---|`);
		for (const feature of group.features) {
			const counts = subgames.map((s) => s.tally[feature.key].count);
			const examples = subgames.flatMap((s) => s.tally[feature.key].examples).slice(0, 3);
			lines.push(
				`| \`${feature.key}\` | ${feature.compiler ? 'parsed' : 'ignored'} | ${counts.join(' | ')} | ${formatExamples(examples)} |`
			);
		}
		lines.push('');
	}

	lines.push('## Properties outside the catalogue');
	lines.push('');
	const unknownRows = subgames.flatMap((s) =>
		Object.entries(s.unknown).map(([key, u]) => `| \`${key}\` | ${s.name} | ${u.count} | ${formatExamples(u.examples)} |`)
	);
	if (unknownRows.length === 0) {
		lines.push('None: every property in the content appears in `docs/dendrynexus-reference.md`.');
	} else {
		lines.push('| Property | Subgame | Count | Examples |');
		lines.push('|---|---|---|---|');
		lines.push(...unknownRows);
	}
	lines.push('');
	return lines.join('\n');
}

/**
 * Replace the generated block inside an existing report, keeping the hand-written parts
 * @param {string} existing
 * @param {string} generated
 * @returns {string}
 */
export function spliceReport(existing, generated) {
	const start = existing.indexOf(GENERATED_START);
	const end = existing.indexOf(GENERATED_END);
	if (start === -1 || end === -1 || end < start) {
		throw new Error(`${REPORT_PATH} must contain ${GENERATED_START} and ${GENERATED_END} markers in that order`);
	}
	return existing.slice(0, start + GENERATED_START.length) + '\n\n' + generated + '\n' + existing.slice(end);
}

function main() {
	const generated = renderMarkdown(auditAll());
	if (process.argv.includes('--write')) {
		const existing = readFileSync(REPORT_PATH, 'utf-8');
		writeFileSync(REPORT_PATH, spliceReport(existing, generated));
		console.log(`Wrote generated section to ${REPORT_PATH}`);
	} else {
		process.stdout.write(generated);
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main();
}
