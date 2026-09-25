# Flyt Foundations Roadmap

Groundwork across all three areas of the project before either subgame is content-complete: the Contest flyting duel (built from scratch), a coherence audit and remediation pass on the already-built Great Hall showcase, and a clean extraction of the shared engine into the standalone Riffle repo.

**Critical path:** `1ES.1 → 1ES.2 → 3WC.1 → 3WC.2 → 4DC.2 → 4DC.3`; the Contest duel content can't be written until per-entity state, the phrase engine, and world/observation content all exist. The Riffle and Great Hall tracks are independent of Contest and of each other.

---

## Milestone 1: Entity State

**Goal:** Model per-NPC state (patience, mood, attention) for spectator entities

- [ ] **1ES.1**: Design per-entity state schema (patience, mood, attention) for spectator NPCs
- [ ] **1ES.2**: Extend qualities.dry / engine types to model per-NPC entity bundles (Thane, rival, shieldmaiden, merchant, seer, jarl, warband, shipwright) _(blocked: depends on 1ES.1)_

---

## Milestone 2: Phrase Engine

**Goal:** Build the chained phrase-slot mechanic, extending DendryNexus card mechanics, with unlock conditions and diegetic acclaim judging

- [ ] **2PE.1**: Design phrase-chain data model (subject / response-to-opponent / observed-detail slots) atop DendryNexus card mechanics _(blocked: depends on 1ES.1)_
- [ ] **2PE.2**: Implement phrase-slot selection UI (extends card/hand rendering for chained, non-reversible choices) _(blocked: depends on 2PE.1)_
- [ ] **2PE.3**: Implement unlock-condition resolution (opponent's move + observed events + player history determine available phrase options) _(blocked: depends on 2PE.1)_
- [ ] **2PE.4**: Implement diegetic acclaim judging (no visible score; world-state narrative reveals relative success/failure each attempt) _(blocked: depends on 2PE.2, 2PE.3)_
- [ ] **2PE.5**: Design/document round end conditions (fail to match prior acclaim, or fail to construct a coherent attempt)
  - Note: informs 2PE.4's judging logic; can be spec'd in parallel with 2PE.1-2PE.3
- [ ] **2PE.6**: Open question: should the phrase engine eventually live in Riffle rather than Flyt's src/engine/?
  - Note: no hard dependency on M10 (Invert to Consumption). Flagged for later reassessment, not blocking.

---

## Milestone 3: World/Observation Content

**Goal:** Author the "look around" layer: spectator movement, world events, and the time/information trade-off

- [ ] **3WC.1**: Author spectator movement/event content per zone (arrivals, departures, natural events) driving entity state over time _(blocked: depends on 1ES.2)_
- [ ] **3WC.2**: Implement "look around" action with time-cost trade-off (crowd impatience accrues per look, gated by per-entity patience from M1) _(blocked: depends on 1ES.2, 3WC.1)_

---

## Milestone 4: Duel Content

**Goal:** Author the actual 3-round flyting duel using the finished phrase engine and world content

- [ ] **4DC.1**: Author opponent's flyt-attack content for round 1-3 openers _(blocked: depends on 2PE.4)_
- [ ] **4DC.2**: Author player phrase-option content (randomly-surfaced phrases, opponent-adaptation responses, observation-derived options) referencing M3 world content _(blocked: depends on 3WC.1, 3WC.2, 2PE.4)_
- [ ] **4DC.3**: Wire full 3-round duel flow end to end and playtest (player established as laughably inept tonally throughout) _(blocked: depends on 4DC.1, 4DC.2)_

---

## Milestone 5: Audit

**Goal:** Establish the actual state of Great Hall's 94 scenes before deciding what to fix

- [ ] **5AU.1**: Narrative/tonal coherence read-through of all Great Hall content (merchants, showcase, skalds, warriors decks and hub)
- [ ] **5AU.2**: Structural/mechanical cohesion check across the 4 decks (do decks reference or affect each other; does the hub tie them together)
- [ ] **5AU.3**: DendryNexus feature-coverage audit against docs/dendrynexus-reference.md (confirm which upstream features are actually exercised by current content)
  - Note: pre-interview check already confirmed clean compile and zero dangling choice/goTo/call targets; this task goes deeper into feature coverage, not just link integrity

---

## Milestone 6: Remediation

**Goal:** Fix what the audit finds

- [ ] **6RM.1**: Triage audit findings into a fix list (tonal fixes, structural fixes, missing-feature-coverage gaps) _(blocked: depends on 5AU.1, 5AU.2, 5AU.3)_
- [ ] **6RM.2**: Implement remediation fixes from triage _(blocked: depends on 6RM.1)_

---

## Milestone 7: Progress Tracking

**Goal:** Let the player see how much Great Hall content remains

- [ ] **7PT.1**: Design progress-tracking UX (global vs per-deck, visible vs hidden, where it surfaces in the UI)
- [ ] **7PT.2**: Implement progress-tracking feature per design _(blocked: depends on 7PT.1)_

---

## Milestone 8: Clean Extraction

**Goal:** Finish pulling all engine code into the Riffle repo, with nothing Flyt-specific left behind

- [x] **8EX.1**: Audit Riffle repo for remaining Flyt-specific code/assumptions that shouldn't live there _(done)_
  - Note: findings and recommended disposition per item in docs/reports/RIFFLE_AUDIT.md
- [ ] **8EX.2**: Move arena.ts out of src/engine/ into a Flyt-only location (e.g. src/game/ or src/lib/), so the sync workflow stops mirroring contest-specific topology to Riffle
  - Note: docs/reports/RIFFLE_AUDIT.md F1
- [ ] **8EX.3**: Remove the arena re-export from src/engine/index.ts and update ArenaMap.svelte's import to the new location _(blocked: depends on 8EX.2)_
  - Note: docs/reports/RIFFLE_AUDIT.md F2
- [ ] **8EX.4**: Reconcile Riffle's README (hand-edited on GitHub, diverged from Flyt's copy, overwritten by the next sync): port its content into src/engine/README.md as the canonical copy, dropping the arena section and the dead dendrynexus link
  - Note: docs/reports/RIFFLE_AUDIT.md F3
