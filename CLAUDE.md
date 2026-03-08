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
    engine.svelte.ts            # FlytEngine class (reactive game state)
    index.ts                    # Barrel export
  components/                   # UI components
    SceneView.svelte            # Renders current scene + choices
    QualitiesPanel.svelte       # Sidebar showing quality values
  routes/                       # SvelteKit pages
    +layout.svelte              # App shell, header, footer
    +layout.ts                  # SPA config (ssr: false)
    +page.svelte                # Main game page

static/
  game.json                     # COMPILED output (gitignored, regenerated)
  favicon.svg
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
```

### *.scene.dry (scenes)
A single file can contain MULTIPLE scenes, each starting with `@scene`:
```
@scene scene_id
title: Scene Title
subtitle: Optional Subtitle
tags: tag1, tag2
on-arrival: quality1 = quality1 + 1; quality2 = 5
on-departure: quality1 = quality1 - 1
view-if: quality1 > 3
choose-if: quality2 >= 1
go-to: other_scene
max-visits: 1

Narrative text goes here. Supports *emphasis* and **strong**.

Variable display: [+ quality_name +]
Conditional text: [? if condition : text ?]

- @target_scene_id: Choice text displayed to player
- @another_scene: Another choice
```

### DendryNexus Extensions (card/deck mechanics)
```
@scene hand_scene
is-hand: true           # Displays as a hand of cards

@scene deck_scene
is-deck: true            # Acts as a card deck
card-image: path.png     # Visual for the deck

@scene card_scene
is-card: true            # This scene is a card
is-pinned-card: true     # Pinned card variant
card-image: path.png     # Card visual
check-quality: stat      # Stat check on this card
broad-difficulty: 5      # Difficulty for broad check
narrow-difficulty: 5     # Difficulty for narrow check
check-success-go-to: win_scene
check-failure-go-to: lose_scene
```

### Command Syntax (on-arrival, on-departure)
Commands are semicolon-separated assignments:
```
on-arrival: gold = gold + 10; reputation = reputation + 1
on-departure: visited_tavern = 1
```
Expressions can reference any quality by name and use arithmetic: `+`, `-`, `*`, `/`.

## Key Commands

```bash
npm run compile:dendry    # Compile story/.dry → static/game.json
npm run dev               # Start Vite dev server
npm run build             # Compile dendry + production build
npm run check             # TypeScript + Svelte type checking
```

**After editing ANY .dry file, you MUST run `npm run compile:dendry` before testing.**

## Engine Architecture

`FlytEngine` (in `src/engine/engine.svelte.ts`) is a class using Svelte 5 runes:
- `game: CompiledGame | null` — loaded game data ($state)
- `state: GameState` — current scene, qualities, visit counts, history ($state)
- `currentScene` — derived from state.currentSceneId ($derived)
- `display: DisplayContent` — rendered title/body/choices for the UI ($derived)
- `qualityList` — all qualities with current values ($derived)
- `load(url)` — fetch and parse game.json
- `choose(sceneId)` — transition to a scene (handles on-departure/on-arrival)
- `restart()` — reset to initial state

The engine handles: scene transitions, quality mutations via on-arrival/on-departure commands, condition evaluation for view-if/choose-if, and Dendry markup rendering (bold, italic, quality interpolation).

## Common Pitfalls
- `static/game.json` is gitignored — it must be compiled, not hand-edited
- Scene IDs in .dry files must match the `@scene id` exactly (case-sensitive, underscores OK)
- Choice targets use `@scene_id` prefix: `- @scene_id: Choice text`
- The compiler only runs on `story/` directory — don't put .dry files elsewhere
- Svelte 5: use `$state()` not `let`, `$derived` not `$:`, `$props()` not `export let`
