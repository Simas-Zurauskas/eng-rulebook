# PHP Packaging & Toolchain Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-09-06)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs the Composer-facing half of a PHP repo's toolchain: the platform declaration and the
> gap between it and the machine that runs the code, lockfiles and install modes, autoloading
> and layout, the task vocabulary, and coding-style baselines. The core idea: **Composer
> declares a platform it cannot enforce** — every constraint it records is checked at resolve
> time against numbers it was *told*, never against the host that will serve the request.

---

## 0. Scope — when this standard applies

Applies to any PHP repo in the assumed workspace shape (`_authoring.md` rule 3). This standard
owns **what the PHP toolchain surface is**; `tooling-and-workspace.md` owns **that the same
surface exists in every repo** — the cross-repo uniformity mechanism, the repo inventory, and
CI parity as workspace properties.

It does NOT cover:

- `strict_types`, the static analyser and its level, type declarations → `php-typing.md`.
- **Interpreter configuration** — `php.ini`, OPcache, FPM pool and timeout semantics, and the
  settings that change whether written code executes → `php-runtime.md`. That file exists
  because PHP has a subject Node and Python do not; see its §1.
- **Dependency admission** — release-age cooldown, provenance, typosquat distance, internal
  namespace reservation → `supply-chain-and-build-integrity.md` §2. That standard owns *what
  may enter the tree*; this one owns *how the tree is resolved and installed reproducibly*.
- Application env vars and boot guards → `config-and-environment.md`.
- What tests contain → `testing.md`.

**Evidence basis, stated plainly.** This library's audit corpus is TypeScript. This standard is
anchored to documented and executed tool behaviour and to named external standards; no audit
finding is claimed that does not exist.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-09-06;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| PHP | **Living schedule.** At verification: **8.5** (20 Nov 2025) and **8.4** in *active* support; **8.3** and **8.2** security-only; **8.2's security support ends 31 Dec 2026** — a floor citing it is three months from certifying an unsupported runtime. Executed claims below used **8.5.10** |
| Composer | **2.10.3.** `allow-plugins` is an explicit allowlist — an unlisted plugin is **not** run (§2.4). `composer audit` reads the Packagist advisories database |
| PER Coding Style | **3.1** — "extends, expands and replaces PSR-12". Citing "PSR-12" alone retrieves the 2019 document it supersedes |
| PSR-4 | Autoloading standard. **Final** |
| PHP CS Fixer | **3.95.24** · PHP_CodeSniffer **4.0.4** · Rector **2.6.6** · PHPUnit **13.3.2**. Labelled examples — the rule is *one* fixer per workspace, not which |
| Packagist provenance | Packagist has **no PyPI-style attestation or trusted-publishing equivalent** at verification. A PHP dependency's provenance rests on the VCS tag it was built from, so §2.2's integrity story is weaker than the npm/PyPI one and the profile records that as an accepted gap |
| Named incident | Composer's own `CVE-2021-29472` — argument injection in the **Mercurial** (`HgDriver`) VCS driver, reachable from a crafted package URL and requiring `hg` on the build machine. The incident shape behind treating the resolver itself as attack surface (§2.4); it is Mercurial-specific, and calling it a Git-driver flaw names a different advisory |

---

## 1. Core principle — a declaration Composer cannot check

`composer.json` looks like it pins the platform. It does not:

- **`require: {"php": "^8.4"}`** is a *resolution* constraint, checked on the machine that runs
  the install — a build machine, not the host serving traffic. Composer does close part of this
  by default: `platform-check` defaults to `php-only`, emitting `vendor/composer/platform_check.php`
  (verified present in a default install), which `vendor/autoload.php` requires and which
  re-asserts the **PHP version** lower bound on whatever host loads the autoloader. What it does
  **not** check at `php-only` is `ext-*`, so a copied `vendor/` tree still runs on a host missing
  a declared extension until the first call into it.
- **`config.platform.php`** actively *overrides* the detected version so Composer resolves **as
  if** the host were that version. It exists so a developer on 8.5 can resolve for a production
  8.4 — which is genuinely useful, and is also a setting whose entire purpose is to make
  Composer stop looking at reality. A stale `config.platform.php` resolves a dependency tree for
  a PHP version nobody runs, and nothing reports it.
- **`ext-*` requirements** are checked the same way, at the same moment, against the build
  machine's extension set.