- [ ] **8EX.5**: Fix doc comments in types.ts and engine.svelte.ts that reference docs/dendrynexus-reference.md, a Flyt-only path with no Riffle equivalent
  - Note: docs/reports/RIFFLE_AUDIT.md F4
- [ ] **8EX.6**: Reword the CompiledGame doc comment in types.ts, which claims to mirror `dendrynexus compile` output but actually mirrors Flyt's own scripts/compile-dendry.js
  - Note: docs/reports/RIFFLE_AUDIT.md F5

---

## Milestone 9: Detach Auto-Sync

**Goal:** Remove the current one-way auto-sync mechanism between Flyt and Riffle

- [ ] **9DS.1**: Remove auto-sync hook/workflow between Flyt and Riffle repos _(blocked: depends on M8)_

---

## Milestone 10: Invert to Consumption

**Goal:** Flyt installs/imports Riffle as a dependency instead of housing the engine directly

- [ ] **10IC.1**: Publish/package Riffle so it's installable (npm package, git dependency, or workspace link, method TBD) _(blocked: depends on M9)_
- [ ] **10IC.2**: Update Flyt's src/engine/ to import from Riffle instead of housing engine code directly _(blocked: depends on 10IC.1)_
- [ ] **10IC.3**: Decide compile-dendry.js's relationship to the Riffle package now Flyt consumes Riffle as a dependency: it currently defines Riffle's CompiledGame input contract but lives only in Flyt, with a hardcoded Flyt fallback title and Flyt-specific paths (story/, static/) _(blocked: depends on 10IC.1)_
  - Note: docs/reports/RIFFLE_AUDIT.md, reverse-direction section

---

## Dependency Diagram

