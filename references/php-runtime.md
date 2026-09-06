# PHP Runtime Configuration Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-09-06)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs the interpreter configuration a PHP deployment runs under: the `php.ini` settings that
> decide whether written code executes at all, what leaks in a response, how bytecode is cached,
> and what the process model guarantees. The core idea: **PHP is the one language in this library
> where the semantics of your code are decided by a file that is not in your repository** — and
> the state with no file at all is the unsafe one.

---

## 0. Scope — when this standard applies

Applies to any PHP deployment in the assumed workspace shape (`_authoring.md` rule 3).

This standard owns: interpreter configuration as a deployable artifact, the settings that change
code behaviour or leak information, OPcache, the request-per-process model and what inverts it,
and PHP-level execution limits.

It does NOT cover:

- Composer, autoloading, the task vocabulary, style, and the *version* floor →
  `php-packaging.md`. This standard owns how the interpreter is **configured**; that one owns
  which interpreter and what is installed into it.
- `strict_types` and static analysis → `php-typing.md`.
- **Application** env vars, boot guards and the fail-closed obligation →
  `config-and-environment.md`. `php.ini` is not application config; it is the interpreter's, and
  it is governed here because it changes language semantics rather than application behaviour.
- Session *design* — tiers, revocation, token storage → `security.md` §2. This standard owns only
  the cookie **flags** the interpreter sets by default (§2.4).
- Timeout and retry *policy*, deadlines, degradation → `resilience.md`. This standard owns the
  PHP-level limits and their surprising defaults (§5); that one owns what a deadline must be.
- Structured logging and alarms → `observability.md`.

**Evidence basis, stated plainly.** This library's audit corpus is TypeScript. Every behavioural
claim below was **executed** on the interpreter named in the anchor table, and its output is
quoted. Where a documented behaviour could not be reproduced cleanly, this standard says so and
declines to state a rule on it (§5.1).

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-09-06;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| PHP | Claims below executed on **8.5.10**. Support schedule and version floors are `php-packaging.md` §2.1's lane |
| `php.ini-production` / `php.ini-development` | The two templates shipped **inside the PHP distribution**. Neither is installed automatically — a build that copies neither runs on the compiled-in defaults (§1) |
| `zend.assertions` | `-1` in the shipped `php.ini-production`; compiled-in default `1`. The obligation this creates is `security.md` §5.8 |
| OPcache | Bundled since PHP 5.5; `opcache.enable` compiled-in default `1`. Neither shipped template sets `opcache.validate_timestamps` |
| PHP-FPM | The common production SAPI. `request_terminate_timeout` is an FPM pool setting and is **not** the same clock as `max_execution_time` (§5.2) |
| Session cookie directives | `session.cookie_httponly`, `session.cookie_secure`, `session.cookie_samesite` — compiled-in defaults `0`, `0`, `''`; **not set by either shipped template** (§2.4) |

---

## 1. Core principle — the deciding file is not in the repository

Every other language in this library keeps behaviour-deciding configuration where the code is:
TypeScript in `tsconfig.json`, Python in `pyproject.toml`. PHP keeps a decisive share of it in
`php.ini` — a file that is typically supplied by the base image, the distribution package, or a
platform's control panel, and that is **not in `composer.lock`, not in the repository, and not
asserted by any test.**

Executed on PHP 8.5.10 with **no `php.ini` present at all** (`php -n`) — which is what a minimal
container gets if the build copies no ini:

| Setting | Value with no ini | Consequence |
| --- | --- | --- |
| `display_errors` | **`1`** | stack traces and absolute paths rendered into the HTTP response |
| `expose_php` | **`1`** | version banner in an `X-Powered-By` header |
| `session.cookie_httponly` | **`0`** | session cookie readable by script |
| `session.cookie_secure` | **`0`** | session cookie sent over plaintext |
| `session.cookie_samesite` | **`''`** | unset |
| `allow_url_fopen` | **`1`** | ordinary file functions accept remote URLs |
| `zend.assertions` | **`1`** | assertions execute |

And what the **shipped `php.ini-production` template** actually sets:

| Setting | production template |
| --- | --- |
| `display_errors`, `display_startup_errors` | `Off` |
| `error_reporting` | `E_ALL & ~E_DEPRECATED` |
| `log_errors` | `On` |
| `zend.assertions` | **`-1`** |
| `expose_php` | **`On`** — the production template does not turn it off |
| the three session cookie directives | **not set** |
| `opcache.validate_timestamps` | **not set** |

Three conclusions, and they are the whole of §2:

1. **The unsafe state is the no-configuration state.** Every session-cookie protection is off
   until something turns it on, and nothing in the repository does.
