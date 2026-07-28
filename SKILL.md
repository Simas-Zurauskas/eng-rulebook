---
name: eng-rulebook
description: Engineering standards — 16 generic rulebooks loaded before building or checked against code. BUILD-TIME load (default), for nontrivial work on: API endpoints/wire contracts, auth/sessions/uploads, personal data/retention/deletion, jobs/queues/paid external calls, env or deploy config, tests, logging/metrics/alarms, dependencies/CI/build integrity, queries/indexes/caching, web client (XSS, CSRF, tokens, accessibility), mobile app, LLM or agent features, repo scaffolding, TypeScript strictness, code comments — or when the user mentions standards, guidelines or house rules; invoke /eng-rulebook <topic>. Also: /eng-rulebook check [<ref>] diff-scoped review at merge cadence; /eng-rulebook profile <topic> declare workspace facts; /eng-rulebook contribute raise a library-gap; /eng-rulebook audit [<topic>] multi-agent verified codebase audit writing a report — use for a quality or security audit, full review, or checking code against the standards.
---

# Engineering standards router

The standards library is bundled in this skill's `references/` directory — one generic master
per topic, plus `references/README.md` (scope index + adoption model), `references/_authoring.md`
(the contract for writing or editing a standard), and `references/_gaps.md` (the inbound backlog
for defects no rule covers). These codify the patterns that survived real audits.

## Modes — route on the invocation

| Invocation | Mode | Does |
| --- | --- | --- |
| `/eng-rulebook <topic>` (e.g. `security`), or auto-triggered by build/review work | **Build-time load** (default) | Read the matching master(s) + profile **before writing**, so the rules are defaults, not after-the-fact findings. Follow "How to use" below. |
| `/eng-rulebook check [<ref>]` | **Check** (diff-scoped) | Verify a change against the standards it touches, at merge cadence. Follow "Check mode" below. |
| `/eng-rulebook guardrails` | **Guard rails** | Reconcile declared rails against this workspace's ledger: `node meta/guard-rails.mjs --ledger`. Seed one with `--template`. A rail claimed wired that cannot be located is a finding at the rule's severity. |
| `/eng-rulebook contribute` | **Contribute** | Raise a `library-gap` against the master. Check it against the intake bar in `references/_gaps.md`, then add a row there. |
| `/eng-rulebook profile <topic>` · `/eng-rulebook profile status` | **Profile** | Create or review this workspace's declared facts for a topic. Follow "Profile mode" below. |
| `/eng-rulebook audit`, `/eng-rulebook audit <topic>`, `/eng-rulebook all` | **Audit** | Run the multi-agent, coverage-gated, independently-verified audit of the codebase against the standards; write a report to `eng-rulebook-audit/<date>/`. **Follow [`audit.md`](audit.md) — read it in full and execute it.** `audit` = all standards; `audit <topic>` = one standard's criteria; `all` = alias for `audit`. |

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
4. If a topic argument was passed (`/eng-rulebook security`), load that master directly.
5. When fanning out implementation subagents, put the relevant master's path (and the
   profile path, if any) in the agent prompt — rules only work in the context that writes
   the code.

## After writing — the receipt

Loading a standard is not applying it, and "I loaded it" is not evidence. **After the code is
written and before you hand it back, run the loaded master's Checklist against your diff and
emit a receipt:**

| Rule | Applied? | Where | If n/a, why |
| --- | --- | --- | --- |
| `security.md` §5.1 | yes | `routes/upload.ts:31` — body schema | — |
| `security.md` §5.4 | n/a | — | no server-side fetch of a caller-supplied URL in this diff |

Three rules make it real rather than ceremonial:

- **"Loaded" is never an acceptable value** in the Applied column. Either a rule shaped the diff
  (say where), or it did not apply (say why). A checklist box that cannot be decided from the
  diff alone is a defect in the *standard* — report it as a `library-gap`, don't guess.
- **A deviation is stated, not silently dropped.** If the diff knowingly departs from a rule, say
  which rule, why, and what compensates. An undeclared deviation is the finding; a declared one
  is a decision the reviewer can weigh.
- **Re-assert at each commit boundary on long work.** Re-read only the Checklist — not the whole
  master. Standards decay within a session as context fills, and a one-shot load at the start is
  the weakest possible placement for a long build.

Keep it proportional: a one-line change gets a one-row receipt. The receipt is the cheapest
verification the library has, and it is the only step that distinguishes a standard that was
*applied* from one that was merely *opened*.

## Check mode — diff-scoped

The two other modes are "load a 350-line rulebook" and "run a multi-phase workspace audit". For
a 40-line change the honest options were nothing, or a run the audit itself calls expensive.
This is the middle, and it is the one that runs at merge cadence.

**The diff is the census.** That is what makes it cheap: no file census, no coverage gate, no
shard plan, no report directory — the machinery the audit needs exists because *it* has to prove
it missed nothing across a whole workspace. Here the scope is given.

1. **Take the diff.** `<ref>` if given, else the working tree against the merge-base of the
   default branch. If the diff is empty, say so and stop.
2. **Route from changed paths, not from self-classification.** Map each changed file to lanes
   via the routing table. A change touching `routes/`, `auth/`, a migration and a workflow file
   loads four lanes — the agent's sense of "this is just a small fix" is not the router.
3. **Load only those masters, plus any filled profile for them.** Note any missing profile that
   the loaded rules need; do not guess its contents.
4. **Check the diff against each loaded master's Checklist** — those boxes are written to be
   decidable from a diff alone (`_authoring.md` rule 12).
5. **Report findings in the audit's format** (`Standard:` field, severity, evidence with
   `path:line`) so a `/eng-rulebook check` finding and an audit finding are the same object and can
   be triaged together.
