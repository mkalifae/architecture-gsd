#!/usr/bin/env node
// Check for AAA updates in background, write result to cache
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawn } = require('child_process');

const AAA_DIR = '.claude'; // Replaced by installer for custom config dirs

const homeDir = os.homedir();
const cwd = process.cwd();
const cacheDir = path.join(homeDir, '.claude', 'cache');
const cacheFile = path.join(cacheDir, 'aaa-update-check.json');

const projectVersionFile = path.join(cwd, AAA_DIR, 'aaa-runtime', 'VERSION');
const globalVersionFile = path.join(homeDir, AAA_DIR, 'aaa-runtime', 'VERSION');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Read installed version
let installed = '0.0.0';
try {
  if (fs.existsSync(projectVersionFile)) {
    installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
  } else if (fs.existsSync(globalVersionFile)) {
    installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
  }
} catch (e) {}

// Check npm registry in background using spawn (no shell injection risk)
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const { execFileSync } = require('child_process');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const installed = ${JSON.stringify(installed)};

  let latest = null;
  try {
    latest = execFileSync('npm', ['view', 'aaa-cc', 'version'], {
      encoding: 'utf8',
      timeout: 10000
    }).trim();
  } catch (e) {}

  const result = {
    update_available: latest && installed !== latest,
    installed,
    latest: latest || 'unknown',
    checked: Math.floor(Date.now() / 1000)
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));
`], {
  stdio: 'ignore',
  detached: true
});

child.unref();