2. **The vendor's own production template is necessary and not sufficient.** It fixes error
   display; it leaves `expose_php` on and all three cookie flags unset.
3. **The same code has different semantics on two hosts.** `zend.assertions` alone decides
   whether an `assert()` gate executes (`security.md` §5.8) — and a reviewer reading the
   repository cannot tell which host they are looking at.

---

## 2. The interpreter configuration is part of the deployable

### 2.1 The configuration is committed, versioned, and shipped with the code

The repo MUST contain the ini fragment (or the image layer, or the platform configuration
export) that its deployment runs under, and the deployment MUST use it — not the base image's
default, and not a value someone set once in a control panel.

- **A setting that matters and is not in version control is not configured; it is inherited.**
  Inheritance is invisible in review, survives no image rebuild, and differs between the two
  hosts nobody compared.
- Prefer an **additive fragment** (`conf.d/`-style) over editing a distribution `php.ini`, so a
  base-image upgrade does not silently discard the project's settings.
- **Every setting the application depends on is stated explicitly, even where it matches the
  default.** A default that is relied upon and not written down is a behaviour nobody chose and
  a future upgrade can change. The profile carries the full list.

### 2.2 Settings that decide whether written code executes are asserted, not assumed

A small set of directives determine whether code in the repository runs at all. These MUST be
asserted by a boot-time check or a smoke test that runs against the deployed configuration, not
merely written in a file:

- **`zend.assertions`** — decides whether `assert()` executes. See `security.md` §5.8: a control
  written as an assertion is absent under the production template's `-1`.
- **`opcache.validate_timestamps`** — decides whether a deployed file change is ever noticed
  (§3).
- **`error_reporting`** and the deprecation posture — decide whether a silently-degrading path
  is reported or swallowed.
- **`disable_functions`** — a function disabled on one host and present on another turns a code
  path into an environment-dependent failure.

The assertion is the point. A value in a file the deployment does not load looks identical to a
value the deployment honoured.

### 2.3 Nothing about the runtime is disclosed in a response

- **`display_errors = Off` in every non-development environment**, with `log_errors = On`. A
  rendered stack trace discloses absolute paths, framework versions, query fragments and
  sometimes credentials, to whoever triggered it. Pair with a handler that returns the standard
  error envelope (`api-contracts-and-codegen.md` §8).
- **`expose_php = Off`.** The shipped production template leaves it on, so this is an explicit
  addition, not an inherited default.
- Debug endpoints, profilers and error-page renderers are **environment-gated *and* auth-gated**
  — `security.md` §4's rule, restated here only because in PHP these commonly arrive as
  dependencies that register themselves and are enabled by an env var alone.

### 2.4 Session cookie flags are set explicitly, because the defaults are off

`session.cookie_httponly`, `session.cookie_secure` and `session.cookie_samesite` default to `0`,
`0` and `''`, and **neither shipped template sets them**. A PHP application that calls
`session_start()` and configures nothing therefore issues a session cookie that script can read
and that will travel over plaintext.

Set all three explicitly, in the committed configuration and, where the framework offers it, in
application code as well — two statements of the same fact are justified here precisely because
one of them lives outside the repository. Session *design* — tiers, lifetimes, revocation blast
radius — is `security.md` §2's lane.

---

## 3. OPcache — the deploy that did not deploy

OPcache is on by default and caches compiled bytecode. `opcache.validate_timestamps` decides
whether PHP re-checks a file's mtime before using the cached copy.

- **In production, `validate_timestamps=0` is the performance-correct setting and it makes the
  deployment mechanism part of the correctness contract.** With it off, PHP will serve the old
  bytecode indefinitely: new files on disk, old code executing, no error anywhere. The deploy
  reports success and changes nothing.
- **Therefore the deploy MUST include an explicit cache reset** — a process restart, an atomic
  symlink swap into a new path, or an FPM reload. Which one is a profile fact, and the one thing
  that must not happen is nobody choosing.
- With `validate_timestamps=1`, `opcache.revalidate_freq` sets how stale a file may be. A
  non-zero value on a host doing in-place deploys is the same failure with a shorter fuse.
- **`opcache.preload`, where used, runs code at server start** — outside any request, before any
  application boot guard, with whatever configuration the master process has. Preloaded code is
  executed code and is reviewed as such.

---

## 4. The process model, and what inverts it

### 4.1 Classic PHP shares nothing between requests, and code must not assume otherwise

Under mod_php or PHP-FPM, each request gets a fresh interpreter state and everything is
discarded at the end. That is a guarantee worth relying on — and it makes two patterns that work
in a long-lived runtime silently wrong here:

- **In-process caches, counters and rate limiters do not accumulate.** A static array used as a
  cache is per-request; a counter used as a rate limit counts to one. It "works" in a
  single-process dev server and does nothing in production.
- **Background work does not outlive the response.** Fire-and-forget work started during a
  request is killed when the request ends. Queue it (`data-integrity.md` owns the durability
  obligation).

### 4.2 A long-running worker inverts every assumption in §4.1, silently

Application servers that keep the process alive across requests (e.g. Swoole, RoadRunner,
FrankenPHP, Laravel Octane) change the runtime contract without changing a line of application
code. Every place that relied on per-request teardown becomes a leak:

- **Static and singleton state persists across requests**, including request-scoped data — the
  authenticated user, a tenant id, a locale. The failure is **cross-request data disclosure**:
  request B reads state request A left behind, which is a security defect and not merely a bug.
- **Superglobals, `set_time_limit`, and anything mutating global interpreter state** behave
  differently or leak.
- **Container bindings resolved once at boot** capture the first request's dependencies.

**A move to a long-running runtime is a re-audit, not a deployment change.** The profile records
which runtime each deployable uses; a repo whose runtime is not recorded cannot have its
request-scoped state reviewed, because nobody knows which contract applies.

---

## 5. Execution limits are not deadlines

### 5.1 The PHP-level limit differs by SAPI, and the CLI default is no limit at all

Executed on 8.5.10: the **CLI SAPI's `max_execution_time` is `0`** — unlimited — while the
shipped `php.ini-production` sets `30` for web requests. The same code therefore has a bound in
one execution context and none in another, and the context that most often runs long
(cron jobs, queue workers, migrations) is the unbounded one.

*Deliberately not stated as a rule:* PHP's documentation says time spent in external system
calls is not counted toward `max_execution_time` on Unix-like platforms. That behaviour could
not be reproduced cleanly on the interpreter under test, and this library does not state rules
on behaviour it could not verify (`_authoring.md` rule 9). The obligation below does not depend
on which is true.

### 5.2 Every outbound call carries its own explicit deadline

Because §5.1's limits are unreliable as deadlines and differ per SAPI, the deadline MUST be set
on the operation: an explicit connect **and** read timeout on every HTTP client call, database
query and cache operation. `resilience.md` §2 owns the obligation and the ladder; this section
exists to remove the belief that `max_execution_time` already provides it.

- **`request_terminate_timeout` (FPM) is a different clock from `max_execution_time`, and
  neither leaves you a `finally`.** Verified on 8.5.10: exceeding `max_execution_time` raises an
  **uncatchable fatal error** — `try/catch` does not catch it and **`finally` does not run** —
  while registered shutdown functions **do**. FPM's `request_terminate_timeout` kills the worker
  process and runs neither. So a request interrupted by either clock leaves any state it was
  mid-way through mutating exactly as it was, and the only cleanup hook available to you is a
  shutdown function, in one of the two cases. Where a request performs a multi-step state change,
  that is `data-integrity.md`'s lane, and these two clocks are how the interruption actually
  happens.
- Both values are recorded in the profile alongside the application's own deadline budget, so
  the three can be seen to be consistent.

---

## 6. The document root is the router

**Any file under the web root whose name ends in `.php` is a live, unauthenticated endpoint.**
Nothing routes to it; the server executes it because it is there. This has no Node, Python or Go
analogue — in those, a file on disk is unreachable unless code routes to it — and it is the
single most PHP-distinctive deployment property in this standard.

- **The server root MUST be a dedicated `public/` (or `web/`) directory containing only the front
  controller and static assets.** Everything else — `vendor/`, `.env`, `config/`, `storage/`,
  `tests/`, `.git/`, build scripts, database dumps — lives above it and is unreachable by URL.
  Rooting the server at the repository is how a `.env` file, a Composer-installed dependency's
  example script, or a committed migration becomes a public endpoint.
- **A file that is not an endpoint MUST NOT be under the root**, and a diagnostic file never is.
  `info.php`, `test.php`, an adminer drop-in: each is a permanent endpoint that no auth gate in
  the application ever sees, because the application is not involved in serving it.
- **PATH_INFO handling is part of the control.** A misconfigured FPM/`cgi.fix_pathinfo` pairing
  lets `/uploads/avatar.jpg/x.php` execute the uploaded file as PHP. Pin the FPM configuration so
  only a real, existing `.php` file is passed to the interpreter — this is the deployment half of
  `security.md` §5.3's upload allowlist, and neither half is sufficient alone.
- The profile records the document root per deployable and what sits above it.

