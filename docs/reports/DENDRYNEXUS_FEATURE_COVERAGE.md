# DendryNexus feature coverage

| Prop | Value |
|---|---|
| Date | 2026-10-15 |
| Roadmap | 5AU.3 |
| Feeds | 6RM.1 (triage), alongside 5AU.1 and 5AU.2 |
| Regenerate | `npm run audit:dendry` |

## Scope and method

`scripts/audit-dendry-features.js` walks every subgame under `story/`, parses each `.dry` file the way `scripts/compile-dendry.js` does and tallies every feature catalogued in `docs/dendrynexus-reference.md`: scene properties, choice forms, choice-level properties, content markup and quality types. Each row records whether the compiler carries the feature into the JSON, how many times each subgame uses it and up to three `file:scene` locations. Properties the catalogue does not know are listed at the end, so new syntax is visible the moment it lands. The tables below the marker are generated; everything above it is hand-written and survives a regeneration.

The pre-interview check already confirmed a clean compile and zero dangling choice, go-to or call targets. This audit asks a different question: of the features the reference says exist, which ones does the content actually touch?

## Findings

| # | Severity | Location | Finding | Recommended disposition |
|---|---|---|---|---|
| F1 | High | `story/great-hall/scenes/showcase.scene.dry`, `gotoref_demo` (lines 232 to 253) | The Go-To-Ref demo does not use `go-to-ref`. It routes with ordinary `@scene` choices and says so in its own prose. Its `on-arrival` writes `destination = 0`, a quality `qualities.dry` never declares. The compiler parses `go-to-ref` and Riffle implements it, so the demo could be real; the open question is whether `on-arrival` can store a scene ID in a quality, since the compiler reads `initial` as a number and the quality types are all numeric. | Triage decides: either make the demo genuine (needs a string-valued quality, which is a compiler and engine question) or retitle it as a placeholder so the showcase stops claiming coverage it lacks. Either way, declare `destination` or drop the assignment. |
| F2 | Medium | Whole of `story/great-hall` | Sixteen features the compiler parses are never used: `count-visits-max`, `go-to-ref`, `game-over`, `on-departure`, `order`, `min-choices`, `max-choices`, `card-image`, all five choice-level properties and the `fudge`, `wordScale` and `raw` quality types. `min-choices` and `max-choices` matter most: with neither set, Riffle's `applyPrioritySelection` returns early, so priority and frequency are only ever exercised through the card-draw path, never through a scene's choice list. | Triage decides which of these the Great Hall should demonstrate. A `max-choices` hand and a `game-over` ending are the two cheapest additions with the largest coverage gain. |
| F3 | Medium | `story/great-hall/scenes/showcase.scene.dry` | Coverage outside the showcase is narrow. `new-page`, `tags`, `#tag` choices, `go-to` in both forms, `frequency`, `call`, `on-display`, `unavailable-subtitle`, `difficulty-scaler` and `difficulty-increment` appear in the showcase file only; `max-cards`, `is-hand` and `set-root` appear there and in `hall.scene.dry`. The merchant, skald and warrior decks use `is-card`, the check properties, `view-if`, `choose-if`, `max-visits`, `priority` and `on-arrival`, nothing else. | No fix on its own. The triage should weigh it when deciding the showcase's future: cutting or folding the showcase into the decks drops the exercised count from 36 to roughly 22. |
| F4 | Low | `story/contest` | One scene, twelve integer qualities, three features used (`title`, `subtitle`, `on-arrival`). Expected for scaffolding; recorded so the triage does not read the zero columns as gaps. | None. Contest coverage grows with M1 to M4. |
| F5 | Low | `docs/dendrynexus-reference.md`, lines 296 to 331 and 387 | The "What Our Engine Currently Implements vs. Upstream" section and the closing note on choice-level properties describe the pre-Riffle engine. The compiler now parses tag choices, conditional `go-to`, `go-to-ref`, `set-root`, `new-page`, `on-display`, `call`, `count-visits-max`, the difficulty tuning fields and choice-level properties (`compile-dendry.js` lines 106 to 117 and 211 to 247); Riffle's README claims the runtime side. The twelve features the compiler ignores (`style`, `signal`, `set-jump`, `is-special`, `go-sub`, `go-sub-end`, `frequency-var`, `face-image`, `set-bg`, `set-sprites`, `audio`, `achievement`) are the real remaining gap, and none of them has content pressure behind it. | Refresh that section as part of 6RM.1's doc fixes. Out of scope here: this task reports on the reference, it does not rewrite it. |

<!-- generated:start -->

## Coverage summary

