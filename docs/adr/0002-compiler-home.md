# ADR 0002: The compiler belongs in Riffle

| Prop | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-15 |
| Resolves | 10IC.3 |
| Builds on | [ADR 0001](0001-riffle-boundary.md) |

## Context

Riffle consumes compiled game JSON: the `CompiledGame` shape its types define. Nothing in Riffle produces that JSON. The only producer is `scripts/compile-dendry.js` in Flyt, which parses `.dry` story files and writes one JSON file per subgame.

The audit that preceded M8 (`docs/reports/RIFFLE_AUDIT.md`, reverse-direction section) flagged the asymmetry: Riffle's input contract is defined in practice by a file Riffle does not ship. Now that Riffle is on npm and Flyt installs it (10IC.1, 10IC.2), the asymmetry has a user-facing cost. Anyone who installs `@jasonwarrenuk/riffle` gets an engine with no way to make a game for it short of writing their own `.dry` compiler or hand-authoring JSON.

The compiler itself is almost entirely mechanism. Of its 300 lines, the Flyt-specific parts are:

- a fallback title of `Flyt` when `game.dry` has none
- the input root `story/` and the output root `static/`, both hardcoded
- the subgame convention: each subdirectory of `story/` holding a `game.dry` becomes `static/<name>.json`

Everything else (block parsing, choice and tag syntax, choice-level properties, conditional go-to, command lists, quality definitions, tag lookup) is the `.dry` format itself, which belongs to the engine that reads its output.

## Decision

**The compiler moves into Riffle.** Riffle ships it as a CLI alongside the runtime, so an install of the package is a complete toolchain: write `.dry`, compile, load.

Applied to the boundary test from ADR 0001 (code belongs in Riffle when a second game with entirely different content could use it without renaming anything): the parser passes outright. The three Flyt-specific parts above fail it and must become parameters before the move: the title fallback comes from `game.dry` or an argument, the input and output roots are arguments and the subgame convention is an option rather than the only mode.

Flyt keeps a thin wrapper, or just an npm script, that calls the CLI with its own roots. `npm run compile:dendry` keeps working with the same output, so story authoring in Flyt does not change.

### Alternatives considered

**Keep the compiler in Flyt.** Cheapest, and consistent with the current state. Rejected because it leaves Riffle unusable on its own, which contradicts the reason for publishing it. It also leaves the input contract defined by code the package does not control, so a change to the compiler in Flyt can silently break the shape Riffle expects.

**Publish the compiler as a second package.** Keeps the runtime free of Node-only code (file system access). Rejected for now: one package with a CLI entry point is simpler to install and version together, and the runtime's `exports` map already separates what a browser bundle sees from what a CLI needs. A split can come later if the CLI grows dependencies the runtime should not carry.

## Consequences

- A new task, 10IC.5, carries out the move: port the compiler into the Riffle repo as a CLI with the three Flyt-specific parts parameterised, publish it and switch Flyt's `compile:dendry` script to call it. 10IC.5 is Riffle-side work first and Flyt-side second, like 10IC.1 and 10IC.2 before it.
- Until 10IC.5 lands, `scripts/compile-dendry.js` stays in Flyt and remains the de facto definition of the input contract. Changes to it should be mirrored into the `CompiledGame` types in Riffle, not the other way round.
- The compiler's tests belong with it in Riffle. Flyt's own check that compiled JSON loads (`src/lib/riffle.test.ts`) stays in Flyt as the consumer-side proof.
- The vocabulary guard that ADR 0001 says should move to Riffle's CI should cover the compiler too once it lives there: a parser for `.dry` must not learn flyting words any more than the runtime may.
- `docs/dendrynexus-reference.md` describes the `.dry` features Flyt relies on. Once the compiler is in Riffle, that reference is documentation of Riffle's input format and should move or be mirrored there in the same task.
