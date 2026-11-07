# Guide index

This is the single catalog for explicit guide selection and agent routing. Every guide's
checks apply identically in development, full audit and basics audit. There are no basic-only
rules, fixed basic topics, or topic-count limits. Applicability comes from observed behavior.

For development, read guides matching changed responsibilities and risks. For audits, investigate
the whole system's surfaces first, then select individual checks: all applicable in full,
highest-priority applicable in basics. Familiar technology names alone do not establish scope.

## Guides

| Guide | Topics / aliases | Load when investigating |
| --- | --- | --- |
| [simplicity](simplicity.md) | simplicity, quality, code-quality, reuse, maintainability, dry | New mechanisms, custom infrastructure, duplication, indirection and cost of the next change. |
| [architecture](architecture.md) | architecture, arch, structure | Responsibilities, module coupling, state lifetime and cross-component evolution. |
| [security](security.md) | security, sec, auth | Identity, resource authority, untrusted input, secrets, uploads and interpreter boundaries. |
| [data-integrity](data-integrity.md) | data-integrity, integrity, concurrency | Durable state, claims, fencing, deduplication, deletion and migrations. |
| [resilience](resilience.md) | resilience, correctness, correct, errors | Domain/error semantics, deadlines, retries, cancellation and recovery. |
| [api-contracts-and-codegen](api-contracts-and-codegen.md) | api-contracts-and-codegen, api, contracts, codegen | Wire behavior, generated contracts, middleware and deployed compatibility. |
| [performance-and-data-access](performance-and-data-access.md) | performance-and-data-access, performance, perf, data, data-and-performance | Query/index evidence, bounded work, payloads, caches and capacity. |
| [testing](testing.md) | testing, test, tests | Changed behavior, effective assertions, test selection, fixtures and suite cost. |
| [supply-chain-and-build-integrity](supply-chain-and-build-integrity.md) | supply-chain-and-build-integrity, dependencies, supply-chain, build-integrity | Dependency admission, build authority, releases and trusted artifacts. |
| [config-and-environment](config-and-environment.md) | config-and-environment, config, environment | Boot settings, unsafe defaults, exposure and build/runtime coupling. |
| [tooling-and-workspace](tooling-and-workspace.md) | tooling-and-workspace, tooling, tool, workspace, delivery | Reproducible checks, artifacts, generated files and workspace ownership. |
| [observability](observability.md) | observability, logging, monitoring | Consequential silent failures, actionable context and safe telemetry. |
| [data-protection](data-protection.md) | data-protection, privacy | Personal-data flow, retention, deletion/export, consent and vendor egress. |
| [web-client](web-client.md) | web-client, web, browser | Browser identity/refresh, rendering, interaction and client delivery. |
| [mobile-app](mobile-app.md) | mobile-app, mobile | Cold start, suspension, push/account ownership, native/OTA and offline behavior. |
| [ai-features](ai-features.md) | ai-features, ai, llm | Model/tool authority, retrieval, output validation, cost, streaming and evaluations. |
| [type-safety](type-safety.md) | type-safety, typescript, type, types | Shared model/type ownership and contracts in any language; TS checks only for TypeScript/JavaScript. |
| [python-typing](python-typing.md) | python-typing | Python unchecked bodies, Any, assertions, annotations and state semantics. |
| [python-packaging](python-packaging.md) | python-packaging | Python environment, installed artifacts, native dependencies and execution model. |
| [php-typing](php-typing.md) | php-typing | PHP strictness, JSON/collection shapes, comparisons and errors. |
| [php-packaging](php-packaging.md) | php-packaging | Composer/runtime agreement, plugins, no-dev install and autoloading. |
| [php-runtime](php-runtime.md) | php-runtime | Effective SAPI config, OPcache activation, persistent workers and upload/routing limits. |
| [comment-standard](comment-standard.md) | comment-standard, comments, comment | Machine-consumed directives, non-obvious constraints and comment truth. |

## Topic resolution — guide requests only

Match an exact filename stem or listed alias, case-insensitively; accept a `.md` suffix.
Multiple tokens select the union, deduplicated. `python` selects type-safety, python-typing and
python-packaging; `php` selects type-safety, php-typing, php-packaging and php-runtime. In type-safety,
only TYP checks apply across languages; TS checks remain TypeScript/JavaScript-specific. If there is no exact/alias match, a unique
case-insensitive substring of a stem may resolve it. Ambiguous or unknown tokens list candidates
and require clarification; never load every possible guide. Mode words are not guide topics.
Audit commands do not use this topic parser.

Cross-cutting lenses are combinations of these existing checks: release readiness uses the
applicable build/config/artifact/lifecycle checks; accessibility uses web/mobile interaction;
test effectiveness uses testing; compatibility uses contracts/integrity/platform checks.
There are no separate lens rulebooks or extra scan commands.
