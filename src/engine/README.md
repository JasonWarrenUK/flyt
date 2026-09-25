<!-- doc-readme: generated 2026-09-25. Delete this line once you hand-edit this file. -->
# engine

Svelte 5 reactive wrapper that turns compiled DendryNexus game data (`static/*.json`) into live game state, plus a standalone arena-topology module for the flyting contest's spatial layout.

## Overview

This is the runtime half of the DendryNexus integration described in the project root `CLAUDE.md`: `scripts/compile-dendry.js` compiles `.dry` story files into JSON, and everything in this directory consumes that JSON and turns it into `$state`/`$derived` reactive game state for the UI. No Handlebars, no Browserify, no upstream Dendry browser runtime.

`src/components/SceneView.svelte` and friends render off `RiffleEngine.display`; `src/routes/+page.svelte` owns the engine instance. `src/components/ArenaMap.svelte` renders the zone layout from `arena.ts`.

## API / Exports

Via `index.ts`:

```ts
import { RiffleEngine } from '$engine';
import type { CheckResult } from '$engine';
import { ZONES, getZone, getAdjacent, areAdjacent, INNER_ZONES, MIDDLE_SECTORS, OUTER_QUARTERS } from '$engine';
import type { Ring, Zone } from '$engine';
```

### `RiffleEngine` (`engine.svelte.ts`)

A class holding all reactive game state. One instance per game session.

```ts
const engine = new RiffleEngine();
await engine.load('/great-hall.json');

engine.display;      // DisplayContent | null, title/body/choices ready to render
engine.qualityList;  // current quality values, for a stats sidebar
engine.lastCheck;    // CheckResult | null, most recent difficulty-check outcome

engine.choose(sceneId);        // navigate to a scene
engine.drawCard(deckId);       // draw a card into the current hand
engine.playCard(cardId);       // play a hand card
engine.playPinnedCard(cardId); // play a pinned card (no hand slot)
engine.discardCard(cardId);    // discard a hand card unplayed
engine.restart();              // reset to initial state, same game data
```

Internally it implements the full DendryNexus feature set: priority/frequency choice selection, the card/deck/hand system, pinned cards, tag-based choices (`#tag`), conditional go-to / go-to-ref / set-root, max-visits filtering, min/max-choices, broad and narrow difficulty checks, and content markup rendering (bold, italic, quality interpolation, conditional text). See `docs/dendrynexus-reference.md` at the project root for the upstream semantics this reimplements.

### `types.ts`

Plain interfaces mirroring `dendrynexus compile` output (`GameScene`, `QualityDefinition`, `CompiledGame`) plus the engine's own runtime shapes (`GameState`, `DisplayContent`, `DisplayChoice`, `HandCard`, `CheckResult`). No logic, just contracts.

### `arena.ts`

Standalone module (no dependency on the engine or on DendryNexus data) defining the flyting contest's play area: three concentric rings, each subdivided into zones with an adjacency graph.

```ts
getZone('middle', 3);           // → the Zone for "m3"
getAdjacent('i2');              // → Zone[] sharing an edge with the centre ground
areAdjacent('m1', 'o1');        // → true
ZONES['i1'].label;              // → "Player's End"
```

Zone IDs are ring-prefixed and unambiguous: `i1` to `i3` (inner: player, centre, opponent), `m1` to `m6` (middle: crowd sectors), `o1` to `o4` (outer: distant quarters). The adjacency lists and the degree-mapping between rings are documented in the comments at the top of the file; read those before changing any `adjacent` array, since they encode the geometry, not an arbitrary graph.

## Key Files

- `engine.svelte.ts`: `RiffleEngine`, the reactive game-state class. Start here for anything touching scene navigation, choices, checks or cards.
- `types.ts`: data shape reference for both compiled game data and runtime state.
- `arena.ts`: zone topology for the contest arena, independent of the story engine.
- `index.ts`: barrel export; add new public exports here, not by reaching into individual files.
