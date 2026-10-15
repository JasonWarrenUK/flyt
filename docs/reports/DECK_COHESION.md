# Great Hall deck cohesion

| Prop | Value |
|---|---|
| Date | 2026-10-15 |
| Roadmap | 5AU.2 |
| Feeds | 6RM.1 (triage), alongside 5AU.1 and 5AU.3 |
| Regenerate | `npm run audit:cohesion` |

## Scope and method

`scripts/audit-deck-cohesion.js` groups every Great Hall scene by the file that declares it (one file per deck, plus the hub and the intro) and asks four mechanical questions. Which qualities does each group write, gate on and read? Which scene links cross a file boundary, and by what route? Which groups affect which others, where "affect" means one writes a quality the other gates on? And can the first scene reach every scene at all? Identifiers that no quality declares, link targets that no scene declares and scenes with no way out are listed alongside. The tables below the marker are generated; the findings above it are hand-written and survive a regeneration.

The pre-interview compile check already established zero dangling targets. This audit confirms that from the content side (every scene reachable, no undeclared link target) and goes on to the question 5AU.2 asks: whether the decks are a system or four demos sharing a lobby.

## Findings

| # | Severity | Location | Finding | Recommended disposition |
|---|---|---|---|---|
| F1 | High | `hall.scene.dry`, `main_hall` (line 7) | The hub pays `reputation + 1` on every arrival, and the content decks return to it through 39 choices and no other route. Reputation starts at 1 with a cap of 10, so a player who draws and plays nine cards of any kind has maxed it regardless of outcome. Every reputation gate in the content (`merchant_card_patron` at 6+, `merchant_card_hustle` at 2 or lower, the two hub conditionals at 8+, the showcase's at 5+ and 7+) is decided by visit count, and the reputation rewards and penalties the decks hand out (20 writes across merchants, skalds and warriors) are drowned by the hub's own increment. | Triage decides whether the hub increment is a demo artefact or intended. Dropping it, or moving it to a once-only `max-visits` card, makes the decks' reputation economy mean something. |
| F2 | High | `merchants`, `skalds`, `warriors` (every return choice) | Structurally the Great Hall is a star with the hub at its centre. Every cross-file link is either hub → deck (one choice each) or deck → hub (11, 14 and 14 return choices). No deck scene links to another deck's scene, no card from one deck appears in another deck's pool and no tag is shared between decks. The only mechanical ties between decks are the six shared qualities. | A structural fact for 5AU.1 and the triage to weigh; on its own it breaks nothing. If the Great Hall is meant to feel like one place, at least one cross-deck link (a card that sends the player into another deck, or a tag pool two decks draw from) would be the cheapest proof. |
| F3 | Medium | `skalds.scene.dry`, `skald_hard_win` (line 125); `hall.scene.dry`, `rune_chamber` | `has_rune_stone` is the only quality that behaves like a key: written once on the hard saga's success and read by two gates (the hub's Rune Chamber and the showcase's locked door). Reaching it needs `wit >= 5` to attempt the card and a broad check at difficulty 8, so at the minimum wit the success chance is `0.6 * 5 / 8`, under forty percent. That is the one piece of real cross-deck progression in the content and it is rare by design. | Keep it; it is the pattern the other decks lack. Worth noting for the triage that the Rune Chamber is the only hub content a deck can unlock. |
| F4 | Medium | `merchants`, `skalds`, `warriors`, `hall` | `mead` is written by four groups (mead changes in ten scenes) and gated on once, by `merchant_card_mead` at 1 or more. Starting mead is 2, so that gate is open from the first turn and stays open unless the player buys three rounds without a refill. Mead is a resource nothing spends against. | Either give mead a sink (a deck or card that costs it, a gate that needs several) or accept it as flavour and say so in the content. |
| F5 | Medium | `showcase.scene.dry`, `conditional_text_demo` (line 323) | The explanatory prose contains live markup: the sentence "using the `[? if condition : text ?]` syntax" is itself a conditional whose predicate is the undeclared identifier `condition`. The audit caught it as an identifier no quality declares; the renderer will treat it as a conditional block. | Rewrite the sentence so the syntax is described without being written, or confirm in-app that the renderer leaves backticked markup alone and record that. `destination` in `gotoref_demo` is the other undeclared identifier; see 5AU.3's F1. |
| F6 | Low | `skalds`, `warriors` | Cross-stat gating already exists in the two stat decks: skalds has `skald_card_battle_poet` (courage 5+) and `skald_card_timid_verse` (courage 2 or lower), warriors has `warrior_card_war_chant` (wit 5+) and `warrior_card_cornered` (wit 3 or lower). The merchants deck gates on silver and reputation only, so a player's wit and courage never change what the merchants offer. | Flag for the triage as the obvious place to extend the pattern if the decks are meant to feel aware of each other. |

<!-- generated:start -->

## Groups

One group per `.dry` file. Writes: qualities assigned in `on-arrival`, `on-departure` or `on-display`. Gates: qualities read by `view-if`, `choose-if`, `check-quality`, a `go-to` predicate or conditional text. Reads: qualities interpolated or used on the right-hand side of a command.

| Group | Scenes | Writes | Gates | Reads |
|---|---|---|---|---|
| hall | 3 | `mead` ×1, `reputation` ×2 | `has_rune_stone` ×2, `reputation` ×1 | `mead` ×2, `reputation` ×3 |
| intro | 1 |  |  | `courage` ×1, `wit` ×1 |
| merchants | 13 | `mead` ×4, `reputation` ×5, `silver` ×9, `wit` ×2 | `mead` ×1, `reputation` ×2, `silver` ×5, `wit` ×1 | `mead` ×9, `reputation` ×10, `silver` ×19, `wit` ×4 |
| showcase | 37 | `courage` ×1, `destination` ×1, `reputation` ×2, `silver` ×2, `wit` ×2 | `condition` ×1, `courage` ×6, `has_rune_stone` ×1, `reputation` ×3, `silver` ×3, `wit` ×4 | `courage` ×9, `reputation` ×5, `silver` ×5, `wit` ×7 |
| skalds | 20 | `courage` ×3, `has_rune_stone` ×1, `mead` ×2, `reputation` ×9, `silver` ×1, `wit` ×9 | `courage` ×2, `wit` ×9 | `courage` ×6, `mead` ×4, `reputation` ×15, `silver` ×2, `wit` ×20 |
| warriors | 20 | `courage` ×12, `mead` ×3, `reputation` ×6, `silver` ×4, `wit` ×2 | `courage` ×9, `wit` ×2 | `courage` ×20, `mead` ×5, `reputation` ×9, `silver` ×5, `wit` ×4 |

## Scene links that cross a group boundary

| From → to | Links | Via | Source scenes |
|---|---|---|---|
| hall → merchants | 1 | choice | `main_hall` |
| hall → showcase | 1 | choice | `main_hall` |
| hall → skalds | 1 | choice | `main_hall` |
| hall → warriors | 1 | choice | `main_hall` |
| intro → hall | 1 | choice | `intro` |
| merchants → hall | 11 | choice | `merchants_deck`, `merchant_card_mead`, `merchant_card_silver` and 8 more |
| showcase → hall | 2 | choice | `feature_showcase`, `priority_demo` |
| skalds → hall | 14 | choice | `skalds_deck`, `skald_easy_win`, `skald_easy_fail` and 11 more |
| warriors → hall | 14 | choice | `warriors_deck`, `brawl_win`, `brawl_fail` and 11 more |

## Groups that affect each other through qualities

A row means the first group writes a quality the second group gates on.

| Writer → gater | Qualities |
|---|---|
| hall → merchants | `mead`, `reputation` |
| hall → showcase | `reputation` |
| merchants → hall | `reputation` |
| merchants → showcase | `reputation`, `silver`, `wit` |
| merchants → skalds | `wit` |
| merchants → warriors | `wit` |
| showcase → hall | `reputation` |
| showcase → merchants | `reputation`, `silver`, `wit` |
| showcase → skalds | `courage`, `wit` |
| showcase → warriors | `courage`, `wit` |
| skalds → hall | `has_rune_stone`, `reputation` |
| skalds → merchants | `mead`, `reputation`, `silver`, `wit` |
| skalds → showcase | `courage`, `has_rune_stone`, `reputation`, `silver`, `wit` |
| skalds → warriors | `courage`, `wit` |
| warriors → hall | `reputation` |
| warriors → merchants | `mead`, `reputation`, `silver`, `wit` |
| warriors → showcase | `courage`, `reputation`, `silver`, `wit` |
| warriors → skalds | `courage`, `wit` |

## Reachability from `intro`

94 of 94 scenes are reachable by following choices, go-to, check targets, call and tag expansion.

## Scenes with no outgoing link

These rely on `set-root` to offer a way back.

| Scene | Group |
|---|---|
| `setroot_deadend` | showcase |

## Link targets that no scene declares

None.

## Identifiers no quality declares

| Identifier | Scenes |
|---|---|
| `condition` | `conditional_text_demo` |
| `destination` | `gotoref_demo` |

<!-- generated:end -->
