# Flyt Foundations: Roadmap Overview

**25 tasks across 10 milestones.** Files: `.claude/roadmaps.json` (machine-readable), `docs/roadmaps/FOUNDATIONS.md` (full task list with Mermaid dependency diagram).

---

## What we're building

Foundations covers groundwork in three areas of the project simultaneously: the Contest subgame (a Norse flyting duel, built from nothing but zone/NPC scaffolding), the Great Hall subgame (a 94-scene card/deck showcase that already exists but hasn't been properly assessed), and the Riffle engine repository (recently extracted from Flyt, still one-way auto-synced rather than properly consumed as a dependency).

Contest is the largest area by task count and the least built. It needs a genuinely new mechanic: a phrase-by-phrase flyting exchange where the player, established as tonally inept at the art, assembles insults from a mix of randomly-surfaced phrases, adaptations of the opponent's own words, and details observed in the surrounding world. Success is judged diegetically (through crowd reaction, never a visible number), and looking around the arena to gather material trades off against the crowd's patience — modelled per-spectator rather than as one global timer, since each NPC (Thane, rival skald, shieldmaiden, merchant, seer, and the more distant jarl/warband/shipwright) needs its own state.

Great Hall took a different turn: rather than assuming the existing 94 scenes are launch-ready, the milestone structure treats "we don't remember if it holds together" as a real risk worth auditing before any fix work starts. A compiler-level check during planning found the content compiles clean with zero dangling scene references, but that's link integrity, not narrative or mechanical coherence — the audit milestone digs into both, plus whether the content actually exercises the DendryNexus feature set documented in `docs/dendrynexus-reference.md`.

Riffle is scoped as pure infrastructure: finish extracting engine code cleanly, remove the auto-sync mechanism that currently pushes changes one way, then invert the relationship so Flyt consumes Riffle as a dependency instead of housing the engine directly.

## Milestone sequence and the reasoning behind it

**M1 Entity State → M2 Phrase Engine → M3 World/Observation Content → M4 Duel Content.** This is Contest's critical path. Per-NPC state has to exist before either the phrase engine (which needs entity-driven unlock conditions) or the world content (which needs somewhere to write spectator state changes into) can be built. M3 and M4 can overlap once M2 lands, since duel content authoring depends on both the finished engine and the world content it references.

**M5 Audit → M6 Remediation.** Great Hall's audit was split into three lenses deliberately: narrative/tonal coherence, structural cohesion across the four decks, and DendryNexus feature coverage. All three feed one triage task before any fix work begins, so remediation is scoped against real findings rather than guesswork.

**M7 Progress Tracking** sits outside the audit/remediation chain. It's new functionality (a way for the player to see how much unseen content remains), not a fix, so it's tracked as its own milestone with an explicit design-first task — the UX shape (global counter vs per-deck breakdown, visible vs hidden) was deliberately left open rather than decided during planning.

**M8 Clean Extraction → M9 Detach Auto-Sync → M10 Invert to Consumption.** Strictly sequential: nothing Flyt-specific can be left in Riffle before the sync mechanism is removed, and the sync can't be removed before Flyt is ready to consume Riffle properly in its place.

## Decisions that shaped the structure

The original milestone proposal grouped Contest into two milestones (core mechanic, then content) and Great Hall into two (audit, then remediation). Both were pushed back on as too coarse: Contest's "core mechanic" conflated entity-state modelling with the phrase engine itself, and didn't have anywhere for world-building/observation content to live distinctly from duel dialogue. Great Hall's two-milestone shape had nowhere for the progress-tracking feature, which is additive rather than corrective. The final ten-milestone structure reflects that correction.

Two tasks are worth flagging as non-standard:

- **2PE.6** is a standalone note-task, not a build task: it records an open architectural question (should the phrase engine eventually live in Riffle?) that was explicitly decided *not* to block M2 on. It has no outgoing dependency; it exists purely so the question isn't lost.
- **2PE.5** (round end conditions) has no incoming dependency and can be worked in parallel with 2PE.1-2PE.3, but its output feeds 2PE.4's judging logic.

## External blockers (flag early)

None currently modelled as roadmap gates. The Riffle repository's auto-sync was raised as a candidate external blocker during planning, but the user resolved it into M8-M10 as ordinary sequential work within this phase rather than an external gate — Flyt's own team controls both repos, so nothing here is genuinely outside project control.
