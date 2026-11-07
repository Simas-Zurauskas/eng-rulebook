---
name: eng-rulebook
description: 'Apply engineering guidance before nontrivial development or refactoring, selecting relevant guides for the task. Emphasizes simple maintainable solutions and meaningful tests. Also use for explicit guide requests, reviewing a change (check), a full codebase audit (audit), a priority-check audit (audit basics), or verifying a previous report (recheck). Audit topics are selected by the agent from the codebase.'
---

# Engineering rulebook

One shared library for development and review. Start from the user's requested outcome,
existing project instructions, and actual code. This skill does not assume a particular
team size, framework, repo layout, wiki, or compliance regime.

## Commands

| Invocation | Action |
| --- | --- |
| Automatic during development, or bare `eng-rulebook` with a development task | Apply the common principles below; select guides from [the index](references/README.md) before implementing. |
| `guide <topic> [topic…]`, or `<topic> [topic…]` | Read the requested guides. Guidance alone does not authorize implementation. |
| `check [ref]` | Follow [change review](review.md#check). |
| `audit` | Follow [the audit procedure](audit.md); select every applicable check. |
| `audit basics` | Same procedure and checks; select the most consequential applicable checks. |
| `recheck <report>` | Follow [report verification](review.md#recheck). |

Use `$eng-rulebook …` in Codex or `/eng-rulebook …` in Claude. Both load this same source.
**Audits take no topic arguments.** If an old `audit security`-style invocation is supplied,
explain the supported commands and ask which audit mode is intended; do not silently broaden
or narrow the request. `all` remains a full-audit alias. `profile` is retired: use existing
project facts and ask only for consequential information the code cannot establish.

## Common principles — apply on every development task

- Build the smallest understandable solution satisfying the requested behavior. Preserve
  authorization, data integrity, compatibility, and necessary recovery; fewer lines alone
  do not demonstrate simplicity.
- Inspect existing code, framework/platform features, and installed packages before adding
  mechanisms. Research credible packages before building substantial commodity functionality;
  compare their ownership cost with a small custom solution. See [simplicity](references/simplicity.md).
- Add an abstraction, wrapper, dependency, configuration option, or service when it solves a
  present problem. Moderate duplication and direct code can be cheaper than indirection.
- Identify the changed behavior and inspect existing tests first. Reuse or strengthen useful
  protection; add cases for meaningful gaps. No new test is needed when existing checks
  already demonstrate the required behavior. See [testing](references/testing.md).
- Select verification by consequence, reachability, and blast radius. Do not add unrelated
  safeguards or refactors to make a small task satisfy a universal template.
- Follow project requirements and conventions. Surface a consequential conflict; do not
  silently weaken an existing gate or migrate an entire repo to a preferred idiom.

## Development workflow

1. Inspect the task's entrypoints, callers, boundaries, and existing checks. Verify which nearby
   implementation reflects current conventions before copying it. Use the
   [single guide index](references/README.md) to choose relevant guides and read their
   applicable checks before writing. Explicit guide requests use the index's topic resolution.
2. Load as much as the real risk requires, without a fixed guide cap. Cross-references are
   invitations to inspect a relevant boundary, not instructions to load the whole library.
   Pass applicable guide paths to implementation agents when delegation is warranted.
3. Implement within the authorized scope. Review the result against the selected checks,
   exercise the meaningful behavior, and inspect the diff for unnecessary mechanisms/tests.
4. Report what changed, actual verification, and material limitations. No per-rule receipt,
   profile, ledger, or automatic audit. Revisit relevant checks when scope changes.

## Review discipline

Audits and rechecks write reports only; `check` responds in chat unless a report is requested.
None authorizes fixes, deployment, new CI gates, or package installation. Use the project's
existing tools and honor its execution permissions. A skill is guidance, not a claim of
mechanically enforced compliance.

Keep the shared installation unchanged while using it on a project. An explicit request to
maintain this skill authorizes editing its source: read [authoring](references/_authoring.md),
then run `node meta/check.mjs` and the relevant behavioral checks. Preserve Claude and Codex
compatibility and any pre-existing work.
