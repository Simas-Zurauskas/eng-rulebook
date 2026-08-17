---
name: eng-rulebook
description: Engineering standards — 16 generic rulebooks loaded before building or checked against code. BUILD-TIME load (default), for nontrivial work on: API endpoints/wire contracts, auth/sessions/uploads, personal data/retention/deletion, jobs/queues/paid external calls, env or deploy config, tests, logging/metrics/alarms, dependencies/CI/build integrity, queries/indexes/caching, web client (XSS, CSRF, tokens, accessibility), mobile app, LLM or agent features, repo scaffolding, TypeScript strictness, code comments — or when the user mentions standards, guidelines or house rules; invoke /eng-rulebook <topic>. Also: /eng-rulebook check [<ref>] diff-scoped review at merge cadence; /eng-rulebook profile <topic> declare workspace facts; /eng-rulebook audit [<topic>] multi-agent verified codebase audit writing a report — use for a quality or security audit, full review, or checking code against the standards.
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
| `/eng-rulebook check [<ref>]` | **Check** (diff-scoped) | Verify a change against the standards it touches, at merge cadence; the run is recorded under `<home>/check-runs/`. Follow "Check mode" below. |
| `/eng-rulebook profile <topic>` · `/eng-rulebook profile status` | **Profile** | Create or review this workspace's declared facts for a topic. Follow "Profile mode" below. |
| `/eng-rulebook audit`, `/eng-rulebook audit <topic>`, `/eng-rulebook all` | **Audit** | Run the multi-agent, coverage-gated, independently-verified audit of the codebase against the standards; write a report to `<home>/audits/<date>/` (§ Where eng-rulebook writes). **Follow [`audit.md`](audit.md) — read it in full and execute it.** `audit` = all standards; `audit <topic>` = one standard's criteria; `all` = alias for `audit`. |

The point of the default mode is timing: load the relevant standard **before writing**, not
after a review finds the violation. The audit mode is the verification twin — same criteria,
applied after the fact.

## Where eng-rulebook writes

**This section is the single normative statement of the output location.** Everywhere else —
the mode table above, `audit.md`, `README.md`, every master's Appendix A — refers to `<home>`
and points here. Two statements of the same path is how they come to disagree with nothing able
to detect it.

**Resolve `<home>`, in this order, from the directory the command was run in:**

1. **An explicit override** — `--root <dir>` for the scripts, an invoker-supplied path for the
   agent modes. Wins outright. A `--root` that does not exist is an error, never an implicit
   `mkdir`.
2. **The project wiki.** Candidates are the `wiki-*/` directories in the current directory; the
   `.internal/plan.yaml` marker is what makes one a real wiki-system wiki.
   - Exactly one candidate → `<that>/eng-rulebook/`. If it has no marker, use it anyway but say
     it is not a wiki-system wiki.
   - Several candidates, exactly one marked → the marked one wins.
   - Several candidates, two or more marked → **stop and ask.** Never pick between two real
     wikis silently.
   - Several candidates, none marked → fall through to 3, saying which folders were found and
     that `--root` selects one.
3. **Otherwise `eng-rulebook-audit/`** under the current directory — the standalone / no-wiki
   case.

Being a git repo is not part of resolution: a resolved wiki directory that is not yet a repo is
still used, and eng-rulebook never runs `git init` on the project's behalf.

**The tree is the same whichever branch resolved:**

```
<home>/
  .gitignore                 # seeded when absent: audits/*/_work/
  profiles/
    <topic>-profile.md       # this workspace's declared facts
    guard-rails.md           # the wired-rails ledger
  audits/<YYYY-MM-DD>/       # one report directory per audit run
  check-runs/                # the merge-cadence trail — see Check mode step 8
    <YYYY-QQ>.md             #   the ledger: one row per check run, always written
    <YYYY-MM-DD>-<sha>.md    #   detail, only for runs with findings
```

