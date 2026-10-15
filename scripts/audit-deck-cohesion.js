/**
 * Checks how the Great Hall's decks hang together mechanically.
 *
 * Groups every scene by the .dry file that declares it (one file per deck,
 * plus the hub and the intro), then reports per group which qualities it
 * writes and which it gates on, which scene links cross a file boundary,
 * which groups affect which others through shared qualities, and which
 * scenes the first scene cannot reach. Identifiers used in expressions that
 * no quality declares are listed separately.
 *
 * Usage:
 *   node scripts/audit-deck-cohesion.js [story/great-hall]   # print the report
 *   node scripts/audit-deck-cohesion.js --write               # splice it into docs/reports/DECK_COHESION.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { parseDryText, splitChoices, spliceReport } from './audit-dendry-features.js';

const REPORT_PATH = 'docs/reports/DECK_COHESION.md';
const DEFAULT_STORY = 'story/great-hall';
const EXPRESSION_KEYWORDS = new Set(['if', 'and', 'or', 'not', 'true', 'false']);

/**
 * @typedef {import('./audit-dendry-features.js').Block} Block
 * @typedef {{ from: string, to: string, kind: string, scene: string }} Link
 * @typedef {{
 *   name: string,
 *   scenes: string[],
 *   writes: Record<string, number>,
 *   gates: Record<string, number>,
 *   reads: Record<string, number>
 * }} Group
 * @typedef {{
 *   firstScene: string,
 *   groups: Group[],
 *   links: Link[],
 *   crossLinks: Link[],
 *   effects: { from: string, to: string, qualities: string[] }[],
 *   unreachable: { scene: string, group: string }[],
 *   danglingTargets: Link[],
 *   undeclared: Record<string, string[]>,
 *   deadEnds: { scene: string, group: string }[]
 * }} CohesionAudit
 */

/** @param {string} dir @returns {string[]} */
function findDryFiles(dir) {
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir).sort()) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) files.push(...findDryFiles(path));
		else if (entry.endsWith('.dry')) files.push(path);
	}
	return files;
}