So the failure this standard prevents is not a wrong constraint. It is a **correct constraint,
satisfied on the wrong machine**, with a vendor tree then shipped to a host that was never
tested against it. Every rule in §2 pairs a declaration with the assertion that makes it true
where it matters.

---

## 2. Platform, dependencies, and reproducible install

### 2.1 The PHP version floor is declared, uniform, on a supported branch, and asserted at runtime

- `require.php` is present in **every** repo with the **same** constraint, and it names a branch
  still receiving security fixes on php.net's published schedule. Per the anchors, a floor of
  `^8.2` is within months of certifying an unsupported runtime.
- **`config.platform.php`, where it is set, MUST equal the production runtime**, and the
  equality MUST be asserted in CI — not maintained by memory. This is the single highest-value
  check in this standard, because the setting's whole function is to suppress the discrepancy it
  would otherwise cause.
- **Keep Composer's runtime platform check, and know its limit.** `platform-check` is `php-only`
  by default and asserts the PHP version on the host that loads the autoloader. Setting it to
  `true` extends the assertion to declared `ext-*` requirements, which is the form §2.3 needs;
  setting it to `false` removes the only floor check that executes in production. If the
  deployment does not load `vendor/autoload.php` early (a worker entrypoint, a warm-up script),
  assert `PHP_VERSION` at boot yourself, failing closed (`config-and-environment.md` §2 owns
  fail-closed boot; this is its PHP form).
- The analyser's configured `phpVersion` is a fourth declaration of the same fact and must agree
  (`php-typing.md` §8.3).

### 2.2 `composer.lock` is committed, and CI installs from it without resolving

`tooling-and-workspace.md` §2.2 owns the obligation; this is its PHP form.

- `composer install` (never `composer update`) in CI and in image builds. `install` honours the
  lockfile; `update` re-resolves and is a developer action that produces a reviewable diff.
- **`composer validate --strict` runs in CI.** It catches a `composer.json` edited without
  re-locking — the lock file carries a content hash of the manifest, and a mismatch means the
  installed tree does not correspond to the declared dependencies.
- **Production images install `--no-dev`**, and the test suite therefore never runs against the
  production tree unless CI does so deliberately. A dev-only package reachable from production
  code is a defect that only a `--no-dev` install surfaces — run one in CI and boot the app
  against it.
- **`--prefer-dist` with a committed lockfile is not provenance.** Per the anchors, Packagist has
  no attestation equivalent; integrity rests on the lockfile's recorded reference. Record that
  as an accepted gap in the profile rather than implying a guarantee that does not exist.

### 2.3 Every extension the code uses is declared

`ext-*` entries are the only machine-readable statement of what the runtime must provide. Code
calling into an extension that is not declared works on every machine that happens to have it
and fails at first use on the one that does not — typically a slimmed production image, and
typically on a rarely-taken path such as image processing or an encryption fallback.

- Declare `ext-*` for every extension called directly, including ones "everybody has".
- The deploy image's extension set is recorded in the profile against the repo that needs it.

### 2.4 Composer plugins are allowlisted, and the resolver is attack surface

A Composer plugin executes arbitrary code during install, with the installing machine's
credentials — the same class as an npm install script
(`supply-chain-and-build-integrity.md` §2.4 owns the policy).

- **`config.allow-plugins` is an explicit allowlist**, and each entry names *why* that plugin
  must run. Composer does not run an unlisted plugin, which makes the allowlist a real control
  rather than a declaration — treat any addition as a dependency admission decision.
- **`--no-scripts` / `--no-plugins` in contexts that do not need them**, notably any install that
  runs against untrusted or unreviewed input.
