# Engineering Rulebook — skill README

> **For humans browsing this folder.** The AI agent does not read this file — its entry
> point is [`SKILL.md`](SKILL.md) (see [How the skill loads](#how-the-skill-loads) below).
> This README exists so a person can understand the library at a glance.

A self-contained **engineering rulebook**, packaged as a Claude Code skill. It codifies the
patterns that survived real audits into generic rulebooks, so they become **defaults you load
_before_ building** instead of findings a review catches afterward.

---

## TL;DR

- **21 generic rulebooks** (one per topic; five are language lanes for Python and PHP) live in [`references/`](references/).
- Load one **before writing code** → the rules are defaults, not after-the-fact findings.
- Check a **diff** at merge cadence, or run a full **audit** of the workspace.
- The mechanizable rules ship as **runnable checks** in [`checks/`](checks/) — semgrep, ESLint,
  tsconfig, CI.
- **Per-project facts** (session tiers, env tables, thresholds) live in the project's
  **wiki repo** at `wiki-{project}/eng-rulebook/profiles/` — next to the audit reports, tracked
  there — never inside the skill. The skill ships none, by design.
- A defect **no rule covers** goes back upstream to [`references/_gaps.md`](references/_gaps.md),
  so the next project doesn't rediscover it.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| `/eng-rulebook <topic>` | Build-time load | Reads the matching rulebook **before you write**, e.g. `/eng-rulebook security`. Also auto-triggers when you start work on a covered area. |
| `/eng-rulebook check [<ref>]` | Check | Diff-scoped verification at merge cadence — the middle between loading a rulebook and auditing a workspace. Each run is recorded in `<home>/check-runs/`. |
| `/eng-rulebook audit [<topic>]` | Audit | Audits the workspace against all standards, or one → report in `<home>/audits/<date>/`. `/eng-rulebook all` is an alias. |
| `/eng-rulebook profile <topic>` | Profile | Creates this workspace's declared facts for a topic from the rulebook's Appendix A; `status` reports what is missing. |

## Topics (the rulebooks)

Each master is 200–450 lines, sized to be read whole. Load the lane you're in, not the library.

| Topic | Governs |
| --- | --- |
| [`type-safety`](references/type-safety.md) | **TypeScript:** compiler strictness, `any`/cast policy, schema-derived types, boundary parsing |
| [`python-typing`](references/python-typing.md) | **Python:** checker floor, the unannotated-body hole, `Any`/typed-ignore policy, boundary parsing, exhaustiveness |
| [`python-packaging`](references/python-packaging.md) | **Python:** interpreter floor, manager and lockfile, venv discipline, task vocabulary, ruff baseline, `src/` layout, wheel/ABI |
| [`php-typing`](references/php-typing.md) | **PHP:** `strict_types` scoping, analyser level, `mixed` policy, backed enums, comparison and identity |
| [`php-packaging`](references/php-packaging.md) | **PHP:** Composer platform vs the real host, lockfile and install modes, extensions, plugin allowlist, PSR-4, tasks, style |
| [`php-runtime`](references/php-runtime.md) | **PHP:** `php.ini` as a deployable, disclosure and session-cookie defaults, OPcache and deploy invalidation, process model, execution limits |
| [`testing`](references/testing.md) | Hermetic suites, unit-vs-integration split, the must-test list, mutation score, oracle provenance |
| [`security`](references/security.md) | Auth, sessions & revocation, input validation & SSRF, CSRF, path traversal, secrets, rate limits, storage |
| [`data-integrity`](references/data-integrity.md) | Atomic claims, fencing tokens, idempotency, expand/migrate/contract, terminal-state guards, cleanup |
| [`resilience`](references/resilience.md) | Timeouts, bounded retry, degradation ladders, watchdogs, shedding, readiness & drain |
| [`config-and-environment`](references/config-and-environment.md) | Fail-closed boot, env taxonomy, client-bundle exposure, environment gating, build/runtime coupling |
| [`api-contracts-and-codegen`](references/api-contracts-and-codegen.md) | Spec as source of truth, response envelope & error codes, codegen in every consumer, generated-file discipline |
| [`observability`](references/observability.md) | The silent-degradation ban, alarms on money/availability paths, structured logging, correlation, label cardinality |
| [`tooling-and-workspace`](references/tooling-and-workspace.md) | Multi-repo uniformity: package manager, script vocabulary, config baselines, lockfiles, CI parity |
| [`mobile-app`](references/mobile-app.md) | Session/push lifecycle, backgrounding, binary-vs-OTA versioning, store & native build config, wired-or-hidden controls |
| [`comment-standard`](references/comment-standard.md) | Code comments: what generated docs own vs what point-of-edit comments own, reference rules, comment truth |
| [`web-client`](references/web-client.md) | Browser token storage, refresh races, route guards, XSS sinks, CSRF, third-party scripts, accessibility |
| [`ai-features`](references/ai-features.md) | LLM/agent product surfaces: prompt injection, tool authority, output validation, evals, cost |
| [`data-protection`](references/data-protection.md) | Personal data: inventory, retention, deletion & export, third-party egress, residency, consent |
| [`supply-chain-and-build-integrity`](references/supply-chain-and-build-integrity.md) | Dependency admission, CI pinning, workflow token scope, build-time identity, SBOM & signed provenance |
| [`performance-and-data-access`](references/performance-and-data-access.md) | Index/query-shape matching, N+1, result and payload bounds, caching, pools, latency budgets |

Routing (which rulebook a task needs) is owned by [`SKILL.md`](SKILL.md#routing-table) — that table is
authoritative. [`references/README.md`](references/README.md) is a scope index and owns the adoption model;
[`references/_authoring.md`](references/_authoring.md) owns lane ownership. Different questions, different owners.

## Key concepts

Four artifacts, four jobs:

| Artifact | Job | Lives |
| --- | --- | --- |
| **Standards** (the rulebooks) | *How we build* — generic, cross-project | [`references/`](references/) |
| **Audit** | *How we verify* — after the fact, whole workspace | [`audit.md`](audit.md), run by `/eng-rulebook audit` → `<home>/audits/<date>/` |
| **Check runs** | *What we verified at merge time* — one record per diff | `<home>/check-runs/` — a ledger row per run, a detail file when there were findings |
| **Profiles** | *This workspace's current facts* — not run records | `<home>/profiles/` — normally `wiki-{project}/eng-rulebook/profiles/` |

- **Standards and the audit are twins.** A rulebook states a property up front; the audit
  checks the code for the same property afterward. An audit finding maps back to the exact
  rule it violated (its `Standard:` field). A real defect that **no** rule covers is a
  `library-gap` — raised against the master by adding a row to
  [`references/_gaps.md`](references/_gaps.md), so the library
  improves and the next project doesn't rediscover it.
- **Generic rules, project-specific profiles.** A rulebook never names a project. The facts
  that make a generic rule decidable (session tiers, spec globs, state machines, env tables)
  go in `<home>/profiles/<topic>-profile.md`, copied from that
  rulebook's **Appendix A** template.
- **Guard rails are tracked, not just declared.** Each rulebook ends with CI checks, and each
  carries a **stable id** (`security.GR3`). A workspace records which it has wired in a ledger,
  and `audit` reconciles the two in its Phase 2b. Without that, "adopted incrementally" and
  "adopted nothing" produce the same audit.
- **Empty profile = honest.** A missing profile means "not yet declared" — the agent proceeds
  on the generic master and says so. A **stale** profile is worse than a missing one, because
  it reads as a decision.
- **The line budget is the point.** 200–450 lines per rulebook. A standard an agent can hold in
  context beats a textbook it can't; every addition displaces something.

## Runnable checks

The mechanizable guard rails ship as artifacts in [`checks/`](checks/) so adoption is wiring
rather than authoring — semgrep rules whose messages name the rule they enforce, an ESLint
flat-config fragment, a tsconfig strictness baseline, and a CI fragment.

[`checks/README.md`](checks/README.md) is explicit about what is **not** there and why: most of
the library needs a type-checker, a test run, or a human, and one rule was **withdrawn** after
testing showed a pattern cannot distinguish bounded from unbounded retry. A ruleset that implies
coverage it lacks is worse than a smaller honest one.

## Library self-checks

[`meta/`](meta/) holds the gates the library holds *itself* to — a library that legislates CI
guard rails for product code and exempts itself is not credible.

| Check | Enforces |
| --- | --- |
| `meta/check-rulebook-shape.mjs` | Every cited `§N.M` anchor resolves; every rulebook has the required sections |
| `meta/check-tables.sh` | The four tables that list the rulebooks agree with what is on disk |
| `meta/check-version.sh` | `VERSION` is sane, every rulebook has a `Rev:`, changed rulebooks appear in the changelog |
| `meta/guard-rails.mjs` | Enumerates the declared rails (155 at v7); reconciles them against a workspace's ledger |

## How a new workspace adopts this

1. **Install it as `.claude/skills/eng-rulebook/`** — the directory name matters, because it *is*
   the command. Claude Code takes a project skill's command from its **directory name**; the
   frontmatter `name:` field is only the display label in skill listings. Install it under any
   other directory name and the command becomes that name instead, so every `/eng-rulebook …`
   invocation in this documentation is wrong for that workspace.

   ```
   git clone <repo-url> .claude/skills/eng-rulebook
   ```

   Never scatter copies of individual rulebooks into repos or prompts — that recreates the drift
   the library exists to prevent.
2. **Check the skill carries no profiles.** Profiles are workspace facts and live in the
   workspace tree, not the skill — if the copy you adopted contains a `profiles/` directory
   with `<topic>-profile.md` files, they are a previous workspace's facts (or your own,
   pre-relocation): move yours to `<home>/profiles/` and delete the rest. They
   read as decisions your project never made.
3. **Fill in profiles** with `/eng-rulebook profile <topic>` as decisions are made — they are
   written to `<home>/profiles/` and **committed to the project's wiki repo**, so teammates
   see the same facts; `/eng-rulebook profile status` reports
   what is still missing. **Fill order:** security, config-and-environment, data-integrity
   and testing first (they carry most profile-dependent rules); the rest when their lane is
   first touched.
4. **Wire the guard rails** incrementally — start from [`checks/`](checks/) — and record what you
   wired in the ledger, so the audit can tell adopted-partly from adopted-not-at-all. Reconcile
   at any time with `node .claude/skills/eng-rulebook/meta/guard-rails.mjs --ledger` from the
   workspace root (`--template` seeds a ledger); `/eng-rulebook audit` runs the same check in its
   Phase 2b.
5. **Audit periodically** with `/eng-rulebook audit`; a finding that recurs across runs is either
   a missing guard rail or a `library-gap` — fix the standard, not just the instance.

## Profiles live in the workspace — by design

This repository is the **library master**: generic rulebooks and nothing else. Profiles live
in the adopting **workspace's** tree at `<home>/profiles/<topic>-profile.md` — beside the
audit reports, in the project's wiki repo — never inside the skill folder.

That is deliberate, not an omission, and it does two jobs at once. A profile is one project's
declared facts (session tiers, env tables, spec globs, coverage thresholds, store ids).
Shipped inside the library, it would arrive in the next project as a **decision that project
never made** — location outside the skill prevents that by construction. And because the
profile sits in the project's wiki repo, it **travels with the project**: teammates read the
same declared facts, and a skill update can never clobber them. (The wiki is a separate repo
from the code repos, so a CI job in a code repo must check it out to read a profile.) One non-topic file lives
there too: `guard-rails.md`, the workspace's ledger of which declared guard rails are wired
(seed it with `node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template`). Cells a
human must decide are written `DECIDE: <question>`, never guessed; each profile's header
stamps the library `VERSION`, the master's `Rev:`, the date, and the commit its facts were
verified against — a stale profile is worse than a missing one, because it reads as a
decision. Until a workspace writes its own, rules needing project facts run on the generic
masters and the agent says so.

*Migrating an install from before this convention: move
`.claude/skills/eng-rulebook/profiles/*.md`, or any `eng-rulebook-audit/profiles/*.md` left at
the workspace root, to `<home>/profiles/`.*

## Versioning

`VERSION` holds one integer for the whole library; each rulebook carries its own `**Rev:** N`.
[`CHANGELOG.md`](CHANGELOG.md) defines the three change classes **once** — `ADDS`, `RELAXES`,
`EDITORIAL`, plus a `Renumbered:` axis — and explains why an audit resolves `rule-changed`
*before* `fixed`: the other labels presuppose a stable rule, so checking them first is what marks
a finding "fixed" when the rule was merely deleted.

## Folder layout

```
eng-rulebook/
  README.md            # this file — human overview
  SKILL.md             # the agent entry point: modes, routing table, how-to-use
  audit.md             # the /eng-rulebook audit procedure (phases 0-8, plus 2b enforcement)
  VERSION              # one integer for the library
  CHANGELOG.md         # change classes, defined once; one entry per release
  references/          # the 21 rulebooks + index + machinery
    README.md          #   scope index + adoption model (routing lives in SKILL.md)
    _authoring.md      #   the contract for writing/editing a rulebook (14 rules)
    _gaps.md           #   inbound backlog: defects no rule covers, with an intake bar
    _coverage-asvs.md  #   which ASVS 5.0 chapters the library states a rule for
    <topic>.md × 16    #   the standards themselves
  checks/              # the mechanizable guard rails, as runnable artifacts
    README.md          #   what is here, what is deliberately not, and how it was validated
    semgrep/ eslint/ tsconfig/ ci/
  meta/                # the library's own gates
    check-rulebook-shape.mjs · check-tables.sh · check-version.sh · guard-rails.mjs
```

Profiles are NOT in this tree — they live in the adopting workspace's `<home>`, beside the
audit output. `<home>` is the project's wiki repo when there is one, else `eng-rulebook-audit/`
under the workspace root (`SKILL.md` § Where eng-rulebook writes):

```
wiki-{project}/            # the project's docs repo — its own git repo
  eng-rulebook/            # = <home>
    .gitignore             #   seeded when absent: audits/*/_work/
    profiles/              #   the workspace's own facts — tracked here
      <topic>-profile.md   #     created on demand via /eng-rulebook profile <topic>
      guard-rails.md       #     the wired-rails ledger (guard-rails.mjs --template)
    audits/<YYYY-MM-DD>/   #   audit reports (see audit.md)
    check-runs/            #   the merge-cadence trail (SKILL.md § Check mode step 8)
      <YYYY-QQ>.md         #     ledger: one row per check run, always written
      <YYYY-MM-DD>-<sha>.md #     detail, only for runs with findings
```

## How the skill loads

Claude Code loads a skill from **`SKILL.md` only** — its frontmatter tells the agent when to
invoke it, and its body loads on invocation. Every other file here (this README, `audit.md`,
the rulebooks, the profiles) is pulled in **on demand** when `SKILL.md` routes to it. That's
why usage instructions for the agent live in `SKILL.md`, and this README is purely for people.

**Editing a rulebook?** Read [`references/_authoring.md`](references/_authoring.md) first — it
is the contract for required shape, genericity, lane ownership, anchor discipline, and the
evidence bar. Run `meta/check-rulebook-shape.mjs` and `meta/check-tables.sh` before committing.
