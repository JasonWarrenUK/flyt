<script lang="ts">
	let { onSelect }: { onSelect: (gameId: string) => void } = $props();

	const games = [
		{
			id: 'great-hall',
			title: 'Great Hall',
			subtitle: 'Engine Test',
			description: 'Explore the full flyting engine — cards, decks, difficulty checks, and kenning contests.'
		},
		{
			id: 'contest',
			title: 'Contest',
			subtitle: 'The Game',
			description: 'A fresh start. No stats, no cards — just the wind and the contest ahead.'
		}
	];
</script>

<div class="menu">
	<h2 class="menu-heading">Choose Your Path</h2>
	<div class="menu-grid">
		{#each games as game (game.id)}
			<button class="menu-card" onclick={() => onSelect(game.id)}>
				<h3 class="menu-title">{game.title}</h3>
				<span class="menu-subtitle">{game.subtitle}</span>
				<p class="menu-desc">{game.description}</p>
			</button>
		{/each}
	</div>
</div>

<style>
	.menu {
		text-align: center;
		padding: var(--space-xl) var(--space-md);
	}

	.menu-heading {
		font-family: var(--font-heading);
		color: var(--text-heading);
		font-size: 1.4rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin-bottom: var(--space-xl);
	}

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-lg);
		max-width: 36rem;
		margin: 0 auto;
	}

	.menu-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-lg);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
		font-family: var(--font-body);
		color: var(--text-primary);
	}

	.menu-card:hover {
		border-color: var(--bronze-light);
		background: rgba(176, 141, 87, 0.1);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.menu-card:active {
		transform: translateY(0);
	}

	.menu-title {
		font-family: var(--font-heading);
		color: var(--bronze-light);
		font-size: 1.2rem;
		letter-spacing: 0.1em;
		margin: 0;
	}

	.menu-subtitle {
		font-size: 0.75rem;
		font-family: var(--font-heading);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.menu-desc {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: var(--space-sm) 0 0;
	}
</style>
