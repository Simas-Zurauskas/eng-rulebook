#!/usr/bin/env node
// Validate discoverability and local references, not engineering judgment.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validate(root) {
  const errors = [];
  const read = p => readFileSync(join(root, p), 'utf8');
  const guides = readdirSync(join(root, 'references')).filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'));
  const index = read('references/README.md');
  const rows = [...index.matchAll(/^\| \[[^\]]+\]\(([^)]+)\) \| ([^|]+) \|/gm)];
  const listed = rows.map(m => m[1]);
  for (const file of guides) if (listed.filter(f => f === file).length !== 1) errors.push(`Index must list ${file} exactly once`);
  for (const file of listed) if (!guides.includes(file)) errors.push(`Unknown indexed guide: ${file}`);
  const aliases = new Set(['guide', 'check', 'audit', 'basics', 'recheck', 'all', 'profile', 'python', 'php']);
  for (const row of rows) for (const alias of row[2].split(',').map(s => s.trim().toLowerCase())) {
    if (aliases.has(alias)) errors.push(`Duplicate or reserved alias: ${alias}`);
    aliases.add(alias);
  }
  const ids = new Set();
  for (const file of guides) {
    const src = read(`references/${file}`);
    for (const heading of ['Applicability', 'Checks']) if (!src.includes(`\n## ${heading}\n`)) errors.push(`${file}: missing ${heading}`);
    const checks = [...src.matchAll(/^### ([A-Z]+[1-9][0-9]*) — (.+)$/gm)];
    if (!checks.length) errors.push(`${file}: no named checks`);
    for (const [, id] of checks) {
      if (ids.has(id)) errors.push(`Duplicate check ID: ${id}`);
      ids.add(id);
    }
  }
  const skill = read('SKILL.md');
  if (!/^---\nname: eng-rulebook\ndescription: '[^\n]+'\n---\n/.test(skill)) errors.push('SKILL.md needs valid quoted name/description frontmatter');
  if (!/^[1-9][0-9]*\n?$/.test(read('VERSION'))) errors.push('VERSION must be a positive integer');
  const docs = ['SKILL.md', 'README.md', 'audit.md', 'review.md', 'MIGRATION.md', 'checks/README.md', ...readdirSync(join(root, 'references')).filter(f => f.endsWith('.md')).map(f => `references/${f}`)];
  const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').trim().replace(/\s/g, '-');
  for (const file of docs) {
    const src = read(file);
    for (const [, link] of src.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:|^\/\//i.test(link)) continue;
      const [path, anchor] = link.split('#');
      const target = path ? resolve(root, dirname(file), decodeURIComponent(path)) : join(root, file);
      if (!existsSync(target)) { errors.push(`${file}: missing link ${link}`); continue; }
      if (anchor && statSync(target).isFile()) {
        const headings = [...readFileSync(target, 'utf8').matchAll(/^#{1,6} (.+)$/gm)].map(m => slug(m[1]));
        if (!headings.includes(decodeURIComponent(anchor))) errors.push(`${file}: missing anchor ${link}`);
      }
    }
  }
  return { errors, guides: guides.length, checks: ids.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validate(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  for (const error of result.errors) console.error(error);
  console.log(`${result.errors.length ? 'FAIL' : 'OK'}: ${result.guides} guides, ${result.checks} checks; ${result.errors.length} structural errors. Semantic preservation needs behavioral review.`);
  process.exitCode = result.errors.length ? 1 : 0;
}
