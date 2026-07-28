# Profiles — this workspace's facts

One file per topic, named `<topic>-profile.md` (e.g. `security-profile.md`), created by
copying the **Appendix A — Project profile (TEMPLATE)** tables out of the matching master in
`../references/` and filling them with this workspace's facts: spec globs, session tiers,
state machines, env tables, version gates.

**Create one with `/eng-rulebook profile <topic>`**; see what is missing with
`/eng-rulebook profile status`. Each file carries a header stamping the library `VERSION`, the
master's `Rev:`, the date, and the commit its facts were verified against — a profile with no
provenance cannot be told apart from a stale one.

Cells needing a human decision are written `DECIDE: <question>` rather than guessed. A
plausible-looking guess reads as a decision the project never made.

- **Living reference data, not run records.** Update a profile when the project changes;
  audits and reviews read it as the project's declared posture and verify it against code.
- **Per-workspace by construction.** Each workspace has its own copy of this skill, so
  `profiles/` here describes *this* workspace only. When copying the skill to a new
  workspace, empty this directory (keep this README) — the old profiles are the old
  project's facts.
- **Empty is honest.** A missing profile means "not yet declared" — agents proceed on the
  generic master, say so, and offer to create the profile. A stale profile is worse than a
  missing one: it reads as a decision.