**`check-runs/` is not `checks/`.** The skill's own `checks/` directory holds the mechanizable
guard rails as runnable artifacts (semgrep, eslint, tsconfig, CI). These are run *records*. Two
directories one path segment apart with opposite meanings is a trap; the names stay distinct.

**Retention, and what it can and cannot mean.** A completed audit supersedes the checks that
preceded it — it re-examines the whole workspace against the same criteria — so `check-runs/`
detail files older than the last completed audit may be deleted, while the ledger files stay
(they are small, and they are the only proof a check ran). Deleting is always a human's act; the
library never removes a workspace's files. **Note what deletion does not do:** where `<home>` is the
project wiki these files are tracked, so removing one clears the working tree, not the history.
Retention there is tidiness, not erasure — which is why the redaction rule in Check mode step 8
is the control that actually bounds what ends up in the repo.

**Why the wiki.** The wiki folder is its own git repo and the project's one shared artifact,
while the workspace root that holds it is deliberately *not* a repo. Profiles are decisions the
team has made; kept at the workspace root they are tracked by nothing and reach nobody. Inside
`wiki-{project}/` they travel with the rest of the project's documentation. They sit in a part
of the docs root that wiki-system contractually never writes, deletes, or walks, so a `recheck`
will not touch them.

**They do not reach CI for free.** The wiki is a *separate* repo from the code repos, so a CI job
running in a code repo must check the wiki out to read a profile. That is a deliberate trade:
the alternative — a copy per code repo — is the per-project variance this library exists to
prevent.

**Migrating an older install.** Profiles previously lived at `eng-rulebook-audit/profiles/`
(v2) and, before that, inside the skill at `profiles/`. Both are still **read** when `<home>`
has none, with a hint naming the `mv`; neither is ever written. If both `<home>` and a legacy
location hold profiles, `<home>` wins and the duplicate is reported — never merged, because
merging two half-filled fact sets produces a profile nobody decided.

## How to use (build-time load)

1. Match the task to topic(s) in the routing table below.
2. **Read the matching master file(s) whole** — each is 200–450 lines, sized to be loaded
   in full. Load the lane you're in, not the library.
3. **Check `<home>/profiles/` for a profile** — `<home>/profiles/<topic>-profile.md`, where
   `<home>` resolves per § Where eng-rulebook writes (normally `wiki-{project}/eng-rulebook/`,
   which is a git repo, so the facts travel to teammates).
   A profile is this workspace's filled-in copy of the standard's Appendix A template — the
   current project facts that make generic rules decidable (spec globs, state machines, env
   tables, session tiers). Living reference data, not run records: update it when the
   project changes.
   If it is missing, proceed on the master alone, say so, and offer to create the profile
   from the master's Appendix A template. (A profile found at a legacy location — the
   workspace-root `eng-rulebook-audit/profiles/`, or the *skill's* old `profiles/` — is read,
   with an offer to move it to `<home>/profiles/`.)
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
shard plan — the machinery the audit needs exists because *it* has to prove it missed nothing
across a whole workspace. Here the scope is given. A check does write a record (step 8), but a
ledger row plus, on exception, one file is not that machinery: the cost this paragraph is
defending is sub-agent dispatches, not `writeFile`.

1. **Take the diff.** `<ref>` if given, else the working tree against the merge-base of the
   default branch. If the diff is empty, say so and stop.
2. **Route from changed paths, not from self-classification.** Map each changed file to lanes
   via the routing table. A change touching `routes/`, `auth/`, a migration and a workflow file
   loads four lanes — the agent's sense of "this is just a small fix" is not the router.
