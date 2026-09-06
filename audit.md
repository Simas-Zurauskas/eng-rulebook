# `/eng-rulebook audit` — full code & project quality audit

> **This is the audit procedure for the `eng-rulebook` skill.** It is invoked by
> `/eng-rulebook audit` (all standards) or `/eng-rulebook audit <topic>` (one standard's criteria);
> `/eng-rulebook all` is an alias for `/eng-rulebook audit`. Run from the workspace root (the folder
> holding the project's repos). It orchestrates parallel sub-agents; if orchestration is
> unavailable it runs the same plan sequentially (§ Execution discipline).
>
> **Scope resolution (which repos), in a fixed order — Phase 0:** an explicit scope the invoker
> gave for this run wins; else the workspace `CLAUDE.md`'s declared layout; else the audit lists
> what it found and asks before spending the fan-out.
>
> **Criteria:** the standards in this skill's `references/` are the rulebook. Every finding names
> the rule it violates (the `Standard:` field). `/eng-rulebook audit <topic>` narrows the criteria to
> one standard (e.g. `security`) — the census/coverage/verify machinery is unchanged; only the
> lens the auditors apply is scoped. This audit does **not** grade the standards docs themselves;
> code is the target.

---

You are performing a **full code & project quality audit** of this workspace, run as the
`eng-rulebook` skill's audit mode. The deliverable is a decision-grade report directory
`<home>/audits/<YYYY-MM-DD>/` (today's date), where `<home>` resolves per `SKILL.md`
§ Where eng-rulebook writes — normally `wiki-{project}/eng-rulebook/`, falling back to
`eng-rulebook-audit/` under the workspace root when the project has no wiki. Create the parents
if absent, and **if `<home>/.gitignore` does not exist, create it** with exactly:

```
audits/*/_work/
```

Audit is the only mode that produces `_work/`, and the script that would otherwise seed that
file (`meta/guard-rails.mjs --template`) may never have run here. Never touch
an existing `<home>/.gitignore` — see the Retention note below. **A report written under a wiki home is committed to a shared docs repo and outlives
the run, so prime directive 6's redaction is a hard control there, not hygiene** — the same
condition the Retention note below states for `_work/`. The report combines three lenses in one
pass:

- **Lens A — Defects:** correctness, security, resilience, concurrency, data integrity, performance. Asks *"is it correct and safe, and will it stay up under load and failure?"*
- **Lens B — Code health:** duplication (DRY), consistency, organization, type discipline, refactor opportunities, tooling uniformity. Asks *"is it clean, consistent, and cheap to change?"*
- **Lens C — Project state:** what is done vs half-wired vs placeholder, git state, delivery risk. Asks *"where does the work actually stand?"*

Every finding belongs to exactly **one** lens (cross-reference, never duplicate). Rule of thumb for the overlap zone: dead code, stale comments, and duplication are Lens B — **unless** the staleness or duplication can plausibly cause a production defect (a load-bearing wrong comment, a hand-mirrored contract that fails silently when one side changes), in which case it is Lens A with the concrete failure scenario spelled out.

## Prime directives (ordered; earlier wins on conflict)

1. **Read-only.** Never modify product code, data, or remote state. Local mechanical checks (typecheck, lint, hermetic tests) are allowed; anything that needs credentials, network mutations, or a shared environment is not.
2. **No claim without an anchor.** Every finding cites `path:line` with quoted code. Never cite line numbers into generated files (`*_generated*`, build output) — cite the generator or the committed source instead.
3. **Verify before you publish.** Every Critical/High/Medium Lens-A finding passes an independent refutation check before it enters the report. If budget runs short, **cut auditor breadth, never verification** — 30 verified findings beat 60 leads.
4. **Coverage is tracked, not assumed.** Every in-scope source file ends the audit with an explicit disposition (read-fully / read-partially / skimmed / inventoried-only), reconciled against a file census. Publish the ledger.
5. **Disclose what ran and what didn't.** If any phase is cut short, the README says so in a "what ran" table before any counts are quoted. An honest partial audit beats a confident incomplete one.
6. **Redact secrets.** When a finding involves a credential or key, mask the value (`sk-…a4f2`, `password 'a****'` — enough to identify, never enough to use). The report itself must not become a leak vector.
7. **Persist state continuously.** Every artifact in the `_work/` inventory (Phase 8) is written by the phase that owns it, as that phase completes — not batched at the end. An interrupted run is then resumable and partial work is never lost. The inventory is the single list; do not maintain a second one here.

## Phase 0 — Orientation (sequential)

> **closes:** `state.md` row `phase-0` · writes `_work/state.md` (creating `_work/` and the run's `run:` stamp, written **once** here and never recomputed — a run spanning midnight must not change its own directory).

- Read the workspace `CLAUDE.md`, each repo's `CLAUDE.md`/`README`, and the project wiki/docs index if one exists. Note documented gotchas (e.g. known-stale comments) so auditors don't rediscover them as findings.
- **Load the criteria (this skill's own references).** Read `references/README.md` (the index) and, for `/eng-rulebook audit`, every master under `references/`; for `/eng-rulebook audit <topic>`, that one master. Read every filled profile under `<home>/profiles/*.md` (`SKILL.md` § Where eng-rulebook writes; legacy installs may still hold them at the workspace-root `eng-rulebook-audit/profiles/` or inside the skill's `profiles/` — read those too and flag the pending migration) — the profiles hold the project facts that make generic rules decidable (session tiers, spec globs, state machines, env tables), and every rule that turns on a project fact is undecidable without them. A profile that is missing is itself a finding candidate (the project has not declared a decision the standard requires); a profile's claims are verified against code like any other doc — a stale profile is worse than a missing one. Each auditor's context pack (below) carries the masters + profiles relevant to its shard so findings can cite `Standard: <file §rule>`.
- **Verify the criteria before auditing against them.** Run `node meta/check-rulebook-shape.mjs` and record its output in the coverage-and-method report.
- **Check anchor freshness.** Each master's §0 External-anchors table carries the date it was verified. Flag any table older than 12 months in the coverage-and-method report, and treat a rule resting on a **superseded revision or an expired draft** as `Plausible` rather than confirmed until the anchor is re-checked — a rule can be textually intact and still cite a document that no longer says what it said. Re-verifying every anchor is not this run's job; noticing that one is stale is. Every `Standard:` field this run emits is an anchor into these files; if an anchor does not resolve, findings citing it are unverifiable by directive 2 and the reader cannot look the rule up. This is the only place the check meets a run that reliably happens.
- **Context budget.** Reading *every* master here is what exhausts the orchestrator first (§ Execution discipline). Read `references/README.md` (the index) plus only the masters a shard actually needs; the full text of a master belongs in the sub-agent auditing against it, which is where the context budget lives. For `/eng-rulebook audit <topic>`, that one master.
- **Resolve which repos are in scope — in this order, and never silently guess:**
  1. **An explicit scope the invoker gave for this run** (e.g. "Repos in scope: repo-a, repo-b") wins outright — it is the freshest signal and may deliberately narrow a run.
  2. **Else the workspace `CLAUDE.md`'s declared layout.** Most projects document which top-level directories are maintained code units versus sandboxes, read-only legacy, and asset trees (often a "Layout" table); take the scope from that split.
  3. **Else — no override and no CLAUDE.md scope statement — do not proceed on a guess.** List every top-level directory you discovered, classify each as likely-maintained / sandbox / legacy / asset-only / secrets, and **ask the invoker to confirm the set** before fanning out. A multi-agent audit is expensive and a mis-scoped run wastes all of it.
  In every case, **state the boundary you drew**: list what you are **excluding** (legacy read-only reference trees, design sandboxes, asset-only folders, secrets directories) and why. If CLAUDE.md's layout looks stale against what is on disk (a listed repo missing, an unlisted code unit present), flag the discrepancy and confirm rather than trusting either blindly.
- Record per repo: current branch, commit SHA, clean/dirty tree, and divergence from the default/deploy branch (`git status --porcelain`, `git rev-parse HEAD`, `git rev-list --count`). These SHAs pin the audit snapshot and go in the README header.
- **Delta mode:** if prior report directories exist under `<home>/audits/` — **or under any of the legacy layouts: `eng-rulebook-audit/<date>/` at the workspace root (before reports moved into the home), and the older names `standards-audit/` and `audit-*` (from before the skill was renamed)** — read their READMEs and must-fix lists. Search all four; a workspace audited under an earlier convention has its history there, and a delta pass that cannot see it silently reports every prior finding as new. Resolve each prior Critical/High in this order, and the order is load-bearing:
  1. **`rule-changed` FIRST.** Compare the library `VERSION` and the cited rulebook's `Rev:` against what the prior report recorded; walk `CHANGELOG.md` for any `RELAXES` or `Renumbered:` entry touching the cited file. If the rule the finding cites was weakened, removed, or renumbered, the finding resolves as **`rule-changed`** — never as `fixed`. The other three labels all presuppose a stable rule, so evaluating them first is what marks a finding `fixed` when the rule was merely deleted, which a human reads as *"the security gap was closed"*.
  2. Then `fixed` / `still-open` / `regressed`, **re-verified in current code** — do not trust the old report.
  If a rulebook's `Rev:` is unchanged since the prior report, the rule provably did not change and the CHANGELOG walk is skipped for that file. Do not re-derive from scratch what a prior audit already evidences; re-verify and cite it.
- **Second delta input — the merge-cadence trail.** Also read the **check detail files** written since the last audit: `<home>/check-runs/<YYYY-MM-DD>-<sha>.md` (`SKILL.md` § Check mode step 8). Resolve each Critical/High finding recorded there through the **same four labels in the same order** as prior audit findings — `rule-changed` first, without exception; this adds a source, never a reordering. Where that ordering leaves it, a finding raised by a check and still present in current code resolves as **`still-open`** rather than as new, and the distinction is worth having: reporting it as new tells a reader nobody had seen it, when in fact it was raised at merge time and shipped anyway. Read the detail files, not the ledger: a ledger row carries severity *counts*, not finding identities, so it cannot support this resolution. The ledger is still worth a glance for the opposite signal — a stretch of commits with no rows at all means the check was not being run, which belongs in the coverage-and-method report, not in the findings.

## Phase 1 — Census & coverage plan (sequential)

> **closes:** `state.md` row `phase-1` · writes `_work/census/<repo>.txt`, `_work/coverage-plan.md`, `_work/shards/<shard>.md`.

This phase is the "don't miss files" mechanism. Do not skip or approximate it.

1. **Census — dispatch one enumeration sub-agent per repo, in parallel** (respecting the concurrency cap in § Execution discipline). Each agent reads its repo's `CLAUDE.md` first (the source of truth for what counts as a code unit there), enumerates every tracked file with `git ls-files` (or `find` for non-git trees), records file count and LOC (`wc -l`; `cloc` if available), and **writes its own `_work/census/<repo>.txt`** — the orchestrator merges them. This keeps raw source out of the orchestrator's context (the first place a large multi-repo run runs out of room) and scans N repos at once. A file missing from the census is a file that escapes the audit — completeness here is mandatory, not best-effort.
2. **Classify every file:** `product-source` / `test` / `config-tooling` / `generated` / `vendored` / `asset-binary` / `docs`. Spot-check the classification by sampling — a misclassified generated file wastes an auditor; a misclassified source file escapes the audit.
3. **Risk-tier the product source:**
   - **T1 (deep read):** entrypoints, auth/authz, anything touching money or external paid APIs, concurrency/queue/lease logic, data models & migrations, security boundaries (upload, download-proxy, webhooks, admin), crypto/tokens.
   - **T2 (full read):** all remaining product source and config-tooling.
   - **T3 (skim with purpose):** tests (read for what they reveal about intent and for coverage gaps), lockfiles (dependency audit input only).
   - **T4 (inventory only):** generated, vendored, assets. Audit the generator, not the output.
4. **Shard:** partition T1+T2 into auditor assignments with **explicit file lists** — bounded at roughly 15–25 files or ~4 KLOC per shard (a single file over ~2 KLOC becomes its own shard, read in segments). Never assign an area by name ("audit auth") without the file list; that is how files get missed.
5. **Coverage gate (HARD HALT — the "nothing missed" guarantee).** Before fan-out, take the union of every shard's file list and diff it against the T1+T2 census. **Every T1/T2 file, and every high-signal-kind file regardless of tier (route/controller/model/migration/auth/crypto/queue/payment/upload), is either assigned to a shard or explicitly listed as excluded-with-reason.** Halt and surface the unassigned list if any remain — a substantial file (LOC ≥ 100) unassigned, a high-signal file unassigned, or > 10% of T1/T2 LOC unassigned all trip the halt. This is borrowed from a documentation generator that once shipped a plan missing an entire 600-LOC component because no such gate existed; it is non-optional here for the same reason. Persist the assigned/excluded split to `_work/coverage-plan.md`.
6. **Size the plan to budget and declare it** before fan-out: number of shards, auditors per lens, expected verification load, and what you will cut first if constrained (order: T3 depth → Lens-B breadth → T2 shard merging; **never verification, never the census, never the coverage gate**).

## Phase 2 — Mechanical baseline (sequential, before fan-out)

> **closes:** `state.md` row `phase-2` · records every command, its exit status and salient output verbatim.

Run per repo and record exit status + salient output verbatim (these results also seed auditor attention):

- The repo's own scripts where they exist: typecheck, lint, format-check, and the test suite **only if hermetic** (in-memory DB, mocked network). Skip and record anything requiring credentials, live services, or device builds.
- **Resolve the commands from the repo's language, not from memory.** Invoke the repo's own task names where they exist (`tooling-and-workspace.md` §3, `python-packaging.md` §4, `php-packaging.md` §4); fall back to the tool only when no task is defined. **A language whose gate you did not run is a coverage gap, not a clean result — record it as such.**

  | Language | Typecheck / analyse | Lint · format | Dependency audit |
  | --- | --- | --- | --- |
  | TypeScript | `tsc --noEmit` | ESLint · Prettier | `npm audit` / `yarn audit`, or `osv-scanner` |
  | Python | the repo's declared checker — `mypy` or `pyright` (`python-typing.md` §2.1) | `ruff check` · `ruff format --check` | `pip-audit` / `uv pip audit`, or `osv-scanner` |
  | PHP | the repo's declared analyser at its declared level — PHPStan or Psalm (`php-typing.md` §2.2) | php-cs-fixer / PHP_CodeSniffer | `composer audit` |

  **Record the configuration, not just the exit code.** For Python and PHP the gate's *level* is the whole control and its default is near-silent — mypy skips unannotated function bodies unless `check_untyped_defs` is on, and PHPStan's default level is 0. A green run at the tool default is evidence of almost nothing, so capture the strictness setting alongside the result; a pass whose level you did not record cannot be interpreted later.
- **Dependency audit** (per the table above) — record Critical/High advisories; also note unmaintained or many-majors-behind pins.
- **Secret sweep:** pattern scan for committed credentials (`AKIA`, `-----BEGIN.*PRIVATE KEY`, `password\s*[:=]`, bearer/API-key shapes, high-entropy literals) across tracked files; verify `.gitignore` posture of env/secret paths. Findings are Lens A; apply directive 6.
- Cheap structure metrics: largest files, TODO/FIXME density, test-file-to-source ratio. These are context for auditors, not findings by themselves.

A failing typecheck/lint/test is an automatic finding (severity by consequence). If a script is missing entirely (e.g. a repo with no test script), that is a Lens-B tooling finding.

## Phase 2b — Enforcement reconciliation (sequential, before fan-out)

> **closes:** `state.md` row `phase-2b` · writes `_work/guard-rails.md`.

Every rulebook declares guard rails; adoption is incremental by design. Without reconciliation,
"adopted incrementally" and "adopted nothing" produce the same audit — and the report reads as
though the rails were doing work.

- Run `node .claude/skills/eng-rulebook/meta/guard-rails.mjs --ledger` **from the workspace root**
  (this procedure's working directory — the path is skill-relative and will not resolve from there,
  and running it from inside the skill folder resolves `<home>` against the wrong directory, which
  reports every rail as unwired). It reports declared-but-unrecorded rails and recorded
  rails whose rule no longer exists — the second is the signal that a rule was removed while a
  workspace still believes it is enforced. Rails are cited by stable id (`security.GR3`), and
  findings in this phase name that id.
- For every rail the workspace's ledger marks **`wired`**, confirm it actually exists — the CI
  config, the lint rule, the test. **A rail claimed wired that cannot be located is a finding at
  the severity of the rule it was supposed to enforce**, not a documentation nit: the team
  believes that class is covered, so nobody is looking at it. This is the highest-yield check in
  the phase.
- A rail honestly marked `not wired` is **not** a finding by itself. It is context: findings in
  that rule's class are expected, and the remediation is to wire the rail rather than to fix each
  instance.
- No ledger at all → record that, and treat every rail as unwired for the rest of the run.

The result seeds auditor attention: a shard whose lane has no wired rails is where the defects
will be.

## Phases 3–5 — Deep audit fan-out (parallel)

> **closes:** `state.md` rows `phase-3`…`phase-5` · writes `_work/shard-returns/<shard>.md` **on receipt of each return**, not at the end of the phase, and appends to `_work/registry.md`.

Fan out subagent auditors over the shard plan. Every auditor receives: its explicit file list, the finding format (below), a context pack (Phase-0 summary: architecture, known gotchas, mechanical-baseline results relevant to its shard), and these standing instructions:

- Read your assigned files **completely** — no grep-and-snip. Trace data flow across imports when a claim depends on a boundary (an auth check, a queue transition, a payment). Quote exact code in evidence.
- A Lens-A finding requires a **concrete failure scenario**: specific inputs/state → specific wrong outcome. "Could be a problem" is not a finding.
- A Lens-B finding requires the **cost**: what a future change must touch, what drifts, or what a reader can't predict — plus a sketch of the refactor and its effort (S/M/L).
- Before finalizing each finding, actively try to break it: what code elsewhere would make this a non-issue (a guard upstream, an index declared in another file, a test pinning the behavior)? Check there first.
- Return, alongside findings: `files_read` with per-file disposition, and anything assigned but not read with the reason.
- Also return **positive patterns** — genuinely strong things that must not regress.

**Phase 3 — per-repo, Lens A.** Dimension checklist per shard (apply what fits the surface):
auth/authz and session lifecycle (token revocation, eviction blast radius, races between concurrent sessions, credential policy: length floor against the profile, breached-password screening, composition rules, forced rotation); input validation & injection (incl. SSRF, path traversal, upload handling); secrets & config handling (env validation, unsafe defaults, environment-gating that can misfire); concurrency (atomicity, fencing/ownership of leased work, idempotency, double-spend on paid external calls); resilience of every external call (timeouts, bounded retry with backoff, poison-work caps, what a transient 5xx does to durable state); data integrity (two-step writes without recovery, orphaned records, TTL/cleanup gaps, migration one-way doors); performance & scale (missing indexes vs actual query shapes, unbounded lists/pagination, N+1, memory amplification from large payloads, in-memory sort/aggregation limits); error handling & HTTP correctness (status codes, error envelope consistency, headersSent, body-parser edge cases); observability (can an operator detect each failure mode, or does it degrade silently — no metric/alarm = finding for money/availability paths); release/build risks (things that break a fresh build, deploy-kill windows, graceful shutdown); test-gap analysis (which of the above are untested — name the specific untested boundary); platform-specific: mobile (offline/backgrounding, push lifecycle, forced-update path, store/build config), web client (XSS sinks, token storage, CSRF, refresh races), workers (lifecycle, cleanup, exactly-once).

**Phase 4 — per-repo, Lens B.** Checklist: in-repo duplication (copy-pasted glue between strong primitives is the classic shape); twin files; oversized multi-concern files; coexisting idioms with no stated rule (error signaling, styling, export style); layering violations; dead code and half-finished migrations that leave two sources of truth; type discipline (`any`, unsafe casts, hand-rolled validation where a schema library is the norm); naming and organization consistency; comment truth (non-load-bearing drift). Rate each repo 1–5 on DRY / Consistency / Organization / Type discipline with one-line justifications.

**Phase 5 — cross-cutting (its own shards, after per-repo auditors return or in parallel with explicit file lists):**
- **Seams (Lens A):** for each pair of communicating repos, audit the contract as deployed — request/response shapes, auth handoff, failure propagation, rate-limit interactions, and an end-to-end trace of the primary user flow across all services, noting every silent-degradation point.
- **Hand-mirrored contracts (Lens B, highest-risk duplication):** constants, key layouts, taxonomies, payload shapes, validation caps duplicated across repos with nothing enforcing sync. For each: both locations, what breaks when one side changes, and the consolidation path. Include an "acceptable/expected duplication — do not fix" list to keep the recommendation honest.
- **Tooling uniformity (Lens B):** config matrix across repos (compiler strictness, lint setup, format config, script vocabulary, engine pins, dependency version drift, editor/repo hygiene) — flag divergences and the missing enforcement mechanism.
- **Project state (Lens C):** git state table; done vs to-do vs half-wired per repo (a wired-looking control that does nothing is the key hazard to name); deliberate placeholders vs accidental gaps. Do **not** audit documentation for accuracy — README/wiki/CLAUDE.md drift is out of scope; docs are orientation input only, and code is always the source of truth.

## Phase 6 — Completeness critic & gap fill (mandatory — do not cut)

> **closes:** `state.md` row `phase-6` · writes `_work/ledger.md` with every in-scope file dispositioned.

1. Reconcile the ledger: census minus union of all `files_read`. Every T1/T2 file without a disposition gets a gap-fill auditor (batch the stragglers into shards). Iterate until zero unexamined T1/T2 files.
2. Run a completeness critic over the draft findings: which checklist dimensions produced zero findings for a surface where that's implausible? Which mechanical-baseline signals (audit advisories, failing scripts, secret hits) have no corresponding finding? Which prior-audit must-fixes lack a status? Dispatch targeted follow-ups for what it surfaces.

## Phase 7 — Adversarial verification (rolling, mandatory — the only sanctioned confirmation)

> **closes:** `state.md` row `phase-7` · writes `_work/verdicts/<finding-id>.md` as each verdict lands — rolling, so an interrupted run still leaves verified findings.

Run verification **as findings land**, not as a final batch — an interrupted run must still leave verified findings, and this ordering is non-negotiable because a prior audit lost its entire verification phase to early stopping.

**An independent verifier sub-agent is the only thing that promotes a finding from lead to reported.** The discovering auditor's own confidence does not count, and a grep sweep or a re-read by the orchestrator is **not** a substitute — grep confirms the token pattern you thought to search for; the verifier reproduces (or refutes) the reasoning from the code, including the guard upstream or the index in another file that makes a plausible finding wrong. Narrow verification breadth under budget pressure by cutting auditor breadth first (fewer leads), never by downgrading the verifier to a self-check.

- For every Critical/High/Medium Lens-A finding: an independent verifier receives **only the claim and its citations** (not the discovering auditor's reasoning) and attempts to **refute** it against the code. Verdicts: `CONFIRMED` (reproduced the reasoning from source) / `REFUTED` (drop, or downgrade with a note on what the finder missed) / `UNCLEAR` (keep, labeled `Plausible`). Criticals get two independent verifiers. A finding that reaches the report carries its verdict.
- **Verify the `Standard:` mapping too**, not just the defect: confirm the cited `references/<file> §rule` actually says what the finding claims, so a real bug isn't filed under the wrong rule (or mislabeled `library-gap` when a rule does cover it). A genuine `library-gap` — defect real, no rule covers it — is recorded as a change request against this skill's references in the report's systemic-themes section **and written to `library-gaps.md` in the report root**, one row per gap in the column order of `references/_gaps.md` so it can be transcribed upstream without re-deriving it. Say so in the report's closing: these gaps are against the workspace's *copy* of the library and reach the master only when someone adds a row to `references/_gaps.md` there.
- Lens-B counting claims ("repeated in ~20 controllers", "pasted into 12 files") are verified by grep — record the actual count.
- **Calibration:** record per shard how many claims were checked-and-confirmed versus flagged, so a thorough audit is distinguishable from a shallow one that only inspected a few files. A shard that returns findings but shows almost no confirmed-clean claims is a suspect-shallow pass — re-dispatch it once.
- Independent rediscovery by multiple auditors is a confidence signal — record "flagged by N auditors" during dedup.
- Dedup before verification: maintain a finding registry keyed by (file, root cause); merge duplicates across shards and lenses so verifiers don't burn budget on the same defect twice.

## Phase 8 — Synthesis & report assembly

> **closes:** `state.md` row `phase-8` · assembles every report file below **from the `_work/` artifacts**, never from the orchestrator's memory of them.

Output layout:

```
<home>/audits/<date>/
  README.md                     # the executive report — see spec below
  01-<repo>.md …                # one per repo: Part A (defects, by severity), Part B (code health, by leverage)
  NN-cross-repo.md              # seams, end-to-end trace, hand-mirrored contracts
  NN-tooling-and-conventions.md # config matrix, uniformity findings, recommended baseline
  NN-project-state.md           # git state, done-vs-todo, placeholders
  NN-coverage-and-method.md     # census, ledger, what-ran table, verification stats, mechanical-baseline outputs
  library-gaps.md               # defects no rule covers — transcribe upstream (references/_gaps.md)
  _work/                        # working artifacts — see the inventory below
```

**`_work/` inventory — this block is the single normative list.** Every artifact the procedure writes has exactly
one row here, and every row names the phase that writes it. Directive 7 and § Execution discipline point at this
table rather than re-enumerating it: two lists of the same artifacts is how they came to disagree.

| Path | Written by | Holds |
| --- | --- | --- |
| `_work/census/<repo>.txt` | Phase 1 | Per-repo file list, LOC, classification — written by the enumeration sub-agent, never by the orchestrator |
| `_work/coverage-plan.md` | Phase 1 | The assigned/excluded split that the coverage gate passed on |
| `_work/shards/<shard>.md` | Phase 1 | Each shard's explicit file list, as dispatched |
| `_work/shard-returns/<shard>.md` | Phases 3–5 | Written **on receipt** of each auditor's return: its findings and its per-file dispositions. Without this, dispositions live only in the orchestrator's context until Phase 6 — and a shard that returned zero findings is indistinguishable from one that never returned |
| `_work/registry.md` | Phases 3–7 | The finding registry keyed by (file, root cause) — the dedup surface |
| `_work/verdicts/<finding-id>.md` | Phase 7 | One verifier verdict per finding, with the claim as handed to the verifier |
| `_work/ledger.md` | Phases 1–6 | The coverage ledger: every in-scope file and its disposition |
| `_work/guard-rails.md` | Phase 2b | Declared-vs-wired reconciliation, and every claimed-wired rail that could not be located |
| `_work/state.md` | Every phase | Phase status only — authoritative for *status*; each artifact above is authoritative for its own *contents* |

**Retention.** `_work/` is gitignored by default — it is working state, not a deliverable. That default is
enforced by the `audits/*/_work/` line in `<home>/.gitignore`, which eng-rulebook writes when that file is
**absent** and never rewrites once it exists. A project that needs an immutable evidence trail (an external audit
regime, a customer commitment) sets `Audit evidence retention: committed` in its profile and deletes that **line**
— keeping the file, which is what makes the choice stick — and **two things change together**: `_work/` is committed, and directive 6's redaction becomes a hard control rather than
hygiene, because the working artifacts then outlive the run. Because an existing `.gitignore` is never rewritten, that edit stands. `<home>/profiles/`, by contrast, is **tracked on purpose** — profiles are the workspace's declared facts
and must travel to teammates; only the run artifacts are candidates for ignoring. (A CI job in a code repo must
check the wiki out to read them — see `SKILL.md` § Where eng-rulebook writes.)

**Finding format (uniform across all files):**

```
### <ID>. <one-line title stating the defect/cost, not the topic>
**Lens:** A|B|C · **Severity:** 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low (A) or **Leverage:** Impact×Effort (B)
**Confidence:** Confirmed / Plausible / Lead · **Category:** <kebab-slug> · flagged by N auditors (if >1)
**Location:** path:line (every site for duplication findings)
**Standard:** the `references/<file> §rule` the finding violates (e.g. `security.md §3`), or `library-gap` if the code is genuinely wrong but no standard covers it — a `library-gap` is a change request against this skill's references, surfaced in the report so the library gets fixed, not just the instance
**What's wrong:** …
**Evidence:** quoted code with path:line
**Impact:** concrete failure scenario (A) / cost of change (B)
**Recommendation:** specific fix or refactor sketch, with effort S/M/L
```

IDs are stable and prefixed per file (A1…, B1…, X1…, T1…, S1…). Severity means *consequence if it fires* × *plausibility of firing* — a certain-to-fire Low stays Low; a rare-but-catastrophic path can be High. Bucket trivia: things below Low that are still worth a line go into a single "minor notables" list per repo, not full finding blocks — do not pad counts.

**README spec (in order):** header (date, scope, per-repo SHA/branch table, audit type); TL;DR ≤300 words leading with the overall verdict and the 2–3 dominant problem clusters; **"what ran and what didn't"** table (phases, coverage %, verification stats) placed *before* any counts; severity dashboard (Lens A) and health dashboard (Lens B per-repo 1–5 scores); the must-fix list (every Critical/High with a two-sentence summary and link); prior-audit delta (fixed/still-open/regressed) when applicable; systemic themes (patterns worth fixing as classes — with finding IDs; each theme names the standard rule it violates — a recurring theme *with* a rule attached means a missing guard rail worth wiring, and a `library-gap` theme is a change request against this skill's references); **what's genuinely strong — do not regress**; a remediation plan ordered by risk-adjusted leverage and grouped into "now (security/money)" / "before <next milestone>" / "hygiene"; report index.

**Tone bar:** every sentence must survive the question "how do you know?" — the answer is a citation, a command output, or a verifier verdict. No speculation dressed as fact; no "should probably"; distinguish *observed* from *inferred* (static read cannot observe runtime index usage or real error rates — say so where it matters).

## Execution discipline

- **Orchestrate parallel sub-agents; cap at ~10 concurrent.** Above that, coordination overhead and context-poisoning risk outweigh the parallelism gain — scale by deepening (a shard agent can dispatch its own sub-shards), not by widening the pool. The orchestrator never reads raw source into its own context; it dispatches (census, auditors, verifiers) and synthesizes returned structured results — that context is the first thing a large multi-repo run exhausts.
- Prefer many small shards over few large ones.
- **Persist continuously to `<home>/audits/<date>/_work/`** — per the inventory in Phase 8, which is the single normative list of what goes there and which phase writes it. The reports are assembled (Phase 8) from these artifacts.
- If you must stop early: finish verification of findings already discovered, write the ledger with honest dispositions, and mark unexecuted phases in the what-ran table. **Never present partial coverage as full** (Prime directive 5).
- If sub-agent orchestration is unavailable, run the same shard plan sequentially — the census, coverage gate, ledger, registry, and independent verifier are what guarantee completeness, not the parallelism. They are all still mandatory in sequential mode.
