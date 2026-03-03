#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');
const hasUninstall = args.includes('--uninstall') || args.includes('-u');
const hasHelp = args.includes('--help') || args.includes('-h');
const forceStatusline = args.includes('--force-statusline');

// Parse --profile argument
function parseProfileArg() {
  const idx = args.findIndex(a => a === '--profile');
  if (idx !== -1 && args[idx + 1]) {
    const val = args[idx + 1].toLowerCase();
    if (['quality', 'balanced', 'budget'].includes(val)) return val;
    console.error(`  ${yellow}Invalid profile: ${val}. Use quality, balanced, or budget.${reset}`);
    process.exit(1);
  }
  const eqArg = args.find(a => a.startsWith('--profile='));
  if (eqArg) {
    const val = eqArg.split('=')[1].toLowerCase();
    if (['quality', 'balanced', 'budget'].includes(val)) return val;
    console.error(`  ${yellow}Invalid profile: ${val}. Use quality, balanced, or budget.${reset}`);
    process.exit(1);
  }
  return null;
}
const explicitProfile = parseProfileArg();

// Parse --config-dir argument
function parseConfigDirArg() {
  const idx = args.findIndex(a => a === '--config-dir' || a === '-c');
  if (idx !== -1) {
    const next = args[idx + 1];
    if (!next || next.startsWith('-')) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return next;
  }
  const eqArg = args.find(a => a.startsWith('--config-dir=') || a.startsWith('-c='));
  if (eqArg) {
    const val = eqArg.split('=')[1];
    if (!val) {
      console.error(`  ${yellow}--config-dir requires a non-empty path${reset}`);
      process.exit(1);
    }
    return val;
  }
  return null;
}
const explicitConfigDir = parseConfigDirArg();

const banner = '\n' +
  cyan + '   █████╗  █████╗  █████╗\n' +
  '  ██╔══██╗██╔══██╗██╔══██╗\n' +
  '  ███████║███████║███████║\n' +
  '  ██╔══██║██╔══██║██╔══██║\n' +
  '  ██║  ██║██║  ██║██║  ██║\n' +
  '  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝' + reset + '\n' +
  '\n' +
  '  AAA — Architecture Agent Assembly ' + dim + 'v' + pkg.version + reset + '\n' +
  '  Multi-agent architecture design system for Claude Code.\n' +
  '  Produces verified architecture packages for agentic systems.\n';

console.log(banner);

if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx aaa-cc [options]\n
  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (to ~/.claude/)
    ${cyan}-l, --local${reset}               Install locally (to ./.claude/)
    ${cyan}-u, --uninstall${reset}           Uninstall AAA
    ${cyan}--profile <name>${reset}          Set model profile (quality|balanced|budget)
    ${cyan}--force-statusline${reset}        Replace existing statusline config
    ${cyan}-c, --config-dir <path>${reset}   Specify custom config directory
    ${cyan}-h, --help${reset}                Show this help message

  ${yellow}Examples:${reset}
    ${dim}# Interactive install (prompts for location and profile)${reset}
    npx aaa-cc

    ${dim}# Install globally with balanced profile${reset}
    npx aaa-cc --global

    ${dim}# Install globally with quality profile${reset}
    npx aaa-cc --global --profile quality

    ${dim}# Install to current project only${reset}
    npx aaa-cc --local

    ${dim}# Uninstall globally${reset}
    npx aaa-cc --global --uninstall

  ${yellow}Model Profiles:${reset}
    ${cyan}quality${reset}    Opus for intake/roadmapping/context, Sonnet for execution
    ${cyan}balanced${reset}   Same as quality (default)
    ${cyan}budget${reset}     Sonnet for high-value agents, Haiku for most others