```mermaid
graph LR
	classDef todo fill:#f6f6f6,stroke:#6f6f6f,color:#6f6f6f
	classDef inProgress fill:#e8f2ff,stroke:#0071af,color:#0071af
	classDef blocked fill:#fff8f6,stroke:#e0002b,color:#e0002b,stroke-width:2px
	classDef paused fill:#fdf4ff,stroke:#b01fe3,color:#b01fe3,stroke-dasharray:4 3
	classDef deferred fill:#fff8f3,stroke:#ac5c00,color:#ac5c00,stroke-dasharray:2 4,font-style:italic
	classDef done fill:#e0ffd9,stroke:#008217,color:#008217
	classDef outOfScope fill:#f6f6f6,stroke:#e2e2e2,color:#e2e2e2,stroke-dasharray:2 2
	classDef mile fill:#e3f7ff,stroke:#007590,color:#007590,font-weight:bold
	classDef external fill:#fff9e5,stroke:#7d6f00,color:#7d6f00,stroke-dasharray:4 3,font-style:italic
	1ES.1["1ES.1: Design per-entity state schema (patience…"]
	1ES.2["1ES.2: Extend qualities.dry / engine types to m…"]
	M1["M1: Entity State"]:::mile
	2PE.1["2PE.1: Design phrase-chain data model (subject…"]
	2PE.2["2PE.2: Implement phrase-slot selection UI (exte…"]
	2PE.3["2PE.3: Implement unlock-condition resolution (o…"]
	2PE.4["2PE.4: Implement diegetic acclaim judging (no v…"]
	2PE.5["2PE.5: Design/document round end conditions (fa…"]
	2PE.6["2PE.6: Open question: should the phrase engine…"]
	M2["M2: Phrase Engine"]:::mile
	3WC.1["3WC.1: Author spectator movement/event content…"]
	3WC.2["3WC.2: Implement 'look around' action with time…"]
	M3["M3: World/Observation Content"]:::mile
	4DC.1["4DC.1: Author opponent's flyt-attack content fo…"]
	4DC.2["4DC.2: Author player phrase-option content (ran…"]
	4DC.3["4DC.3: Wire full 3-round duel flow end to end a…"]
	M4["M4: Duel Content"]:::mile
	5AU.1["5AU.1: Narrative/tonal coherence read-through o…"]
	5AU.2["5AU.2: Structural/mechanical cohesion check acr…"]
	5AU.3["5AU.3: DendryNexus feature-coverage audit again…"]
	M5["M5: Audit"]:::mile
	6RM.1["6RM.1: Triage audit findings into a fix list (t…"]
	6RM.2["6RM.2: Implement remediation fixes from triage"]
	M6["M6: Remediation"]:::mile
	7PT.1["7PT.1: Design progress-tracking UX (global vs p…"]
	7PT.2["7PT.2: Implement progress-tracking feature per…"]
	M7["M7: Progress Tracking"]:::mile
	8EX.1["8EX.1: Audit Riffle repo for remaining Flyt-spe…"]
	8EX.2["8EX.2: Move arena.ts out of src/engine/ into a…"]
	8EX.3["8EX.3: Remove the arena re-export from src/engi…"]
	8EX.4["8EX.4: Reconcile Riffle's README (hand-edited o…"]
	8EX.5["8EX.5: Fix doc comments in types.ts and engine.…"]
	8EX.6["8EX.6: Reword the CompiledGame doc comment in t…"]
	M8["M8: Clean Extraction"]:::mile
	9DS.1["9DS.1: Remove auto-sync hook/workflow between F…"]
	M9["M9: Detach Auto-Sync"]:::mile
	10IC.1["10IC.1: Publish/package Riffle so it's installa…"]
	10IC.2["10IC.2: Update Flyt's src/engine/ to import fro…"]
	10IC.3["10IC.3: Decide compile-dendry.js's relationship…"]
	M10["M10: Invert to Consumption"]:::mile
	1ES.1 --> 1ES.2
	1ES.1 --> 2PE.1
	1ES.2 --> M1
	1ES.2 --> 3WC.1
	1ES.2 --> 3WC.2
	2PE.1 --> 2PE.2
	2PE.1 --> 2PE.3
	2PE.2 --> 2PE.4
	2PE.3 --> 2PE.4
	2PE.4 --> M2
	2PE.4 --> 4DC.1
	2PE.4 --> 4DC.2
	2PE.5 --> M2
	2PE.6 --> M2
	3WC.1 --> 3WC.2
	3WC.1 --> 4DC.2
	3WC.2 --> M3
	3WC.2 --> 4DC.2
	4DC.1 --> 4DC.3
	4DC.2 --> 4DC.3
	4DC.3 --> M4
	5AU.1 --> M5
	5AU.1 --> 6RM.1
	5AU.2 --> M5
	5AU.2 --> 6RM.1
	5AU.3 --> M5
	5AU.3 --> 6RM.1
	6RM.1 --> 6RM.2
	6RM.2 --> M6
	7PT.1 --> 7PT.2
	7PT.2 --> M7
	8EX.1 --> 8EX.2
	8EX.1 --> 8EX.3
	8EX.1 --> 8EX.4
	8EX.1 --> 8EX.5
	8EX.1 --> 8EX.6
	8EX.2 --> 8EX.3
	8EX.3 --> M8
	8EX.4 --> M8
	8EX.5 --> M8
	8EX.6 --> M8
	M8 --> 9DS.1
	9DS.1 --> M9
	M9 --> 10IC.1
	10IC.1 --> 10IC.2
	10IC.1 --> 10IC.3
	10IC.2 --> M10
	10IC.3 --> M10
	class 1ES.1,2PE.5,2PE.6,5AU.1,5AU.2,5AU.3,7PT.1,8EX.2,8EX.4,8EX.5,8EX.6 todo
	class 10IC.1,10IC.2,10IC.3,1ES.2,2PE.1,2PE.2,2PE.3,2PE.4,3WC.1,3WC.2,4DC.1,4DC.2,4DC.3,6RM.1,6RM.2,7PT.2,8EX.3,9DS.1 blocked
	class 8EX.1 done
```
