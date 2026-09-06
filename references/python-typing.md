# Python Typing Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-09-06)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs how Python's type annotations are made to mean something: which checker runs, at what
> strictness, what `Any` and `# type: ignore` are allowed to do, and where data is parsed rather
> than asserted. The core idea: **a Python annotation is a comment until a checker is configured
> to disbelieve it and CI is configured to fail on it** — and every default in the ecosystem
> ships that checker turned down.

---

## 0. Scope — when this standard applies

Applies to any Python code in the assumed workspace shape (`_authoring.md` rule 3) — and to any
Python codebase; the multi-repo notes apply only where there is more than one repo.

This standard owns: **Python** checker selection and strictness, the `Any` / `cast` /
`# type: ignore` policy, runtime validation at trust boundaries, closed-set derivation and
exhaustiveness, and the constructs where runtime behaviour diverges from what the checker proved.

It does NOT cover:

- **TypeScript** compiler strictness and cast policy → `type-safety.md`. Siblings, not overlapping:
  lane ownership is keyed by subject **and language** (`_authoring.md` § Library index).
- Interpreter floors, dependency resolution, lockfiles, the task runner, `ruff` as a formatter,
  and project layout → `python-packaging.md`.
- What must be **tested** → `testing.md`.
- The API spec as source of truth and the regeneration workflow → `api-contracts-and-codegen.md`.
- Env-var parsing at boot → `config-and-environment.md`.
- Deserialization of attacker-influenced data → `security.md` §5.7; `assert` as a security
  control → `security.md` §5.8. The *typing* half of both is `python-typing.md` §5 and
  `python-typing.md` §4.4 here.
- Reason strings on suppression directives → `comment-standard.md` §3.1.

**Evidence basis, stated plainly.** The TypeScript masters here are distilled from audits of a
production workspace; **this one is not.** It is anchored to documented interpreter and tool
behaviour and to named external standards — every behavioural claim below was **run** and its
output quoted. No audit finding is claimed that does not exist.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-09-06;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| CPython | **3.14** current (released 2025-10-07, security-fix EOL 2030-10). **3.10 reaches EOL 2026-10** — a floor citing it certifies an unsupported interpreter. 3.15 is scheduled 2026-10-01. Version floors are `python-packaging.md` §2.1's lane |
| mypy | **2.3.1**. **2.0 changed two defaults** — `--local-partial-types` and `--strict-bytes` — and *redefined* a third flag: `--allow-redefinition` now means what `--allow-redefinition-new` meant (legacy behaviour is `--allow-redefinition-old`). A rule justified against 1.x reasoning may be stated backwards. `check_untyped_defs` default is still **`False`** (§2.3) |
| mypy `--strict` contents | Enables `--disallow-any-generics`, `--disallow-subclassing-any`, `--disallow-untyped-calls`, `--disallow-untyped-defs`, `--disallow-incomplete-defs`, `--check-untyped-defs`, `--disallow-untyped-decorators`, `--warn-redundant-casts`, `--warn-unused-ignores`, `--warn-return-any`, `--no-implicit-reexport`, `--strict-equality`, `--extra-checks`. mypy documents that this list **may change between releases** — pin the mypy version, do not treat `--strict` as a fixed contract |
| Pyright | **1.1.411**. `typeCheckingMode` defaults to **`"standard"`**, not `strict`; the whole `reportUnknown*` family is `"none"` in off/basic/standard and `"error"` only in `strict` |
| Pyrefly (Meta) | **1.2.0**, Production/Stable. A viable third checker; the rule is that *one* is declared, not which |
| ty (Astral) | **0.0.78, Development Status 4 — Beta.** Not a merge gate until it ships a stable line — an alpha checker's silence is not evidence |
| Ruff | **0.16.6** — pre-1.0 and shipping frequently; pin the exact version. `S` = flake8-bandit, `ASYNC` = flake8-async, `PGH` = pygrep-hooks |
| PEP 484 (type hints) | **Final.** Annotations have **no runtime effect** — this is the premise §1 rests on |
| PEP 561 (distributing type information) | **Final.** `py.typed` marker; `<pkg>-stubs` naming |
| PEP 649 (deferred annotation evaluation) | **Final, Python 3.14.** Supersedes PEP 563; changes when annotation expressions are evaluated (§9.2) |
| PEP 695 · 604 · 655 | Type-parameter syntax (**Final, 3.12**); `X \| Y` unions (3.10); `Required`/`NotRequired` for `TypedDict` (3.11) |

