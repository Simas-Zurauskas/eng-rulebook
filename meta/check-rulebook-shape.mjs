#!/usr/bin/env node
// Compatibility entrypoint; current validation has one implementation.
import { validate } from './check.mjs';
import { fileURLToPath } from 'node:url';
const result = validate(fileURLToPath(new URL('../', import.meta.url)));
for (const error of result.errors) console.error(error);
console.log(`${result.errors.length ? 'FAIL' : 'OK'}: ${result.guides} guides, ${result.checks} named checks`);
process.exitCode = result.errors.length ? 1 : 0;
