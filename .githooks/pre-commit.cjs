#!/usr/bin/env node
/*
 Pre-commit guardrail: blocks committing very large files (>50MB) and .xlsx/.xls files.
 Enable with: git config core.hooksPath .githooks
*/
const { execSync } = require('child_process');

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only -z', { encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

function getFileSize(path) {
  try {
    const fs = require('fs');
    const stat = fs.statSync(path);
    return stat.size;
  } catch (_) {
    return 0;
  }
}

function fail(msg) {
  console.error(`\n[pre-commit] ${msg}\n`);
  process.exit(1);
}

const MAX = 50 * 1024 * 1024; // 50MB
const files = getStagedFiles();
for (const f of files) {
  const lower = f.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    fail(`Blocking commit: Excel file detected: ${f}. These should not be committed. Place them under OLD-REPO/backend/data and keep them untracked.`);
  }
  const size = getFileSize(f);
  if (size > MAX) {
    fail(`Blocking commit: ${f} is ${(size / (1024*1024)).toFixed(2)} MB (> 50 MB). Split or exclude this file.`);
  }
}

process.exit(0);
