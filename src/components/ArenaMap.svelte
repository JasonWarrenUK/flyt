<script lang="ts">
	let { qualities }: { qualities: Record<string, number> } = $props();

	const CX = 120;
	const CY = 120;
	const R_INNER = 32;
	const R_MIDDLE = 68;
	const R_OUTER = 100;

	// Inner circle zone positions (3 zones divided by horizontal chords)
	// Zone 1 = player (bottom), Zone 2 = centre, Zone 3 = opponent (top)
	const innerZoneY: Record<number, number> = {
		1: CY + R_INNER * 0.55,
		2: CY,
		3: CY - R_INNER * 0.55
	};

	// Middle circle: 6 sectors, angular positions (player at bottom = 270°)
	// 1=behind player(270°), 2=behind-left(210°), 3=left/beyond(150°),
	// 4=beyond opponent(90°), 5=right/beyond(30°), 6=right/behind(330°)
	function sectorAngle(sector: number): number {
		return (270 + (sector - 1) * -60) * Math.PI / 180;
	}

	// Outer circle: 4 quarters
	// 1=behind player(270°), 2=left(180°), 3=beyond opponent(90°), 4=right(0°)
	function quarterAngle(quarter: number): number {
		return (270 + (quarter - 1) * -90) * Math.PI / 180;
	}

	function posOnRing(angle: number, radius: number): { x: number; y: number } {
		return { x: CX + Math.cos(angle) * radius, y: CY - Math.sin(angle) * radius };
	}

	// Sector divider lines (middle circle)
	function sectorDivider(index: number): { x1: number; y1: number; x2: number; y2: number } {
		const angle = (270 + index * -60 + 30) * Math.PI / 180;
		return {
			x1: CX + Math.cos(angle) * (R_INNER + 6),
			y1: CY - Math.sin(angle) * (R_INNER + 6),
			x2: CX + Math.cos(angle) * R_MIDDLE,
			y2: CY - Math.sin(angle) * R_MIDDLE
		};
	}

	// Quarter divider lines (outer circle)
	function quarterDivider(index: number): { x1: number; y1: number; x2: number; y2: number } {
		const angle = (270 + index * -90 + 45) * Math.PI / 180;
		return {
			x1: CX + Math.cos(angle) * (R_MIDDLE + 4),
			y1: CY - Math.sin(angle) * (R_MIDDLE + 4),
			x2: CX + Math.cos(angle) * R_OUTER,
			y2: CY - Math.sin(angle) * R_OUTER
		};
	}

	// Middle-circle entities: quality name → label + abbreviation
	const middleEntities: { quality: string; label: string; abbr: string }[] = [
		{ quality: 'loc_thane', label: 'Thane', abbr: 'T' },
		{ quality: 'loc_rival', label: 'Rival Skald', abbr: 'R' },
		{ quality: 'loc_shieldmaiden', label: 'Shieldmaiden', abbr: 'S' },
		{ quality: 'loc_merchant', label: 'Merchant', abbr: 'M' },
		{ quality: 'loc_seer', label: 'Seer', abbr: 'V' }
	];

	// Outer-circle entities
	const outerEntities: { quality: string; label: string; abbr: string }[] = [
		{ quality: 'loc_jarl', label: 'Jarl', abbr: 'J' },
		{ quality: 'loc_warband', label: 'Warband', abbr: 'W' },
		{ quality: 'loc_shipwright', label: 'Shipwright', abbr: 'Sh' }
	];

	// Compute visible middle entities with positions
	const middleMarkers = $derived.by(() => {
		const markers: { x: number; y: number; abbr: string; label: string }[] = [];
		// Track how many entities are in each sector for offset stacking
		const sectorCounts: Record<number, number> = {};
		for (const ent of middleEntities) {
			const sector = qualities[ent.quality] ?? 0;
			if (sector < 1 || sector > 6) continue;
			const count = sectorCounts[sector] ?? 0;
			sectorCounts[sector] = count + 1;
			const angle = sectorAngle(sector);
			// Offset stacked entities slightly along the radius
			const offset = count * 10 - 4;
			const pos = posOnRing(angle, R_MIDDLE - offset);
			markers.push({ ...pos, abbr: ent.abbr, label: ent.label });
		}
		return markers;
	});

	// Compute visible outer entities with positions
	const outerMarkers = $derived.by(() => {
		const markers: { x: number; y: number; abbr: string; label: string }[] = [];
		const quarterCounts: Record<number, number> = {};
		for (const ent of outerEntities) {
			const quarter = qualities[ent.quality] ?? 0;
			if (quarter < 1 || quarter > 4) continue;
			const count = quarterCounts[quarter] ?? 0;
			quarterCounts[quarter] = count + 1;
			const angle = quarterAngle(quarter);
			const offset = count * 10 - 4;
			const pos = posOnRing(angle, R_OUTER - offset);
			markers.push({ ...pos, abbr: ent.abbr, label: ent.label });
		}
		return markers;
	});

	const playerZone = $derived(qualities['inner_zone'] ?? 1);
	const turn = $derived(qualities['turn'] ?? 0);

	// Inner circle chord divider constants
	const CHORD_OFFSET = R_INNER * 0.22;
	const CHORD_Y1 = CY - CHORD_OFFSET;
	const CHORD_Y2 = CY + CHORD_OFFSET;
	const CHORD_HALF = Math.sqrt(R_INNER * R_INNER - CHORD_OFFSET * CHORD_OFFSET);
