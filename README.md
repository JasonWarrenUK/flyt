# Flyt

A Norse contest of words — interactive fiction built with [DendryNexus](https://github.com/aucchen/dendrynexus) and [Svelte 5](https://svelte.dev).

Set in the bronze and iron age halls of Scandinavia, you must defend your honour through *flyting* — the ancient art of ritualized insult poetry.

## Setup

```bash
npm install
npm run compile:dendry   # compile .dry story files → static/game.json
npm run dev              # start dev server
```

## Project Structure

```
story/              # Dendry content files (.dry)
  game.dry          # Game metadata
  qualities.dry     # Stats/qualities definitions
  scenes/           # Scene files (.scene.dry)
src/
  engine/           # TypeScript engine wrapper for DendryNexus game data
  components/       # Svelte UI components
  routes/           # SvelteKit pages
scripts/
  compile-dendry.js # Compiles .dry files to game.json
```

## Writing Content

Story content lives in `story/` as `.dry` files following the [Dendry format](https://github.com/aucchen/dendry). Run `npm run compile:dendry` after editing to update `static/game.json`.
