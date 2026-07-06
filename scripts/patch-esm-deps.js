#!/usr/bin/env node
// Fixes broken npm symlinks for ESM-only packages used by @hot-updater/cli-tools.
// Runs automatically via postinstall.
const fs   = require('fs');
const path = require('path');
const nm   = path.join(__dirname, '..', 'node_modules');

// ─── fix oxc-transform: replace broken symlink with real CJS shim copy ──────
const oxcShim   = path.join(__dirname, '..', 'shims', 'oxc-transform');
const oxcNested = path.join(nm, '@hot-updater', 'cli-tools', 'node_modules', 'oxc-transform');

if (fs.existsSync(oxcShim)) {
  try { fs.rmSync(oxcNested, { recursive: true, force: true }); } catch (_) {}
  fs.mkdirSync(oxcNested, { recursive: true });
  for (const f of fs.readdirSync(oxcShim)) {
    fs.copyFileSync(path.join(oxcShim, f), path.join(oxcNested, f));
  }
  console.log('patched: @hot-updater/cli-tools oxc-transform → CJS shim');
}

console.log('patch-esm-deps: done');