/** A file's group name: `scenes/skalds.scene.dry` becomes `skalds` */
/** @param {string} file */
export function groupName(file) {
	return file.replace(/^.*\//, '').replace(/\.scene\.dry$|\.dry$/, '');
}

/**
 * Identifiers an expression or command reads. Assignment targets are excluded;
 * `assignmentTargets` reports those.
 * @param {string} text
 * @returns {string[]}
 */
export function identifiersRead(text) {
	const rhs = text.includes('=') && !/[<>!=]=|<|>/.test(text.split('=')[0]) ? text.slice(text.indexOf('=') + 1) : text;
	return [...new Set((rhs.match(/\b[a-z_][a-z0-9_]*\b/g) ?? []).filter((id) => !EXPRESSION_KEYWORDS.has(id)))];
}

/**
 * The quality each semicolon-separated command assigns to.
 * @param {string[] | undefined} commands
 * @returns {string[]}
 */
export function assignmentTargets(commands) {
	return (commands ?? []).map((c) => c.match(/^\s*([a-z_][a-z0-9_]*)\s*=/)?.[1]).filter((id) => id !== undefined);
}

/** @param {string | undefined} value */
function splitCommands(value) {
	return value ? value.split(';').map((s) => s.trim()).filter(Boolean) : [];
}

/**
 * Every scene a scene can lead to, with the property that creates the link.
 * @param {Block} block
 * @returns {{ to: string, kind: string }[]}
 */
export function outgoingLinks(block) {
	/** @type {{ to: string, kind: string }[]} */
	const out = [];
	const p = block.props;
	for (const choice of splitChoices(block.content).choices) {
		if (choice.kind === '@') out.push({ to: choice.id, kind: 'choice' });
		else out.push({ to: '#' + choice.id, kind: 'tag' });
	}
	for (const part of splitCommands(p['go-to'])) out.push({ to: part.split(/\s+if\s+/)[0], kind: 'go-to' });
	if (p['check-success-go-to']) out.push({ to: p['check-success-go-to'], kind: 'check' });
	if (p['check-failure-go-to']) out.push({ to: p['check-failure-go-to'], kind: 'check' });
	if (p['call']) out.push({ to: p['call'], kind: 'call' });
	return out;
}

/**
 * @param {Record<string, number>} counts
 * @param {string} key
 */
function bump(counts, key) {
	counts[key] = (counts[key] ?? 0) + 1;
}

/**
 * Run the cohesion audit over parsed blocks.
 * @param {Block[]} blocks
 * @param {string} firstScene
 * @returns {CohesionAudit}
 */
export function auditBlocks(blocks, firstScene) {
	const scenes = blocks.filter((b) => b.type === 'scene');
	const declared = new Set(blocks.filter((b) => b.type === 'quality').map((b) => b.id));
	/** @type {Map<string, string>} */
	const groupOf = new Map(scenes.map((s) => [s.id, groupName(s.file)]));
	/** @type {Map<string, string[]>} */
	const tagLookup = new Map();
	for (const s of scenes) {
		for (const tag of (s.props.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)) {
			tagLookup.set(tag, [...(tagLookup.get(tag) ?? []), s.id]);
		}
	}

	/** @type {Map<string, Group>} */
	const groups = new Map();
	/** @param {string} name */
	const group = (name) => {
		if (!groups.has(name)) groups.set(name, { name, scenes: [], writes: {}, gates: {}, reads: {} });
		return /** @type {Group} */ (groups.get(name));
	};
	/** @type {Record<string, string[]>} */
	const undeclared = {};
	/** @type {Link[]} */
	const links = [];
	/** @type {{ scene: string, group: string }[]} */
	const deadEnds = [];

	for (const s of scenes) {
		const g = group(groupOf.get(s.id) ?? '');
		g.scenes.push(s.id);
		const p = s.props;
		/** @param {string} id @param {'writes' | 'gates' | 'reads'} role */
		const note = (id, role) => {
			bump(g[role], id);
			if (!declared.has(id)) {
				undeclared[id] ??= [];
				if (!undeclared[id].includes(s.id)) undeclared[id].push(s.id);
			}
		};
		for (const key of ['on-arrival', 'on-departure', 'on-display']) {
			const commands = splitCommands(p[key]);
			for (const target of assignmentTargets(commands)) note(target, 'writes');
			for (const command of commands) for (const id of identifiersRead(command)) note(id, 'reads');
		}
		for (const key of ['view-if', 'choose-if']) {
			if (p[key]) for (const id of identifiersRead(p[key])) note(id, 'gates');
		}
		if (p['check-quality']) note(p['check-quality'], 'gates');
		for (const part of splitCommands(p['go-to'])) {
			const predicate = part.split(/\s+if\s+/)[1];
			if (predicate) for (const id of identifiersRead(predicate)) note(id, 'gates');
		}
		const prose = splitChoices(s.content).prose;
		for (const m of prose.matchAll(/\[\+\s*([a-z_][a-z0-9_]*)\s*\+\]/g)) note(m[1], 'reads');
		for (const m of prose.matchAll(/\[\?\s*if\b([\s\S]*?):/g)) for (const id of identifiersRead(m[1])) note(id, 'gates');

		const out = outgoingLinks(s);
		if (out.length === 0) deadEnds.push({ scene: s.id, group: g.name });
		for (const { to, kind } of out) {
			const targets = to.startsWith('#') ? (tagLookup.get(to.slice(1)) ?? [to]) : [to];
			for (const target of targets) links.push({ from: g.name, to: groupOf.get(target) ?? `?${target}`, kind, scene: s.id });
		}
	}

	const danglingTargets = links.filter((l) => l.to.startsWith('?'));
	const crossLinks = links.filter((l) => !l.to.startsWith('?') && l.from !== l.to);

	/** @type {{ from: string, to: string, qualities: string[] }[]} */
	const effects = [];
	for (const writer of groups.values()) {
		for (const gater of groups.values()) {
			if (writer === gater) continue;
			const shared = Object.keys(writer.writes).filter((q) => gater.gates[q]).sort();
			if (shared.length) effects.push({ from: writer.name, to: gater.name, qualities: shared });
		}
	}

	/** @type {Map<string, string[]>} */
	const adjacency = new Map();
	for (const s of scenes) {
		adjacency.set(
			s.id,
			outgoingLinks(s).flatMap(({ to }) => (to.startsWith('#') ? (tagLookup.get(to.slice(1)) ?? []) : [to]))
		);
	}
	const seen = new Set([firstScene]);
	const queue = [firstScene];
	while (queue.length) {
		const id = /** @type {string} */ (queue.shift());
		for (const next of adjacency.get(id) ?? []) {
			if (!seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	const unreachable = scenes.filter((s) => !seen.has(s.id)).map((s) => ({ scene: s.id, group: groupOf.get(s.id) ?? '' }));

	return {
		firstScene,
		groups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
		links,
		crossLinks,
		effects,
		unreachable,
		danglingTargets,
		undeclared,
		deadEnds
	};
}

/**
 * Audit one story directory.
 * @param {string} storyDir
 * @returns {CohesionAudit}
 */
export function auditStory(storyDir) {
	const blocks = findDryFiles(storyDir).flatMap((f) => parseDryText(readFileSync(f, 'utf-8'), relative(storyDir, f)));
	const firstScene = readFileSync(join(storyDir, 'game.dry'), 'utf-8').match(/^first-scene\s*:\s*(\S+)/m)?.[1] ?? 'intro';
	return auditBlocks(blocks, firstScene);
}

/** @param {Record<string, number>} counts */
function listCounts(counts) {
	const keys = Object.keys(counts).sort();
	return keys.length ? keys.map((k) => `\`${k}\` ×${counts[k]}`).join(', ') : '';
}

/**
 * Render the audit as the markdown block that sits between the generated markers
 * @param {CohesionAudit} audit
 * @returns {string}
 */
export function renderMarkdown(audit) {
	const lines = [];
	lines.push('## Groups');
	lines.push('');
	lines.push('One group per `.dry` file. Writes: qualities assigned in `on-arrival`, `on-departure` or `on-display`. Gates: qualities read by `view-if`, `choose-if`, `check-quality`, a `go-to` predicate or conditional text. Reads: qualities interpolated or used on the right-hand side of a command.');
	lines.push('');
	lines.push('| Group | Scenes | Writes | Gates | Reads |');
	lines.push('|---|---|---|---|---|');
	for (const g of audit.groups) {
		lines.push(`| ${g.name} | ${g.scenes.length} | ${listCounts(g.writes)} | ${listCounts(g.gates)} | ${listCounts(g.reads)} |`);
	}
	lines.push('');

	lines.push('## Scene links that cross a group boundary');
	lines.push('');
	/** @type {Record<string, { count: number, kinds: Set<string>, scenes: Set<string> }>} */
	const edges = {};
	for (const l of audit.crossLinks) {
		const key = `${l.from} → ${l.to}`;
		edges[key] ??= { count: 0, kinds: new Set(), scenes: new Set() };
		edges[key].count += 1;
		edges[key].kinds.add(l.kind);
		edges[key].scenes.add(l.scene);
	}
	if (Object.keys(edges).length === 0) lines.push('None.');
	else {
		lines.push('| From → to | Links | Via | Source scenes |');
		lines.push('|---|---|---|---|');
		for (const key of Object.keys(edges).sort()) {
			const e = edges[key];
			const scenes = [...e.scenes].slice(0, 3).map((s) => `\`${s}\``).join(', ') + (e.scenes.size > 3 ? ` and ${e.scenes.size - 3} more` : '');
			lines.push(`| ${key} | ${e.count} | ${[...e.kinds].sort().join(', ')} | ${scenes} |`);
		}
	}
	lines.push('');

	lines.push('## Groups that affect each other through qualities');
	lines.push('');
	lines.push('A row means the first group writes a quality the second group gates on.');
	lines.push('');
	if (audit.effects.length === 0) lines.push('None.');
	else {
		lines.push('| Writer → gater | Qualities |');
		lines.push('|---|---|');
		for (const e of audit.effects) lines.push(`| ${e.from} → ${e.to} | ${e.qualities.map((q) => `\`${q}\``).join(', ')} |`);
	}
	lines.push('');

	lines.push(`## Reachability from \`${audit.firstScene}\``);
	lines.push('');
	const total = audit.groups.reduce((n, g) => n + g.scenes.length, 0);
	lines.push(`${total - audit.unreachable.length} of ${total} scenes are reachable by following choices, go-to, check targets, call and tag expansion.`);
	lines.push('');
	if (audit.unreachable.length) {
		lines.push('| Unreachable scene | Group |');
		lines.push('|---|---|');
		for (const u of audit.unreachable) lines.push(`| \`${u.scene}\` | ${u.group} |`);
		lines.push('');
	}

	lines.push('## Scenes with no outgoing link');
	lines.push('');
	lines.push('These rely on `set-root` to offer a way back.');
	lines.push('');
	if (audit.deadEnds.length === 0) lines.push('None.');
	else {
		lines.push('| Scene | Group |');
		lines.push('|---|---|');
		for (const d of audit.deadEnds) lines.push(`| \`${d.scene}\` | ${d.group} |`);
	}
	lines.push('');

	lines.push('## Link targets that no scene declares');
	lines.push('');
	if (audit.danglingTargets.length === 0) lines.push('None.');
	else {
		lines.push('| Source scene | Target | Via |');
		lines.push('|---|---|---|');
		for (const d of audit.danglingTargets) lines.push(`| \`${d.scene}\` | \`${d.to.slice(1)}\` | ${d.kind} |`);
	}
	lines.push('');

	lines.push('## Identifiers no quality declares');
	lines.push('');
	const ids = Object.keys(audit.undeclared).sort();
	if (ids.length === 0) lines.push('None.');
	else {
		lines.push('| Identifier | Scenes |');
		lines.push('|---|---|');
		for (const id of ids) lines.push(`| \`${id}\` | ${audit.undeclared[id].map((s) => `\`${s}\``).join(', ')} |`);
	}
	lines.push('');
	return lines.join('\n');
}

function main() {
	const args = process.argv.slice(2);
	const write = args.includes('--write');
	const storyDir = args.find((a) => !a.startsWith('--')) ?? DEFAULT_STORY;
	const generated = renderMarkdown(auditStory(storyDir));
	if (write) {
		writeFileSync(REPORT_PATH, spliceReport(readFileSync(REPORT_PATH, 'utf-8'), generated));
		console.log(`Wrote generated section to ${REPORT_PATH}`);
	} else {
		process.stdout.write(generated);
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main();
}
