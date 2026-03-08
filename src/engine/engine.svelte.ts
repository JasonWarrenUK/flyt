/**
 * Svelte 5 reactive wrapper around the DendryNexus compiled game data.
 *
 * This is a lightweight engine that reads the compiled game.json and
 * manages game state with Svelte 5 runes for reactivity.
 *
 * When the full DendryNexus engine is integrated, this wrapper will
 * delegate to it. For now it handles the core scene/choice/quality loop.
 */

import type {
	CompiledGame,
	GameState,
	DisplayContent,
	DisplayChoice,
	GameScene
} from './types.js';

export class FlytEngine {
	game: CompiledGame | null = $state(null);
	state: GameState = $state({
		currentSceneId: '',
		qualities: {},
		visits: {},
		history: []
	});
	loading = $state(true);
	error: string | null = $state(null);

	currentScene: GameScene | null = $derived.by(() => {
		if (!this.game || !this.state.currentSceneId) return null;
		return this.game.scenes[this.state.currentSceneId] ?? null;
	});

	display: DisplayContent | null = $derived.by(() => {
		const scene = this.currentScene;
		if (!scene) return null;

		const choices: DisplayChoice[] = (scene.options ?? []).map((opt) => ({
			id: opt.id,
			text: opt.title ?? opt.id,
			enabled: this.evaluateCondition(opt.chooseIf),
			visible: this.evaluateCondition(opt.viewIf)
		}));

		return {
			title: scene.title ?? scene.id,
			subtitle: scene.subtitle,
			body: this.renderContent(scene.content ?? ''),
			choices: choices.filter((c) => c.visible)
		};
	});

	qualityList = $derived.by(() => {
		if (!this.game) return [];
		return Object.entries(this.game.qualities).map(([id, def]) => ({
			id,
			name: def.name,
			value: this.state.qualities[id] ?? def.initial ?? 0,
			definition: def
		}));
	});

	async load(url: string): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Failed to load game data: ${response.statusText}`);
			this.game = (await response.json()) as CompiledGame;
			this.initState();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Unknown error loading game';
		} finally {
			this.loading = false;
		}
	}

	private initState(): void {
		if (!this.game) return;

		const qualities: Record<string, number> = {};
		for (const [id, def] of Object.entries(this.game.qualities)) {
			qualities[id] = def.initial ?? 0;
		}

		this.state = {
			currentSceneId: this.game.firstScene,
			qualities,
			visits: { [this.game.firstScene]: 1 },
			history: [this.game.firstScene]
		};

		this.executeArrival();
	}

	choose(sceneId: string): void {
		if (!this.game) return;

		const target = this.game.scenes[sceneId];
		if (!target) return;

		this.executeDeparture();

		this.state.currentSceneId = sceneId;
		this.state.visits[sceneId] = (this.state.visits[sceneId] ?? 0) + 1;
		this.state.history = [...this.state.history, sceneId];

		this.executeArrival();
	}

	private executeArrival(): void {
		const scene = this.currentScene;
		if (!scene?.onArrival) return;
		for (const cmd of scene.onArrival) {
			this.executeCommand(cmd);
		}
	}

	private executeDeparture(): void {
		const scene = this.currentScene;
		if (!scene?.onDeparture) return;
		for (const cmd of scene.onDeparture) {
			this.executeCommand(cmd);
		}
	}

	/**
	 * Execute a Dendry command string (e.g. "wit = wit + 1").
	 * Currently supports simple quality assignments.
	 */
	private executeCommand(cmd: string): void {
		const match = cmd.trim().match(/^(\w+)\s*=\s*(.+)$/);
		if (match) {
			const [, quality, expr] = match;
			try {
				const value = this.evaluateExpression(expr);
				if (typeof value === 'number') {
					this.state.qualities[quality] = value;
				}
			} catch {
				// Skip commands we can't parse yet
			}
		}
	}

	/**
	 * Evaluate a simple numeric expression referencing qualities.
	 */
	private evaluateExpression(expr: string): number {
		let resolved = expr.trim();
		// Replace quality references with their values
		resolved = resolved.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
			if (match in (this.state.qualities ?? {})) {
				return String(this.state.qualities[match]);
			}
			return match;
		});
		// Safely evaluate simple arithmetic
		if (/^[\d\s+\-*/().]+$/.test(resolved)) {
			return Function(`"use strict"; return (${resolved});`)() as number;
		}
		return 0;
	}

	/**
	 * Evaluate a Dendry condition. Returns true if undefined (no condition).
	 */
	private evaluateCondition(condition?: string): boolean {
		if (!condition) return true;
		try {
			const value = this.evaluateExpression(condition);
			return Boolean(value);
		} catch {
			return true;
		}
	}

	/**
	 * Render Dendry content markup to HTML.
	 * Handles: *emphasis*, **strong**, [+ quality +] interpolation.
	 */
	private renderContent(content: string): string {
		let html = content;
		// Quality interpolation: [+ qualityName +]
		html = html.replace(/\[\+\s*(\w+)\s*\+\]/g, (_, name) => {
			return String(this.state.qualities[name] ?? 0);
		});
		// Bold: **text**
		html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		// Italic: *text*
		html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
		// Paragraphs: double newlines
		html = html
			.split(/\n\n+/)
			.map((p) => `<p>${p.trim()}</p>`)
			.join('');
		return html;
	}

	restart(): void {
		this.initState();
	}
}
