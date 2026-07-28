# Engineering Rulebook — skill README

> **For humans browsing this folder.** The AI agent does not read this file — its entry
> point is [`SKILL.md`](SKILL.md) (see [How the skill loads](#how-the-skill-loads) below).
> This README exists so a person can understand the library at a glance.

A self-contained **eng-rulebook library**, packaged as a Claude Code skill. It
codifies the patterns that survived real audits into generic rulebooks, so they become
**defaults you load _before_ building** instead of findings a review catches afterward.

---

## TL;DR

- **16 generic rulebooks** (one per topic) live in [`references/`](references/).
- Load one **before writing code** → the rules are defaults, not after-the-fact findings.
- Or run an **audit** → a multi-agent, verified pass that checks the codebase against the
  same rulebooks and writes a report.
- **Per-project facts** (session tiers, env tables, state machines) live in
  [`profiles/`](profiles/) — one file per topic. These are **empty until filled in** for a
  workspace.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| `/eng-rulebook <topic>` | Build-time load | Reads the matching rulebook **before you write**, e.g. `/eng-rulebook security`. Also auto-triggers when you start work on a covered area. |
| `/eng-rulebook check [<ref>]` | Check | Diff-scoped verification at merge cadence — the middle between loading a rulebook and auditing a workspace. |
| `/eng-rulebook profile <topic>` | Profile | Creates this workspace's declared facts for a topic from the rulebook's Appendix A; `status` reports what is missing. |
| `/eng-rulebook audit` | Audit | Audits the whole workspace against **all** standards → report in `eng-rulebook-audit/<date>/`. |
| `/eng-rulebook audit <topic>` | Audit | Same machinery, criteria narrowed to **one** standard, e.g. `/eng-rulebook audit security`. |
| `/eng-rulebook all` | Audit | Alias for `/eng-rulebook audit`. |

## Topics (the rulebooks)

Each master is 200–450 lines, sized to be read whole. Load the lane you're in, not the library.

| Topic | Governs |
| --- | --- |
| [`type-safety`](references/type-safety.md) | Compiler strictness, `any`/cast policy, schema-derived types, boundary parsing |
| [`testing`](references/testing.md) | Hermetic suites, unit-vs-integration split, the must-test list, contract-pinning tests |
| [`security`](references/security.md) | Auth, sessions & revocation, input validation & SSRF, secrets, rate limits, storage |
| [`data-integrity`](references/data-integrity.md) | Atomic claims, fencing tokens, idempotency, terminal-state guards, migrations, cleanup |
| [`resilience`](references/resilience.md) | Timeouts, bounded retry, transient-vs-terminal, degradation ladders, watchdogs |
| [`config-and-environment`](references/config-and-environment.md) | Fail-closed boot, env taxonomy, client-bundle exposure, environment gating, build/runtime coupling |
| [`api-contracts-and-codegen`](references/api-contracts-and-codegen.md) | Spec as source of truth, response envelope & error codes, codegen in every consumer, generated-file discipline |
| [`observability`](references/observability.md) | The silent-degradation ban, alarms on money/availability paths, structured logging, correlation |
| [`tooling-and-workspace`](references/tooling-and-workspace.md) | Multi-repo uniformity: package manager, script vocabulary, config baselines, lockfiles, CI parity |
| [`mobile-app`](references/mobile-app.md) | Session/push lifecycle, backgrounding, binary-vs-OTA versioning, store & native build config, wired-or-hidden controls |
| [`comment-standard`](references/comment-standard.md) | Code comments: what generated docs own vs what point-of-edit comments own, reference rules, comment truth |
| [`web-client`](references/web-client.md) | Browser token storage, refresh races, route guards, XSS sinks, CSRF, third-party scripts, accessibility |
| [`ai-features`](references/ai-features.md) | LLM/agent product surfaces: prompt injection, tool authority, output validation, evals, cost |
| [`data-protection`](references/data-protection.md) | Personal data: inventory, retention, deletion & export, third-party egress, residency, consent |
| [`supply-chain-and-build-integrity`](references/supply-chain-and-build-integrity.md) | Dependency admission, CI pinning, workflow token scope, build-time identity, SBOM & signed provenance |
| [`performance-and-data-access`](references/performance-and-data-access.md) | Cost that scales with data volume: index/query-shape matching, N+1, result and payload bounds, caching, pools, latency budgets |

Routing (which rulebook a task needs) is owned by [`SKILL.md`](SKILL.md#routing-table) — that table is
authoritative. [`references/README.md`](references/README.md) is a scope index and owns the adoption model;
[`references/_authoring.md`](references/_authoring.md) owns lane ownership. Different questions, different owners.

## Key concepts

Three artifacts, three jobs:

| Artifact | Job | Lives |
| --- | --- | --- |
| **Standards** (the rulebooks) | *How we build* — generic, cross-project | [`references/`](references/) |
| **Audit** | *How we verify* — after the fact | [`audit.md`](audit.md), run by `/eng-rulebook audit` |
| **Profiles** | *This workspace's current facts* — not run records | [`profiles/`](profiles/) |

- **Standards and the audit are twins.** A rulebook states a property up front; the audit
  checks the code for the same property afterward. An audit finding maps back to the exact
  rule it violated (its `Standard:` field). A real defect that **no** rule covers is a
  `library-gap` — a change request against the rulebooks, so the library improves, not just
  the instance.
- **Generic rules, project-specific profiles.** A rulebook never names a project. The facts
  that make a generic rule decidable (session tiers, spec globs, state machines, env tables)
  go in a `profiles/<topic>-profile.md`, copied from that rulebook's **Appendix A** template.
- **Guard rails make a standard enforceable.** Each rulebook ends with CI checks that catch
  its rules automatically, so they're not merely aspirational.
- **Empty profile = honest.** A missing profile means "not yet declared" — the agent proceeds
  on the generic master and says so. A **stale** profile is worse than a missing one, because
  it reads as a decision.

## How a new workspace adopts this

1. **Install it as `.claude/skills/eng-rulebook/`** — the directory name matters, because it *is*
   the command. Claude Code takes a project skill's command from its **directory name**; the
   frontmatter `name:` field is only the display label in skill listings. Install it under any
   other directory name — `eng-standards/`, `rulebook/`, the repo's own name — and the command
   becomes that name instead, so every `/eng-rulebook …` invocation in this documentation is
   wrong for that workspace.

   ```
   git clone <repo-url> .claude/skills/eng-rulebook
   ```

   Never scatter copies of individual rulebooks into repos or prompts — that recreates the drift
   the library exists to prevent.
2. **Check `profiles/` is empty.** `.gitignore` untracks it, so a clone arrives empty and
   your own profiles never push back — but if you adopted by copying a *directory* rather
   than cloning, delete any `<topic>-profile.md` you inherited. They are the previous
   workspace's facts and they read as decisions yours never made. Keep the README.
3. **Fill in profiles** from each rulebook's Appendix A template as decisions are made.
4. **Wire the guard rails** (each rulebook lists its CI checks) incrementally.
5. **Audit periodically** with `/eng-rulebook audit`; a finding that recurs across runs is either
   a missing guard rail or a `library-gap` — fix the standard, not just the instance.

## Profiles ship empty — by design

This repository is the **library master**: generic rulebooks and nothing else. `profiles/`
holds only its README here, and `.gitignore` keeps it that way — profiles are untracked, so
a filled-in profile lives and stays in the workspace that filled it.

That is deliberate, not an omission. A profile is one project's declared facts (session
tiers, env tables, spec globs, coverage thresholds, store ids). Shipped inside the library,
it arrives in the next project as a **decision that project never made** — the "stale profile
reads as a decision" failure in [`profiles/README.md`](profiles/README.md), propagated by
distribution. Until a workspace writes its own, rules needing project facts run on the
generic masters and the agent says so.

## Folder layout

```
standards/
  README.md            # this file — human overview
  SKILL.md             # the agent entry point: routing table + how-to-use
  audit.md             # the /eng-rulebook audit procedure (8 phases)
  references/          # the 16 rulebooks + index (README) + authoring contract
    README.md          #   scope index + adoption model (routing lives in SKILL.md)
    _authoring.md      #   the contract for writing/editing a rulebook
    <topic>.md × 16    #   the standards themselves
  profiles/            # the adopting workspace's own facts — untracked, empty in the master
    README.md
    <topic>-profile.md #   created on demand, from a rulebook's Appendix A
```

## How the skill loads

Claude Code loads a skill from **`SKILL.md` only** — its frontmatter tells the agent when to
invoke it, and its body loads on invocation. Every other file here (this README, `audit.md`,
the rulebooks, the profiles) is pulled in **on demand** when `SKILL.md` routes to it. That's
why usage instructions for the agent live in `SKILL.md`, and this README is purely for people.

**Editing a rulebook?** Read [`references/_authoring.md`](references/_authoring.md) first — it
is the contract for required shape, genericity, lane ownership, and the evidence bar.
