#!/usr/bin/env node
// Aponta os hooks do Git deste repositório para `.githooks/`.
//
// Roda como `prepare` de client/ e midoteca/ (npm install/npm ci), garantindo
// que todo mundo formate no commit. Ver docs/CONVENTIONS.md §2.

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function isGitRepository() {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!isGitRepository()) {
  process.exit(0);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
