# Performance and data access

## Applicability

Queries, schemas, lists, large payloads, caching, connection pools and cost that grows with data.
Use realistic workload evidence; static inspection cannot establish deployed latency or index use.

## Checks

### PERF1 — Queries and constraints match the data model

Use schema constraints for real invariants. Evaluate indexes against actual filters, sorts,
joins and projections, including claim/sweep paths under backlog. Balance read benefit with write
and storage cost; not every query or foreign key needs its own index. Where plans matter, inspect
representative engine plans. JSON fields can be appropriate when their shape/invariants remain
controlled; do not mandate normalization solely because JSON exists.

### PERF2 — Bound work at the server

Enforce result/page/body/response/concurrency limits where input or data can grow. Avoid N+1 and
hidden lazy loads; batch/join or justify genuinely bounded per-item work. Use stable ordering
and suitable cursor pagination for deep/growing lists. Background scans need bounded batches
and resumability. A client limit does not protect an unbounded server query.

### PERF3 — Avoid unnecessary transfer and memory amplification

Select needed fields; keep large blobs off hot scanned/polled records. Stream or aggregate
large data appropriately instead of loading it all into memory. Account for decompression,
serialization copies and engine limits. Measure hot paths before adding speculative caches,
indexes or distributed components.

### PERF4 — Cache correctness includes authorization

Keys include value inputs and tenant/user scope where needed. Define acceptable staleness or
immutable content addressing; implement corresponding expiration/invalidation and safe HTTP
cache headers. Prevent cross-user leakage. Hot expensive regeneration may need stampede control;
not every cache needs new infrastructure or metrics. Verify that caching actually helps.

### PERF5 — Capacity fits the call graph

Consider total pool demand across replicas/workers and bound acquisition waits independently of
query time. Avoid long transactions holding scarce connections over remote calls. Set useful
latency budgets and release obsolete work safely. Separate workloads only when contention
justifies it. Treat measured limitations and inferred risks distinctly in findings.
