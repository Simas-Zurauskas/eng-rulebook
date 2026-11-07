// ESLint flat-config fragment for references/type-safety.md TS1/TS2.
//
// This is a FRAGMENT, not a config: spread it into the repo's own flat config so the repo keeps
// ownership of files/ignores/parserOptions. Every rule below traces to a line of the standard;
// where a rule is a judgement call rather than a mechanical one, it is set to "warn" and said so.
//
// Usage (eslint.config.mjs):
//   import tseslint from 'typescript-eslint'
//   import { engRulebookTypeSafety } from './.claude/skills/eng-rulebook/checks/eslint/eng-rulebook-base.mjs'
//   export default [
//     ...tseslint.configs.recommendedTypeChecked,   // one compatible project choice
//     { languageOptions: { parserOptions: { projectService: true } } },
//     engRulebookTypeSafety,
//   ]
//
// This opt-in preset expects type-aware analysis. It does NOT select the project parser/config,
// because doing so would silently pin a typescript-eslint version inside a library that is copied
// between repos — version choice stays with the repo (tooling-and-workspace.md).

export const engRulebookTypeSafety = {
  name: 'eng-rulebook/type-safety',
  rules: {
    // type-safety.md TS1/TS2: `no-explicit-any` at error.
    '@typescript-eslint/no-explicit-any': 'error',

    // The no-unsafe-* family. These are what make `any` expensive rather than merely present:
    // an `any` that never flows anywhere is harmless, and these catch the flow.
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',

    // Kills `{} as T` — the emptiest claim available. Pairs with the semgrep rule of the same
    // name, which catches it in files ESLint is not configured to type-check.
    '@typescript-eslint/consistent-type-assertions': ['error', {
      assertionStyle: 'as',
      objectLiteralTypeAssertions: 'never',
    }],

    // comment-standard.md COM1: a bare suppression directive is a defect — the reason string is
    // the only record of why the rule is off.
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,          // forbidden outright; use ts-expect-error, which fails when stale
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 10,
    }],

    // WARN, deliberately: a non-null assertion is sometimes the honest expression of an invariant
    // the compiler cannot see. This preset warns; erroring indiscriminately can produce
    // suppression comments rather than better types, which is a worse outcome.
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
}

// Some negative tests deliberately construct invalid values; scope overrides to actual need. Spread this AFTER the
// fragment above. The path list is a starting point — a repo owns its own test glob.
export const engRulebookTypeSafetyTestOverrides = {
  name: 'eng-rulebook/type-safety-tests',
  files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**', '**/__tests__/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
}

export default [engRulebookTypeSafety, engRulebookTypeSafetyTestOverrides]
