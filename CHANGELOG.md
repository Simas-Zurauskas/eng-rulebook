# Changelog — eng-rulebook library

`VERSION` holds one integer for the whole library. Each rulebook carries its own `**Rev:** N`
in its header. **The library integer is never written into a rulebook header** — twelve copies
of one number is the frozen-`1.0` shape this file exists to prevent.

## Change classes — defined here, once

Every other file cross-references this section by filename rather than restating it; two
statements of the same semantics is how they drift apart with nothing able to detect it.

| Class | Means | What a prior audit finding becomes |
| --- | --- | --- |
| **ADDS** | A new obligation. Code that was compliant may now be non-compliant. | Nothing changes — the finding stands. New findings may appear. |
| **RELAXES** | An obligation removed or weakened. | A prior finding may no longer be a defect → resolve it as **`rule-changed`**, *never* as `fixed`. |
| **EDITORIAL** | Wording, formatting, typos. No obligation changes. | Nothing changes. |

`Renumbered:` is a **separate axis, valid on any class.** A renumber with byte-identical text
changes nothing the code must do and breaks every citation against the old number. It is called
out on its own line so a delta pass can detect it without diffing prose.

**An EDITORIAL entry costs two fields** (class + one line). Six fields to fix a typo is the
friction that ends with the gate disabled.

### Why `rule-changed` is resolved *first*

`fixed`, `still-open` and `regressed` all presuppose a **stable rule**. Evaluating them before
checking rule stability is what marks a finding `fixed` when the rule was merely deleted — read
by a human as *"the security gap was closed"*. `audit.md` Phase 0 therefore resolves
`rule-changed` before the other three. The ordering **is** the fix; a fourth label without
reordering would not close it.

---

## v3 — 2026-08-17

**Profiles, audit reports and pulse output move into the project's wiki repo.** v2 put them at
`eng-rulebook-audit/` under the workspace root, justified as "tracked in the workspace repo so
the facts travel to teammates and CI". In a wiki-system workspace that was false: the workspace
root is deliberately **not** a git repo, so nothing there was tracked and the profiles reached
nobody. The wiki folder next to it *is* a repo and is the project's one shared artifact.

**EDITORIAL** · Touches: all 16 rulebooks
**No obligation changes** — a relocation moves where a fact is written, not what any rule
requires. Every master's change is the one Appendix A pointer line; no `Rev:` was bumped and no
`§` renumbered, so every prior `Standard:` citation still resolves.

- **New `<home>` concept, defined once** in `SKILL.md` § Where eng-rulebook writes and referenced
  by filename everywhere else. Resolution: `--root <dir>` wins; else a `wiki-*/` folder in CWD
  (disambiguated by the `.internal/plan.yaml` marker — two marked wikis stop and ask, several
  unmarked ones fall through); else `eng-rulebook-audit/` under CWD.
- **Layout under `<home>`:** `profiles/`, `audits/<date>/`, `pulse/<date>.md`, and a `.gitignore`
  written whenever that file is **absent**, carrying `audits/*/_work/`. An existing one is never
  rewritten or appended to, so a project on `Audit evidence retention: committed` opts out by
  deleting the *line* and keeping the file.
- **Audit reports gained the `audits/` level.** A pre-v3 report at `eng-rulebook-audit/<date>/`
  is still found — `audit.md` delta mode now searches four layouts, three of them legacy, so a delta pass does
  not report every prior finding as new.
- **New `meta/home.mjs`**, the executable half of the rule, imported by `guard-rails.mjs` and
  `pulse.mjs`. Both gained `--root <dir>`, parsed positionally-independently (`guard-rails.mjs`
  previously read its mode from `argv[2]`, so `--root X --ledger` would have been ignored).
  `guard-rails.mjs` resolves the home lazily: plain list mode reads only this library and must
  not fail because a workspace holds two wikis.
