#!/usr/bin/env node
// Claude Code Statusline - AAA Edition
// Shows: model | profile | current task | directory | context usage

const fs = require('fs');
const path = require('path');
const os = require('os');

const AAA_DIR = '.claude'; // Replaced by installer for custom config dirs

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Model profile from config.json
    let profile = '';
    const homeDir = os.homedir();
    const configPaths = [
      path.join(dir, AAA_DIR, 'aaa-runtime', 'config.json'),
      path.join(homeDir, AAA_DIR, 'aaa-runtime', 'config.json'),
    ];
    for (const p of configPaths) {
      if (fs.existsSync(p)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
          profile = cfg.model_profile || 'balanced';
        } catch (e) {}
        break;
      }
    }

    // Current phase from .arch/STATE.md
    let phase = '';
    const statePath = path.join(dir, '.arch', 'STATE.md');
    if (fs.existsSync(statePath)) {
      try {
        const state = fs.readFileSync(statePath, 'utf8');
        const phaseMatch = state.match(/current_phase:\s*(\d+)/);
        const statusMatch = state.match(/status:\s*(\S+)/);
        if (phaseMatch) {
          phase = `P${phaseMatch[1]}`;
          if (statusMatch) phase += `:${statusMatch[1]}`;
        }
      } catch (e) {}
    }

    // Context window display (scaled to 80% limit)
    let ctx = '';
    if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      // Write bridge file for context-monitor hook
      if (session) {
        try {
          const bridgePath = path.join(os.tmpdir(), `claude-ctx-${session}.json`);
          fs.writeFileSync(bridgePath, JSON.stringify({
            session_id: session,
            remaining_percentage: remaining,
            used_pct: used,
            timestamp: Math.floor(Date.now() / 1000)
          }));
        } catch (e) {}
      }

      const filled = Math.floor(used / 10);
      const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

      if (used < 63) {
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) {
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) {
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          try {
            const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
            const inProgress = todos.find(t => t.status === 'in_progress');
            if (inProgress) task = inProgress.activeForm || '';
          } catch (e) {}
        }
      } catch (e) {}
    }

    // Update available?
    let updateNotice = '';
    const cacheFile = path.join(homeDir, '.claude', 'cache', 'aaa-update-check.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.update_available) {
          updateNotice = '\x1b[33m\u2B06 update\x1b[0m \u2502 ';
        }
      } catch (e) {}
    }

    // Build output
    const dirname = path.basename(dir);
    const parts = [updateNotice];
    parts.push(`\x1b[36mAAA\x1b[0m`);
    if (profile) parts.push(`\x1b[2m${profile}\x1b[0m`);
    if (phase) parts.push(`\x1b[1m${phase}\x1b[0m`);
    if (task) parts.push(`\x1b[1m${task}\x1b[0m`);
    parts.push(`\x1b[2m${dirname}\x1b[0m`);

    process.stdout.write(parts.join(' \u2502 ') + ctx);
  } catch (e) {
    // Silent fail
  }
});
