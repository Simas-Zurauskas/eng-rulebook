# Engineering Standards Library

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
| **Standards** (this library) | How we build — generic, cross-project | inside the `standards` skill (`references/`), routed by its `SKILL.md` |
| **Audit** | How we verify — after the fact | this skill's [`audit.md`](../audit.md), invoked by `/standards audit` — writes reports to the workspace's `standards-audit/<date>/` |
| **Project profiles** | The workspace's current facts (not run records) | this skill's `profiles/<topic>-profile.md` — per-workspace, since each workspace has its own copy of the skill |

Standards and the audit are twins in **one skill**: `/standards <topic>` loads a rulebook
before building; `/standards audit` checks the code against the same rulebooks and writes a
report. An audit finding maps back to the standard rule it violated (its `Standard:` field);
a defect with no covering rule is a `library-gap` — a change request against these references.
Both use the same severity language (consequence-if-it-fires × plausibility) and lens taxonomy.

## How a project adopts this

1. **Copy the skill, not the standards.** A workspace adopts the library by taking the whole
   `standards` skill folder into its `.claude/skills/`. `profiles/` is **untracked**, so a
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
4. **Audit against it.** Run `/standards audit` periodically (reports land in the workspace's
   `standards-audit/<date>/`); a finding that recurs across runs is either a missing guard
   rail or a `library-gap` — fix the standard, not just the instance.

## The standards

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

Authoring a new standard or editing one: [`_authoring.md`](_authoring.md) is the contract —
required shape, genericity rules, lane ownership, evidence bar.

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
