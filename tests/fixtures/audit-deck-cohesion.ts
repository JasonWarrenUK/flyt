// Fixture .dry text for scripts/audit-deck-cohesion.test.ts. Each export is a
// file's worth of content; the test assigns the file names.

export const qualities = `@quality gold
name: Gold
type: integer
initial: 5

@quality key
name: Key
type: onOff
initial: 0
`;

export const hub = `@scene start
title: Start
on-arrival: gold = gold + 1

Gold: [+ gold +]

- @deck_a: Deck A
- @deck_b: Deck B
- @vault: Vault
- #event: Events

@scene vault
title: Vault
view-if: key >= 1

- @start: Back
`;

export const deckA = `@scene deck_a
title: Deck A
is-deck: true

- @card_a1: Card
- @start: Back

@scene card_a1
title: Card
is-card: true
check-quality: gold
broad-difficulty: 3
check-success-go-to: a1_win
check-failure-go-to: a1_lose

@scene a1_win
title: Win
on-arrival: key = 1; gold = gold - 2

- @start: Back

@scene a1_lose
title: Lose
go-to: start if gold > 0; deck_a

[? if gold < 1 : Broke. ?]
`;

export const deckB = `@scene deck_b
title: Deck B
is-deck: true
call: helper

- @card_b1: Card
- @missing_scene: Nowhere

@scene card_b1
title: Card
is-card: true
tags: event
choose-if: gold >= 2
on-arrival: gold = gold - 2; fame = fame + 1

@scene helper
title: Helper
on-arrival: gold = gold + 1

@scene orphan
title: Orphan

- @start: Back
`;
