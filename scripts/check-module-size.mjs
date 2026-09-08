#!/usr/bin/env node
/**
 * Module size ratchet.
 *
 * A source file over MAX_LINES fails unless it is recorded in the baseline, and a baselined
 * file fails as soon as it grows. New code therefore has to be split from the start, while the
 * monoliths we already have are allowed to exist and can only get smaller.
 *
 *   node scripts/check-module-size.mjs            # every tracked source file (CI)
 *   node scripts/check-module-size.mjs --staged   # staged files only (pre-commit)
 *   node scripts/check-module-size.mjs --update   # rewrite the baseline after a cleanup pass
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const MAX_LINES = 400;
const BASELINE_PATH = 'scripts/module-size-baseline.json';

const SOURCE_ROOTS = [
  'MuseBar/src/',
  'MuseBar/backend/src/',
  'MuseBar/bridge/src/',
  'MuseBar/packages/',
];

function isCheckedSource(file) {
  if (!/\.(ts|tsx)$/.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  if (/\.test\.(ts|tsx)$/.test(file)) return false;
  if (!SOURCE_ROOTS.some((root) => file.startsWith(root))) return false;
  // Only the TypeScript sources of shared packages, not their build output.
  if (file.startsWith('MuseBar/packages/') && !file.includes('/src/')) return false;
  return true;
}

function gitList(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
}

function countLines(file) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.length;
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return { maxLines: MAX_LINES, files: {} };
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(files) {
  const sorted = Object.fromEntries(
    Object.entries(files).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
  const payload = {
    maxLines: MAX_LINES,
    note:
      'Files already above the cap when the ratchet was introduced. They may only shrink; ' +
      'remove an entry once the file is under the cap. Regenerate with --update only after a ' +
      'deliberate cleanup pass.',
    files: sorted,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

const mode = process.argv.includes('--update')
  ? 'update'
  : process.argv.includes('--staged')
    ? 'staged'
    : 'check';

const files = (
  mode === 'staged'
    ? gitList(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'])
    : gitList(['ls-files', '-z'])
).filter((file) => isCheckedSource(file) && existsSync(file));

if (mode === 'update') {
  const previous = readBaseline().files;
  const oversized = {};
  const loosened = [];
  for (const file of files) {
    const lines = countLines(file);
    if (lines <= MAX_LINES) continue;
    const allowance = previous[file];
    if (allowance !== undefined && lines > allowance) loosened.push(`${file}: ${allowance} → ${lines}`);
    oversized[file] = lines;
  }

  // A ratchet that can be loosened is not a ratchet.
  if (loosened.length > 0) {
    console.error(
      `\nRefusing to raise the allowance of ${loosened.length} file(s):\n  ${loosened.join('\n  ')}\n` +
        '\nShrink them first, or drop the entry by hand with a written justification.\n'
    );
    process.exit(1);
  }

  const payload = writeBaseline(oversized);
  console.log(
    `Baseline updated: ${Object.keys(payload.files).length} file(s) above ${MAX_LINES} lines.`
  );
  process.exit(0);
}

const baseline = readBaseline();
const failures = [];
const shrinkable = [];

for (const file of files) {
  const lines = countLines(file);
  const allowance = baseline.files[file];

  if (lines <= MAX_LINES) {
    if (allowance !== undefined) shrinkable.push(file);
    continue;
  }

  if (allowance === undefined) {
    failures.push(`${file}: ${lines} lines (cap ${MAX_LINES}) — split it before committing.`);
  } else if (lines > allowance) {
    failures.push(
      `${file}: ${lines} lines, grew from ${allowance}. This file is already over the cap; ` +
        'move the new code into its own module instead of adding here.'
    );
  }
}

if (shrinkable.length > 0) {
  console.log(
    `Now under the cap — drop from ${BASELINE_PATH}:\n  ${shrinkable.join('\n  ')}`
  );
}

if (failures.length > 0) {
  console.error(`\nModule size check failed (${failures.length}):\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    '\nOne file per component or concern. Extract hooks, services, helpers or subcomponents' +
      '\ninto sibling modules. See .cursor/skills/code-hygiene/SKILL.md.\n'
  );
  process.exit(1);
}

console.log(`Module size check passed (${files.length} file(s), cap ${MAX_LINES} lines).`);
