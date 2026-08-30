# Schema

Closed node types for this map. Nothing else is a node.

| Type | Lives in | Frontmatter |
|---|---|---|
| `object` | `objects/<cluster>/` | `type, cluster, universe, status, entity` |
| `process` | `processes/` | `type, status, consumes, produces` |

`universe`: `live` \| `leftover` \| `ghost`.
`status`: `stub` \| `verified` \| `stale`. `verified` requires a date and citations.
`entity`: repo-relative path to the file that owns the fact.

## Clusters

Clustered by how an editor asks, not by folder layout.

| Cluster | The question it answers |
|---|---|
| `data` | I want to change a number. |
| `planner` | I want to change the tool people actually use. |
| `site` | I want to change the website around it. |
| `service` | I want to change something that needs a server. |
| `guards` | Why did the build just fail. |

## Templates

There is no `_templates/` here. The blank starters live with the skill that defines them, at
`.claude/skills/icm-architect/assets/templates/object.md` and `process.md`. One home per
fact: a copy here would be a second definition that drifts.
