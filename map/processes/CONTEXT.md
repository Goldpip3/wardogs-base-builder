# Processes

The five movements that actually run, and one card that describes a posture rather than a run.

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
| [security](security.md) | what guards the worker, what GitHub Pages cannot guard at all |

[security](security.md) is the odd one out: most of it is already true rather than a movement
you run. Its last section is the exception, an owner follow-up that needs the Cloudflare
dashboard rather than a commit, and it has not been done.