`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────
// Utility functions
// ──────────────────────────────────────────────────────

function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function getGlobalDir() {
  if (explicitConfigDir) return expandTilde(explicitConfigDir);
  if (process.env.CLAUDE_CONFIG_DIR) return expandTilde(process.env.CLAUDE_CONFIG_DIR);
  return path.join(os.homedir(), '.claude');
}

function buildHookCommand(configDir, hookName) {
  const hooksPath = configDir.replace(/\\/g, '/') + '/hooks/' + hookName;
  return `node "${hooksPath}"`;
}

function readSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function writeSettings(settingsPath, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

// ──────────────────────────────────────────────────────
// Path replacement
// ──────────────────────────────────────────────────────

/**
 * Replace AAA-specific paths in .md file content.
 * Transforms relative paths to installed absolute paths.
 */
function replacePaths(content, pathPrefix) {
  // node bin/arch-tools.js → node {prefix}aaa-runtime/bin/arch-tools.js
  content = content.replace(/node bin\/arch-tools\.js/g, `node ${pathPrefix}aaa-runtime/bin/arch-tools.js`);

  // @references/ → @{prefix}aaa-runtime/references/
  content = content.replace(/@references\//g, `@${pathPrefix}aaa-runtime/references/`);

  // @templates/ → @{prefix}aaa-runtime/templates/
  content = content.replace(/@templates\//g, `@${pathPrefix}aaa-runtime/templates/`);

  // Standalone path references: references/foo.md and templates/foo.md
  // Match references/ or templates/ at word boundary or start of line, not preceded by aaa-runtime/
  content = content.replace(/(?<!aaa-runtime\/)(?<![a-zA-Z0-9_\-\/])references\//g, `${pathPrefix}aaa-runtime/references/`);
  content = content.replace(/(?<!aaa-runtime\/)(?<![a-zA-Z0-9_\-\/])templates\//g, `${pathPrefix}aaa-runtime/templates/`);

  return content;
}

// ──────────────────────────────────────────────────────
// Copy with path replacement
// ──────────────────────────────────────────────────────

/**
 * Recursively copy directory, replacing paths in .md files.
 * Deletes existing destDir first to remove orphaned files.
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith('.md')) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = replacePaths(content, pathPrefix);
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ──────────────────────────────────────────────────────
// Verification
// ──────────────────────────────────────────────────────

function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  ${yellow}\u2717${reset} Failed to install ${description}: directory not created`);
    return false;
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  ${yellow}\u2717${reset} Failed to install ${description}: directory is empty`);
      return false;
    }
  } catch (e) {
    console.error(`  ${yellow}\u2717${reset} Failed to install ${description}: ${e.message}`);
    return false;
  }
  return true;
}

function verifyFileInstalled(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ${yellow}\u2717${reset} Failed to install ${description}: file not created`);
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────
// Manifest (local patch detection)
// ──────────────────────────────────────────────────────

const PATCHES_DIR_NAME = 'aaa-local-patches';
const MANIFEST_NAME = 'aaa-file-manifest.json';

function fileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function generateManifest(dir, baseDir) {
  if (!baseDir) baseDir = dir;
  const manifest = {};
  if (!fs.existsSync(dir)) return manifest;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      Object.assign(manifest, generateManifest(fullPath, baseDir));
    } else {
      manifest[relPath] = fileHash(fullPath);
    }
  }
  return manifest;
}

