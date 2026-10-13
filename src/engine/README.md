# Riffle

A Svelte 5 reactive game engine for interactive fiction compiled from [DendryNexus](https://github.com/aucchen/dendrynexus) story files. Riffle wraps compiled game JSON in a fully reactive runtime: branching narrative, player choices, difficulty checks, card/deck mechanics and quality systems.

This directory is the canonical source. It is mirrored one way to [`JasonWarrenUK/riffle`](https://github.com/JasonWarrenUK/riffle) by Flyt's `sync-engine.yml` workflow on every push to `main` that touches it, so edit the README here rather than on the mirror.

## Features

- **Reactive state**: built on Svelte 5 runes (`$state`, `$derived`) for automatic UI updates
- **Branching narrative**: scene navigation with conditional go-to, go-to-ref, set-root and game-over states
- **Choice system**: priority, frequency and order-based selection with view-if/choose-if conditions, tag expansion (`#tag`) and min/max limits
- **Difficulty checks**: broad and narrow difficulty curves with configurable scalers, human-readable labels (*almost impossible* to *straightforward*) and roll tracking
- **Card/deck/hand system**: draw, play and discard cards across multiple hands with pinned cards, max hand sizes and per-hand state
- **Quality system**: named attributes with typed display (`integer`, `fudge`, `onOff`, `wordScale`, `raw`) and min/max clamping
- **Content rendering**: quality interpolation (`[+ qualityName +]`), conditional text (`[? if condition : text ?]`), `*italic*` and `**bold**`

## Structure

```
index.ts              Barrel export; add new public exports here, not by reaching into individual files
engine.svelte.ts      RiffleEngine, the reactive game-state class
types.ts              TypeScript contracts for compiled game data and runtime state
```

## Usage

Within Flyt the directory is aliased as `$engine`. Riffle is not yet published as a package, so a standalone consumer imports from the directory path.

```ts
import { RiffleEngine } from '$engine';

const engine = new RiffleEngine();
await engine.load('/great-hall.json');

// Reactive state (Svelte 5 runes)
engine.display;       // DisplayContent | null: title, body and choices ready to render
engine.qualityList;   // all qualities with current values, for a stats sidebar
engine.lastCheck;     // CheckResult | null: most recent difficulty-check outcome

// Player actions
engine.choose('scene-id');          // navigate to a scene
engine.drawCard('deck-id');         // draw a card from a deck into the current hand
engine.playCard('card-id');         // play a hand card
engine.playPinnedCard('card-id');   // play a pinned card (no hand slot)
engine.discardCard('card-id');      // discard a hand card unplayed
engine.restart();                   // reset to initial state, same game data
```

One instance per game session. In Flyt, `src/routes/+page.svelte` owns the instance and `src/components/SceneView.svelte` renders off `engine.display`.

## API

### `RiffleEngine` (`engine.svelte.ts`)

| Member | Type | Description |
|---|---|---|
| `game` | `CompiledGame \| null` | Loaded game data |
| `state` | `GameState` | Current game state (scene, qualities, visits, history, hands, discards) |
| `loading` | `boolean` | Whether a game is currently loading |
| `error` | `string \| null` | Error message from the last load attempt |
| `currentScene` | `GameScene \| null` | Derived: the active scene object |
| `display` | `DisplayContent \| null` | Derived: rendered scene with choices for the UI |
| `qualityList` | `{ id, name, value, definition }[]` | Derived: all qualities with current values and definitions |
| `lastCheck` | `CheckResult \| null` | Result of the most recent difficulty check |

Internally it implements the full DendryNexus feature set: priority/frequency choice selection, the card/deck/hand system, pinned cards, tag-based choices, conditional go-to / go-to-ref / set-root, max-visits filtering, min/max-choices, broad and narrow difficulty checks and content markup rendering. Flyt keeps a reference to the upstream semantics in `docs/dendrynexus-reference.md` at its project root.

### `types.ts`

Plain interfaces for compiled game data (`GameScene`, `SceneOption`, `ConditionalGoTo`, `QualityDefinition`, `CompiledGame`) plus the engine's own runtime shapes (`GameState`, `DisplayContent`, `DisplayChoice`, `HandCard`). `CheckResult` is exported from `engine.svelte.ts`. No logic, just contracts.

### Difficulty labels

| Success probability | Label |
|---|---|
| ≤ 10% | almost impossible |
| ≤ 30% | high-risk |
| ≤ 40% | tough |
| ≤ 50% | very chancy |
| ≤ 60% | chancy |
| ≤ 70% | modest |
| ≤ 80% | very modest |
| ≤ 90% | low risk |
| > 90% | straightforward |

Broad checks: `success = scaler * (stat / difficulty)`, default scaler 0.6. Narrow checks: `success = 0.5 + (stat - difficulty) * increment`, default increment 0.1. A scaler or increment above 1 is treated as a percentage.

## Requirements

- **Svelte 5**: uses runes (`$state`, `$derived`) for reactivity
- **Compiled game JSON**: the `CompiledGame` shape in `types.ts`. Flyt produces it with its own `scripts/compile-dendry.js` compiler from `.dry` story files; the upstream `dendrynexus compile` output is the model it follows
