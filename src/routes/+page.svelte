<script lang="ts">
	import { FlytEngine } from '$engine';
	import SceneView from '$components/SceneView.svelte';
	import QualitiesPanel from '$components/QualitiesPanel.svelte';
	import { onMount } from 'svelte';

	const engine = new FlytEngine();
	let statsOpen = $state(false);

	onMount(() => {
		engine.load('/game.json');
	});
</script>

<svelte:head>
	<title>Flyt — {engine.display?.title ?? 'Loading...'}</title>
</svelte:head>

{#if engine.loading}
	<div class="loading">
		<p>The skalds gather...</p>
	</div>
{:else if engine.error}
	<div class="error">
		<h2>The runes are broken</h2>
		<p>{engine.error}</p>
		<p class="hint">Run <code>npm run compile:dendry</code> to compile the story files.</p>
	</div>
{:else if engine.display}
	<aside class="mobile-stats-bar">
		<button class="mobile-stats-toggle" onclick={() => statsOpen = !statsOpen}>
			<span class="toggle-label">Qualities</span>
			<span class="toggle-arrow">{statsOpen ? '▲' : '▼'}</span>
		</button>
		{#if statsOpen}
			<div class="mobile-stats-content">
				<QualitiesPanel qualities={engine.qualityList} />
				<button class="restart-btn" onclick={() => engine.restart()}>
					Begin Anew
				</button>
			</div>
		{/if}
	</aside>
	<div class="game-layout">
		<div class="scene-column">
			<SceneView
				display={engine.display}
				onChoose={(id) => engine.choose(id)}
				onDraw={(deckId) => engine.drawCard(deckId)}
				onPlay={(cardId) => engine.playCard(cardId)}
				onDiscard={(cardId) => engine.discardCard(cardId)}
				lastCheck={engine.lastCheck}
			/>
		</div>
		<aside class="qualities-column">
			<QualitiesPanel qualities={engine.qualityList} />
			<button class="restart-btn" onclick={() => engine.restart()}>
				Begin Anew
			</button>
		</aside>
	</div>
{/if}

<style>
	.loading {
		text-align: center;
		padding: var(--space-xl);
		font-family: var(--font-heading);
		color: var(--text-secondary);
		font-size: 1.2rem;
		letter-spacing: 0.1em;
	}

	.error {
		text-align: center;
		padding: var(--space-xl);
		color: var(--hearth);
	}

	.error h2 {
		color: var(--hearth);
		margin-bottom: var(--space-md);
	}

	.hint {
		margin-top: var(--space-md);
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.hint code {
		background: var(--bg-surface);
		padding: 0.15em 0.4em;
		border-radius: 3px;
		font-family: monospace;
	}

	.game-layout {
		display: grid;
		grid-template-columns: 1fr 16rem;
		gap: var(--space-lg);
		align-items: start;
	}

	.qualities-column {
		position: sticky;
		top: var(--space-lg);
	}

	.restart-btn {
		display: block;
		width: 100%;
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		font-family: var(--font-heading);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: transparent;
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: all 0.2s;
	}

	.restart-btn:hover {
		color: var(--text-primary);
		border-color: var(--border-accent);
	}

	.mobile-stats-bar {
		display: none;
	}

	@media (max-width: 768px) {
		.game-layout {
			grid-template-columns: 1fr;
		}

		.qualities-column {
			display: none;
		}

		.mobile-stats-bar {
			display: block;
			position: sticky;
			top: 0;
			z-index: 100;
			background: var(--bg-surface);
			border-bottom: 1px solid var(--border-subtle);
		}

		.mobile-stats-toggle {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 100%;
			padding: var(--space-sm) var(--space-md);
			background: transparent;
			border: none;
			cursor: pointer;
			font-family: var(--font-heading);
			font-size: 0.75rem;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--bronze);
		}

		.toggle-arrow {
			font-size: 0.6rem;
			color: var(--text-secondary);
		}

		.mobile-stats-content {
			padding: 0 var(--space-md) var(--space-md);
			border-top: 1px solid var(--border-subtle);
		}
	}
</style>
