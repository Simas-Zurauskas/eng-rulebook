// home.mjs — resolve where eng-rulebook writes this workspace's output.
//
// One definition, imported by every script that writes something. `SKILL.md` § Where
// eng-rulebook writes is the prose statement of the same rule; this file is its executable
// half. Two implementations of one path convention is how they come to disagree with nothing
// able to detect it — the reason CHANGELOG.md § Change classes is likewise defined once.
//
// The home is normally the project's wiki repo, `wiki-{project}/eng-rulebook/`. That folder is
// a real git repo and the project's one shared artifact, while the workspace root holding it
// deliberately is not — so profiles left at the workspace root are tracked by nothing and reach
// nobody. It sits in a part of the docs root wiki-system contractually never writes, deletes,
// or walks, so a `recheck` will not touch it.
//
// Resolution order:
//   1. --root <dir>            explicit override; must exist, never created implicitly
//   2. wiki-*/ in CWD          disambiguated by the .internal/plan.yaml marker
//   3. eng-rulebook-audit/     standalone / no-wiki fallback (the pre-v3 location)

import { existsSync, mkdirSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

const WIKI_PREFIX = 'wiki-'
const WIKI_MARKER = join('.internal', 'plan.yaml')
const HOME_IN_WIKI = 'eng-rulebook'
const FALLBACK = 'eng-rulebook-audit'

// `_work/` is working state, not a deliverable (audit.md § Retention). Written when the file is
// ABSENT, and never rewritten or appended to when it exists — so a project on `Audit evidence
// retention: committed` opts out by deleting the LINE, keeping the file. Seeding only at
// directory-creation time was tried and is wrong: the seed hint this library prints tells you to
// `mkdir -p <home>/profiles` first, so in the common path the home already exists and the
// default silently never lands.
const GITIGNORE = `# Audit working state — not a deliverable (audit.md § Retention).
# A project that needs an immutable evidence trail sets "Audit evidence retention: committed"
# in its profile and deletes the line below, keeping this file. eng-rulebook never rewrites a
# .gitignore that already exists here.
audits/*/_work/
`

/** Thrown when the workspace holds several real wikis and no --root says which. Exit code 2. */
export class HomeAmbiguousError extends Error {
  constructor(candidates) {
    super(
      `Several wiki-* folders here are wiki-system wikis; cannot choose between them:\n` +
        candidates.map(c => `  ${c}`).join('\n') +
        `\nPass --root <dir> to name the one to use.`,
    )
    this.name = 'HomeAmbiguousError'
    this.candidates = candidates
  }
}

/** Thrown when --root names something that is not an existing directory. Exit code 2. */
export class HomeRootError extends Error {
  constructor(message) {
    super(message)
    this.name = 'HomeRootError'
  }
}

const isDir = p => {
  try {
    return statSync(p).isDirectory() // follows symlinks on purpose — a symlinked wiki is a wiki
  } catch {
    return false
  }
}

/** Parse `--root <dir>` from anywhere in argv. Positional parsing would miss `--root X --ledger`. */
export function parseRoot(argv) {
  const i = argv.indexOf('--root')
  if (i === -1) return null
  const value = argv[i + 1]
  if (!value || value.startsWith('--')) throw new HomeRootError('--root needs a directory argument')
  return value
}

/**
 * Resolve the eng-rulebook home.
 * @returns {{ home: string, branch: 'root'|'wiki'|'fallback', warnings: string[] }}
 */
export function resolveHome({ argv = process.argv.slice(2), cwd = process.cwd() } = {}) {
  const warnings = []

  const root = parseRoot(argv)
  if (root) {
    const abs = isAbsolute(root) ? root : resolve(cwd, root)
    if (!existsSync(abs)) throw new HomeRootError(`--root path does not exist: ${abs}`)
    if (!isDir(abs)) throw new HomeRootError(`--root is not a directory: ${abs}`)
    // Canonicalise: a symlinked home should not produce two spellings of one tree.
    let real = abs
    try { real = realpathSync(abs) } catch { /* keep abs — unreadable is caught on write */ }
    return { home: real, branch: 'root', warnings }
  }

  let candidates = []
  try {
    candidates = readdirSync(cwd)
      .filter(n => n.startsWith(WIKI_PREFIX) && isDir(join(cwd, n)))
      .sort()
  } catch {
    candidates = []
  }

  // existsSync() returns false for BOTH "no marker" and "cannot read the directory". Collapsing
  // those would demote an unreadable real wiki to an unmarked folder and silently send this
  // project's facts to the fallback tree — a split nobody was told about.
  const marked = []
  const unreadable = []
  for (const n of candidates) {
    const marker = join(cwd, n, WIKI_MARKER)
    if (existsSync(marker)) { marked.push(n); continue }
    try {
      readdirSync(join(cwd, n))
    } catch (err) {
      if (err && (err.code === 'EACCES' || err.code === 'EPERM')) unreadable.push(n)
    }
  }
  if (unreadable.length) {
    warnings.push(
      `Cannot read ${unreadable.join(', ')} — unable to tell whether ${unreadable.length > 1 ? 'they are' : 'it is'} ` +
        `a wiki-system wiki. Treating as unmarked; pass --root <dir> to be explicit.`,
    )
  }

  if (candidates.length === 1) {
    if (marked.length === 0) {
      warnings.push(
        `${candidates[0]}/ has no ${WIKI_MARKER} — it is not a wiki-system wiki. Using it anyway.`,
      )
    }
    return { home: join(cwd, candidates[0], HOME_IN_WIKI), branch: 'wiki', warnings }
  }

  if (candidates.length > 1) {
    if (marked.length === 1) {
      return { home: join(cwd, marked[0], HOME_IN_WIKI), branch: 'wiki', warnings }
    }
    if (marked.length > 1) throw new HomeAmbiguousError(marked)
    // Several candidates, none of them a real wiki: this is the standalone case wearing a
    // wiki-ish name. Guessing between them is not better than the fallback.
    warnings.push(
      `Found ${candidates.length} wiki-* folders (${candidates.join(', ')}), none with ` +
        `${WIKI_MARKER}. Using the ${FALLBACK}/ fallback; pass --root <dir> to pick one.`,
    )
  }

  return { home: join(cwd, FALLBACK), branch: 'fallback', warnings }
}

/**
 * Create the home if absent and make sure it carries a `.gitignore`. An existing `.gitignore` is
 * never rewritten, appended to, or removed — whatever the project put there stands.
 */
export function ensureHome(home) {
  try {
    mkdirSync(home, { recursive: true })
    const gitignore = join(home, '.gitignore')
    if (!existsSync(gitignore)) writeFileSync(gitignore, GITIGNORE)
  } catch (err) {
    // Never fall back to another tree on a write failure: that splits one project's facts
    // across two locations with nobody told. Fail loudly on the path the caller asked for.
    throw new HomeRootError(`cannot write the eng-rulebook home at ${home}: ${err.message}`)
  }
  return home
}

/** Legacy profile directories, newest convention first. Read-only — never written. */
export function legacyProfileDirs({ cwd = process.cwd(), skillRoot } = {}) {
  const dirs = [join(cwd, FALLBACK, 'profiles')]
  if (skillRoot) dirs.push(join(skillRoot, 'profiles'))
  return dirs
}
