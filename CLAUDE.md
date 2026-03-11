# Flyt — Project Guide for Claude

## What This Is
An interactive fiction game about Norse flyting (ritualized insult poetry contests). Built with a non-standard stack: **DendryNexus** engine + **Svelte 5** frontend + **TypeScript**.

## Tech Stack

### DendryNexus (the narrative engine)
- A niche IF engine by Autumn Chen, extending Dendry with StoryNexus-like card/deck mechanics
- **Not on npm** — designed as a CLI tool (`dendrynexus compile`, `dendrynexus make-html`)
- Repo: https://github.com/aucchen/dendrynexus (extends https://github.com/aucchen/dendry)
- We use a **custom integration**: our own compiler (`scripts/compile-dendry.js`) parses `.dry` files into `static/game.json`, and a Svelte-native engine wrapper (`src/engine/`) consumes it with `$state`/`$derived` reactivity
- The default Dendry browser runtime (Browserify + Handlebars) is NOT used
- Full upstream feature reference: `docs/dendrynexus-reference.md`

### Svelte 5 (the frontend)
- SvelteKit in **SPA mode** (`adapter-static`, `ssr: false`, `prerender: true`)
- Svelte 5 runes throughout: `$state`, `$derived`, `$derived.by`, `$props`
- **Do NOT use** legacy Svelte syntax (`export let`, `$:`, stores, `{#each ... as}` without `(key)`)
- Path aliases: `$engine` → `src/engine`, `$components` → `src/components`

### Aesthetic
- Bronze/iron age Scandinavia: aged bronze, dark iron, parchment, hearth-fire palette
- Fonts: Cinzel (headings), Cormorant Garamond (body)
- CSS custom properties defined in `src/app.css` — always use `var(--token)` not raw colours

## Project Structure

```
story/                          # ALL narrative content lives here
  game.dry                      # Game metadata (title, author, first-scene)
  qualities.dry                 # Quality/stat definitions
  scenes/                       # Scene files — one or more per .scene.dry
    *.scene.dry                 # Scene content, choices, branching

scripts/
  compile-dendry.js             # .dry → static/game.json compiler

src/
  engine/                       # Svelte 5 reactive engine wrapper
    types.ts                    # TypeScript interfaces for game data
    engine.svelte.ts            # RiffleEngine class (reactive game state)
    index.ts                    # Barrel export
  components/                   # UI components
    SceneView.svelte            # Renders current scene + choices
    CheckResultBanner.svelte    # Shows stat check result after a card play
    QualitiesPanel.svelte       # Sidebar showing quality values
    StatBar.svelte              # Individual quality display
  routes/                       # SvelteKit pages
    +layout.svelte              # App shell, header, footer
    +layout.ts                  # SPA config (ssr: false)
    +page.svelte                # Main game page

static/
  game.json                     # COMPILED output (gitignored, regenerated)
  favicon.svg

docs/
  dendrynexus-reference.md      # Full DendryNexus feature reference & gap analysis
```

## The .dry File Format

Dendry content is authored in `.dry` files. This is a custom plain-text format, NOT markdown.

### game.dry (metadata)
```
title: Game Title
author: Author Name
ifid: unique-id
first-scene: scene_id
```

### qualities.dry (stats/variables)
```
@quality quality_id
name: Display Name
type: integer|fudge|onOff|wordScale|raw
initial: 0
min: 0
max: 10
category: Stats
```

### *.scene.dry (scenes)
A single file can contain MULTIPLE scenes, each starting with `@scene`:
```
@scene scene_id
title: Scene Title
subtitle: Optional Subtitle
unavailable-subtitle: Shown when choose-if fails
tags: tag1, tag2
on-arrival: quality1 = quality1 + 1; quality2 = 5
on-departure: quality1 = quality1 - 1
on-display: quality1 = quality1 + 1
view-if: quality1 > 3
choose-if: quality2 >= 1
go-to: other_scene
max-visits: 1
count-visits-max: 5
new-page: true
set-root: true
game-over: true
call: helper_scene
order: 1
priority: 2
frequency: 100
min-choices: 1
max-choices: 3

Narrative text goes here. Supports *emphasis* and **strong**.

Variable display: [+ quality_name +]
Conditional text: [? if condition : text ?]

- @target_scene_id: Choice text displayed to player
- @another_scene: Another choice
- #tag_name: All scenes with this tag as choices
```

### Conditional Go-To (multiple targets with predicates)
```
go-to: scene_a if courage >= 5; scene_b if courage >= 3; scene_c
```
Predicates are evaluated in order. First match wins. Last entry can omit the predicate as a fallback.

### Go-To-Ref (indirect navigation)
```
go-to-ref: quality_name
```
Navigates to the scene whose ID is stored in the quality's value.

### Choice-Level Properties
Choices can have their own properties on indented lines below:
```
- @scene_id: Choice text
  view-if: condition
  choose-if: condition
  order: 1
  priority: 2
  frequency: 50
```