6. **Verify before reporting.** Re-read the cited code and try to refute each finding — a guard
   upstream, an index declared elsewhere, a test that pins the behaviour. Unverified leads are
   labelled `Plausible`, never reported as defects.

**Scope discipline.** Report only what *this diff* introduces or worsens. Pre-existing findings
in untouched code belong to `/eng-rulebook audit`; surfacing them here makes every change
responsible for the whole repository, which is how the check gets skipped. If a diff makes a
pre-existing problem materially worse, that is in scope — say which.

**This mode blocks nothing.** It produces findings and the threshold each cited rule states.
Whether a change ships is the delivery process's call (`references/README.md` § The delivery seam).

## Profile mode

A profile is this workspace's filled-in copy of a standard's **Appendix A**. Several rules are
explicitly undecidable without one, so an empty `profiles/` is not a neutral state — it is a set
of decisions nobody has made.

`/eng-rulebook profile <topic>` — copy that master's Appendix A tables into
`profiles/<topic>-profile.md` and fill what can be filled:

1. **Derive what the code already answers.** Most cells are discoverable — session tiers from the
   auth middleware, env tables from the boot guard, generated directories from the build scripts.
   Read the code and fill them, citing `path:line` for each.
2. **Mark what needs a human decision** as `DECIDE: <the question>` rather than guessing. A
   plausible-looking guess is worse than a blank, because it reads as a decision.
3. **Stamp the header** with the topic, the library `VERSION` and that master's `Rev:`, the date,
   and the commit the facts were verified against. Without those, nobody can tell a current
   profile from a stale one — and a stale profile is worse than a missing one.
4. **Never invent a value to make a rule pass.** An unfillable cell is a finding about the
   project, which is exactly what the profile is for.

`/eng-rulebook profile status` — list every master, whether its profile exists, how many `DECIDE:`
cells remain, and how far its `verified_at` commit is behind HEAD. Report honestly; do not
present a partially-filled profile as complete.

## Routing table

**This table is authoritative on routing.** Three sibling tables list the same filenames for different
questions — `references/_authoring.md` § Library index owns *lane ownership* (subject-keyed, single-valued),
`references/README.md` owns the *adoption model* and a scope index, `README.md` § Topics is a human summary.
Authority is per-question, so none of them overrides this one on "what do I read for this task".

**When the tables disagree, the filesystem arbitrates:** the table missing a file that exists in `references/`
is the table that is wrong — **add the row, never delete a route to make tables agree.**

**Resolving a `<topic>` token** (`/eng-rulebook security`, `/eng-rulebook audit <topic>`): unique case-insensitive
**substring** match against the filename stems in `references/`. `codegen`, `workspace`, `environment` and
`comment` all resolve uniquely this way; prefix matching would fail every one of them. No match, or more than
one, → list the candidates and ask. `audit` and `all` are reserved mode words and never resolve to a file.

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
| Personal data: what you collect, retention, deletion/export, egress to third parties, residency, consent | `references/data-protection.md` (+ `references/security.md`) |
| Query shapes and indexes, N+1, pagination bounds, payload size, caching, connection pools, latency budgets | `references/performance-and-data-access.md` (+ `references/data-integrity.md`) |
| Dependency added or bumped, CI workflow, release/publish pipeline, build credentials, SBOM or provenance | `references/supply-chain-and-build-integrity.md` |
| Web client: browser session/token handling, refresh races, route guards, XSS sinks, CSRF, third-party scripts, accessibility | `references/web-client.md` (+ `references/security.md`) |
| Product features built on an LLM or agent: prompt injection, tool authority, output validation, evals, model cost | `references/ai-features.md` |
| **Writing or editing a standard in this library** | `references/_authoring.md` (the authoring contract) |

To **audit** the codebase against these standards (rather than load one before building),
follow [`audit.md`](audit.md) — the `/eng-rulebook audit` procedure.

## Rules

- **The skill folder is the unit of reuse, and its directory name is the command.** Another
  workspace adopts the library by taking this whole skill into its `.claude/skills/` **as
  `standards/`** — Claude Code derives a project skill's command from the directory name, and the
  `name:` frontmatter field above is only the display label. Installed under any other directory
  name, every `/eng-rulebook …` reference in these files is wrong for that workspace. `profiles/` is **untracked** (`.gitignore`),
  so it arrives empty and a workspace's own profiles never travel back into the library —
  a profile is that workspace's facts, and inherited by another it reads as a decision
  nobody there made. If you find a `<topic>-profile.md` naming a project that is not this
  one, it is inherited contamination: delete it and say so. Never scatter copies of
  individual standards into repos, wikis, or prompts — per-project variance lives in
  `profiles/` only.
- **A recurring audit finding is a library bug:** either a standard is missing a rule or a
  guard rail isn't wired. Update the master (per `references/_authoring.md`) — don't just fix the
  instance.
- **The master is the upstream, and gaps travel back to it.** A `library-gap` recorded only in a
  workspace's report folder is a gap the library never learns — it sits next to that workspace's
  *copy*, and the next project rediscovers it. Raise it against the master via
  `/eng-rulebook contribute`; the intake bar and backlog are `references/_gaps.md`.
- Standards disagree with a project's established convention → surface the conflict to the
  user; don't silently pick either side.
- **Edited anything under `references/`? Run the library's own gates before you finish:**
  `node meta/check-rulebook-shape.mjs` (every cited `§N.M` resolves; required shape intact)
  and `meta/check-tables.sh` (the four tables agree with what is on disk). Both must exit 0.
  This library has no CI — these run because an agent runs them, exactly as the sibling
  `stagegate` skill enforces its own consistency through an agent-executed preflight.