- **Corrected a claim, not just a path:** profiles do **not** reach CI for free. The wiki is a
  separate repo from the code repos, so a CI job there must check it out. Fixed everywhere the
  library asserted otherwise.
- **`meta/pulse.mjs` is text again.** Its duplication-window separator was a raw NUL byte typed
  into the source, so `file` called the script "binary data" and plain `grep` skipped the whole
  file — including its hardcoded paths. Now the explicit escape; the runtime string is
  byte-identical, so existing `baseline.json` files stay comparable.

**Migrating.** Nothing moves on its own. Legacy locations — `eng-rulebook-audit/profiles/` at the
workspace root (v2) and the skill-local `profiles/` (pre-v2) — are still **read**, with a hint
naming the `mv`; neither is ever written. If both hold profiles, `<home>` wins and the duplicate
is reported rather than merged.

```
mv eng-rulebook-audit/profiles/*.md wiki-{project}/eng-rulebook/profiles/
```

## v2 — 2026-08-11

The fix-pack release from the 2026-08 external assessment (assessed calibration, audit depth and
team fit; the assessment's fix list is this entry's spine), plus one structural change requested
with it: **profiles moved out of the skill and into the workspace tree.**

**EDITORIAL** · Touches: type-safety.md, testing.md, security.md, data-integrity.md,
resilience.md, config-and-environment.md, api-contracts-and-codegen.md, observability.md,
tooling-and-workspace.md, mobile-app.md, comment-standard.md, web-client.md, ai-features.md,
data-protection.md, supply-chain-and-build-integrity.md, performance-and-data-access.md
**Profiles relocated: `eng-rulebook-audit/profiles/<topic>-profile.md` under the workspace
root, tracked in the workspace repo — never inside the skill.** The old location satisfied
genericity (profiles never travelled *with the library*) but defeated the team: gitignored
inside the skill, a workspace's own declared facts never reached teammates or CI, and a skill
update could clobber them. Location now does the job .gitignore did, and tracking does the job
nothing did. Every rulebook's Appendix A names the new path; `guard-rails.mjs` resolves the
ledger from the workspace root (cwd) with a legacy fallback + migration hint; the skill's
`.gitignore` keeps a one-line legacy stanza for one deprecation window so a pre-relocation
clone cannot accidentally publish its filled profiles. Migration: move
`.claude/skills/eng-rulebook/profiles/*.md` → `eng-rulebook-audit/profiles/`.
Also in this class: CHANGELOG.md restored (deleted in error post-v1 while the delta mode,
README and `check-version.sh` still depended on it); `checks/README.md`'s stale "~74 declared
guard rails" corrected (74 → 113, counting this release's GR7–GR8); a stray pre-rename `standards.<lane>` id-scheme comment fixed in
`checks/semgrep/type-safety.yaml`; SKILL.md's install-directory bullet said "as `standards/`"
(pre-rename leftover) and now says "as `eng-rulebook/`".

**ADDS** · Touches: mobile-app.md
**§8 Network trust** (pinning is a declared posture; backup pin + expiry runway or the
installed tail bricks), **§9 Device trust** (root/jailbreak stance recorded, keystore stays the
boundary, attestation server-side), **§10 Sensitive screens** (declared capture posture per
platform; the asymmetry stated honestly), **§11 Offline write conflicts** (idempotency keys on
replay; declared conflict rule; rejected writes surface), **§12 Mobile accessibility** (labels,
platform touch-target minima, dynamic type, traversal) — closing the thinnest lane's known
gaps. Anchors verified 2026-08-11 (MASVS v2.1.0/MASTG v2.0.0, platform pinning and capture
machinery, WCAG 2.2 SC 2.5.8, WCAG2ICT Group Note 2025-12-11, Play Integrity/App Attest,
Android offline-first guide). New rails **[mobile-app.GR7]** (a11y check in CI) and
**[mobile-app.GR8]** (pin-rotation test); four checklist boxes; two failure shapes (the bricked
pin, the reconnect duplicate). Rev 1 → 2. §12 also resolves data-protection.md Appendix A's
until-now dangling pointer to mobile a11y rules. Adopting workspaces re-triage against these.

