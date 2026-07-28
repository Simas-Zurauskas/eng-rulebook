# Resilience Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-07-17)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs how the system behaves when a **dependency fails**: timeouts, retry policy,
> transient-vs-terminal classification, degradation ladders, watchdogs and sweepers,
> backpressure, and delivery redundancy. The core idea: **survive the blip, not just the
> crash** — a system engineered only for process death still loses paid work to one TCP reset.

---

## 0. Scope — when this standard applies

Every code path that leaves the process — vendor HTTP APIs, database drivers, object
storage, dispatch loops, detached workers, push delivery — and every client that waits on
the results. Assumed context: a multi-repo TypeScript workspace (backend API, web and mobile
clients, worker(s)) where at least one pipeline **spends real money per step** on an
external vendor, so a lost step is a lost payment.

Not this standard's lane (cross-refs only):

- *Stored-state correctness* — atomic claims, fencing, idempotency keys, terminal guards:
  `data-integrity.md`. This standard says **when** you may retry or race; that one owns the
  mechanisms that make it safe.
- *Failure signals* — metric/alarm shape, correlation, the silent-degradation ban:
  `observability.md`. This standard says **which** events must emit a signal; that one owns
  what the signal looks like.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-07-28;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| Google SRE Book, *Site Reliability Engineering* | **1st edition**, Ch. 22 "Addressing Cascading Failures", subsection *Deadline propagation*. Unversioned free text; cite the chapter, never a page number. The *SRE Workbook* is a companion volume, not a revision of it |
| Azure Architecture Center, "Transient Fault Handling" | **Living page, unversioned** (page metadata `ms.date` 2026-02-26). Microsoft also ships a Well-Architected page, "Recommendations for handling transient faults" — a *different* document in the same lane, so name the one you mean |
| Azure Architecture Center, "Retry Storm antipattern" | **Living page, unversioned.** Filed under *antipatterns*, not *patterns* — a bare "retry storm" lookup lands on third-party prose instead |
| Azure Architecture Center, "Circuit Breaker Pattern" | **Living page, unversioned** (`ms.date` 2025-02-05) |
| AWS Well-Architected Framework, Reliability Pillar, **REL05-BP03** "Control and limit retry calls" | **Living document.** The `latest` path always serves the current revision while dated snapshots (e.g. framework 2022-03-31) stay published — a bare best-practice ID means whatever `latest` says today, so record the revision you checked |
| AWS Architecture Blog, "Exponential Backoff And Jitter" (M. Brooker, 2015) | **Unversioned blog post.** Published title capitalises *And* |
| Amazon Builders' Library, "Timeouts, retries, and backoff with jitter" | **Living article, unversioned.** The `aws.amazon.com/builders-library/…` path now **301-redirects** to `builder.aws.com` — the standing case for citing by title, never by URL |
| Node.js built-in `fetch` (undici) | **Deliberately unpinned.** Undici documents `headersTimeout` and `bodyTimeout` as **300 s each** — two independent clocks, not one. These are library policy, not a specification: pin your own deadline (§2.1) rather than inherit them |

## 1. Core principle — crash-safe is not blip-safe

Dependencies fail in two families, and teams reliably engineer for only one:

- **Process death** — your worker crashes; guarded by persisted resume state, atomic claims,
  idempotent finalization.
- **Transient dependency error** — a 5xx, a TCP reset, a truncated body, a hung socket. The
  process is fine; the *call* failed.

In one audited four-repo TypeScript workspace, a paid media-generation pipeline had genuinely
strong crash-safety — persisted poll URLs, atomic claims, idempotent finalize — yet a
**single transient upstream 5xx or TCP reset permanently failed a paid job**: every error
except one rate-limit status was classified terminal, and a failed job was never retried. At
background network-error rates that fires continuously. Verdict: **crash-safe, not blip-safe.**

Every rule below derives from one stance: assume every external call can **hang, blip, or
lie** — and decide *in advance*, in code, what each outcome means for the work in flight.
A failure interpreted ad hoc at the throw site defaults to the most destructive meaning.

## 2. Timeouts — every external call, explicit

### 2.1 No call without a deadline

Every call that leaves the process MUST carry an **explicit per-operation timeout** — never a
library default. Know the default before overriding it: defaults are often absent (many DB
and storage clients hang indefinitely) or absurdly long — e.g. Node's built-in `fetch`
(undici) documents a 300 s header timeout *and* a separate 300 s body timeout, two
independent clocks, so a stalling response hangs well past five minutes. In the audited
workspace that was **longer than the job lease**: one hung socket outlived the lease,
triggered a reclaim, and put two executors on the same paid job. A hung socket MUST surface as an error the caller classifies
(§3), never silently pin a worker, a lease, or a request handler. Size timeouts to the call's
shape — control/poll calls in seconds, streams longer — and record each in Appendix A.

