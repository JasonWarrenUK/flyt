<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="app-shell">
	<header class="app-header">
		<h1>Flyt</h1>
		<p class="tagline">A Game of Kennings</p>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<footer class="app-footer">
		<p>Forged with <a href="https://github.com/aucchen/dendrynexus">DendryNexus</a> &amp; Svelte</p>
	</footer>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.app-header {
		text-align: center;
		padding: var(--space-xl) 0 var(--space-lg);
		border-bottom: 2px solid var(--border-subtle);
	}

	.app-header h1 {
		font-family: var(--font-title);
		font-weight: 900;
		font-size: 2.8rem;
		letter-spacing: 0.15em;
	}

	.tagline {
		font-family: var(--font-title);
		font-weight: 200;
		color: var(--text-secondary);
		font-size: 0.9rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin-top: var(--space-xs);
	}

	.app-main {
		flex: 1;
		padding: var(--space-lg) 0;
	}

	.app-footer {
		text-align: center;
		padding: var(--space-lg) 0;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
</style>
