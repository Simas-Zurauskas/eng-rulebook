# Library gaps — the inbound backlog

> Where a `library-gap` goes so it stops dying in a report folder.

A **library-gap** is a real defect that **no rule in this library covers**. The audit emits them
(`audit.md` § Finding format), build-time mode emits them when a Checklist box cannot be decided
from a diff (`SKILL.md` § After writing), and any reviewer can raise one.

The problem this file solves: every other destination for a gap is **downstream**. An audit
report lands in `<home>/audits/<date>/` inside the *adopting workspace*, next to that
workspace's **copy** of the library. Nothing carries it back to the master, so the same gap is
rediscovered in the next workspace, and the next — which is precisely the drift the library
exists to prevent, running in the one direction nobody instrumented.

**The master is the upstream.** A gap recorded only in a workspace is a gap the library never
learns. Raise it here (`/eng-rulebook contribute`), against the master.

**Two upstream sources feed this file.** An **audit** emits `library-gaps.md` in its report
(`audit.md` § Finding format) — transcribe those rows here. And a delivery process's post-release
retrospective produces the other kind: *"a review would have caught this only if a rule had said
so, and no rule does."* Both are the same object; both reach the master only when someone raises
them here.

## The intake bar

A gap enters this backlog when **all four** hold. Anything less is a note, not a gap — and a
backlog that accepts notes stops being read.

1. **The defect is real and evidenced** — a concrete failure scenario, or an audit finding with
   `path:line`. "Would be nice to standardise X" is not a gap.
2. **No existing rule covers it.** Say which lane you checked and what the nearest rule was.
   Most candidate gaps die here: the rule exists in a sibling lane the reporter did not read.
3. **It generalises.** The rule would be worth stating for projects other than the one that
   found it. A project-specific decision belongs in that project's profile, not here.
4. **It is code-shaped.** If the obligation is about a person's workflow rather than a property
   of the code, it belongs to the delivery process, not to a standard (`README.md` § The
   delivery seam).

## Rows

Add newest first. Keep a resolved row for one release cycle so a re-report is recognisable, then
move it to the CHANGELOG entry that closed it.

