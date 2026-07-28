# Library gaps — the inbound backlog

> Where a `library-gap` goes so it stops dying in a report folder.

A **library-gap** is a real defect that **no rule in this library covers**. The audit emits them
(`audit.md` § Finding format), build-time mode emits them when a Checklist box cannot be decided
from a diff (`SKILL.md` § After writing), and any reviewer can raise one.

The problem this file solves: every other destination for a gap is **downstream**. An audit
report lands in `eng-rulebook-audit/<date>/` inside the *adopting workspace*, next to that
workspace's **copy** of the library. Nothing carries it back to the master, so the same gap is
rediscovered in the next workspace, and the next — which is precisely the drift the library
exists to prevent, running in the one direction nobody instrumented.

**The master is the upstream.** A gap recorded only in a workspace is a gap the library never
learns. Raise it here (`/eng-rulebook contribute`), against the master.

**Two upstream sources feed this file.** An **audit** emits `library-gaps.md` in its report
(`audit.md` § Finding format) — transcribe those rows here. And a delivery process's post-release
retrospective produces the other kind: *"a review would have caught this only if a rule had said
so, and no rule does."* Both are the same object; both reach the master only when someone raises
them here.

## The intake bar

A gap enters this backlog when **all four** hold. Anything less is a note, not a gap — and a
backlog that accepts notes stops being read.

1. **The defect is real and evidenced** — a concrete failure scenario, or an audit finding with
   `path:line`. "Would be nice to standardise X" is not a gap.
2. **No existing rule covers it.** Say which lane you checked and what the nearest rule was.
   Most candidate gaps die here: the rule exists in a sibling lane the reporter did not read.
3. **It generalises.** The rule would be worth stating for projects other than the one that
   found it. A project-specific decision belongs in that project's profile, not here.
4. **It is code-shaped.** If the obligation is about a person's workflow rather than a property
   of the code, it belongs to the delivery process, not to a standard (`README.md` § The
   delivery seam).

## Rows

Add newest first. Keep a resolved row for one release cycle so a re-report is recognisable, then
move it to the CHANGELOG entry that closed it.

| # | Raised | Gap | Evidence | Lane checked / nearest rule | Status |
| --- | --- | --- | --- | --- | --- |
| | | | | | *(empty — the honest state; nothing has been raised against v1 yet)* |

**Status values:** `open` · `accepted → <target lane>` · `rejected, because…` · `closed in vN`.
A `rejected` row keeps its reasoning and is never deleted — the same gap will be raised again,
and the reasoning is what stops it being re-litigated from scratch.

## Cadence

Review this file when cutting a `VERSION`. A gap that has been `open` across two releases is
itself a finding: either the bar rejected it and nobody wrote that down, or the library is
declining to cover something real. Say which.
