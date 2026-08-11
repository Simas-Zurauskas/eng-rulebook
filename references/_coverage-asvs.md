# ASVS 5.0 coverage delta — what the library actually states a rule for

> Library machinery, not a standard. The `_` prefix keeps it out of the standards set and out
> of the four tables (`meta/check-tables.sh` excludes `_*.md`).

`security.md` §1 declares **OWASP ASVS 5.0 Level 2** as the default assurance target. That
declaration is only checkable if somebody has written down which chapters the library states a
rule for and which it does not. This file is that record.

## Method, and its limits

- **Chapter-level mapping by reading.** Every ASVS 5.0 chapter (V1–V17) was read against the
  library's rules and mapped to the rules that state its substance. It is **not** a
  requirement-by-requirement audit: no `V<n>.<m>.<k>` was individually adjudicated, and the
  library deliberately does not pin requirement ids (`security.md` §0 anchors table — they
  renumber between revisions).
- **A chapter-level verdict is a weak signal in one specific direction.** One rule touching a
  chapter makes it `partial`, so `partial` spans everything from "one requirement short" to
  "one requirement covered". The **Verdict cell names what is missing** — that text, not the
  word `partial`, is the finding.
- **Snapshot dated 2026-07-28**, against ASVS **5.0.0** chapter titles as published in the
  OWASP ASVS repository at tag `v5.0.0_release`. **This is a snapshot, and a snapshot of a moving library goes stale fastest against its own
side.** Re-read every cited rulebook end to end before re-verdicting — this file was first drafted
mid-batch and understated coverage on V5, because a rule closing it landed in the same batch.
Re-run this mapping when either side moves: a new ASVS
  revision, or a library release that adds a lane.
- **This file grants nothing.** A `covered` verdict says a rule exists, not that a product
  satisfies it. Conformance is verified against the code by an audit, per chosen level.
- **Verdicts:** `covered` (a rule states the chapter's substance) · `partial` (some of it;
  the gap is named) · `not covered` (no rule — a candidate library-gap) · `out of scope`
  (deliberately excluded, with the reason).

## Coverage

