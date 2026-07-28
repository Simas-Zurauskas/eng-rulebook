# Data Integrity Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-07-17)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
> Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs the correctness of **stored state** under concurrency and failure: atomic claims,
> fencing, attempts caps, terminal-state guards, idempotency, quotas, cleanup, and migrations.
> The core idea: **the database's conditional write is the only arbiter of a state
> transition** — never a prior read, never a stale process's belief that it owns the work.

## 0. Scope — when this standard applies

Applies whenever **more than one writer can touch a record** — multiple instances, a retrying
client, a sweeper, a recovery path, an operator script. That is every non-trivial system.

Assumed context (per `_authoring.md`): a multi-repo TypeScript workspace — a backend API that
owns all persistence, work driven by a DB-backed job queue calling **paid** external APIs,
and N identical backend instances each running a dispatcher. Rules are store-agnostic;
examples use document-store operators (e.g. MongoDB `findOneAndUpdate`) and SQL equivalents.

**Not this standard's lane** (one-line cross-refs only):

- Timeouts, retries, backoff, degradation ladders toward *external* services →
  `resilience.md`. This file governs what you **persist** so those behaviours stay correct.
- Session/token revocation state and auth integrity → `security.md`.
- Response envelopes, error codes, codegen → `api-contracts-and-codegen.md`.
- Making the failures below *visible* (wedge alarms, silent-degradation ban) →
  `observability.md`.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-07-28;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| IETF "The Idempotency-Key HTTP Header Field" | **draft-ietf-httpapi-idempotency-key-header-07 — EXPIRED 18 April 2026** (revision dated 15 Oct 2025); never published as an RFC. §6 treats it as design precedent; citing it as "the IETF spec" is a factual error, and a bare document name retrieves an expired draft |
| Stripe idempotency keys | **Living documentation, unversioned.** Cite the *model* — random V4-UUID keys, stored first-response replay, mismatched-payload rejection, bounded key retention. Any retention window or key-format number is pinned in the profile, not here |
| Martin Kleppmann, "How to do distributed locking" | Blog post, **8 February 2016**, unrevised. It specifies a **monotonically increasing** token checked by the storage service; §5's equality-compared random token is this file's adaptation of it and says so |
| Idempotent Consumer pattern (microservices.io, Chris Richardson) | **Living pattern catalogue, unversioned and undated.** Cite the pattern name only — no clause in it is normative here |
| MongoDB duplicate-key error | Server code **11000**, `DuplicateKey` (rendered `E11000 …` in the message text) — read from the server's own error-code registry |
| PostgreSQL duplicate-key error | SQLSTATE **23505** `unique_violation`, class 23 Integrity Constraint Violation — stable across releases; checked against the current (18.x) error-code appendix |

## 1. Core principle — you live in an at-least-once world

Processes crash mid-write. Deploys SIGTERM in-flight work. Leases expire under live workers.
Clients retry ambiguous timeouts. Exactly-once *delivery* is unachievable; what you can build
is at-least-once execution **plus idempotent, guarded writes** — "effectively exactly-once"
(the Idempotent Consumer pattern, microservices.io). Duplicates and races are therefore
**certainties to design for, not edge cases to apologise for**. Two consequences drive every
rule below:

1. **Eligibility must be checked and consumed in the same operation.** Any gap between "read:
   am I allowed?" and "write: do it" is a window in which another writer changes the answer.
2. **Every writer must prove, on every write, that it still holds the right to write.**
   A process's memory of claiming is not proof — the claim may have expired while it paused.

When work costs money per step, every such race has an invoice. In one audited four-repo
TypeScript workspace whose queue drives a paid media-generation API, all three top-severity
queue findings violated these two consequences — and all three were closed by moving the
check *into* the write. That before/after arc is this file's evidence base.

## 2. State transitions are single conditional writes

**NEVER read-then-write a state transition.** The only legal shape is one atomic
compare-and-set: a single conditional update whose filter matches the *expected current
state* and applies the transition in the same operation (e.g. `findOneAndUpdate` with a
status filter; SQL `UPDATE … SET … WHERE status = 'expected'`).

