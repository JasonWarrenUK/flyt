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

/** Parse choice lines from scene content, supporting choice-level properties and tag choices */
function parseChoices(lines) {
	const choices = [];
	const contentLines = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Tag-based choice: - #tag_name: Choice text
		const tagMatch = line.match(/^-\s+#(\S+)\s*:\s*(.+)$/);
		if (tagMatch) {
			const choice = { id: '#' + tagMatch[1], title: tagMatch[2].trim(), isTag: true };
			// Check for indented choice-level properties on following lines
			parseChoiceProperties(choice, lines, i);
			choices.push(choice);
			continue;
		}
		// Direct scene choice: - @scene_id: Choice text
		const choiceMatch = line.match(/^-\s+@(\S+)\s*:\s*(.+)$/);
		if (choiceMatch) {
			const choice = { id: choiceMatch[1], title: choiceMatch[2].trim() };
			// Check for indented choice-level properties on following lines
			parseChoiceProperties(choice, lines, i);
			choices.push(choice);
			continue;
		}
		// Indented property lines (belong to previous choice) - skip, already handled
		const indentedProp = line.match(/^\s+(\w[\w-]*)\s*:\s*(.+)$/);
		if (indentedProp && choices.length > 0) {
			continue;
		}
		contentLines.push(line);
	}

	return {
		content: contentLines.join('\n').trim(),
		choices
	};
}

/** Parse indented properties that follow a choice line */
function parseChoiceProperties(choice, lines, choiceIndex) {
	for (let j = choiceIndex + 1; j < lines.length; j++) {
		const propMatch = lines[j].match(/^\s+(\w[\w-]*)\s*:\s*(.+)$/);
		if (!propMatch) break;
		const [, key, value] = propMatch;
		if (key === 'view-if') choice.viewIf = value.trim();
		else if (key === 'choose-if') choice.chooseIf = value.trim();
		else if (key === 'order') choice.order = Number(value);
		else if (key === 'priority') choice.priority = Number(value);
		else if (key === 'frequency') choice.frequency = Number(value);
	}
}

/** Parse semicolon-separated commands */
function parseCommands(str) {
	if (!str) return undefined;
	return str.split(';').map((s) => s.trim()).filter(Boolean);
}

/** Parse a go-to value which may be simple or conditional */
function parseGoTo(str) {
	if (!str) return undefined;
	// Check for conditional go-to: "scene_a if condition; scene_b if condition"
	const parts = str.split(';').map(s => s.trim()).filter(Boolean);
	if (parts.length === 1 && !parts[0].includes(' if ')) {
		// Simple go-to
		return parts[0];
	}
	// Conditional go-to array
	return parts.map(part => {
		const ifMatch = part.match(/^(\S+)\s+if\s+(.+)$/);
		if (ifMatch) {
			return { id: ifMatch[1], predicate: ifMatch[2].trim() };
		}
		return { id: part };
	});
}

function parseBool(str) {
	return str === 'true' || undefined;
}

function parseNum(str) {
	if (str == null) return undefined;
	const n = Number(str);
	return isNaN(n) ? undefined : n;
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
		qualities: {},
		tagLookup: {}
	};

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
			const p = block.props;
			game.scenes[block.id] = {
				id: block.id,
				title: p.title,
				subtitle: p.subtitle,
				unavailableSubtitle: p['unavailable-subtitle'],
				content,
				options: choices.length > 0 ? choices : undefined,
				onArrival: parseCommands(p['on-arrival']),
				onDeparture: parseCommands(p['on-departure']),
				onDisplay: parseCommands(p['on-display']),
				viewIf: p['view-if'],
				chooseIf: p['choose-if'],
				maxVisits: parseNum(p['max-visits']),
				countVisitsMax: parseNum(p['count-visits-max']),
				// Navigation
				goTo: parseGoTo(p['go-to']),
				goToRef: p['go-to-ref'],
				setRoot: parseBool(p['set-root']),
				newPage: parseBool(p['new-page']),
				gameOver: parseBool(p['game-over']),
				call: p['call'],
				// Choice selection
				order: parseNum(p.order),
				priority: parseNum(p.priority),
				frequency: parseNum(p.frequency),
				minChoices: parseNum(p['min-choices']),
				maxChoices: parseNum(p['max-choices']),
				// Tags
				tags: p.tags?.split(',').map((t) => t.trim()),
				// DendryNexus card/deck extensions
				isHand: parseBool(p['is-hand']),
				isDeck: parseBool(p['is-deck']),
				isCard: parseBool(p['is-card']),
				isPinnedCard: parseBool(p['is-pinned-card']),
				cardImage: p['card-image'],
				maxCards: parseNum(p['max-cards']),
				// Difficulty checks
				checkQuality: p['check-quality'],
				broadDifficulty: parseNum(p['broad-difficulty']),
				narrowDifficulty: parseNum(p['narrow-difficulty']),
				difficultyScaler: parseNum(p['difficulty-scaler']),
				difficultyIncrement: parseNum(p['difficulty-increment']),
				checkSuccessGoTo: p['check-success-go-to'],
				checkFailureGoTo: p['check-failure-go-to']
			};
		}
	}

	// Build tag lookup: tag -> [scene_id, ...]
	for (const [id, scene] of Object.entries(game.scenes)) {
		if (scene.tags) {
			for (const tag of scene.tags) {
				if (!game.tagLookup[tag]) game.tagLookup[tag] = [];
				game.tagLookup[tag].push(id);
			}
		}
	}

	// Clean up undefined values to keep JSON tidy
	for (const scene of Object.values(game.scenes)) {
		for (const key of Object.keys(scene)) {
			if (scene[key] === undefined) delete scene[key];
		}
	}
	for (const quality of Object.values(game.qualities)) {
		for (const key of Object.keys(quality)) {
			if (quality[key] === undefined) delete quality[key];
		}
	}

	const sceneCount = Object.keys(game.scenes).length;
	const qualityCount = Object.keys(game.qualities).length;
	const tagCount = Object.keys(game.tagLookup).length;

	// Ensure static/ exists
	mkdirSync('static', { recursive: true });
	writeFileSync(OUTPUT_FILE, JSON.stringify(game, null, 2));
	console.log(`Compiled ${sceneCount} scene(s), ${qualityCount} quality/ies, ${tagCount} tag(s) → ${OUTPUT_FILE}`);
}

compile();