**ADDS** · Touches: _gaps.md, _coverage-asvs.md
**The ASVS candidate backlog is adjudicated.** All ten candidates from `_coverage-asvs.md` ran
through the intake bar: **accepted** — C1 MFA (largest L2 delta; a lane-split decision precedes
authoring, security.md is at the line cap), C2 safe deserialization (non-JSON), C3 TLS
substance (profile-shaped half recorded), C4 field-level authz + tenant isolation, C5 crypto
inventory/AEAD, C6 log protection, C7a request smuggling/header injection, C8 stored-file serve
path, C9a prototype pollution; **rejected with kept reasoning** — C7b GraphQL/WebSocket (bar
#3, outside the assumed shape — the V17 precedent), C9b sandboxing (bar #4, not diff-decidable;
the code-shaped case is `ai-features.md` §3), C10 OAuth AS-side (bar #3, the library consumes
an IdP). `_coverage-asvs.md` § Candidates now points at the rows as the status authority.

**ADDS** · Touches: SKILL.md, checks/, meta/pulse.mjs (new)
**Check mode tiers the diff** (trivial / standard / elevated) from changed paths, never
judgement: trivial = receipt only with mechanical rails never dropped; elevated (auth, schema,
new dependency, CI/workflow, agent rules files, personal-data egress) = full masters +
per-finding refutation notes, tier named in the receipt. **Profile fill order**: security,
config-and-environment, data-integrity, testing first; the rest when their lane is touched.
**Pulse mode** (`/eng-rulebook pulse`, `meta/pulse.mjs`): between-audit structural tripwires —
approximate duplication/churn/error-masking vs a baseline in `eng-rulebook-audit/pulse/` — a
crossed tripwire pulls the audit forward; a signal, never a gate. **Three new semgrep rules**,
each validated on a labelled fixture (9/9 TP, 0 FP) plus three real repositories with every hit
read (`checks/README.md` § Validation — the 2026-08-11 batch):
`supply-chain-and-build-integrity.workflow-unpinned-action` (ERROR),
`web-client.raw-html-sink` (WARNING, tightened by validation), and
`config-and-environment.env-number-fail-open` (WARNING, quietness demonstrated and the recall
gap stated). The CI fragment gains an optional commented `/eng-rulebook check` PR job and the
adoption steps gain the PR-ritual rule.

**Renumbered:** none. All additions append; no existing sub-rule number or guard-rail id moved.

---

## v1 — 2026-07-28

First versioned release. The library existed before this as a single unversioned commit; v1 is
the baseline every later entry diffs against.

**Renumbered:** `config-and-environment.md` — the three config-taxonomy bin rules became
`§6.2`/`§6.3`/`§6.4` (appended after the existing `§6.1`, which is cited and was left in place).
The two in-file citations of `§6.3` now read `§6.4`. No published audit report cites
`config-and-environment.md §6.x`; this was verified before renumbering, per `_authoring.md` rule 11.
`comment-standard.md` §9's source list was numbered 1,2,**4**,5 and is now 1,2,3,4 — Markdown
always *rendered* it 1,2,3,4, so no reader ever saw a `§9.4`, and only `§9.2` is cited.

**EDITORIAL** · Touches: `observability.md`, `testing.md`, `tooling-and-workspace.md`,
`comment-standard.md`, `config-and-environment.md`
Every cited `§N.M` anchor now resolves to a real `### N.M` heading — 59 dangling citations
across five files, closed. `observability.md` was a markup conversion (19 bold pseudo-headings
that nothing could resolve, in a file whose §3 already used real headings); `testing.md` and
`tooling-and-workspace.md` promoted ordered-list sub-rules whose numbers were already the
de-facto anchors, so the promotion was renumber-free. Verified: all 44 anchors cited by an
existing published audit report still resolve, and word-token counts are unchanged apart from
eight capitalisations where a mid-sentence continuation became a paragraph opening.

