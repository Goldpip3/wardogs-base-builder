# Processes

The five movements that actually run. Not a wish list.

**Reads:** an object card, when you need to know what a step touches.
**Writes:** nothing. These describe; the scripts do.
**Human check:** if a step cites a line that has moved, the card is stale.

Four of the five are one command. That is the point of the shape: `build.ps1` inlines,
generates, checks and tests in one pass, so there is no order to remember and no way to ship
having skipped the tests. The fifth, [deploy](deploy.md), is two separate things that people
keep assuming are one.

| Verb | One line |
|---|---|
| [build](build.md) | source plus data becomes two planners and a site, then proves itself |
| [add-a-page](add-a-page.md) | a new module, a name in the running order, a URL in the sitemap |
| [derive-data](derive-data.md) | regenerate armory, re-derive ballistics, never hand-edit either |
| [deploy](deploy.md) | push ships the site; the worker ships separately and does not |
| [publish-a-design](publish-a-design.md) | a submission becomes a page, through a human |
