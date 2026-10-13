# ADR 0001: Riffle's Boundary

| Prop     | Value |
|----------|-------|
| Status   | Accepted |
| Date     | 2026-09-30 |
| Roadmap  | 2PE.6 (resolved); applied by 2PE.1 and 8EX.2 |

## Context

Riffle (`JasonWarrenUK/riffle`) is the engine extracted from Flyt's `src/engine/`. Until M9 lands, `.github/workflows/sync-engine.yml` mirrors that directory to Riffle on every push to `main`, so anything placed there becomes part of Riffle's public API.

`arena.ts` shows the cost of getting this wrong: thirteen hardcoded contest zones went into `src/engine/`, were mirrored to Riffle and now take three M8 tasks to remove (`docs/reports/RIFFLE_AUDIT.md`, F1 and F2).

2PE.6 asked whether M2's phrase engine should live in Riffle or in Flyt. Answering it needed a prior question settled: what Riffle is for.

## Decision

### What Riffle is

Riffle is **DendryNexus plus mechanics of its own**. It may go beyond upstream DendryNexus with new mechanics, provided none of them assumes a particular game. It is neither a pure DendryNexus runtime nor Flyt's private engine.

### The boundary test

Code belongs in Riffle when a second game with entirely different content could use it without renaming anything.

Mechanism passes; content fails. The same idea can split across the line:

| Idea | Riffle (mechanism) | Flyt (content) |
|---|---|---|
| Arena | Zone adjacency, if it ever proves generic | The thirteen named contest zones (`Player's End`, `Opponent's End`, ...) |
| Unlock resolution | Evaluating unlock conditions against state | Which opponent moves and observed events count as triggers, authored in `.dry` |

### Applied to the phrase engine

| Piece | Task | Home | Reason |
|---|---|---|---|
| Chained, non-reversible slot composition | 2PE.1, 2PE.2 | Riffle | A new mechanic with no game-specific vocabulary |
| Unlock-condition resolution | 2PE.3 | Split | Engine evaluates conditions; Flyt authors them |
| Diegetic acclaim judging | 2PE.4 | Flyt | Acclaim and crowd are flyting concepts |
| Round end conditions | 2PE.5 | Flyt | Flyting rules; Riffle at most exposes a hook they plug into |

The table is a starting position. 2PE.1 draws the actual line when it designs the data model: it splits the model into an engine part and a Flyt part, and only the engine part goes into `src/engine/`.

## Consequences

- The phrase engine is no longer a single unit with one home; it spans both repos by design.
- 2PE.1 carries an extra deliverable: an explicit engine/Flyt split in its data model.
- 8EX.2 moves `arena.ts` under this rule. Should zone adjacency later prove generic, it can return to Riffle as mechanism, without the zone data.
- Flyt-only code needs a home outside `src/engine/` (8EX.2 proposes `src/game/`); the phrase engine's Flyt half should use the same location.
- Every addition to `src/engine/` needs a boundary check before merge, since the sync publishes it immediately.

## Follow-up

A mechanical guard, so the boundary doesn't rely on memory: a check on PRs touching `src/engine/` that flags flyting vocabulary (`acclaim`, `crowd`, `insult`, `flyt`, contest zone names). A hit means the code is in the wrong repo. Not yet on the roadmap.
