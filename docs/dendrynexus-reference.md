# DendryNexus Engine Reference

Complete reference for DendryNexus features, based on the [source code](https://github.com/aucchen/dendrynexus/tree/main/lib). This documents what the upstream engine supports so we know what our Svelte engine wrapper needs to handle.

## Architecture Overview

DendryNexus extends Dendry (a hypertext IF engine) with StoryNexus-inspired card/deck mechanics. The core flow is:

1. **Scenes** are nodes in a graph, connected by **choices** (options)
2. **Qualities** are numeric stats that gate choices and track progress
3. **Cards/Decks/Hands** overlay a card-game metaphor on the choice system
4. **Difficulty checks** resolve card plays probabilistically

---

## Scene Properties

Every `@scene` block can have these properties (use `kebab-case` in `.dry` files):

### Core Display
| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Display title |
| `subtitle` | string | Secondary text shown below title |
| `unavailable-subtitle` | string | Shown when `choose-if` fails |
| `content` | text | Narrative body (everything after properties) |
| `style` | string | CSS class/style hint |
| `signal` | string | Event name emitted on arrival/departure |
| `tags` | comma-list | Tags for tag-based choice lookup (`#tag` syntax) |

### Conditions & Gating
| Property | Type | Description |
|----------|------|-------------|
| `view-if` | predicate | Condition to be visible as a choice |
| `choose-if` | predicate | Condition to be selectable (greyed out if false) |
| `max-visits` | integer | Hide scene after N visits |
| `count-visits-max` | integer | Stop incrementing visit counter after this value |

**How `max-visits` works:** In `__filterViewable`, if `visits[id] >= maxVisits`, the scene is excluded from the choice list entirely. This is how cards disappear after being played.

### Navigation
| Property | Type | Description |
|----------|------|-------------|
| `go-to` | scene ID(s) | Auto-navigate after displaying. Multiple IDs = random pick. Supports predicates for conditional routing. |
| `go-to-ref` | quality name | Navigate to the scene ID stored in this quality's value |
| `set-root` | boolean | Sets this scene as the "root" — the fallback when no choices exist ("Continue...") |
| `set-jump` | scene ID | Stores a jump target for later `jumpScene` navigation |
| `new-page` | boolean | Clears previous content on arrival |
| `is-special` | boolean | Special scene (e.g. stats/inventory page); arrival actions skipped on return |
| `game-over` | boolean | Ends the game |

### Actions
| Property | Type | Description |
|----------|------|-------------|
| `on-arrival` | commands | Semicolon-separated assignments executed on entering |
| `on-departure` | commands | Executed on leaving |
| `on-display` | commands | Executed when content is displayed |
| `call` | scene ID | Also run that scene's on-arrival (without navigating to it) |

### Choice Selection (Priority System)
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `order` | integer | 0 | **Display sort order.** Lower values appear first. |
| `priority` | integer | 1 | **Selection priority.** Higher priority choices are included first when `max-choices` limits apply. |
| `frequency` | float | 100 | **Random weight.** When candidates of equal priority compete for limited slots, lower frequency = more likely to be chosen. |
| `frequency-var` | expression | — | Dynamic frequency from a quality expression |
| `min-choices` | integer | — | Minimum number of choices to show |
| `max-choices` | integer | — | Maximum number of choices to show |

**This is the key mechanism for controlling card draw order.** See [Priority System](#priority-system) below.

### Card/Deck Extensions (DendryNexus-specific)
| Property | Type | Description |
|----------|------|-------------|
| `is-hand` | boolean | This scene displays as a card hand (shows decks + drawn cards + pinned cards) |
| `is-deck` | boolean | This scene acts as a card deck (its choices are drawable cards) |
| `is-card` | boolean | This scene is a playable card |
| `is-pinned-card` | boolean | Always-visible card choice (not drawn from deck, always available) |
| `card-image` | string | Image path for deck/card visual |
| `face-image` | string | Additional image for the card face |
| `max-cards` | integer | Maximum hand size for a hand scene |

### Difficulty Checks
| Property | Type | Description |
|----------|------|-------------|
| `check-quality` | quality ID | The stat being tested |
| `broad-difficulty` | number | Target for broad check |
| `narrow-difficulty` | number | Target for narrow check |
| `difficulty-scaler` | float | Scaler for broad checks (default 0.6) |
| `difficulty-increment` | float | Increment for narrow checks (default 0.1) |
| `check-success-go-to` | scene ID | Navigate here on success |
| `check-failure-go-to` | scene ID | Navigate here on failure |

### Multimedia
| Property | Type | Description |
|----------|------|-------------|
| `set-bg` | string | Set background image/style |
| `set-sprites` | sprite config | Set character sprites |
| `audio` | string | Play audio |
| `achievement` | string | Unlock an achievement |

---

## Priority System

This is the most important mechanism for controlling which choices (and by extension, which cards) appear. It answers the question: **"How do we show intro cards before anything else?"**

### How `__filterByPriority` Works

When a scene has `min-choices` / `max-choices` set, the engine uses a priority+frequency system to select which choices to display:

1. **Sort all eligible choices by `priority` (descending)** — highest priority first
2. **Commit choices by priority tier:**
   - Walk through priority tiers from highest to lowest
   - Each tier's choices are "committed" (guaranteed to appear)
   - Stop adding tiers once `min-choices` is met
3. **If more candidates remain than `max-choices` allows:**
   - Among the remaining same-priority candidates, use `frequency` as a random weight
   - Lower `frequency` = higher chance of selection (it divides the random roll)
4. **Sort final selection by `order` for display**

### Example: Intro Cards First

```
@scene great_hall_deck
is-deck: true
max-choices: 3

- @intro_card_1: Meet the Jarl
- @intro_card_2: Survey the Hall
- @regular_card_1: Challenge a Warrior
- @regular_card_2: Speak with Skalds

@scene intro_card_1
is-card: true
priority: 2
max-visits: 1
...

@scene regular_card_1
is-card: true
priority: 1
...
```

With `priority: 2`, intro cards are committed first. With `max-visits: 1`, they vanish after one play. Once all priority-2 cards are gone, the engine falls back to priority-1 cards.

### How `frequency` Works

When there are more candidates of the same priority than slots available:
- Each candidate gets a selection score: `random() / frequency`
- Candidates are sorted by this score (ascending)
- The top N are chosen

So `frequency: 200` is roughly twice as likely to appear as `frequency: 100`. Setting `frequency: 0` (or null) gives a selection priority of 0, making it least likely.

---

## Card/Deck/Hand System

### Scene Roles

```
Hand Scene (is-hand: true)
├── Deck 1 (is-deck: true)     → click to draw
│   ├── Card A (is-card: true) → drawn into hand
│   ├── Card B (is-card: true)
│   └── Card C (is-card: true)
├── Deck 2 (is-deck: true)
│   └── ...
└── Pinned Card (is-pinned-card: true) → always visible, click to play directly
```

### How Drawing Works (upstream `_drawFromDeck`)

1. Get the deck scene's options
2. Run `_compileChoices` on the deck — this applies `view-if`, `max-visits`, priority filtering
3. Filter to only `is-card: true` scenes not already in hand
4. Pick one at random from the remaining eligible cards
5. Add to `currentHands[handSceneId]` array

**Key insight:** Drawing uses `_compileChoices`, which applies the full priority/frequency system. So `priority` on cards (or their options in the deck) controls draw order when `max-choices` is set on the deck.

### How Display Works (upstream `displayChoices`)

When the current scene `isHand`:
1. Separate choices into **decks**, **pinned cards**, and other
2. For each deck, check if it has drawable cards (disable if empty)
3. Filter hand cards against current `view-if`/`choose-if` conditions
4. Call `ui.displayDecks(decks)`, `ui.displayHand(hand, maxCards)`, `ui.displayPinnedCards(pinnedCards)` separately

### How Playing Works

- **Regular card** (`playCard`): Remove from hand, navigate to card scene
- **Pinned card** (`playPinnedCard`): Just navigate (no hand management)

### Hand State

```javascript
state.currentHands = {}      // { handSceneId: [{ id, title, image }] }
state.lastDrawnCard = null   // Most recently drawn card
state.lastPlayedCard = null  // Most recently played card
```

Note: Upstream uses per-hand-scene storage (`currentHands[sceneId]`), allowing multiple independent hands. Our implementation uses a single global `hand[]` array.

---

## Difficulty Checks

### Broad Check (Fallen London style)
```
success_prob = scaler * (quality / difficulty)
```
- `scaler` defaults to 0.6
- Higher stat relative to difficulty = better odds
- Capped at 1.0

### Narrow Check
```
success_prob = (quality - difficulty) * increment + 0.5
```
- `increment` defaults to 0.1
- Linear, centered at 50% when stat equals difficulty
- Clamped to `[increment, 1.0]`

### Difficulty Display Labels
| Probability | Label |
|-------------|-------|
| ≤ 10% | almost impossible |
| ≤ 30% | high-risk |
| ≤ 40% | tough |
| ≤ 50% | very chancy |
| ≤ 60% | chancy |
| ≤ 70% | modest |
| ≤ 80% | very modest |
| ≤ 90% | low risk |
| > 90% | straightforward |

### Check Resolution

On entering a scene with `check-quality` + difficulty + success/failure targets:
1. Calculate success probability
2. Roll random number
3. If roll < probability → navigate to `check-success-go-to`
4. Otherwise → navigate to `check-failure-go-to`

Checks are resolved during `__changeScene`, after `on-arrival` runs but before choices are compiled.

---

## Tag-Based Choices

Instead of listing individual scene IDs, choices can reference tags:

```
@scene tavern
- #warrior_cards: Available Warriors
```

This pulls in ALL scenes tagged `warrior_cards` as choices. The `__getChoiceIdsFromOptions` function handles this:
- Options starting with `@` → direct scene reference
- Options starting with `#` → tag lookup (via `game.tagLookup`)

Each matching scene becomes a separate choice, inheriting the option's `view-if`, `order`, etc.

---

## Go-To System

### Simple go-to
```
go-to: next_scene
```

### Conditional go-to (multiple targets with predicates)
The upstream engine supports multiple go-to targets, each with a predicate. If multiple pass, one is chosen randomly:
```
go-to: scene_a if gold > 10
go-to: scene_b if gold <= 10
```

### Go-to-ref (indirect/dynamic)
```
go-to-ref: destination_quality
```
Navigates to the scene whose ID is stored in the quality's value.

### Go-sub (subroutines)
Scenes can call sub-scenes and return:
- `go-sub` — navigate to a subscene
- `go-sub-end` — return from subscene to caller

---

## What Our Engine Currently Implements vs. Upstream

### Implemented
- Scene navigation, choices, conditions (`view-if`, `choose-if`)
- Qualities, `on-arrival`, `on-departure`, command execution
- Card/deck/hand basics (draw, play, discard)
- Difficulty checks (broad + narrow)
- Content rendering (bold, italic, quality interpolation)
- `go-to` (simple, single target)
- `max-visits` (parsed but NOT checked in card eligibility)

### Missing / Partially Implemented
- **Priority/frequency system** — `order`, `priority`, `frequency` fields exist in types but are not used in draw logic or choice compilation
- **`max-visits` filtering** — parsed but not checked in `getEligibleCards` or choice display
- **`min-choices` / `max-choices`** — not implemented
- **Pinned cards** — parsed but no distinct behavior (treated as regular choices)
- **`max-cards` per hand** — we use a global `HAND_CAPACITY` constant instead of per-scene `max-cards`
- **Tag-based choices** (`#tag` syntax) — not supported by compiler or engine
- **Multiple go-to targets** with predicates — only simple single go-to
- **Go-to-ref** (indirect navigation) — not implemented
- **Go-sub** (subroutine scenes) — not implemented
- **`set-root`** — not implemented
- **`new-page`** — not implemented
- **`is-special`** — not implemented
- **`count-visits-max`** — not implemented
- **`frequency-var`** — not implemented
- **`difficulty-scaler` / `difficulty-increment`** — not parsed by compiler, not used in check math
- **`on-display`** actions — not implemented
- **`call`** — not implemented
- **Per-hand-scene state** — we use a single global hand, upstream uses `currentHands[sceneId]`
- **`lastDrawnCard` / `lastPlayedCard`** tracking — not implemented
- **Multimedia** (`set-bg`, `set-sprites`, `audio`) — not implemented
- **Achievements** — not implemented
- **Signals** — not implemented
- **Conditional text** (`[? if condition : text ?]`) — not implemented in renderer

---

## .dry Syntax Quick Reference

### Scene with all properties
```
@scene scene_id
title: Display Title
subtitle: Subtitle Text
unavailable-subtitle: Why you can't choose this
tags: tag1, tag2
view-if: quality1 > 3
choose-if: quality2 >= 1
on-arrival: gold = gold + 10; visited = 1
on-departure: gold = gold - 5
go-to: next_scene
max-visits: 1
order: 1
priority: 2
frequency: 100
min-choices: 1
max-choices: 3
new-page: true
set-root: true
is-hand: true
is-deck: true
is-card: true
is-pinned-card: true
card-image: card.png
max-cards: 5
check-quality: wit
broad-difficulty: 5
difficulty-scaler: 0.6
check-success-go-to: win_scene
check-failure-go-to: lose_scene

Narrative text goes here. Supports *emphasis* and **strong**.

Quality display: [+ quality_name +]
Conditional text: [? if quality > 3 : This text shows conditionally ?]

- @target_scene: Choice text
- @another_scene: Another choice
- #tag_name: All scenes with this tag
```

### Choice-level properties
Choices can also have their own `view-if`, `order`, `priority`, `frequency`:
```
- @scene_id: Choice text
  view-if: condition
  order: 1
  priority: 2
  frequency: 50
```
(Note: our compiler does not currently parse choice-level properties beyond id and title.)