function writeManifest(configDir) {
  const manifest = { version: pkg.version, timestamp: new Date().toISOString(), files: {} };

  // aaa-runtime directory
  const runtimeDir = path.join(configDir, 'aaa-runtime');
  const runtimeHashes = generateManifest(runtimeDir);
  for (const [rel, hash] of Object.entries(runtimeHashes)) {
    manifest.files['aaa-runtime/' + rel] = hash;
  }

  // commands/AAA
  const commandsDir = path.join(configDir, 'commands', 'AAA');
  if (fs.existsSync(commandsDir)) {
    const cmdHashes = generateManifest(commandsDir);
    for (const [rel, hash] of Object.entries(cmdHashes)) {
      manifest.files['commands/AAA/' + rel] = hash;
    }
  }

  // agents (arch-*.md only)
  const agentsDir = path.join(configDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir)) {
      if ((file.startsWith('arch-') || file === 'discuss-system.md' || file === 'context-engineer.md' || file === 'failure-analyst.md' || file === 'schema-designer.md' || file === 'system-analyzer.md') && file.endsWith('.md')) {
        manifest.files['agents/' + file] = fileHash(path.join(agentsDir, file));
      }
    }
  }

  fs.writeFileSync(path.join(configDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
  return manifest;
}

function saveLocalPatches(configDir) {
  const manifestPath = path.join(configDir, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) return [];

  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return []; }

  const patchesDir = path.join(configDir, PATCHES_DIR_NAME);
  const modified = [];

  for (const [relPath, originalHash] of Object.entries(manifest.files || {})) {
    const fullPath = path.join(configDir, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const currentHash = fileHash(fullPath);
    if (currentHash !== originalHash) {
      const backupPath = path.join(patchesDir, relPath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(fullPath, backupPath);
      modified.push(relPath);
    }
  }

  if (modified.length > 0) {
    const meta = {
      backed_up_at: new Date().toISOString(),
      from_version: manifest.version,
      files: modified
    };
    fs.writeFileSync(path.join(patchesDir, 'backup-meta.json'), JSON.stringify(meta, null, 2));
    console.log('  ' + yellow + 'i' + reset + '  Found ' + modified.length + ' locally modified AAA file(s) \u2014 backed up to ' + PATCHES_DIR_NAME + '/');
    for (const f of modified) {
      console.log('     ' + dim + f + reset);
    }
  }
  return modified;
}

function reportLocalPatches(configDir) {
  const patchesDir = path.join(configDir, PATCHES_DIR_NAME);
  const metaPath = path.join(patchesDir, 'backup-meta.json');
  if (!fs.existsSync(metaPath)) return [];

  let meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return []; }

  if (meta.files && meta.files.length > 0) {
    console.log('');
    console.log('  ' + yellow + 'Local patches detected' + reset + ' (from v' + meta.from_version + '):');
    for (const f of meta.files) {
      console.log('     ' + cyan + f + reset);
    }
    console.log('');
    console.log('  Your modifications are saved in ' + cyan + PATCHES_DIR_NAME + '/' + reset);
    console.log('  Manually compare and merge the files to restore your changes.');
    console.log('');
  }
  return meta.files || [];
}

// ──────────────────────────────────────────────────────
// Hooks cleanup
// ──────────────────────────────────────────────────────

function cleanupOrphanedHooks(settings) {
  let cleaned = false;

  if (settings.hooks) {
    for (const eventType of Object.keys(settings.hooks)) {
      const entries = settings.hooks[eventType];
      if (Array.isArray(entries)) {
        const filtered = entries.filter(entry => {
          if (entry.hooks && Array.isArray(entry.hooks)) {
            const hasOld = entry.hooks.some(h =>
              h.command && (h.command.includes('aaa-') && (
                h.command.includes('aaa-statusline') ||
                h.command.includes('aaa-check-update') ||
                h.command.includes('aaa-context-monitor')
              ))
            );
            if (hasOld) {
              cleaned = true;
              return false;
            }
          }
          return true;
        });
        settings.hooks[eventType] = filtered;
      }
    }
  }

  if (cleaned) {
    console.log(`  ${green}\u2713${reset} Removed previous AAA hook registrations`);
  }

  return settings;
}

// ──────────────────────────────────────────────────────
// Uninstall
// ──────────────────────────────────────────────────────

function uninstall(isGlobal) {
  const targetDir = isGlobal ? getGlobalDir() : path.join(process.cwd(), '.claude');
  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  console.log(`  Uninstalling AAA from ${cyan}${locationLabel}${reset}\n`);

  if (!fs.existsSync(targetDir)) {
    console.log(`  ${yellow}\u26A0${reset} Directory does not exist: ${locationLabel}`);
    console.log(`  Nothing to uninstall.\n`);
    return;
  }

  let removedCount = 0;

  // 1. Remove commands/AAA
  const commandsDir = path.join(targetDir, 'commands', 'AAA');
  if (fs.existsSync(commandsDir)) {
    fs.rmSync(commandsDir, { recursive: true });
    removedCount++;
    console.log(`  ${green}\u2713${reset} Removed commands/AAA/`);
  }

  // 2. Remove aaa-runtime
  const runtimeDir = path.join(targetDir, 'aaa-runtime');
  if (fs.existsSync(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true });
    removedCount++;
    console.log(`  ${green}\u2713${reset} Removed aaa-runtime/`);
  }

  // 3. Remove AAA agents
  const agentsDir = path.join(targetDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const aaaAgents = ['arch-checker.md', 'arch-debugger.md', 'arch-executor.md', 'arch-integrator.md',
      'arch-planner.md', 'arch-researcher.md', 'arch-roadmapper.md', 'arch-verifier.md',
      'context-engineer.md', 'discuss-system.md', 'failure-analyst.md', 'schema-designer.md',
      'system-analyzer.md'];
    let agentCount = 0;
    for (const file of aaaAgents) {
      const fp = path.join(agentsDir, file);
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        agentCount++;
      }
    }
    if (agentCount > 0) {
      removedCount++;
      console.log(`  ${green}\u2713${reset} Removed ${agentCount} AAA agents`);
    }
  }

  // 4. Remove AAA hooks
  const hooksDir = path.join(targetDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const aaaHooks = ['aaa-statusline.js', 'aaa-check-update.js', 'aaa-context-monitor.js'];
    let hookCount = 0;
    for (const hook of aaaHooks) {
      const hp = path.join(hooksDir, hook);
      if (fs.existsSync(hp)) {
        fs.unlinkSync(hp);
        hookCount++;
      }
    }
    if (hookCount > 0) {
      removedCount++;
      console.log(`  ${green}\u2713${reset} Removed ${hookCount} AAA hooks`);
    }
  }

  // 5. Remove manifest and patches
  const manifestPath = path.join(targetDir, MANIFEST_NAME);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
    console.log(`  ${green}\u2713${reset} Removed ${MANIFEST_NAME}`);
  }
  const patchesDir = path.join(targetDir, PATCHES_DIR_NAME);
  if (fs.existsSync(patchesDir)) {
    fs.rmSync(patchesDir, { recursive: true });
    console.log(`  ${green}\u2713${reset} Removed ${PATCHES_DIR_NAME}/`);
  }

  // 6. Clean settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    let settings = readSettings(settingsPath);
    let modified = false;

    // Remove AAA statusline
    if (settings.statusLine && settings.statusLine.command &&
        settings.statusLine.command.includes('aaa-statusline')) {
      delete settings.statusLine;
      modified = true;
      console.log(`  ${green}\u2713${reset} Removed AAA statusline from settings`);
    }

    // Remove AAA hooks from SessionStart
    if (settings.hooks && settings.hooks.SessionStart) {
      const before = settings.hooks.SessionStart.length;
      settings.hooks.SessionStart = settings.hooks.SessionStart.filter(entry => {
        if (entry.hooks && Array.isArray(entry.hooks)) {
          return !entry.hooks.some(h => h.command && h.command.includes('aaa-'));
        }
        return true;
      });
      if (settings.hooks.SessionStart.length < before) {
        modified = true;
        console.log(`  ${green}\u2713${reset} Removed AAA hooks from SessionStart`);
      }
      if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart;
    }

    // Remove AAA hooks from PostToolUse
    if (settings.hooks && settings.hooks.PostToolUse) {
      const before = settings.hooks.PostToolUse.length;
      settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(entry => {
        if (entry.hooks && Array.isArray(entry.hooks)) {
          return !entry.hooks.some(h => h.command && h.command.includes('aaa-'));
        }
        return true;
      });
      if (settings.hooks.PostToolUse.length < before) {
        modified = true;
        console.log(`  ${green}\u2713${reset} Removed AAA hooks from PostToolUse`);
      }
      if (settings.hooks.PostToolUse.length === 0) delete settings.hooks.PostToolUse;
    }

    if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;

    if (modified) {
      writeSettings(settingsPath, settings);
      removedCount++;
    }
  }

  if (removedCount === 0) {
    console.log(`  ${yellow}\u26A0${reset} No AAA files found to remove.`);
  }

  console.log(`\n  ${green}Done!${reset} AAA has been uninstalled.\n  Your other files and settings have been preserved.\n`);
}

