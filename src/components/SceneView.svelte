<script lang="ts">
	import type { DisplayContent, CheckResult } from '$engine';
	import CheckResultBanner from '$components/CheckResultBanner.svelte';

	let {
		display,
		onChoose,
		lastCheck
	}: {
		display: DisplayContent;
		onChoose: (id: string) => void;
		lastCheck?: CheckResult | null;
	} = $props();
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

	{#if display.choices.length > 0}
		<nav class="choices" class:card-grid={display.isDeck || display.isHand}>
			{#each display.choices as choice (choice.id)}
				{#if choice.isCard}
					<button
						class="card-choice"
						class:disabled={!choice.enabled}
						disabled={!choice.enabled}
						onclick={() => onChoose(choice.id)}
					>
						<span class="card-icon">🂠</span>
						<span class="card-label">{choice.text}</span>
						{#if choice.checkQuality}
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
						{choice.text}
					</button>
				{/if}
			{/each}
		</nav>
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

	/* Card grid for decks/hands */
	.choices.card-grid {
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
