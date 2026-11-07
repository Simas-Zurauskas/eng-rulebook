# Mobile lifecycle and delivery

## Applicability

Mobile sessions, push, permissions, native builds, updates and offline behavior. Match platform
and threat requirements; device controls are not universal or complete security boundaries.

## Checks

### MOB1 — State survives the real lifecycle

Exercise suspension, process death, foreground/reconnect, cold-start deep links and notification
taps without assuming warm caches. Revalidate authoritative state when required. Store sensitive
credentials with appropriate OS-backed facilities. Clear identity, caches and obsolete work on
sign-out/account switch; prevent late responses from restoring an old identity.

### MOB2 — Push and permissions follow the current account

Handle push-token rotation, registration/reassignment and dead-token cleanup. Prevent old-account
notifications from revealing data after switching accounts. Permission denial/revocation and
missing hardware are normal states. Preferences such as push or biometric protection must
actually affect behavior; hide or explain unavailable controls instead of pretending they work.

### MOB3 — Binary, update and API compatibility agree

Native code/config changes require a compatible binary; OTA updates cannot assume native modules
an installed app lacks. Distinguish binary and OTA identity in update/force-update decisions and
choose a deliberate failure mode for update checks. Preserve contracts for installed clients.
Check signing, bundle/app IDs, entitlements and link configuration. Run an authorized fresh native
build/device check when those changes require it; JavaScript tests alone do not prove compatibility.

### MOB4 — Offline work converges

Persist work that must survive restart, replay with stable identity and enforce authority when
executing. Define conflicting updates, server rejection, cancellation and user-visible recovery.
Do not silently double-apply effects after reconnect. Use [data integrity](data-integrity.md).

### MOB5 — Platform protections and accessibility are real

Use platform accessibility APIs, labels, focus and scalable text; check important interactions
on relevant devices. If pinning is required, provide rotation/backup/runway and a recoverable
failure state. Root detection, screen-capture controls and biometrics have platform limits;
do not claim they replace server authorization or promise impossible confidentiality.