36 of 64 catalogued features are exercised by current content. 16 are parsed by the compiler but never used; 12 are neither parsed nor used.

| Subgame | Scenes |
|---|---|
| contest | 1 |
| great-hall | 94 |

## Scene: core display

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `title` | parsed | 1 | 94 | `scenes/intro.scene.dry:intro`, `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire` |
| `subtitle` | parsed | 1 | 82 | `scenes/intro.scene.dry:intro`, `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire` |
| `unavailable-subtitle` | parsed | 0 | 1 | `scenes/showcase.scene.dry:unavailable_locked` |
| `style` | ignored | 0 | 0 |  |
| `signal` | ignored | 0 | 0 |  |
| `tags` | parsed | 0 | 4 | `scenes/showcase.scene.dry:tavern_bard`, `scenes/showcase.scene.dry:tavern_fight`, `scenes/showcase.scene.dry:tavern_merchant` |

## Scene: conditions and gating

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `view-if` | parsed | 0 | 13 | `scenes/hall.scene.dry:rune_chamber`, `scenes/merchants.scene.dry:merchant_card_feast`, `scenes/merchants.scene.dry:merchant_card_begging` |
| `choose-if` | parsed | 0 | 9 | `scenes/merchants.scene.dry:merchant_card_mead`, `scenes/merchants.scene.dry:merchant_card_silver`, `scenes/merchants.scene.dry:merchant_card_gamble` |
| `max-visits` | parsed | 0 | 4 | `scenes/merchants.scene.dry:merchant_card_intro`, `scenes/showcase.scene.dry:priority_card_urgent`, `scenes/skalds.scene.dry:skald_card_intro` |
| `count-visits-max` | parsed | 0 | 0 |  |

## Scene: navigation

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `go-to (simple)` | parsed | 0 | 1 | `scenes/showcase.scene.dry:setroot_restore` |
| `go-to (conditional)` | parsed | 0 | 1 | `scenes/showcase.scene.dry:goto_branch_start` |
| `go-to-ref` | parsed | 0 | 0 |  |
| `set-root` | parsed | 0 | 3 | `scenes/hall.scene.dry:main_hall`, `scenes/showcase.scene.dry:setroot_demo`, `scenes/showcase.scene.dry:setroot_restore` |
| `set-jump` | ignored | 0 | 0 |  |
| `new-page` | parsed | 0 | 5 | `scenes/showcase.scene.dry:feature_showcase`, `scenes/showcase.scene.dry:goto_demo`, `scenes/showcase.scene.dry:setroot_demo` |
| `is-special` | ignored | 0 | 0 |  |
| `game-over` | parsed | 0 | 0 |  |
| `go-sub` | ignored | 0 | 0 |  |
| `go-sub-end` | ignored | 0 | 0 |  |

## Scene: actions

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `on-arrival` | parsed | 1 | 46 | `scenes/intro.scene.dry:intro`, `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire` |
| `on-departure` | parsed | 0 | 0 |  |
| `on-display` | parsed | 0 | 1 | `scenes/showcase.scene.dry:call_demo` |
| `call` | parsed | 0 | 1 | `scenes/showcase.scene.dry:call_demo` |

## Scene: choice selection

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `order` | parsed | 0 | 0 |  |
| `priority` | parsed | 0 | 8 | `scenes/merchants.scene.dry:merchant_card_intro`, `scenes/showcase.scene.dry:priority_card_urgent`, `scenes/showcase.scene.dry:priority_card_important_1` |
| `frequency` | parsed | 0 | 2 | `scenes/showcase.scene.dry:priority_card_normal_rare`, `scenes/showcase.scene.dry:priority_card_normal_common` |
| `frequency-var` | ignored | 0 | 0 |  |
| `min-choices` | parsed | 0 | 0 |  |
| `max-choices` | parsed | 0 | 0 |  |

## Scene: card/deck/hand

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `is-hand` | parsed | 0 | 3 | `scenes/hall.scene.dry:main_hall`, `scenes/showcase.scene.dry:priority_demo`, `scenes/showcase.scene.dry:tag_demo_hand` |
| `is-deck` | parsed | 0 | 5 | `scenes/merchants.scene.dry:merchants_deck`, `scenes/showcase.scene.dry:priority_deck`, `scenes/showcase.scene.dry:tag_deck` |
| `is-card` | parsed | 0 | 37 | `scenes/merchants.scene.dry:merchant_card_intro`, `scenes/merchants.scene.dry:merchant_card_mead`, `scenes/merchants.scene.dry:merchant_card_silver` |
| `is-pinned-card` | parsed | 0 | 1 | `scenes/hall.scene.dry:rest_by_fire` |
| `card-image` | parsed | 0 | 0 |  |
| `face-image` | ignored | 0 | 0 |  |
| `max-cards` | parsed | 0 | 3 | `scenes/hall.scene.dry:main_hall`, `scenes/showcase.scene.dry:priority_demo`, `scenes/showcase.scene.dry:tag_demo_hand` |

