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

## v8 — 2026-09-06

**Test data gets a provenance rule.** `testing.md` has always said where an *expected value*
may come from (§4.5: the spec, never the code under test). It never said where the *input*
comes from — so a suite could paste one fixture literal into eight specs, declare its own copy
of a production type, and assert against a shape production had since changed, while staying
green. §9 closes that (gap C13).

**ADDS** · Touches: testing.md
One new section (§9.1–§9.3), two guard rails, two Checklist boxes, two Failure shapes, one
Appendix A column. Code that was compliant may now be non-compliant: a suite whose fixtures
are hand-written duplicates now matches a rule it previously did not.

### Why it is split on the arrange/assert axis

"Use production code in tests" is wrong as a flat rule — stated flatly it contradicts two
obligations this lane already carries. §4.5 requires the expected value to come from *outside*
the code, and §5.6 *requires* hand-written duplicate literals for cross-repo mirrors, because
no import path exists between the repos. So §9 splits the axis instead:

| Phase | Where the value comes from | Owner |
| --- | --- | --- |
| **Arrange** (inputs, fixtures) | Imported — one factory per domain type, annotated with the production type, varied by overrides | §9.1, §9.2 |
| **Assert** (expected values) | Hand-derived from the spec; never produced by the code under test | §4.5, §9.3 |

§9.3 states the limit explicitly and names the standing exceptions to §9.2 — goldens, §5.6's
mirror pins, and fixtures built to be invalid on purpose — so the two halves cannot be read as
disagreeing. `testing.GR10` is what makes §9.1 pay: a factory annotated with the production
type only converts a shape change into a failure if the test files are inside the type gate.

### The lane went over the 450-line cap

`testing.md` was at exactly 450 before this change and is 512 after. About 20 lines were
recovered by compressing redundant prose; the remaining ~62 are the new obligations. Cutting
existing rules to fit would be a **RELAXES** disguised as an editorial trim — it would turn
prior findings into non-defects silently. It is recorded instead: `_gaps.md` C12 now names
three over-cap lanes, not two, and the split it proposes carries the same citation blast
radius there as it does in `security.md`.

---

## v7 — 2026-09-06

**The library becomes multi-language: Python and PHP join TypeScript as first-class lanes, and
every external anchor in the library was re-verified.** Two changes ship together because the
second is what made the first honest — re-checking 514 anchors across the 16 existing rulebooks
found 31 real drifts, including one that made a rule unsatisfiable.

**ADDS** · Touches: all 21 rulebooks
Five new masters, one new rule and one new sub-rule in `security.md`, one new sub-rule in
`type-safety.md`, and per-language examples in six existing guard rails. Code that was compliant
may now be non-compliant — a Python or PHP repo that previously matched no rule at all now
matches a lane.

### Why separate masters, and not branches inside the existing ones

The test in `_authoring.md` rule 7a is **not** "the tools differ" — it is "the obligations differ
in kind". They do, and the difference is structural rather than cosmetic:

| Language | The type gate | Default state |
| --- | --- | --- |
| TypeScript | `tsc` | `strict` is the **compiler default** (6.0+) — a repo must opt *out* |
| Python | an external checker, invoked by choice | none runs; and `mypy` without `--strict` **does not check the body of an unannotated function at all** |
| PHP | `declare(strict_types=1)` + an analyser level | the declaration is **per-calling-file** and absent by default; PHPStan's level defaults to **0** |

TypeScript is the only one of the three whose safe state is the default. `type-safety.md`'s core
principle — *"the compiler only proves what you never assert"* — presumes a gate that is already
on, so genericising it would have produced a master that is vacuous in all three languages. Three
different rules, not one rule with three examples.

Each behavioural claim in the new masters was **executed**, not read: the mypy skipped-body
result, the PHP call-site scoping of `strict_types`, PHPStan's silent level 0, and the assertion
elision under `python -O` and `zend.assertions=-1` are all quoted from runs on the versions in
each §0 anchor table.

- **`python-typing.md`** · **`python-packaging.md`** — checker floor and the invisible-function
  hole; interpreter floor, lockfile, venv discipline, the task vocabulary `pyproject.toml` does
  not provide, `src/` layout, wheel/ABI contract.
- **`php-typing.md`** · **`php-packaging.md`** · **`php-runtime.md`** — PHP gets **three**
  because it has a subject the others do not: interpreter configuration that decides whether
  written code executes. Verified — with no `php.ini` at all, every session-cookie protection is
  off and `display_errors` is on; the vendor's own `php.ini-production` template fixes error
  display and still leaves `expose_php` on and all three cookie flags unset. Symmetry between
  languages is explicitly not a goal (`_authoring.md` rule 7a).

