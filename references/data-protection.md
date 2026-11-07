# Personal-data lifecycle

## Applicability

Collection, storage, telemetry, export/deletion, retention, third-party egress and consent-based
processing. Follow the project's actual legal/product commitments; this guide is not a legal
assessment and creates no mandatory compliance inventory or profile.

## Checks

### PRIV1 — Trace and minimize the affected data

Identify personal data in the affected schemas, stores, caches, queues, logs, derived artifacts,
backups and vendors by inspecting real flows. Collect and expose only what the feature needs.
Avoid unnecessary identity/content joins and personal data in diagnostics. Pseudonymized data
may still identify people; do not claim anonymization without evidence.

### PRIV2 — Retention and deletion execute their promises

Enforce the stated retention and cleanup behavior. Deletion/export covers relevant sessions,
public copies, derivatives and vendor stores, remains authorized/bounded and recovers partial
failure. Preserve enough state to retry cleanup. Explain retained records and minimized identity;
soft deletion is not erasure. Test against independently discovered stores rather than a list
shared with the deletion implementation. Backups need an honest retention/restore policy; do
not promise per-record backup erasure the system cannot perform.

### PRIV3 — Egress and consent constraints hold at execution

Check real provider/deployment settings against stated residency, retention/training and data
sharing constraints. Where consent is the processing basis, retain the necessary purpose/version
and enforce withdrawal where work is consumed, including queued work. Credentials alone do not
authorize unrelated data processing. Missing consequential policy facts are questions to resolve,
not invented defaults or automatic missing-document defects.
