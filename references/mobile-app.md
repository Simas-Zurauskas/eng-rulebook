# Mobile App Standard

> **Type:** Generic, reusable standard · **Version:** 1.0 (2026-07-17)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the engineering-standards library, bundled in the `standards` skill (references/).
> Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs what is unique about the mobile client: a distributed node you do not control,
> running a binary you cannot hot-fix, on a platform that suspends it without warning.
> Core idea: **the app is an unattended replica of server truth — every local state
> (session, cache, version, permission) must have a story for being wrong, because it will be.**

## 0. Scope

Applies to the mobile app in the assumed workspace shape (backend API, web client(s), mobile
app, worker(s)). Rules are stack-agnostic; React Native / Expo appear as labelled examples.

**Owns:** client-side session lifecycle, push-token lifecycle, backgrounding/offline behaviour,
binary-vs-OTA version discipline, store and native build configuration, permission-gated
features, deep-link handling on the client.
**Does not own** (one-line cross-refs only):

- Server-side session design, token storage rules, revocation levers → `security.md` §2, §7.
- Delivery redundancy (push + poll reconciliation) and gate failure directions → `resilience.md` §10–§11.
- Generated native directories, lockfiles, CI parity → `tooling-and-workspace.md` §6–§7.
- Generated API types and codegen workflow → `api-contracts-and-codegen.md`.

## 1. Core principle

A backend deploy replaces every running instance in minutes. A mobile release reaches its
users over weeks, through a store review, onto devices that may stay offline, backgrounded,
or on the old binary indefinitely. Three consequences drive every rule here:

1. **Server truth wins, always.** Any locally cached fact — the signed-in user, a list, a
   feature gate — is a stale replica the moment it is read. The app must re-validate at the
   moments staleness matters (foreground, reconnect, credential rejection) and must never
   render privileged state the server has refused.
2. **There are two versions of the app, not one.** The native binary (store-released,
   weeks-old tail) and the JS bundle (OTA-updatable, hours-old) evolve separately. Every
   version-keyed decision must name which of the two it keys off — choosing wrong ships a
   gate that lies.
3. **The lifecycle is hostile.** The OS suspends, kills, and revokes at will; the user
   denies permissions and force-quits. Every flow must be resumable from any interruption
   point, and every capability must treat "denied" as a first-class state, not an error.

## 2. Client session lifecycle — no zombie sessions

Server-side design is `security.md` §2; this section owns what the *app* does.

- **A rejected credential tears down the session state machine.** On an authoritative 401,
  the interceptor MUST invalidate the cached user/session state that route guards key off —
  not merely clear the token. In one audited workspace the interceptor cleared the token
  while layouts kept rendering the cached user: after a server-side eviction the app was a
  zombie — signed-in UI, every request failing tokenlessly, **no route back to sign-in
  without force-quitting**. The comment said a layout would redirect; nothing re-validated
  the cache it watched.
- **Only an authoritative rejection ends the session.** A 401 from the real API ends it; a
  network blip, timeout, or 5xx does not (classification: `resilience.md` §3). Tearing down
  on a blip discards a valid session over nothing.
- **Re-validate on the staleness moments:** app foreground and network reconnect trigger a
  session/user refetch (e.g. wiring the query layer's focus manager to the app-state API —
  the audited gap was precisely that this wiring was absent).
- Bearer tokens live in the OS keystore only (`security.md` §7); sign-out deletes local
  state *after* the server call is sent, and local teardown proceeds even if that call fails.

## 3. Push-token lifecycle

Delivery redundancy (push is never the only channel) is `resilience.md` §10. This section
owns the token itself:

- **Register on permission grant, re-assert on every launch.** Platform tokens rotate
  (reinstall, OS restore, provider migration); the server upsert MUST be keyed on the token
  value so a rotated token re-homes to the current account rather than duplicating.
- **The server prunes dead tokens from delivery receipts.** Providers report
  dead/unregistered tokens on send; ignoring receipts grows a token graveyard that wastes
  send quota and skews delivery metrics. Prune on the provider's dead-token signal.
- **Sign-out and account deletion delete the device's push token** — a push for account A
  arriving on a device now signed into account B is a data leak (deletion completeness:
  `security.md` §12).
