# `checks/` — the guard rails as runnable artifacts

Every rulebook ends with a **Guard rails** section describing CI checks. Described is not the same
as available: a check each adopting workspace has to re-derive from prose is a check most of them
will not have. This directory ships the ones that are genuinely mechanizable, so adoption is
wiring rather than authoring.

| Path | Enforces | Consumer |
| --- | --- | --- |
| `semgrep/type-safety.yaml` | `type-safety.md` § Guard rails — the cast rules | semgrep |
| `semgrep/resilience.yaml` | `resilience.md` §2 — explicit per-operation timeouts | semgrep |
| `semgrep/supply-chain.yaml` | `supply-chain-and-build-integrity.md` §3.1 — actions pinned to a commit SHA (the pattern-matchable slice of GR1) | semgrep |
| `semgrep/web-client.yaml` | `web-client.md` §5.1 — raw-HTML sinks surfaced ("show me the sanitiser"; the sink half of GR1) | semgrep |
| `semgrep/config-and-environment.yaml` | `config-and-environment.md` §2.3 — numeric env cast at point of use (NaN fails open) | semgrep |
| `eslint/eng-rulebook-base.mjs` | `type-safety.md` § Guard rails — the lint half | ESLint flat config |
| `tsconfig/eng-rulebook-base.json` | `type-safety.md` — the strictness baseline | `tsc` (extend, don't copy) |
| `ci/eng-rulebook-check.yml` | the wiring that runs the above — a TypeScript job, plus commented Python and PHP lanes | GitHub Actions (starting point) |
| `ruff/eng-rulebook-base.toml` | `python-typing.md` §4.1/§8/§9.1, `security.md` §5.7, `resilience.md` §2 — the Python lint half | ruff (extend, don't copy) |
| `mypy/eng-rulebook-base.toml` | `python-typing.md` §2.2/§2.3 — the Python strictness floor | mypy (merge into `pyproject.toml`) |
| `semgrep/python-security.yaml` | `security.md` §5.6/§5.7 — zip-slip and the path-join footgun (the gaps ruff has no rule for) | semgrep |
| `semgrep/python-typing.yaml` | `python-typing.md` §3/§4.3 — `cast()` policy | semgrep |
| `phpstan/eng-rulebook-base.neon` | `php-typing.md` §2.2/§2.4 — the PHP level floor | PHPStan (include, don't copy) |
| `semgrep/php-security.yaml` | `security.md` §5.7/§5.1 — `unserialize`, `extract`, dynamic execution, shell | semgrep |
| `semgrep/php-typing.yaml` | `php-typing.md` §6.2/§7 — digest comparison, `@` suppression | semgrep |
| `semgrep/php-runtime.yaml` | `php-runtime.md` §5.2 — cURL handles with no deadline | semgrep |

Rule ids are `eng-rulebook.<lane>.<slug>` and **every message names the rule it enforces**, so a CI
failure is traceable to a line of a standard rather than to an unexplained lint id.

## What is deliberately NOT here

This is the important half. A ruleset that implies coverage it does not have is worse than a
smaller honest one, because it reads as solved — the library's own cross-cutting theme.

- **Bounded retry (`resilience.md` §3) — withdrawn, not missing.** It was written, tested, and
  removed; the reasoning is preserved at the top of `semgrep/resilience.yaml`. A pattern cannot
  separate bounded from unbounded retry, because both spellings return on success and both use the
  same infinite-loop construct. Loose, it fired on every stream-reader `for (;;)` loop; tight
  enough to suppress those, it could not fire on a genuine violation either. **Judgement-only.**
- **Most of the library.** Of the 155 declared guard rails across 21 rulebooks (enumerate them
  with `node meta/guard-rails.mjs`), a small minority are pattern-matchable. The rest need a type-checker, a test run, a live probe, or a human — and each
  rulebook's own Guard rails section says which. Nothing here is a substitute for reading it.
- **Anything requiring project facts.** A rule keyed on a session tier, an env table or a declared
  threshold cannot ship as a generic pattern; it needs the profile. That is not a limitation of
  the tooling, it is where the profile earns its place.

## Validation — how these were tested

Shipping an untested check is the failure this directory exists to fix, so:

**Fixture** (`checks/` has no fixture directory; it was a scratch harness) — a file with labelled
true positives and deliberate false-positive bait: ordinary `as T` casts, a single `as unknown`
(the *safe* direction), a non-empty object literal assertion, `fetch` with a signal, `fetch` with
options held in a variable, and a test file. Final state: **5/5 true positives, 0 false
positives**, test paths excluded.

**Real repositories** — three open-source TypeScript projects, 749 `.ts` files total, chosen to
exercise the patterns (a web framework, a schema library, an HTTP client with retry logic). Every
finding was read against the source line before the rules were accepted.

Three defects were found this way and fixed — which is the argument for doing it:

1. `empty-object-assertion` fired on `{ id: 1 } as T`. Semgrep's `{}` pattern matches **any**
   object literal (ellipsis semantics), so the rule did not mean what its name said. Now a regex.
2. `fetch-without-timeout` missed every **two-argument** call. A `pattern-not: fetch($URL, $OPTS)`
   intended to allow options-in-a-variable also matched object literals, disabling the main case.
3. The retry rule's `break`/`return` exclusions covered only `while (true)`, not `for (;;)` —
   making every stream reader a false positive. This is what led to withdrawing it.

**Calibration from real code:** hits clustered in `benchmarks/`, so non-production path classes
(`benchmarks/`, `examples/`, `scripts/`, `fixtures/`) are excluded alongside tests. A benchmark
harness is not production code and a rule that pretends otherwise trains people to ignore it.

**Residual, stated honestly:** `fetch-without-timeout` ships at WARNING, not ERROR. It detects the
*shape* of an untimed call and cannot prove a timeout is absent — a deadline may live in a wrapper
or a configured client instance. Treat a hit as "show me the timeout", not as a defect. The cast
rules ship at ERROR because `as unknown as` is unambiguous in the source.

## Validation — the 2026-08-11 batch (supply-chain, web-client, config-and-environment)

Same method: a labelled fixture (10 true positives across the three rules; false-positive bait
included a YAML comment, SHA-pinned and local actions, a digest-pinned `docker://…@sha256:` ref,
`innerHTML = ""`, `textContent`, a numeric cast of a literal, an env *accessor* call, and a
test-path file) — final state **10/10 true positives, 0 false positives** — then three real
repositories (a JSX web framework, a schema
library, a large React app; 22 workflow files, ~1,400 TS/TSX files), every hit read against the
source line:

1. `workflow-unpinned-action`: 32 hits, all genuine tag/branch refs in one repo; the two repos
   that pin every action to a full SHA produced zero hits — the pinned form passes by shape.
   Ships at ERROR: a ref is either a 40-hex SHA or it is not.
2. `raw-html-sink` **was tightened by this pass**: the bare `dangerouslySetInnerHTML` identifier
   fired on a JSX framework's *renderer internals* — string comparisons (`key ===
   'dangerouslySetInnerHTML'`) and an optional prop typing — 4 of 8 hits writing no HTML. The
   shipped regex requires the prop to be *used* (`={...}` or non-optional `: {...}`), which kept
   the 4 real raw-HTML writes and dropped all 4 non-uses. Ships at WARNING — a hit may be
   sanitiser output; treat it as "show me the sanitiser".
3. `env-number-fail-open`: fixture 3/3; **zero hits across all three real repos** — libraries
   rarely parse env numerics, so the real-repo pass demonstrates quietness, not recall. Ships at
   WARNING with that calibration gap stated; a hit inside the env module next to its guard is
   the fix, not a defect.

## Validation — the 2026-09-06 batch (Python and PHP)

Same method, and the same result: **running the rules found defects that reading them did not.**

**Toolchains** (pinned, because both ecosystems move fast): ruff 0.16.6, mypy 2.3.1,
semgrep 1.176.1, PHP 8.5.10, Composer 2.10.3, PHPStan 2.2.13.

**Path exclusions.** All five v7 rule files carry a `paths: exclude:` block covering test,
fixture, spec, example, benchmark and `vendor/` trees — the same calibration the TypeScript batch
arrived at above, in Python and PHP spellings. Without it the PHP set reported 117 findings, 38 of
them in test code that legitimately pickles, shells out and suppresses.

**Fixtures.** Labelled true positives with deliberate false-positive bait, then real repositories:
**582 `.py` files** (flask, httpx, pydantic) and **3,441 `.php` files** (guzzle,
symfony/http-foundation, laravel/framework). Every rule's hits were read against the source line.

**Five defects found by execution, all fixed:**

1. **The `unserialize` rule matched nothing.** A `pattern-not` intended to allow the safe
   two-argument form suppressed *every* match, so the rule silently covered nothing — while
   `unserialize(` appeared 168 times in the fixtures. Now 32 hits, 31 in product source. This is
   the exact failure this directory exists to prevent, and only a fixture with known ground truth
   catches it.
2. **Namespace-escaped calls were invisible.** `\curl_init()` and `\md5()` — the form most
   namespaced PHP actually writes — did not match a bare `curl_init(...)` pattern. Guzzle's three
   `curl_init` sites are *all* escaped, so the rule scored zero on an HTTP client. Both bare and
   escaped forms now ship.
3. **The zip rule caught tarfile too.** `$Z.extractall(...)` matched `tarfile` as well as
   `zipfile`, double-reporting what ruff's `S202` already owns. Narrowed to zipfile constructors
   and locals assigned from them: 3/3 zip true positives, 0 tarfile hits.
4. **The path-join rule fired on constants.** `os.path.join($BASE, "static")` cannot carry a
   caller-influenced absolute component. Excluding string literals took it from 13 hits to
   **8 per 582 files** with the control still clean.
5. **Two config keys did not exist.** `S320` was removed from ruff and is a hard error if
   selected; PHPStan 2.x removed `checkMissingIterableValueType` and
   `checkGenericClassInNonGenericObjectType` as separate options (folded into the level), and a
   config carrying them fails to load. Both were caught by running the tool, not by reading docs
   — and `ruff rule --all` lists removed rules, so even the tool's own inventory does not settle it.

**Shipped rates, re-measured after the path exclusions below were added.** Python ruff: 419
findings / 582 files (310 source, 111 test/docs — ruff carries its own `per-file-ignores`),
dominated by `PGH003` blanket `# type: ignore` (253) and `B904` missing exception chaining (82),
both true positives and both exactly the obligations `python-typing.md` states. Python semgrep:
86 (`cast()` surfaced 73, path-join 9, `cast(Any, …)` 4). PHP semgrep: **79, all in product
source** — the `@` suppression operator (39), `unserialize` without an allowlist (31), `extract`
(4), shell execution (3), dynamic execution (1), cURL without a deadline (1). Excluding test,
fixture and vendor trees removed 38 PHP hits that were never defects.

**A late correction, kept visible.** An audit of this directory proposed tightening
`curl-without-timeout`'s suppressions (escaped `\curl_setopt`, and requiring the array form to
name a timeout key). **Both tightenings suppressed every match, including true positives** — the
fixture caught it, the change was reverted, and the two residuals are now documented in the rule
file itself. The suggested fix was wrong and the measurement is what showed it; that is the whole
argument for keeping a labelled fixture next to every rule.

**Ruff selection is by measurement.** Seven rule families were **excluded** after producing
hundreds of findings on idiomatic, correct code — `TID252` relative imports (286),
`DTZ*` naive datetimes (182), `S101` bare assert (108), `T20` print (91), `PTH*` pathlib
migration (~60), `S105`/`S106` hardcoded-password heuristics (55), `S603` all-subprocess (12).
Each is listed in `ruff/eng-rulebook-base.toml` with its count and reason, so re-adding one is a
project decision rather than a correction of an oversight.

**Residual, stated honestly:**

- **`S101` is off, and `security.md` §5.8 is therefore unmechanised.** The rule that matters —
  *an assertion must not be a security control* — cannot be separated by pattern from an internal
  invariant. Judgement-only, exactly like the withdrawn bounded-retry rule above.
- **`error-suppression-operator` (73 hits) is the noisiest shipped rule.** Every hit is a real
  `@`, so it is not a false positive; whether each is a defect is a judgement. WARNING, not ERROR.
- **`curl-without-timeout` scored 1 hit on 3,441 files, and ships with two known residuals.** Any
  `curl_setopt_array` suppresses whether or not it names a timeout key, and a namespaced file
  setting the timeout via `\curl_setopt` is a false positive. Both were measured, both resisted
  the obvious fix (above), and the rule is WARNING partly because of them. The low count
  demonstrates quietness, not recall — the same calibration gap as `env-number-fail-open`.
- **`loose-compare-digest` scored 0 on real code.** The control confirms it fires; these three
  libraries simply use `hash_equals` (15 sites in Laravel alone). Quietness, not recall.
- **Ruff's `S` family is single-file AST matching.** It finds the dangerous *call*, never the
  dangerous *dataflow* — no taint tracking across functions or files. It is a floor, not
  application security coverage.

## Adopting

1. Extend `tsconfig/eng-rulebook-base.json`; do not copy it.
2. Spread the ESLint fragment into your flat config, after `recommendedTypeChecked`.
3. Point semgrep at `checks/semgrep/` — it holds rules for all three languages and each file
   declares its own `languages:`, so pointing at the directory is correct regardless of stack.
4. **Python:** extend `ruff/eng-rulebook-base.toml` from `[tool.ruff]`, and merge
   `mypy/eng-rulebook-base.toml` into `pyproject.toml`. Set `target-version` and `python_version`
   to your `requires-python` — three declarations of one fact, coupled by nothing
   (`python-packaging.md` GR3).
5. **PHP:** `includes:` `phpstan/eng-rulebook-base.neon` and set `phpVersion` to the deploy
   runtime. Wire the `declare(strict_types=1)` presence check separately — it is the one PHP
   obligation that is worthless at 99% coverage (`php-typing.md` §2.1), and no analyser does it.
6. Copy `ci/eng-rulebook-check.yml`, pin every action to a full commit SHA
   (`supply-chain-and-build-integrity.md` §3), and wire the secret scanner — it is left
   deliberately failing rather than stubbed, because a step that pretends to scan reads as covered.
7. Record what you wired in the guard-rail ledger, so "adopt incrementally" stays distinguishable
   from "adopted nothing".
8. **Make `/eng-rulebook check` a PR ritual, not a habit.** The diff-scoped check is agent-invoked,
   so nothing runs it unless something asks: either add the PR-template checkbox
   (`- [ ] /eng-rulebook check run — findings attached, or "none"`) and reject PRs without it, or
   uncomment the optional CI job at the bottom of `ci/eng-rulebook-check.yml`. A cadence that
   lives in memory is the enforcement channel every rulebook here refuses to trust.
