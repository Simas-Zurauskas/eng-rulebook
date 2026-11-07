# Correctness under failure

## Applicability

Errors, asynchronous work, external calls, retries, jobs, cancellation and degraded service.
Preserve meaningful domain behavior; introduce recovery infrastructure only for actual needs.

## Checks

### RES1 — Errors have an owner and an honest outcome

Validate domain preconditions and preserve causes/context at the appropriate boundary. Await
promises/tasks or explicitly supervise their failures. Do not swallow errors that lose required
work or return success after failure. Expected misses may be handled quietly when safe; use
useful error semantics and avoid leaking internals. Money uses a deliberate precise representation
and currency; numeric validation rejects nonfinite/invalid values where consequential.

### RES2 — Work has effective deadlines and bounds

External calls need effective timeouts and bounded response/work size; propagate remaining
request budgets where needed. A runtime/process execution limit is not necessarily an I/O
deadline. Bound concurrent, queued and detached work; decide whether saturation waits or rejects,
and make consequential rejection visible. Add circuit breakers or queues only when warranted.

### RES3 — Retry by semantics, not hope

Inspect response status and distinguish retryable, terminal and ambiguous outcomes. Bound retry
attempts/time with appropriate backoff/jitter and Retry-After. A failed response is not proof
an effect did not happen; submit retries may already be billable. Use [durable integrity](data-integrity.md)
for idempotency, remote handles and reconciliation. Polling and submission have different risks.
A generic rule that all 4xx are terminal or every malformed response is retryable is insufficient.

### RES4 — Recovery converges without hiding degradation

For important detached work, bound execution and provide recovery for missed completion.
Guard late executors/finalizers so only the legitimate result wins. Preserve durable validated
fallback outcomes where the product supports them; do not fabricate successful results. Clients
must reconcile authoritative critical state after missed events/resume/reconnect. Two delivery
channels or a fallback ladder are not universal requirements.

### RES5 — Cancellation and shutdown respect ownership

Propagate cancellation to obsolete reads and safely cancellable work; clean up sibling tasks
and resources. Durable mutations/paid jobs still need a completion/recovery owner. Stop accepting
new work before draining on shutdown; preserve reclaimability and do not assume cleanup always
runs before process death. Readiness and liveness serve different purposes. Keep blocking work
from starving an asynchronous runtime. [Observability](observability.md) covers useful failure signals.