// ──────────────────────────────────────────────────────
// Install
// ──────────────────────────────────────────────────────

function install(isGlobal, profile) {
  const src = path.join(__dirname, '..');
  const targetDir = isGlobal ? getGlobalDir() : path.join(process.cwd(), '.claude');
  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  // Path prefix for file references in markdown content
  const pathPrefix = isGlobal
    ? `${targetDir.replace(/\\/g, '/')}/`
    : './.claude/';

  console.log(`  Installing AAA to ${cyan}${locationLabel}${reset} with ${cyan}${profile}${reset} profile\n`);

  const failures = [];

  // Save local patches before overwriting
  saveLocalPatches(targetDir);

  // 1. Install commands/AAA/
  const commandsDir = path.join(targetDir, 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });
  const cmdSrc = path.join(src, 'commands', 'AAA');
  const cmdDest = path.join(commandsDir, 'AAA');
  copyWithPathReplacement(cmdSrc, cmdDest, pathPrefix);
  if (verifyInstalled(cmdDest, 'commands/AAA')) {
    const count = fs.readdirSync(cmdDest).filter(f => f.endsWith('.md')).length;
    console.log(`  ${green}\u2713${reset} Installed ${count} commands to commands/AAA/`);
  } else {
    failures.push('commands/AAA');
  }

  // 2. Install aaa-runtime/ runtime
  const runtimeSrc = path.join(src, 'aaa-runtime');
  const runtimeDest = path.join(targetDir, 'aaa-runtime');
  copyWithPathReplacement(runtimeSrc, runtimeDest, pathPrefix);

  // Apply selected model profile
  const configPath = path.join(runtimeDest, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.model_profile = profile;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    } catch (e) {}
  }

  if (verifyInstalled(runtimeDest, 'aaa-runtime')) {
    console.log(`  ${green}\u2713${reset} Installed aaa-runtime/`);
  } else {
    failures.push('aaa-runtime');
  }

  // 3. Install agents
  const agentsSrc = path.join(src, 'agents');
  if (fs.existsSync(agentsSrc)) {
    const agentsDest = path.join(targetDir, 'agents');
    fs.mkdirSync(agentsDest, { recursive: true });

    // Remove old AAA agents before copying new ones
    const aaaAgentNames = ['arch-checker.md', 'arch-debugger.md', 'arch-executor.md', 'arch-integrator.md',
      'arch-planner.md', 'arch-researcher.md', 'arch-roadmapper.md', 'arch-verifier.md',
      'context-engineer.md', 'discuss-system.md', 'failure-analyst.md', 'schema-designer.md',
      'system-analyzer.md'];
    for (const file of aaaAgentNames) {
      const fp = path.join(agentsDest, file);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    // Copy agents with path replacement
    const agentEntries = fs.readdirSync(agentsSrc, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        let content = fs.readFileSync(path.join(agentsSrc, entry.name), 'utf8');
        content = replacePaths(content, pathPrefix);
        fs.writeFileSync(path.join(agentsDest, entry.name), content);
      }
    }
    const installedCount = aaaAgentNames.filter(f => fs.existsSync(path.join(agentsDest, f))).length;
    console.log(`  ${green}\u2713${reset} Installed ${installedCount} agents`);
  }

  // 4. Install hooks
  const hooksSrc = path.join(src, 'hooks');
  if (fs.existsSync(hooksSrc)) {
    const hooksDest = path.join(targetDir, 'hooks');
    fs.mkdirSync(hooksDest, { recursive: true });
    const hookEntries = fs.readdirSync(hooksSrc);
    for (const entry of hookEntries) {
      const srcFile = path.join(hooksSrc, entry);
      if (fs.statSync(srcFile).isFile()) {
        const destFile = path.join(hooksDest, entry);
        if (entry.endsWith('.js')) {
          let content = fs.readFileSync(srcFile, 'utf8');
          // Template the AAA config dir for hooks (only replaces AAA_DIR, not Claude Code internals)
          content = content.replace(/const AAA_DIR = '\.claude';/g, `const AAA_DIR = '${path.basename(targetDir)}';`);
          fs.writeFileSync(destFile, content);
        } else {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
    if (verifyInstalled(hooksDest, 'hooks')) {
      console.log(`  ${green}\u2713${reset} Installed hooks`);
    } else {
      failures.push('hooks');
    }
  }

  // 5. Write VERSION file
  const versionDest = path.join(runtimeDest, 'VERSION');
  fs.writeFileSync(versionDest, pkg.version);
  if (verifyFileInstalled(versionDest, 'VERSION')) {
    console.log(`  ${green}\u2713${reset} Wrote VERSION (${pkg.version})`);
  } else {
    failures.push('VERSION');
  }

  // 6. Write package.json for CommonJS mode
  const pkgJsonDest = path.join(targetDir, 'package.json');
  // Only write if it doesn't exist or is our minimal marker
  if (!fs.existsSync(pkgJsonDest)) {
    fs.writeFileSync(pkgJsonDest, '{"type":"commonjs"}\n');
    console.log(`  ${green}\u2713${reset} Wrote package.json (CommonJS mode)`);
  } else {
    try {
      const existing = fs.readFileSync(pkgJsonDest, 'utf8').trim();
      if (existing === '{"type":"commonjs"}') {
        // Already ours, skip
      }
    } catch (e) {}
  }

  if (failures.length > 0) {
    console.error(`\n  ${yellow}Installation incomplete!${reset} Failed: ${failures.join(', ')}`);
    process.exit(1);
  }

  // Write file manifest
  writeManifest(targetDir);
  console.log(`  ${green}\u2713${reset} Wrote file manifest (${MANIFEST_NAME})`);

  // Report local patches
  reportLocalPatches(targetDir);

  // Configure settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  const settings = cleanupOrphanedHooks(readSettings(settingsPath));

  const statuslineCommand = isGlobal
    ? buildHookCommand(targetDir, 'aaa-statusline.js')
    : 'node .claude/hooks/aaa-statusline.js';
  const updateCheckCommand = isGlobal
    ? buildHookCommand(targetDir, 'aaa-check-update.js')
    : 'node .claude/hooks/aaa-check-update.js';
  const contextMonitorCommand = isGlobal
    ? buildHookCommand(targetDir, 'aaa-context-monitor.js')
    : 'node .claude/hooks/aaa-context-monitor.js';

  // SessionStart hook for update checking
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  const hasUpdateHook = settings.hooks.SessionStart.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('aaa-check-update'))
  );
  if (!hasUpdateHook) {
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: updateCheckCommand }]
    });
    console.log(`  ${green}\u2713${reset} Configured update check hook`);
  }

  // PostToolUse hook for context monitoring
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

  const hasContextHook = settings.hooks.PostToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('aaa-context-monitor'))
  );
  if (!hasContextHook) {
    settings.hooks.PostToolUse.push({
      hooks: [{ type: 'command', command: contextMonitorCommand }]
    });
    console.log(`  ${green}\u2713${reset} Configured context monitor hook`);
  }

  return { settingsPath, settings, statuslineCommand };
}