### 2.2 Budgets propagate; they don't multiply

When a call chain crosses services, pass the remaining budget (or absolute deadline) down
rather than letting each hop invent its own — otherwise a doomed request burns a full timeout
at every layer (deadline propagation; Google SRE Book, "Addressing Cascading Failures").
Inner timeouts MUST be strictly shorter than the outer budget containing them: an inner
timeout that can't fire first is a dead letter, and the outer layer absorbs every failure.

## 3. Classification — transient vs terminal, decided explicitly

### 3.1 Enumerate the outcomes

For every external call, explicitly classify each outcome as **transient** (retry / keep
waiting) or **terminal** (fail the work), covering at minimum: client-side timeout, network
error (reset/DNS — often a *different error type* than a timeout; classify by meaning, not by
class), HTTP 429, HTTP 5xx, malformed response body, and genuine 4xx. A classifier that
special-cases only the failure seen in testing ("retry on 429, everything else throws") is
the exact defect behind §1's money bug. Genuine 4xx (bad request, auth, not-found) is
terminal — a rejected request re-rejects (Azure Architecture Center, "Transient Fault
Handling").

### 3.2 When work is paid, ambiguity defaults to transient

If the work in flight is paid or expensive, an **ambiguous** failure (unknown status, parse
failure, transport error) MUST be classified transient. First-error-is-terminal on a paid
pipeline is a money bug: terminal is irreversible and discards the spend; a wrong "transient"
merely waits out the budget (§3.3). The irreversible branch carries the burden of proof.

### 3.3 Bound tolerance by budget, not count alone

Transient-tolerance MUST be bounded by a **time budget** (e.g. "polling tolerates any number
of transient errors within a 10-minute window"), not only an error count. A count alone fails
both ways: too low abandons a flaky-but-recovering upstream; no budget polls a dead upstream
forever. Count-bounds are for *submissions* (§4.3); budgets are for *waiting*.

## 4. Retries — bounded, jittered, and only where safe

### 4.1 Bounded, with backoff and jitter

Every retry loop MUST have a hard attempt cap and MUST back off with **jitter** — full
jitter is the default choice (AWS Architecture Blog, "Exponential Backoff and Jitter";
Amazon Builders' Library, "Timeouts, Retries, and Backoff with Jitter"). Unjittered retries
re-spike the recovering dependency — the retry-storm antipattern (Azure Architecture
Center). Retry only *transient* outcomes; honour the dependency's `Retry-After` when sent
(AWS Well-Architected REL05-BP03, "Control and limit retry calls").

### 4.2 Only idempotent or deduplicated operations retry

A retry is a **duplicate request**. Retry only operations that are idempotent or explicitly
deduplicated — phase markers, resume tokens, idempotency keys are `data-integrity.md`'s lane.
The load-bearing consequence here: **persist the resume handle before you need it**. The
audited pipeline stores the vendor's poll URL the moment submission succeeds, so a crash or
reclaim resumes polling the *same* remote job instead of re-submitting (and re-billing) a
new one. A retry loop around a non-idempotent submit is a double-billing machine.

### 4.3 Submit and poll are asymmetric

The two halves of a submit-then-poll integration get **different** policies:

- **Submit** — short, count-bounded retry (e.g. 3 attempts, backoff+jitter) on transient
  outcomes only. Nothing is paid yet; failing fast is cheap and honest.
- **Poll** — generous, budget-bounded tolerance (§3.3). The money is already spent; a
  transiently failing poll tick MUST be treated as "still processing" and re-polled next
  tick. Only budget expiry or a *terminal* classification fails the work.

Inverting this maximizes lost spend and duplicate spend simultaneously.

### 4.4 Circuit breakers — only where retry isn't enough

A circuit breaker earns its complexity when many independent callers hammer one dependency
with long-lived failures and load must shed fleet-wide (Azure Architecture Center, "Circuit
Breaker"). A single-dispatcher pipeline whose waiting is already budget-bounded usually does
not need one — the budget *is* the breaker. Add one when many replicas' retries become
§4.1's storm, not by reflex.

## 5. Degradation ladders — planned worse outcomes beat unplanned failure

### 5.1 Every multi-step deliverable defines its ladder

For every deliverable of a multi-step pipeline, define the **explicit outcome ladder** —
best → degraded → last-resort → fail-closed — in one place, and route *every* finalization
path through it. The audited pipeline's ladder for a post-processed video: polished artifact
on owned storage → raw artifact on owned storage → archive the raw inline, right now → hand
out the vendor's ephemeral CDN URL → fail closed only when nothing exists. The property to
copy: **the user gets the best thing that actually exists**.

### 5.2 The ladder reads durable truth, never process signals

The rung MUST be chosen by inspecting **durable state** — does the artifact exist in
storage? — never by process signals (exit codes, callback payloads, in-memory flags). Process
signals lie by omission: the sweeper finalizing a lost worker has *no* exit code, a callback
can drop, a worker can die after uploading. Object existence survives all three (a storage
PUT is atomic — the object exists entirely or not at all). Exit codes are **logging-only**; a
finalizer branching on them completes work that produced nothing, or fails work that
produced everything.

### 5.3 Every rung below the best emits a signal

Each finalization landing below the best rung MUST emit a metric/event naming the rung
(shape and alarm policy: `observability.md`). A degraded rung is *designed* to be invisible
to the user — which is exactly why it is invisible to operators too. In the audited
workspace, a fleet-wide post-processing regression would have shipped degraded output
indefinitely, discoverable only by inspecting an artifact by hand.

## 6. Detached work is bounded twice

Work launched into a detached executor (container, lambda, spawned process) MUST be bounded
by **two independent clocks**:

1. **An internal self-watchdog** — the executor kills itself after a fixed wall-clock limit,
   even mid-step. It cannot rely on anyone noticing it hung.
2. **An external overdue sweeper** — the launcher's side finalizes work stuck past a
   deadline through the ladder (§5); it cannot rely on the completion signal arriving.

**The watchdog MUST be strictly shorter than the sweeper deadline** (e.g. 10-minute
self-kill vs 15-minute sweep). The ordering is load-bearing: the sweeper is an *arbiter* that
reads durable state (§5.2) and finalizes — the executor must be **provably dead before the
arbiter reads**. If it can outlive the sweep, the arbiter finds no artifact and finalizes
degraded — and the still-alive executor uploads the best artifact a minute later, into a
deliverable already handed out as degraded. Either clock alone fails: watchdog-only loses
work when the completion callback drops; sweeper-only lets a wedged executor burn compute
forever and race the arbiter.

## 7. Fire-and-forget must not propagate

A launcher for detached/background work MUST NOT throw. It returns success/failure as a
value, and the **caller owns the fallback inline** — on a failed launch, the caller finalizes
immediately through the same ladder (§5) every other path uses. This kills two failure modes:
a launch exception unwinding the caller and taking the *already-paid* primary work down with
it; and a failed launch parking the work in a state only the sweeper (§6) rescues minutes
later, when the caller could deliver a degraded outcome in milliseconds. "Fire-and-forget"
describes the *worker*; the *outcome* is never forgotten — some finalizer always owns it.

## 8. Racing finalizers converge on exactly one

Redundant completion signals are a resilience feature — the audited pipeline finalizes from a
completion callback, an overdue sweeper, and a dev-mode exit hook, so no single lost signal
strands work. But N racing finalizers MUST resolve to **exactly one executor of the ladder**:
finalization's first action is an atomic claim flip on the work's state; the winner proceeds,
every loser no-ops *silently and successfully* (claim mechanics: `data-integrity.md`).
Redundancy without convergence is double delivery or a worse-rung overwrite; convergence
without redundancy is a single point of signal loss. They compose only when losing is free.

## 9. Backpressure — saturation is a designed state

- **Cap dispatcher concurrency.** Every loop that pulls work and calls dependencies MUST
  have an explicit in-flight cap (e.g. 50). Uncapped concurrency converts a backlog into
  memory exhaustion and a self-inflicted retry storm against the dependency.
- **Saturation queues; it does not crash and does not shed silently.** At the cap, new work
  waits in the durable queue — arrival keeps succeeding, latency absorbs the burst.
- **Decouple idle cost from concurrency.** An idle dispatcher polls its queue once per tick
  regardless of the cap; N-workers-each-polling multiplies idle load by the cap for nothing.
- **Clients apply backpressure to themselves.** A polling client MUST poll at an interval
  compatible with the server's rate limits — in the audited workspace an admin UI polling a
  job every 1.5 s consumed two-thirds of a shared-IP rate budget alone, starving every
  sibling operation, with the resulting 429s silently swallowed (§3.1 applies to clients
  too).

## 10. Delivery — no critical state rides one channel

- **At least two independent channels** for any state change the user must eventually see: a
  push/event channel for latency plus **poll-based reconciliation** for truth. Push is
  best-effort by construction (tokens expire, devices sleep, messages drop); polling is
  slow but true. Either alone is a standing incident.
- **Reconcile on foreground and reconnect.** The client MUST refetch authoritative state
  when it regains focus or connectivity — exactly the moments the event channel was most
  likely dark.
- **A missed event is never fatal.** No client state machine may *require* witnessing a
  transition. In the audited workspace, a client cleared its auth token on 401 but keyed
  every screen off a cached user object it never revalidated — a zombie session: signed-in
  UI, every request failing, no route out short of force-quitting. Any cached critical state
  needs a revalidation trigger.

## 11. Gates fail open or closed by decision

Every availability gate — feature-flag fetch, remote config, version gate, kill switch —
MUST have a **documented failure direction**: what happens when the gate itself cannot be
evaluated (fetch fails, value unparseable). The direction is a product decision, stated in
code and in Appendix A, with the why. A force-update gate that fails open keeps a config
outage from locking out every user; the same gate names its one deliberate fail-closed
exception — in the audited workspace, an unreadable *local* binary version gates the app,
because "cannot determine what we're running" is not a config outage. An undecided direction
is decided by whichever exception path runs first.

## 12. Graceful shutdown — deploys are dependency failures too

A deploy, scale-in, or instance replacement is a scheduled failure of *you* as a dependency.
In-flight work MUST either complete within the shutdown grace window or be **reclaimable**:
resumable from persisted state by a surviving instance (lease mechanics:
`data-integrity.md`). Corollaries: the lease interval stays shorter than the orchestrator's
kill timeout; per-call timeouts (§2.1) stay shorter than the lease (or a live executor's
lease expires under it); shutdown stops *claiming* before it stops *finishing*.

## 13. Absorbing and shedding are different designs — and shedding is loud

Saturation (§9) reaches the cap in one of two shapes, and each carries its own obligation:

- **A durable queue absorbs.** Arrival keeps succeeding and latency takes the burst — so the
  bound that matters is **age, not depth**: the oldest unclaimed item's age MUST be bounded and
  **alarmed**, because a queue that absorbs forever is indistinguishable from a stopped consumer
  until the deadline the work was feeding has already passed (metric shape: `observability.md`
  §3.1). Depth alone hides a slow drain behind a healthy-looking number.
- **A synchronous path sheds.** Past the cap it MUST reject **explicitly** — a rejection status
  the caller can classify as transient (§3.1) plus a retry hint (e.g. `Retry-After`) — never by
  hanging until someone's timeout fires, dropping quietly, or returning an empty success. And it
  MUST emit **accepted, queued and shed counts**: silent shedding is indistinguishable from
  success at every layer above it, so the incident is found in missing output rather than in a
  metric, and the client's own retry policy never engages because nothing told it to.

Which surface does which is a design decision, recorded in Appendix A beside its cap.

## 14. Readiness and liveness answer different questions; shutdown drains before it exits

- **Readiness answers "route traffic to me?"; liveness answers "am I worth restarting?"** A
  readiness probe reporting ready before this instance's dependencies are reachable — pool not yet
  connected, required config not yet fetched, migrations not yet applied — routes real traffic into
  an instance that can only fail, and a rolling deploy will happily replace every working instance
  with one. Readiness therefore checks what *this* instance needs to serve one request. Liveness
  stays shallow and local: a liveness probe wired to a shared dependency restarts the whole fleet
  the moment that dependency blips, converting a partial outage into a total one.
- **Shutdown order is: stop accepting, drain, exit.** Fail readiness first so the load balancer
  stops sending work, then let in-flight requests and already-claimed work finish inside the grace
  window, then exit. An instance that exits on SIGTERM drops whatever it was mid-way through —
  for queue work that is §12's reclaim obligation; for a request in flight there is no reclaim, so
  the drain window *is* the control. Probe endpoint shape: `api-contracts-and-codegen.md` §10.

---

## Failure shapes

Named patterns from real audits, genericised — recognise them in review, cite them by name.

- **The blip that burned the money.** One transient 5xx/TCP-reset terminally fails a paid
  job — one status classified transient, failure never retried. Fires continuously. (§1, §3)
- **The default that outlived the lease.** No explicit timeout; the library default exceeds
  the job lease — one hung socket triggers reclaim, two executors on one paid job. (§2.1, §12)
- **The poison job on a billing loop.** Attempts counted but never read: a crashing job is
  reclaimed and re-billed every lease cycle. Bound attempts *in the claim filter*. (§4.1)
- **The exit code that lied.** A finalizer branches on the reported exit code — but the
  sweeper path has none, callbacks drop, workers die post-upload. Read storage. (§5.2)
- **The perfectly silent downgrade.** Every rung works, no rung reports; a fleet-wide
  regression ships degraded output until a human inspects one artifact. (§5.3)
- **The self-inflicted retry storm.** A client polls fast enough to exhaust a shared rate
  budget, then swallows the 429s — starving siblings, hiding the evidence. (§4.1, §9)
- **The zombie session.** A client clears credentials on an auth failure but never
  revalidates the cached state its UI keys off — the missed transition is fatal. (§10)

## Checklist

Before merging code that touches an external dependency or a pipeline step:

- [ ] Every external call has an explicit timeout — and you know the default you overrode.
- [ ] Inner timeouts are strictly shorter than the outer budget/lease containing them.
- [ ] Every outcome (timeout, network error, 429, 5xx, malformed body, 4xx) is explicitly
      classified — ambiguity on paid work defaults to transient.
- [ ] Waiting is budget-bounded; submission retries are count-bounded with backoff+jitter.
- [ ] Everything retried is idempotent or deduplicated; the resume handle is persisted
      before the crash that needs it (`data-integrity.md`).
- [ ] The ladder lives in one shared finalizer, decided from durable state; exit codes and
      callbacks are logging-only.
- [ ] Every non-best rung emits a named signal (`observability.md`).
- [ ] Detached work: self-watchdog + external sweeper, watchdog strictly shorter; the
      launcher returns failure instead of throwing.
- [ ] N possible finalizers, exactly one winner, losers no-op via atomic claim.
- [ ] Concurrency is capped; saturation queues; idle polling is decoupled from the cap;
      client poll intervals fit the server's rate budget.
- [ ] A saturating path in the diff either absorbs into a durable queue with an alarmed
      oldest-item age, or sheds with an explicit status + retry hint and emits
      accepted/queued/shed counts — never silently.
- [ ] Readiness reflects this instance's own dependencies, liveness stays shallow, and
      shutdown fails readiness before draining in-flight work.
- [ ] Critical client state has two delivery channels and refetches on foreground.
- [ ] Every gate's failure direction is stated with its why — including the exception.

## Guard rails

CI checks that make this enforceable rather than aspirational:

- **[resilience.GR1]** **Lint external calls for missing timeout/abort options** — flag any vendor-client or
  `fetch`-family call site without an explicit deadline signal.
- **[resilience.GR2]** **Unit-test the classifier with a failure matrix** — feed timeout, reset, 429, 5xx,
  truncated body, and 4xx through the call wrapper; assert each lands transient/terminal as
  the profile documents. This is the test that catches §1's money bug before production.
- **[resilience.GR3]** **Test the ladder rung-by-rung** — mock durable storage to present each combination (best,
  raw only, nothing + recoverable URL, nothing) and assert the outcome, including with the
  process-signal inputs absent (`exitCode: null`).
- **[resilience.GR4]** **Assert the clock ordering in code, not prose** — a boot- or test-time assertion that
  watchdog < sweeper deadline and per-call timeout < lease, so a config edit can't invert
  §6/§12 silently.
- **[resilience.GR5]** **Race the finalizers in tests** — fire callback + sweeper concurrently against an
  in-memory store; assert exactly one completion and no rung downgrade.
- **[resilience.GR6]** **Grep for swallowed catches on external calls** — an empty or log-less `catch` around a
  dependency call is an unclassified outcome (§3.1) until proven otherwise.

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into `profiles/resilience-profile.md` and fill them there.
> Agents: read the profile before touching any external call site — §2–§6 are not
> reviewable without the project's actual budgets and directions.

**External dependencies — one row per distinct call:**

| Call (dep + op) | Timeout | Retry policy | Transient classification | Ladder (if any) | Watchdog / sweeper |
| --- | --- | --- | --- | --- | --- |
| _e.g. vendor submit_ | _30 s_ | _3×, backoff+jitter_ | _timeout/net/429/5xx transient; 4xx terminal_ | _n/a_ | _n/a_ |
| _e.g. detached worker_ | — | — | — | _best → degraded → last-resort → fail-closed_ | _self-kill N min < sweep M min_ |

**Availability gates and their failure directions:**

| Gate | Fails | Why | Named exception |
| --- | --- | --- | --- |
| _e.g. force-update version gate_ | _open_ | _config outage must not lock out users_ | _unreadable local version → closed_ |

**Critical-state delivery channels:**

| State change | Fast channel | Reconciliation channel | Refetch triggers |
| --- | --- | --- | --- |

**Backpressure limits:**

| Loop / client / surface | Concurrency cap | Saturation behaviour (absorb / shed — §13) | Oldest-item age alarm or rejection status + retry hint | Idle poll rate |
| --- | --- | --- | --- | --- |