- **The write's result tells you whether you won.** Check the matched/modified count (or
  returned row) wherever the caller branches on ownership — a conditional update that didn't
  match is a *silent no-op*, and acting as if it succeeded (e.g. launching a downstream
  worker for a job you didn't actually transition) does paid work for a cancelled record.
- Prevents: in the audited workspace, one read-check-then-save "share" endpoint let a
  double-tap mint **two** share tokens and publish two public copies of a private artifact —
  the losing token was overwritten, its public copy permanently unreachable by any cleanup
  path. Every *other* multi-writer transition there was atomic; one exception is all it takes.
- Check-then-insert uniqueness (e.g. "is this email taken?") is the same bug: the unique
  index is the arbiter; catch the duplicate-key error and map it to the domain response (§6).

## 3. Claiming work: one atomic claim, held by a lease

A queue claim MUST be a single conditional write that **checks eligibility and claims in the
same operation**. The reference shape, verified in production code:

- Filter: (status `queued`) OR (status `running` AND lease expired), AND attempts < cap (§4).
- Update, atomic with the filter: status → `running`, fresh lease expiry, **fresh fencing
  token** (§5), increment `attempts`.

Safe across any number of dispatcher instances because losing racers match nothing. **Lease,
not lock:** a crashed worker's claim expires by itself; a healthy worker **renews the lease
mid-step**, so slow-but-live work is never reclaimed out from under itself. Size the lease to
worst-case *legitimate* step time plus margin; write the justification next to the constant.

## 4. Attempts caps live in the claim filter, not in an after-the-fact check

An `attempts` counter that is incremented but never *read* is decoration. **The cap MUST be
part of the claim filter** (`attempts < MAX`), so over-limit work is structurally
unclaimable — not detected after it already re-ran.

- Prevents the **immortal poison job**: in the audited workspace, a job whose handler killed
  the process (OOM on multi-MB payloads, deploy SIGTERM) never reached its failure handler;
  its lease went stale and it was reclaimed indefinitely, alternating across both production
  instances and issuing a **fresh paid API submission every lease period, forever**. High
  consequence (unbounded spend), high plausibility (fires at background crash rates).
- A capped-out job is stuck non-terminal and invisible to claiming — so the cap MUST be
  paired with a **sweeper/reconciler** that moves over-limit work to terminal `failed` and
  syncs the user-facing record. Unclaimable-but-alive is not an end state (§7, §11).

## 5. Leased work carries a fencing token

Every claim MUST stamp a **fencing token** (Martin Kleppmann, "How to do distributed
locking", 2016) — a fresh identifier issued by the claim itself — and **every subsequent
write by the executing worker MUST be filtered on it**. A worker that stalled past its lease
and was superseded holds a stale token; its late writes match nothing and no-op instead of
clobbering the new claimant.

- **Double spend on a paid external call is the canonical consequence of skipping this.**
  In the audited workspace the claim was atomic but post-claim writes updated by id alone; a
  stall past the lease (hung socket, GC pause, burstable-instance CPU drought) resumed the
  original executor beside the reclaiming worker and **both** wrote: double-billed
  generation, duplicate worker launches, or a *successful* result marked failed by the loser.
- Kleppmann specifies a monotonic counter checked by the storage service. When the database
  is both the lock service and the storage — the DB-backed-queue case — a **fresh random
  token compared for equality in each write's filter** gives the same property with no
  counter to coordinate: only the *current* claim's writes match.
- Issue a fresh token on **every** claim path, including recovery (stale-lease reclaim,
  finalizer re-claim) — each new fence invalidates all in-flight writes from prior claimants.
  Wrap the fence in one filter-builder helper so no call site can quietly write unfenced; any
  legacy "no token → match by id" fallback is explicit, commented, and temporary.

## 6. Idempotency: a unique index is the arbiter, not application code

For any client-triggered operation that creates cost or state (a paid generation, a payment,
a send), accept a **client-supplied idempotency key** (the expired IETF HTTPAPI Internet-Draft "The
Idempotency-Key HTTP Header Field"; Stripe's idempotency-key model — both §0) enforced by a
**UNIQUE (partial) index** on `(owner, key)`:

- **The DB constraint decides concurrent duplicates.** An application-level "does this key
  exist?" read is only a fast path — two concurrent submits both pass it. The race's loser
  hits the duplicate-key error (e.g. MongoDB E11000, Postgres 23505); **catch it and return
  the winner** (the already-created record), not a 500.
- Make the index **partial** (applies only where a key is present) so keyless rows aren't
  constrained; scope the key per owner so clients' keys can't collide.
- **No key = no dedup. State it honestly.** A retry without a key creates and bills again;
  docs and client code must say so rather than imply safety that doesn't exist.
- That Internet-Draft says a key MUST NOT be reused with a different payload and RECOMMENDS
  a UUID — but it expired without becoming an RFC, so it is precedent, not obligation.
  Payload-mismatch rejection is optional hardening; the unique index is not.

## 7. Terminal-state machines: enumerate, guard, one-way doors

Every stateful entity MUST have a **closed, enumerated status set**, and every transition
MUST be guarded on the expected current status in the write's filter:

- **Terminal states are one-way doors.** Completion/failure writes filter on the active
  status (e.g. `status: 'running'` + fence), so a job cancelled mid-flight is **never
  resurrected** to completed/failed when its orphaned handler finally returns — the remote
  output is genuinely discarded, matching the cancellation contract.
- **Name non-reclaimable intermediate states explicitly.** Work handed off outside your
  process (a launched container, an awaited callback) is non-terminal but MUST NOT be
  lease-reclaimable: clear the lease on entry, and give the state exactly two exits — the
  completion callback and a **deadline sweeper** — with the re-claim back to `running`
  itself atomic, so N racing finalizers resolve to exactly one.
- **Operator/reconciler overrides skip the fence but never the status guard**: filter on the
  non-terminal statuses, so a force-fail can terminate a stuck job yet never overwrite a
  completed/cancelled one.
- Cancellation of remote work you cannot abort is *best-effort and irreversible*: flip your
  stored state, let the remote work finish, discard the output. Say so in the contract.
- Know your driver's clear-a-field semantics: in some ODMs `$set: { field: undefined }` is a
  **silent no-op** — use the explicit unset operator and pin it with a test (§ Guard rails).

## 8. Multi-phase paid work resumes; it never re-pays

When a workflow makes several paid external calls, the stored record IS the checkpoint log:

- **Persist the resumable handle immediately after each paid submit** (e.g. the provider's
  poll URL), so a crash + reclaim *resumes polling* instead of re-submitting — re-polling is
  free; re-submitting bills again.
- **Persist a phase marker after each completed paid phase** (e.g. stash the phase-1 output
  on the record and clear phase-1's handle). The marker's *presence* is what re-entry reads
  to skip straight to the next phase. Recovery must need no memory of the crashed run.
- **Recovery decisions read durable truth, never process signals.** "Which artifact do I
  deliver?" is answered by *what actually exists in object storage* (final → raw → fallback),
  not by an exit code or a callback's claim — sweeper-path callers may have no exit code at
  all. The degradation ladder itself is `resilience.md`'s lane.
- **Acknowledge the residual window.** The gap between a successful paid submit and the
  handle's persist re-pays once on a crash inside it. Shrink it to adjacent statements,
  comment it, and accept it — pretending it's zero is how it grows.

## 9. Caps and quotas are enforced inside the write's filter

A limit checked by a prior read overshoots under concurrent submits — N racers each read
"under the cap", all N insert. **Put the cap in the conditional write itself**: an
aggregation guard on current size (e.g. `$expr` comparing an embedded array's length to the
max) or a conditional `UPDATE`/`INSERT … SELECT` that fails closed. The audited workspace
enforces its per-user collection cap exactly this way; a race cannot overshoot because the
losing write matches nothing and maps to the domain's "limit reached" response.

## 10. Reaching stored state — moved to `performance-and-data-access.md`

Index and payload rules moved to their own lane; this section is kept so citations against it
still resolve. The obligations, with their new homes:

- Every claim and sweep query has a backing index **including its sort** →
  `performance-and-data-access.md` §2.2.
- Write the index next to the query shape it backs; a declared index with no consuming query
  taxes every write → `performance-and-data-access.md` §2.1.
- Records hold keys, not blobs → `performance-and-data-access.md` §5.1.
- No per-item query in a loop over a list you just fetched → `performance-and-data-access.md` §3.1.

**What stays this file's lane:** the *consequence* for the claim protocol. A claim query that
cannot execute is a **liveness failure of the claim**, not merely a slow one — the worker holds
no lease, no work is claimed, and the pipeline stops with every record still in a valid state, so
nothing in §3–§5 detects it. Size and index the claim query as part of the claim's design (§3),
and alarm on claim throughput reaching zero (`observability.md`), not only on error rate.

## 11. Cleanup: declared TTLs, a durable/transient split, loud cascades

- **Split the durable record from the transient job.** The user-owned artifact record stays
  **slim** (status, result keys, error) and lives forever; the queue job carries the fat
  inputs and **TTL-purges** on a terminal-only marker (e.g. expiry indexed on `completedAt`,
  set only by terminal transitions) so in-flight work is structurally immune. Every terminal
  transition MUST stamp that marker or the collection grows unbounded.
- **Every TTL is declared and justified** in one place (Appendix A): what expires, on which
  field, after how long, who is immune. Two traps: queued work has no terminal marker and
  **never TTLs** — pair with §4's cap + reconciler so nothing is immortal *and* invisible;
  and a TTL that purges the job before a reconciler runs erases a half-synced failure's
  only evidence.
- **Cascade deletes enumerate everything and surface partial failure.** Account deletion
  wipes every owned collection *and* object-storage prefix. Order **storage-first, DB-last**
  so a mid-cascade throw is retry-safe (the row that finds the residue still exists), and
  **never swallow per-object delete errors** — a quietly-skipped public object whose DB
  reference is gone is permanent orphaned user media and a right-to-erasure hole.
- **Destructive prefix/bulk operations carry a breadth guard.** A prefix delete MUST refuse
  an over-broad argument (empty string, a top-level prefix) with a hard throw — one bad
  interpolation otherwise wipes every user's media. Cheap, unit-testable, non-negotiable.
- **Sweep for orphans created by known races**: delete-vs-late-upload (a worker finishing
  after its owner was deleted) needs a post-deadline re-sweep or a no-owning-record audit.

## 12. Migrations: idempotent re-runs or an explicitly one-way pass — documented which

- **Default to idempotent: upserts keyed on legacy identifiers, backed by unique indexes.**
  The audited workspace's legacy import upserts users on a sparse-unique legacy-id field and
  artifacts on a unique legacy key — a re-run **converges** (counts stop growing) instead of
  duplicating. A genuinely one-way pass must say so in bold in its runbook.
- **Merge-vs-insert rules are stated, and conflicts abort loudly.** Match on legacy id OR
  natural key (e.g. email); a returning migrant merges, a local collision is adopted and
  stamped, and a *contradiction* (existing record whose stored legacy id disagrees with the
  source) **throws and halts** — never guess which account wins.
- **Persist the ID mapping on the target record** (the legacy-id field itself, uniquely
  indexed). It is simultaneously the dedup key, the audit trail, and the join key for later
  backfills. A mapping held only in the migration process's memory is lost on exit.
- **Destructive merge policies are explicit and flag-gated** (e.g. "legacy credential hash
  overwrites local unless a PRESERVE flag is set"), and merges that must *remove*
  out-of-scope fields do so explicitly — ODM saves typically cannot unset unknown fields.
  The legacy source is **read-only**: the migration only ever reads from it.

## 13. Two records that must change together carry a recovery obligation

Where one transaction cannot span them — separate stores, a document store without
multi-document transactions, a DB row plus an object-storage write — the pair MUST pass through
an **intermediate state some sweeper can finish or roll back from durable state alone**, never
through a state that is merely wrong. Order the writes so the crash window leaves the
*recoverable* side: write the intent first (a pending marker naming what the second write owes),
perform the second write, then clear the marker in the conditional write that finalises (§2).

- **"Use a transaction" is not the rule; being resumable without one is.** A transaction removes
  the window where you have one; the marker + sweeper is what you owe everywhere else, and it is
  also what you owe *with* a transaction whose second participant is a remote system.
- Prevents the **half-terminal record**: the job flips terminal, the deploy lands, the
  user-facing record is never synced — and nothing on disk distinguishes "still running" from
  "finished an hour ago", so no sweeper can safely act and the record is stuck forever (§7, §11).
- The marker MUST be readable by a process with **no memory of the crashed run** (§8) and the
  sweeper's re-claim MUST itself be atomic, so N sweepers finishing one pair resolve to one.

## 14. Schema changes ship as expand → migrate → contract, each phase revertible on its own

A shape change deployed in one step is **irreversible the moment new code writes the new shape**:
the rollback you reach for restores readers that cannot parse records already written. Split it
into three deploys, each independently revertible:

1. **Expand** — add the new field/column, nullable or defaulted, and deploy readers that tolerate
   both shapes. Nothing writes the new shape yet, so a revert leaves no residue.
2. **Migrate** — backfill idempotently and resumably (§12) while both shapes are legal; writers
   may begin writing both. A revert here stops the backfill; it does not strand readers.
3. **Contract** — flip reads to the new shape, then remove the old one **only once no deployed
   reader still reads it**, evidenced by a deployed-version check or a read-of-old-shape counter
   observed at zero (`observability.md`), never by assumption. Contract is the one-way door.

An in-place rename or type change performs all three at once and has no revert — treat it as a
migration (§12) with a runbook, not as a schema edit.

## 15. Read-modify-write carries a version guard, or it silently loses the concurrent update

Any update whose new value is computed from a value it read MUST carry that read's version in the
write's filter — an incrementing revision field the write itself bumps, or the store's native
etag/`_rev` — and MUST treat a **zero-match result as a conflict to surface or re-read-and-retry**,
never as success (§2).

Without the guard the last writer wins in silence: two editors save the same record seconds apart,
the first one's change is gone, no error is raised on either side, and nothing in the data records
that it happened — so the loss is reported as "the app ate my edit", weeks later, unreproducibly.
This is §2's compare-and-set applied to *field* updates rather than status transitions, with the
version standing in for the expected state. It is required wherever two humans, or a human and a
background job, can edit one record.

## Failure shapes

Named patterns from real audits, genericised. If a review comment cites one, this is the file.

- **The immortal poison job** — attempts counted, never enforced; a handler-killing job is
  lease-reclaimed forever, re-billing a paid API every cycle on every instance (§4).
- **The stalled-writer clobber** — atomic claim, unfenced follow-ups; a worker paused past
  its lease resumes beside its replacement: double spend, a good result marked failed (§5).
- **The wedged claim** — unindexed claim sort over payload-laden docs; the backlog peak
  traffic creates makes every claim abort, queued work never TTLs, the pipeline stays down
  until manual intervention (§10, §11).
- **The double-minted token** — one read-check-then-save endpoint in an otherwise-atomic
  codebase; a double-tap creates two public artifacts, one permanently orphaned (§2).
- **The half-terminal record** — job flipped terminal and the user-facing record synced in
  two non-atomic writes with no reconciler; a deploy in the gap leaves the user's record
  pending forever, undeletable, its evidence TTL-purged a week later (§7, §11, §13).
- **The resurrected cancellation** — terminal write not guarded on current status; an
  orphaned handler finishing late overwrites `cancelled` with `completed` (§7).
- **The unkeyed retry** — no idempotency key on a paid create; an ambiguous timeout retried
  by a well-behaved client bills twice, by design (§6).
- **The silent partial cascade** — per-object delete errors swallowed mid-cascade; the DB
  reference is deleted anyway, orphaning public media no code path can ever find again (§11).

## Checklist

Before merging code that writes shared state:

- [ ] Is every state transition a **single conditional write** whose filter checks the
      expected current state — no read-then-write anywhere in the diff?
- [ ] Does the caller **check the write's matched/modified result** wherever it branches on
      ownership (launching work, returning success)?
- [ ] Do all post-claim writes go through the **fencing-token filter** — including
      recovery/finalizer paths, each with a fresh token?
- [ ] Is the attempts cap **in the claim filter**, with a sweeper that terminates capped-out
      work? Does every non-terminal state have a guaranteed exit path?
- [ ] Are terminal transitions guarded on current status — is `cancelled` a one-way door?
- [ ] Idempotency key on every paid create, enforced by a **unique partial index**,
      duplicate-key returns the winner, keyless behaviour documented as no-dedup?
- [ ] After each paid phase: handle persisted immediately, phase marker written, re-entry
      reads durable truth (artifact existence), not process signals?
- [ ] Are caps/quotas enforced **inside the write's filter**?
- [ ] Does every claim/sweep query — **including its sort** — have a covering index, declared
      beside it? Are large payloads in object storage with only keys in records?
- [ ] TTLs terminal-marker-only, declared in the profile, stamped by every terminal
      transition? Cascades storage-first, partial failure thrown, breadth guard present?
- [ ] Migration writes upsert on a uniquely-indexed legacy key, conflicts abort, and re-run
      convergence is stated (or one-way is documented)?
- [ ] Do two records changed together in this diff pass through a marked intermediate state
      with a sweeper that can finish or roll it back — not just a hoped-for transaction (§13)?
- [ ] Is a schema change split into expand / migrate / contract deploys, each revertible,
      with contract gated on evidence that no deployed reader reads the old shape (§14)?
- [ ] Does every read-modify-write in the diff put the read version (or etag) in its write
      filter and treat a zero-match as a conflict rather than success (§15)?

## Guard rails

CI checks that make this enforceable rather than aspirational:

- **[data-integrity.GR1]** **Concurrent-claimer race tests against a real (in-memory) database** — N parallel claims
  on one queued job yield exactly one winner; N racing finalizers exactly one finalize.
- **[data-integrity.GR2]** **A stale-fence test**: claim, reclaim with a fresh token, replay the first claimant's
  complete/fail/progress writes, assert they all no-op.
- **[data-integrity.GR3]** **A concurrent-duplicate test per idempotency key**: two parallel creates with one key
  yield one record and one returned winner — plus a schema test asserting the unique partial
  index exists (an index dropped in a refactor fails no type check).
- **[data-integrity.GR4]** **A status-machine exit test**: enumerate the status set and assert every non-terminal
  status has a mover (claimer, callback, sweeper, or reconciler) that can advance it.
- **[data-integrity.GR5]** **Explain-plan assertions** (or a startup check) that claim/sweep query shapes use their
  intended indexes — catches the wedge before peak traffic does.
- **[data-integrity.GR6]** **A breadth-guard unit test**: the destructive prefix delete throws on `''` and top-level
  prefixes.
- **[data-integrity.GR7]** **A migration convergence test**: run the import twice against a fixture source; the
  second run's insert counts must be zero.
- **[data-integrity.GR8]** **A driver-semantics pin**: a test proving your "clear this field" idiom actually clears it.

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's own profile
> (`profiles/data-integrity-profile.md`) and fill them there. Agents: read the
> project's profile before touching its queue, state machines, or cleanup paths.

**State machines — statuses and one-way doors:**

| Entity | Statuses (closed set) | Terminal (one-way) | Non-reclaimable intermediates + their two exits |
| --- | --- | --- | --- |
| _e.g. Job_ | | | _e.g. `handed-off`: callback / deadline sweeper_ |

**Idempotency keys and their indexes:**

| Operation | Key + scope | Enforcing index (partial?) | Duplicate-race handling | No-key behaviour |
| --- | --- | --- | --- | --- |
| | _(owner, key)_ | | _dup-key error → return winner_ | _creates again — documented where?_ |

**TTLs and cleanup:**

| Collection | TTL field (terminal-only?) | Duration + justification | Immune states | Orphan sweep |
| --- | --- | --- | --- | --- |

**Paid-call phase markers:**

| Workflow | Phase | Handle persisted (when) | Phase marker | Resume-on-reclaim behaviour |
| --- | --- | --- | --- | --- |

**Claim/sweep queries and their covering indexes:**

| Query (filter + sort) | Index | Where declared |
| --- | --- | --- |

**Migration dedup keys:**

| Source → target | Dedup key + unique index | Merge-vs-insert rule | Re-runnable? |
| --- | --- | --- | --- |
