/**
 * Svelte 5 reactive wrapper around the DendryNexus compiled game data.
 *
 * Implements the full DendryNexus feature set:
 * - Priority/frequency/order choice selection
 * - Card/deck/hand system with per-hand state
 * - Pinned cards
 * - Difficulty checks (broad + narrow) with configurable curves
 * - Tag-based choices (#tag)
 * - Conditional go-to, go-to-ref, set-root
 * - max-visits filtering, min/max-choices
 * - Conditional text rendering
 * - Difficulty labels on choices
 *
 * See docs/dendrynexus-reference.md for upstream behaviour.
 */

import type {
	CompiledGame,
	GameState,
	DisplayContent,
	DisplayChoice,
	GameScene,
	SceneOption,
	HandCard,
	ConditionalGoTo
} from './types.js';

export interface CheckResult {
	quality: string;
	qualityValue: number;
	difficulty: number;
	type: 'broad' | 'narrow';
	roll: number;
	threshold: number;
	success: boolean;
	difficultyLabel: string;
}

// ── Difficulty helpers (match upstream DendryNexus) ──────────────────

function calculateBroadDifficulty(quality: number, difficulty: number, scaler = 0.6): number {
	if (scaler > 1) scaler = scaler / 100;
	const p = scaler * (quality / difficulty);
	return Math.min(1, Math.max(0, p));
}

function calculateNarrowDifficulty(quality: number, difficulty: number, increment = 0.1): number {
	if (increment > 1) increment = increment / 100;
	const p = (quality - difficulty) * increment + 0.5;
	return Math.min(1, Math.max(increment, p));
}

function displayDifficulty(successProb: number): string {
	if (successProb <= 0.1) return 'almost impossible';
	if (successProb <= 0.3) return 'high-risk';
	if (successProb <= 0.4) return 'tough';
	if (successProb <= 0.5) return 'very chancy';
	if (successProb <= 0.6) return 'chancy';
	if (successProb <= 0.7) return 'modest';
	if (successProb <= 0.8) return 'very modest';
	if (successProb <= 0.9) return 'low risk';
	return 'straightforward';
}

// ── Engine ───────────────────────────────────────────────────────────