### DendryNexus Card/Deck/Hand System

**Hand scene** — displays drawn cards, decks to draw from, and pinned cards:
```
@scene hall
is-hand: true
max-cards: 5          # Hand size limit (default 5)

- @my_deck: Draw from Deck
- @pinned_action: Always Available Action
- @normal_choice: Regular choice
```

**Deck scene** — its choices are the card pool:
```
@scene my_deck
is-deck: true
card-image: deck.png

- @card_a: Card A
- @card_b: Card B
- #card_tag: All cards with this tag
```

**Card scene** — a playable card in a deck:
```
@scene card_a
is-card: true
priority: 2           # Higher priority = drawn first (default 1)
frequency: 100        # Random weight among same priority (default 100)
max-visits: 1         # Disappears after one play
card-image: card.png
```

**Pinned card** — always available, no hand slot:
```
@scene pinned_action
is-pinned-card: true
```

### Priority System (controls card draw order)
- **priority** (integer, default 1): Higher priority cards are committed first
- **frequency** (float, default 100): Among same-priority cards, lower frequency = more likely drawn
- **max-visits** (integer): Cards with `max-visits: 1` disappear after being played
- Use `priority: 2` (or higher) on intro/story cards to guarantee they appear first

### Difficulty Checks
```
@scene challenge
check-quality: wit
broad-difficulty: 5         # OR narrow-difficulty: 5
difficulty-scaler: 0.6      # Broad check curve (default 0.6)
difficulty-increment: 0.1   # Narrow check curve (default 0.1)
check-success-go-to: win
check-failure-go-to: lose
```

**Broad check**: `success = scaler * (stat / difficulty)` — ratio-based, forgiving
**Narrow check**: `success = 0.5 + (stat - difficulty) * increment` — linear, tighter

Difficulty labels shown on choices: straightforward / low risk / very modest / modest / chancy / very chancy / tough / high-risk / almost impossible

### Command Syntax (on-arrival, on-departure, on-display)
Commands are semicolon-separated assignments:
```
on-arrival: gold = gold + 10; reputation = reputation + 1
on-departure: visited_tavern = 1
```
Expressions can reference any quality by name and use arithmetic: `+`, `-`, `*`, `/`.

### Content Markup
```
*italic text*
**bold text**
[+ quality_name +]                         # Quality interpolation
[? if quality > 3 : conditional text ?]    # Conditional text
```

## Key Commands

```bash
npm run compile:dendry    # Compile story/.dry → static/game.json
npm run dev               # Start Vite dev server
npm run build             # Compile dendry + production build
npm run check             # TypeScript + Svelte type checking
```

**After editing ANY .dry file, you MUST run `npm run compile:dendry` before testing.**

## Engine Architecture

`RiffleEngine` (in `src/engine/engine.svelte.ts`) is a class using Svelte 5 runes:
- `game: CompiledGame | null` — loaded game data ($state)
- `state: GameState` — current scene, qualities, visits, history, per-hand card state ($state)
- `currentScene` — derived from state.currentSceneId ($derived)
- `display: DisplayContent` — rendered title/body/choices for the UI ($derived)
- `qualityList` — all qualities with current values ($derived)
- `load(url)` — fetch and parse game.json
- `choose(sceneId)` — transition to a scene (handles departure/arrival/auto-navigation)
- `drawCard(deckId)` — draw a card from a deck into current hand (uses priority/frequency)
- `playCard(cardId)` — play a hand card (removes from hand, navigates to card scene)
- `playPinnedCard(cardId)` — play a pinned card (navigates without hand management)
- `discardCard(cardId)` — discard without playing
- `restart()` — reset to initial state

The engine handles:
- Scene transitions with on-departure/on-arrival/on-display actions
- Quality mutations via command execution
- Condition evaluation for view-if/choose-if
- Priority/frequency-based choice selection and card drawing
- max-visits filtering for scenes and cards
- Tag-based choice expansion (#tag syntax)
- Conditional go-to with predicates, go-to-ref, set-root
- Difficulty checks (broad + narrow) with configurable curves
- Per-hand-scene card state (hands, discards)
- Content rendering: bold, italic, quality interpolation, conditional text
- Difficulty labels on choices (Fallen London style)

## Common Pitfalls
- `static/game.json` is gitignored — it must be compiled, not hand-edited
- Scene IDs in .dry files must match the `@scene id` exactly (case-sensitive, underscores OK)
- Choice targets use `@scene_id` prefix: `- @scene_id: Choice text`
- Tag choices use `#tag` prefix: `- #tag_name: Choice text`
- The compiler only runs on `story/` directory — don't put .dry files elsewhere
- Svelte 5: use `$state()` not `let`, `$derived` not `$:`, `$props()` not `export let`
- Intro cards should use `priority: 2` + `max-visits: 1` to appear first then disappear
- The `tagLookup` in game.json maps tag names → scene ID arrays; built automatically by the compiler
