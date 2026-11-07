# Type discipline and TypeScript boundaries

## Applicability

TYP checks apply to data models and typed module contracts in any language. TS checks apply
only to TypeScript/JavaScript; loading this guide for Python/PHP does not introduce TS tooling.
Keep useful existing strictness and improve the touched boundary without an unrelated migration.
Language-specific runtime parsing remains in the TS, [Python](python-typing.md) and
[PHP](php-typing.md) checks; [contracts](api-contracts-and-codegen.md) owns wire compatibility.

## Checks

### TYP1 — Types follow the owner of their meaning

Reuse authoritative exported types, or derive them from existing schemas, when they describe
the same contract. Hand-copied interfaces can drift while each consumer still compiles.
Transport, persistence and domain representations may legitimately differ: a wire timestamp
string and a domain date are not one type merely because both describe an expiry. Convert at
the boundary and preserve allowed fields; do not expose storage internals to save a mapping.
Follow [simplicity](simplicity.md) for intentional mirrors and abstraction tradeoffs.

### TYP2 — Models express the valid states callers rely on

Represent meaningful states, required fields and null/absence deliberately. A sent result
requiring a timestamp should not be modeled as a status plus an unrelated optional timestamp
when the language can express their relationship clearly. Use understandable unions, enums
or equivalent checked constructors, and handle closed states exhaustively. Open external
catalogs still need deliberate unknown-value behavior. Distinguish units/identities where
confusion is a real risk; do not introduce brands or wrapper hierarchies for every primitive.
Static models do not replace runtime parsing, authorization or persisted-state constraints.

### TYP3 — Public contracts are deliberate and types remain understandable

Make exported/module inputs and outputs clear enough that an implementation edit cannot
unintentionally change a relied-on contract. Explicit signatures help where inference would
leak internal details; existing checked interfaces or schema inference can establish the same
contract. Prefer clear local inference to redundant annotations. Avoid generic/type-level
frameworks that obscure the concrete behavior. Preserve useful strictness: diagnose errors
before widening a type, adding an assertion/suppression or inventing a fallback value.

### TS1 — The checker covers meaningful code

Enable an appropriate strict baseline and verify applicable source/tests/support are checked,
independently of a framework build that skips diagnostics. Account for indexed/optional/null
values. Check the actual compiler/linter compatibility and file scope before interpreting green.
Do not impose a preferred config or blanket maximum strictness on unrelated legacy work.

### TS2 — External shapes are unknown until validated

Static annotations, generic HTTP types and casts do not validate runtime input. Parse untrusted
JSON, storage, env and provider data with the existing suitable schema/validation mechanism.
Derive related types from authoritative shapes where it prevents drift. Keep broad dependency
`any` contained at a boundary instead of propagating it through the domain.

### TS3 — Narrow evidence rather than silence errors

Prefer narrowing and precise types to object/nonnull casts that hide missing fields. A justified
cast at a proven boundary is allowed; make non-obvious assumptions visible. Keep suppressions
specific and explain their reason; do not disable entire files to bypass a real error. Runtime
validation must not be replaced by a prettier type assertion. A user-defined predicate's
`value is T` signature does not prove its implementation checks T: inspect the runtime branches
and exercise meaningful accepted/rejected inputs when behavior relies on them.

### TS4 — Finite states and generated contracts stay consistent

Maintain authoritative closed states and effective exhaustiveness where missing a case changes
behavior. Generated types follow their source and affected clients. Error handling starts from
unknown values and preserves meaningful cause/context without broad unsafe casts. Open external
catalogs must retain deliberate unknown-value handling.

## Source

[TypeScript narrowing and type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