| # | Raised | Gap | Evidence | Lane checked / nearest rule | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | 2026-08-11 | No rule on multi-factor authentication: enrolment, verification (code windows, attempt limits), or recovery (single-use, hashed recovery codes) | Credential stuffing with a breached password succeeds outright — nothing asks for a second factor, and a recovery-code table stored in plaintext turns one DB read into full takeover. ASVS 5.0 V6 delta, named "the largest L2 delta" in `_coverage-asvs.md` | `security.md` §2, §3 — password storage/policy and provider verification are stated; the only MFA mentions in the library are `supply-chain-and-build-integrity.md` §2.4's npm-account rule and a password-length caveat in `security.md` §3 | **accepted → `security.md`** — code-shaped subset only (recovery codes single-use + hashed, verification windows, MFA-attempt rate limits under §8's budgets); *when* MFA is required stays a profile decision. NOTE: the lane is at the 450-line cap — a lane split (e.g. an authn extraction) must precede authoring |
| C2 | 2026-08-11 | No rule on safe deserialization of attacker-influenced serialized data in non-JSON formats (YAML, XML, binary codecs) | A YAML config upload parsed with a full-featured loader instantiates arbitrary tags; XML external entities read server files. JSON is covered by parse-don't-assert; nothing constrains the other formats | `type-safety.md` §5 — parse-don't-assert states the JSON/schema case; no sibling rule touches non-JSON loaders | **accepted → `security.md`** — narrowed to non-JSON formats: safe-mode loaders, entity resolution off, allowlisted types |
| C3 | 2026-08-11 | No TLS configuration substance (minimum version, cipher policy, certificate validation) and no service-to-service encryption rule for internal hops (DB, cache, queue) | A service pinned to TLS 1.0 or with certificate verification disabled (`rejectUnauthorized: false` and its cousins) passes every current rule — `security.md` §7 says "TLS everywhere" but nothing says *what counts as TLS done right*; an internal cache hop in plaintext crosses a network boundary invisibly | `security.md` §7 — transport is stated as presence, not substance | **accepted → `security.md`** — bar #4 tension recorded: minimum-version and cipher policy are largely platform facts, so the rule states the code-visible half (no verification-disabling flags, internal hops declared in the profile with an encrypted yes/no per hop) and Appendix A carries the platform half |
| C4 | 2026-08-11 | No field-level authorization rule (which properties a role may read or write) and no multi-tenant isolation obligation | An owner-scoped query returns the caller's own record, but the serializer ships `role`, `internalNotes`, and billing fields to every authenticated caller; a mass-assignment-safe write still lets a support role set `isAdmin`. Tenancy: one missing `tenantId` filter reads across customers | `security.md` §4 (owner-scoped queries), §9; `api-contracts-and-codegen.md` §11 covers the *documented* write surface, not per-role property authority | **accepted → `security.md`** — per-role read/write property sets as a declarable contract; tenant scoping as a stated obligation where the profile declares multi-tenancy |
| C5 | 2026-08-11 | No cryptographic-inventory / algorithm-agility rule and no encryption-mode obligations (authenticated encryption, nonce handling) | A hand-rolled `crypto.createCipheriv('aes-256-cbc', …)` with a reused IV and no MAC ships today without violating any stated rule; when an algorithm must be retired nobody can list where it is used | `security.md` §6 — KDF choice, token HMAC, randomness floor and rotation are stated; nothing owns cipher/mode choice or an inventory | **accepted → `security.md`** — authenticated encryption (AEAD) as the default rule, nonce/IV uniqueness, and a generated crypto inventory in the shape of `supply-chain-and-build-integrity.md` §5.1's SBOM (generated output, never a hand-kept doc) |
| C6 | 2026-08-11 | No rule on log protection: tamper-resistance, access control on the log store, shipping to an isolated system | An attacker with app-host access edits or truncates the very security-event log (`security.md` §11's MUST-log set) that would evidence the intrusion; logs holding session ids readable by every engineer are an unnoticed data exposure | `observability.md` §2–§6 — structure, correlation, levels, masking and alarms are stated; `security.md` §11 defines *what* to log; neither protects the store | **accepted → `observability.md`** — ship security-event logs off-host append-only; log-store access is itself an authorized, logged surface |
| C7a | 2026-08-11 | No rule on HTTP message-structure validation: request smuggling and header injection | A front proxy and the app server disagree on `Transfer-Encoding` vs `Content-Length` parsing; one smuggled request poisons the connection for the next caller, bypassing router-level auth (`security.md` §2.5). CRLF in a header value forges log lines and response headers | `api-contracts-and-codegen.md` §8, §9 — envelope and mount topology are stated; `security.md` §5.1 validates bodies, not message structure | **accepted → `api-contracts-and-codegen.md`** — normalize/reject ambiguous framing at the edge, single parser authority, no unvalidated caller input into response headers |
| C7b | 2026-08-11 | No GraphQL or WebSocket rules | — | ASVS 5.0 V4 names them; the library's assumed shape (`security.md` §0: backend API, web client, mobile app, workers over REST/spec-codegen) ships neither surface | **rejected, because** bar #3 fails for the assumed shape — same reasoning as ASVS V17 WebRTC (`_coverage-asvs.md`): a product adding GraphQL/WS adopts the ASVS chapter directly; a lane here would be rules nobody using the library exercises. Re-open if the assumed shape ever grows either surface |
| C8 | 2026-08-11 | No rule on the stored-file **serve** path: execution prevention and download-side handling | An uploaded `.svg` (passes magic-byte checks — it is a valid image) is served inline from the app origin and executes script in every viewer's session; an uploaded HTML file served without `Content-Disposition: attachment` becomes a phishing page on the product's domain | `security.md` §5.2, §5.3, §5.6, §9 — the *accept* path (type allowlist, magic bytes, size caps, path canonicalisation, private-by-default storage) is fully stated; nothing governs serving | **accepted → `security.md`** — serve user content from a non-executing origin or force `attachment` + `nosniff`; stored files never served as active content from the app origin |
| C9a | 2026-08-11 | No rule naming prototype pollution as an input-validation obligation | A deep-merge of caller JSON containing `__proto__.isAdmin` flips a property on every object in the process — request validation passes because the payload is schema-valid at the top level | `type-safety.md` §5 — parse-don't-assert constrains *shape*, but schema-valid input can still carry polluting keys into merge/assign sinks | **accepted → `type-safety.md`** — stated generically (reject/strip prototype-mutating keys at trust boundaries; merge with null-prototype targets), prototype pollution as the labelled JS example per bar #3's stack-genericity note |
| C9b | 2026-08-11 | No rule on sandboxing/isolating components with dangerous functionality | — | `ai-features.md` §3 already owns tool blast-radius for the agent case; beyond it, isolation is deployment architecture | **rejected, because** bar #4 fails: process/container isolation is a deployment posture, not a diff-decidable code property — a checklist box could not be answered from a diff (`_authoring.md` rule 12). The agent-tool case, which *is* code-shaped, is already covered. Re-open with a concrete code-shaped obligation if one emerges |
| C10 | 2026-08-11 | No rules for the OAuth authorization-server / OpenID-provider side (redirect-URI validation, code lifecycle, client authentication) or consent management | — | `security.md` §2.4, §2.5 — the client/resource-server posture is fully stated (rotation, reuse detection per RFC 9700, audience/issuer allowlists) | **rejected, because** bar #3 fails: the library's assumed shape *consumes* an identity provider and does not issue; AS-side rules would be dead weight in every adopting workspace. Recorded so it is not re-litigated — a workspace that builds an IdP adopts ASVS V10 and RFC 9700's AS sections directly |

**Status values:** `open` · `accepted → <target lane>` · `rejected, because…` · `closed in vN`.
A `rejected` row keeps its reasoning and is never deleted — the same gap will be raised again,
and the reasoning is what stops it being re-litigated from scratch.

## Cadence

Review this file when cutting a `VERSION`. A gap that has been `open` across two releases is
itself a finding: either the bar rejected it and nobody wrote that down, or the library is
declining to cover something real. Say which.