- **The push payload is a cross-repo contract** — the server composes it, the app's handler
  destructures it. Pin it like any hand-mirrored contract (`testing.md` §5.6): a renamed
  field silently kills deep-link-on-tap while both sides stay green.
- Foreground pushes do not interrupt; they raise in-app UI. Background pushes deep-link on
  tap into a screen that can load its own data — never one that assumes warmed caches (§6).

## 4. Two versions, one app — binary vs OTA discipline

- **Name the version every decision keys off.** The binary version changes only via store
  release; the JS/OTA version changes on every push. A force-update gate MUST compare the
  **binary** version — an OTA update cannot satisfy a raised store minimum, so keying the
  gate off the JS version strands users in an un-satisfiable loop. The audited workspace
  got this right and documented it; it survives here as the rule.
- **Availability gates fail open, with the fail-closed exception named** (`resilience.md`
  §11): an unreachable config service must not lock every user out; an unreadable *local*
  version — which should be impossible — may deliberately gate, as the one named exception.
- **OTA updates ship only JS.** Any change touching native modules, permissions, entitlements,
  or SDK versions requires a binary release — an OTA that assumes a native module the
  installed binary lacks crashes at startup for exactly the users who update most eagerly.
  Gate OTA pushes on a native-compatibility check (e.g. the runtime-version mechanism).
- **The store-release tail is a support matrix.** The API serves every binary version still
  in the field, not just the latest (evolution rules: `api-contracts-and-codegen.md` §7);
  the force-update minimum is the only tool that shortens the tail, and it burns user
  goodwill — raise it deliberately, never routinely.

## 5. Native build configuration is code

`tooling-and-workspace.md` §6 owns generated directories; this section owns what must be
*committed* so a fresh native build succeeds:

- **Every native-dependency constraint lives in committed config, never in a comment or a
  local machine.** Autolinking exclusions, pod/module pins, platform-target overrides — in
  the audited workspace a dependency's iOS pod required a newer platform target than the
  app's; the exclusion the code comment *believed* existed was committed nowhere, so every
  fresh CI build failed at native install. Worse: it blocked the release that a raised
  force-update minimum would have demanded — the remediation path itself was wedged.
- **CI performs a fresh native build** (clean prebuild → native compile) on a cadence, not
  only at release time — it is the only check that catches uncommitted native constraints,
  platform-target drift, and store-SDK deadline breakage while they are cheap.
- **App identity is a committed, cross-referenced fact set:** bundle/application ids,
  entitlements, signing team, deep-link association (the server serves the association
  files; the app declares the matching identity). A mismatch fails silently — links open
  the browser instead of the app, with no error anywhere. Record the identity set in the
  profile and verify both sides against it.
- Store metadata constraints (privacy declarations, data-safety forms) change with the
  platforms' deadlines — track them in the profile with an owner, or discover them as a
  rejected release.

## 6. The lifecycle: backgrounding, offline, deep links

- **Assume suspension at any `await`.** Multi-step flows (capture → process → upload)
  persist enough state to resume or restart cleanly; a flow that dies half-way must not
  leave the UI wedged or the server holding an orphan (cleanup: `data-integrity.md` §11).
- **Polling is focus-scoped.** Poll only while the relevant screen is foregrounded; on
  background, stop; on foreground, refetch immediately (the reconciliation moment,
  `resilience.md` §10). An unfocused poller burns battery and rate-limit budget
  (`security.md` §8) for nobody.
- **Deep links land on any auth state.** A link screen (verification, share, reset) must
  render for signed-out, signed-in, and signed-into-a-*different*-account states — the
  link's token, not the session, is the credential where the flow says so. Route guards
  that assume "signed-in user opened this" break the exact cross-device flows links exist
  for.
- Cold start re-derives everything: the app must reach a correct screen from killed state
  given only persisted credentials + server truth — never from in-memory state it hopes
  survived.

## 7. Permission-gated features: wired or hidden

- **Every permission has a denial path.** Camera, push, biometrics: request at point of
  need with context, handle "denied" as a designed state (degrade or explain — the OS may
  not re-prompt), and never render a feature as available when its permission is
  permanently denied.
