<script lang="ts">
	import type { QualityDefinition } from '$engine';
	import StatBar from '$components/StatBar.svelte';

	let { qualities }: {
		qualities: { id: string; name: string; value: number; definition: QualityDefinition }[];
	} = $props();

	const grouped = $derived.by(() => {
		const groups: Record<string, typeof qualities> = {};
		for (const q of qualities) {
			const cat = q.definition.category ?? 'Other';
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(q);
		}
		return groups;
	});
</script>

<div class="panel">
	<h3>Qualities</h3>
	{#each Object.entries(grouped) as [category, items] (category)}
		<div class="category">
			<h4 class="category-label">{category}</h4>
			{#each items as q (q.id)}
				<StatBar name={q.name} value={q.value} definition={q.definition} />
			{/each}
		</div>
	{/each}
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

	.category {
		margin-bottom: var(--space-md);
	}

	.category:last-child {
		margin-bottom: 0;
	}

	.category-label {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--bronze-dark);
		margin-bottom: var(--space-xs);
		font-weight: 700;
	}
</style>
