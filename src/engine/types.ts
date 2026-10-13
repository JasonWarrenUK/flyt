/**
 * Types for the compiled game JSON the engine consumes.
 *
 * `CompiledGame` is the engine's input contract: any compiler that
 * produces this shape will do. Flyt's own `scripts/compile-dendry.js`
 * is one such producer, parsing DendryNexus-style `.dry` files; the
 * upstream `dendrynexus compile` output is the model these types follow,
 * not their definition.
 * Upstream semantics: https://github.com/aucchen/dendrynexus
 * (Flyt also keeps a feature reference at docs/dendrynexus-reference.md
 * in its own repo; that file is not part of the engine.)
 */

export interface GameScene {
	id: string;
	title?: string;
	subtitle?: string;
	unavailableSubtitle?: string;
	content?: string;
	options?: SceneOption[];
	tags?: string[];
	onArrival?: string[];
	onDeparture?: string[];
	onDisplay?: string[];
	viewIf?: string;
	chooseIf?: string;
	maxVisits?: number;
	countVisitsMax?: number;

	/** Navigation */
	goTo?: string | ConditionalGoTo[];
	goToRef?: string;
	setRoot?: boolean;
	newPage?: boolean;
	gameOver?: boolean;
	call?: string;

	/** Choice selection */
	order?: number;
	priority?: number;
	frequency?: number;
	minChoices?: number;
	maxChoices?: number;

	/** DendryNexus card/deck extensions */
	isHand?: boolean;
	isDeck?: boolean;
	isCard?: boolean;
	isPinnedCard?: boolean;
	cardImage?: string;
	maxCards?: number;

	/** Difficulty checks */
	checkQuality?: string;
	broadDifficulty?: number;
	narrowDifficulty?: number;
	difficultyScaler?: number;
	difficultyIncrement?: number;
	checkSuccessGoTo?: string;
	checkFailureGoTo?: string;
}

export interface ConditionalGoTo {
	id: string;
	predicate?: string;
}

export interface SceneOption {
	id: string;
	title?: string;
	viewIf?: string;
	chooseIf?: string;
	order?: number;
	priority?: number;
	frequency?: number;
	isTag?: boolean;
}

export interface QualityDefinition {
	id: string;
	name: string;
	initial?: number;
	type?: 'integer' | 'fudge' | 'onOff' | 'wordScale' | 'raw';
	words?: string[];
	min?: number;
	max?: number;
	category?: string;
}

export interface CompiledGame {
	scenes: Record<string, GameScene>;
	qualities: Record<string, QualityDefinition>;
	tagLookup: Record<string, string[]>;
	firstScene: string;
	title: string;
	author?: string;
}

export interface HandCard {
	id: string;
	fromDeck: string;
}

export interface GameState {
	currentSceneId: string;
	qualities: Record<string, number>;
	visits: Record<string, number>;
	history: string[];
	rootSceneId: string;
	/** Per-hand-scene card state */
	hands: Record<string, HandCard[]>;
	discards: Record<string, string[]>;
	lastDrawnCard: HandCard | null;
	lastPlayedCard: string | null;
}

export interface DisplayContent {
	title: string;
	subtitle?: string;
	body: string;
	choices: DisplayChoice[];
	isHand?: boolean;
	isDeck?: boolean;
	isCard?: boolean;
	handCount?: number;
	maxCards?: number;
	handFull?: boolean;
	newPage?: boolean;
}

export interface DisplayChoice {
	id: string;
	text: string;
	enabled: boolean;
	visible: boolean;
	subtitle?: string;
	isCard?: boolean;
	isDeck?: boolean;
	isHandCard?: boolean;
	isPinnedCard?: boolean;
	fromDeck?: string;
	checkQuality?: string;
	broadDifficulty?: number;
	narrowDifficulty?: number;
	difficultyLabel?: string;
	successProb?: number;
}
