# Contracts and compatibility

## Applicability

APIs, events, client/server seams, shared values and generated contracts. Preserve the project's
existing contract mechanism; neither a generated client nor a uniform JSON envelope is universal.

## Checks

### API1 — One authoritative contract matches runtime behavior

Keep schemas, validators, documentation and actual serialization consistent. Generated outputs
come from their committed source and regeneration path; check freshness in affected consumers.
Inspect include globs that can omit endpoints. Shared finite vocabularies need drift protection;
intentionally extensible catalogs must permit unknown future values deliberately.

### API2 — Boundary semantics are usable and safe

Specify relevant statuses, stable machine-readable error identifiers, pagination, limits,
idempotency and retry outcomes. Cover middleware/parser/limiter and unknown-route failures too.
Human copy is not a stable discriminator. Serialize allowed fields, prevent mass assignment,
and define unknown-field behavior. Streams, files and no-content responses use appropriate
contracts; do not force them into a JSON envelope. Avoid double writes after headers/stream start.

### API3 — Evolution accounts for real consumers

Find independently deployed callers, installed mobile clients and persisted messages before
changing a contract. Additive optional changes are often safer but enum additions can still
break exhaustive consumers. Coordinate/version real breaks and preserve compatibility during
the rollout. Hand-mirrored values need exact contract evidence on both sides when sharing is
not possible. Do not delete deprecated shapes merely because current local code stopped using them.

### API4 — Wiring and ordering preserve the contract

Trace actual mounts and middleware: authentication/roles, correlation, input limits and parsing
must occur at the correct point. Verify proxy/body limits and side-effect authorization. Public
API docs are a deliberate exposure choice, not inherently a vulnerability. Exercise meaningful
boundary success and rejection behavior, including clients' failure handling.
