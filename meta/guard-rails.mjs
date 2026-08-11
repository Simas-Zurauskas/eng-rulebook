#!/usr/bin/env node
// guard-rails.mjs — enumerate the library's declared guard rails and reconcile them against a
// workspace's ledger.
//
// The problem: every rulebook ends with a Guard rails section, and adoption is "incremental".
// With no ledger, "adopted incrementally" and "adopted nothing" are indistinguishable — which is
// the library's own half-adopted-mechanism failure, applied to itself.
//
// A rail carries an explicit stable id written INTO the rulebook, as `[security.GR3]`. Ids are
// explicit rather than positional because a positional id renumbers every later rail when one is
// inserted — the exact hazard _authoring.md rule 11 forbids for sub-rules.
//
// Usage (run from the WORKSPACE ROOT — the ledger lives beside the audit reports):
//   node .claude/skills/eng-rulebook/meta/guard-rails.mjs              list every declared rail
//   node .claude/skills/eng-rulebook/meta/guard-rails.mjs --ledger     reconcile against eng-rulebook-audit/profiles/guard-rails.md
//   node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template   print a ledger seeded with every declared rail

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = join(ROOT, 'references')
// The ledger is a WORKSPACE fact: it lives in the workspace tree at
// eng-rulebook-audit/profiles/guard-rails.md, resolved from the current working directory.
// The skill-local profiles/ path is the pre-relocation legacy location — still read, with a
// migration hint, so an old install keeps working.
const LEDGER = join(process.cwd(), 'eng-rulebook-audit', 'profiles', 'guard-rails.md')
const LEGACY_LEDGER = join(ROOT, 'profiles', 'guard-rails.md')

const standards = readdirSync(REF)
  .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))
  .sort()

// --- extract the Guard rails section, then each top-level bullet in it ------------------------
function railsOf(file) {
  const src = readFileSync(join(REF, file), 'utf8').split('\n')
  const start = src.findIndex(l => /^##\s+(\d+\.\s+)?Guard rails/i.test(l))
  if (start === -1) return []
  const out = []
  let cur = null
  for (let i = start + 1; i < src.length; i++) {
    const l = src[i]
    if (/^##\s/.test(l)) break
    const m = l.match(/^-\s+(.*)$/)
    if (m) {
      if (cur) out.push(cur)
      const idm = m[1].match(/\[([a-z-]+\.GR\d+)\]/)
      // strip markdown emphasis and the id for a readable label
      const label = m[1].replace(/\[[a-z-]+\.GR\d+\]\s*/, '').replace(/\*\*/g, '')
      cur = { id: idm ? idm[1] : null, label: label.slice(0, 96), line: i + 1 }
    } else if (cur && l.trim() && !/^\s{2,}/.test(l) === false) {
      // continuation line — ignore, the first line is the label
    }
  }
  if (cur) out.push(cur)
  return out
}

const all = standards.flatMap(f => railsOf(f).map(r => ({ ...r, file: f, lane: basename(f, '.md') })))
const withId = all.filter(r => r.id)
const withoutId = all.filter(r => !r.id)

const mode = process.argv[2]

if (mode === '--template') {
  console.log(`# Guard-rail ledger — this workspace

> Which declared guard rails are actually wired **here**. Generated from the library's rulebooks
> with \`node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template\` (run from the
> workspace root; lives at \`eng-rulebook-audit/profiles/guard-rails.md\`); keep it current by hand.
>
> "Adopt incrementally" is only honest if the increment is recorded. An unrecorded rail is
> indistinguishable from an unwired one, which is the half-adopted-mechanism failure the library
> warns about, applied to itself.

**Status values:** \`wired\` (running in CI, name where) · \`partial\` (say what it does not cover) ·
\`not wired\` (honest default) · \`n/a — <reason>\` (does not apply to this workspace).

| Rail | Lane | What it catches | Status | Wired where | Last verified |
| --- | --- | --- | --- | --- | --- |`)
  for (const r of all) {
    console.log(`| \`${r.id ?? 'UNASSIGNED'}\` | ${r.lane} | ${r.label.replace(/\|/g, '\\|')} | not wired | | |`)
  }
  console.log(`
*${all.length} declared rails across ${standards.length} rulebooks.*`)
  process.exit(0)
}

if (mode === '--ledger') {
  let ledgerPath = LEDGER
  if (!existsSync(ledgerPath) && existsSync(LEGACY_LEDGER)) {
    ledgerPath = LEGACY_LEDGER
    console.log('NOTE: using the legacy skill-local ledger (profiles/guard-rails.md).')
    console.log('Migrate it:  mv "' + LEGACY_LEDGER + '" eng-rulebook-audit/profiles/guard-rails.md')
    console.log('')
  }
  if (!existsSync(ledgerPath)) {
    console.log('No eng-rulebook-audit/profiles/guard-rails.md under the current directory')
    console.log('(run from the workspace root — the ledger lives beside the audit reports).')
    console.log(`${all.length} rails are declared and NONE are recorded as wired.`)
    console.log('Seed one:  mkdir -p eng-rulebook-audit/profiles && node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template > eng-rulebook-audit/profiles/guard-rails.md')
    process.exit(1)
  }
  const led = readFileSync(ledgerPath, 'utf8')
  const recorded = new Map()
  for (const m of led.matchAll(/^\|\s*`([a-z-]+\.GR\d+)`\s*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|/gm)) {
    recorded.set(m[1], m[2].trim())
  }
  const declared = new Set(withId.map(r => r.id))
  const missing = [...declared].filter(id => !recorded.has(id))
  const stale = [...recorded.keys()].filter(id => !declared.has(id))
  const wired = [...recorded.entries()].filter(([, s]) => /^wired/.test(s)).length

  console.log(`Declared: ${all.length}  ·  with id: ${withId.length}  ·  in ledger: ${recorded.size}  ·  wired: ${wired}`)
  if (missing.length) { console.log(`\nDECLARED BUT NOT IN LEDGER (${missing.length}):`); missing.forEach(i => console.log('  ' + i)) }
  if (stale.length) { console.log(`\nIN LEDGER BUT NO LONGER DECLARED (${stale.length}) — the rule may have been removed:`); stale.forEach(i => console.log('  ' + i)) }
  process.exit(missing.length || stale.length ? 1 : 0)
}

// default: list
console.log(`${all.length} declared guard rails across ${standards.length} rulebooks\n`)
const byLane = {}
for (const r of all) (byLane[r.lane] ??= []).push(r)
for (const [lane, rs] of Object.entries(byLane)) {
  console.log(`${lane}  (${rs.length})`)
  for (const r of rs) console.log(`    ${(r.id ?? '— no id —').padEnd(28)} ${r.label}`)
}
if (withoutId.length) {
  console.log(`\n${withoutId.length} of ${all.length} rails have no stable id.`)
  console.log('A rail without an id cannot be tracked in a ledger or cited by a finding.')
}
process.exit(0)
