#!/usr/bin/env node
// check-rulebook-shape.mjs — the library's self-check.
//
// Blocking rule (the "anchor rule"):
//   A §N.M anchor cited anywhere in the library MUST resolve to a `### N.M` heading in its target file.
//   A rules section with no §N.M citation against it is the citable unit and is cited as §N.
//
// Advisory (reported, never blocking):
//   A section running >=20 body lines with >=3 obligations is a CANDIDATE for sub-headings.
//   No threshold partitions this corpus the way an editor would, so this never gates.
//
// Also checks required-shape sections per _authoring.md.
//
// Usage: node meta/check-rulebook-shape.mjs [--explain] [--advisory]

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = join(ROOT, 'references')
const explain = process.argv.includes('--explain')
const showAdvisory = process.argv.includes('--advisory')

const libFiles = [
  ...readdirSync(REF).filter(f => f.endsWith('.md')).map(f => ({ name: f, path: join(REF, f) })),
  { name: 'SKILL.md', path: join(ROOT, 'SKILL.md') },
  { name: 'audit.md', path: join(ROOT, 'audit.md') },
  { name: 'README.md', path: join(ROOT, 'README.md') },
]
// A standard is references/*.md excluding the index and any _-prefixed file (library machinery).
const standards = readdirSync(REF)
  .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))

const text = new Map(libFiles.map(f => [f.name, readFileSync(f.path, 'utf8')]))