**ADDS** · Touches: `_authoring.md`
Rules 10–12: every cited anchor resolves; sub-rule numbers are append-only; the mechanical
gates must pass before commit. Rule 11 is the load-bearing one — renumbering passes every
structural check while silently re-pointing findings already filed in an adopting workspace,
where reports can never be retro-updated.

**ADDS** · Touches: `comment-standard.md`
A `## Failure shapes` section, required by `_authoring.md` § Required shape and previously
absent. It consolidates seven patterns already written as prose in §4.3/§4.4/§4.5/§7 — no new
evidence — and §4.3 now points at it rather than carrying its own copy. §1 renamed to name the
core principle it always was.

**EDITORIAL** · Touches: `SKILL.md`, `README.md`, `references/README.md`, `_authoring.md`
Routing authority resolved. Four documents deferred routing to `references/README.md`, which
made no authority claim and contained no routing table — so an agent following its own
instruction routed from a scope index, silently losing every multi-lane row. Authority is now
per-question: `SKILL.md` routes, `_authoring.md` owns lane ownership, `references/README.md`
owns the adoption model. Adds `<topic>` token resolution (unique substring — `codegen`,
`workspace` and `environment` all fail as prefixes).

**EDITORIAL** · Touches: `audit.md`
`_census/` and `_work/` named the same artifacts in one document; the finding registry,
coverage ledger and verifier verdicts existed only under a path the Phase 8 layout never
listed — defeating prime directive 7's resumability guarantee. Unified on `_work/`, with the
Phase 8 layout as the single normative inventory and a `closes:` obligation on every phase, so
persistence is a per-phase imperative rather than prose no phase implements.

**ADDS** · Touches: `performance-and-data-access.md` (new), `SKILL.md`, `README.md`,
`references/README.md`, `_authoring.md`
New rulebook: cost that scales with data volume — index justification and query-shape matching,
compound key order, the N+1 class, result and payload bounds, caching, pool sizing, latency budgets
and deadline cancellation. It takes sole ownership of query shapes, indexes, N+1 and payload
placement; `data-integrity.md` §10 states the same four obligations and must be reduced to a
cross-reference in the same commit (rule 7 — two owners for one subject is a library bug). §9.1
mints no new exception process: accepted gaps are rows in the waiver register
`supply-chain-and-build-integrity.md` §6.1 already defines. Registered in all four tables.

**ADDS** · Touches: `data-protection.md` (new), `security.md`
Personal data extracted from `security.md` §12 (22 lines) into its own lane and grown: inventory,
retention by class, deletion and export *implementation*, third-party egress, residency, consent
as stored state. `security.md` §12 keeps only where those obligations meet a security control,
and the extraction is what returned that file to the line budget after P0-1a's additions.
Carries the **regulatory-applicability table** every other lane routes to — one row per regime,
where a recorded "no, because…" is a complete answer and an unrecorded answer is the finding.

**ADDS** · Touches: `supply-chain-and-build-integrity.md`, `performance-and-data-access.md`,
`web-client.md`, `ai-features.md` (all new)
Four lanes the library had no home for. Each was authored against the contract and then put
through three independent adversarial reviews — contract compliance, factual integrity, and
operability across many projects — and every one returned ADOPT-WITH-CHANGES and was revised.
The factual lens earned its place: it caught a normative posture attributed to an ASVS
requirement that does not state it, an EU-regulation clause asserted in the present indicative
when the instrument was still a proposal, package-manager cooldown settings whose **units differ
per manager** (days vs minutes vs seconds — a value against the wrong key is off by orders of
magnitude), and several version/edition errors. Unresolvable claims are labelled in the files
rather than guessed.