- **A visible control is a wired control.** The audit's sharpest trust finding: a push
  toggle and a biometric-lock step that stored preferences **nothing enforced** — the
  server sent pushes regardless; nothing ever locked. A wired-looking control that does
  nothing is worse than its absence: it is a promise the product visibly breaks, and for
  privacy-adjacent toggles (push, biometrics, tracking) a compliance exposure. Ship the
  enforcement with the control or do not ship the control.

## Failure shapes

Named patterns from real audits, genericised. Recognise one, cite it by name.

- **The zombie session** — a 401 clears the token but not the cached user the guards watch;
  the app renders signed-in forever, every call fails, force-quit is the only exit. (§2)
- **The gate that checks the wrong version** — a force-update gate keyed to the OTA-updated
  JS version; users update JS, never satisfy the store minimum, and loop. (§4)
- **The pod-install time bomb** — a native constraint that exists only in a comment or on
  one laptop; every fresh CI build fails at native install, discovered the day a release is
  urgent — possibly the forced-update release itself. (§5)
- **The no-op toggle** — a shipped preference nothing reads; the user turns pushes off and
  keeps receiving them. (§7)
- **The token graveyard** — delivery receipts ignored; the token table grows dead entries
  for years, sends waste quota, delivery metrics read healthy-ish while real reach decays. (§3)
- **The warmed-cache deep link** — a push-tap route that renders only if the user happened
  to have browsed there first; cold-started from the notification, it shows a skeleton
  forever. (§3, §6)

## Checklist

Before merging app-side changes:

- [ ] Auth-flow change: authoritative 401 still tears down cached session state — proven by
      a test with a warmed cache?
- [ ] Blip vs rejection still distinguished (no teardown on timeout/5xx)?
- [ ] New version-keyed behaviour: names binary vs OTA explicitly — and correctly?
- [ ] Native dep added/updated: constraints committed; fresh prebuild passes in CI?
- [ ] New push interaction: payload contract pinned on both sides; tap-target renders from
      cold start?
- [ ] Sign-out / account deletion: push token deleted server-side?
- [ ] New permissioned feature: denial path designed; control wired end-to-end or hidden?
- [ ] Multi-step flow: resumable after process death at any step?

## Guard rails

CI checks that make this standard enforceable, not aspirational:

- **Fresh-native-build job** on a schedule: clean checkout → prebuild → native compile for
  both platforms; failure pages the app owner. Catches §5's whole class.
- **Push-payload pin test on both sides** (`testing.md` §5.6 pattern) — server composer and
  client handler assert the same literal shape.
- **Zombie-session test:** integration test drives a warmed session cache, returns 401 from
  the mock server, asserts the app lands on sign-in.
- **Version-gate test:** gate logic unit-tested against (binary, OTA, minimum) triples —
  including the unreadable-version branch and its documented fail direction.
- **Dead-token prune metric** — pruned-token count emitted and alarmed on flatline
  (`observability.md` §3): a prune that silently stops regrows the graveyard.
- **Store-deadline tracker** in the profile reviewed each release cycle (SDK minimums,
  privacy-form changes).

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master. Copy
> the tables into the project's profile (e.g. `profiles/mobile-app-profile.md`)
> and fill them there. Agents: §3–§5 are not decidable without it.

**Version gates (§4):**

| Gate | Keys off (binary / OTA) | Config source | Fail direction | Named exception |
| --- | --- | --- | --- | --- |

**Push channels (§3):**

| Payload field | Composed by (server path) | Consumed by (app path) | Pinned by test? |
| --- | --- | --- | --- |

**App identity & deep links (§5, §6):**

| Fact | Value | Server-side counterpart |
| --- | --- | --- |
| Bundle / application id | | |
| Deep-link hosts | | association files route |
| Signing identity / team | | |

**Native constraints (§5):**

| Constraint | Where committed | Why |
| --- | --- | --- |

**Permission-gated features (§7):**

| Feature | Permission | Denial behaviour | Enforcement path (what actually reads the setting) |
| --- | --- | --- | --- |

**Store deadlines (§5):**

| Platform requirement | Deadline | Owner |
| --- | --- | --- |
