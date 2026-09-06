# PHP Typing & Static Analysis Standard

> **Type:** Generic, reusable standard · **Rev:** 1 (2026-09-06)
> **Audience:** AI agents and humans writing or reviewing code.
> **Status:** Part of the eng-rulebook library, bundled in the `eng-rulebook` skill (references/).
>   Loaded on demand via the skill's routing table (SKILL.md).
>
> Governs how PHP's type declarations are made to hold: the `strict_types` declaration and why
> it must be universal, the static analyser and the level it runs at, `mixed` and suppression
> policy, runtime parsing at boundaries, and comparison semantics. The core idea: **PHP has two
> type gates, both are off by default, and the first is scoped per file — governing *arguments*
> at the call site and *returns* at the declaration site, so no single file controls both.**

---

## 0. Scope — when this standard applies

Applies to any PHP code in the assumed workspace shape (`_authoring.md` rule 3). This standard
owns: the `strict_types` obligation, static-analyser selection and level, type declarations on
signatures, `mixed` and suppression policy, boundary parsing, closed-set derivation, and
comparison/identity semantics.

It does NOT cover:

- **TypeScript** compiler strictness → `type-safety.md`; **Python** checker configuration →
  `python-typing.md`. Lane ownership is keyed by subject **and language**
  (`_authoring.md` § Library index).
- Composer, autoloading, the task vocabulary, coding-style tooling and PHP version floors →
  `php-packaging.md`; interpreter configuration (`php.ini`, `zend.assertions`, OPcache, FPM) →
  `php-runtime.md`.
- Deserialization of attacker-influenced data (`unserialize`, phar) → `security.md` §5.7, and
  assertions as controls → `security.md` §5.8. The *typing* half of both is `php-typing.md` §4
  and `php-typing.md` §8.1 here.
- Passing caller data to a query engine, a shell or a template → `security.md` §5.9; boundary
  admission → `security.md` §5.1; query shapes → `performance-and-data-access.md`.
- Reason strings on suppression directives → `comment-standard.md` §3.1.

**Evidence basis, stated plainly.** This library's audit corpus is TypeScript; this standard is
anchored to documented and **executed** PHP behaviour and to named external standards. Every
behavioural claim below was run on the interpreter in the anchor table and its output quoted.
No audit finding is claimed that does not exist.

**External anchors** — name + version + status, never URLs. *Anchors verified 2026-09-06;
re-verify anything older than 12 months (`_authoring.md` rule 6).*

