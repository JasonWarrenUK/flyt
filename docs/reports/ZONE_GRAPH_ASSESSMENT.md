# Zone-graph helpers: boundary assessment

| Prop | Value |
|---|---|
| Date | 2026-10-15 |
| Roadmap | 10IC.4 |
| Rule applied | [ADR 0001](../adr/0001-riffle-boundary.md), the boundary test |

## Question

`src/lib/arena.ts` holds two things: the thirteen named zones of the flyting contest, and a small set of helpers for any ring-based arena (`Zone`, `ZoneMap`, `buildZoneMap`, `getZone`, `getAdjacent`, `areAdjacent`). ADR 0001 left the helpers' home open: "zone adjacency, if it ever proves generic". 8EX.7 made them generic. Do they now pass the boundary test, and if so, should they move to Riffle?

## The test

Code belongs in Riffle when a second game with entirely different content could use it without renaming anything.

| Item | Passes? | Evidence |
|---|---|---|
| `Zone<R>`, `ZoneMap<R>` | Yes | Generic over ring names; no field names a contest concept |
| `buildZoneMap` | Yes | Takes any zone lists; no knowledge of which rings exist |
| `getZone` | Yes | Matches on ring and index; the old ID-prefix assumption (`i`, `m`, `o`) was removed in 8EX.7 |
| `getAdjacent`, `areAdjacent` | Yes | Read only the map they are given |
| Flyt's tests for the helpers | Yes | Run against a two-ring arena named `hub` and `rim`, with IDs `core`, `north` and `south`; nothing Flyt-shaped |
| `Ring` (`inner`, `middle`, `outer`) | No | The contest's three rings |
| `INNER_ZONES`, `MIDDLE_SECTORS`, `OUTER_QUARTERS`, `ZONES` | No | The thirteen named zones and their adjacency |

The helpers pass. The data fails, as ADR 0001 said it would.

## Decision

Promote the helpers to Riffle as a `zone-graph` module, exported from the package root. Flyt's `arena.ts` keeps the data and imports the mechanism from `@jasonwarrenuk/riffle`, which is how it now stands.

One improvement goes in with the move, from the review on Flyt PR #22: `buildZoneMap` throws on a duplicate zone ID instead of letting the last one win. In Flyt the thirteen hand-written zones made that harmless; as package mechanism fed by arbitrary content, a loud failure at build time beats a quiet adjacency bug later.

## Outcome

All of it is done:

- This assessment.
- Riffle PR #4 added `src/lib/zone-graph.ts`, its tests and the exports, and shipped in `@jasonwarrenuk/riffle` 1.1.0. A review of that PR caught a bug the Flyt original shared: zone IDs that match `Object.prototype` members (`constructor`, `toString`) misbehaved on a plain-object map. The package fixed it with a prototype-free map and a regression test.
- Flyt now depends on `^1.1.0`. `src/lib/arena.ts` holds only the thirteen contest zones, builds them with the package's `buildZoneMap` and imports its types from the package. `ArenaMap.svelte` imports the `Zone` type from the package too.
- Flyt's own tests for the helpers were removed with the helpers, because they now live in Riffle. `src/lib/arena.test.ts` keeps what is Flyt's: the thirteen zones, the documented lookups through the package helpers, the ID-suffix convention and symmetric adjacency.
