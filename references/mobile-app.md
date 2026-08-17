# Mobile App Standard

> **Type:** Generic, reusable standard · **Rev:** 2 (2026-08-11)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
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
features, deep-link handling on the client, network trust posture (pinning), device trust
posture, sensitive-screen capture posture, offline write conflicts, mobile accessibility.
**Does not own** (one-line cross-refs only):

- Server-side session design, token storage rules, revocation levers → `security.md` §2, §7.
- Delivery redundancy (push + poll reconciliation) and gate failure directions → `resilience.md` §10–§11.
- Generated native directories, lockfiles, CI parity → `tooling-and-workspace.md` §6–§7.
- Generated API types and codegen workflow → `api-contracts-and-codegen.md`.

**External anchors** — name + version + status, never URLs. *Rev-1 rows verified 2026-07-28;
the Rev-2 rows (MASVS onward) 2026-08-11. Re-verify anything older than 12 months
(`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| React Native | **0.86** current stable; 0.77–0.86 carry live docs, **0.76 and below are archived**. A labelled example only — the app's own pin is a profile fact. An archived version's docs do not announce that they are archived |
| Expo SDK / EAS Update | **SDK 57**, 30 June 2026; each SDK targets one React Native version. The `runtimeVersion` policies (`appVersion`, `nativeVersion`, `fingerprint`) are the native-compatibility mechanism §4 names — `fingerprint` is the one that moves when native code does |
| Google Play target API level requirement | **Living policy, moving dates.** As of 2026-07-28: from **31 Aug 2026** new apps and updates must target Android 16 (API 36); existing apps must target Android 15 (API 35) to stay available to new users on newer OS; extension to 1 Nov 2026 on request. The dates rot — §5's profile table is what you pin |
| Apple SDK minimum requirement | **Living, in force since 28 Apr 2026**: uploads to App Store Connect must be built with Xcode 26 or later against the iOS / iPadOS / tvOS / visionOS / watchOS **26** SDKs. Same rolling shape as the row above |
| Apple **App Privacy Details** / Google Play **Data safety** section | **Living, unversioned per-app declarations**, required to ship, and both place the duty to keep answers current on the developer as bundled SDKs change. The answers and their owner are profile rows (§5), never values in this file |
| Universal Links (`apple-app-site-association`) / Android App Links (Digital Asset Links `assetlinks.json`) | **Living vendor specs, unversioned.** Both are served over HTTPS from the site's `/.well-known/`; `assetlinks.json` matches on `package_name` + `sha256_cert_fingerprints`. This pair is the §5 identity set whose mismatch fails silently |
| Firebase Cloud Messaging **HTTP v1** | **Living doc, unversioned.** The dead-token signals §3 requires: `UNREGISTERED` (HTTP 404) and `INVALID_ARGUMENT` (HTTP 400 — a dead-token signal only once the payload is known valid). FCM counts a registration stale after ~1 month unconnected; Android registrations are collected at 270 days |
| APNs provider API (HTTP/2) | Named **without codes**: the exact status and reason strings for a dead token could not be retrieved from Apple's primary documentation on 2026-07-28. Treat any remembered value as unverified; pin the current reason codes in the profile against Apple's live page |
| OWASP MASVS / MASTG | MASVS **v2.1.0** (2024-01-18, stable, latest as of 2026-08-11); companion testing guide MASTG **v2.0.0** (2026-06-30, first stable v2). Control groups cited here: MASVS-NETWORK (§8), MASVS-RESILIENCE (§9). Both place pinning and platform-integrity checks in **defense-in-depth profiles (MAS-L2 / MAS-R), not the baseline** — absence alone is not a vulnerability; an undeclared posture is what §8–§9 make the finding |
| Pinning machinery | iOS `NSPinnedDomains` under `NSAppTransportSecurity` (iOS/iPadOS **14.0+**); Android Network Security Config `<pin-set expiration="…">` with SHA-256 pins. **Android's own doc recommends a backup pin and warns pin expiry is a bypass vector** — the §8 rotation rule is theirs, restated |
| Capture protection | Android `WindowManager.LayoutParams.FLAG_SECURE` (blocks screenshots and non-secure displays; official caveat: ≤API 30 reliable on ~70% of devices, does not stop overlay attacks). iOS has **no equivalent**: `UIScreen.isCaptured` (iOS 11+, **deprecated iOS 27 → `UITraitCollection.sceneCaptureState`**) detects recording; app-switcher snapshot obscuring per "Preparing your UI to run in the background" |
| Touch targets & WCAG | Apple HIG: 44×44 pt default control size, 28×28 pt stated minimum with spacing. Android accessibility guide: 48×48 dp. WCAG **2.2** SC 2.5.8 Target Size (Minimum): Level **AA**, 24×24 CSS px. WCAG2ICT (W3C **Group Note, 11 Dec 2025**, informative) maps WCAG 2.x A/AA to non-web software incl. mobile; EN 301 549 **V3.2.1** Ch. 11 applies WCAG 2.1 AA to mobile software (V4.x adopting 2.2 is in draft, expected in the OJ ~Oct 2026) |
| Device attestation | Android **Play Integrity API** (SafetyNet Attestation deprecated 2022, **fully turned down Jan 2025** — any remaining SafetyNet call fails); Apple **App Attest** (DeviceCheck framework, iOS 14.0+) |
| Offline-first conflicts | Android "Build an offline-first app" guide (living doc): conflict resolution requires versioning; the network source is the absolute source of truth; last-write-wins named as the common mobile default. No equivalently citable Apple doc could be verified on 2026-08-11 — §11 stands on this anchor plus audit evidence |

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

## 8. Network trust: pinning is a declared posture, not a default

Transport rules (TLS, token storage) are `security.md` §7; this section owns what is unique to
a client you cannot hot-fix: whether it trusts only your endpoints' identities.

- **The pinning decision MUST be recorded, either way.** Pin, or record "no pin, because…" in
  the profile. MASVS places pinning in its defense-in-depth profile — not pinning is a
  legitimate posture; an *undeclared* posture is the finding, because nobody can say whether
  the app's trust model is a decision or an accident.
- **A pin without a rotation story bricks the installed tail.** The store-release tail (§4)
  keeps old binaries alive for weeks; a certificate rotation that invalidates their pins cuts
  every un-updated install off from the API — including from the force-update flow that would
  fix it. Pinned apps MUST ship a backup pin and an expiry runway (the platform pin-set
  expiration exists precisely for this), and the rotation procedure lives in the profile.
- **Pin failure is a designed state.** A pin mismatch means either an attack or your own
  rotation mistake; the app must fail closed on the request but land the user somewhere
  explanatory — never an infinite spinner (silent degradation: `observability.md` §2).

## 9. Device trust: a recorded posture, never an assumption

- **The root/jailbreak stance is a threat-model decision, recorded in the profile:**
  detect-and-degrade, detect-and-log, or no-detection — each is legitimate (MASVS treats
  platform-integrity validation as defense-in-depth). What is not legitimate is code that
  *assumes* an untampered device without anyone having decided that.
- **Secrets never rely on undetected root.** The OS keystore is the boundary (`security.md`
  §7); detection is a tripwire, not a vault. A design that stores plaintext secrets "because
  we jailbreak-detect" has inverted the layering.
- **If the posture is detect-and-degrade, the degraded state is designed** — which features
  turn off, what the user sees — and server-side attestation (the platform attestation APIs)
  backs any high-stakes gate, because client-side checks alone are patchable by the same
  attacker they target.

## 10. Sensitive screens: a declared capture posture

- **Every screen rendering data the data-protection inventory marks sensitive
  (`data-protection.md` §2) declares its capture posture in the profile:** protected (secure
  flag / obscured app-switcher snapshot), or visible-with-reasoning. The failure this
  prevents: a balance screen or medical record sitting readable in the OS app-switcher
  carousel and in every screenshot sync service the user runs.
- **State the platform asymmetry honestly.** One platform blocks capture at the window level;
  the other only detects recording and lets you obscure the background snapshot. A
  cross-platform "screenshots are blocked" claim is false on one platform — write what each
  actually does; a protection that exists on one OS and is merely believed on the other is
  the §7 no-op toggle wearing a security costume.

## 11. Offline writes: replay with idempotency, converge by rule

§6 owns resuming *flows*; this section owns queued **writes** created while offline.

- **Every queued write carries an idempotency key** (`data-integrity.md` §6): the replay after
  reconnect races the same user's other device, a retry, and the original request that may
  have half-landed. Without a key, reconnect is a duplicate generator.
- **Each offline-writable type declares its conflict rule** — server-wins, last-write-wins, or
  field-merge — in the profile, and the server is the arbiter (versioned writes:
  `data-integrity.md` §15). Last-write-wins is a legitimate declared default; silent overwrite
  of a concurrent edit nobody decided to allow is the named failure.
- **Undeliverable queued writes surface.** A write the server permanently rejects on replay
  (validation, authz, terminal state) is shown to the user with its content recoverable —
  never silently dropped from the queue (`observability.md` §2's ban, applied client-side).

## 12. Accessibility: the platform APIs are the contract

Web accessibility is `web-client.md` §8; this section owns the native surface. WCAG 2.2 A/AA
applies to mobile software via WCAG2ICT, and EN 301 549 binds it where that regime applies
(applicability: the profile's regulatory table, `data-protection.md` Appendix A).

- **Every actionable element carries a platform accessibility label** naming its action, not
  its icon. An unlabeled icon button simply does not exist for a screen-reader user — the
  feature is shipped and unreachable at once, the accessibility form of §7's wired-or-hidden.
- **Touch targets meet the platform minimum: 48×48 dp / 44×44 pt** (HIG's stated 28 pt floor
  only with generous spacing); WCAG 2.2's 24 CSS px is the floor beneath the floors, not the
  target.
- **Dynamic type must not truncate critical flows.** At the platform's large accessibility
  text sizes, auth, payment and consent flows remain completable — a "Continue" button pushed
  off-screen by scaled text is a lockout, not a layout nit.
- **Screen-reader traversal reaches every screen** of the primary flows in a sensible order;
  decorative images are marked decorative so they are skipped, not narrated as filenames.

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
- **The bricked pin** — a certificate rotation invalidates the pins baked into the installed
  tail; every un-updated binary is cut off from the API, including from the update path that
  would fix it. (§8, §4)
- **The reconnect duplicate** — offline writes queued without idempotency keys replay on
  reconnect against a request that already half-landed; the user's action happens twice and
  a concurrent edit from their other device vanishes without anyone deciding it should. (§11)

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
- [ ] Endpoint or TLS-identity change: pinning posture consulted — pins rotated with a backup
      pin and runway, or the declared no-pin reasoning still holds?
- [ ] New screen rendering inventory-marked sensitive data: capture posture declared and the
      protection actually wired on each platform (not claimed cross-platform)?
- [ ] New offline-writable type: idempotency key on the queued write; conflict rule declared?
- [ ] New or changed interactive element: accessibility label present; target size meets the
      platform minimum; critical flow completable at large text sizes?

## Guard rails

CI checks that make this standard enforceable, not aspirational:

- **[mobile-app.GR1]** **Fresh-native-build job** on a schedule: clean checkout → prebuild → native compile for
  both platforms; failure pages the app owner. Catches §5's whole class.
- **[mobile-app.GR2]** **Push-payload pin test on both sides** (`testing.md` §5.6 pattern) — server composer and
  client handler assert the same literal shape.
- **[mobile-app.GR3]** **Zombie-session test:** integration test drives a warmed session cache, returns 401 from
  the mock server, asserts the app lands on sign-in.
- **[mobile-app.GR4]** **Version-gate test:** gate logic unit-tested against (binary, OTA, minimum) triples —
  including the unreadable-version branch and its documented fail direction.
- **[mobile-app.GR5]** **Dead-token prune metric** — pruned-token count emitted and alarmed on flatline
  (`observability.md` §3): a prune that silently stops regrows the graveyard.
- **[mobile-app.GR6]** **Store-deadline tracker** in the profile reviewed each release cycle (SDK minimums,
  privacy-form changes).
- **[mobile-app.GR7]** **Accessibility check in CI:** an a11y lint/scan step or instrumented accessibility
  test over the primary flows — unlabeled actionable elements and sub-minimum touch targets fail the
  build. Catches §12's whole class while it is one screen, not an app-wide retrofit.
- **[mobile-app.GR8]** **Pin-rotation test** where the profile declares pinning (§8): a test asserts the
  backup pin is present and the pin-set expiry exceeds the declared runway; a scheduled job alarms as
  expiry approaches — the bricked-pin failure discovered before the rotation, not during it.

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master. Copy
> the tables into the project's profile (e.g. `<home>/profiles/mobile-app-profile.md`)
> and fill them there. Agents: §3–§5 and §8–§11 are not decidable without it.

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

**Network & device trust posture (§8, §9):**

| Decision | Value (or "no, because…") | Mechanism / rotation runway | Decided on |
| --- | --- | --- | --- |
| Certificate pinning | | backup pin? expiry? | |
| Root/jailbreak stance | detect-degrade / detect-log / none | degraded state; server attestation? | |

**Sensitive screens (§10):**

| Screen | Data classes (from the data-protection inventory) | Capture posture per platform | Wired by |
| --- | --- | --- | --- |

**Offline-writable types (§11):**

| Write type | Idempotency key | Conflict rule | Rejection surfaced how |
| --- | --- | --- | --- |