// ──────────────────────────────────────────────────────
// Statusline handler
// ──────────────────────────────────────────────────────

function handleStatusline(settings, isInteractive, callback) {
  const hasExisting = settings.statusLine != null;

  if (!hasExisting) {
    callback(true);
    return;
  }

  if (forceStatusline) {
    callback(true);
    return;
  }

  if (!isInteractive) {
    console.log(`  ${yellow}\u26A0${reset} Skipping statusline (already configured)`);
    console.log(`    Use ${cyan}--force-statusline${reset} to replace\n`);
    callback(false);
    return;
  }

  const existingCmd = settings.statusLine.command || settings.statusLine.url || '(custom)';

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`
  ${yellow}\u26A0${reset} Existing statusline detected\n
  Your current statusline:
    ${dim}command: ${existingCmd}${reset}

  AAA includes a statusline showing:
    \u2022 Model profile (quality/balanced/budget)
    \u2022 Current phase and status
    \u2022 Context window usage (color-coded)

  ${cyan}1${reset}) Keep existing
  ${cyan}2${reset}) Replace with AAA statusline
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || '1';
    callback(choice === '2');
  });
}

function finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline) {
  if (shouldInstallStatusline) {
    settings.statusLine = { type: 'command', command: statuslineCommand };
    console.log(`  ${green}\u2713${reset} Configured statusline`);
  }

  writeSettings(settingsPath, settings);

  console.log(`
  ${green}Done!${reset} Open a project directory in Claude Code and run ${cyan}/AAA:new-system${reset}.

  ${yellow}Quick Start:${reset}
    1. ${dim}cd your-project${reset}
    2. ${dim}claude${reset}
    3. ${dim}/AAA:new-system "describe your agentic system"${reset}

  ${yellow}Commands:${reset}
    ${cyan}/AAA:new-system${reset}      Start designing a new system
    ${cyan}/AAA:plan-phase${reset}      Plan a design phase
    ${cyan}/AAA:execute-phase${reset}   Execute a design phase
    ${cyan}/AAA:verify-phase${reset}    Verify a completed phase
    ${cyan}/AAA:progress${reset}        Show current project status
    ${cyan}/AAA:resume${reset}          Resume from last checkpoint
`);
}

// ──────────────────────────────────────────────────────
// Interactive prompts
// ──────────────────────────────────────────────────────

function promptLocation(profile, callback) {
  if (!process.stdin.isTTY) {
    console.log(`  ${yellow}Non-interactive terminal, defaulting to global install${reset}\n`);
    callback(true);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let answered = false;

  rl.on('close', () => {
    if (!answered) {
      answered = true;
      console.log(`\n  ${yellow}Installation cancelled${reset}\n`);
      process.exit(0);
    }
  });

  const globalPath = getGlobalDir().replace(os.homedir(), '~');

  console.log(`  ${yellow}Where would you like to install?${reset}\n
  ${cyan}1${reset}) Global ${dim}(${globalPath})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(./.claude/)${reset} - this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    answered = true;
    rl.close();
    const choice = answer.trim() || '1';
    callback(choice !== '2');
  });
}

