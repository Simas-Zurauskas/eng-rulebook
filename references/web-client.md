# Browser behavior and security

## Applicability

Browser sessions, interactive UI, client data, third-party scripts and web delivery.
[Security](security.md) owns server authority; browser route guards are user experience only.

## Checks

### WEB1 — Identity changes clear the right state

Keep credentials in storage appropriate to the session design. Clear identity, sensitive caches
and obsolete in-flight work on sign-out/final rejection, including across tabs when shared.
Local teardown must work even if the logout request fails. Distinguish a refreshable or transient
failure from final rejection. Late responses cannot repopulate a previous account's state.
With rotating refresh credentials, coordinate refresh/replay across the actual sharing scope,
including bootstrap; bound waiting and replay. Follow the server's real concurrency semantics.

### WEB2 — Rendering and ambient credentials preserve boundaries

Browser-visible values are public. Server authorization is required regardless of client claims.
Escape by default; sanitize intentional rich HTML, constrain dangerous URL schemes/redirects,
and prevent unsafe script/evaluation sinks. Apply effective CSRF protection to ambient-credential
requests. Third-party scripts execute with origin authority: limit their access to sensitive
flows and use trusted pinned/integrity-protected delivery where appropriate. Do not mistake
hidden route names or UI prices for a security boundary.

### WEB3 — Interaction works for the intended users

Use semantic native controls, accessible names, keyboard operation, visible focus, sensible
focus movement, contrast/targets and reduced motion where applicable. Allow password/OTP paste
and assistive technology. Loading, empty, error and permission states must reflect real behavior.
Exercise important user journeys in a browser when source/tests cannot establish the interaction.

### WEB4 — Client delivery and failures are diagnosable

Report consequential production failures with bounded, privacy-safe context and build identity.
Separate expected user errors from operator failures. Bound stale-chunk reload recovery to avoid
loops. Understand which configuration is inlined into the bundle: restarting a server does not
change it. Do not ship server credentials through any build-inlining mechanism.
