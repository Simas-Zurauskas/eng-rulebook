# Durable data integrity

## Applicability

Persisted state, migrations, quotas, queues, jobs, paid operations, deletion and concurrent edits.
Equivalent guarantees from transactions, store constraints or managed services are valid.

## Checks

### DATA1 — The store arbitrates competing decisions

Enforce uniqueness, ownership/eligibility, quotas and legal state transitions atomically with
constraints, conditional writes, transactions or locks appropriate to the store. Inspect affected
rows/results before acting. Separate read-then-write checks can race. Version or lock concurrent
edits when lost updates violate the contract; do not require optimistic locking for every field.

### DATA2 — Claims prove current ownership

For leased work, claiming combines eligibility, lease and attempt budget with a fresh ownership
identity. Renew if needed and require current ownership on subsequent writes/finalization.
Recovery issues a new identity. Stale workers and late callbacks cannot resurrect terminal work,
overwrite winners or reapply effects. Capped-out jobs must reach a visible terminal/recovery
state. A timer or lease expiry does not prove the old executor stopped; external effects need
their own idempotency or fencing support.

### DATA3 — Retryable effects have durable identity

Scope deduplication to the principal and operation, persist it durably, and arbitrate simultaneous
submissions using real constraints. Repeated keys return the existing outcome; conflicting
payload reuse needs explicit rejection or defined semantics. Keyless retries must not silently
claim deduplication. Apply this to paid calls and any repeatable effect where duplicates matter.

### DATA4 — Partial work has a recovery path

Persist remote handles/checkpoints so restart resumes rather than re-pays. A timeout after
submission can mean success; use provider idempotency or reconciliation before retrying.
Multi-store writes/deletes need transactions or durable recovery intent and reconciliation.
Do not discard the last recovery pointer before work completes. Make partial failure visible;
process-local callbacks alone cannot guarantee durable completion.

### DATA5 — Lifecycle and cleanup preserve invariants

Define terminal transitions, cancellation and late completion behavior. Keep active work and
recovery evidence safe from TTL cleanup. Guard empty/root/broad deletion scopes; account for
late uploads, public/derived copies and orphan races. A deletion manifest can allow immediate
access revocation while cleanup retries. Database driver unset/null semantics matter.
[Privacy](data-protection.md) owns personal-data lifecycle obligations.

### DATA6 — Migrations preserve data and deployed compatibility

Use versioned executable migrations and verify representative data. Reruns converge or fail
clearly as an explicitly one-way operation. Imports preserve identity mapping and detect
collisions. When mixed deployed versions require it, expand/backfill/contract with actual
completion/rollback criteria; a small compatible migration need not become three releases.
Check locking/duration and destructive changes against the real data and deployment model.