---

## 1. Core principle — the gate is off by default

TypeScript's compiler is a gate you must actively disable: since TypeScript 6.0 `strict` is the
compiler default, so `"strict": false` is a line somebody wrote. Python inverts every clause of
that, and the inversion is the reason this standard exists rather than a section in
`type-safety.md`:

1. **Annotations have no runtime effect** (PEP 484). Nothing enforces them unless a separate
   program is run over the source.
2. **No checker runs unless invoked.** There is no `python --check`. A repo with thousands of
   annotations and no CI step has exactly zero type safety.
3. **The default configuration of the two dominant checkers checks far less than it appears
   to.** mypy skips the body of every unannotated function (§2.3); Pyright's default mode
   silences its entire unknown-type family.

So the failure this standard prevents is not "someone wrote a bad cast". It is **a team that
believes it has type coverage because the checker printed no errors.** Green output on
unchecked code is indistinguishable from green output on correct code, and only the
configuration tells them apart.

**Corollary, and it drives §5 and §6:** because the checker is optional and erasable, a Python
type is worth *less* than a TypeScript type at runtime and must be backed by an actual runtime
parse at every trust boundary. Static and runtime validation are not alternatives here.

---

## 2. The checker is the gate

### 2.1 One checker is declared per repo, and CI runs it as its own step

Every repo MUST name exactly one type checker as authoritative, record it in the profile
(Appendix A) with its pinned version, and run it in CI as a **standalone step** — not as a side
effect of a test run, a pre-commit hook, or an editor plugin.

- **An editor is not a gate.** A checker configured only in the IDE reports to the one person who
  has it installed, when they look at the file. Nothing fails, and a contributor without the
  plugin sees a clean repo.
- **Two checkers disagreeing is worse than one.** They differ on inference, narrowing and stub
  handling, so a codebase gated on both converges on whatever both accept. A second may run
  advisory; exactly one **decides**.
- The task-runner name for this step (`typecheck`) is fixed by `python-packaging.md` §4.

### 2.2 The strictness floor is declared, and it is above the tool default

Neither dominant checker's default is an acceptable floor. The floor is:

| Checker | Floor | What the tool default would have given you |
| --- | --- | --- |
| mypy | `strict = true` **plus** `warn_unreachable` and `disallow_any_explicit` — neither is in `--strict` | unannotated bodies unchecked (§2.3); explicit `Any` unrestricted |
| Pyright | `typeCheckingMode = "strict"` | `"standard"`, with the entire `reportUnknown*` family at `"none"` |

- **Pin the checker version alongside the flag set.** mypy documents that `--strict`'s contents
  may change between releases, so "we run `--strict`" is a moving obligation; the profile records
  the version it was verified against.
- Staged adoption is fine — but a deviation is recorded in the profile with an exit plan, never
  silently omitted. Per-module `[[tool.mypy.overrides]]` relaxations are the honest mechanism.
  A `# mypy: ignore-errors` or an `exclude` glob over product code is the same kind of deviation
  and gets the same row.

### 2.3 The invisible function — unannotated code is not checked, it is skipped

**The highest-value rule here.** mypy's `check_untyped_defs` defaults to `False`: the *body* of an
unannotated function is not analysed at all. Demonstrated on mypy 2.3.1:

```python
def unannotated_body_error():
    n = 1                    # inferred int; no Any involved
    return n.upper()         # int has no .upper()

def annotated_body_error() -> str:
    n = 1
    return n.upper()         # the identical defect
```

