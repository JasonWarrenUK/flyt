<script lang="ts">
	import type { DisplayContent } from '$engine';

	let { display, onChoose }: { display: DisplayContent; onChoose: (id: string) => void } = $props();
</script>

<article class="scene">
	<header class="scene-header">
		<h2>{display.title}</h2>
		{#if display.subtitle}
			<p class="subtitle">{display.subtitle}</p>
		{/if}
	</header>

	<div class="scene-body">
		{@html display.body}
	</div>

	{#if display.choices.length > 0}
		<nav class="choices">
			{#each display.choices as choice (choice.id)}
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

	.scene-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--border-subtle);
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

	.scene-end {
		text-align: center;
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-subtle);
		color: var(--bronze-dark);
		font-size: 1.5rem;
	}
</style>
