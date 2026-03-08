<script lang="ts">
	let { qualities }: { qualities: { id: string; name: string; value: number }[] } = $props();
</script>

<div class="panel">
	<h3>Qualities</h3>
	<ul class="quality-list">
		{#each qualities as q (q.id)}
			<li class="quality-item">
				<span class="quality-name">{q.name}</span>
				<span class="quality-value">{q.value}</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.panel {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: var(--space-md);
	}

	h3 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--bronze);
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--border-subtle);
	}

	.quality-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.quality-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 0;
		font-size: 0.85rem;
	}

	.quality-name {
		color: var(--text-secondary);
	}

	.quality-value {
		font-family: var(--font-heading);
		color: var(--bronze-light);
		font-weight: 700;
		font-size: 0.9rem;
	}
</style>
