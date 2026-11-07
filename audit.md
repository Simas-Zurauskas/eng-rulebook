# Full and basics audit

Both commands use the same guide checks and evidence standard. The difference is selection,
never weakened rules or shallower verification of a selected check. Topics are chosen by the
agent after investigating the codebase; the user does not supply a topic list.

## 1. Establish scope and snapshot

Read relevant `AGENTS.md`, `CLAUDE.md`, manifests, README, and existing project constraints.
Read the installed skill's `VERSION` file for the library version; project/parent Git revisions
are not substitutes. Content hashes additionally identify edited guidance when useful.
Explicit repository scope wins; otherwise inspect the current repo or the workspace's
maintained code units. Include communicating first-party components within scope. Ask only
when materially different plausible boundaries remain; do not ask users to choose lenses.

Inventory maintained files before excluding anything. In Git, include tracked files and
untracked nonignored files (`git ls-files --cached --others --exclude-standard -z`), deduplicated.
Account for deleted paths, symlinks, submodules/nested repos, and inaccessible files explicitly;
never follow a link outside authorized scope without understanding its target. A non-Git tree
needs an equivalent bounded inventory. Tests, migrations, configs, workflow and agent instruction
files are first-party review inputs, not automatically low-priority generated material.
Classify generated/vendor/assets separately and inspect their generators/configuration where
applicable. Do not dump secret file contents into output.

Record date, scope, branch/HEAD where present, and dirty/untracked state. HEAD alone does not
identify a dirty snapshot: record the changed paths plus a content fingerprint of inspected
inputs, or equivalent diff evidence in temporary scratch. Recheck freshness before reporting;
re-read affected code if it changes. Do not include secret values in fingerprints' source logs.

## 2. Select checks from the shared library

Inspect entrypoints, core journeys, data stores, external effects, trust boundaries, platform
lifecycle, and existing checks. Use [the guide index](references/README.md) and read guides whose
surfaces exist. Within them, select the individual check IDs that actually apply.

- **Full:** select every applicable check. Read all maintained first-party source, tests, and
  configuration in scope completely; trace contracts between components. Reconcile file
  dispositions and applicable checks before claiming completion. An unexplained unread file
  or unperformed applicable check means the audit is partial, not full.
- **Basics:** prioritize checks by consequence, exposure, likelihood, and demonstrated existing
  protection. Examine core behavior, authorization, money, data loss, concurrency, external
  effects, and meaningful test protection wherever consequential. Consider every relevant
  surface before selecting; mobile, privacy, accessibility and AI risks may be essential.
  Read the complete functions/modules and connected paths necessary to decide each selected
  check. State selected IDs with short reasons and deliberately omitted areas/check groups.

A selected check ID commits to all of its applicable obligations in the scoped behavior.
Trace each obligation to the relevant inputs, guards, storage/representation boundaries and
effects; passing examples are not enough. For example, selecting SEC4 includes applicable
type, range and size handling, not just type parsing. Basics cannot silently narrow a selected
ID to its easiest subcases. If part is unexamined, mark the check incomplete; either finish it
or disclose partial work. Apply this same completeness test in full.

There is no fixed topic count, finding quota, or minimum difference between modes. A small
system may have the same selection in both. Many serious risks can make basics substantial.
Existing passing tests inform prioritization but do not establish correctness without inspecting
what they assert. Update selection if discovery reveals a new risk; report the change.

Plan by connected behavior, with explicit file ownership when splitting work. Parallel agents
are useful for independent areas or context limits; do not allocate one agent per guide by
ritual. Use the available concurrency. A small audit can be one investigator plus a batched
independent verifier. Keep a compact inventory/check-status table in scratch or the report;
resumable scratch is optional for long runs and lives outside product source. No governance ledger.

## 3. Gather evidence

Run appropriate existing type/lint/build/test commands after checking their side effects.
Only use authorized local or isolated checks; avoid production data, paid calls, live writes,
credentialed services and installs without existing authorization. Do not run auto-fix commands.
Read-only advisory queries are permitted when network access is authorized. Report missing
prerequisites as limitations, not failed product behavior. Do not replace real tests with an
unrelated compiler or tool merely to obtain a green result.