3. **Tier the diff — from the same changed paths, never from judgement.** Routing (step 2)
   decides *which* lanes; the tier decides *depth*. Triggers are OR-combined and the most
   dangerous attribute wins:
   - **Trivial** — docs, comments, or formatting only; no executable-behaviour change. Emit the
     receipt row, **record the run (step 8)**, and stop; skip master loads. Mechanical rails
     (lint, SAST, dependency audit) still run — the security gate is never dropped, at any tier —
     so a rail firing at Medium or above on a trivial diff still produces a detail file.
   - **Elevated** — any changed path touches: auth/session/crypto or payment code; a migration
     or schema; a dependency added or bumped; CI/workflow files; agent rules files (`CLAUDE.md`,
     `.claude/skills/`, agent instruction files — security-critical config); or personal-data
     egress. Load every matched lane's master in full, and the verification step (7) records an
     explicit refutation attempt per finding. The receipt names the tier and the triggers hit.
   - **Standard** — everything else: the procedure as written below.
4. **Load only those masters, plus any filled profile for them.** Note any missing profile that
   the loaded rules need; do not guess its contents.
5. **Check the diff against each loaded master's Checklist** — those boxes are written to be
   decidable from a diff alone (`_authoring.md` rule 12).
6. **Report findings in the audit's format** (`Standard:` field, severity, evidence with
   `path:line`) so a `/eng-rulebook check` finding and an audit finding are the same object and can
   be triaged together.
7. **Verify before reporting.** Re-read the cited code and try to refute each finding — a guard
   upstream, an index declared elsewhere, a test that pins the behaviour. Unverified leads are
   labelled `Plausible`, never reported as defects.

8. **Record the run.** Under `<home>/check-runs/` (§ Where eng-rulebook writes). Create that
   directory if it does not exist; create `<home>` itself the same way `audit.md` does.

   **The ledger — always written, one row per run**, including clean runs and `trivial` tier. A
   ledger holding only the runs that found something cannot tell *"we checked and it was clean"*
   from *"nobody checked"*, which is the whole reason the guard-rail ledger exists.

   File `<YYYY-QQ>.md` — calendar quarter of the run date, e.g. `2026-Q3.md`. If it does not
   exist, create it with exactly this header, then append one row per run:

   ```markdown
   # Check runs — 2026-Q3

   | Date | Ref | Tier | Lanes | C/H/M/L | Library | Detail |
   | --- | --- | --- | --- | --- | --- | --- |
   | 2026-08-17 | a1b2c3d | standard | security r1, testing r2 | 0/1/2/0 | v5 | [detail](2026-08-17-a1b2c3d.md) |
   | 2026-08-17 | e4f5a6b dirty | trivial | — | 0/0/0/0 | v5 | — |
   ```

   `Lanes` holds one `<lane> r<Rev>` token per loaded master, comma-separated — `—` when none
   were loaded. `Library` is the library `VERSION`. Those two carry the version **and** each
   master's `Rev:`, and they are load-bearing rather than bookkeeping: `audit.md` delta mode
   resolves a prior finding as `rule-changed` by comparing exactly those, and an unchanged `Rev:`
   is what lets it skip the CHANGELOG walk. A row without them is unreadable a release later.

   `Ref` is the commit the diff was taken against: the `<ref>` argument if one was given, else
   the short SHA of `HEAD`; append ` dirty` when the working tree had uncommitted changes. Never
   invent a SHA — if there is no commit at all, write the merge-base short SHA and mark it
   `dirty`.

   **The detail file — only when there is something to detail.** Write
   `<YYYY-MM-DD>-<sha>.md` (the same short SHA the row used) when the run produced a finding at
   **Medium or above**, or any finding at `elevated` tier. Below that the row is the whole record.
   Delta mode resolves only prior Critical/High, so anything it consumes always has a file. Same
   finding format as step 6. If that filename already exists — which is normal when re-checking a
   dirty working tree — suffix `-2`, `-3`; rows and files are appended, never overwritten.

   **Redact secrets — a hard control, not hygiene.** Step 6's format quotes code with `path:line`,
   and these records outlive the run: when `<home>` is the project wiki they are committed to a
   shared docs repo, and even in the no-wiki fallback they sit on disk and may be committed later.
   That is the condition under which `audit.md` prime directive 6 stops being hygiene. Mask any
   credential or key in the quoted evidence (`sk-…a4f2`, `password 'a****'` — enough to identify,
   never enough to use). The record must not become a leak vector. This applies in **both**
   `<home>` branches; do not reason from "this workspace has no wiki" to a weaker control.

   **When the run has nowhere to write** — a headless check in a code-repo CI job, where there is
   no wiki and the checkout is ephemeral and often read-only (`checks/ci/eng-rulebook-check.yml`)
   — emit the row and any detail into the job's output or step summary instead, and say so. The
   trail is a workspace practice; CI enforcement is a separate channel, and a check that cannot
   persist must still run and still report. Do not fail the run over an unwritable ledger.

   If the diff was empty, step 1 already stopped — no row, because no check was performed.

