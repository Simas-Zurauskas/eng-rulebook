# Simplicity and ownership cost

## Applicability

Every implementation or refactor. The core principles are always in SKILL.md; read this guide
when choosing mechanisms, evaluating reuse/dependencies, or auditing maintainability. Optimize
understanding, safe change and lifetime effort, not a line-count or dependency-count target.

## Checks

### SIM1 — Start with the requested outcome and existing capability

Trace the existing flow before adding another implementation. Search for framework/platform
facilities, installed dependencies and established project helpers. Reuse what actually fits.
Do not add optional product features, future extension points, migration machinery, observability
systems or custom test harnesses merely because they might eventually help.

### SIM2 — Compare reuse with custom ownership

Before building substantial generic infrastructure (scheduling, parsing, forms, auth, retries,
state synchronization), research credible maintained packages and official framework support.
Compare fit, authenticity, maintenance/security history, license compatibility, integration and
runtime footprint, transitive dependencies and replacement cost. Check the actual version's
API rather than trusting a remembered package name. Scale the investigation to consequence;
a local formatting function does not need a market survey. Existing mature primitives often
save code; a large dependency for a tiny need may cost more. [Build integrity](supply-chain-and-build-integrity.md)
owns dependency trust. If research is unavailable, state that limit rather than inventing it.

### SIM3 — Abstractions earn their cost

A helper, wrapper, interface or layer should centralize meaningful policy/knowledge, isolate
an effect, make testing realistic, or simplify actual callers. A single-use seam can be useful;
several similar snippets can legitimately change for different reasons. Neither one use nor
three copies decides automatically. Avoid pass-through wrappers, factories with no variability,
speculative plugins and generic engines without a current need. Prefer a clear concrete flow.

### SIM4 — Keep one authoritative decision where drift matters

Duplication of knowledge means independently maintained copies of a rule that must change
together. Before extracting, identify that meaning, its callers and likely change direction;
similar syntax alone does not establish shared ownership. Share domain constants, validation
policies and contracts where this prevents real drift.

For example, two endpoints enforcing the same authorization policy should share its decision
when practical, while each still enforces it at its own boundary. Two currently identical tax
and loyalty calculations may legitimately have different owners and change independently.
A test's literal expected result is an independent oracle, not a duplicate to replace with
the production calculation; [testing](testing.md) covers that distinction.

Sharing a validator does not eliminate validation at separate trust boundaries. Small mirrored
declarations can be cheaper than coupling modules or deployment units; identify their authority
and protect required agreement with existing generation or a focused contract check. Cross-repo
mirrors need an explicit compatibility mechanism. Duplication findings name the fact that can
drift and its actual change cost; [contracts](api-contracts-and-codegen.md) owns wire seams.

### SIM5 — Readability is more than short functions

Use domain names, explicit units, straightforward control flow and early returns where useful.
Split when responsibilities or effects become hard to reason about, not to meet a line quota.
Do not turn one understandable flow into a chain of tiny functions or boolean-driven generic
helpers. Explain surprising constraints close to the code. [Comments](comment-standard.md)
owns machine-consumed directives and rationale. Size is a prompt to inspect, never a defect alone.

### SIM6 — Simplify without erasing guarantees

Before removing validation, retries, state, tests or compatibility code, identify who relies
on it and the failure it prevents. Internal invariants can remove redundant checks only when
they are actually enforced. Preserve trust-boundary validation, authorization, recovery and
resource bounds. A simpler implementation must satisfy the same required behavior.

### SIM7 — Make cleanup bounded and reversible

Remove proven dead code rather than adding another parallel path. Check dynamic registration,
external consumers and migration windows before declaring code unused. Allow staged migrations
with explicit compatibility and completion conditions; do not force an unrelated repo-wide
rewrite. Favor changes that make the next realistic modification easier to locate and verify.

## Sources

- [OpenSSF dependency evaluation](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html)
- [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html)