- The resolver itself has had exploitable defects (see the anchors' named CVE). Pin the Composer
  version in CI like any other build tool; "whatever the image ships" is an unpinned dependency
  of every build.

### 2.5 Development dependencies stay in `require-dev`

A test framework, fixer or analyser in `require` ships to production, enlarges the deployed
attack surface, and makes `--no-dev` unable to remove it. The split is the only mechanism that
distinguishes them, and it is one keystroke wide.

---

## 3. Autoloading and layout

- **PSR-4 for all first-party code**, one namespace root per package, mapped in
  `autoload.psr-4`. Classmap and `files` entries are exceptions that need a reason: `files` in
  particular loads on *every* request, so a helper file there is unconditional startup cost and
  unconditional executed code.
- **`autoload-dev` holds test-only namespaces**, so a production autoloader cannot resolve a
  test double. A test helper reachable in production is the same defect class as §2.5.
- **Production installs use an optimised autoloader** (`--optimize-autoloader`, and
  `--classmap-authoritative` where the deployment is immutable). Without it, every unresolved
  class triggers filesystem probing per request. Authoritative classmaps break dynamic class
  generation — if the app generates classes at runtime, that is a fact for the profile, not a
  surprise at deploy.
- **The namespace-to-directory mapping is case-sensitive in production and often not in
  development.** A class file whose name differs from its class in case autoloads on a
  case-insensitive filesystem and fails on a case-sensitive one. CI runs on the production
  filesystem semantics, or asserts the mapping directly.

---

## 4. The task vocabulary

`tooling-and-workspace.md` §3 requires the same named tasks in every repo. PHP has a place to
put them — Composer's `scripts` — so unlike Python the vocabulary has a home; what it lacks is
any requirement that the home be used.

Implement the same names in every repo, even where trivial:

| Task | Contract |
| --- | --- |
| `dev` | Run the service locally |
| `build` | Produce the deployable artifact |
| `typecheck` | Static analyser at the declared level (`php-typing.md` §2.2) |
| `lint` / `lint:fix` | Style check / fix |
| `test` | Run the suite (`testing.md`) |

- **A missing task name is how a repo silently exits the quality loop** — CI templates and agents
  invoke by name, and an absent name means *skipped*, not flagged
  (`tooling-and-workspace.md` §3.1).
- **`typecheck` is standalone**, never implied by the test run. Coupling a fast gate to a slow
  one means nobody runs it locally.
- Composer script names are also the place a `post-install-cmd` hook lives. Anything that runs
  automatically on install is executing code during dependency resolution and is reviewed as
  such (§2.4).

---

## 5. One style baseline, byte-identical

- **PER Coding Style 3.1** is the baseline — it extends and replaces PSR-12, and citing PSR-12
  alone points at the 2019 document. Choose **one** fixer for the workspace (php-cs-fixer or
  PHP_CodeSniffer, not both) and record it with its version.
- **The configuration file is byte-identical across repos.** Byte-identical is the bar because
  it is checkable by CI diff with no judgement (`tooling-and-workspace.md` §4.1).
- **`--dry-run`/check mode runs in CI**, so style is a gate rather than a thing someone
  remembers to run.
- **The fixer is also the enforcement point for `php-typing.md` §2.1's `strict_types`
  obligation.** That is the one style-adjacent rule with a behavioural consequence, and it is
  why this section is cross-referenced from a typing standard.
- **Automated refactoring tools (e.g. Rector) run as a reviewed change, never in CI's fix
  mode.** A tool that rewrites code on the way to production is a code author nobody reviewed.

---

## 6. CI parity

Every repo runs `typecheck` + `lint` + `test` on every change, from a clean checkout, with
`composer install` from the committed lockfile (§2.2), on the declared PHP version (§2.1) — and
at least one job installs `--no-dev` and boots the application, so a production-only resolution
failure surfaces in CI rather than at deploy.

---

## Failure shapes

Named patterns to recognise and cite in review:

- **The platform that lied.** `config.platform.php` pinned to a version nobody runs; the tree
  resolves for it, CI passes on it, production is something else (§2.1).
- **The vendor tree from elsewhere.** A `vendor/` built on a machine that satisfied
  `require.php`, copied into an image that does not, where nothing re-checks (§1, §2.1).
- **The undeclared extension.** A call into an extension nobody declared, working everywhere
  except the slim production image, failing on a rarely-taken path (§2.3).
- **The dev dependency in production.** A fixer or test framework in `require`, shipped, and
  un-removable by `--no-dev` (§2.5).
- **The case-sensitive deploy.** A class that autoloads on the developer's filesystem and 500s
  on the server's (§3).
- **The unreviewed install hook.** A `post-install-cmd` or an allow-listed plugin executing on
  every install, added in a dependency bump nobody read (§2.4, §4).
- **The missing task.** No `typecheck` script, so the CI template's step was never wired, so
  there is no analysis gate and nothing said so (§4).

---

## Checklist

Before merging a change that touches dependencies, tooling, autoloading, or CI:

- [ ] `require.php` present, uniform, on a branch still receiving security fixes (§2.1)?
- [ ] `config.platform.php` (if set) still equals the production runtime, and CI asserts it
      (§2.1)?
- [ ] `composer.lock` updated and committed; `composer validate --strict` still passes (§2.2)?
- [ ] CI still runs `composer install`, never `update`; a `--no-dev` install still boots (§2.2)?
- [ ] Any new extension call declared as `ext-*`, and present in the deploy image (§2.3)?
- [ ] New dependency: dev-only ones in `require-dev`; any new plugin added to `allow-plugins`
      with a stated reason (§2.4, §2.5)?
- [ ] New namespace mapped under PSR-4; test-only namespaces under `autoload-dev` (§3)?
- [ ] New class file's name matches its class exactly, including case (§3)?
- [ ] Full task vocabulary present — including a standalone `typecheck` (§4)?
- [ ] Style config still byte-identical to the canonical copy; check mode still in CI (§5)?

---

## Guard rails

CI checks that make this standard enforceable rather than aspirational:

- **[php-packaging.GR1]** **Platform-equality check.** Assert `require.php`,
  `config.platform.php`, the analyser's `phpVersion`, and the PHP version CI actually ran all
  agree, and that the production runtime matches (§2.1). Four declarations of one fact, coupled
  by nothing — and one of them exists specifically to suppress the discrepancy.
- **[php-packaging.GR2]** **`composer validate --strict` in every pipeline** (§2.2). Catches a
  manifest edited without re-locking, which is otherwise invisible until a resolve.
- **[php-packaging.GR3]** **`composer install` only** — fail the build if the lockfile would
  change (§2.2).
- **[php-packaging.GR4]** **`--no-dev` boot job.** One CI job installs without dev dependencies
  and starts the application; a production-only resolution or autoload failure fails here
  instead of at deploy (§2.2, §2.5, §3).
- **[php-packaging.GR5]** **Extension-declaration check.** Reconcile extension functions called
  in source against the `ext-*` requirements, and against the deploy image's extension list
  (§2.3).
- **[php-packaging.GR6]** **`allow-plugins` diff gate.** Any change to the plugin allowlist, or
  any new `post-install-cmd`/`post-update-cmd`, requires explicit review — treat it as a
  dependency admission decision, not a config tweak (§2.4).
- **[php-packaging.GR7]** **Style check in CI** in check/dry-run mode, plus the byte-diff of the
  fixer configuration against the canonical copy (§5).
- **[php-packaging.GR8]** **Case-sensitivity check.** Assert every PSR-4 class file's name
  matches its declared class exactly, or run CI on a case-sensitive filesystem (§3).
- **[php-packaging.GR9]** **`composer audit` in every pipeline**, severity-gated to match
  `security.md` §10. Advisory data comes from the Packagist database; a clean run means "no
  known advisory", not "no vulnerability".

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's profile (e.g.
> `<home>/profiles/php-packaging-profile.md`) and fill them there.

