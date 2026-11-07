# Optional tool integrations

These existing fragments remain available for projects that already consume them or deliberately
choose them. They are examples of mechanical checks, not a mandatory adoption bundle. Preserve
the project's established gates and verify compatibility with its installed tool versions.

- `eslint/eng-rulebook-base.mjs` and `tsconfig/eng-rulebook-base.json`: TypeScript presets.
- `ruff/eng-rulebook-base.toml`, `mypy/eng-rulebook-base.toml`: Python analysis presets.
- `phpstan/eng-rulebook-base.neon`: PHP analysis preset.
- `semgrep/`: focused pattern checks for the languages and boundaries named in each file.

Run only integrations relevant to the project, using existing authorized installations. Treat
pattern matches as leads: inspect input reachability, upstream guards and framework guarantees.
Warnings are not automatically defects; zero hits are not evidence of complete semantic coverage.
These snippets do not replace behavioral tests or the audit's independent verification.

There is no universal CI template: reuse the project's own commands and add only checks that
protect a concrete risk. No profiles or enforcement ledgers are required. Historical calibration
notes and the retired CI template are preserved in the pre-v10 source snapshot/history.
