# Objects

One card per noun. Clustered by the question an editor arrives with, not by where the file
sits on disk, which is why `data/` here holds three cards that live in one folder and
`planner/` holds two that live in one file.

**Reads:** [_index.md](_index.md) to find the noun, then one card.
**Writes:** nothing. Cards are read-only orientation; the code is the source of truth.
**Human check:** if a card cites a line that has moved, the card is stale. Fix the card or
mark it `stale`. Do not fix the code to match the card.

Do not read this folder whole. Eight cards is small enough to be tempting and that is the
habit the catalog exists to prevent.

## Card shape

Every card carries the same seven sections, from
`.claude/skills/icm-architect/assets/templates/object.md`. The one that earns its keep is
**If you change this**, split into Hits and Does not hit. First-order only. "Does not hit"
names the obvious next noun that is the wrong one, because a wrong waterfall costs more
than a missing card.