| Invocation | the error in `unannotated_body_error` | the error in `annotated_body_error` |
| --- | --- | --- |
| `mypy` (default) | **not reported** | reported |
| `mypy --check-untyped-defs` | reported | reported |
| `mypy --strict` | reported | reported (plus the missing annotations) |

The identical defect is invisible in one function and caught in the other; the only difference is
the annotation. A partially annotated codebase has a **coverage hole shaped exactly like its
unannotated portion**, and the checker reports that hole as success.

**A second, independent effect compounds it.** An unannotated *parameter* is implicitly `Any`, so
the body is unfalsifiable even once it is being checked:

```python
def unannotated_params(x):
    return x.whatever_i_like().and_again()   # no error under ANY setting
```

`--strict` catches this only through `no-untyped-def` — the missing annotation itself — never
through the body. So the obligation is **annotate**, not merely "turn on `check_untyped_defs`":
the flag makes bodies visible, and annotations make them checkable. A rule stating only the
first is half a rule.

### 2.4 An untyped dependency leaks `Any` across your own boundary

A third-party package without PEP 561 type information resolves to `Any` at every call site, and
`Any` propagates through inference into code you did own. The repo MUST decide, explicitly, how
untyped imports are handled — and record it:

- Prefer a **typed** dependency, or its official `<pkg>-stubs` / `types-<pkg>` distribution.
- Where neither exists, **wrap it at one module** with honest signatures, so the untyped surface
  has exactly one address (`type-safety.md` §3's containment shape).
- `ignore_missing_imports = true` applied globally is the defect — it silences every dependency,
  including ones that later ship types. Scope it per-module.
- `disallow_any_unimported` (mypy) and `reportMissingTypeStubs` (Pyright) make the leak visible;
  the profile records which are on.

---

## 3. `Any` is banned in new code

- **Zero new `Any`** — explicit or inferred. The legal type for "not known yet" is `object` (accepts
  anything, permits nothing until narrowed) or a `TypeVar`/`Protocol` where the shape matters.
  `Any` is not Python's `unknown`; it is Python's *silence*.
- **Enforce it**: `disallow_any_explicit` (mypy, not in `--strict`), or Pyright `strict`'s
  unknown-type family. Note **`reportAny`/`reportExplicitAny` are basedpyright settings, not
  Pyright settings** — under Pyright they are silently ignored, which reads like enforcement.
- Cheap to keep, expensive to regain: one `Any` poisons every downstream inference, and the blast radius grows until re-enabling strictness means fixing hundreds of sites at once.
- `Any` in a **stub file** you wrote for a third-party package is the one tolerated use: confined to the stub, and the stub is the boundary.

---

## 4. Escape hatches — `cast()`, `# type: ignore`, and `assert`

### 4.1 Every `# type: ignore` carries an error code

A bare `# type: ignore` silences **every** error on that line, present and future. The line
keeps its licence after the original problem is fixed, and the next, unrelated error it hides
is invisible. Write `# type: ignore[arg-type]`; the code names what is being excused.

- Enforce with ruff **`PGH003`**; `# noqa` follows the same rule via **`PGH004`**. Measured over
  582 files from three mature libraries, `PGH003` produced **202 findings in product source**,
  every one a genuine bare directive — the highest-yield mechanical check in this standard.
- The reason string beside the code is `comment-standard.md` §3.1's obligation. Both apply: the
  code says *what*, the reason says *why*.

### 4.2 Unused suppressions are removed, and the checker is what notices

`warn_unused_ignores` (inside mypy `--strict`) reports an ignore whose error no longer occurs.
Leave it on: a suppression that has outlived its cause is a standing licence to break the line,
and nothing else will ever mention it again.

### 4.3 `cast()` is an unproven claim

`typing.cast()` has **no runtime effect whatsoever** — it returns its argument unchanged and
exists solely to lie to the checker. Policy, in order of preference:

1. **Prefer proof**: `isinstance` / `is None` narrowing, a `TypeGuard` / `TypeIs` function, a
   structural `Protocol`, or a runtime parse (§5).
2. **A justified `cast()` carries a one-line reason** on the same or preceding line — the same
   contract as suppression directives (`comment-standard.md` §3.1). Legitimate reasons are real
   but rare: a library's stubs lag its runtime; an invariant the type system cannot express.
3. **The repeated cast is a missing helper.** The same structural `cast()` at two call sites
   means a named type or a typed accessor was never written. Write it once.

### 4.4 `assert` is not a narrowing device

Checkers narrow on `assert isinstance(x, Foo)`, which makes it a tempting one-liner. **`assert`
is removed entirely under `python -O`** — verified: a function whose only gate is
`assert user_is_admin` returns its privileged result under `-O`. The narrowing disappears and the
code that depended on it remains.

Narrow with a real conditional that raises (`if not isinstance(x, Foo): raise TypeError(...)`).
`assert` is legitimate for **test assertions** and internal invariants whose loss under `-O` is
acceptable — never for validating input, and never for an authorization decision, which is
`security.md` §5.8's lane.

---

## 5. Parse, don't assert — trust boundaries

A **trust boundary** is anywhere data enters the process from outside the checker's view: HTTP
request and response bodies, env vars, queue/job payloads, webhook payloads, file and object
reads, schema-less database fields, and cross-service messages.

- **Every trust boundary MUST be runtime-validated, and the static type MUST come from the same
  artifact** (e.g. a Pydantic model, an `attrs` class, a `msgspec` Struct) — one declaration
  yields both the runtime check and the static type, so they cannot drift. Stronger here than in
  TypeScript for §1's reason: the static half is erasable, so the runtime half is the only one
  present when the bad payload arrives.
- **`TypedDict` is not validation.** `json.loads(body)` returns `Any`; annotating or `cast()`ing
  the result to a `TypedDict` asserts exactly the facts a boundary cannot guarantee, and the
  checker then reasons confidently about keys that are not there.
- **One validation mechanism per codebase.** Hand-rolled `isinstance` ladders beside a schema
  library is the two-idioms failure `type-safety.md` §5 names — the hand-rolled side is verbose,
  incomplete, and typed by a class the checks do not provably match.
- **Env vars are a boundary**: parse once at boot into a typed settings object; nothing else
  reads `os.environ` (`config-and-environment.md` §2.1, whose GR1 names the Python form).
- Validate at the boundary, then **trust inward.** Re-validating the same payload at every layer
  duplicates the schema and re-creates the two-sources problem (§6).

---

## 6. Closed sets are written once and checked exhaustively

- **Write the members once** as an `enum.StrEnum` (3.11+) or a `Literal[...]` alias, and derive
  everything else — the database constraint, the serializer's choices, the API spec's enum —
  from that one declaration. Never hand-write the union, the DB enum and the spec enum as three
  parallel literals; two of the three will outlive an edit to the third and nothing reports it.
- **Make adding a member break every site that must handle it.** End a `match` (or the final
  `else`) with `typing.assert_never(value)`: the checker then errors at every dispatch site the
  moment a member is added. This is `type-safety.md` §6's `never`-typed `switch` default in
  Python, and the only construct in the language that turns an omission into a checker failure
  rather than a silent fall-through.
- A `dict[MyEnum, Handler]` lookup table gets the same treatment: annotate it so a missing key
  is a checker error, not a `KeyError` in production.
- Which value crosses a repo seam and under what contract is
  `api-contracts-and-codegen.md`'s lane; this section owns the in-repo derivation shape.

---

## 7. Generated types and stubs are build output

- **NEVER hand-edit a generated model or client.** The next regeneration silently reverts it and
  the fix evaporates with no error. Fix the spec and regenerate — workflow and staleness CI are
  `api-contracts-and-codegen.md`'s lane.
- **Consume generated types through one facade module per repo**, so a regeneration that renames
  internals breaks one file rather than fifty.
- **A hand-written stub (`.pyi`) lies by construction once it drifts** — it claims a shape the
  checker cannot verify against the real package. Record each one in the profile with the package
  version it was written against; a stub with no recorded version is unmaintainable.
- Generated files are excluded from lint and from `Any`-counting; they are measured at the spec.

---

## 8. Exceptions carry their cause

- **`except` blocks that re-raise MUST chain**: `raise NewError(...) from err`. Dropping the
  cause discards the stack that explains the failure, and the incident is then debugged from a
  traceback whose top frame is the handler. Enforce with ruff **`B904`**; measured at **77
  findings in product source** across the three-library fixture set, so this is a real and
  common omission, not a theoretical one.
- **Never `except Exception:` (or bare `except:`) around a block whose failure modes you have not
  enumerated** — it turns an unknown failure into a silent one (`observability.md` §2's
  silent-degradation ban, in its Python form).
- **Narrow through shared helpers, not inline `isinstance` chains.** Where a client normalises
  every failure into one exception type, export that type and annotate every handler with it.

---

## 9. What the checker proves is not what runs

The constructs below are correct to the checker and wrong at runtime. They belong in this
standard because in each one the checker's silence is the trap.

### 9.1 A mutable default argument is created once, at definition time

`def f(items: list[str] = [])` binds **one** list for the life of the process, shared by every
call that omits the argument. Under concurrency it is shared mutable state nobody declared. The
annotation is correct and the behaviour is still wrong. Use `None` and construct inside, or
`dataclasses.field(default_factory=...)`. Enforce with ruff **`B006`**.

### 9.2 A type read at runtime must be importable at runtime

PEP 649 (Final, 3.14) evaluates annotations on access rather than at definition. Most code never
notices; **code that introspects `__annotations__` does** — validation and injection frameworks
build their schemas that way, so a forward reference or a name imported only under
`if TYPE_CHECKING:` satisfies the checker and fails when the framework resolves it. A type such a
framework consumes MUST be importable at runtime.

### 9.3 Import time is execution time

A module-level call runs on import — inside the test collector, and inside any tool that imports
for introspection (a plugin loaded by entry point, a stub generator in inspect mode). A type
checker does **not** execute it, which is why the checker is no defence here. Module-level I/O, network calls, client construction and environment
reads therefore run in contexts never meant to run them, and an import cycle makes them
order-dependent: passing locally, failing in production. Keep module scope to definitions and
cheap constants.

### 9.4 `open()` has no fixed default encoding, and the default changes in 3.15

`open(path)` and `Path.read_text()` decode using the *locale's* encoding unless `encoding=` is
passed — the checker sees a correct call and the bytes depend on the machine. Verified on 3.13:
`io.text_encoding(None)` returns `'locale'` and `sys.flags.utf8_mode` is `0`, so a file written
as UTF-8 on a developer's machine can decode differently on another host: a `UnicodeDecodeError`
in production from code CI never failed, or silent mojibake.

**PEP 686 is Final for Python 3.15**, enabling UTF-8 mode by default so "Python consistently uses
UTF-8 for default encoding of files, stdio, and pipes" — landing within weeks of this revision,
changing every un-annotated `open()`, mostly toward the *correct* result, which is why nobody
will notice.

**Pass `encoding=` explicitly at every text I/O call.** Correct before 3.15 and after, and the
only form whose behaviour does not depend on the interpreter and host. For bytes, say binary.

---

## Failure shapes

Named patterns to recognise and cite in review:

1. **The invisible function.** A defect inside an unannotated body, reported by nothing, in a
   repo whose CI shows a clean type check (§2.3).
2. **The green wall.** A checker in the pipeline at its tool default, so the pipeline proves
   only that the code parses (§2.2).
3. **The blanket ignore.** `# type: ignore` with no code, still on the line years after its cause
   was fixed, now hiding something else (§4.1).
4. **The `-O` hole.** Validation or authorization written as `assert`, absent from the optimised
   deploy (§4.4).
5. **The asserted payload.** `json.loads(...)` annotated as a `TypedDict`; the checker reasons
   confidently about keys nobody verified (§5).
6. **The untyped island.** One global `ignore_missing_imports = true`, and `Any` spreading out of
   every third-party call site (§2.4).

---

## Checklist

Before committing:

- [ ] Every new or edited function fully annotated — parameters **and** return (§2.3) — with zero
      new `Any`, explicit or inferred from an untyped import (§3, §2.4)?
- [ ] Every new `# type: ignore` / `# noqa` carries an error code **and** a reason (§4.1), and
      every new `cast()` a one-line reason — and is not the second copy of the same cast (§4.3)?
- [ ] No `assert` used for validation, narrowing that must survive, or authorization (§4.4)?
- [ ] Every value entering from outside is parsed by a schema whose type comes from the same
      declaration — not annotated or `cast()` into shape (§5)?
- [ ] Any new closed set written once, with `assert_never` at its dispatch sites (§6)?
- [ ] Exceptions re-raised with `from` (§8); no new mutable default argument and no new
      module-level I/O (§9.1, §9.3); every new text I/O call passes `encoding=` (§9.4)?
- [ ] The repo's checker passes at the declared floor — run the task, not the editor (§2.1)?
- [ ] Any new strictness deviation recorded in the profile with an exit plan (§2.2)?

---

## Guard rails

CI checks that make this standard enforceable rather than aspirational:

- **[python-typing.GR1]** **Run the declared checker in CI as its own step**, at the §2.2 floor,
  over product code **and** tests — fails shapes 1–2 at the pull request. A baseline for legacy
  debt is permitted only if it is ratchet-only and its size is printed every run; a baseline
  nobody watches shrink is a permanent exemption.
- **[python-typing.GR2]** **Ruff at the shipped baseline** (`checks/ruff/eng-rulebook-base.toml`)
  with `PGH003`/`PGH004` at error — §4.1, and the highest-yield check here (202 true positives
  per 582 files in validation).
- **[python-typing.GR3]** **`warn_unused_ignores` on** (inside mypy `--strict`) so a suppression
  that has outlived its cause fails the build rather than accumulating (§4.2).
- **[python-typing.GR4]** **Annotation-coverage floor, ratchet-only.** Report the count of
  functions the checker skipped and fail on an increase — the only mechanical measure of §2.3.
- **[python-typing.GR5]** **Ruff `B904` and `B006` at error** — exception chaining (§8) and mutable
  defaults (§9.1); both diff-decidable, near-zero false positives in validation.
- **[python-typing.GR6]** **Fail CI on a stale or hand-edited generated model** — regenerate and
  diff (owned by `api-contracts-and-codegen.md`; here because it is this standard's §7).
- **[python-typing.GR7]** **Semgrep `checks/semgrep/python-typing.yaml`** — bans `cast(Any, …)`
  and surfaces every other `cast()` for a human to read its reason. Judgement-assisted, not a ban;
  the rule's message says so.

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's profile (e.g.
> `<home>/profiles/python-typing-profile.md`) and fill them there.

**Declared checker and strictness floor (§2.1, §2.2) — one authoritative checker per repo:**

| Repo | Checker + pinned version | Config file | Floor (`strict` + extras) | Runs in CI as its own step? |
| --- | --- | --- | --- | --- |

**Deviations from the floor (§2.2) — each needs a justification and an exit plan:**

| Repo | Module / glob | Relaxation | Why | Exit plan / date |
| --- | --- | --- | --- | --- |

**Untyped dependencies and hand-written stubs (§2.4, §7) — a stub with no recorded package
version is unmaintainable:**

| Dependency | Typed? (`py.typed` / stubs / neither) | Handling (stubs pkg / wrapper / per-module ignore) | Wrapper or `.pyi` location | Version the stub was written against |
| --- | --- | --- | --- | --- |

**Boundary schemas (§5) — where each trust boundary is parsed:**

| Boundary | Schema/model location | Library | Type derived from it? |
| --- | --- | --- | --- |
| e.g. env, HTTP bodies, queue payloads, webhooks | | | |

**Narrowing helpers, normalised error types, and the annotation-coverage baseline
(§4.3, §8, GR4) — the helpers are what agents use instead of minting cast site #31; the
baseline is ratchet-only:**

| Repo | Helper / type + location | Skipped-function count | Recorded on | Direction |
| --- | --- | --- | --- | --- |
