import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync, appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './check.mjs';
const source = fileURLToPath(new URL('../', import.meta.url));

test('current library is discoverable and malformed references are rejected', async t => {
  assert.deepEqual(validate(source).errors, []);
  const cases = [
    ['unindexed guide', root => cpSync(join(root, 'references/security.md'), join(root, 'references/new-guide.md')), /Index must list new-guide/],
    ['missing local file', root => appendFileSync(join(root, 'README.md'), '\n[missing](references/missing.md)\n'), /missing link/],
    ['missing heading', root => appendFileSync(join(root, 'README.md'), '\n[missing](audit.md#does-not-exist)\n'), /missing anchor/],
    ['duplicate check', root => appendFileSync(join(root, 'references/security.md'), '\n### SIM1 — Reused identity\n'), /Duplicate check ID/],
    ['ambiguous alias', root => {
      const path = join(root, 'references/README.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('security, sec, auth', 'security, sec, simplicity'));
    }, /Duplicate or reserved alias/],
  ];
  for (const [name, mutate, expected] of cases) await t.test(name, () => {
    const root = mkdtempSync(join(tmpdir(), 'rulebook-check-'));
    try {
      cpSync(source, root, { recursive: true, filter: path => !path.split('/').some(p => p === '.git' || p.endsWith('_cache')) });
      mutate(root);
      assert.match(validate(root).errors.join('\n'), expected);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
