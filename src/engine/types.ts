/**
 * Types representing DendryNexus compiled game data (game.json).
 *
 * These mirror the structure output by `dendrynexus compile`.
 * Expand as needed when integrating more engine features.
 */

export interface GameScene {
	id: string;
	title?: string;
	subtitle?: string;
	content?: string;
	options?: SceneOption[];
	tags?: string[];
	onArrival?: string[];
	onDeparture?: string[];
	viewIf?: string;
	chooseIf?: string;
	goTo?: string;
	maxVisits?: number;
	/** DendryNexus card/deck extensions */
	isHand?: boolean;
	isDeck?: boolean;
	isCard?: boolean;
	isPinnedCard?: boolean;
	cardImage?: string;
	checkQuality?: string;
	broadDifficulty?: number;
	narrowDifficulty?: number;
	checkSuccessGoTo?: string;
	checkFailureGoTo?: string;
}

export interface SceneOption {
	id: string;
	title?: string;
	viewIf?: string;
	chooseIf?: string;
	order?: number;
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
	firstScene: string;
	title: string;
	author?: string;
}

export interface GameState {
	currentSceneId: string;
	qualities: Record<string, number>;
	visits: Record<string, number>;
	history: string[];
}

export interface DisplayContent {
	title: string;
	subtitle?: string;
	body: string;
	choices: DisplayChoice[];
	isHand?: boolean;
	isDeck?: boolean;
	isCard?: boolean;
}

export interface DisplayChoice {
	id: string;
	text: string;
	enabled: boolean;
	visible: boolean;
	isCard?: boolean;
	isDeck?: boolean;
	checkQuality?: string;
	broadDifficulty?: number;
	narrowDifficulty?: number;
}
