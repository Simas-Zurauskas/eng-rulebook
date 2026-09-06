# Python Packaging & Toolchain Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-09-06)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs the Python side of a repo's toolchain surface: interpreter floor, project manager and
> lockfile, virtual-environment discipline, the task vocabulary, formatter/linter baseline,
> project layout, and what a built artifact is allowed to assume about the machine that runs it.
> The core idea: **Python's packaging metadata declares almost nothing and enforces less** —
> every uniformity property this library relies on has to be re-created deliberately, because
> nothing in the format will fail when it is absent.

---

## 0. Scope — when this standard applies

Applies to any Python repo in the assumed workspace shape (`_authoring.md` rule 3). This
standard owns **what the Python toolchain surface is**; `tooling-and-workspace.md` owns **that
the same surface exists in every repo** — the cross-repo uniformity mechanism (§9 there), the
repo inventory, generated directories and CI parity as workspace properties. Read that one for
the *why it must match*, this one for the *what it is in Python*.

It does NOT cover:

- Checker selection, strictness, `Any` policy → `python-typing.md`.
- **Dependency admission** — release-age cooldown, provenance verification, install-time script
  execution, internal-namespace reservation and index pinning → `supply-chain-and-build-integrity.md`
  §2. That standard owns *what may enter the tree*; this one owns *how the tree is resolved and
  installed reproducibly*.
- Cross-repo uniformity enforcement and the repo inventory → `tooling-and-workspace.md`.
- Env-var parsing and boot guards → `config-and-environment.md`.
- What tests contain → `testing.md`.

**Evidence basis, stated plainly.** Like `python-typing.md`, this standard is anchored to
documented tool behaviour and named external standards rather than to this library's audit
corpus, which is TypeScript. Behaviours cited below were verified against the tool versions in
the anchor table.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-09-06;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| CPython release cycle | **Living schedule.** At verification: **3.14** current (2025-10-07); 3.13 in bugfix; 3.12, 3.11 security-only; **3.10 EOL 2026-10**; 3.15 scheduled 2026-10-01. §2.1's floor is checked against the published schedule, never from memory |
| PEP 621 (`[project]` metadata) | **Final.** The standard home for project metadata in `pyproject.toml` |
| PEP 517 / 518 (build backends, `[build-system]`) | **Final** |
| PEP 751 (`pylock.toml`) | **Final, accepted 2025-03-31.** A standardised, tool-agnostic lockfile format. Producers at verification: uv, pip (experimental), PDM. It is an **interchange/export** format — uv still uses `uv.lock` as its native project lockfile |
| PEP 735 (`[dependency-groups]`) | **Final**, resolved 2024-10-10. Non-published dependency groups, distinct from `[project.optional-dependencies]` extras |
| uv | **0.12.10** — **pre-1.0**; pin the exact version. Default `index-strategy` is **`first-index`**, which uv's own documentation states is intended "to prevent 'dependency confusion' attacks"; `unsafe-best-match` is documented as "the closest to pip's behavior" and as exposing that risk |
| Ruff | **0.16.6** — **pre-1.0**; pin the exact version. Single binary providing both `ruff check` and `ruff format` |
| pip | Resolves across all configured indexes by best match, which is the behaviour uv labels `unsafe-best-match`. `--require-hashes` forces every requirement to carry a hash and to be fully pinned |
| PyPI Trusted Publishing | OIDC-based, no long-lived token |
| PEP 740 (index attestations) | PyPI publishes Sigstore-backed digital attestations |
| PyPI release-freeze policy | **Live since 2026-07-22** — PyPI rejects new file uploads to releases older than 14 days, closing the poison-a-stable-release path |
| Named incident | The **LiteLLM / Telnyx PyPI compromises**, PyPI incident report **2026-04-02**. Cited as the incident shape behind §2.3 and the cooldown rule in `supply-chain-and-build-integrity.md` §2.1 |

---

## 1. Core principle — the format declares almost nothing

Every rule in `tooling-and-workspace.md` rests on a manifest that can be *checked*: a
`package.json` declares its package manager, its engine floor, and a named script vocabulary,
and a CI job can assert all three with `jq`. Python's `pyproject.toml` has an equivalent for
**one** of those — the interpreter floor — and even that is advisory.

Concretely, and each one is a rule below:

| Property | Node manifest | Python manifest |
| --- | --- | --- |
| Which package manager | `packageManager` field | **nothing** |
| Runtime floor | `engines.node` | `requires-python` — **checked at install, not at run** |
| Task vocabulary | `scripts` block | **nothing** |
| Dependency isolation | `node_modules/` is local by default | **global by default**; isolation is opt-in |

