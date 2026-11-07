# Architecture and change boundaries

## Applicability

Module responsibilities, new feature areas, client state, services and cross-repo seams.
Work with the existing architecture unless a concrete failure or change cost warrants revision.

## Checks

### ARC1 — Make responsibilities findable

Locate a behavior and its authoritative rules without searching competing implementations.
Use coherent domain/module boundaries as the system grows; a small program may stay flat.
Entrypoints can implement simple behavior directly. Extract domain logic or data access when
it reduces coupling or allows actual reuse/testing, not to satisfy a layer-count convention.
Before copying a pattern, inspect a representative maintained implementation and its callers;
the first search match may be legacy code still in use but unsuitable for new work. Place new
behavior with its owning feature/module under current conventions, with related contracts and
tests easy to locate. No universal folder tree or physical test colocation is required.

### ARC2 — Bound coupling and effects

Avoid accidental dependency cycles, imports through another package's private internals, and
shared modules that mix unrelated policies. Keep significant external effects and domain rules
understandable. SDK wrappers are useful for shared policy or replacement boundaries, but are
not compulsory for every call. Existing framework-native patterns are valid architecture.
Extract shared modules for actual shared ownership; avoid unrelated utility collections,
speculative layers and one-function files that force readers to reconstruct a simple flow.
File splitting should improve cohesion or safe change, not merely fit an agent context window.

### ARC3 — State has a real lifetime and owner

Anything that must survive restart, concurrent requests, account switches or multiple instances
needs appropriate ownership and storage. Process memory is fine for explicitly ephemeral state,
not durable jobs, global quotas or authoritative sessions. Separate server data from editable
UI drafts; use the framework/query layer's cache behavior rather than creating competing copies.

### ARC4 — Growth mechanisms solve observed needs

A queue, service split, cache, event bus or generalized workflow must address a real constraint
or required guarantee. Prefer existing platform support and a cohesive application until the
need is established. Slow work can stay on a request path when bounded and compatible with the
user's latency contract; important work that outlives the request needs durable ownership.

### ARC5 — Boundaries permit safe evolution

Identify callers and independently deployed consumers before changing schemas or interfaces.
Review failure propagation and state handoffs across modules/repos. Keep deployment and recovery
compatible with the actual rollout; a temporary dual path can be intentional. Use [contracts](api-contracts-and-codegen.md)
and [integrity](data-integrity.md) for the concrete guarantees.
