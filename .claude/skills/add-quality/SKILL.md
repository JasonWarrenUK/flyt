---
name: add-quality
description: Add a new quality (stat/variable) to the Dendry game. Use when the user wants to track a new stat, attribute, or inventory flag.
user_invocable: true
---

# Add a Dendry Quality

Adds a new quality definition to `story/qualities.dry` and optionally references it in scenes.

## Parameters

The user should provide:
- **Quality ID**: snake_case identifier (e.g. `sword_skill`)
- **Display name**: Human-readable name
- Optionally: type, initial value, min/max

## Steps

1. **Add to qualities.dry**: Append a quality block to `story/qualities.dry`:
```
@quality quality_id
name: Display Name
type: integer
initial: 0
```

2. **Quality types** (explain to user if they're unsure):
   - `integer` — Whole number, displayed as-is (default)
   - `fudge` — Maps numbers to words: terrible/poor/mediocre/fair/good/great/superb
   - `onOff` — Boolean, displayed as present/absent
   - `wordScale` — Custom word mapping (requires `words:` property)
   - `raw` — Raw number, no formatting

3. **Optional properties**:
   - `min:` / `max:` — Clamp the value range
   - `initial:` — Starting value (defaults to 0)
   - `words:` — Comma-separated word list for wordScale type

4. **Wire into scenes**: If the user specifies where this quality should be used, add `on-arrival` commands to the relevant scenes. Example:
   - `on-arrival: sword_skill = sword_skill + 1`

5. **Compile**: Run `npm run compile:dendry` to verify.

6. **Note**: The `QualitiesPanel` component in `src/components/QualitiesPanel.svelte` automatically displays all qualities from game.json — no UI changes needed.