So the Python failure is not drift between repos that each declared something different. It is
**absence**: no field was wrong, because no field exists. A reviewer looking for the deviation
finds nothing to look at, and the audit finding is a hole rather than a mismatch. Every rule
below therefore creates a declaration that the format does not require, and pairs it with the
check that makes the declaration true.

---

## 2. Interpreter, manager, and reproducible install

### 2.1 `requires-python` is declared in every repo, is the same value, and is true of CI and production

- The floor MUST name a version line that is **still supported** on the published CPython
  schedule. A floor of `>=3.10` after October 2026 certifies an interpreter that receives no
  security fixes — worse than no floor, because it reads as a decision.
- **`requires-python` is enforced at install time, not at run time.** An installer refuses to
  install the project on an out-of-range interpreter; nothing stops an already-installed tree,
  or a container that copied a site-packages directory, from running on one. The floor is a
  resolution constraint, not a runtime guard — so CI MUST also assert the interpreter version
  it actually ran.
- The value MUST match `ruff`'s `target-version` (§5.2) and the checker's `python_version`.
  **One coupling is free and the other is not:** ruff *derives* `target-version` from
  `requires-python` when it is unset (verified — `>=3.9` suppresses the `X | Y` rewrite that
  `>=3.12` triggers), so leaving it unset is the correct configuration. The checker's
  `python_version` is coupled to nothing and must be asserted.

### 2.2 One project manager per workspace, declared where a human and a script can both find it

