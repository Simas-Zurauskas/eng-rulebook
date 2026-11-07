# Tooling and workspace integrity

## Applicability

Project setup, dependency resolution, build/test commands, CI, generated artifacts and workspace
boundaries. Preserve working conventions; identical configurations across unrelated repos are not
a quality requirement.

## Checks

### TOOL1 — Checks are discoverable and reproducible

Use supported compatible runtimes/tools and appropriate committed lockfiles. Reproduce installs
without silently resolving new versions. Keep commands discoverable and let CI exercise the
meaningful checks from a clean checkout. A missing script name is not a defect when an equivalent
working command exists. Missing protection is assessed against a concrete risk. Reuse the current
formatter, linter and harness before introducing another.

### TOOL2 — Tools check the code they claim to check

Inspect checked-file scope, language strictness and tool compatibility; a green run that skips
relevant files provides little evidence. Include applicable test/support code. Avoid speculative
strictness migrations during unrelated work. Existing project gates remain in force until
deliberately changed. [Type discipline / TypeScript](type-safety.md), [Python](python-typing.md) and [PHP](php-typing.md)
cover shared type discipline and language-specific holes. Diagnose failed checks before
changing expectations, fixtures, suppressions or configuration; separate a changed contract
from a regression or environment failure. Do not make a check green by weakening its oracle.
[Testing](testing.md) owns independent expected results and meaningful verification.

### TOOL3 — Sources and artifacts remain connected

Edit generator inputs and regenerate affected outputs instead of patching generated code.
Tracked outputs are valid when distribution/build needs them; verify freshness and exclude
unwanted test/secrets assets from production. Check the installed/built artifact where source-only
runs can hide missing files, dependencies or platform incompatibility.

### TOOL4 — Workspace ownership and hygiene are clear

Distinguish maintained repos, generated/vendor code, sandboxes and legacy references. Include
new untracked maintained files in reviews. Ignore transient outputs and protect secret paths;
ignored does not mean harmless or authorized to expose. Avoid duplicate toolchains for the
same concern without a reason. Preserve independent repos' legitimate version/config differences.

### TOOL5 — Agent context has one useful, maintained home

Read context in proportion to the task; trace the affected behavior rather than loading a
whole repository manual for a local edit. Verify remembered APIs against installed code or
relevant official documentation. Treat comments/docs as evidence, not proof of current behavior.

Keep repository-specific commands and non-obvious constraints in their existing authoritative
home. Preserve shared references between Codex/Claude instructions instead of copying facts
into competing files. Update only affected guidance within the authorized task; a coding change
does not automatically require new AGENTS.md/CLAUDE.md files, maps or an agent framework.

Instructions guide decisions; compilers, linters, tests and permission controls enforce their
actual configured scope. Reuse those controls. Propose new automation for a concrete recurring
failure when existing checks cannot protect it; do not install hooks or CI by default. Using
a coding agent alone does not make [AI product checks](ai-features.md) applicable.

## Sources

- [Scoped skills and context](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [Claude Code instructions and verification](https://code.claude.com/docs/en/best-practices)
- [Consequential review rules and counterexamples](https://developers.openai.com/blog/custom-code-review-rules-for-codex)
