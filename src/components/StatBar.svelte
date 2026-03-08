<script lang="ts">
	import type { QualityDefinition } from '$engine';

	let {
		name,
		value,
		definition
	}: {
		name: string;
		value: number;
		definition: QualityDefinition;
	} = $props();

	const min = $derived(definition.min ?? 0);
	const max = $derived(definition.max ?? 10);
	const range = $derived(max - min);
	const fill = $derived(range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 0);
	const isOnOff = $derived(definition.type === 'onOff');
</script>

{#if isOnOff}
	<div class="stat-bar on-off" class:active={value >= 1}>
		<span class="stat-name">{name}</span>
		<span class="stat-indicator">{value >= 1 ? '◆' : '◇'}</span>
	</div>
{:else}
	<div class="stat-bar">
		<div class="stat-header">
			<span class="stat-name">{name}</span>
			<span class="stat-value">{value}<span class="stat-max">/{max}</span></span>
		</div>
		<div class="bar-track">
			<div
				class="bar-fill"
				class:low={fill < 30}
				class:mid={fill >= 30 && fill < 70}
				class:high={fill >= 70}
				style:width="{fill}%"
			></div>
			{#each Array(Math.min(range, 20)) as _, i (i)}
				<div class="bar-notch" style:left="{((i + 1) / range) * 100}%"></div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.stat-bar {
		margin-bottom: var(--space-sm);
	}

	.stat-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 3px;
	}

	.stat-name {
		font-family: var(--font-heading);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.stat-value {
		font-family: var(--font-heading);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--bronze-light);
	}

	.stat-max {
		font-size: 0.65rem;
		font-weight: 400;
		color: var(--bronze-dark);
	}

	.bar-track {
		position: relative;
		height: 8px;
		background: var(--shadow);
		border: 1px solid var(--bronze-dark);
		overflow: hidden;
	}

	.bar-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		transition: width 0.4s ease, background 0.4s ease;
	}

	.bar-fill.low {
		background: linear-gradient(90deg, var(--ember), var(--hearth));
	}

	.bar-fill.mid {
		background: linear-gradient(90deg, var(--bronze-dark), var(--bronze));
	}

	.bar-fill.high {
		background: linear-gradient(90deg, var(--bronze), var(--bronze-light));
	}

	.bar-notch {
		position: absolute;
		top: 0;
		width: 1px;
		height: 100%;
		background: rgba(26, 26, 26, 0.5);
	}

	/* On/Off items */
	.on-off {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2px 0;
	}

	.on-off .stat-name {
		font-size: 0.7rem;
	}

	.stat-indicator {
		font-size: 0.75rem;
		color: var(--bronze-dark);
		transition: color 0.3s ease;
	}

	.on-off.active .stat-indicator {
		color: var(--hearth-glow);
	}
</style>
