# Security boundaries

## Applicability

Identity, untrusted input, privileged actions, secrets, uploads and externally reachable surfaces.
Use mature framework/provider primitives. Existing threat requirements matter; do not impose a
particular session architecture, scanner or compliance checklist on every project.

## Checks

### SEC1 — Enforce identity and resource authority

Authenticate protected entrypoints and authorize the operation, role, owner and tenant on the
server, including background jobs, exports and storage access. Trace shared middleware before
claiming a local guard is missing. Public routes must be intentional. Client flags, hidden UI
and environment strings do not authorize access. Privileged bootstrap/debug/seed paths cannot
recreate backdoors or reset real accounts accidentally.

### SEC2 — Sessions and recovery enforce their promised lifecycle

Choose storage and lifetime appropriate to the client. Validate JWT signature/algorithm,
issuer, audience and expiry where used; unverified claims confer no authority. For rotating
refresh credentials, handle reuse and honest concurrent refresh according to the actual
contract. Password/reset/recovery actions revoke all credentials their policy promises, across
session families. Transient failures are distinct from final rejection. Identity linking must
verify control of the linked identity. Use mature password hashing and recovery primitives;
preserve passphrases without silent truncation and avoid invented composition/rotation rules.
When establishing/changing passwords, screen known compromised/common values using suitable
provider support. Login/recovery responses must not disclose account existence through their
content or materially different behavior where enumeration would expose users.

### SEC3 — Tokens and secrets have narrow authority

Use strong random opaque secrets where appropriate, protected stored verifiers, expiry and
atomic one-shot consumption for single-use tokens. Use timing-safe comparison for secret
verifiers. Reusable sessions and signed tokens have different semantics; do not blindly make
all tokens single-use. Keep secrets out of source, client bundles, logs and reports. Fixtures
and examples can also contain real leaks. Rotate exposed credentials and investigate their
scope. Do not add fallback credentials or privileged default accounts.

### SEC4 — Validate at trust boundaries and serialize deliberately

Parse external shapes with type/range/size limits before privileged or expensive work. Reject
unauthorized write fields and return explicit allowed fields; prevent mass assignment. Runtime
validation is required where static types cannot establish trust. Removable assertions cannot
provide authorization or input validation. Respect framework guarantees before duplicating
checks. Apply limits early enough to bound parsing and consider configured proxy behavior.

### SEC5 — Match defenses to the interpreter

Parameterize SQL values and allowlist dynamic identifiers. Pass subprocess arguments without
shell interpolation; use context-safe output encoding and maintained HTML sanitizers for rich
content. Do not execute attacker input as code or treat sanitization as making eval safe.
Use safe YAML/XML/object decoders; disable unsafe object construction/entities and bound
expansion, archive entry count and decompressed size where relevant.

### SEC6 — Constrain files, uploads and outbound fetches

Validate upload size/content, storage scope and access; file extensions are insufficient.
Prevent traversal through normalized paths, symlinks and archive entries. Keep uploads from
becoming executable content. For server-side fetches of untrusted URLs, constrain schemes,
hosts, resolved addresses and redirects; a first-host check alone does not prevent SSRF.
Protect internal metadata/services and bound response size and duration.

### SEC7 — Protect transport, ambient credentials and costly surfaces

Use secure transport and appropriate cookie/header settings for the deployment. Ambient
credential requests need effective CSRF protection, including unsafe methods; use the existing
framework's valid defense rather than duplicating rituals. GET/HEAD must not perform requested
state-changing actions: safe-method prefetching and CSRF exemptions make them unsafe for writes.
Scope trusted proxies correctly.
Rate/resource-limit credential abuse and costly actions according to the real risk, including
concurrency and body limits. [Web](web-client.md) owns browser refresh and XSS details.

### SEC8 — Storage and security failures remain observable

Keep private storage private, enforce scoped access and revoke public/shared copies when their
contract requires it. Review reachable dependency vulnerabilities and operational security
signals: credential/admin changes, suspicious access and failed revocation must be diagnosable
without logging secrets. Tests should exercise consequential rejection paths and effects;
missing a particular scanner is not itself proof of insecure behavior.
