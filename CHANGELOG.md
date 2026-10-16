<!-- doc-changelog: generated 2026-09-25. Delete this line once you hand-edit this file. -->
# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.4.0] - 2026-10-16

### Added

- `npm run audit:dendry` counts how often the story content uses each DendryNexus feature in each subgame, then writes the tables into `docs/reports/DENDRYNEXUS_FEATURE_COVERAGE.md`. Thirty-six of the sixty-four catalogued features are in use today.
- `npm run audit:cohesion` reports how the Great Hall's decks relate: which qualities each deck writes and gates on, which scene links cross a deck boundary and which decks affect each other. It also checks that every scene is reachable from the first.
- Two audit reports with findings for the remediation triage: feature coverage (five findings) and deck cohesion (six findings, including that the hub adds reputation on every visit).
- Remediation tasks 6RM.3 to 6RM.9 on the roadmap, one per actionable audit finding, all behind the triage task. The catch-all task 6RM.2 is retired in their favour.

## [0.3.0] - 2026-10-15

### Breaking

- The engine is no longer part of this repository. `src/engine/` and the `$engine` import alias are gone; import `RiffleEngine` and its types from `@jasonwarrenuk/riffle` instead.
- The zone shape and the adjacency helpers (`Zone`, `ZoneMap`, `buildZoneMap`, `getZone`, `getAdjacent`, `areAdjacent`) are no longer exported from `src/lib/arena.ts`. Import them from `@jasonwarrenuk/riffle`.

### Added

- Flyt now installs the engine from npm (`@jasonwarrenuk/riffle` 1.1.0 or later) and has a smoke test that the installed package loads Flyt's compiled game JSON and navigates a scene.
- Architecture decision record 0002: the story compiler will move into Riffle as a command-line tool that works under Node, Bun and Deno with identical output, with the parts specific to Flyt turned into parameters.
- A boundary assessment report showing that the arena's adjacency helpers are generic and the thirteen contest zones are not.

### Changed

- The arena module holds only the thirteen contest zones and builds its zone map with the package, which also fixes a bug where a zone ID such as `constructor` misbehaved.
- The engine's vocabulary guard, which keeps flyting terms out of the engine, now lives in the Riffle repository where the engine source is. It ran here only while the engine did.
- The project guide points at the package README for the engine's API instead of copying it, and its structure listing matches the repository.

### Removed

- The workflow that pushed `src/engine/` to the Riffle repository on every merge. Riffle is now published as a package instead.

## [0.2.0] - 2026-10-13

### Breaking

- `getZone`, `getAdjacent` and `areAdjacent` now take a zone map as their first argument. Pass `ZONES` for the contest arena: `getZone(ZONES, 'middle', 3)`.

### Added

- Architecture decision record 0001 defining Riffle's boundary: the engine holds game-agnostic mechanism and Flyt holds flyting content
- Test runner (Vitest) with an `npm test` script, and a first suite covering the arena helpers

### Changed

- Arena helpers work on any zone map, with no assumption about ring names or zone ID spelling, so they can move to Riffle without the thirteen contest zones. `Zone` and the new `ZoneMap` are generic over ring names
- Engine file headers link the upstream DendryNexus repository instead of a Flyt-only path, and `CompiledGame` is documented as the engine's input contract rather than as `dendrynexus compile` output

## [0.1.0] - 2026-10-13

### Breaking

- The arena exports (`ZONES`, `INNER_ZONES`, `MIDDLE_SECTORS`, `OUTER_QUARTERS`, `getZone`, `getAdjacent`, `areAdjacent` and the `Ring` and `Zone` types) are no longer exported from `$engine`. Import them from `$lib/arena.js`.

### Changed

- The arena module moved from `src/engine/` to `src/lib/arena.ts`, so the engine mirror no longer publishes Flyt's contest zones to Riffle
- The engine README is now the canonical Riffle README, carrying the content that had been hand-edited on the mirror and lost to the next sync, with a working upstream link and the full API reference

## [0.0.1] - 2026-09-25

### Added

- SvelteKit + TypeScript project skeleton with DendryNexus integration
- Claude Code docs, skills and hooks for the DendryNexus stack
- Card/deck proof of concept with stat checks, conditional gating and stat bars
- Sticky collapsible stats bar on mobile
- 15 new events across all three decks
- Draw-into-hand card mechanic with a 5-card hand limit
- Texturina font for the title and strapline
- DendryNexus engine reference documenting all upstream features
- Full DendryNexus engine feature set, with a playable showcase
- Game menu with subgame selection (Great Hall / Contest)
- Arena topology module with zone adjacency data
- `ArenaMap` SVG component visualising the three concentric circles
- Geographic and temporal tracking qualities for the contest module
- Riffle engine extracted with auto-sync to a separate repo

### Changed

- Reorganised Great Hall: deck descriptions moved into one-time intro cards

[Unreleased]: https://github.com/JasonWarrenUK/flyt/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/JasonWarrenUK/flyt/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/JasonWarrenUK/flyt/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JasonWarrenUK/flyt/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JasonWarrenUK/flyt/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/JasonWarrenUK/flyt/releases/tag/v0.0.1