**Scope discipline.** Report only what *this diff* introduces or worsens. Pre-existing findings
in untouched code belong to `/eng-rulebook audit`; surfacing them here makes every change
responsible for the whole repository, which is how the check gets skipped. If a diff makes a
pre-existing problem materially worse, that is in scope — say which.

**This mode blocks nothing.** It produces findings and the threshold each cited rule states.
Whether a change ships is the delivery process's call (`references/README.md` § The delivery seam).

## Profile mode

A profile is this workspace's filled-in copy of a standard's **Appendix A**. Several rules are
explicitly undecidable without one, so an empty `<home>/profiles/` is not a neutral state — it
is a set of decisions nobody has made.

Profiles live at `<home>/profiles/` (§ Where eng-rulebook writes) — beside the audit reports,
in the project's wiki repo — never inside the skill folder, so a skill update can't clobber
them and they travel to teammates with the rest of the project's documentation.

`/eng-rulebook profile <topic>` — copy that master's Appendix A tables into
`<home>/profiles/<topic>-profile.md` and fill what can be filled:

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

**Fill order.** Four profiles are load-bearing — they carry most of the rules that are
undecidable without project facts — and are filled **first**, in adoption week one:
**security**, **config-and-environment**, **data-integrity**, **testing**. Every other
profile is filled when its lane is first touched by real work; deferring one is honest,
skipping the first four silently disables the rules a team most needs.

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
  `eng-rulebook/`** — Claude Code derives a project skill's command from the directory name, and the
  `name:` frontmatter field above is only the display label. Installed under any other directory
  name, every `/eng-rulebook …` reference in these files is wrong for that workspace. The skill
  carries **no profiles** — a workspace's profiles live in its own tree at `<home>/profiles/`
  (§ Where eng-rulebook writes), so a skill update never clobbers them and one project's facts
  never arrive in another as a decision nobody there made. If you find a `<topic>-profile.md`
  inside the skill folder naming a project that is not this one, it is inherited contamination
  from before the relocation: move this workspace's own profiles to `<home>/profiles/` and
  delete the rest, saying so. Never scatter copies of individual standards into repos, wikis,
  or prompts — the standards stay in this skill and per-project variance lives in
  `<home>/profiles/` only.
- **A recurring audit finding is a library bug:** either a standard is missing a rule or a
  guard rail isn't wired. Update the master (per `references/_authoring.md`) — don't just fix the
  instance.
- **The master is the upstream, and gaps travel back to it.** A `library-gap` recorded only in a
  workspace's report folder is a gap the library never learns — it sits next to that workspace's
  *copy*, and the next project rediscovers it. Raise it against the master via
  adding a row to `references/_gaps.md`, whose four-point intake bar is the gate.
- Standards disagree with a project's established convention → surface the conflict to the
  user; don't silently pick either side.
- **Edited anything under `references/`? Run the library's own gates before you finish:**
  `node meta/check-rulebook-shape.mjs` (every cited `§N.M` resolves; required shape intact)
  and `meta/check-tables.sh` (the four tables agree with what is on disk). Both must exit 0.
  This library has no CI — these run because an agent runs them, exactly as the sibling
  `stagegate` skill enforces its own consistency through an agent-executed preflight.
