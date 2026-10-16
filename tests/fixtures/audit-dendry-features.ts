// Fixture .dry text for scripts/audit-dendry-features.test.ts.

export const twoScenesAndAQuality = `@quality gold
name: Gold
type: integer
initial: 5

@scene start
title: Start
subtitle: The beginning
on-arrival: gold = gold + 1

Prose with **bold** and *italic* and [+ gold +].

- @next: Go on
  view-if: gold > 3
  priority: 2
- #tavern: Any tavern scene

@scene next
title: Next
go-to: start

Done.
`;

export const goToForms = `@scene simple
title: Simple
go-to: elsewhere

@scene conditional
title: Conditional
go-to: a if gold > 5; b

@scene conditional_single
title: Conditional single
go-to: a if gold > 5
`;

export const unknownProperties = `@scene odd
title: Odd
colour: red

- @next: Go
  weight: 3

@quality mood
name: Mood
type: emoji
`;

export const markupVariety = `@scene markup
title: Markup

[? if gold >= 1 : rich ?] and [? if gold < 1 : poor ?]
[? if gold > 2 : Rich, are we? ?]
**bold one** **bold two** *lonely italic*
[+ gold +] [+gold+]
`;

export const bareHeader = `@bare
title: Bare

Text.

@scene named
title: Named
`;

export const emptyReport = `# Report

Hand-written intro.

<!-- generated:start -->

old generated text

<!-- generated:end -->

Hand-written outro.
`;
