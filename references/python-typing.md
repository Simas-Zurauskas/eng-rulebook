# Python typing and runtime boundaries

## Applicability

Python annotations, static checking, parsing and language traps. Use the project's supported
interpreter and checker; annotations are not runtime enforcement.

Use the shared TYP checks in [type discipline](type-safety.md) for model ownership, valid
states and module contracts; the TS-specific checks there do not apply to this language.

## Checks

### PYTYPE1 — Check relevant bodies and contain Any

A checker may skip unannotated function bodies. Inspect its settings and touched checked scope;
use useful annotations/check-untyped-body equivalents where needed. Contain dependency Any and
scoped suppressions, and preserve existing strictness. A checker passing a largely unchecked
module does not establish correctness.

### PYTYPE2 — Validate runtime input explicitly

TypedDict, cast and annotations do not validate dictionaries or external data. Parse at trust
boundaries. Never use assert for authorization/input validation: optimized execution can remove
it. Framework-introspected annotations must resolve at runtime, not only behind TYPE_CHECKING.

### PYTYPE3 — Model actual state and error behavior

Use effective exhaustive handling for closed states; dict[Enum, Handler] alone does not prove
all enum keys exist. Preserve exception causes and distinguish expected errors. Avoid mutable
default arguments and unintended shared request state. Concurrency correctness cannot rely on
annotations or assume the GIL provides general synchronization.