| Anchor | Version / status |
| --- | --- |
| PHP | **Living schedule.** At verification: **8.5** (20 Nov 2025) and **8.4** in *active* support; **8.3** and **8.2** security-only; **8.2's security support ends 31 Dec 2026**; 8.1 and earlier are EOL. Behavioural claims below were executed on **8.5.10**. Version floors are `php-packaging.md` §2.1's lane |
| PHPStan | **2.2.13.** Levels **0–10**; **the default level is 0**, and level 0 is close to silent (§2.2). There is no "strict by default" configuration |
| Psalm | **6.16.1.** Equivalent role; `errorLevel` 1 is strictest (its scale runs the opposite direction to PHPStan's, which is a live source of misconfiguration — §2.2) |
| PER Coding Style | **3.1** — "extends, expands and replaces PSR-12". Citing "PSR-12" alone retrieves the 2019 document it supersedes. Style tooling is `php-packaging.md`'s lane; the anchor is here because §2.1's enforcement rides on it |
| PHP RFC: Saner string to number comparisons | Landed in **PHP 8.0** and it **removed** the classic juggling bypasses (§6.2). A rule citing PHP 7 comparison behaviour as current is stating a fact that has been false since 2020 |
| `hash_equals()` | Constant-time string comparison, PHP 5.6+ |
| PHP `assert()` / `zend.assertions` | The shipped `php.ini-production` template sets `zend.assertions = -1`, which compiles assertions **out** — `php-typing.md` §8.1; the obligation is `security.md` §5.8 |

---

## 1. Core principle — two gates, both off, and one scoped to the caller

TypeScript has one gate and it is on by default. PHP has two, and neither is:

1. **`declare(strict_types=1)`** turns coercion into `TypeError` — but the two directions are
   governed by **different files**, which is the part almost everyone gets wrong:
   **argument** coercion follows the file making the **call**; **return** coercion follows the
   file **declaring** the function. Absent, PHP coerces.
2. **A static analyser** (PHPStan, Psalm) is a separate program with a level dial. **PHPStan's
   default level is 0**, and level 0 reports almost nothing.

The second is the familiar shape — a tool turned down. The first is not, and it is the reason
this standard leads with it. Demonstrated on PHP 8.5.10, with `strict_types` declared in the
file that **defines** the function:

```php
// lib.php
declare(strict_types=1);
function addOne(int $n): int { return $n + 1; }
```

| Calling file | `addOne("41")` — an **argument** | `addOne(41.9)` |
| --- | --- | --- |
| no declaration | **`int(42)`** — silently coerced | `int(42)` + *Deprecated: Implicit conversion … loses precision* |
| `declare(strict_types=1)` | `TypeError` | — |

And the other direction — **caller weak in both rows**, `function f(): int { return "42"; }`:
declaring file with `strict_types` → **`TypeError`**, the declaration protected its own return;
without → **`int(42)`**, silently coerced.

Three things follow, and they are §2.1's whole justification:

- **A library file's own declaration protects its returns, not its parameters.** The `int` on
  `addOne`'s *parameter* is enforced by the caller's setting, the one on its *return* by its own:
  half the contract is out of the author's hands.
- **Therefore the obligation is 100 % of files, or it is not a control.** 99 files declaring
  `strict_types` leaves every *argument* boundary crossed from the 100th coercing silently — and
  the coverage is invisible in review, because each individual file looks correct.
- **The diagnostic points at the wrong file.** The float deprecation above is reported against
  `lib.php` line 3 — the declaring file — while the defect is in the caller.

So the failure this standard prevents is a codebase with type declarations everywhere, an
analyser in CI, and no enforcement at the one call site that mattered.

---

## 2. Both gates are switched on, explicitly

### 2.1 `declare(strict_types=1)` is the first statement of every PHP file, enforced mechanically

Not "most files", not "new files". Universal, because §1 shows partial coverage is not partial
protection — it is protection with unmarked holes.

- **A human cannot audit this.** It is one line at the top of every file, absent by default,
  and its absence changes behaviour nowhere near itself. It MUST be enforced by tooling that
  fails the build: a fixer/sniffer rule that requires the declaration
  (e.g. php-cs-fixer's `declare_strict_types`, or a PHP_CodeSniffer sniff), run in CI over
  **every** `.php` file including tests, fixtures and scripts.
- Generated files are the one carve-out, and the generator is fixed instead — a generator that
  emits files without the declaration is producing weak call sites forever.
- **Do not reason from "we have types everywhere".** Type declarations and `strict_types` are
  independent: declarations describe intent, `strict_types` decides whether a violation is an
  error or a coercion.

### 2.2 One analyser, one declared level, run in CI as its own step

Every repo MUST name one static analyser as authoritative, record it with its pinned version and
**level** in the profile, and run it in CI as a standalone step.

**The level is the entire control, and its default is the bottom of the scale.** Demonstrated on
PHPStan 2.2.13 against a file containing an untyped method, an undefined-offset read, and a
method call on an unknown type:

| Level | Output |
| --- | --- |
| **0 — the default** | **`[OK] No errors`** |
| 5 | `Offset mixed does not exist on array{}.` |
| 9 / 10 | `Method Repo::find() has no return type specified.` and `… parameter $id with no type specified.` |

PHPStan's own output states it: *"PHPStan is performing only the most basic checks … the default
and current level is 0."* A project that "has PHPStan" and never wrote a level has a green
pipeline and no analysis.

- **The floor is the analyser's maximum level**, adopted by staged migration where necessary.
  Anything lower is a deviation recorded in the profile with an exit plan.
- **The two common analysers number their scales in opposite directions** — PHPStan 0 is
  weakest and 10 strongest; Psalm's `errorLevel` 1 is *strictest* and 8 weakest. A team moving
  between them, or copying a config from a blog, can configure the exact opposite of what they
  intended and see a green build. State the tool **and** the number, always together.
- The task name for this step (`typecheck`) is fixed by `php-packaging.md` §4.

### 2.3 A baseline is a debt ledger, and it is ratchet-only

Adopting a high level on existing code produces a baseline file. That is legitimate — and it is
a list of known defects, not a configuration detail.

- The baseline MUST shrink or hold; CI fails on growth. A baseline that grows is a level that
  is not really adopted.
- Its **entry count is reported on every run**, so the debt is visible rather than archived.
- New files are never baselined. A baseline regenerated wholesale after a failing build silently
  re-accepts everything the level just caught, which is the one operation that must be a
  deliberate, reviewed commit.

### 2.4 `mixed` is the analyser's `Any`, and untyped is worse

- **Every function signature carries parameter and return types**, including `void` and
  `never`. An untyped parameter is `mixed`, and `mixed` accepts everything.
- **`mixed` is banned in new code.** Where a value genuinely varies, use a union
  (`int|string`), a `Stringable`-style interface, or a generic annotated with `@template`.
- **PHP has no native generics.** A bare `array` tells the analyser nothing; PHPDoc generics
  (`@param list<Order> $orders`, `array{id:int,name:string}`) are the only way to type a
  collection, and an un-annotated `array` is the most common way real PHP code stays
  unanalysable while looking fully typed.
- **Property and class-constant types** are declared too; an untyped property is `mixed` with
  the same consequences.

---

## 3. Escape hatches carry an identifier and a reason

- **`@phpstan-ignore` / `@psalm-suppress` name the specific error identifier**, never a blanket
  suppression of the line. A blanket ignore keeps its licence after the original cause is fixed
  and silently absorbs the next, unrelated error.
- **Suppressions that no longer suppress anything are removed**, and the analyser is what
  notices — both tools can report unused ignores. Leave that on.
- **A `@var` annotation is an assertion, not a proof.** It tells the analyser to believe a type
  it could not derive; if the value is something else, nothing checks. Prefer narrowing
  (`instanceof`, `is_*`), a real parse (§5), or a typed accessor. A justified `@var` carries a
  one-line reason on the preceding line — the same contract as directive reasons
  (`comment-standard.md` §3.1).
- **The repeated `@var` is a missing type.** The same annotation at two sites means a value
  object or a typed collection was never written.

---

## 4. Parse, don't assert — trust boundaries

A **trust boundary** is anywhere data enters from outside the analyser's view: superglobals
(`$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_SERVER`, `$_FILES`), request objects, decoded
JSON, queue and cache payloads, webhook bodies, file reads, and schema-less database columns.

- **Superglobals are `mixed`, and framework request accessors usually are too.** Reading
  `$request->get('qty')` and passing it to an `int` parameter is exactly the call §1 shows
  coercing — or throwing at a distance from the cause. Parse at the boundary into a typed
  object; the rest of the code takes the object.
- **`json_decode` returns `mixed`, and signals failure as a *value*.** Annotating or asserting an
  array shape over it claims the facts a boundary cannot guarantee. Two defects, verified on 8.5.10:
  - **Failure is indistinguishable from success.** `json_decode('{bad')` returns `NULL` — and so
    does `json_decode('null')`. Checking `=== null` rejects a valid payload; not checking admits
    a malformed one. **Pass `JSON_THROW_ON_ERROR`** (7.3+) so failure is an exception.
  - **Large integers silently become floats.** `json_decode('{"id":12345678901234567890}')` gives
    `float(1.2345678901234567E+19)` — an id that no longer round-trips. Pass
    `JSON_BIGINT_AS_STRING` where the wire carries ids or money.

  Then validate against a schema or hydrate into a typed DTO.
- **One validation mechanism per codebase** — a schema/DTO layer beside hand-rolled `isset` and
  `is_string` ladders is the two-idioms failure `type-safety.md` §5 names.
- **Numeric strings are the specific PHP trap.** `"1e3"`, `" 42"` and `"0x1A"` behave differently
  across casts, comparisons and arithmetic. Convert with a validating filter that *rejects*, not
  `(int)`, which returns `0` for unparseable input — a valid-looking value nobody chose.
- Validate at the boundary, then **trust inward** — do not re-validate at every layer.

**The outbound boundary has a PHP-only hazard: one array type serves both list and map, and
`json_encode` picks between them from the keys.** Filtering or diffing an array **preserves the
original keys**, so the result is no longer a list and serialises as a JSON *object*. Verified
on 8.5.10:

```php
json_encode(array_filter([1,2,3,4], fn($n) => $n % 2 === 0));  // {"1":2,"3":4}   <- object
json_encode(array_values(array_filter(...)));                   // [2,4]           <- array
```

A one-character filtering change therefore alters a **published response shape**, with no
PHP-side error and nothing in the type system to catch it: `array` is `array` either way, and the
consumer is in another repo. Call `array_values()` on any list that went through `array_filter`,
`array_diff`, `array_unique` or key-preserving `array_slice`, and assert with `array_is_list()`
(8.1+) before it crosses the wire. The contract is `api-contracts-and-codegen.md`'s lane; this is
the language mechanism that breaks it.

---

## 5. Closed sets are backed enums

- **Use a backed `enum`** for a closed set of values, and derive everything from it: the column
  constraint, the validation rule, the API spec's enum. Never hand-write the enum, the DB check
  and the spec list as three parallel literals — two will outlive an edit to the third.
- **`match` is exhaustive and throws; `switch` is not and does not.** `match` has no
  fall-through, compares with `===` (§6.1), and raises `\UnhandledMatchError` on an unmatched
  value. Prefer it for dispatch over an enum — adding a case then fails loudly at the sites
  that did not handle it, rather than falling silently to a default.
- A `switch` over an enum with a `default:` that swallows unknown members is the failure this
  rule prevents; the analyser at a high level will also flag the unhandled case.

---

## 6. Comparison and identity

### 6.1 `===` is the default; `==` is a deliberate, justified choice

Use `===` and `!==` everywhere unless loose comparison is specifically wanted and the reason is
written down. `in_array()` takes `true` as its third argument. `switch` compares loosely (§5 is
the reason to prefer `match`).

**The reason `===` matters most in PHP is that the standard library signals failure as a return
value that is `==`-equal to a legitimate result.** `preg_match()` returns `1`, `0`, **or `false`**
— the last on a PCRE failure such as exceeding `pcre.backtrack_limit` (default `1000000`) or
invalid UTF-8 under `/u`. `if (preg_match($blockPattern, $input))` therefore treats *the check
having failed* as *the input being clean*, and the trigger is input size, which the caller
chooses. This is a validation bypass that fails open. php.net's own note on the function is the
anchor: it may return `false` but may also return a non-Boolean value that evaluates to `false`,
"use the `===` operator for testing the return value".

- Compare every `preg_*` result with `===`, **or** check `preg_last_error()` /
  `preg_last_error_msg()` (8.0+) after the call.
- The same shape recurs across the library — `strpos()` returning `0` versus `false` is the
  canonical case. Treat any `false`-on-failure function as requiring `===`.

*Not reproduced here:* a backtrack-limit overflow could not be triggered on PHP 8.5.10 with
PCRE2's JIT for the usual catastrophic patterns, so this rule rests on the documented contract
and on `PREG_BACKTRACK_LIMIT_ERROR` existing, not on a demonstration.

### 6.2 Never compare a secret, digest or token with `==`

**This rule's justification changed in PHP 8, and citing the old one is a factual error.**
Executed on PHP 8.5.10:

| Expression | Result | Status |
| --- | --- | --- |
| `0 == "foo"` | **false** | the classic PHP 7 bypass — **dead since PHP 8.0** |
| `"abc" == 0` | **false** | dead |
| `in_array(0, ["a","b"])` | **false** | dead |
| `"0e462097431906509019562988736854" == "0e830400451993494058024219903391"` | **true** | **live** |
| `"10" == "1e1"`, `100 == "1e2"`, `"1" == "01"` | **true** | live |
| `in_array("1e1", ["10"])` | **true** | live |

Two different digests that both match `0e\d+` compare **equal**, because both are read as
scientific notation for zero. Numeric-string coercion in general survives PHP 8's changes; only
the string-vs-number cases were fixed.

So: compare secrets, MACs, tokens and password-reset codes with **`hash_equals()`**, which is
both type-strict and constant-time. `===` alone removes the collision but not the timing
side-channel. And do not justify this rule with `0 == "foo"` — that behaviour no longer exists,
and a reviewer who checks will conclude the rule is obsolete.

---

## 7. Errors and exceptions

- **Throw typed exceptions and preserve the cause**: pass the original as `previous` when re-throwing — dropping it discards the stack that explains the failure.
- **Never `catch (\Throwable $e)` around a block whose failure modes you have not enumerated**,
  and never swallow — a bare catch turns an unknown failure into a silent one
  (`observability.md` §2's silent-degradation ban).
- **The `@` error-suppression operator is forbidden.** It suppresses diagnostics for the whole
  expression, including ones nobody anticipated, and leaves no record. Check the precondition
  instead.
- **Type errors are exceptions, not warnings** — `TypeError` and `ValueError` are `\Error`
  subclasses, so a global `\Exception` handler does not catch them. A framework that logs
  `\Exception` and not `\Throwable` loses exactly the failures §1 is about.

---

## 8. What the analyser proves is not what runs

### 8.1 Assertions are removed by the recommended production configuration

`assert()` is elided when `zend.assertions` is `0` or `-1`, and **`-1` is the value in the
`php.ini-production` template PHP itself ships**. A gate written as `assert(...)` therefore
returns its privileged result in a standard production deployment. Verified. The obligation is
`security.md` §5.8; the note is here because the analyser sees the assertion and reasons from it.

### 8.2 Dynamic features are invisible to static analysis

Variable variables, `extract()`, `compact()`, dynamic property access, `__get`/`__call`, and
`call_user_func` with a computed name all defeat the analyser: it cannot see what is read or
written, so it reports nothing and its silence means nothing. Where such a construct is
unavoidable, confine it to one small, tested adapter and give that adapter a typed interface.
`extract()` on request data additionally imports caller-controlled names into local scope and
is refused outright.

### 8.3 The runtime configuration is part of the contract

Analysis assumes a PHP version and an extension set. A codebase analysed under 8.5 and deployed
on 8.2 is analysed against semantics it will not run under — and, per the anchors, 8.2's
security support ends 31 Dec 2026. The analyser's configured PHP version MUST equal the deploy
runtime's; `php-packaging.md` §2.1 owns the declaration and the check.

---

## Failure shapes

Named patterns to recognise and cite in review:

1. **The unprotected caller.** `strict_types` in the library, absent in the file that calls it;
   a string reaches an `int` parameter and is silently coerced (§1, §2.1).
2. **Level zero.** PHPStan in the pipeline with no level configured, so the build proves only
   that the code parses (§2.2).
3. **The inverted scale / the regenerated baseline.** A Psalm `errorLevel` copied into a PHPStan
   `level` (strictest intention, weakest configuration), or a failing build "fixed" by
   regenerating the baseline, re-accepting in one commit everything the level just caught
   (§2.2, §2.3).
4. **The untyped array.** Fully typed signatures where every collection is a bare `array`, so the
   analyser can say nothing about any element (§2.4).
5. **The shape that changed on the wire.** `array_filter` preserved the keys, so a JSON array
   became an object and a published response shape moved, with no error (§4).
6. **The `false` that read as clean.** `preg_match` returned `false` on a PCRE failure and the
   `if` treated it as "no match" — a validation bypass triggered by input size (§6.1).
7. **The magic-hash compare.** A digest or token compared with `==`, where two distinct `0e…`
   values are equal (§6.2).
8. **The `-1` gate / the dynamic hole.** Authorization written as `assert()` and absent under the
   shipped production configuration (§8.1); or `extract()`/variable-variable code the analyser
   cannot see, inside a repo reporting a clean high-level run (§8.2).

---

## Checklist

Before committing:

- [ ] Every new `.php` file starts with `declare(strict_types=1)`, and the fixer/sniffer that
      enforces it still runs over the whole tree (§2.1)?
- [ ] Every new signature has parameter, return and property types — no implicit `mixed` — and
      every new `array` carries a PHPDoc generic or array shape (§2.4)?
- [ ] Analyser passes at the declared level; baseline unchanged or smaller and not regenerated
      wholesale (§2.2, §2.3); every new suppression names an identifier and every new
      `@phpstan-ignore`/`@psalm-suppress`/`@var` carries a reason (§3)?
- [ ] Data from a superglobal, request, `json_decode`, cache or queue parsed into a typed object
      at the boundary — not annotated or cast into shape (§4)?
- [ ] Any new closed set is a backed enum, dispatched with `match` (§5)?
- [ ] New comparisons use `===`; `in_array` passes `true`; any secret/digest/token comparison
      uses `hash_equals()` (§6.1, §6.2)?
- [ ] Re-thrown exceptions pass the original as `previous`; no `@` suppression; handlers catch
      `\Throwable` where type errors are possible (§7); no validation or authorization expressed
      as `assert()` (§8.1); analyser PHP version still equals the deploy runtime's (§8.3)?

---

## Guard rails

CI checks that make this standard enforceable rather than aspirational:

- **[php-typing.GR1]** **`declare(strict_types=1)` presence check over every `.php` file**, in CI,
  failing the build on a single missing file (§2.1). The highest-value rail in this standard,
  because it is the one obligation that is worthless at 99 % and unverifiable by eye.
- **[php-typing.GR2]** **Analyser at the declared level as its own CI step**, with the level
  written in a committed config file rather than passed on a command line where it can be
  dropped (§2.2).
- **[php-typing.GR3]** **Baseline ratchet:** fail when the baseline's entry count grows, and print
  the count on every run (§2.3).
- **[php-typing.GR4]** **Semgrep `checks/semgrep/php-typing.yaml`** — surfaces loose comparison of
  digest-producing calls (§6.2) and `@` suppression (§7). Validated against 3,441 files from
  three mature PHP projects; see `checks/README.md` § Validation.
- **[php-typing.GR5]** **Analyser PHP-version equality check:** assert the analyser's configured
  `phpVersion` equals the `composer.json` platform pin and the deploy runtime (§8.3; the
  declaration itself is `php-packaging.md` GR1).
- **[php-typing.GR6]** **Unused-suppression reporting on** in the analyser configuration, so a
  suppression that has outlived its cause fails rather than accumulating (§3).

---

## Appendix A — Project profile (TEMPLATE)

> **This is a blank template. Do not fill it in here** — this file is the shared master.
> Copy the tables into the project's profile (e.g.
> `<home>/profiles/php-typing-profile.md`) and fill them there.

**The two gates, per repo (§2.1, §2.2) — state the tool *with* the number, because the scales
run in opposite directions:**

| Repo | Analyser + pinned version + level | Config file | Own CI step? | `strict_types` enforcing tool + what it runs over | Exclusions (generated only) |
| --- | --- | --- | --- | --- | --- |
| | e.g. PHPStan 2.2.13, level 9 | `phpstan.neon` | | | |

**Baseline debt (§2.3, ratchet-only) and deviations from the floor (§2.2, each with an exit plan):**

| Repo | Baseline file + entry count | Recorded on | Direction | Path / rule relaxed | Why | Exit plan / date |
| --- | --- | --- | --- | --- | --- | --- |

**Boundary parsing (§4) — where each trust boundary becomes a typed object:**

| Boundary | Parsed into | Where | Validation mechanism |
| --- | --- | --- | --- |
| e.g. request, `json_decode`, queue payload, cache | | | |

**Dynamic-feature carve-outs (§8.2) — each confined and tested:**

| Construct | Location (adapter module) | Typed interface | Test pinning it |
| --- | --- | --- | --- |

**Runtime coupling (§8.3) — all three must agree:**

| Analyser `phpVersion` | `composer.json` platform pin | Deploy runtime |
| --- | --- | --- |
| | | |
