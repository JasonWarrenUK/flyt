# Riffle Extraction Audit

**Task:** 8EX.1. **Status:** complete, feeds 8EX.2 (remove/generalise the findings below).

## Scope and method

Riffle (`JasonWarrenUK/riffle`) is a one-way mirror: `.github/workflows/sync-engine.yml` pushes `src/engine/` to Riffle's `main` on every push to Flyt `main` that touches that directory (`peaceiris/actions-gh-pages`). This audit diffed Flyt's `src/engine/` against Riffle's current `main` (`07aba44`) file by file, then read each file in full for Flyt-specific assumptions: game content, Flyt-only paths, Flyt-only docs, hardcoded Flyt terminology.

`engine.svelte.ts`, `types.ts`, `arena.ts` and `index.ts` are byte-identical between the two repos; the sync has kept the engine code itself in lockstep. `README.md` has diverged (see F3).

## Findings

| # | Severity | Location | Finding | Recommended disposition |
|---|---|---|---|---|
| F1 | High | `src/engine/arena.ts` (whole file, 174 lines) | Hardcoded flyting-contest arena topology: 13 zones across inner/middle/outer rings, labelled `Player's End`, `Opponent's End`, `Behind Player`, etc. This is game content specific to Flyt's contest mechanic, not engine infrastructure. | Move `arena.ts` out of `src/engine/` into a Flyt-only location (e.g. `src/game/arena.ts` or `src/lib/arena.ts`) so the sync workflow stops mirroring it to Riffle. |
| F2 | High | `src/engine/index.ts:4-5` | The barrel re-exports `arena.ts`'s zones, types and helpers, so the arena topology is part of Riffle's public API surface even though nothing about it is engine-generic. Sole consumer is `src/components/ArenaMap.svelte:2` (`import ... from '$engine/arena.js'`). | Remove the re-export once F1 moves; update `ArenaMap.svelte`'s import path to the new location. |
| F3 | High | Riffle `README.md` (not present in Flyt's `src/engine/README.md`, which still reads `Sync test`) | Riffle's README was hand-edited directly on the Riffle repo in commit `07aba44`, diverging from Flyt's copy. It documents "Arena topology" as a Riffle feature and links `https://github.com/JasonWarrenUK/dendrynexus`, which returns 404 (no such repo under that org). Because the sync is one-way Flyt→Riffle, the next push touching `src/engine/` overwrites this README back to `Sync test`, silently destroying the hand-written content. | Port the Riffle README content back into `src/engine/README.md` as the canonical copy, minus the arena section (once F1 lands) and the dead DendryNexus link. |
| F4 | Medium | `types.ts:4-5`, `engine.svelte.ts:15` | Doc comments point readers at `docs/dendrynexus-reference.md`, which exists only in Flyt, not in Riffle. A Riffle-only consumer following the comment hits a dead reference. | Either inline the relevant upstream feature summary in Riffle's own comments, or drop the specific path and describe the source engine (DendryNexus) generically. |
| F5 | Medium | `types.ts:4` | Comment claims `CompiledGame` "mirrors the structure output by `dendrynexus compile`", but in practice it mirrors the output of Flyt's own `scripts/compile-dendry.js` (a custom compiler, not the upstream DendryNexus CLI). Riffle's input contract is implicitly defined by a file that only lives in Flyt. | Reword the comment to describe the JSON shape Riffle actually expects, independent of which compiler produced it; note `compile-dendry.js` as one such producer, not the definition. |
| F6 | Low | `engine.svelte.ts:474` (`'Continue...'`), `engine.svelte.ts:528` (`'Hand full'`, `'No cards available'`), `displayDifficulty` (`engine.svelte.ts:54-64`) | Hardcoded English UI strings and difficulty labels. Generic engine behaviour, not Flyt-specific content, so no extraction action needed. Worth flagging as a future localisation/config seam if Riffle ever serves a non-English consumer. | No action for 8EX.2; carry forward as a note if Riffle grows a config/localisation story. |

## Reverse direction: engine code still living in Flyt

M8's goal is engine code fully in Riffle with nothing Flyt-specific left behind, which also means checking Flyt doesn't still house engine code that belongs in Riffle:

- `scripts/compile-dendry.js` — the `.dry` → JSON compiler Riffle's `CompiledGame` type depends on (see F5). It is not mirrored to Riffle at all, and contains a hardcoded Flyt fallback title (`title: 'Flyt'`, line 164) and Flyt-specific paths (`story/`, `static/`). This is out of scope for 8EX.2 (which only cleans Riffle) but relevant to M10 (Invert to Consumption), where Flyt starts consuming Riffle as a dependency and the compiler's relationship to the engine package needs deciding.

## Out of scope

Noted during the audit, not Flyt-specific, no action required for 8EX.2:

- Riffle has no `package.json`; it isn't installable as a package yet. Tracked by M10 (`10IC.1`).
- `sync-engine.yml` sets `enable_jekyll: true`, a leftover default from `peaceiris/actions-gh-pages`'s Pages-oriented defaults; harmless for a plain code mirror but worth revisiting if the workflow is touched for other reasons.
- `evaluateExpression`/`evaluateCondition` (`engine.svelte.ts:781-812`) use `Function()` to evaluate quality expressions. A design/security consideration for the engine generally, not a Flyt-vs-Riffle boundary issue.
