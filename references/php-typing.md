# PHP typing and boundary semantics

## Applicability

PHP scalar/collection typing, analysis, JSON and error handling. Strictness changes can alter
runtime behavior and should be scoped and verified.

Use the shared TYP checks in [type discipline](type-safety.md) for model ownership, valid
states and module contracts; the TS-specific checks there do not apply to this language.

## Checks

### PHPTYPE1 — Check effective typing, not just declarations

Scalar argument strictness depends on the calling file; return checking has declaration-side
semantics. Use deliberate strict typing and a meaningful analyzer configuration for the checked
scope. Preserve existing gates and typed collection shapes; contain mixed data at boundaries.
Do not assume a default analyzer level or a strict callee proves a weak caller's input is safe.

### PHPTYPE2 — Parse values without losing meaning

Validate external values before casting; numeric casts are not validators. Handle json_decode
errors separately from valid JSON null and preserve large identifiers when needed. Key-preserving
array operations can turn a JSON list into an object: normalize list keys when the wire contract
requires an array. Closed enums need explicit unknown-value handling at external boundaries.

### PHPTYPE3 — Comparisons and failures preserve security

Use strict comparisons for identity and distinguish false from valid zero/empty results.
Compare secret verifiers with timing-safe primitives. Assert is not an authorization/validation
mechanism. Preserve exception causes, contain specific suppressions and catch Throwable at the
appropriate top-level boundary so Errors do not bypass intended error handling.
