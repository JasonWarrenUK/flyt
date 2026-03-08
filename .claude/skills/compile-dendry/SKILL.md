---
name: compile-dendry
description: Compile Dendry .dry story files into game.json. Use when the user has edited .dry files, asks to compile/rebuild the story, or when you need to test narrative changes.
user_invocable: true
---

# Compile Dendry Story

Compiles all `.dry` files in `story/` into `static/game.json`.

## Steps

1. Run the compiler:
```bash
npm run compile:dendry
```

2. Check the output for errors. The compiler reports:
   - Number of `.dry` files found
   - Number of scenes and qualities compiled
   - Output path (`static/game.json`)

3. If the compile succeeds, verify the output makes sense:
   - Read `static/game.json` and check that `firstScene` matches a scene that exists in `scenes`
   - Check that all choice targets (`options[].id`) reference existing scene IDs
   - Report any orphaned or unreachable scenes

4. If compile fails, check:
   - `.dry` file syntax: scenes must start with `@scene id`, properties before content
   - Choice format: `- @target_scene: Choice text`
   - Command syntax: `on-arrival: quality = expression`

Report the compilation result to the user.
