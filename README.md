# eng-rulebook

Shared engineering guidance for Codex and Claude. Start with [SKILL.md](SKILL.md).
The [guide index](references/README.md) is the single catalog. Development loads relevant
checks; full and basics audits choose from those same checks after investigating the project.
Basics reduces selection, not the standard of investigation or evidence.

`guide <topic>`, `check [ref]`, `audit`, `audit basics`, and `recheck <report>` are the supported
workflows. Audit commands take no topics. [Migration](MIGRATION.md) explains the consolidated
installation and historical reports. Optional tool fragments live in [checks/](checks/README.md).

Validate the library with `node meta/check.mjs`. Skills guide agent behavior; they do not install
MCP connections, hooks, CI gates, permissions or secrets. Shared symlinks can expose this same
folder at `~/.agents/skills/eng-rulebook` and `~/.claude/skills/eng-rulebook`.
