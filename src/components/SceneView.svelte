<script lang="ts">
	import type { DisplayContent, CheckResult } from '$engine';
	import CheckResultBanner from '$components/CheckResultBanner.svelte';

	let {
		display,
		onChoose,
		onDraw,
		onPlay,
		onPlayPinned,
		onDiscard,
		lastCheck
	}: {
		display: DisplayContent;
		onChoose: (id: string) => void;
		onDraw: (deckId: string) => void;
		onPlay: (cardId: string) => void;
		onPlayPinned: (cardId: string) => void;
		onDiscard: (cardId: string) => void;
		lastCheck?: CheckResult | null;
	} = $props();

	const handCards = $derived(display.choices.filter((c) => c.isHandCard));
	const deckChoices = $derived(display.choices.filter((c) => c.isDeck));
	const pinnedChoices = $derived(display.choices.filter((c) => c.isPinnedCard && !c.isHandCard));
	const otherChoices = $derived(display.choices.filter((c) => !c.isHandCard && !c.isDeck && !c.isPinnedCard));
</script>

<article class="scene" class:is-deck={display.isDeck} class:is-hand={display.isHand}>
	<header class="scene-header">
		{#if display.isDeck}
			<span class="scene-badge">Deck</span>
		{:else if display.isHand}
			<span class="scene-badge">Hand</span>
		{/if}
		<h2>{display.title}</h2>
		{#if display.subtitle}
			<p class="subtitle">{display.subtitle}</p>
		{/if}
	</header>

	{#if lastCheck}
		<CheckResultBanner result={lastCheck} />
	{/if}

	<div class="scene-body">
		{@html display.body}
	</div>

	{#if display.isHand}
		<!-- Hand cards section -->
		<section class="hand-section">
			<h3 class="section-heading">Your Hand ({display.handCount}/{display.maxCards ?? 5})</h3>
			{#if handCards.length === 0}
				<p class="empty-hand">Your hand is empty. Draw cards from a deck below.</p>
			{:else}
				<div class="card-grid">
					{#each handCards as card (card.id)}
						<div class="hand-card" class:disabled={!card.enabled}>
							<span class="card-icon">&#x1F0A0;</span>
							<span class="card-label">{card.text}</span>
							{#if card.difficultyLabel}
								<span class="card-difficulty {card.difficultyLabel.replace(/\s+/g, '-')}">
									{card.checkQuality}: {card.difficultyLabel}
								</span>
							{:else if card.checkQuality}
								<span class="card-check">
									{card.checkQuality}
									{card.broadDifficulty != null ? `≥${card.broadDifficulty}` : ''}
									{card.narrowDifficulty != null ? `≥${card.narrowDifficulty}` : ''}
								</span>
							{/if}
							<div class="card-actions">
								<button
									class="card-action play-btn"
									disabled={!card.enabled}
									onclick={() => onPlay(card.id)}
								>
									Play
								</button>
								<button
									class="card-action discard-btn"
									onclick={() => onDiscard(card.id)}
								>
									Discard
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Deck draw section -->
		{#if deckChoices.length > 0}
			<section class="decks-section">
				<h3 class="section-heading">Available Decks</h3>
				<div class="deck-grid">
					{#each deckChoices as deck (deck.id)}
						<button
							class="deck-draw-btn"
							disabled={!deck.enabled}
							onclick={() => onDraw(deck.id)}
						>
							<span class="deck-icon">&#x2660;</span>
							<span class="deck-label">{deck.text}</span>
							<span class="deck-action">
								{deck.subtitle ?? (display.handFull ? 'Hand full' : 'Draw')}
							</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Pinned cards section -->
		{#if pinnedChoices.length > 0}
			<section class="pinned-section">
				<h3 class="section-heading">Always Available</h3>
				<div class="card-grid">
					{#each pinnedChoices as card (card.id)}
						<button
							class="pinned-card"
							class:disabled={!card.enabled}
							disabled={!card.enabled}
							onclick={() => onPlayPinned(card.id)}
						>
							<span class="card-icon pinned-icon">&#x1F4CC;</span>
							<span class="card-label">{card.text}</span>
							{#if card.difficultyLabel}
								<span class="card-difficulty {card.difficultyLabel.replace(/\s+/g, '-')}">
									{card.checkQuality}: {card.difficultyLabel}
								</span>
							{/if}
							{#if card.subtitle}
								<span class="card-subtitle">{card.subtitle}</span>
							{/if}
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Other choices (e.g. Rune Chamber) -->
		{#if otherChoices.length > 0}
			<nav class="choices">
				{#each otherChoices as choice (choice.id)}
					<button
						class="choice"
						class:disabled={!choice.enabled}
						disabled={!choice.enabled}
						onclick={() => onChoose(choice.id)}
					>
						<span class="choice-marker">&loz;</span>
						{choice.text}
					</button>
				{/each}
			</nav>
		{/if}
	{:else if display.choices.length > 0}
		<nav class="choices" class:card-grid={display.isDeck}>
			{#each display.choices as choice (choice.id)}
				{#if choice.isCard}
					<button
						class="card-choice"
						class:disabled={!choice.enabled}
						disabled={!choice.enabled}
						onclick={() => onChoose(choice.id)}
					>
						<span class="card-icon">&#x1F0A0;</span>
						<span class="card-label">{choice.text}</span>
						{#if choice.difficultyLabel}
							<span class="card-difficulty {choice.difficultyLabel.replace(/\s+/g, '-')}">
								{choice.checkQuality}: {choice.difficultyLabel}
							</span>
						{:else if choice.checkQuality}
							<span class="card-check">
								{choice.checkQuality}
								{choice.broadDifficulty != null ? `≥${choice.broadDifficulty}` : ''}
								{choice.narrowDifficulty != null ? `≥${choice.narrowDifficulty}` : ''}
							</span>
						{/if}
					</button>
				{:else}
					<button
						class="choice"
						class:disabled={!choice.enabled}
						disabled={!choice.enabled}
						onclick={() => onChoose(choice.id)}
					>
						<span class="choice-marker">&loz;</span>
						<span class="choice-text">{choice.text}</span>
						{#if choice.subtitle && !choice.enabled}
							<span class="choice-subtitle">{choice.subtitle}</span>
						{/if}
					</button>
				{/if}
			{/each}
		</nav>
	{:else if display.isCard}
		<!-- Card scenes auto-navigate via checks, no end marker needed -->
	{:else}
		<div class="scene-end">
			<span class="end-mark">&#x2736;</span>
		</div>
	{/if}
</article>

<style>
	.scene {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: var(--space-lg);
	}

	.scene.is-deck,
	.scene.is-hand {
		border-color: var(--bronze);
		border-width: 2px;
	}

	.scene-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--border-subtle);
	}

	.scene-badge {
		display: inline-block;
		font-family: var(--font-heading);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--shadow);
		background: var(--bronze);
		padding: 2px 8px;
		margin-bottom: var(--space-xs);
	}

	.scene-header h2 {
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		font-family: var(--font-heading);
		font-size: 0.8rem;
		color: var(--text-secondary);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.scene-body {
		font-size: 1.05rem;
		line-height: 1.8;
	}

	.scene-body :global(p) {
		margin-bottom: var(--space-md);
	}

	.scene-body :global(em) {
		color: var(--bronze-light);
		font-style: italic;
	}

	.scene-body :global(strong) {
		color: var(--bronze-light);
		font-weight: 600;
	}

	/* Section headings for hand view */
	.hand-section,
	.decks-section,
	.pinned-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-subtle);
	}

	.section-heading {
		font-family: var(--font-heading);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--bronze);
		margin-bottom: var(--space-md);
	}

	.empty-hand {
		color: var(--text-secondary);
		font-style: italic;
		font-size: 0.95rem;
	}

	/* Hand cards */
	.hand-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		font-family: var(--font-body);
		font-size: 0.95rem;
		color: var(--text-primary);
		background: var(--bg-surface);
		border: 2px solid var(--bronze-dark);
		text-align: center;
		min-height: 140px;
		justify-content: center;
		transition: border-color 0.2s ease;
	}

	.hand-card:hover:not(.disabled) {
		border-color: var(--bronze-light);
	}

	.hand-card.disabled {
		opacity: 0.35;
		border-style: dashed;
	}

	.card-actions {
		display: flex;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
		width: 100%;
	}

	.card-action {
		flex: 1;
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-heading);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
	}

	.play-btn {
		color: var(--bronze-light);
		border-color: var(--bronze-dark);
	}

	.play-btn:hover:not(:disabled) {
		background: rgba(176, 141, 87, 0.15);
		border-color: var(--bronze-light);
		color: var(--bronze-light);
	}

	.play-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.discard-btn {
		color: var(--text-secondary);
	}

	.discard-btn:hover {
		color: var(--hearth);
		border-color: var(--hearth);
		background: rgba(176, 80, 50, 0.1);
	}

	/* Pinned cards */
	.pinned-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		font-family: var(--font-body);
		font-size: 0.95rem;
		color: var(--text-primary);
		background: var(--bg-surface);
		border: 2px solid var(--bronze);
		cursor: pointer;
		text-align: center;
		min-height: 120px;
		justify-content: center;
		transition: all 0.25s ease;
		border-style: double;
		border-width: 3px;
	}

	.pinned-card:hover:not(:disabled) {
		border-color: var(--bronze-light);
		background: rgba(176, 141, 87, 0.1);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.pinned-card.disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.pinned-icon {
		font-size: 1.2rem !important;
	}

	.card-subtitle {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-style: italic;
	}

	/* Deck draw buttons */
	.deck-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.deck-draw-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		font-family: var(--font-body);
		color: var(--text-secondary);
		background: transparent;
		border: 2px dashed var(--bronze-dark);
		cursor: pointer;
		text-align: center;
		transition: all 0.25s ease;
		min-height: 100px;
		justify-content: center;
	}

	.deck-draw-btn:hover:not(:disabled) {
		border-color: var(--bronze-light);
		border-style: solid;
		background: rgba(176, 141, 87, 0.08);
		color: var(--text-primary);
	}

	.deck-draw-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.deck-icon {
		font-size: 1.5rem;
		line-height: 1;
		color: var(--bronze-dark);
	}

	.deck-label {
		font-family: var(--font-heading);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--bronze);
	}

	.deck-action {
		font-family: var(--font-heading);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-secondary);
	}

	/* Standard choices */
	.choices {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-subtle);
	}

	.choice {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--text-primary);
		background: transparent;
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
		line-height: 1.5;
	}

	.choice:hover:not(:disabled) {
		border-color: var(--bronze);
		background: rgba(176, 141, 87, 0.08);
		color: var(--bronze-light);
	}

	.choice:active:not(:disabled) {
		background: rgba(176, 141, 87, 0.15);
	}

	.choice.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.choice-marker {
		color: var(--bronze-dark);
		font-size: 0.8em;
		flex-shrink: 0;
	}

	.choice:hover:not(:disabled) .choice-marker {
		color: var(--hearth-glow);
	}

	.choice-subtitle {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-style: italic;
		margin-left: auto;
	}

	/* Card grid for decks/hands */
	.choices.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.card-choice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		font-family: var(--font-body);
		font-size: 0.95rem;
		color: var(--text-primary);
		background: var(--bg-surface);
		border: 2px solid var(--bronze-dark);
		cursor: pointer;
		text-align: center;
		transition: all 0.25s ease;
		min-height: 120px;
		justify-content: center;
	}

	.card-choice:hover:not(:disabled) {
		border-color: var(--bronze-light);
		background: rgba(176, 141, 87, 0.1);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.card-choice:active:not(:disabled) {
		transform: translateY(0);
	}

	.card-choice.disabled {
		opacity: 0.35;
		cursor: not-allowed;
		border-style: dashed;
	}

	.card-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.card-label {
		font-family: var(--font-heading);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--bronze-light);
	}

	.card-check {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--bronze-dark);
		font-family: var(--font-heading);
	}

	/* Difficulty label styling */
	.card-difficulty {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-family: var(--font-heading);
		padding: 1px 6px;
		border: 1px solid;
	}

	.card-difficulty.straightforward,
	.card-difficulty.low-risk {
		color: var(--bronze-light);
		border-color: var(--bronze-dark);
	}

	.card-difficulty.very-modest,
	.card-difficulty.modest {
		color: var(--bronze);
		border-color: var(--bronze-dark);
	}

	.card-difficulty.chancy,
	.card-difficulty.very-chancy {
		color: var(--hearth-glow);
		border-color: var(--hearth-glow);
	}

	.card-difficulty.tough,
	.card-difficulty.high-risk {
		color: var(--hearth);
		border-color: var(--hearth);
	}

	.card-difficulty.almost-impossible {
		color: var(--ember);
		border-color: var(--ember);
	}

	/* End marker */
	.scene-end {
		text-align: center;
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-subtle);
		color: var(--bronze-dark);
		font-size: 1.5rem;
	}
</style>