export class FlytEngine {
	game: CompiledGame | null = $state(null);
	state: GameState = $state({
		currentSceneId: '',
		qualities: {},
		visits: {},
		history: [],
		rootSceneId: '',
		hands: {},
		discards: {},
		lastDrawnCard: null,
		lastPlayedCard: null
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

		const options = this.resolveOptions(scene);
		const filtered = this.filterViewable(options);
		const selected = this.applyPrioritySelection(filtered, scene.minChoices, scene.maxChoices);
		const choices = this.buildChoiceDisplay(selected);

		return {
			title: scene.title ?? scene.id,
			subtitle: scene.subtitle,
			body: this.renderContent(scene.content ?? ''),
			choices,
			isHand: scene.isHand,
			isDeck: scene.isDeck,
			isCard: scene.isCard,
			newPage: scene.newPage
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
			rootSceneId: this.game.firstScene,
			hands: {},
			discards: {},
			lastDrawnCard: null,
			lastPlayedCard: null
		};
		this.lastCheck = null;

		const firstScene = this.game.scenes[this.game.firstScene];
		if (firstScene?.setRoot) {
			this.state.rootSceneId = this.game.firstScene;
		}
		this.executeArrival();
		this.resolveAutoNavigation();
	}

	// ── Scene navigation ─────────────────────────────────────────────

	choose(sceneId: string): void {
		if (!this.game) return;

		const target = this.game.scenes[sceneId];
		if (!target) return;

		this.lastCheck = null;
		this.executeDeparture();
		this.navigateTo(sceneId);
	}

	private navigateTo(sceneId: string): void {
		if (!this.game) return;
		const scene = this.game.scenes[sceneId];
		if (!scene) return;

		this.state.currentSceneId = sceneId;
		this.state.visits[sceneId] = (this.state.visits[sceneId] ?? 0) + 1;
		this.state.history = [...this.state.history, sceneId];

		if (scene.setRoot) {
			this.state.rootSceneId = sceneId;
		}

		// Execute on-arrival + call
		this.executeArrival();
		if (scene.call && this.game.scenes[scene.call]) {
			this.executeActionsFor(this.game.scenes[scene.call].onArrival);
		}

		this.resolveAutoNavigation();
	}

	/** Resolve automatic navigation: checks, go-to, go-to-ref */
	private resolveAutoNavigation(): void {
		if (!this.game) return;
		const scene = this.game.scenes[this.state.currentSceneId];
		if (!scene) return;

		// Difficulty check
		if (scene.checkQuality && (scene.broadDifficulty != null || scene.narrowDifficulty != null) &&
			scene.checkSuccessGoTo && scene.checkFailureGoTo) {
			const checkResult = this.performCheck(scene);
			this.lastCheck = checkResult;
			const resultId = checkResult.success ? scene.checkSuccessGoTo : scene.checkFailureGoTo;
			if (resultId && this.game.scenes[resultId]) {
				this.navigateTo(resultId);
			}
			return;
		}

		// Go-to
		if (scene.goTo) {
			const targetId = this.resolveGoTo(scene.goTo);
			if (targetId && this.game.scenes[targetId]) {
				this.navigateTo(targetId);
				return;
			}
		}

		// Go-to-ref: navigate to the scene whose ID is stored in a quality
		if (scene.goToRef) {
			const targetId = String(this.state.qualities[scene.goToRef] ?? '');
			if (targetId && this.game.scenes[targetId]) {
				this.navigateTo(targetId);
				return;
			}
		}

		// Game over
		if (scene.gameOver) {
			// Just stop — no auto-navigation
			return;
		}

		// If no choices exist, add default "Continue..." to root
		const options = this.resolveOptions(scene);
		const viewable = this.filterViewable(options);
		if (viewable.length === 0 && this.state.rootSceneId !== this.state.currentSceneId) {
			// Will be handled in display as a Continue button
		}
	}

	/** Resolve a go-to value: simple string or conditional array */
	private resolveGoTo(goTo: string | ConditionalGoTo[]): string | null {
		if (typeof goTo === 'string') return goTo;
		const valid = goTo.filter(g => !g.predicate || this.evaluateCondition(g.predicate));
		if (valid.length === 0) return null;
		if (valid.length === 1) return valid[0].id;
		return valid[Math.floor(Math.random() * valid.length)].id;
	}

	// ── Difficulty checks ────────────────────────────────────────────

	private performCheck(scene: GameScene): CheckResult {
		const qualityId = scene.checkQuality!;
		const qualityValue = this.state.qualities[qualityId] ?? 0;
		const isNarrow = scene.narrowDifficulty != null;
		const difficulty = isNarrow ? scene.narrowDifficulty! : scene.broadDifficulty!;

		let successProb: number;
		if (isNarrow) {
			successProb = calculateNarrowDifficulty(qualityValue, difficulty, scene.difficultyIncrement);
		} else {
			successProb = calculateBroadDifficulty(qualityValue, difficulty, scene.difficultyScaler);
		}

		const threshold = Math.round(successProb * 100);
		const roll = Math.floor(Math.random() * 100) + 1;
		const success = roll <= threshold;

		return {
			quality: qualityId,
			qualityValue,
			difficulty,
			type: isNarrow ? 'narrow' : 'broad',
			roll,
			threshold,
			success,
			difficultyLabel: displayDifficulty(successProb)
		};
	}

	// ── Choice resolution (priority/frequency system) ─────────────

	/** Expand options, resolving tag references */
	private resolveOptions(scene: GameScene): SceneOption[] {
		if (!scene.options || !this.game) return [];
		const result: SceneOption[] = [];

		for (const opt of scene.options) {
			// Check option-level viewIf
			if (opt.viewIf && !this.evaluateCondition(opt.viewIf)) continue;

			if (opt.isTag) {
				// Tag-based choice: expand to all scenes with this tag
				const tag = opt.id.substring(1); // remove '#'
				const sceneIds = this.game.tagLookup[tag] ?? [];
				for (const id of sceneIds) {
					result.push({
						id,
						title: opt.title,
						viewIf: opt.viewIf,
						chooseIf: opt.chooseIf,
						order: opt.order,
						priority: opt.priority,
						frequency: opt.frequency
					});
				}
			} else {
				result.push(opt);
			}
		}
		return result;
	}

	/** Filter options by viewability: viewIf + maxVisits */
	private filterViewable(options: SceneOption[]): SceneOption[] {
		if (!this.game) return [];
		return options.filter(opt => {
			const scene = this.game!.scenes[opt.id];
			if (!scene) return false;

			// max-visits check
			if (scene.maxVisits != null) {
				const visits = this.state.visits[opt.id] ?? 0;
				if (visits >= scene.maxVisits) return false;
			}

			// Scene-level viewIf
			if (scene.viewIf && !this.evaluateCondition(scene.viewIf)) return false;

			return true;
		});
	}

	/** Apply priority/frequency selection with min/max-choices limits */
	private applyPrioritySelection(
		options: SceneOption[],
		minChoices?: number,
		maxChoices?: number
	): SceneOption[] {
		if (options.length === 0) return [];
		if (maxChoices == null && minChoices == null) {
			// No limits — sort by order and return all
			return [...options].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		}

		// Sort by priority descending
		const sorted = [...options].sort((a, b) => {
			const pa = a.priority ?? this.game?.scenes[a.id]?.priority ?? 1;
			const pb = b.priority ?? this.game?.scenes[b.id]?.priority ?? 1;
			return pb - pa;
		});

		const committed: SceneOption[] = [];
		let candidates: SceneOption[] = [];
		let lastPriority: number | undefined;

		for (let i = 0; i < sorted.length; i++) {
			const opt = sorted[i];
			const priority = opt.priority ?? this.game?.scenes[opt.id]?.priority ?? 1;

			if (priority !== lastPriority) {
				if (lastPriority !== undefined) {
					if (minChoices == null || committed.length + candidates.length >= minChoices) {
						// We have enough from higher priority tiers
						break;
					}
				}
				committed.push(...candidates);
				candidates = [];
				lastPriority = priority;
			}
			candidates.push(opt);
		}

		// Handle remaining candidates with maxChoices limit
		const totalWithCandidates = committed.length + candidates.length;
		if (maxChoices == null || maxChoices >= totalWithCandidates) {
			committed.push(...candidates);
		} else {
			// Use frequency to select among same-priority candidates
			const extra = maxChoices - committed.length;
			if (extra > 0) {
				const scored = candidates.map(c => {
					const freq = c.frequency ?? this.game?.scenes[c.id]?.frequency ?? 100;
					return { opt: c, score: freq === 0 ? Infinity : Math.random() / freq };
				});
				scored.sort((a, b) => a.score - b.score);
				committed.push(...scored.slice(0, extra).map(s => s.opt));
			}
		}

		// Sort final selection by order for display
		return committed.sort((a, b) => {
			const oa = a.order ?? this.game?.scenes[a.id]?.order ?? 0;
			const ob = b.order ?? this.game?.scenes[b.id]?.order ?? 0;
			return oa - ob;
		});
	}

	/** Build DisplayChoice array from selected options */
	private buildChoiceDisplay(options: SceneOption[]): DisplayChoice[] {
		if (!this.game) return [];

		const choices: DisplayChoice[] = [];

		for (const opt of options) {
			const scene = this.game.scenes[opt.id];
			if (!scene) continue;

			let canChoose = true;
			if (opt.chooseIf) canChoose = this.evaluateCondition(opt.chooseIf);
			if (canChoose && scene.chooseIf) canChoose = this.evaluateCondition(scene.chooseIf);

			const title = opt.title ?? scene.title ?? opt.id;

			let subtitle: string | undefined;
			if (!canChoose) {
				subtitle = scene.unavailableSubtitle ?? scene.subtitle;
			} else {
				subtitle = scene.subtitle;
			}

			// Calculate difficulty info for display
			let difficultyLabel: string | undefined;
			let successProb: number | undefined;
			let checkQuality: string | undefined;
			if (scene.checkQuality && scene.checkSuccessGoTo && scene.checkFailureGoTo) {
				checkQuality = scene.checkQuality;
				const qv = this.state.qualities[scene.checkQuality] ?? 0;
				if (scene.broadDifficulty != null) {
					successProb = calculateBroadDifficulty(qv, scene.broadDifficulty, scene.difficultyScaler);
					difficultyLabel = displayDifficulty(successProb);
				} else if (scene.narrowDifficulty != null) {
					successProb = calculateNarrowDifficulty(qv, scene.narrowDifficulty, scene.difficultyIncrement);
					difficultyLabel = displayDifficulty(successProb);
				}
			}

			choices.push({
				id: opt.id,
				text: title,
				subtitle,
				enabled: canChoose,
				visible: true,
				isCard: scene.isCard ?? false,
				isDeck: scene.isDeck ?? false,
				isPinnedCard: scene.isPinnedCard ?? false,
				checkQuality,
				broadDifficulty: scene.broadDifficulty,
				narrowDifficulty: scene.narrowDifficulty,
				difficultyLabel,
				successProb
			});
		}

		// If no choosable options and we're not at root, add Continue to root
		if (choices.filter(c => c.enabled).length === 0 &&
			this.state.rootSceneId !== this.state.currentSceneId) {
			choices.push({
				id: this.state.rootSceneId,
				text: 'Continue...',
				enabled: true,
				visible: true
			});
		}

		return choices;
	}

	// ── Hand/Deck/Card system ────────────────────────────────────────

	private getHandId(): string {
		return this.state.currentSceneId;
	}

	private getHand(): HandCard[] {
		return this.state.hands[this.getHandId()] ?? [];
	}

	private getDiscards(): string[] {
		return this.state.discards[this.getHandId()] ?? [];
	}

	private getMaxCards(): number {
		return this.currentScene?.maxCards ?? 5;
	}

	private buildHandDisplay(scene: GameScene): DisplayContent {
		const handId = scene.id;
		const hand = this.state.hands[handId] ?? [];
		const maxCards = scene.maxCards ?? 5;
		const deckChoices: DisplayChoice[] = [];
		const pinnedChoices: DisplayChoice[] = [];
		const otherChoices: DisplayChoice[] = [];

		const options = this.resolveOptions(scene);
		const viewable = this.filterViewable(options);

		for (const opt of viewable) {
			const target = this.game?.scenes[opt.id];
			if (!target) continue;

			const canChoose = this.evaluateCondition(opt.chooseIf) && this.evaluateCondition(target.chooseIf);

			if (target.isDeck) {
				const eligible = this.getEligibleCards(opt.id, handId);
				deckChoices.push({
					id: opt.id,
					text: opt.title ?? target.title ?? opt.id,
					enabled: hand.length < maxCards && eligible.length > 0,
					visible: true,
					isDeck: true,
					isCard: false,
					isHandCard: false,
					subtitle: hand.length >= maxCards ? 'Hand full' : eligible.length === 0 ? 'No cards available' : undefined
				});
			} else if (target.isPinnedCard) {
				let difficultyLabel: string | undefined;
				let successProb: number | undefined;
				if (target.checkQuality && (target.broadDifficulty != null || target.narrowDifficulty != null)) {
					const qv = this.state.qualities[target.checkQuality] ?? 0;
					if (target.broadDifficulty != null) {
						successProb = calculateBroadDifficulty(qv, target.broadDifficulty, target.difficultyScaler);
					} else {
						successProb = calculateNarrowDifficulty(qv, target.narrowDifficulty!, target.difficultyIncrement);
					}
					difficultyLabel = displayDifficulty(successProb);
				}
				pinnedChoices.push({
					id: opt.id,
					text: opt.title ?? target.title ?? opt.id,
					enabled: canChoose,
					visible: true,
					isPinnedCard: true,
					isCard: true,
					isDeck: false,
					isHandCard: false,
					checkQuality: target.checkQuality,
					broadDifficulty: target.broadDifficulty,
					narrowDifficulty: target.narrowDifficulty,
					difficultyLabel,
					successProb
				});
			} else {
				otherChoices.push({
					id: opt.id,
					text: opt.title ?? target.title ?? opt.id,
					enabled: canChoose,
					visible: true,
					isDeck: false,
					isCard: false,
					isHandCard: false
				});
			}
		}

		// Build hand card choices
		const handChoices: DisplayChoice[] = [];
		// Filter hand cards: remove any that no longer pass viewIf
		const validHand = hand.filter(card => {
			const cardScene = this.game?.scenes[card.id];
			if (!cardScene) return false;
			if (cardScene.viewIf && !this.evaluateCondition(cardScene.viewIf)) return false;
			return true;
		});
		// Update stored hand if cards were filtered out
		if (validHand.length !== hand.length) {
			this.state.hands[handId] = validHand;
		}

		for (const card of validHand) {
			const cardScene = this.game?.scenes[card.id];
			if (!cardScene) continue;

			let difficultyLabel: string | undefined;
			let successProb: number | undefined;
			if (cardScene.checkQuality && (cardScene.broadDifficulty != null || cardScene.narrowDifficulty != null)) {
				const qv = this.state.qualities[cardScene.checkQuality] ?? 0;
				if (cardScene.broadDifficulty != null) {
					successProb = calculateBroadDifficulty(qv, cardScene.broadDifficulty, cardScene.difficultyScaler);
				} else {
					successProb = calculateNarrowDifficulty(qv, cardScene.narrowDifficulty!, cardScene.difficultyIncrement);
				}
				difficultyLabel = displayDifficulty(successProb);
			}

			handChoices.push({
				id: card.id,
				text: cardScene.title ?? card.id,
				enabled: this.evaluateCondition(cardScene.chooseIf),
				visible: true,
				isCard: true,
				isDeck: false,
				isHandCard: true,
				fromDeck: card.fromDeck,
				checkQuality: cardScene.checkQuality,
				broadDifficulty: cardScene.broadDifficulty,
				narrowDifficulty: cardScene.narrowDifficulty,
				difficultyLabel,
				successProb
			});
		}

		return {
			title: scene.title ?? scene.id,
			subtitle: scene.subtitle,
			body: this.renderContent(scene.content ?? ''),
			choices: [...handChoices, ...deckChoices, ...pinnedChoices, ...otherChoices],
			isHand: true,
			handCount: validHand.length,
			maxCards,
			handFull: validHand.length >= maxCards,
			newPage: scene.newPage
		};
	}

	/** Get cards eligible to draw from a deck (applies full filtering pipeline) */
	private getEligibleCards(deckId: string, handId?: string): GameScene[] {
		if (!this.game) return [];
		const deck = this.game.scenes[deckId];
		if (!deck?.isDeck) return [];

		const hId = handId ?? this.getHandId();
		const hand = this.state.hands[hId] ?? [];
		const discards = this.state.discards[hId] ?? [];
		const handIds = new Set(hand.map(c => c.id));
		const discardIds = new Set(discards);

		// Get deck's options, resolve tags, filter viewable
		const options = this.resolveOptions(deck);
		const viewable = this.filterViewable(options);

		return viewable
			.map(opt => this.game!.scenes[opt.id])
			.filter((scene): scene is GameScene =>
				scene != null &&
				scene.isCard === true &&
				!handIds.has(scene.id) &&
				!discardIds.has(scene.id) &&
				this.evaluateCondition(scene.chooseIf)
			);
	}

	/** Draw a random card from a deck into the current hand, using priority/frequency */
	drawCard(deckId: string): void {
		if (!this.game) return;
		const handId = this.getHandId();
		const maxCards = this.getMaxCards();
		const hand = this.state.hands[handId] ?? [];
		if (hand.length >= maxCards) return;

		const deck = this.game.scenes[deckId];
		if (!deck?.isDeck) return;

		// Use the priority system: build options and apply selection
		const options = this.resolveOptions(deck);
		const viewable = this.filterViewable(options);

		// Filter to eligible cards (in deck, not in hand/discard)
		const handIds = new Set(hand.map(c => c.id));
		const discardIds = new Set(this.state.discards[handId] ?? []);
		const eligible = viewable.filter(opt => {
			const scene = this.game!.scenes[opt.id];
			return scene?.isCard && !handIds.has(opt.id) && !discardIds.has(opt.id);
		});

		if (eligible.length === 0) return;

		// Apply priority selection to get the best candidates, then pick one at random
		const selected = this.applyPrioritySelection(eligible, undefined, deck.maxChoices);
		if (selected.length === 0) return;

		const pick = selected[Math.floor(Math.random() * selected.length)];
		const card: HandCard = { id: pick.id, fromDeck: deckId };

		this.state.hands[handId] = [...hand, card];
		this.state.lastDrawnCard = card;
	}

	/** Play a card from the hand */
	playCard(cardId: string): void {
		const handId = this.getHandId();
		const hand = this.state.hands[handId] ?? [];
		const idx = hand.findIndex(c => c.id === cardId);
		if (idx === -1) return;

		this.state.hands[handId] = hand.filter((_, i) => i !== idx);
		this.state.discards[handId] = [...(this.state.discards[handId] ?? []), cardId];
		this.state.lastPlayedCard = cardId;
		this.choose(cardId);
	}

	/** Play a pinned card (no hand management, just navigate) */
	playPinnedCard(cardId: string): void {
		this.choose(cardId);
	}

	/** Discard a card from the hand without playing it */
	discardCard(cardId: string): void {
		const handId = this.getHandId();
		const hand = this.state.hands[handId] ?? [];
		const idx = hand.findIndex(c => c.id === cardId);
		if (idx === -1) return;

		this.state.hands[handId] = hand.filter((_, i) => i !== idx);
		this.state.discards[handId] = [...(this.state.discards[handId] ?? []), cardId];
	}

	// ── Actions ──────────────────────────────────────────────────────

	private executeArrival(): void {
		const scene = this.currentScene;
		if (!scene) return;

		// Reset discards when returning to a hand scene
		if (scene.isHand) {
			this.state.discards[scene.id] = [];
		}

		this.executeActionsFor(scene.onArrival);
		this.executeActionsFor(scene.onDisplay);
	}

	private executeActionsFor(commands?: string[]): void {
		if (!commands) return;
		for (const cmd of commands) {
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

	private clampQualities(): void {
		if (!this.game) return;
		for (const [id, def] of Object.entries(this.game.qualities)) {
			const val = this.state.qualities[id];
			if (val == null) continue;
			if (def.min != null && val < def.min) this.state.qualities[id] = def.min;
			if (def.max != null && val > def.max) this.state.qualities[id] = def.max;
		}
	}

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
				// Skip commands we can't parse
			}
		}
	}

