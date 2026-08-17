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
//   node .claude/skills/eng-rulebook/meta/guard-rails.mjs --ledger     reconcile against <home>/profiles/guard-rails.md
//   node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template   print a ledger seeded with every declared rail
//   ... --root <dir>                                                   name the home explicitly
//
// <home> resolves per meta/home.mjs (SKILL.md § Where eng-rulebook writes): the project wiki
// when there is one, else eng-rulebook-audit/ under the current directory.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveHome, ensureHome, legacyProfileDirs, HomeAmbiguousError, HomeRootError } from './home.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = join(ROOT, 'references')

// The ledger is a WORKSPACE fact, not a skill file — so the home is resolved LAZILY, only by
// the modes that need it. Default list mode enumerates the library's own rulebooks and touches
// no workspace at all; making it fail because a workspace holds two wikis would be absurd.
let _home = null
function home() {
  if (_home) return _home
  try {
    const resolved = resolveHome()
    // stderr, not stdout: --template's stdout is redirected straight into the committed ledger,
    // so a NOTE on stdout lands as that file's first line.
    for (const w of resolved.warnings) console.error('NOTE: ' + w)
    _home = resolved.home
  } catch (err) {
    if (err instanceof HomeAmbiguousError || err instanceof HomeRootError) {
      console.error(err.message)
      process.exit(2)
    }
    throw err
  }
  return _home
}
const ledgerPathFor = () => join(home(), 'profiles', 'guard-rails.md')
// The --template body is committed to the project's repo, so it must not embed one developer's
// absolute paths. Terminal hints below stay absolute — there, unambiguous beats portable.
const ledgerRel = () => relative(process.cwd(), ledgerPathFor()) || ledgerPathFor()
// Pre-v3 locations — the workspace-root fallback tree, then the skill-local folder from before
// profiles left the skill at all. Both are still READ, with a migration hint; never written.
const legacyLedgers = () => legacyProfileDirs({ skillRoot: ROOT }).map(d => join(d, 'guard-rails.md'))

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

// Positional-only parsing would drop the mode whenever --root came first.
const mode = process.argv.slice(2).find(a => a === '--template' || a === '--ledger')

if (mode === '--template') {
  // Seeding operation: make sure the home (and its .gitignore) exists before the caller
  // redirects this output into it. --ledger deliberately does NOT, being a read-only check.
  try {
    ensureHome(home())
  } catch (err) {
    if (err instanceof HomeRootError) { console.error(err.message); process.exit(2) }
    throw err
  }
  console.log(`# Guard-rail ledger — this workspace

> Which declared guard rails are actually wired **here**. Generated from the library's rulebooks
> with \`node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template\` (run from the
> workspace root; lives at \`${ledgerRel()}\`); keep it current by hand.
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
  const LEDGER = ledgerPathFor()
  let ledgerPath = LEDGER
  if (existsSync(ledgerPath)) {
    // Both locations populated: the home wins, but say so. Merging two half-filled ledgers
    // would produce a record of decisions nobody made.
    const dupes = legacyLedgers().filter(p => existsSync(p))
    for (const d of dupes) {
      console.error('NOTE: a legacy ledger also exists at ' + d + ' — using ' + LEDGER + '.')
      console.error('Remove the legacy copy once you have merged anything you still need.')
    }
  } else {
    const legacy = legacyLedgers().find(p => existsSync(p))
    if (legacy) {
      ledgerPath = legacy
      console.error('NOTE: using a legacy ledger location (' + legacy + ').')
      console.error('Migrate it:  mv "' + legacy + '" "' + LEDGER + '"')
    }
  }
  if (!existsSync(ledgerPath)) {
    console.log('No guard-rail ledger at ' + LEDGER)
    console.log('(run from the workspace root — the ledger lives beside the audit reports).')
    console.log(`${all.length} rails are declared and NONE are recorded as wired.`)
    console.log('Seed one:  mkdir -p "' + join(home(), 'profiles') + '" && node .claude/skills/eng-rulebook/meta/guard-rails.mjs --template > "' + LEDGER + '"')
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
