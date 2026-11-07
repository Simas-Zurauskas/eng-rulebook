# Change review and report verification

Use the common principles in [SKILL.md](SKILL.md) and shared checks in [the index](references/README.md).
Read the [audit evidence and reporting rules](audit.md) for verification and finding format;
these modes do not inherit the full-audit census requirement.

## Check

1. Resolve the comparison explicitly. With `ref`, review the working tree against that ref.
   Otherwise use the default branch's merge-base when discoverable, falling back to HEAD
   (or the empty tree before a first commit). Include staged, unstaged and untracked nonignored
   work and report the chosen base; do not fetch or silently change branches. No changes means
   no check to perform.
2. Inspect changed behavior, not just filenames. Select applicable guide checks and follow
   affected callers, schemas and contracts. Auth, payments, migrations, external effects and
   build/instruction changes warrant their consequential checks even for a small diff.
3. Report only problems introduced or worsened by the change. A serious pre-existing issue may
   be noted separately without making this change responsible for a repo-wide repair.
4. Run relevant authorized checks, attempt refutation and independently verify consequential
   findings per audit.md. Inspect changed test assertions against the intended contract.
5. Respond with findings or an explicit clean result, verification and limitations. No ledger
   or report file unless requested. Existing release gates remain the project's decision.

For a non-Git input, review the user-provided before/after scope. If no comparison can be
established, explain what is missing rather than calling a whole-tree scan a change review.

## Recheck

Read the supplied report and identify its original code scope, snapshot, guide version and
claims. A report file or directory from either former library is supported; for a directory,
read its executive report and linked findings. If several materially different reports could
be intended, resolve that ambiguity before checking.

For each prior finding, locate current code, inspect the claimed remedy and its affected
callers/tests, and run relevant authorized checks. Missing evidence is not a fix. Classify:

- **fixed:** current evidence establishes that the failure/cost has been removed.
- **still-open:** the original problem remains.
- **regressed:** evidence of an intervening fix exists and the problem has returned; do not
  infer this merely from an old report or an unchanged finding.
- **rule-changed:** the finding depended on a rule now relaxed/removed; do not claim a code fix.
  If the underlying defect remains independently real, state that and its current severity.
- **unverified:** code, runtime evidence or the old rule meaning cannot be established.

Old numbered sections must be interpreted against their recorded version, not a similarly
numbered current section. Use available history/snapshots and [the migration note](MIGRATION.md).
Current guides use named check IDs. Do not assume an unchanged heading proves unchanged rules.

Apply the same evidence and independent verification requirements as an audit. Check for
regressions in affected behavior; new issues there may be reported separately. Recheck does
not establish that the rest of the codebase is clean and does not automatically run a full audit.
Write one new report using audit.md's location convention, link the original, retain finding IDs,
and distinguish verified code changes from policy changes. Never modify the original report.