## 7. The input layer truncates and empties before your code runs

PHP parses the request body itself, and three `INI_PERDIR` limits silently change what your code
receives. **None of them is fixable from application code**, and none produces an exception —
which is why they belong here rather than in a validation rule. Defaults verified on 8.5.10:

| Setting | Default | What happens on exceed |
| --- | --- | --- |
| `max_input_vars` | `1000` | Remaining input variables are **truncated**, with an `E_WARNING`. Applied *separately* to `$_GET`, `$_POST` and `$_COOKIE` |
| `post_max_size` | `8M` | **`$_POST` and `$_FILES` are empty.** No exception, no 413 from PHP |
| `upload_max_filesize` / `max_file_uploads` | `2M` / `20` | The file is rejected; the request is not |

Two failure shapes follow, and both read as application bugs:

- **The bulk edit that silently saved 1,000 of 1,200 rows.** The form posted everything; PHP
  handed the handler a prefix. The response is a success.
- **The "invalid CSRF token" that is really a size limit.** Body over `post_max_size` ⇒ `$_POST`
  empty ⇒ the CSRF field is missing ⇒ the token check fails first and reports the wrong cause.
  Every subsequent debugging step looks at sessions.

**The obligation:** where a route legitimately accepts many fields or a large body, the limits
are raised **for that route's pool** and recorded in the profile; and the application detects the
truncated/empty case explicitly — compare `$_SERVER['CONTENT_LENGTH']` against `post_max_size`
when `$_POST` is empty on a POST, and branch on every `$_FILES[...]['error']` value before
touching `tmp_name`. An upload handler that reads `tmp_name` without checking `UPLOAD_ERR_OK`
is the most common real defect in that area. Per-route body caps remain `security.md` §5.2's
lane; this is the layer *underneath* it, which fires first.

---

## Failure shapes

Named patterns to recognise and cite in review:

- **The inherited posture.** No ini in the repo; behaviour set by whatever the base image
  shipped, differing between two hosts nobody compared (§1, §2.1).
- **The rendered stack trace.** `display_errors` on in an environment nobody classified as
  development, disclosing paths and versions to any caller who triggers an error (§2.3).
- **The default cookie.** `session_start()` with no cookie configuration: a session cookie that
  script can read and that travels in plaintext, because all three flags default off (§2.4).
- **The deploy that did not deploy.** `validate_timestamps=0` with no cache reset in the deploy;
  new files on disk, old bytecode serving, success reported (§3).
- **The per-request cache.** A static array used as a shared cache under a request-per-process
  SAPI: correct-looking, and empty on every request (§4.1).
- **The leaked tenant.** Request-scoped state held in a static property after a move to a
  long-running application server; request B sees request A's user (§4.2).
- **The unbounded worker.** A CLI queue worker inheriting `max_execution_time=0` and no
  per-operation timeout, hung on a socket with nothing to interrupt it (§5.1, §5.2).
- **The uncatchable kill.** FPM's `request_terminate_timeout` firing mid-write; no shutdown
  handler runs and the half-finished state persists (§5.2).
- **The accidental endpoint.** A server rooted at the repository, making `.env`, a vendor example
  script or a committed dump reachable by URL (§6).
- **The truncated bulk save.** 1,200 posted rows, 1,000 stored, success reported — `max_input_vars`
  (§7).
- **The CSRF error that was a size limit.** Body over `post_max_size` empties `$_POST`, so the
  token check fails first and names the wrong cause (§7).

---

## Checklist

Before merging a change that touches runtime configuration, deployment, or process model:

- [ ] Every setting the change relies on is in the committed ini fragment, not inherited (§2.1)?
- [ ] Change relies on `zend.assertions`, `opcache.validate_timestamps`, `error_reporting` or
      `disable_functions`? Asserted by a boot check or smoke test, not just written (§2.2)?
- [ ] `display_errors` off and `expose_php` off in every non-development environment (§2.3)?
- [ ] Any new session usage: all three cookie flags set explicitly (§2.4)?
- [ ] Deploy still resets the opcode cache, and the reset mechanism is still the profile's
      (§3)?
- [ ] New in-process state: is it per-request (and therefore useless as a cache) or persistent
      (and therefore a cross-request leak)? Which runtime does this deployable use (§4)?
- [ ] New outbound call carries its own connect and read timeout — not relying on
      `max_execution_time` (§5.2)?
- [ ] New multi-step state change survives an FPM `request_terminate_timeout` kill, which runs
      no shutdown handler (§5.2)?