There is no `packageManager` field. The manager MUST therefore be declared in **two** places
that stay honest: the profile (Appendix A), and a committed, executable form — a pinned version
in the CI workflow and, where the manager supports it, a project-level pin
(e.g. uv's `required-version`).

- Mixing managers produces two lockfile formats and two resolution algorithms describing "the
  same" tree — the canonical works-on-my-machine install.
- Because the declaration is not machine-readable from the manifest, the **foreign-lockfile
  tripwire is the primary control here**, not a secondary one as it is in Node
  (`tooling-and-workspace.md` §2.4). CI fails if a lockfile belonging to another manager, or a
  stray `requirements.txt` outside its declared role, appears anywhere in the repo.

### 2.3 The lockfile is committed, and CI installs from it without resolving

`tooling-and-workspace.md` §2.2 owns the obligation; this is its Python form.

- Commit the manager's native lockfile. CI installs with the manager's **no-resolve** mode
  (e.g. uv's `--frozen`, which installs from the lockfile without checking it against
  `pyproject.toml`, or `--locked`, which fails if the lockfile is out of date — prefer
  `--locked` in CI, because it also catches a manifest edit nobody re-locked).
- **`pip install -r requirements.txt` is not a locked install.** Without `--require-hashes` it
  accepts whatever the index serves for a matching specifier, including a version published
  after the file was written. Where pip is the installer, `--require-hashes` is the rule, and
  it forces full pinning as a side effect.
- **PEP 751 `pylock.toml` is the interchange format, not necessarily the working one.** Export
  to it where another tool must consume the resolution; do not maintain it by hand alongside a
  native lockfile, or you have two sources for one fact.
- Which versions are *allowed* into that lockfile — cooldown, provenance, typosquat distance,
  index pinning — is `supply-chain-and-build-integrity.md` §2's lane, and it is not optional
  because a lockfile exists. Reproducibility is not integrity.

### 2.4 Development dependencies are declared as dependency groups, not as extras

`[dependency-groups]` (PEP 735) is invisible to consumers of the published package;
`[project.optional-dependencies]` extras ship with it and become part of its public surface. A
test runner or linter declared as an extra is a dependency your users can install, and one you
cannot remove without a breaking change.

---

## 3. The interpreter a repo runs is isolated, and the isolation is checked

Python installs into a **global** environment unless told otherwise — the opposite of
`node_modules/`. Every failure mode below comes from that default:

- **Every repo has its own virtual environment**, created from the declared interpreter, and it
  is **gitignored**. Never install project dependencies into the system or Homebrew interpreter:
  the next project's incompatible pin silently changes this project's resolved tree, and neither
  project's lockfile records what happened.
- **Every task runs inside it.** A task that invokes bare `python`, `pip` or `pytest` resolves
  against whatever is first on `PATH` — which is the developer's shell state, not a declared
  fact. Invoke through the manager (`uv run …`) or an explicitly-pathed interpreter.
- **CI is not exempt.** A CI job that `pip install`s into the runner's system interpreter is
  reproducible only for as long as the runner image is; the image is not part of your lockfile.

---

## 4. The task vocabulary has to be built, because the format has none

`pyproject.toml` has no `scripts` block. `tooling-and-workspace.md` §3 requires the same named
tasks in every repo; in Python that requires **choosing a runner first** and recording it.

- **Pick exactly one runner** for the workspace — the project manager's own task support, or a
  dedicated one (e.g. `nox`, `tox`, `just`, `make`) — and record the choice, with its version,
  in the profile. Two runners in one workspace means two answers to "how do I run the tests".
- **Implement the same task names in every repo**, even where a task is trivial:

| Task | Contract |
| --- | --- |
| `dev` | Run the service locally |
| `build` | Produce the distributable artifact (wheel/sdist or image input) |
| `typecheck` | Run the declared checker at the declared floor (`python-typing.md` §2.1) |
| `lint` / `lint:fix` | `ruff check` over the whole repo |
| `format` / `format:check` | `ruff format` apply / verify |
| `test` | Run the suite (`testing.md`) |

- **A missing task name is how a repo silently exits the quality loop.** CI templates, agents
  and contributors invoke by name; where the name is absent the repo is *skipped*, not flagged
  — the failure `tooling-and-workspace.md` §3.1 names, and it is sharper here because there is
  no manifest field whose absence a reviewer would notice.
- **`typecheck` MUST be standalone** — never implied by the test run. Coupling a seconds-fast
  gate to a minutes-slow one means nobody runs it locally, and it disappears the day someone
  disables it for speed.

---

## 5. One linter, one formatter, one config

### 5.1 One ruff configuration, byte-identical across repos

`tooling-and-workspace.md` §4.1 owns the obligation and the reason it is stated as
byte-identical. Python-specific: **one tool covers both halves** — `ruff check` and
`ruff format` read the same `[tool.ruff]` table — so there is a single canonical file to diff
rather than a formatter config and a linter config that can drift apart. Name it in the profile;
a divergence is a recorded row, not a local edit.

### 5.2 `target-version` tracks `requires-python`, and drift between them is silent

Ruff's `target-version` decides which syntax and which auto-fixes are valid. **Leave it unset**:
ruff then derives it from `requires-python` and the two cannot disagree. Set explicitly and below
the floor it suppresses fixes the project could use; set above, it can rewrite code into syntax
the floor cannot parse — with nothing reporting the mismatch. Assert equality in CI either way
(GR3), because the checker's `python_version` is not derived and can still drift.

### 5.3 The security rule set is selected deliberately, and its limits are stated

Ruff's `S` rules are a port of flake8-bandit. They are **single-file AST patterns**: they cannot
trace a value from a request handler through a service layer into a query, so they find the
dangerous *call* and never the dangerous *dataflow*. Treat them as a floor that catches the
obvious form, and do not present them as application security coverage — the honest description
is in `checks/README.md` § What is deliberately NOT here.

The shipped baseline is `checks/ruff/eng-rulebook-base.toml`. Rules were selected by measurement,
not by taste: several plausible families (relative-import bans, `os.path`→`pathlib` migration,
naive-datetime detection, blanket `assert` and hardcoded-password heuristics) were **excluded**
after producing hundreds of findings on idiomatic, correct code in validation. Adding them back
is a project decision, recorded in the profile.

---

## 6. Layout — the import path is a runtime fact, and a flat layout lies about it

Use a **`src/` layout**: the importable package lives under `src/`, not at the repo root.

The failure a flat layout produces is specific and easy to miss: with the package directory at
the repo root, `python` run from that root puts the *source tree* on `sys.path`, so imports
resolve against the working copy whether or not the package was correctly installed. Tests then
pass against a tree that a real installation would not reproduce — a missing `__init__.py`, a
data file absent from the wheel, a module excluded by the build backend's file selection. The
`src/` layout makes the test run import the **installed** artifact, so packaging defects fail in
CI instead of at the first deploy.

**The layout is also a supply-chain control, which is the half most teams miss.** `sys.path[0]`
is the *script's own directory*, so a `logging.py`, `secrets.py` or `types.py` sitting in the repo
root — or in whatever directory a job happens to run from — **shadows the standard library for the
whole process**. No lockfile catches it, no dependency scanner sees it, and the failure is
arbitrary: a stdlib call silently resolves to local code. `src/` layout removes the repo root from
the import path; invoking through `python -m` and setting `PYTHONSAFEPATH=1` in CI and in
containers closes the remaining cases.

- Record which directories are **generated** (protobuf output, generated clients, compiled
  translations), from what inputs and by what command, in the profile. Output is not
  distinguishable from source by inspection (`tooling-and-workspace.md` §6.3).

---

## 7. A built artifact declares what it needs from the machine that runs it

- **A wheel with compiled extensions is platform-specific, and the platform is part of the
  artifact contract.** Interpreter version, ABI, OS and CPU architecture are all encoded in the
  wheel tag for a reason. Building on one architecture and deploying to another produces an
  import failure at process start — the `tooling-and-workspace.md` §7.3 crash-loop shape, and
  more likely in Python because compiled dependencies are ordinary, not exceptional.
- **Assert the build platform before packaging.** Where the artifact bundles a resolved
  environment (a container layer, a zipped virtualenv, a vendored wheel set), the build script
  asserts its own interpreter version and architecture against the declared deploy target and
  fails loudly rather than shipping an artifact that cannot import.
- **Declare non-Python system dependencies.** A wheel that links a system library needs that
  library present at runtime; nothing in the Python metadata says so. Record each one in the
  profile against the image that provides it.
- **`--only-binary` where you can.** Installing from an sdist executes the project's build
  backend — arbitrary code, at install time, with the installing machine's credentials. This is
  the Python form of the install-script surface that
  `supply-chain-and-build-integrity.md` §2.4 governs; that standard owns the policy, this note
  names the Python mechanism.

---

## 8. CI parity

Every repo runs `typecheck` + `lint` + `format:check` + `test` on every change, from a clean
checkout, installing from the lockfile without resolving (§2.3), on the declared interpreter
(§2.1). A repo whose CI runs fewer gates than its siblings has exited the quality loop exactly
as in §4 — and usually *because* of §4, since CI invokes the tasks by name.

## 9. The interpreter's execution model changed in 3.14, and the profile must say which one you run

Two defaults moved in the version this standard anchors as current, and neither announces itself:

- **Free-threaded builds are officially supported (PEP 779).** The same source now runs under
  either a GIL build or a free-threaded one, and the build is a property of the *interpreter*, not
  of your code. Anything that relied on the GIL for the atomicity of `+=`, a dict mutation, or a
  check-then-act sequence is racy on a free-threaded build and correct on the other. "We are on
  CPython" no longer implies serialisation.
- **`forkserver` replaced `fork` as the default multiprocessing start method on Unix platforms
  other than macOS.** Children no longer inherit module-level state — warmed connection pools,
  loaded models, open file descriptors. Code that silently depended on `fork` semantics breaks on
  upgrade with no diagnostic. (Relatedly, `os.fork()` in a multi-threaded process has emitted a
  `DeprecationWarning` since 3.12; a threaded process that forks was always undefined behaviour
  and is now saying so.)

**The profile declares the build and the start method per deployable**, and CI runs the same
combination the deploy target does. A rule about concurrency is undecidable without that
declaration, which is why it sits in this standard rather than in a concurrency lane.

---

## Failure shapes

Named patterns to recognise and cite in review:

- **The undeclared manager.** No field says which tool owns the tree; two developers use two,
  and the second lockfile appears in a feature branch with nobody able to say it is wrong (§2.2).
- **The unlocked install.** `pip install -r requirements.txt` in CI without `--require-hashes`:
  a build that resolves fresh every run and tests a tree nobody pinned (§2.3).
- **The system interpreter.** Dependencies installed globally; the resolved tree depends on
  which project was set up last (§3).
- **The missing task.** No `typecheck` task, so the CI template's typecheck step was never
  added, so the repo has no type gate and nothing said so (§4).
- **The silent target drift.** `target-version` and `requires-python` disagree; fixes are
  applied for a syntax the floor cannot parse (§5.2).
- **The flat-layout pass.** Tests green against the working copy, ImportError against the built
  wheel, discovered at deploy (§6).
- **The wrong-tag wheel.** Compiled extension built for the CI architecture, deployed to
  another: import failure at process start (§7).
- **The extra that shipped.** A test-only dependency declared as an extra, now part of the
  published package's surface (§2.4).

---

## Checklist

Before merging a change that touches dependencies, tooling, layout, or CI:

- [ ] `requires-python` present, uniform, on a still-supported line, and equal to `ruff`'s
      `target-version` and the checker's `python_version` (§2.1, §5.2)?
- [ ] Manager unchanged, and no foreign lockfile or stray requirements file introduced (§2.2)?
- [ ] Lockfile updated and committed; CI still installs with `--locked`/`--frozen` or
      `--require-hashes` (§2.3)?
- [ ] New dev-only dependency declared in `[dependency-groups]`, not as an extra (§2.4)?
- [ ] Every task still runs through the manager/runner, never bare `python`/`pip` (§3)?
- [ ] Full task vocabulary present in every repo touched — including a standalone
      `typecheck` (§4)?
- [ ] Lint/format config still byte-identical to the canonical copy (§5.1)?
- [ ] New generated directory recorded in the profile with its inputs and command (§6)?
- [ ] Artifact bundles compiled extensions? Build interpreter/ABI/arch asserted against the
      deploy target (§7)?
- [ ] CI for this repo still runs typecheck + lint + format-check + test (§8)?

---

## Guard rails

CI checks that make this standard enforceable rather than aspirational:

- **[python-packaging.GR1]** **Foreign-lockfile tripwire.** Fail if a lockfile belonging to a
  manager other than the declared one, or an undeclared `requirements*.txt`, appears anywhere
  (§2.2). Load-bearing here in a way it is not in Node — it is the *only* mechanical statement
  of which manager owns the tree.
- **[python-packaging.GR2]** **Locked installs only.** CI installs with the manager's no-resolve
  mode, or with `--require-hashes`; fail if the lockfile would change (§2.3).
- **[python-packaging.GR3]** **Version-triple equality check.** Assert `requires-python`,
  `ruff`'s `target-version` and the checker's `python_version` agree, and that the interpreter
  CI actually ran satisfies the floor (§2.1, §5.2). Four declarations of one fact, coupled by
  nothing in the format.
- **[python-packaging.GR4]** **Task-vocabulary check.** Assert the required task names resolve
  in every repo — the Python analogue of the `jq` script check in
  `tooling-and-workspace.md` GR2, and it must interrogate the chosen runner rather than a
  manifest field, because there is no field (§4).
- **[python-packaging.GR5]** **Lint/format config drift check.** Byte-diff each repo's ruff
  configuration against the canonical copy (§5.1).
- **[python-packaging.GR6]** **Ruff at the shipped baseline** — `checks/ruff/eng-rulebook-base.toml`,
  with `ruff format --check` as a separate step (§5.3).
- **[python-packaging.GR7]** **Build-platform assertion.** Before packaging an artifact that
  bundles compiled extensions, the build script asserts its own interpreter version, ABI and
  architecture against the declared deploy target (§7).
- **[python-packaging.GR8]** **`src/`-layout test run.** The suite runs against the **installed**
  package, not the working tree, so a packaging defect fails in CI (§6).

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's profile (e.g.
> `<home>/profiles/python-packaging-profile.md`) and fill them there.

