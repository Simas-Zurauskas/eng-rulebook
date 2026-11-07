# Comments and executable documentation

## Applicability

Comments, suppression directives, generated contracts and non-obvious code constraints.
Formatting and comment length alone are not audit findings.

## Checks

### COM1 — Preserve machine-consumed meaning

Do not remove license/tool markers, annotations, codegen contracts or suppression directives as
"noise" without checking their consumers. Contract comment changes may require regeneration.
Keep suppressions specific with a real reason; an explanation does not make unsafe code correct.

### COM2 — Explain what the code cannot express

Record surprising invariants, units, ordering/race/platform and lifecycle constraints, and
deliberate tradeoffs near the edit point. Explain why seemingly unnecessary code must remain
when its protection is not evident. Prefer useful names to narrating obvious code. Establish
rationale from code, tests or maintained decisions; do not invent a plausible story.

Link to maintained project authority rather than copying a specification into multiple comments.
Keep current intent, not change-history essays or a transcript of the agent's work. No mandatory
wiki, external-link ban or comment quota. TODOs explain actual missing work or its trigger,
without inventing a tracking ritual for every note.

### COM3 — Changed code and comments remain consistent

Treat existing comments as claims to verify against code, callers, tests and project authority.
Resolve meaningful contradictions before copying a pattern or removing a protection. Update
or remove affected stale comments/docs when behavior or instructions change. A false
load-bearing comment can cause a defect; demonstrate that scenario. Harmless prose polish is an opportunity, not a security
finding. Do not demand unrelated documentation edits as part of a small change.
