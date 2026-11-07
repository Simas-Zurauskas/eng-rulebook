# Meaningful tests

## Applicability

Developing, changing or evaluating automated tests. Protect behavior people depend on with the
least costly reliable evidence. There is no required test count, coverage percentage, mutation
floor, one-test-per-file rule, or mandatory testing architecture.

## Checks

### TEST1 — Identify the incremental protection

State the changed behavior or reachable failure, then inspect existing tests and assertions.
Reuse or strengthen them before adding a case. "No new test needed" is valid when existing
checks demonstrate the preserved contract; name and run those checks. For a bug, reproduce it
in a regression test when practical, or demonstrate that an existing test fails on the broken
behavior. Explain any meaningful gap left untested. Cosmetic/reversible changes need not gain
an artificial automated test; use the relevant build, visual or manual verification instead.

### TEST2 — Protect consequential behavior and failure modes

Prioritize core domain rules, authorization and cross-owner/tenant denial, money/paid calls,
data loss, concurrency/idempotency, compatibility, lifecycle and recovery where present.
Choose distinct reachable failure behaviors: malformed input, an ambiguous timeout, duplicate
submission or late completion may need separate evidence; every syntactic branch does not.
A huge Cartesian test matrix is not a substitute for identifying equivalence classes and
meaningful interactions. Confirm important failures remain observable and effects do not occur
when rejected. Existing tests running a path without asserting its consequence are insufficient.

### TEST3 — Use the cheapest faithful test boundary

Use focused unit tests for logic, integration tests for seams/store semantics, and selected
end-to-end tests for important wiring and journeys. Exercise real database behavior when
constraints, isolation or races matter; SQLite is not evidence of PostgreSQL concurrency.
Reuse an isolated engine with safe state separation rather than requiring one container per
file. Mock/fake external services and effects where needed. Internal seams may be substituted
when justified, but never mock away the very authorization, transaction or interaction being
claimed as tested. Small explicit fakes are valid; no mandatory partial-mock technique.

### TEST4 — Keep the oracle independent and diagnostic

Expected behavior comes from requirements or independent derivation, not a call to the function
under test or its shared algorithm. Import production types and unrelated setup primitives;
retain explicit external contract literals where their exact value is the assertion. Review
snapshot/golden changes deliberately; never bulk-regenerate them to hide a failure. A test
needs assertions sensitive to plausible wrong outcomes, not only status/truthiness. Multiple
assertions can explain one behavior. Names and failures should identify what regressed.

### TEST5 — Keep tests understandable and economical

Use small fixtures and the existing harness. Introduce a shared factory when repeated setup or
shape maintenance justifies it, not for every domain type. Parameterize useful cases without
hiding their intent. Some duplicated setup is clearer than an abstract test framework. Avoid
testing private call structure, trivial delegation, library internals or type-system guarantees
without a concrete runtime risk. Do not merge unrelated assertions into a giant end-to-end test
just to reduce the number of tests.

### TEST6 — Make relevant checks reliably runnable

Use deterministic clocks/randomness, explicit readiness and isolated state; await effects and
clean up handles. Races require controlled interleavings or competing operations plus invariant
assertions, not sleeps and hope. A simultaneous start alone may not exercise a crucial interleaving.
Keep fast local checks available, and document prerequisites for meaningful service/device
integration checks separately. Do not claim every suite needs zero services or must run in
seconds. Avoid live production dependencies in routine tests. Retry must not silently turn a
failure into a clean result; fix or explicitly quarantine flakes while retaining visibility.
Honor existing project gates and report what actually ran.

### TEST7 — Evaluate suite effectiveness before expanding or pruning

Coverage can reveal blind spots; it cannot prove assertion quality. Use targeted fault injection,
mutation, property tests or fuzzing when a significant uncertainty warrants their cost; bound
runs and make failures reproducible. Consider property-based or stateful tests when correctness
depends on input combinations or operation sequences, such as retries, cancellation or
serialization round trips. Validate each property against the intended contract, not an inferred
implementation detail; reuse the existing harness where practical and retain a minimal reproducer
for confirmed failures. An equivalent mutant is not automatically dead code.
Before deleting/consolidating tests, identify lost unique scenarios/assertions and verify
replacement protection. Fewer assertions can be valid; raw counts are not a quality measure.
Do not weaken gates, remove failure cases or regenerate expectations merely to make CI green.

### TEST8 — Keep tests part of the maintained system

Follow the repo's understandable placement conventions and typecheck applicable test support.
Moving tests for stylistic uniformity alone is unnecessary. Keep test-only assets out of shipped
artifacts. Update affected environment setup when required configuration changes; avoid adding
meta-tests when the ordinary check already catches the failure clearly. Investigate slow setup,
flakiness and redundant journeys as maintenance costs rather than generating more tests.

## Sources

- [Google: unit testing, including meaningful test sharing](https://abseil.io/resources/swe-book/html/ch12.html)
- [Coverage as a diagnostic](https://martinfowler.com/bliki/TestCoverage.html)
- [Assertion effectiveness and targeted mutation](https://martinfowler.com/articles/sensors-for-coding-agents.html)
- [Contract-grounded test generation](https://arxiv.org/abs/2608.17177)
- [Independent verification of agent-produced software](https://arxiv.org/abs/2610.28667)
- [Property-based bug finding and validation](https://www.anthropic.com/research/property-based-testing)