**Renumbered / RELAXES** · Touches: `data-integrity.md`
§10 held index, payload and N+1 rules that `performance-and-data-access.md` now owns; three
reviewers independently flagged the verbatim collision. The section is **kept, not deleted** —
a published audit report cites `data-integrity.md §10` — and reduced to a routing pointer naming
each obligation's new home, so a reader of that report can still follow the citation. What stays
is the part that was always this file's lane: a claim query that cannot execute is a *liveness*
failure of the claim protocol, invisible to §3–§5 because every record remains in a valid state.
Prior findings against §10's index/payload rules resolve as `rule-changed`, not `fixed`.

**ADDS** · Touches: `testing.md`, `security.md`, `resilience.md`, `data-integrity.md`,
`observability.md`, `api-contracts-and-codegen.md`
Thirteen new obligations. **Adopting workspaces must re-triage against these** — code that was
compliant may now be non-compliant, which is what this class means.
`testing.md` §4.5 oracle provenance · §7.5 no blanket CI retry, repeat-then-quarantine · §8.1
mutation-score floor (ratchet-only, changed-files-per-PR) · §8.2 test-weakening surfaced for human
disposition, explicitly never auto-blocking.
`security.md` §2.7 the server half of CSRF (a write authorised by an ambient credential carries a
second, non-ambient proof) · §5.6 caller-influenced path segments canonicalised then bounds-checked.
`resilience.md` §13 absorbing vs shedding as different designs, shedding loud · §14 readiness vs
liveness, and drain ordering.
`data-integrity.md` §13 recovery obligation on paired writes · §14 expand → migrate → contract ·
§15 read-modify-write version guard.
`observability.md` §3.5 closed low-cardinality metric label set.
`api-contracts-and-codegen.md` §11 the documented half of input contracts, anchored to the OWASP
API Security Top 10.

**EDITORIAL** · Touches: all 16 masters
Every master now carries a dated **External anchors** table in §0 (`_authoring.md` rule 6), naming
each source's version *and status*. The pass corrected several live citations, which is why it was
worth doing rather than merely recording: `data-integrity.md` leaned normatively on an IETF
idempotency-key draft that **expired without becoming an RFC** — the content was right, the status
was wrong, and the rule now cites it as precedent rather than obligation; `type-safety.md` called
TypeScript 6.0 current while two siblings correctly said 7.0 (npm `latest` 7.0.2, GA 2026-07-08),
a library contradicting itself on a checkable fact; `testing.md` attributed *"write tests, not too
many, mostly integration"* to the Testing Trophy when it is Rauch's 2016 line that the Trophy
answers, and cited the Testing Library guiding principle as a Trophy heuristic.

