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
- Optionally: subtitle, tags, on-arrival commands, conditions

## Steps

1. **Determine the file**: Ask the user which `.scene.dry` file to add it to, or suggest one based on the scene's narrative context. Create a new file in `story/scenes/` if appropriate.

2. **Write the scene** in Dendry `.dry` format:
```
@scene scene_id
title: Scene Title
subtitle: Optional Subtitle
on-arrival: quality = quality + 1

Narrative text here. Supports *emphasis* and **strong**.

Quality display: [+ quality_name +]

- @target_scene: Choice text
- @another_target: Another choice
```

3. **Wire it in**: Find any existing scenes that should link TO this new scene and add choice lines pointing to it. Search for TODO markers or dead-end scenes that need connections.

4. **Compile**: Run `npm run compile:dendry` to verify the scene parses correctly.

5. **Validate**: Check that:
   - The scene ID is unique across all `.dry` files
   - All choice targets (`@target`) reference existing scenes (or flag them as needing creation)
   - Any referenced qualities exist in `qualities.dry`

## Format Reference

Scene properties (all optional except `title`):
- `title:` — Display title
- `subtitle:` — Secondary heading
- `tags:` — Comma-separated tags
- `on-arrival:` — Semicolon-separated quality commands run on entering
- `on-departure:` — Commands run on leaving
- `view-if:` — Condition for scene to be visible as a choice
- `choose-if:` — Condition for scene to be selectable
- `go-to:` — Auto-redirect to another scene
- `max-visits:` — Limit how many times scene can be visited
- `is-card: true` / `is-deck: true` / `is-hand: true` — DendryNexus card mechanics