**Interpreter and manager (§2.1, §2.2):**

| Fact | Value |
| --- | --- |
| `requires-python` (uniform value) | |
| Interpreter CI actually runs / where asserted | |
| Interpreter production runs | |
| Project manager (name@pinned version) | |
| Where the manager pin is enforced | |

**Lock and install policy (§2.3):**

| Repo | Lockfile | CI install command | `pylock.toml` exported for? |
| --- | --- | --- | --- |
| | | | |

**Task runner and vocabulary (§4) — one runner, then presence per repo:**

| Runner (name@version) | Decided on |
| --- | --- |
| | |

| Task (chosen name) | Repo A | Repo B | … | Repo-specific extras |
| --- | --- | --- | --- | --- |
| | | | | |

**Lint / format baseline (§5):**

| Item | Canonical location | Sync mechanism | Justified divergence |
| --- | --- | --- | --- |
| Ruff config | | | _none expected_ |
| Rule families added beyond the shipped baseline | | | |
| Rule families suppressed from the baseline | | | _each needs a reason_ |

**Generated directories (§6):**

| Repo | Generated dir | Inputs | Regeneration command | Consumed by |
| --- | --- | --- | --- | --- |
| | | | | |

**Artifact and platform contract (§7):**

| Repo | Bundles compiled extensions? | Build (py/ABI/arch) | Deploy (py/ABI/arch) | System libraries required | Image providing them |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

**CI parity (§8):**

| Repo | Gates run on every change | Install mode | Interpreter |
| --- | --- | --- | --- |
| | | | |

**Execution model (§9) — a concurrency rule is undecidable without this:**

| Deployable | Interpreter build (GIL / free-threaded) | multiprocessing start method | Same combination in CI? |
| --- | --- | --- | --- |
| | | | |
