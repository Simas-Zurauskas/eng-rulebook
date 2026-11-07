# Configuration and environment

## Applicability

Environment variables, deployment settings, boot validation and build/runtime coupling.
Use existing configuration mechanisms; do not invent a configuration service for a small need.

## Checks

### CFG1 — Required configuration is validated before affected work

Parse required types, ranges, enums and URLs; reject malformed or unsafe absence before serving
work that depends on them. Conservative bounded defaults may be valid. Never fall back to real
production destinations, unlimited spend or default credentials accidentally. Optional features
can degrade explicitly. Avoid scattered numeric casts where NaN or empty values change security
or cost semantics. Keep one authoritative meaning for each setting. For consequential runtime
gates, define safe behavior when evaluation is unavailable, stale or invalid; test it. A failed
authority/spend check cannot silently enable the action.

### CFG2 — Environment decisions match deployment reality

Distinguish deployment identity from bundler/debug flags where they differ. Verify environment
gates cannot expose privileged surfaces. Trace build-inlined configuration, client serialization,
container/native artifacts and runtime lookup; all browser-visible channels are public regardless
of variable prefix. Artifacts must be compatible with target OS/architecture/runtime/ABI.

### CFG3 — Settings changes include their real consumers

Update validation, actual affected environments, inert examples and test setup where used.
Document consequential operational requirements in the existing project home, not a mandatory
profile. Shared packages or committed config can own public values; a DB editor or runtime config
endpoint is only needed when the product needs it. Do not duplicate a fact across repos without
an intentional propagation mechanism. Report unavailable live environment verification honestly.