| Chapter | Covered by | Verdict |
| --- | --- | --- |
| **V1 Encoding and Sanitization** | `security.md` §5.1, §7; `web-client.md` §5.1, §5.2, §5.3; `ai-features.md` §4.3 | **partial** — encoding, injection prevention and sanitiser quality are stated. **Missing: safe deserialization** — no rule anywhere on deserializing attacker-influenced serialized data. Unmanaged-memory requirements are inapplicable to the assumed managed-TypeScript stack (`security.md` §0) |
| **V2 Validation and Business Logic** | `security.md` §5.1, §5.2, §8; `type-safety.md` §5; `data-integrity.md` §7, §9; `ai-features.md` §6.1 | **covered** — boundary parsing, per-field caps, business-logic state guards, quota/anti-automation budgets |
| **V3 Web Frontend Security** | `web-client.md` §5, §6, §7, §2.1; `security.md` §2.7, §7 | **covered** — this chapter is a whole lane's subject |
| **V4 API and Web Service** | `api-contracts-and-codegen.md` §8, §9, §11; `security.md` §5.1, §8 | **partial** — HTTP semantics, mount topology and closed request bodies are stated. **Missing: HTTP message-structure validation** (request smuggling, header injection), **GraphQL**, and **WebSocket** — no rule in any lane names them |
| **V5 File Handling** | `security.md` §5.2, §5.3, §5.6, §9 | **partial** — type allowlisting, magic-byte verification, per-route size caps, private-by-default storage, and canonicalise-then-bounds-check on any caller-influenced path segment (§5.6). **Missing: stored-file execution prevention; download-side filename validation and malware scanning** |
| **V6 Authentication** | `security.md` §2.5, §2.6, §3, §8; `testing.md` §5.2 | **partial** — password storage, password policy, the declared length floor, breached-password screening, provider verification and credential rate limits are stated. **Missing: multi-factor authentication entirely** (no rule on MFA enrolment, verification or recovery), **and out-of-band / cryptographic authenticator mechanisms**. ASVS 5.0 gives MFA its own chapter section; which of its requirements bind at L2 was **not** adjudicated here — check that before sizing the delta |
| **V7 Session Management** | `security.md` §2.1, §2.2, §2.3, §2.4, §2.6; `web-client.md` §2, §3; `mobile-app.md` §2 | **covered** — and `security.md` §2.3 is deliberately stricter than the chapter |
| **V8 Authorization** | `security.md` §2.5, §4, §9; `web-client.md` §4.1; `ai-features.md` §3.2; `testing.md` §5.2 | **partial** — router-level gates, server-side enforcement, owner-scoped queries and the client-guards-are-UX rule are stated. **Missing: field-level authorization** (which properties a role may read/write) **and multi-tenant isolation** as a stated obligation |
| **V9 Self-contained Tokens** | `security.md` §2.2, §2.5; `web-client.md` §2.2 | **covered** — algorithm allowlist, issuer/audience checks, server-checked version claim, nothing security-relevant derived client-side |
| **V10 OAuth and OIDC** | `security.md` §2.4, §2.5 | **partial** — the library covers the **client and resource-server** posture (rotation and reuse detection per RFC 9700, `email_verified` gating, audience/issuer allowlists). **Missing: the authorization-server and OpenID-provider side** — redirect-URI validation, authorization-code lifecycle, client authentication — **and consent management**. Applies only to products that *issue* rather than consume; see the candidate note below |
| **V11 Cryptography** | `security.md` §2.5, §6 | **partial** — password KDF choice and parameters, keyed-HMAC storage of tokens, ≥256-bit one-shot token randomness, and secret blast-radius/rotation coupling are stated. **Missing: a cryptographic inventory with algorithm agility; encryption-algorithm and mode obligations (authenticated encryption, nonce handling); public-key algorithm choice; key lifecycle beyond "rotate on leak"** |
| **V12 Secure Communication** | `security.md` §7 | **partial** — TLS everywhere and the cookie/header set are stated. **Missing: TLS configuration substance** (minimum versions, cipher suites, certificate validation) **and service-to-service encryption** for internal hops — database, cache, queue, sibling API |
| **V13 Configuration** | `config-and-environment.md` §2, §3, §4, §5, §6; `security.md` §3, §4, §6; `supply-chain-and-build-integrity.md` §4.1; `tooling-and-workspace.md` §8 | **covered** — fail-closed boot, no unsafe defaults, closed environment set, no committed secrets, scoped per-service credentials, debug/introspection surfaces gated, spec surfaces off in production |
| **V14 Data Protection** | `data-protection.md` §2, §3, §4, §5, §6; `security.md` §7, §12; `web-client.md` §2.1; `observability.md` §6.1 | **covered** — classification, retention, deletion/export, egress, minimisation, and the browser-storage rules |
| **V15 Secure Coding and Architecture** | `type-safety.md` §2, §3, §4, §5; `data-integrity.md` §2, §3, §5, §6; `supply-chain-and-build-integrity.md` §2, §5; `security.md` §10; `api-contracts-and-codegen.md` §11 | **partial** — type confusion, mass assignment, dependency admission and provenance, and the concurrency/TOCTOU family are stated. **Missing: prototype pollution and HTTP parameter pollution** as named obligations, **and sandboxing/isolation of components with dangerous functionality** |
| **V16 Security Logging and Error Handling** | `security.md` §11; `observability.md` §2, §3, §4, §5, §6 | **partial** — the MUST-log security-event set, structure, correlation, level discipline, masking and alarm binding are stated, as is envelope-shaped error handling (`api-contracts-and-codegen.md` §8). **Missing: log protection** — tamper-resistance, access control on logs, and shipping to an isolated system |
| **V17 WebRTC** | — | **out of scope** — governs TURN, media and signalling servers, a platform outside the assumed shape stated in `security.md` §0 (backend API, web client, mobile app, workers). A product shipping WebRTC adopts the chapter directly; restating it here would be a lane the library does not audit |

