# Flyt

A Norse contest of words — interactive fiction built with [DendryNexus](https://github.com/aucchen/dendrynexus) and [Svelte 5](https://svelte.dev).

Set in the bronze and iron age halls of Scandinavia, you must defend your honour through *flyting* — the ancient art of ritualized insult poetry.

## Setup

```bash
npm install
npm run compile:dendry   # compile .dry story files → static/game.json
npm run dev              # start dev server
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Compile story + production build |
| `npm run preview` | Preview production build locally |
| `npm run compile:dendry` | Compile `story/*.dry` → `static/game.json` |
| `npm run check` | TypeScript + Svelte type checking |

## Project Structure

```
story/                  # Dendry content files (.dry)
  game.dry              # Game metadata (title, author, first-scene)
  qualities.dry         # Stats/qualities definitions
  scenes/               # Scene files (.scene.dry)
src/
  engine/               # TypeScript engine wrapper for DendryNexus game data
  components/           # Svelte UI components
  routes/               # SvelteKit pages
scripts/
  compile-dendry.js     # Compiles .dry files to game.json
.claude/
  hooks/                # Auto-compile on .dry edits, install deps on session start
  skills/               # /compile-dendry, /add-scene, /add-quality
  settings.json         # Hook registration
CLAUDE.md               # Full reference for the DendryNexus + Svelte 5 stack
```

## Writing Content

Story content lives in `story/` as `.dry` files following the [Dendry format](https://github.com/aucchen/dendry). Run `npm run compile:dendry` after editing to update `static/game.json`.