### New obligations in existing rulebooks

- **`security.md` §5.7 — safe deserialization of non-JSON formats.** Closes gap **C2**. Stated at
  the *call site*, never by runtime default: Python's tarfile filter became safe only in 3.14 and
  PyYAML made `Loader` required in 6.0, so a rule resting on either default is wrong on the other
  side of that boundary. Moves ASVS **V1 from `partial` to `covered`**.
- **`security.md` §5.8 — a control the runtime is configured to remove is not a control.** New
  gap **C11**, closed in the same release. `assert` is elided by `python -O` and by
  `zend.assertions=-1`, and the latter is the value in the `php.ini-production` template PHP
  itself ships. The check passes every test and is absent from the running process.
- **`type-safety.md` §2.4 — the compiler and the type-aware linter must be jointly satisfiable.**
  This one is a **defect the anchor re-verification found in this library**: typescript-eslint's
  `latest` declares `peerDependencies.typescript` as `>=4.8.4 <6.1.0`, while §0 anchors
  TypeScript 7.0 as current. GR2 and §0 could not both be satisfied by any repo. The rule now
  requires the repo to pick a side and record it with an exit date, and GR2 gains a fixture
  assertion — because a peer-range mismatch makes type-aware rules stop applying *without
  failing anything*, so the rail's green result was indistinguishable from the rail not running.

### Anchor re-verification — 514 anchors, 31 drifts, 5 phantoms rejected

Every external claim in all 16 existing rulebooks was re-checked against primary sources and each
proposed correction independently adjudicated before it was applied. The material ones:

- **OWASP Top 10 for LLM Applications 2026** (published 4 Aug 2026) supersedes the 2025 edition
  **and renumbers most ids**. Three of `ai-features.md`'s cross-references pointed at different
  risks than they named, and one id (LLM07 System Prompt Leakage) no longer exists.
- **The EU AI Act Digital Omnibus** is Regulation (EU) 2026/1744, in force since 27 July 2026 —
  the file described it as awaiting publication, which was already wrong on its own verification
  date.
- **ESLint v9 reached EOL on 2026-08-06**, so a v9 pin is now an unmaintained-dependency finding
  rather than a deferred upgrade.
- **`type-safety.md` stated the TypeScript 6.0 `strict` default backwards** — it said omitting the
  flag opts a repo *out*; it opts a repo *in*.
- Two citations did not support their claims: AWS REL05-BP03 does not mention `Retry-After`, and
  Jest's documentation is versioned rather than a living unversioned document.
- **Three corrections were refused as out of scope and re-routed**, not applied: they changed
  obligations rather than facts. Two false universals they exposed are fixed properly here —
  `comment-standard.md` §6 no longer claims formatters never reflow comments, and
  `config-and-environment.md` §5 no longer claims the public prefix is the only channel into a
  client bundle (new **GR9** greps the built artifact, and **GR5** now states what it cannot see).

### Gaps a completeness critic found, and what closed them

An adversarial research pass (120 claims, each independently refuted against a primary source)
ran a completeness critic over the resulting fact base. It found real omissions, and the ones
that survived verification shipped:

- **`php-runtime.md` §6 — the document root is the router.** Any file under the web root ending
  in `.php` is a live, unauthenticated endpoint; nothing routes to it, the server executes it
  because it is there. No Node, Python or Go analogue exists. The rule: the server root is a
  dedicated `public/`, and `vendor/`, `.env`, `config/`, `storage/` and `.git/` sit above it.
- **`php-runtime.md` §7 — the input layer truncates and empties before your code runs.** Verified
  defaults: `max_input_vars` `1000` (excess input variables are *truncated*, applied separately
  to `$_GET`/`$_POST`/`$_COOKIE`) and `post_max_size` `8M` (over it, **`$_POST` and `$_FILES` are
  empty**, with no exception and no 413 from PHP). Two failure shapes follow that both read as
  application bugs: the bulk edit that silently saved 1,000 of 1,200 rows, and the "invalid CSRF
  token" that is really a size limit.
- **`php-typing.md` §4 — one array type, two JSON shapes.** Verified:
  `json_encode(array_filter([1,2,3,4], …))` emits `{"1":2,"3":4}`, an object, because filtering
  preserves keys. A one-character change moves a published response shape with no PHP-side error.