**Tally:** 6 covered · 10 partial · 0 not covered · 1 out of scope.

Zero `not covered` is a property of chapter-level granularity, not a clean bill of health: every
ASVS chapter is broad enough that some rule touches it. **The real deltas are the bolded
"Missing" clauses above**, and they are what the candidate list below is drawn from.

## Candidates for the gap backlog — NOT filed

These are the deltas a human should run through the intake bar in `_gaps.md` (all four
conditions, especially #2 — *check the sibling lane first*, several of these may already be
answered by a rule this reading missed). **Nothing here is an accepted gap.** Filing is a human
decision; this list is evidence for it, produced by one pass of chapter-level reading.

> **Adjudicated 2026-08-11** — every candidate below was run through the intake bar and now has
> a row in `_gaps.md` § Rows: C1–C6, C8 and the smuggling half of C7 **accepted** (C7a); the
> GraphQL/WebSocket half of C7 (C7b), the sandboxing half of C9 (C9b), and C10 **rejected**
> with reasoning; C9's prototype-pollution half accepted (C9a). The rows there are now the
> authority on status; this table stays as the reading evidence behind them.

| # | Delta | ASVS chapter | Suggested lane | Note for the intake bar |
| --- | --- | --- | --- | --- |
| C1 | No rule on multi-factor authentication — enrolment, verification, recovery, or when it is required | V6 Authentication | `security.md` | The largest L2 delta. Bar #3 (generalises) is clearly met; bar #4 (code-shaped) needs care — "require MFA for admins" is a product decision, but "recovery codes are single-use and hashed" is code-shaped |
| C2 | No rule on safe deserialization of attacker-influenced serialized data | V1 Encoding and Sanitization | `security.md` or `type-safety.md` | Check `type-safety.md` §5 first — parse-don't-assert may already state the property for the JSON case; the delta is non-JSON formats |
| C3 | No TLS configuration substance (minimum version, cipher suites, certificate validation) and no service-to-service encryption rule | V12 Secure Communication | `security.md` | Bar #4: much of this is platform configuration rather than code. May be profile-shaped rather than rule-shaped |
| C4 | No field-level authorization or multi-tenant isolation rule | V8 Authorization | `security.md` | Owner-scoping is stated; *which properties a role may read or write* is not. Adjacent to `api-contracts-and-codegen.md` §11, which covers only the write surface's contract |
| C5 | No cryptographic inventory / algorithm-agility rule, and no encryption-mode obligations | V11 Cryptography | `security.md` | Related to `supply-chain-and-build-integrity.md` §5.1's SBOM-as-generated-output shape — an inventory nobody generates is a document that rots |
| C6 | No rule on log protection: tamper-resistance, access control, isolated transmission | V16 Security Logging and Error Handling | `observability.md` | `security.md` §11 defines *what* to log and points at `observability.md` for mechanics; neither states protection of the log store |
| C7 | No rule on HTTP message-structure validation (request smuggling, header injection), GraphQL, or WebSocket surfaces | V4 API and Web Service | `api-contracts-and-codegen.md` | Three separate candidates, not one. GraphQL and WebSocket may fail bar #3 for the assumed shape; smuggling/header-injection does not |
| C8 | No rule on stored-file execution prevention or download-side scanning | V5 File Handling | `security.md` | §5.3 covers the accept side, §5.6 the path, §9 storage posture. The remaining delta is the **serve** path only |
| C9 | No rule on prototype pollution, HTTP parameter pollution, or sandboxing dangerous components | V15 Secure Coding and Architecture | `type-safety.md` / `supply-chain-and-build-integrity.md` | Prototype pollution is stack-specific enough to risk bar #3; state it as a labelled example under a generic rule if adopted |
| C10 | No rule on the OAuth authorization-server / OpenID-provider side, or on consent management | V10 OAuth and OIDC | `security.md` | Likely fails bar #3 for the assumed shape — the library assumes a product that *consumes* an identity provider. Record the rejection reasoning rather than leaving it open |