function promptProfile(callback) {
  if (!process.stdin.isTTY) {
    callback('balanced');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let answered = false;

  rl.on('close', () => {
    if (!answered) {
      answered = true;
      console.log(`\n  ${yellow}Installation cancelled${reset}\n`);
      process.exit(0);
    }
  });

  console.log(`  ${yellow}Select model profile:${reset}\n
  ${cyan}1${reset}) quality    ${dim}Opus for intake/roadmapping/context, Sonnet for execution${reset}
  ${cyan}2${reset}) balanced   ${dim}Same as quality (recommended default)${reset}
  ${cyan}3${reset}) budget     ${dim}Sonnet for high-value, Haiku for most agents${reset}
`);

  rl.question(`  Choice ${dim}[2]${reset}: `, (answer) => {
    answered = true;
    rl.close();
    const choice = answer.trim() || '2';
    if (choice === '1') callback('quality');
    else if (choice === '3') callback('budget');
    else callback('balanced');
  });
}

// ──────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────

if (hasGlobal && hasLocal) {
  console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
  process.exit(1);
} else if (explicitConfigDir && hasLocal) {
  console.error(`  ${yellow}Cannot use --config-dir with --local${reset}`);
  process.exit(1);
} else if (hasUninstall) {
  if (!hasGlobal && !hasLocal) {
    console.error(`  ${yellow}--uninstall requires --global or --local${reset}`);
    process.exit(1);
  }
  uninstall(hasGlobal);
} else if (hasGlobal || hasLocal) {
  // Non-interactive with location specified
  const profile = explicitProfile || 'balanced';
  const result = install(hasGlobal, profile);
  handleStatusline(result.settings, false, (shouldInstall) => {
    finishInstall(result.settingsPath, result.settings, result.statuslineCommand, shouldInstall);
  });
} else {
  // Fully interactive
  promptProfile((profile) => {
    promptLocation(profile, (isGlobal) => {
      const result = install(isGlobal, profile);
      handleStatusline(result.settings, true, (shouldInstall) => {
        finishInstall(result.settingsPath, result.settings, result.statuslineCommand, shouldInstall);
      });
    });
  });
}
