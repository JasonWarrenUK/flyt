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
	GameScene,
	HandCard
} from './types.js';

import { HAND_CAPACITY } from './types.js';

export interface CheckResult {
	quality: string;
	qualityValue: number;
	difficulty: number;
	type: 'broad' | 'narrow';
	roll: number;
	threshold: number;
	success: boolean;
}

export class FlytEngine {
	game: CompiledGame | null = $state(null);
	state: GameState = $state({
		currentSceneId: '',
		qualities: {},
		visits: {},
		history: [],
		hand: [],
		discard: []
	});
	loading = $state(true);
	error: string | null = $state(null);
	lastCheck: CheckResult | null = $state(null);

	currentScene: GameScene | null = $derived.by(() => {
		if (!this.game || !this.state.currentSceneId) return null;
		return this.game.scenes[this.state.currentSceneId] ?? null;
	});

	display: DisplayContent | null = $derived.by(() => {
		const scene = this.currentScene;
		if (!scene) return null;

		if (scene.isHand) {
			return this.buildHandDisplay(scene);
		}

		const choices: DisplayChoice[] = (scene.options ?? []).map((opt) => {
			const targetScene = this.game?.scenes[opt.id];
			return {
				id: opt.id,
				text: opt.title ?? opt.id,
				enabled: this.evaluateCondition(opt.chooseIf) && this.evaluateCondition(targetScene?.chooseIf),
				visible: this.evaluateCondition(opt.viewIf) && this.evaluateCondition(targetScene?.viewIf),
				isCard: targetScene?.isCard ?? false,
				isDeck: targetScene?.isDeck ?? false,
				checkQuality: targetScene?.checkQuality,
				broadDifficulty: targetScene?.broadDifficulty,
				narrowDifficulty: targetScene?.narrowDifficulty
			};
		});

		return {
			title: scene.title ?? scene.id,
			subtitle: scene.subtitle,
			body: this.renderContent(scene.content ?? ''),
			choices: choices.filter((c) => c.visible),
			isHand: scene.isHand,
			isDeck: scene.isDeck,
			isCard: scene.isCard
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
			history: [this.game.firstScene],
			hand: [],
			discard: []
		};
		this.lastCheck = null;

		this.executeArrival();
	}

	choose(sceneId: string): void {
		if (!this.game) return;

		const target = this.game.scenes[sceneId];
		if (!target) return;

		this.lastCheck = null;
		this.executeDeparture();

		// If the target is a card with a stat check, resolve the check
		if (target.isCard && target.checkQuality && (target.broadDifficulty != null || target.narrowDifficulty != null)) {
			// Navigate to the card scene first (executes on-arrival for costs etc.)
			this.state.currentSceneId = sceneId;
			this.state.visits[sceneId] = (this.state.visits[sceneId] ?? 0) + 1;
			this.state.history = [...this.state.history, sceneId];
			this.executeArrival();

			// Perform the check
			const checkResult = this.performCheck(target);
			this.lastCheck = checkResult;

			// Route to success or failure scene
			const resultSceneId = checkResult.success
				? target.checkSuccessGoTo
				: target.checkFailureGoTo;

			if (resultSceneId && this.game.scenes[resultSceneId]) {
				this.state.currentSceneId = resultSceneId;
				this.state.visits[resultSceneId] = (this.state.visits[resultSceneId] ?? 0) + 1;
				this.state.history = [...this.state.history, resultSceneId];
				this.executeArrivalFor(resultSceneId);
			}
			return;
		}

		this.state.currentSceneId = sceneId;
		this.state.visits[sceneId] = (this.state.visits[sceneId] ?? 0) + 1;
		this.state.history = [...this.state.history, sceneId];

		this.executeArrival();

		// Handle go-to chains
		const scene = this.game.scenes[sceneId];
		if (scene?.goTo && this.game.scenes[scene.goTo]) {
			this.choose(scene.goTo);
		}
	}

	/**
	 * Perform a broad or narrow difficulty check.
	 *
	 * Broad check: success chance = stat / (stat + difficulty) * 100
	 * Narrow check: success chance = 50 + (stat - difficulty) * 5, clamped to [10, 90]
	 */
	private performCheck(scene: GameScene): CheckResult {
		const qualityId = scene.checkQuality!;
		const qualityValue = this.state.qualities[qualityId] ?? 0;
		const isNarrow = scene.narrowDifficulty != null;
		const difficulty = isNarrow ? scene.narrowDifficulty! : scene.broadDifficulty!;

		let threshold: number;
		if (isNarrow) {
			// Narrow: linear, clamped [10, 90]
			threshold = Math.max(10, Math.min(90, 50 + (qualityValue - difficulty) * 10));
		} else {
			// Broad: ratio-based
			threshold = Math.round((qualityValue / (qualityValue + difficulty)) * 100);
			threshold = Math.max(5, Math.min(95, threshold));
		}

		const roll = Math.floor(Math.random() * 100) + 1;
		const success = roll <= threshold;

		return {
			quality: qualityId,
			qualityValue,
			difficulty,
			type: isNarrow ? 'narrow' : 'broad',
			roll,
			threshold,
			success
		};
	}

	private executeArrival(): void {
		const scene = this.currentScene;
		if (!scene) return;

		// Reset discard pile when returning to hand so cards can be drawn again
		if (scene.isHand) {
			this.state.discard = [];
		}

		if (!scene.onArrival) return;
		for (const cmd of scene.onArrival) {
			this.executeCommand(cmd);
		}
		this.clampQualities();
	}

	private executeArrivalFor(sceneId: string): void {
		const scene = this.game?.scenes[sceneId];
		if (!scene?.onArrival) return;
		for (const cmd of scene.onArrival) {
			this.executeCommand(cmd);
		}
		this.clampQualities();
	}

	private executeDeparture(): void {
		const scene = this.currentScene;
		if (!scene?.onDeparture) return;
		for (const cmd of scene.onDeparture) {
			this.executeCommand(cmd);
		}
		this.clampQualities();
	}

	/**
	 * Clamp all qualities to their min/max bounds.
	 */
	private clampQualities(): void {
		if (!this.game) return;
		for (const [id, def] of Object.entries(this.game.qualities)) {
			const val = this.state.qualities[id];
			if (val == null) continue;
			if (def.min != null && val < def.min) this.state.qualities[id] = def.min;
			if (def.max != null && val > def.max) this.state.qualities[id] = def.max;
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
	 * Evaluate a Dendry condition (comparison operators and arithmetic).
	 * Returns true if undefined (no condition).
	 */
	evaluateCondition(condition?: string): boolean {
		if (!condition) return true;
		try {
			let resolved = condition.trim();
			// Replace quality references with their values
			resolved = resolved.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
				if (match in (this.state.qualities ?? {})) {
					return String(this.state.qualities[match]);
				}
				return match;
			});
			// Support comparison operators
			if (/^[\d\s+\-*/().>=<!&|]+$/.test(resolved)) {
				return Boolean(Function(`"use strict"; return (${resolved});`)());
			}
			return true;
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

	/** Build display content for a hand scene, merging deck choices and hand cards. */
	private buildHandDisplay(scene: GameScene): DisplayContent {
		const deckChoices: DisplayChoice[] = [];
		const otherChoices: DisplayChoice[] = [];

		for (const opt of scene.options ?? []) {
			const target = this.game?.scenes[opt.id];
			if (!target) continue;

			const visible =
				this.evaluateCondition(opt.viewIf) && this.evaluateCondition(target.viewIf);
			if (!visible) continue;

			if (target.isDeck) {
				const eligible = this.getEligibleCards(opt.id);
				deckChoices.push({
					id: opt.id,
					text: opt.title ?? opt.id,
					enabled: this.state.hand.length < HAND_CAPACITY && eligible.length > 0,
					visible: true,
					isDeck: true,
					isCard: false,
					isHandCard: false
				});
			} else {
				otherChoices.push({
					id: opt.id,
					text: opt.title ?? opt.id,
					enabled:
						this.evaluateCondition(opt.chooseIf) &&
						this.evaluateCondition(target.chooseIf),
					visible: true,
					isDeck: false,
					isCard: false,
					isHandCard: false
				});
			}
		}

		const handChoices: DisplayChoice[] = [];
		for (const handCard of this.state.hand) {
			const cardScene = this.game?.scenes[handCard.id];
			if (!cardScene) continue;
			handChoices.push({
				id: handCard.id,
				text: cardScene.title ?? handCard.id,
				enabled: this.evaluateCondition(cardScene.chooseIf),
				visible: true,
				isCard: true,
				isDeck: false,
				isHandCard: true,
				fromDeck: handCard.fromDeck,
				checkQuality: cardScene.checkQuality,
				broadDifficulty: cardScene.broadDifficulty,
				narrowDifficulty: cardScene.narrowDifficulty
			});
		}

		return {
			title: scene.title ?? scene.id,
			subtitle: scene.subtitle,
			body: this.renderContent(scene.content ?? ''),
			choices: [...handChoices, ...deckChoices, ...otherChoices],
			isHand: true,
			handCount: this.state.hand.length,
			handFull: this.state.hand.length >= HAND_CAPACITY
		};
	}

	/** Get cards eligible to be drawn from a deck (not in hand or discard, passing conditions). */
	private getEligibleCards(deckId: string): GameScene[] {
		if (!this.game) return [];
		const deck = this.game.scenes[deckId];
		if (!deck?.isDeck || !deck.options) return [];

		const handIds = new Set(this.state.hand.map((c) => c.id));
		const discardIds = new Set(this.state.discard);

		return deck.options
			.map((opt) => this.game!.scenes[opt.id])
			.filter(
				(scene): scene is GameScene =>
					scene != null &&
					scene.isCard === true &&
					!handIds.has(scene.id) &&
					!discardIds.has(scene.id) &&
					this.evaluateCondition(scene.viewIf) &&
					this.evaluateCondition(scene.chooseIf)
			);
	}

	/** Draw a random card from a deck into the player's hand. */
	drawCard(deckId: string): void {
		if (!this.game) return;
		if (this.state.hand.length >= HAND_CAPACITY) return;

		const eligible = this.getEligibleCards(deckId);
		if (eligible.length === 0) return;

		const card = eligible[Math.floor(Math.random() * eligible.length)];
		this.state.hand = [...this.state.hand, { id: card.id, fromDeck: deckId }];
	}

	/** Play a card from the hand — removes it and navigates to the card scene. */
	playCard(cardId: string): void {
		const idx = this.state.hand.findIndex((c) => c.id === cardId);
		if (idx === -1) return;

		this.state.hand = this.state.hand.filter((_, i) => i !== idx);
		this.state.discard = [...this.state.discard, cardId];
		this.choose(cardId);
	}

	/** Discard a card from the hand without playing it. */
	discardCard(cardId: string): void {
		const idx = this.state.hand.findIndex((c) => c.id === cardId);
		if (idx === -1) return;

		this.state.hand = this.state.hand.filter((_, i) => i !== idx);
		this.state.discard = [...this.state.discard, cardId];
	}

	restart(): void {
		this.initState();
	}
}
