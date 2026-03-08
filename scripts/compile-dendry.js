/**
 * Compiles .dry story files into a game.json that the Svelte engine can consume.
 *
 * This is a lightweight compiler for development. When DendryNexus is installed,
 * this can be replaced with `dendrynexus compile` for full feature support.
 *
 * Usage: node scripts/compile-dendry.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const STORY_DIR = 'story';
const OUTPUT_FILE = 'static/game.json';

/** Recursively find all .dry files */
function findDryFiles(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			files.push(...findDryFiles(path));
		} else if (entry.endsWith('.dry')) {
			files.push(path);
		}
	}
	return files;
}

/** Parse a single .dry file into scene/quality blocks */
function parseDryFile(filePath) {
	const content = readFileSync(filePath, 'utf-8');
	const blocks = [];
	let current = null;

	for (const line of content.split('\n')) {
		const sceneLine = line.match(/^@(scene|quality)\s+(\S+)/);
		if (sceneLine) {
			if (current) blocks.push(current);
			current = { type: sceneLine[1], id: sceneLine[2], props: {}, content: [], file: relative(STORY_DIR, filePath) };
			continue;
		}

		// Bare @id line (scene defined with just @id)
		const bareScene = line.match(/^@(\w+)\s*$/);
		if (bareScene && !current) {
			if (current) blocks.push(current);
			current = { type: 'scene', id: bareScene[1], props: {}, content: [], file: relative(STORY_DIR, filePath) };
			continue;
		}

		if (!current) continue;

		// Property line (key: value) - only before content begins
		const propLine = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
		if (propLine && current.content.length === 0) {
			current.props[propLine[1]] = propLine[2].trim();
			continue;
		}

		// Content/choice lines
		current.content.push(line);
	}
	if (current) blocks.push(current);
	return blocks;
}

/** Parse choice lines from scene content */
function parseChoices(lines) {
	const choices = [];
	const contentLines = [];

	for (const line of lines) {
		const choiceMatch = line.match(/^-\s+@(\S+)\s*:\s*(.+)$/);
		if (choiceMatch) {
			choices.push({ id: choiceMatch[1], title: choiceMatch[2].trim() });
		} else {
			contentLines.push(line);
		}
	}

	return {
		content: contentLines.join('\n').trim(),
		choices
	};
}

/** Parse semicolon-separated commands */
function parseCommands(str) {
	if (!str) return undefined;
	return str.split(';').map((s) => s.trim()).filter(Boolean);
}

function compile() {
	console.log('Compiling Dendry story files...');

	const files = findDryFiles(STORY_DIR);
	console.log(`Found ${files.length} .dry file(s)`);

	const allBlocks = files.flatMap(parseDryFile);

	const game = {
		title: 'Flyt',
		author: '',
		firstScene: 'intro',
		scenes: {},
		qualities: {}
	};

	// First pass: game.dry metadata
	for (const block of allBlocks) {
		if (block.file === 'game.dry' && block.type !== 'scene' && block.type !== 'quality') {
			// game.dry props are at file level, not in blocks
		}
	}

	// Parse game.dry props directly
	try {
		const gameDry = readFileSync(join(STORY_DIR, 'game.dry'), 'utf-8');
		for (const line of gameDry.split('\n')) {
			const prop = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
			if (prop) {
				const [, key, value] = prop;
				if (key === 'title') game.title = value.trim();
				if (key === 'author') game.author = value.trim();
				if (key === 'first-scene') game.firstScene = value.trim();
			}
		}
	} catch {
		// No game.dry is fine
	}

	// Process scene and quality blocks
	for (const block of allBlocks) {
		if (block.type === 'quality') {
			game.qualities[block.id] = {
				id: block.id,
				name: block.props.name || block.id,
				type: block.props.type || 'integer',
				initial: block.props.initial ? Number(block.props.initial) : 0,
				min: block.props.min != null ? Number(block.props.min) : undefined,
				max: block.props.max != null ? Number(block.props.max) : undefined,
				category: block.props.category,
				words: block.props.words?.split(',').map((w) => w.trim())
			};
		} else if (block.type === 'scene') {
			const { content, choices } = parseChoices(block.content);
			game.scenes[block.id] = {
				id: block.id,
				title: block.props.title,
				subtitle: block.props.subtitle,
				content,
				options: choices.length > 0 ? choices : undefined,
				onArrival: parseCommands(block.props['on-arrival']),
				onDeparture: parseCommands(block.props['on-departure']),
				viewIf: block.props['view-if'],
				chooseIf: block.props['choose-if'],
				goTo: block.props['go-to'],
				maxVisits: block.props['max-visits'] ? Number(block.props['max-visits']) : undefined,
				tags: block.props.tags?.split(',').map((t) => t.trim()),
				// DendryNexus extensions
				isHand: block.props['is-hand'] === 'true' || undefined,
				isDeck: block.props['is-deck'] === 'true' || undefined,
				isCard: block.props['is-card'] === 'true' || undefined,
				isPinnedCard: block.props['is-pinned-card'] === 'true' || undefined,
				cardImage: block.props['card-image'],
				checkQuality: block.props['check-quality'],
				broadDifficulty: block.props['broad-difficulty'] ? Number(block.props['broad-difficulty']) : undefined,
				narrowDifficulty: block.props['narrow-difficulty'] ? Number(block.props['narrow-difficulty']) : undefined,
				checkSuccessGoTo: block.props['check-success-go-to'],
				checkFailureGoTo: block.props['check-failure-go-to']
			};
		}
	}

	const sceneCount = Object.keys(game.scenes).length;
	const qualityCount = Object.keys(game.qualities).length;

	// Ensure static/ exists
	mkdirSync('static', { recursive: true });
	writeFileSync(OUTPUT_FILE, JSON.stringify(game, null, 2));
	console.log(`Compiled ${sceneCount} scene(s), ${qualityCount} quality/ies → ${OUTPUT_FILE}`);
}

compile();
