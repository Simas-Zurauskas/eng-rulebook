# Useful operational evidence

## Applicability

Failures, degraded behavior and operational decisions. Match signals to consequence and the
team's ability to act; a static page need not acquire a monitoring platform to pass an audit.

## Checks

### OBS1 — Consequential failures are visible

Identify how money loss, unavailable core behavior, failed security actions and silent data
corruption would be detected. Existing logs/provider signals may suffice. Add metrics/alarms
where needed for timely action, not for every branch. Repair/watchdog activity can hide a broken
primary path; rising recovery use should be visible when consequential. Dev-only console output
is insufficient evidence of production visibility.

### OBS2 — Diagnostics preserve context without leaking data

Use consistent useful structured context and correlation across entrypoints, early failures and
asynchronous handoffs where needed. Bound/redact payloads, avoid credentials/personal data and
high-cardinality metric labels. Distinguish expected client errors from operator failures.
Prefer omission to storing unnecessary partially masked sensitive values.

### OBS3 — Telemetry does not become a dependency failure

Bound buffering and delivery; telemetry outages must not break core work or grow memory without
limit. Include useful build/deploy identity for client errors. Validate critical signals with a
controlled failure when warranted. Static existence of a logger or alarm configuration does not
prove that deployed failures are captured, routed or acted upon.