- [ ] New file added under the document root: is it meant to be a public endpoint (§6)?
- [ ] New route accepting many fields or a large body: limits raised for its pool and recorded,
      and the empty/truncated case detected rather than reported as a validation failure (§7)?
- [ ] New upload handler branches on `$_FILES[...]['error']` before touching `tmp_name` (§7)?

---

## Guard rails

CI checks that make this standard enforceable rather than aspirational:

- **[php-runtime.GR1]** **Configuration-assertion smoke test.** A test that runs **against the
  built image or the deployed environment** and asserts the profile's declared value for every
  behaviour-deciding setting (§2.2), plus `display_errors`, `expose_php` and the three session
  cookie directives (§2.3, §2.4). This is the only rail that checks the file the repository does
  not contain, and it is the highest-value one here.
- **[php-runtime.GR2]** **Response-header probe.** An integration test asserting no
  `X-Powered-By` header and no framework-version disclosure on a production-mode response (§2.3).
- **[php-runtime.GR3]** **Error-disclosure probe.** Force an error against a production-mode
  build and assert the response body carries the standard envelope and no file path or stack
  frame (§2.3).
- **[php-runtime.GR4]** **Deploy-reset assertion.** The deploy pipeline fails if
  `opcache.validate_timestamps=0` is configured and no cache-reset step is present (§3).
- **[php-runtime.GR5]** **Static-state sweep for long-running runtimes.** Where the profile
  records a persistent application server, a check surfacing static/singleton properties
  assigned from request-scoped data — the §4.2 leak. Surface-it, not ban: the rail's job is that
  no such assignment is unexamined.
- **[php-runtime.GR6]** **Timeout presence check.** Semgrep `checks/semgrep/php-runtime.yaml`
  surfaces **cURL handles** with no explicit timeout option (§5.2) — the PHP form of the existing
  `resilience.md` rail. HTTP *client-object* construction (Guzzle, Symfony HttpClient) is
  deliberately not pattern-matched: the deadline usually lives in a config array or a factory far
  from the constructor, so a pattern there would be noise. That half is judgement-only.

- **[php-runtime.GR7]** **Document-root probe.** An integration test requesting `/.env`,
  `/composer.json`, `/vendor/autoload.php` and `/.git/config` against the built image and
  asserting each is unreachable (§6). Cheap, and it fails loudly the day someone changes the
  server root.
- **[php-runtime.GR8]** **Input-limit assertion.** Assert the deployed `max_input_vars` and
  `post_max_size` against the profile's declared values, and pin the largest legitimate form in a
  test that posts more fields than the default 1000 (§7).

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's profile (e.g.
> `<home>/profiles/php-runtime-profile.md`) and fill them there.

**Where the configuration lives (§2.1):**

| Deployable | Ini fragment / layer (path in repo) | How the deployment loads it | Base image default it overrides |
| --- | --- | --- | --- |
| | | | |

**Declared settings (§2.1–§2.4) — state every value the application relies on, default or not:**

| Setting | Declared value | Asserted by | Notes |
| --- | --- | --- | --- |
| `zend.assertions` | | | decides whether `assert()` runs — `security.md` §5.8 |
| `display_errors` | | | |
| `expose_php` | | | |
| `error_reporting` | | | |
| `session.cookie_httponly` | | | |
| `session.cookie_secure` | | | |
| `session.cookie_samesite` | | | |
| `allow_url_fopen` | | | |
| `disable_functions` | | | |
| `memory_limit` | | | |

**OPcache and deployment (§3):**

| Deployable | `validate_timestamps` | `revalidate_freq` | Cache-reset mechanism in the deploy | Preload used? |
| --- | --- | --- | --- | --- |
| | | | | |

**Process model (§4) — required before any request-scoped state can be reviewed:**

| Deployable | SAPI / application server | Requests share a process? | Static state audited on | Bootstrapped-once bindings |
| --- | --- | --- | --- | --- |
| | e.g. PHP-FPM, Swoole, RoadRunner, FrankenPHP | | | |

**Document root (§6):**

| Deployable | Server root | What sits above it | PATH_INFO / `cgi.fix_pathinfo` posture |
| --- | --- | --- | --- |

**Input limits (§7) — per pool, not per app:**

| Deployable / pool | `max_input_vars` | `post_max_size` | `upload_max_filesize` | Largest legitimate form, and the test that pins it |
| --- | --- | --- | --- | --- |

**Limits and deadlines (§5) — the three must be consistent:**

| Deployable | `max_execution_time` (web) | `max_execution_time` (CLI) | FPM `request_terminate_timeout` | Application deadline budget (`resilience.md`) |
| --- | --- | --- | --- | --- |
| | | | | |