	// ── Expression & condition evaluation ────────────────────────────

	private evaluateExpression(expr: string): number {
		let resolved = expr.trim();
		resolved = resolved.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
			if (match in (this.state.qualities ?? {})) {
				return String(this.state.qualities[match]);
			}
			return match;
		});
		if (/^[\d\s+\-*/().]+$/.test(resolved)) {
			return Function(`"use strict"; return (${resolved});`)() as number;
		}
		return 0;
	}

	evaluateCondition(condition?: string): boolean {
		if (!condition) return true;
		try {
			let resolved = condition.trim();
			resolved = resolved.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
				if (match in (this.state.qualities ?? {})) {
					return String(this.state.qualities[match]);
				}
				return match;
			});
			if (/^[\d\s+\-*/().>=<!&|]+$/.test(resolved)) {
				return Boolean(Function(`"use strict"; return (${resolved});`)());
			}
			return true;
		} catch {
			return true;
		}
	}

	// ── Content rendering ────────────────────────────────────────────

	private renderContent(content: string): string {
		let html = content;
		// Quality interpolation: [+ qualityName +]
		html = html.replace(/\[\+\s*(\w+)\s*\+\]/g, (_, name) => {
			return String(this.state.qualities[name] ?? 0);
		});
		// Conditional text: [? if condition : text ?]
		html = html.replace(/\[\?\s*if\s+(.+?)\s*:\s*(.+?)\s*\?\]/g, (_, condition, text) => {
			return this.evaluateCondition(condition) ? text : '';
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