- **`php-typing.md` §6.1 — the `false`-returning stdlib.** `preg_match` returns `1`, `0` **or
  `false`**, so `if (preg_match($block, $in))` treats *the check having failed* as *the input
  being clean* — a validation bypass whose trigger is input size. Stated on php.net's documented
  contract; the backtrack overflow could **not** be reproduced on 8.5.10 under PCRE2's JIT, and
  the rule says so rather than claiming a demonstration.
- **`resilience.md` §10 — cancellation must propagate.** Verified:
  `issubclass(asyncio.CancelledError, Exception)` is `False`, so `except BaseException:` in a
  cleanup path swallows cancellation and a deadline becomes a hang. With it: the weak-reference
  task-collection hazard `RUF006` exists for, and `gather(return_exceptions=False)` not
  cancelling siblings.
- **`python-typing.md` §9.4 — `open()` has no fixed default encoding**, and **PEP 686 is Final for
  3.15**, flipping UTF-8 mode on by default within weeks of this revision — changing every
  un-annotated `open()`, mostly toward the *correct* result, which is why nobody will notice.
- **`python-packaging.md` §9 — the 3.14 execution model.** PEP 779 makes free-threaded builds
  officially supported (so GIL-atomicity assumptions are now build-dependent), and `forkserver`
  replaced `fork` as the Unix default start method (so children no longer inherit module-level
  state). The profile must declare both, because a concurrency rule is undecidable without them.

### Runnable checks — validated by execution, and it caught five defects

`checks/` gains a ruff baseline, a mypy baseline, a PHPStan baseline and five semgrep rule files.
Validated against **582 `.py` files** and **3,441 `.php` files** from six mature open-source
projects. Running them found what reading them did not: an `unserialize` rule that matched
**nothing** while the fixtures held 168 such calls; patterns blind to namespace-escaped PHP calls
(`\curl_init()`), which is the form Guzzle actually uses; a zip rule that also caught tarfile; a
path-join rule firing on string constants; and two config keys that no longer exist
(`S320` in ruff, two removed PHPStan 2.x options). Ruff's rule selection is by measurement —
seven plausible families were **excluded** with their counts recorded, because they produced
hundreds of findings on idiomatic, correct code. Full record in `checks/README.md` § Validation.

### What an adversarial audit of this release then found — and changed

The release was audited before it shipped: seven read-only auditors across contract compliance,
internal consistency, Python facts, PHP facts, the runnable checks, coverage and this CHANGELOG,
every finding then independently refuted. **61 findings survived; 14 were rejected as phantoms.**
The ones that changed obligations:

- **The library had no injection rule at all — and a new pointer was hiding that.** `php-typing.md`
  §0 routed "SQL parameterisation and injection" to `security.md` §5.1, which is boundary schema
  validation and says nothing about bound parameters. A grep across all 21 masters found no
  parameterised-query obligation anywhere, and `_gaps.md` had no row for it: a PHP author would
  have followed the pointer, found a validation rule, and concluded the language's signature
  defect class was governed. **New `security.md` §5.9** now states it across every interpreter —
  SQL, process spawning, NoSQL operators, templates, LDAP/XPath/headers — with the ORM raw-fragment
  escape hatch as the declared review surface, plus **`security.GR11`**.
- **Three claims in the new masters were wrong, and all three were my own cornerstones.** Verified
  by execution: (1) `strict_types` governs **arguments** at the call site but **returns** at the
  *declaration* site — the headline mechanism was half the story; (2) `max_execution_time` raises
  an **uncatchable** fatal error where `finally` does **not** run (shutdown functions do), not the
  "catchable PHP error" the text claimed; (3) Composer **does** ship a runtime platform check —
  `platform-check` defaults to `php-only` and emits `vendor/composer/platform_check.php` — so
  "a copied `vendor/` tree never re-checks it" was false for the PHP version, though still true
  for `ext-*`.
- **The `§0` genericisation was planned and never executed.** Thirteen language-neutral masters
  still scoped themselves to "a multi-repo TypeScript workspace" while legislating Python and PHP
  in their own rules — so the library made multi-language in this release was formally
  inapplicable to the languages it had just added. All thirteen now carry rule 3's wording;
  `type-safety.md` and `web-client.md` keep a TypeScript scope deliberately and say why.
