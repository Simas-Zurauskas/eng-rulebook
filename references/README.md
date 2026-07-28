# Engineering Rulebook Library

> **What this is:** reusable, generic engineering standards — one file per topic — loaded by
> AI agents and humans *before building*, so the patterns that survived real audits become
> defaults instead of findings. Written for multi-repo TypeScript workspaces documented with
> `wiki-system`; distilled from full audits of a real four-repo production system plus
> current (2025–2026) external practice.
>
> **What this is not:** project documentation. Nothing here describes any specific project.

---

## The model

Three artifacts, three jobs — the same layering the comment standard is built on:

| Artifact | Job | Lives |
| --- | --- | --- |
| **Standards** (this library) | How we build — generic, cross-project | inside the `eng-rulebook` skill (`references/`), routed by its `SKILL.md` |
| **Audit** | How we verify — after the fact | this skill's [`audit.md`](../audit.md), invoked by `/eng-rulebook audit` — writes reports to the workspace's `eng-rulebook-audit/<date>/` |
| **Project profiles** | The workspace's current facts (not run records) | this skill's `profiles/<topic>-profile.md` — per-workspace, since each workspace has its own copy of the skill |

Standards and the audit are twins in **one skill**: `/eng-rulebook <topic>` loads a rulebook
before building; `/eng-rulebook audit` checks the code against the same rulebooks and writes a
report. An audit finding maps back to the standard rule it violated (its `Standard:` field);
a defect with no covering rule is a `library-gap` — a change request against these references.
Both use the same severity language (consequence-if-it-fires × plausibility) and lens taxonomy.

## How a project adopts this

