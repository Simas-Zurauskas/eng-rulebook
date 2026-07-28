---
name: standards
description: Engineering standards — load a rulebook before building, or audit the codebase against them. Two modes. (1) BUILD-TIME load, the default: use when starting nontrivial work on API endpoints or wire contracts, auth/sessions/uploads, background jobs/queues/paid external calls, env vars or deploy config, tests, logging/metrics/alarms, mobile app work (sessions, push, OTA/binary versions, store or native builds, permissions), repo or project scaffolding, TypeScript strictness or cast questions, or code comments — or when the user mentions standards, guidelines, or house rules; invoke as /standards <topic> (e.g. /standards security). (2) AUDIT the codebase against the standards and write a report: invoke as /standards audit (all standards), /standards audit <topic> (one), or /standards all (alias for audit-all) — a multi-agent, coverage-gated, independently-verified pass; use when the user wants a quality/security audit, full review, or to check the code against the standards.
---

# Engineering standards router

The standards library is bundled in this skill's `references/` directory — one generic
master per topic, plus `references/README.md` (index + adoption model) and
`references/_authoring.md` (the contract for writing or editing a standard). These codify
the patterns that survived real audits.

## Two modes — route on the invocation

| Invocation | Mode | Does |
| --- | --- | --- |
| `/standards <topic>` (e.g. `security`), or auto-triggered by build/review work | **Build-time load** (default) | Read the matching master(s) + profile **before writing**, so the rules are defaults, not after-the-fact findings. Follow "How to use" below. |
| `/standards audit`, `/standards audit <topic>`, `/standards all` | **Audit** | Run the multi-agent, coverage-gated, independently-verified audit of the codebase against the standards; write a report to `standards-audit/<date>/`. **Follow [`audit.md`](audit.md) — read it in full and execute it.** `audit` = all standards; `audit <topic>` = one standard's criteria; `all` = alias for `audit`. |

The point of the default mode is timing: load the relevant standard **before writing**, not
after a review finds the violation. The audit mode is the verification twin — same criteria,
applied after the fact.

## How to use (build-time load)

1. Match the task to topic(s) in the routing table below.
2. **Read the matching master file(s) whole** — each is 200–450 lines, sized to be loaded
   in full. Load the lane you're in, not the library.
3. **Check this skill's `profiles/` directory for a profile:** `profiles/<topic>-profile.md`.
   A profile is this workspace's filled-in copy of the standard's Appendix A template — the
   current project facts that make generic rules decidable (spec globs, state machines, env
   tables, session tiers). Living reference data, not run records: update it when the
   project changes.
   If it is missing, proceed on the master alone, say so, and offer to create the profile
   from the master's Appendix A template.
4. If a topic argument was passed (`/standards security`), load that master directly.
5. When fanning out implementation subagents, put the relevant master's path (and the
   profile path, if any) in the agent prompt — rules only work in the context that writes
   the code.

## Routing table

`references/README.md` is authoritative on routing; this table is a convenience copy.

| Task touches… | Read |
| --- | --- |
| API endpoint, wire shape, error codes, envelope, codegen | `references/api-contracts-and-codegen.md` (+ `references/security.md`) |
| Auth, sessions, tokens, uploads, secrets, rate limits | `references/security.md` |
| Background jobs, queues, workers, paid external calls | `references/data-integrity.md` + `references/resilience.md` |
| Timeouts, retries, degradation ladders, watchdogs | `references/resilience.md` |
| Stored-state transitions, idempotency, migrations, cleanup | `references/data-integrity.md` |
| Env vars, boot config, deploy config, build/runtime coupling | `references/config-and-environment.md` |
| Writing or reviewing tests | `references/testing.md` |
| Logging, metrics, alarms, correlation ids | `references/observability.md` |
| New repo or project scaffold, scripts, lint/format, CI parity | `references/tooling-and-workspace.md` + `references/type-safety.md` + `references/testing.md` |
| `any`/casts, strictness flags, schema-derived types | `references/type-safety.md` |
| Mobile app: session/push lifecycle, OTA vs binary, store & native build, permissions | `references/mobile-app.md` |
| Code comments, doc references in code | `references/comment-standard.md` |

To **audit** the codebase against these standards (rather than load one before building),
follow [`audit.md`](audit.md) — the `/standards audit` procedure.

## Rules

- **The skill folder is the unit of reuse.** Another workspace adopts the library by taking
  this whole skill into its `.claude/skills/`. `profiles/` is **untracked** (`.gitignore`),
  so it arrives empty and a workspace's own profiles never travel back into the library —
  a profile is that workspace's facts, and inherited by another it reads as a decision
  nobody there made. If you find a `<topic>-profile.md` naming a project that is not this
  one, it is inherited contamination: delete it and say so. Never scatter copies of
  individual standards into repos, wikis, or prompts — per-project variance lives in
  `profiles/` only.
- **A recurring audit finding is a library bug:** either a standard is missing a rule or a
  guard rail isn't wired. Update the master (per `references/_authoring.md`) — don't just fix the
  instance.
- Standards disagree with a project's established convention → surface the conflict to the
  user; don't silently pick either side.