## Scene: difficulty checks

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `check-quality` | parsed | 0 | 15 | `scenes/merchants.scene.dry:merchant_card_gamble`, `scenes/showcase.scene.dry:diff_curve_easy_broad`, `scenes/showcase.scene.dry:diff_curve_harsh_broad` |
| `broad-difficulty` | parsed | 0 | 8 | `scenes/merchants.scene.dry:merchant_card_gamble`, `scenes/showcase.scene.dry:diff_curve_easy_broad`, `scenes/showcase.scene.dry:diff_curve_harsh_broad` |
| `narrow-difficulty` | parsed | 0 | 7 | `scenes/showcase.scene.dry:diff_curve_easy_narrow`, `scenes/showcase.scene.dry:diff_curve_harsh_narrow`, `scenes/warriors.scene.dry:warrior_card_brawl` |
| `difficulty-scaler` | parsed | 0 | 2 | `scenes/showcase.scene.dry:diff_curve_easy_broad`, `scenes/showcase.scene.dry:diff_curve_harsh_broad` |
| `difficulty-increment` | parsed | 0 | 2 | `scenes/showcase.scene.dry:diff_curve_easy_narrow`, `scenes/showcase.scene.dry:diff_curve_harsh_narrow` |
| `check-success-go-to` | parsed | 0 | 15 | `scenes/merchants.scene.dry:merchant_card_gamble`, `scenes/showcase.scene.dry:diff_curve_easy_broad`, `scenes/showcase.scene.dry:diff_curve_harsh_broad` |
| `check-failure-go-to` | parsed | 0 | 15 | `scenes/merchants.scene.dry:merchant_card_gamble`, `scenes/showcase.scene.dry:diff_curve_easy_broad`, `scenes/showcase.scene.dry:diff_curve_harsh_broad` |

## Scene: multimedia

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `set-bg` | ignored | 0 | 0 |  |
| `set-sprites` | ignored | 0 | 0 |  |
| `audio` | ignored | 0 | 0 |  |
| `achievement` | ignored | 0 | 0 |  |

## Choices

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `choice: @scene` | parsed | 0 | 136 | `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire`, `scenes/hall.scene.dry:rune_chamber` |
| `choice: #tag` | parsed | 0 | 1 | `scenes/showcase.scene.dry:tag_deck` |
| `choice: view-if` | parsed | 0 | 0 |  |
| `choice: choose-if` | parsed | 0 | 0 |  |
| `choice: order` | parsed | 0 | 0 |  |
| `choice: priority` | parsed | 0 | 0 |  |
| `choice: frequency` | parsed | 0 | 0 |  |

## Content markup

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `markup: *italic*` | parsed | 0 | 17 | `scenes/merchants.scene.dry:merchant_card_intro`, `scenes/showcase.scene.dry:feature_showcase`, `scenes/showcase.scene.dry:priority_card_normal_rare` |
| `markup: **bold**` | parsed | 0 | 183 | `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire`, `scenes/hall.scene.dry:rune_chamber` |
| `markup: [+ quality +]` | parsed | 0 | 84 | `scenes/hall.scene.dry:main_hall`, `scenes/hall.scene.dry:rest_by_fire`, `scenes/intro.scene.dry:intro` |
| `markup: [? if : ?]` | parsed | 0 | 13 | `scenes/hall.scene.dry:main_hall`, `scenes/showcase.scene.dry:feature_showcase`, `scenes/showcase.scene.dry:conditional_text_demo` |

## Quality types

| Feature | Compiler | contest | great-hall | Examples |
|---|---|---|---|---|
| `quality: integer` | parsed | 12 | 5 | `qualities.dry:turn`, `qualities.dry:inner_zone`, `qualities.dry:middle_zone` |
| `quality: fudge` | parsed | 0 | 0 |  |
| `quality: onOff` | parsed | 0 | 1 | `qualities.dry:has_rune_stone` |
| `quality: wordScale` | parsed | 0 | 0 |  |
| `quality: raw` | parsed | 0 | 0 |  |

## Properties outside the catalogue

None: every property in the content appears in `docs/dendrynexus-reference.md`.

<!-- generated:end -->