// --- headings present in each file ------------------------------------------------------------
const headings = new Map() // file -> Set("N.M" and "N")
for (const [name, src] of text) {
  const set = new Set()
  for (const m of src.matchAll(/^#{2,4}\s+(\d+)(?:\.(\d+))?[.\s]/gm)) {
    set.add(m[2] ? `${m[1]}.${m[2]}` : m[1])
  }
  headings.set(name, set)
}

// --- resolve a §N.M citation to a target file --------------------------------------------------
// THE RESOLUTION RULE — this is the normative definition of what a citation means, and no count
// is trustworthy until it is stated. Three clauses, in order:
//
//   1. NAMED TARGET. The nearest file reference EARLIER on the same line wins; else the nearest
//      one LATER on the same line. A "file reference" is the file's stem in any of the forms the
//      library actually uses: `comment-standard.md`, comment-standard.md, comment-standard,
//      or "comment standard" (spaces for hyphens) — backticked or bare. Backtick-only matching
//      misses six real cross-file citation sites written in prose.
//   2. SELF-REFERENCE. No named target on the line → the citation refers to its own file.
//   3. NOT A CITATION. A self-reference in a file that has no numbered sections at all (audit.md
//      uses "## Phase N") is illustrative prose, e.g. "§3.1/§3.3-style rules" — not a citation.
//
// Cross-LINE inference is deliberately NOT done: it produced false positives in both directions.
const aliases = [] // [{re, file}] longest-stem-first so "api-contracts-and-codegen" beats nothing
for (const f of [...standards, 'README.md', '_authoring.md']) {
  const stem = basename(f, '.md')
  const loose = stem.replace(/-/g, '[- ]')
  aliases.push({ file: f, src: `\`?${loose}(?:\\.md)?\`?` })
}
aliases.sort((a, b) => b.src.length - a.src.length)
const ALIAS_RE = new RegExp(`(${aliases.map(a => a.src).join('|')})`, 'gi')
function aliasToFile(token) {
  const norm = token.replace(/[`]/g, '').replace(/\.md$/i, '').replace(/\s+/g, '-').toLowerCase()
  return standards.find(f => basename(f, '.md') === norm)
      ?? (norm === 'readme' ? 'README.md' : norm === '_authoring' ? '_authoring.md' : null)
}
function resolveTarget(selfFile, line, idx) {
  // ADJACENCY, enforced rather than merely claimed. A real citation writes the target
  // immediately before the anchor (`security.md` §3, "comment standard §3.4"). A filename
  // mentioned earlier in an unrelated clause — "(`_authoring.md` rule 6) and then §3.1's
  // counts" — is NOT the target, and treating it as one produced false positives that made
  // authors reword correct prose to appease the checker.
  // Only whitespace/quoting punctuation may intervene — PLUS a chain of preceding §-citations,
  // because a list ("`comment-standard.md` §3.1, §4.3") shares one target across its members.
  const GAP = /^[\s`'"(,:—-]{0,8}(?:§\d+(?:\.\d+)?[\s,/]{0,4}(?:and[\s]{0,2})?)*$/
  const before = [...line.slice(0, idx).matchAll(ALIAS_RE)].pop()
  if (before && GAP.test(line.slice(before.index + before[1].length, idx))) {
    const f = aliasToFile(before[1]); if (f) return f
  }
  const afterM = line.slice(idx).match(ALIAS_RE)
  if (afterM && GAP.test(line.slice(idx, idx + afterM.index).replace(/^§\d+\.\d+/, ''))) {
    const f = aliasToFile(afterM[0]); if (f) return f
  }
  // Clause 3: a file with no numbered sections cannot be self-citing.
  if (!headings.get(selfFile) || ![...headings.get(selfFile)].some(h => !h.includes('.'))) return null
  return selfFile
}

const dangling = []
let totalCitations = 0
for (const [name, src] of text) {
  src.split('\n').forEach((line, i) => {
    // Skip the anchor-rule definition itself and fenced examples
    // (?!\.\d) — a deeper form like "§3.1.1.2" is a citation into an EXTERNAL document
    // (NIST/RFC/ASVS section numbering), never a library anchor.
    for (const m of line.matchAll(/§(\d+)\.(\d+)(?!\.?\d)/g)) {
      // An external standard named immediately before the § means the same thing.
      if (/\b(NIST|RFC|BCP|ASVS|MASVS|ISO|IEC|SP\s?800|CWE|SLSA|GDPR|Article|Art\.)\b[^.]{0,40}$/i
          .test(line.slice(0, m.index))) continue
      totalCitations++
      const anchor = `${m[1]}.${m[2]}`
      const target = resolveTarget(name, line, m.index)
      if (!target) { totalCitations--; continue } // clause 3: illustrative prose, not a citation
      const targetHeadings = headings.get(target)
      if (!targetHeadings) continue // cites a file outside the library
      if (!targetHeadings.has(anchor)) {
        dangling.push({ from: name, lineNo: i + 1, anchor, target, line: line.trim().slice(0, 110) })
      }
    }
  })
}

// --- required shape (_authoring.md) ------------------------------------------------------------
const REQUIRED = ['Scope', 'Core principle', 'Failure shapes', 'Checklist', 'Guard rails']
const shapeIssues = []
for (const f of standards) {
  const src = text.get(f)
  for (const need of REQUIRED) {
    const re = new RegExp(`^#{2}\\s+(\\d+\\.\\s+)?${need}`, 'im')
    if (!re.test(src)) shapeIssues.push({ file: f, missing: need })
  }
}

// --- advisory: sub-heading candidates ----------------------------------------------------------
const advisory = []
for (const f of standards) {
  const src = text.get(f).split('\n')
  let cur = null
  const flush = () => {
    if (!cur) return
    const body = cur.lines.filter(l => l.trim())
    const obligations = cur.lines.filter(l => /\b(MUST|NEVER|SHOULD|SHALL)\b/.test(l)).length
    if (body.length >= 20 && obligations >= 3 && !cur.hasSub) {
      advisory.push({ file: f, section: cur.title, bodyLines: body.length, obligations })
    }
    cur = null
  }
  for (const line of src) {
    const h2 = line.match(/^##\s+(\d+)\.\s+(.*)/)
    if (h2) { flush(); cur = { title: `§${h2[1]} ${h2[2]}`, lines: [], hasSub: false }; continue }
    if (/^##\s/.test(line)) { flush(); continue }
    if (cur) { if (/^###\s/.test(line)) cur.hasSub = true; cur.lines.push(line) }
  }
  flush()
}

// --- report ------------------------------------------------------------------------------------
console.log(`Scanned ${text.size} files · ${standards.length} standards · ${totalCitations} §N.M citations`)
console.log('')

if (shapeIssues.length) {
  console.log(`SHAPE — ${shapeIssues.length} required section(s) missing (_authoring.md § Required shape):`)
  for (const s of shapeIssues) console.log(`  ${s.file}: no "## ${s.missing}" section`)
  console.log('')
}

if (dangling.length) {
  const byTarget = {}
  for (const d of dangling) (byTarget[d.target] ??= []).push(d)
  console.log(`DANGLING ANCHORS — ${dangling.length} citation instance(s), ` +
              `${new Set(dangling.map(d => d.target + '§' + d.anchor)).size} distinct anchor(s):`)
  for (const [target, list] of Object.entries(byTarget).sort((a, b) => b[1].length - a[1].length)) {
    const distinct = [...new Set(list.map(d => d.anchor))].sort()
    console.log(`  ${target.padEnd(34)} ${String(list.length).padStart(3)} instance(s) → §${distinct.join(', §')}`)
    if (explain) for (const d of list) console.log(`      ${d.from}:${d.lineNo}  §${d.anchor}   ${d.line}`)
  }
  console.log('')
}

if (showAdvisory && advisory.length) {
  console.log(`ADVISORY — ${advisory.length} sub-heading candidate(s) (never blocking):`)
  for (const a of advisory) {
    console.log(`  ${a.file.padEnd(34)} ${a.section}  (${a.bodyLines} body lines, ${a.obligations} obligations)`)
  }
  console.log('')
}

const blocking = dangling.length + shapeIssues.length
console.log(blocking === 0
  ? 'OK — every cited anchor resolves and every standard has the required shape.'
  : `FAIL — ${dangling.length} dangling citation(s), ${shapeIssues.length} shape issue(s).`)
process.exit(blocking === 0 ? 0 : 1)