**Platform declarations (§2.1) — all four must agree:**

| Declaration | Value | Where |
| --- | --- | --- |
| `require.php` | | `composer.json` |
| `config.platform.php` | | `composer.json` |
| Analyser `phpVersion` | | |
| PHP version CI runs | | |
| PHP version production runs | | |
| Boot-time assertion | | |

**Composer policy (§2.2, §2.4, §2.5):**

| Fact | Value |
| --- | --- |
| Composer version pinned in CI | |
| Install command (CI) | |
| Install command (production image) | |
| `allow-plugins` entries, each with a reason | |
| Install/update scripts that run automatically | |
| Provenance gap accepted? (no Packagist attestation) | |

**Extensions (§2.3):**

| Repo | `ext-*` declared | Deploy image provides | Verified on |
| --- | --- | --- | --- |
| | | | |

**Autoloading (§3):**

| Repo | PSR-4 roots | `files`/classmap exceptions + reason | Optimised autoloader in production? | Runtime class generation? |
| --- | --- | --- | --- | --- |
| | | | | |

**Task vocabulary (§4):**

| Task (chosen name) | Repo A | Repo B | … | Repo-specific extras |
| --- | --- | --- | --- | --- |
| | | | | |

**Style baseline (§5):**

| Item | Canonical location | Fixer + version | Justified divergence |
| --- | --- | --- | --- |
| Style config | | | _none expected_ |
| `strict_types` enforcement rule | | | _cross-ref `php-typing.md` §2.1_ |