**ADDS** · Touches: `_gaps.md` (new), `SKILL.md`, `audit.md`, `_authoring.md`
The library-gap loop is closed. A gap previously died in a dated report folder next to a
*workspace's copy* of the library, so the same defect was rediscovered in the next workspace.
`_gaps.md` is the inbound backlog with a four-point intake bar; `/eng-rulebook contribute` raises one
against the master; the audit writes `library-gaps.md` machine-readably; and a delivery process's
post-release retrospective feeds the same file (the back-edge is written into that skill's Stage 21).

**ADDS** · Touches: `SKILL.md`, `audit.md`, `meta/guard-rails.mjs` (new)
Guard-rail reconciliation. The library declares **109** guard rails across 16 rulebooks and adoption
is incremental, so without a ledger "adopted incrementally" and "adopted nothing" produce the same
audit. `/eng-rulebook guardrails` reconciles declared against wired; audit **Phase 2b** runs before
fan-out, and **a rail claimed wired that cannot be located is a finding at the severity of the rule
it was meant to enforce** — the team believes that class is covered, so nobody is looking at it.

**ADDS** · Touches: `checks/` (new), `_coverage-asvs.md` (new)
`checks/` ships the mechanizable guard rails as artifacts — semgrep rules whose messages name the
rule they enforce, an ESLint flat-config fragment, a tsconfig strictness baseline, and a CI
fragment. Validated against a labelled fixture and three open-source TypeScript repositories (749
files), which found three defects in the rules themselves and caused one rule to be **withdrawn**:
bounded retry cannot be pattern-matched, because bounded and unbounded retry share a spelling. The
withdrawal reasoning ships in the file. `_coverage-asvs.md` answers the question the assurance-target
declaration could not: which ASVS 5.0 chapters the library states no rule for.

**EDITORIAL** · Touches: `SKILL.md`, `README.md`, `references/README.md`
**A shipped invocation bug.** Claude Code takes a project skill's command from its **directory
name**; the frontmatter `name:` is only a display label. The library was installed under two
different directory names across three workspaces, so its documented command did not exist in two
of them — only the workspace whose directory happened to match could invoke it, which is plausibly
why it is the only one that ever ran an audit. The install directory is now stated explicitly in
all three adoption paths. Also adds three modes to the router
(`check`, `profile`, `contribute`, `guardrails`) within a **smaller** frontmatter description than
before — the cap is 1,536 characters, not the ~1,024 previously assumed.

**Renumbered / EDITORIAL** · Touches: every file
**The skill is renamed `standards` → `eng-rulebook`, and the directory name is the command.**
`standards` competed with the thing this library cites: its own text says "external standards"
(OWASP, NIST, ASVS) and "the standards" (this library) in the same paragraphs, and it carried a
compliance connotation `data-protection.md` explicitly disavows. `eng-rulebook` matches the noun the
docs already used throughout — "16 generic rulebooks", "load a rulebook before building".

What moved: the command in 56 places; the frontmatter `name`; the skill directory in the master and
all three installs; the git remote and the GitHub repository; four artifact filenames
(`meta/check-rulebook-shape.mjs`, `checks/ci/eng-rulebook-check.yml`,
`checks/eslint/eng-rulebook-base.mjs`, `checks/tsconfig/eng-rulebook-base.json`); every semgrep rule
id (`eng-rulebook.<lane>.<slug>`); the ESLint config names and exports; and the seam references in
the delivery and docs skills.

**The audit output directory becomes `eng-rulebook-audit/`.** Delta mode now searches the legacy
names `standards-audit/` and `audit-*` as well — a workspace audited before the rename keeps its
history under the old name, and a delta pass that cannot see it reports every prior finding as new.

*Deliberately unchanged:* the word **standard** for an individual rulebook (each file still opens
"<Topic> Standard"), because that is what each one is; and the dated review under
`standards-improvement/`, which is a snapshot of a review performed under the old name.

**ADDS** · Touches: all 16 rulebooks, `_authoring.md`, `audit.md`
**Every guard rail now carries a stable id** (`**[<lane>.GR<n>]**`) — 111 across 16 rulebooks. Until
now the reconciliation machinery shipped inert: a generated ledger had 111 rows and all 111 read
`UNASSIGNED`, so `--ledger` matched nothing. That is the library's own half-adopted-mechanism
failure applied to the very check built to detect it.

Ids are **append-only, like sub-rule numbers** (`_authoring.md` rule 13): a new rail takes the next
free number, a deleted one leaves an honest gap, and renumbering silently re-points every ledger row
and finding filed against the old id.

Cost: **zero added lines.** An inline id makes a line longer, not a file taller — an earlier
estimate of ~76 lines and six content cuts assumed rewrapping was required and was wrong.
Reconciliation is verified in four states: no ledger; a ledger with wired rails; a rail deleted
while the ledger still claims it; and a new rail the ledger does not know about.

**Not tracked here:** `profiles/` is untracked by design (see `README.md`). Profile edits are
workspace-local and never change the library.