Record commands, results, and the scope/configuration they exercised. A failing command needs
triage: distinguish an actual defect, a pre-existing tooling failure, and an environmental
blocker. A missing preferred tool or script name is not automatically a defect. Review code
and test intent even when all commands pass.

Trace actual inputs/state through guards, effects and failure handling. Each lead needs a
concrete wrong outcome or demonstrable maintenance cost, source references and a proposed
bounded remedy. File length, raw duplication, dependency age, test count and coverage percentages
are attention signals, not findings on their own. Distinguish observed runtime results from
static reasoning. Record strong patterns worth preserving.

## 4. Verify and reconcile

Try to refute every substantive claim: inspect upstream guards, downstream handling, database
constraints, framework guarantees, caller contracts and existing tests. Deduplicate by root
cause before verification. A sanitizer or shared authorization guard can invalidate a local
pattern match. Verify counts when a maintenance finding depends on them.

**Use a fresh independent agent to verify consequential findings** (normally Critical/High and
Medium correctness/security/data-loss claims), batching related claims. Give the verifier the
claim, citations, relevant project constraints and access to the code, not the discoverer's
argument. Ask for counterevidence or reproduction. Record actual model/route and verdict.
Use an additional specialist only for a distinct unresolved hazard, not by severity ritual.
If delegation is unavailable or forbidden, perform an explicit contrary-case review and label
it self-performed; never describe that as independent. Unresolved claims stay questions, not
confirmed defects. The same policy applies to full and basics.

Reconcile chosen checks with completed investigations and file dispositions. For full, every
maintained first-party source/test/config file must be fully reviewed. For basics, account for
all inventoried files, including those not examined, and complete all selected checks. Under
resource limits, finish verifying existing leads and report incomplete scope; do not silently
convert full to basics. A clean result is allowed and does not require extra hunting for a quota.

## 5. Report

Produce one concise Markdown report per run, with per-repo sections when useful. Record
substantive checks and reproducible evidence; omit routine navigation transcripts and repeated
file lists. Include full reproduction code or per-file hashes only when they improve review or
recovery over a short reproduction description and aggregate fingerprint.

Include:

1. Snapshot, library version and mode; overall conclusion and the most useful next actions.
2. Scope: applicable/selected checks, selection reasons, completed file dispositions,
   deliberate omissions and blockers. Long file lists can be a collapsed appendix in the
   same report; the summary must not claim more than the evidence.
3. Checks run, their results and verification method. A static audit is not a release or
   production-health certification.
4. Confirmed defects; improvement opportunities; unresolved questions. For each include
   stable report ID, relevant guide/check ID (or an uncovered rule), source `path:line`,
   evidence, failure/cost, severity or benefit, verification and a specific bounded remedy.
   Severity reflects consequence and plausibility; improvement opportunities use benefit/cost.
5. Strong patterns and remaining limitations. No arbitrary scores or mandatory filler.

Use masked placeholders for credentials; do not publish partial usable secrets. Audit findings
need not fit an existing rule to be real; state an uncovered hazard without inventing a rule.
Audit does not edit standards or create a backlog automatically.

### Output location

An explicit output directory wins. Otherwise reuse a project-declared audit location; next,
look for a unique `wiki-*` beside the repo/workspace (a unique `.internal/plan.yaml` marker
resolves multiple candidates). Use `<wiki>/eng-rulebook/audits/<YYYY-MM-DD>/<scope>.md`.
If there is no unique wiki, use `<repo>/docs/audits/<YYYY-MM-DD>.md` for a single repo or
`<workspace>/eng-rulebook-audit/audits/<YYYY-MM-DD>/report.md` for several, explaining the
fallback. Append `-2`, `-3` on collisions; never overwrite a prior report. Create report parents
as needed, never git-init or change ignore/config files. Reject an output resolving inside the
installed skill. If output cannot be written, report in chat and name the limitation.
