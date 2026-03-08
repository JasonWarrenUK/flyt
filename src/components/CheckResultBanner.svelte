<script lang="ts">
	import type { CheckResult } from '$engine';

	let { result }: { result: CheckResult } = $props();
</script>

<div class="check-banner" class:success={result.success} class:failure={!result.success}>
	<div class="check-header">
		{result.success ? '✦ Success' : '✧ Failure'}
	</div>
	<div class="check-details">
		<span class="check-stat">{result.quality}: {result.qualityValue}</span>
		<span class="check-vs">vs</span>
		<span class="check-diff">Difficulty {result.difficulty} ({result.type}{result.difficultyLabel ? ` — ${result.difficultyLabel}` : ''})</span>
	</div>
	<div class="check-roll">
		Needed ≤{result.threshold}%, rolled {result.roll}%
	</div>
</div>

<style>
	.check-banner {
		padding: var(--space-sm) var(--space-md);
		margin-bottom: var(--space-md);
		border: 1px solid;
		text-align: center;
	}

	.check-banner.success {
		border-color: var(--bronze);
		background: rgba(176, 141, 87, 0.12);
	}

	.check-banner.failure {
		border-color: var(--ember);
		background: rgba(139, 37, 0, 0.12);
	}

	.check-header {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin-bottom: var(--space-xs);
	}

	.success .check-header {
		color: var(--bronze-light);
	}

	.failure .check-header {
		color: var(--hearth);
	}

	.check-details {
		font-size: 0.85rem;
		color: var(--text-secondary);
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		align-items: center;
	}

	.check-vs {
		font-style: italic;
		color: var(--bronze-dark);
		font-size: 0.75rem;
	}

	.check-roll {
		font-size: 0.75rem;
		color: var(--bronze-dark);
		margin-top: 2px;
		font-family: var(--font-heading);
		letter-spacing: 0.05em;
	}
</style>