</script>

<div class="arena-map">
	<h3>Arena <span class="turn-label">Turn {turn}</span></h3>
	<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
		<!-- Outer circle -->
		<circle cx={CX} cy={CY} r={R_OUTER} class="ring ring-outer" />
		<!-- Middle circle -->
		<circle cx={CX} cy={CY} r={R_MIDDLE} class="ring ring-middle" />
		<!-- Inner circle -->
		<circle cx={CX} cy={CY} r={R_INNER} class="ring ring-inner" />

		<!-- Inner circle zone dividers (horizontal chords) -->
		<line x1={CX - CHORD_HALF} y1={CHORD_Y1} x2={CX + CHORD_HALF} y2={CHORD_Y1} class="divider" />
		<line x1={CX - CHORD_HALF} y1={CHORD_Y2} x2={CX + CHORD_HALF} y2={CHORD_Y2} class="divider" />

		<!-- Middle circle sector dividers -->
		{#each [0, 1, 2, 3, 4, 5] as i (i)}
			{@const d = sectorDivider(i)}
			<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="divider" />
		{/each}

		<!-- Outer circle quarter dividers -->
		{#each [0, 1, 2, 3] as i (i)}
			{@const d = quarterDivider(i)}
			<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="divider" />
		{/each}

		<!-- Player marker -->
		<circle cx={CX} cy={innerZoneY[playerZone] ?? innerZoneY[1]} r="5" class="marker marker-player">
			<title>You</title>
		</circle>

		<!-- Opponent marker (always zone 3) -->
		<circle cx={CX} cy={innerZoneY[3]} r="5" class="marker marker-opponent">
			<title>Opponent</title>
		</circle>

		<!-- Middle circle entity markers -->
		{#each middleMarkers as m (m.label)}
			<g class="entity-group">
				<circle cx={m.x} cy={m.y} r="7" class="marker marker-entity">
					<title>{m.label}</title>
				</circle>
				<text x={m.x} y={m.y} class="entity-label">{m.abbr}</text>
			</g>
		{/each}

		<!-- Outer circle entity markers -->
		{#each outerMarkers as m (m.label)}
			<g class="entity-group">
				<circle cx={m.x} cy={m.y} r="7" class="marker marker-beyond">
					<title>{m.label}</title>
				</circle>
				<text x={m.x} y={m.y} class="entity-label">{m.abbr}</text>
			</g>
		{/each}
	</svg>
</div>

<style>
	.arena-map {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
	}

	h3 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--bronze);
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.turn-label {
		font-family: var(--font-body);
		font-size: 0.7rem;
		color: var(--text-secondary);
		text-transform: none;
		letter-spacing: 0.05em;
	}

	svg {
		width: 100%;
		height: auto;
	}

	.ring {
		fill: none;
		stroke-width: 1;
	}

	.ring-outer {
		stroke: var(--bronze-dark);
		opacity: 0.5;
	}

	.ring-middle {
		stroke: var(--bronze-dark);
		opacity: 0.7;
	}

	.ring-inner {
		stroke: var(--bronze);
		opacity: 0.9;
	}

	.divider {
		stroke: var(--bronze-dark);
		stroke-width: 0.5;
		opacity: 0.35;
	}

	.marker {
		transition: all 0.3s ease;
	}

	.marker-player {
		fill: var(--hearth-glow);
		stroke: var(--hearth);
		stroke-width: 1.5;
	}

	.marker-opponent {
		fill: var(--ember);
		stroke: var(--hearth);
		stroke-width: 1;
		opacity: 0.8;
	}

	.marker-entity {
		fill: var(--bronze-dark);
		stroke: var(--bronze);
		stroke-width: 1;
		opacity: 0.85;
	}

	.marker-beyond {
		fill: var(--iron);
		stroke: var(--bronze-dark);
		stroke-width: 1;
		opacity: 0.7;
	}

	.entity-label {
		fill: var(--parchment);
		font-family: var(--font-heading);
		font-size: 7px;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
</style>
