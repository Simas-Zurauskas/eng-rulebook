# v10 consolidation

v10 replaces eng-rulebook v9 and eng-rulebook-lean v3 with one discoverable `eng-rulebook`.
There is no second lean skill or redirect. `audit` selects all applicable checks; `audit basics`
selects priority checks from the same guides. Explicit topics belong to `guide`, not audit.
`profile` and governance bookkeeping are retired. Existing project decisions/gates are still
inputs; never delete project profiles, reports, or CI configuration as an adoption step.

Old source versions must be preserved before migration (Git history or an external snapshot).
v10 intentionally changes the guide structure: old numeric section references are not current
check IDs. Rechecks use the original claim/evidence and recorded version; a removed obligation
is `rule-changed`, not proof of a code fix. Historical reports and changelog entries are not
rewritten to appear current. A missing old version is a verification limitation.

Merge useful lean code-quality/architecture guidance into simplicity and architecture, error
semantics into resilience, and lean testing into the shared testing guide. Keep substantive
security, integrity, client lifecycle, platform, privacy and build protections. Existing optional
`checks/` exports remain available; they are not automatically imposed on projects.

Remove obsolete lean discovery links only after the combined skill and behavioral trials pass.
Update active callers that depend on the retired skill; preserve unrelated changes and history.
The common YAML frontmatter remains compatible with both Claude and Codex.
