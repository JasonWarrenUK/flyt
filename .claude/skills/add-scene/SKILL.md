---
name: add-scene
description: Add a new Dendry scene to the story. Use when the user wants to create a new scene, passage, or narrative node. Guides placement in the correct .scene.dry file and wires up choices.
user_invocable: true
---

# Add a Dendry Scene

Creates a new scene in the story and wires it into the narrative graph.

## Parameters

The user should provide:
- **Scene ID**: snake_case identifier (e.g. `tavern_entrance`)
- **Title**: Display title
- **Content**: Narrative text
- **Choices**: Where the scene leads (target scene IDs + choice text)
- Optionally: subtitle, tags, on-arrival commands, conditions, card/deck properties

## Steps

1. **Determine the file**: Ask the user which `.scene.dry` file to add it to, or suggest one based on the scene's narrative context. Create a new file in `story/scenes/` if appropriate.

2. **Write the scene** in Dendry `.dry` format:
```
@scene scene_id
title: Scene Title
subtitle: Optional Subtitle
unavailable-subtitle: Shown when choose-if fails
tags: tag1, tag2
on-arrival: quality = quality + 1
on-departure: quality = quality - 1
on-display: quality = quality + 1
view-if: condition
choose-if: condition
go-to: target_scene
go-to: scene_a if condition; scene_b
go-to-ref: quality_name
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
is-hand: true
is-deck: true
is-card: true
is-pinned-card: true
card-image: card.png
max-cards: 5
check-quality: wit
broad-difficulty: 5
narrow-difficulty: 5
difficulty-scaler: 0.6
difficulty-increment: 0.1
check-success-go-to: win_scene
check-failure-go-to: lose_scene

Narrative text here. Supports *emphasis* and **strong**.

Quality display: [+ quality_name +]
Conditional: [? if quality > 3 : text shown when true ?]

- @target_scene: Choice text
- @another_target: Another choice
- #tag_name: All scenes with this tag
```

3. **Choice-level properties** (indented under a choice line):
```
- @scene_id: Choice text
  view-if: condition
  choose-if: condition
  order: 1
  priority: 2
  frequency: 50
```

4. **Wire it in**: Find any existing scenes that should link TO this new scene and add choice lines pointing to it.

5. **Compile**: Run `npm run compile:dendry` to verify the scene parses correctly.

6. **Validate**: Check that:
   - The scene ID is unique across all `.dry` files
   - All choice targets (`@target`) reference existing scenes
   - Tag choices (`#tag`) reference tags that exist on at least one scene
   - Any referenced qualities exist in `qualities.dry`

## Scene Type Quick Reference

- **Regular scene**: Just content + choices
- **Hand scene**: `is-hand: true` + `max-cards: N` — displays drawn cards + decks + pinned cards
- **Deck scene**: `is-deck: true` — its choices are the drawable card pool
- **Card scene**: `is-card: true` — a drawable card (use `priority` for draw order, `max-visits: 1` for one-time cards)
- **Pinned card**: `is-pinned-card: true` — always visible in hand, no hand slot used
- **Check scene**: `check-quality` + difficulty + success/failure targets — auto-resolves on entry
- **Auto-route scene**: `go-to` with predicates — auto-navigates without player choice
