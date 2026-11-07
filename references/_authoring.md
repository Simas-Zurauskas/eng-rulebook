# Authoring engineering guidance

Maintain one library for development, full audits and basics audits. Each guide has an
Applicability section and individually identifiable checks (`### SEC1 — …`, for example).
The index in README.md is the only topic catalog and routing authority.

- A required behavior names the concrete failure it prevents and the condition under which
  it applies. Reserve absolute instructions for actual invariants. Design preferences state
  their tradeoffs; do not universalize one past incident or one framework's architecture.
- Preserve user scope and existing project authority. No mandatory profiles, ledgers, receipts,
  compliance maps, arbitrary coverage targets or missing-tool findings.
- Prefer one owner for a rule and a link to it from related guides. Keep runtime-specific
  traps when they matter; remove copied manuals, version catalogs and repeated examples.
- Read relevant original material before consolidating it. Keep evidence for material rule
  relaxations in the changelog. Published reports keep their historical meaning.
- Check IDs are stable within a guide: append new IDs, never reuse a retired ID for a different
  obligation. Cite guide, ID and library version in reports. Breaking migrations explicitly
  distinguish old identifiers; never automatically mark old findings fixed after a rule change.
- Add authoritative links where a rule relies on external behavior. Verify changing APIs and
  tool options against current primary docs when actually implementing them. Do not invent
  incidents, guarantees, tool settings, or universal cost savings.
- Validate with `node meta/check.mjs`. Exercise changed executable helpers on meaningful
  cases. Use independent forward trials for substantial workflow changes; formatting checks
  alone cannot demonstrate useful decisions. Favor small realistic trials over test-count goals.

Existing optional tool fragments are integration aids, not mandatory project configurations.
Inspect consumers before changing their exported interfaces or removing them.
