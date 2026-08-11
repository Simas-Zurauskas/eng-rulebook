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
| `ci/eng-rulebook-check.yml` | the wiring that runs the above | GitHub Actions (starting point) |

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
- **Most of the library.** Of the 113 declared guard rails across 16 rulebooks (enumerate them
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

## Adopting

1. Extend `tsconfig/eng-rulebook-base.json`; do not copy it.
2. Spread the ESLint fragment into your flat config, after `recommendedTypeChecked`.
3. Point semgrep at `checks/semgrep/`.
4. Copy `ci/eng-rulebook-check.yml`, pin every action to a full commit SHA
   (`supply-chain-and-build-integrity.md` §3), and wire the secret scanner — it is left
   deliberately failing rather than stubbed, because a step that pretends to scan reads as covered.
5. Record what you wired in the guard-rail ledger, so "adopt incrementally" stays distinguishable
   from "adopted nothing".
6. **Make `/eng-rulebook check` a PR ritual, not a habit.** The diff-scoped check is agent-invoked,
   so nothing runs it unless something asks: either add the PR-template checkbox
   (`- [ ] /eng-rulebook check run — findings attached, or "none"`) and reject PRs without it, or
   uncomment the optional CI job at the bottom of `ci/eng-rulebook-check.yml`. A cadence that
   lives in memory is the enforcement channel every rulebook here refuses to trust.