- **Smaller corrections, each verified:** ruff *derives* `target-version` from `requires-python`
  (so the standard's "the format couples none of them" was wrong, and the rule is now "leave it
  unset"); mypy 2.0 changed **two** defaults and *redefined* `--allow-redefinition` rather than
  changing three; a type checker does **not** execute module-level code; `CVE-2021-29472` is
  Mercurial-only; pip's `--uploaded-prior-to` takes a duration as well as a datetime; and
  `security.GR10` had mandated a CI ban that §5.8, the ruff baseline and `checks/README.md` all
  explicitly refuse — now split into a blocking configuration assertion and a surface-it sweep.
- **The audit's own suggested fix was wrong once, and the fixture caught it.** Tightening
  `curl-without-timeout`'s suppressions — as recommended — **suppressed every match, including
  true positives.** Bisected, reverted, and the two real residuals are now documented in the rule
  file. Path exclusions were added to all five new rule files, which dropped the PHP finding count
  from 117 to **79, all in product source**.

### One known deviation, recorded rather than hidden

`security.md` (517 lines) and `supply-chain-and-build-integrity.md` (485) now exceed
`_authoring.md` rule 5's 450-line cap. Both were **already at it** before this release (449 and
450), so any addition breaches it. The remedy rule 5 implies is a lane split, and `_gaps.md` C1
has recorded that as a precondition since August — but a split moves sections to a new file and
therefore re-points every citation filed against the old path, which rule 11 permits only after
confirming no published report cites them. That is confirmable for this checkout and not for
other installs, so the split is **deferred, with the blast radius measured** in new gap row
**C12**: `security.md` §2 is 104 lines and 17 citations; §5 is ~150 lines and 40 citations.
The v7 additions to both files were compressed roughly 40% and remain over. The other 19 masters
are within range.

### Router and contract

- **Stem names are load-bearing.** The masters are `python-typing` / `php-typing`, not
  `python-type-safety` / `php-type-safety`: topic resolution is substring-based, so a stem
  containing `type-safety` would have made the working `/eng-rulebook type-safety` ambiguous.
  No existing token regressed. `SKILL.md` now states the constraint for whoever adds the next one.
- **A bare language token loads that language's whole set** — `/eng-rulebook php` loads three
  files. The one case where multiple matches are not an ambiguity to ask about.
- **`_authoring.md` rule 3** now assumes a TypeScript **and/or Python and/or PHP** workspace, and
  **new rule 7a** states that lane ownership is keyed by (subject, language) — so three masters
  governing "type strictness" is single-valued by construction, not a rule-7 violation.
- **`audit.md` Phase 2** resolves its commands per language instead of hardcoding `tsc` and
  `npm audit`, and now requires recording the *strictness setting* alongside the result: a green
  run at either language's tool default is evidence of almost nothing.

---

## v6 — 2026-08-18

**An installed copy of the library is read-only, and the rule is now stated normatively.** The
library already said profiles never live inside the skill; everything else was left to inference,
and one instruction cut against it — `_gaps.md` invited "add a row" with nothing saying which
checkout. Read from inside a workspace clone that reads as an invitation to edit the installed
copy, where the write is lost at the next update and invisible to teammates until then. `SKILL.md`
§ Where eng-rulebook writes — already the single normative statement of output location — now
states that the skill directory is never written to by any mode, any check, or any person, and
that `<home>` never resolves inside it. `_gaps.md` carries a header marking it master-only, and
the two unqualified "add a row" instructions (`SKILL.md` § After writing, `references/README.md`)
now name the master explicitly.

**EDITORIAL** · Touches: _gaps.md, references/README.md, SKILL.md
**No obligation changes.** No rule text, `§` number or `Rev:` moved, and no rulebook was edited.
Nothing about what the library *emits* changed: `<home>` resolution, the report tree, and the
audit's `library-gaps.md` are all as they were in v5 — what changed is that writing anywhere else
is now forbidden in text rather than merely unmentioned.

---

## v5 — 2026-08-17

**`/eng-rulebook check` now leaves a record.** Until now it reported to the session and nothing
survived the run: there was no way to tell *"we checked and it was clean"* from *"nobody
checked"*, and a finding raised at merge time and shipped anyway was invisible to the next audit.
Runs are now recorded under `<home>/check-runs/`, a sibling of `audits/` — grouped apart, because
a per-diff review and a quarterly whole-workspace assessment are different kinds of artifact with
different lifespans, and merging them buries the handful that matter under hundreds that say
"nothing found".

**ADDS** · Touches: SKILL.md, audit.md, README.md, references/README.md
A check gains a required step it did not have. No rulebook changed — no rule text, `§` number,
`Rev:` or `## Guard rails` section moved.

- **Layout.** `check-runs/<YYYY-QQ>.md` is a ledger with **one row per run, always written** —
  including clean runs and `trivial` tier, because a ledger holding only the bad runs cannot prove
  a check happened. A **detail file** `<YYYY-MM-DD>-<short-sha>.md` is written only when the run
  found something at **Medium or above**, or anything at `elevated` tier. Delta mode resolves only
  prior Critical/High, so everything it consumes always has a file.