1. **Copy the skill, not the standards — into `.claude/skills/eng-rulebook/`.** The directory name
   is the command; the frontmatter `name:` is only a display label. A workspace adopts the library
   by taking the whole skill folder into its `.claude/skills/` under that exact name. `profiles/` is **untracked**, so a
   clone arrives with none — if you copied a directory instead, delete any inherited
   `<topic>-profile.md` (those are the previous workspace's facts). The skill's routing table
   loads the right master on demand. Never scatter copies of individual standards into repos,
   wikis, or prompts; that recreates the drift problem the library exists to prevent.
2. **Fill in profiles.** Each standard that needs project facts ends with an
   **Appendix A — Project profile (TEMPLATE)**. Copy the template (not the standard) to
   the skill's `profiles/<topic>-profile.md`, fill it in, keep it current. Rules are
   universal; the profile is this workspace's instantiation of them — living reference
   data, not a run log.
3. **Wire the guard rails.** Every standard ends with CI checks that make it enforceable
   rather than aspirational. Adopt them incrementally; each names what it catches.
4. **Audit against it.** Run `/eng-rulebook audit` periodically (reports land in the workspace's
   `eng-rulebook-audit/<date>/`); a finding that recurs across runs is either a missing guard
   rail or a `library-gap` — fix the standard, not just the instance.

## The standards

> **This is a scope index, not a router.** It answers *"what does each standard cover?"* — one row per file,
> single-valued. It does **not** answer *"what do I read for the task in front of me?"*: that question is
> task-keyed and legitimately multi-valued (several tasks need two or three masters), and it is owned by the
> routing table in [`SKILL.md`](../SKILL.md#routing-table). Routing from this index instead silently drops the
> multi-lane rows. Lane ownership — which file owns a subject when two could claim it — is owned by
> [`_authoring.md`](_authoring.md) § Library index. This file **is** authoritative on the adoption model below.

| Standard | One-line scope |
| --- | --- |
| [`type-safety.md`](type-safety.md) | Compiler strictness baseline, `any`/cast policy, schema-derived types, parse-don't-assert at trust boundaries |
| [`testing.md`](testing.md) | The clean-checkout guarantee (hermetic suites), integration-first split, the must-test list, contract-pinning tests |
| [`security.md`](security.md) | Session tiers with explicit revocation blast radius, input validation & SSRF, secrets, rate limits, storage posture |
| [`data-integrity.md`](data-integrity.md) | Stored-state correctness: atomic claims, fencing tokens, idempotency keys, terminal-state guards, migrations, cleanup |
| [`resilience.md`](resilience.md) | Behaviour when dependencies fail: timeouts, bounded retry, transient-vs-terminal classification, degradation ladders, watchdogs |
| [`config-and-environment.md`](config-and-environment.md) | Fail-closed boot, env taxonomy, client-bundle exposure, environment gating, build/runtime coupling |
| [`api-contracts-and-codegen.md`](api-contracts-and-codegen.md) | The spec as single source of truth, envelope & closed error codes, codegen in every consumer, generated-file discipline |
| [`observability.md`](observability.md) | The silent-degradation ban, alarms on money/availability paths, structured domain logging, correlation |
| [`tooling-and-workspace.md`](tooling-and-workspace.md) | Multi-repo uniformity: package manager, script vocabulary, config baselines, lockfiles, generated dirs, CI parity |
| [`mobile-app.md`](mobile-app.md) | The mobile client: session/push lifecycle, backgrounding, binary-vs-OTA versioning, store & native build config, wired-or-hidden controls |
| [`comment-standard.md`](comment-standard.md) | Code comments: generated docs own the narrative, comments own point-of-edit constraints; reference rules and comment truth |
| [`web-client.md`](web-client.md) | The browser surface: token handling in memory, the refresh race, route guards are UX not access control, XSS sinks and CSP, CSRF, third-party script authority, accessibility |
| [`ai-features.md`](ai-features.md) | Product LLM/agent surfaces: untrusted-content-as-data, tool authority, schema-validated model output, evals as a gate, cost and quota |
| [`data-protection.md`](data-protection.md) | Personal data as a code concern: the inventory, retention by class, deletion and export implementation, third-party egress, residency, consent as stored state |
| [`supply-chain-and-build-integrity.md`](supply-chain-and-build-integrity.md) | What may enter the dependency tree, CI step and image pinning, workflow token scope, build-time identity, SBOM and signed provenance with fail-closed verification |
| [`performance-and-data-access.md`](performance-and-data-access.md) | Cost that scales with data volume: index justification and query-shape matching, the N+1 class, result and payload bounds, caching, pool sizing, latency budgets and deadline cancellation |

Authoring a new standard or editing one: [`_authoring.md`](_authoring.md) is the contract —
required shape, genericity rules, lane ownership, evidence bar.

## The delivery seam — this library owns WHAT, a delivery process owns WHEN

These rulebooks are criteria. They do not decide when a check runs, who signs it off, or whether
a change ships — that belongs to whatever delivery process a workspace uses (in this workspace,
the `stagegate` skill, which declares the seam and its invariants from its side).

Two consequences bind this library:

- **Route delivery concerns out, don't absorb them.** Multi-reviewer panels, fresh-context
  review, held-out authoring, tier routing, PR-size caps, deploy ordering and review cadence are
  *process*. A rule here that legislates them grows a shadow copy of the delivery process, and
  the two will disagree. Test: **if the obligation is about a person's workflow rather than a
  property of the code, it is not ours.**
- **This library never gates anything.** A rulebook states a property and, where relevant, a
  blocking threshold (e.g. `security.md` §10's critical/high). Applying that threshold to a
  particular change is the delivery process's call, and running `/eng-rulebook audit` as a
  per-change gate is a category error — it is workspace-scoped and would fail a one-line fix on
  pre-existing findings in unrelated repos.

## Cross-cutting themes the topics share

These recur across standards because they recurred across audits; if you remember five
things, remember these:

1. **Silent failure is the enemy everywhere.** Hand-mirrored contracts drift silently,
   degradation ladders fall through silently, spec blocks outside the generator glob vanish
   silently, a missing metric hides a fleet regression. Most guard rails in this library
   exist to convert a silent failure into a loud one.
2. **The database constraint is the arbiter, not application logic.** Atomic claims, unique
   idempotency indexes, caps enforced inside the write filter — under concurrency, only the
   store's guarantee holds.
3. **Decide from durable truth, not process signals.** Exit codes, in-memory state, and
   "the request returned 200" are signals; the artifact existing in storage is truth.
4. **Money paths get the strictest everything** — dedup on retry, phase markers, attempts
   caps, alarms. A transient blip that costs real money is a bug class of its own.
5. **A mechanism half-adopted is worse than none** — a single-source config endpoint one
   client ignores, a revocation lever that misses one credential family — because it reads
   as solved. Adopt fully or track the gap explicitly.
