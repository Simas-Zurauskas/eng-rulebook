# PHP deployment and process behavior

## Applicability

Web-server/SAPI configuration, OPcache, FPM, uploads and persistent PHP workers.

## Checks

### PHPRUN1 — Inspect effective configuration

CLI settings may differ from the serving SAPI/pool. Validate effective configuration for public
error disclosure, protected logging, session/cookie security and resource limits. Framework-owned
settings can be authoritative; redundant ini settings are not required. Committed config alone
does not prove deployment applied it.

### PHPRUN2 — Deployments activate the intended code

Ensure OPcache reload/invalidation and worker restart behavior actually activate the release.
Neither always-on nor always-off timestamp validation is universal. Check release switching,
rollback and warm worker behavior. A successful build cannot prove old serving bytecode is gone.

### PHPRUN3 — Process lifetime preserves isolation and completion

Classic request teardown and persistent workers have different state lifetimes. Reset request,
tenant and identity state in long-lived workers; durable counters/jobs live outside disposable
process memory. Set effective outbound deadlines; execution limits are not necessarily I/O limits.
Do not depend on finalizers running after process termination.

### PHPRUN4 — Routing and body handling cannot bypass safeguards

Keep secrets, source/vendor internals and uploads from becoming unintended executable endpoints.
Inspect actual document-root/routing/PATH_INFO/FPM behavior rather than assuming every file is
public or private. Handle PHP's oversized/truncated inputs, empty oversize POST, max input limits
and upload error codes explicitly. Client-side file limits do not protect server parsing.