- **The ledger row carries the library `VERSION` and each loaded master's `Rev:`.** Not
  bookkeeping: delta mode resolves `rule-changed` by comparing exactly those, and an unchanged
  `Rev:` is what lets it skip the CHANGELOG walk. A row without them is unreadable a release later.
- **The cheapness claim was amended, not overridden.** § Check mode previously listed "no report
  directory" among the things that make the mode cheap. That conflated the census/coverage/shard
  machinery — which genuinely costs sub-agent dispatches — with writing a file, which costs
  nothing. The clause is gone; the rest of the sentence stands.
- **Redaction is now a hard control in check mode.** Check findings reuse the audit's finding
  format, which quotes code with `path:line`. Once those files are committed to a shared docs repo
  and outlive the run, that is the same condition under which `audit.md` prime directive 6 stops
  being hygiene. Step 8 states the masking obligation explicitly; check mode had none before,
  because nothing persisted.
- **`audit` delta mode reads the trail.** A Critical/High finding raised by a check and still
  present resolves as `still-open`, not as new — through the same four labels in the same order.
  A source was added, not a reordering. A record nothing ever reads would have been a write-only
  artifact, which is what `pulse` was deleted for in v4.
- **The name is `check-runs/`, deliberately not `checks/`.** The skill already has a `checks/`
  directory holding the mechanizable guard rails as runnable artifacts. Two directories one path
  segment apart with opposite meanings is a trap an adopting workspace would hit immediately.

**Retention, honestly.** Detail files older than the last completed audit may be deleted (the
audit re-examines the whole workspace and its report is the durable record); ledger files stay.
Always a human's act — the library never removes a workspace's files. And note what deleting
cannot do: these files are tracked, so removal clears the working tree, not the history. Retention
here is tidiness, not erasure, which is why the redaction rule above is the control that actually
bounds what reaches the repo.

## v4 — 2026-08-17

**The mode surface drops from seven invocations to four:** `<topic>`, `check`, `profile`,
`audit`. Seven front doors on a router is itself a cost, and three of them had the weakest claim
on a slot — two were already invoked automatically by `audit`, and one produced no obligation at
all.

**EDITORIAL** · Touches: _gaps.md
**No obligation changes.** No rule text, `§` number or `Rev:` moved, and no rulebook was edited —
the one `references/` change is a prose line in `_gaps.md` naming a removed invocation. The class
is EDITORIAL rather than RELAXES deliberately: RELAXES prescribes resolving a prior finding as
`rule-changed`, and no finding ever cited any of these three (`pulse` was "a signal, never a
finding and never a gate"). A RELAXES entry here would be inert but misleading to `audit.md`'s
delta pass, which walks the CHANGELOG for RELAXES entries touching a cited rulebook.

**Removed: `/eng-rulebook pulse`, and `meta/pulse.mjs` with it.** It produced no obligation,
decided nothing, gated nothing, and no other mode read its output. Its whole product was an
argument about *when a human should schedule the next audit* — and `_gaps.md` bar #4, the bar
this library applies to every candidate rule, says a workflow obligation belongs to the delivery
process, not to a standard. The metrics were candid about themselves ("approximate by
construction … trend, not truth"): 173 lines approximating what `jscpd` and `git log --numstat`
already do. **This re-opens the "nothing between `check` and `audit`" gap that v2 closed.** The
replacement is cadence, not an instrument: `check` at merge time, `audit` quarterly with its
trigger list. A team that wants a monthly number should run those tools directly.

**Demoted, not removed — both capabilities are unchanged:**

- **Guard-rail reconciliation.** `/eng-rulebook guardrails` is gone as an invocation;
  `meta/guard-rails.mjs` is untouched and `audit.md` Phase 2b still runs it, where it remains the
  phase's highest-yield check. Run it directly any time with
  `node .claude/skills/eng-rulebook/meta/guard-rails.mjs --ledger` (`--template` seeds a ledger).
  The 113 declared rails, their stable `[lane.GRn]` ids, the required `## Guard rails` section in
  each rulebook, and the workspace ledger are all unaffected.
- **Raising a library-gap.** `/eng-rulebook contribute` is gone as an invocation; it never had
  any code. Add a row to `references/_gaps.md`, which documents its own four-point intake bar and
  procedure in full. The backlog and its 12 rows are unchanged.

**If you had pulse output.** An existing `<home>/pulse/` directory and its `baseline.json` are
now orphaned. The library does not reach into a workspace to delete anything — remove them by
hand when convenient.

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
