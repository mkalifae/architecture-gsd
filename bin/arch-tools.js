#!/usr/bin/env node

/**
 * arch-tools.js — CLI utility for Architecture GSD workflow operations
 *
 * Provides programmatic tooling for all Phase 1 command groups:
 * frontmatter CRUD, stub detection, phase state management,
 * CONTEXT.md validation, and naming convention validation.
 *
 * Usage: node bin/arch-tools.js <command> [args]
 *
 * All commands output JSON to stdout. Errors go to stderr. Exit 0 on success, 1 on error.
 * Zero npm dependencies — only Node.js built-ins (fs, path, child_process).
 *
 * Commands:
 *   frontmatter get <file> [--field key]          Extract frontmatter as JSON
 *   frontmatter set <file> --field k --value v    Update single frontmatter field
 *   frontmatter merge <file> --data '{json}'      Merge JSON into frontmatter
 *
 *   detect-stubs <file>                           Scan file body for stub phrases
 *   detect-stubs --dir <directory>                Scan all .md files in directory
 *
 *   state init --phase N --name <name>            Create phase directory + update STATE.md
 *   state transition --from N --to M              Record phase transition in STATE.md
 *   state status [--phase N]                      Query current phase position
 *
 *   validate-context <file>                       Validate CONTEXT.md required fields
 *   validate-names <file>                         Scan file for naming convention violations
 *   validate-names --dir <directory>              Scan all files in directory
 *
 *   --help                                        Show this help text
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Constants ────────────────────────────────────────────────────────────────

const STUB_PATTERNS = [
  { pattern: /\bTBD\b/i, label: 'TBD' },
  { pattern: /to be determined/i, label: 'to be determined' },
  { pattern: /handles gracefully/i, label: 'handles gracefully' },
  { pattern: /as needed/i, label: 'as needed' },
  { pattern: /will be (added|defined|specified) later/i, label: 'deferred specification' },
  { pattern: /placeholder/i, label: 'placeholder' },
  { pattern: /coming soon/i, label: 'coming soon' },
  { pattern: /TODO\b/, label: 'TODO' },
  { pattern: /FIXME\b/, label: 'FIXME' },
  { pattern: /details to follow/i, label: 'details to follow' },
  { pattern: /specify later/i, label: 'specify later' },
];

const CONTEXT_REQUIRED_FIELDS = ['domain', 'actors', 'non-goals', 'constraints', 'scale', 'locked-decisions'];
const CONTEXT_NON_EMPTY_LISTS = ['actors', 'non-goals', 'constraints'];
const CONTEXT_NON_EMPTY_STRINGS = ['domain'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function safeWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract YAML frontmatter from markdown content.
 * Handles: simple key:value, inline arrays [a, b], multi-line arrays (- item), nested objects.
 */
function extractFrontmatter(content) {
  const frontmatter = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;

  const yaml = match[1];
  const lines = yaml.split('\n');

  // Stack to track nested objects: [{obj, key, indent}]
  let stack = [{ obj: frontmatter, key: null, indent: -1 }];

  for (const line of lines) {
    if (line.trim() === '') continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Pop stack back to appropriate level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    // Check for key: value pattern
    const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch) {
      const key = keyMatch[2];
      const value = keyMatch[3].trim();

      if (value === '' || value === '[') {
        // Key with no value — nested object or array
        current.obj[key] = value === '[' ? [] : {};
        current.key = null;
        stack.push({ obj: current.obj[key], key: null, indent });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array: key: [a, b, c]
        const inner = value.slice(1, -1).trim();
        if (inner === '') {
          current.obj[key] = [];
        } else {
          current.obj[key] = inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
        current.key = null;
      } else {
        // Simple key: value
        current.obj[key] = value.replace(/^["']|["']$/g, '');
        current.key = null;
      }
    } else if (line.trim().startsWith('- ')) {
      // Array item
      const itemValue = line.trim().slice(2);

      // If current context is an empty object, convert to array
      if (typeof current.obj === 'object' && !Array.isArray(current.obj) && Object.keys(current.obj).length === 0) {
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent) {
          for (const k of Object.keys(parent.obj)) {
            if (parent.obj[k] === current.obj) {
              parent.obj[k] = [];
              // Check if item is a sub-object (key: value pattern)
              const subKeyMatch = itemValue.match(/^([a-zA-Z0-9_-]+):\s*(.*)/);
              if (subKeyMatch) {
                const subObj = {};
                subObj[subKeyMatch[1]] = subKeyMatch[2].replace(/^["']|["']$/g, '');
                parent.obj[k].push(subObj);
              } else {
                parent.obj[k].push(itemValue.replace(/^["']|["']$/g, ''));
              }
              stack[stack.length - 1].obj = parent.obj[k];
              break;
            }
          }
        }
      } else if (Array.isArray(current.obj)) {
        // Check if item is a sub-object (key: value pattern)
        const subKeyMatch = itemValue.match(/^([a-zA-Z0-9_-]+):\s*(.*)/);
        if (subKeyMatch) {
          const subObj = {};
          subObj[subKeyMatch[1]] = subKeyMatch[2].replace(/^["']|["']$/g, '');
          current.obj.push(subObj);
        } else {
          current.obj.push(itemValue.replace(/^["']|["']$/g, ''));
        }
      }
    }
  }

  return frontmatter;
}

/**
 * Reconstruct YAML frontmatter string from a JS object.
 * Preserves key order. Handles strings, arrays, and nested objects.
 */
function reconstructFrontmatter(obj, indent = 0) {
  const lines = [];
  const prefix = ' '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else if (value.every(v => typeof v === 'string') && value.length <= 3 && value.join(', ').length < 60) {
        lines.push(`${prefix}${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              lines.push(`${prefix}  - ${firstKey}: ${firstVal}`);
              for (let i = 1; i < entries.length; i++) {
                lines.push(`${prefix}    ${entries[i][0]}: ${entries[i][1]}`);
              }
            }
          } else {
            const sv = String(item);
            lines.push(`${prefix}  - ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
          }
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      for (const [subkey, subval] of Object.entries(value)) {
        if (subval === null || subval === undefined) continue;
        if (Array.isArray(subval)) {
          if (subval.length === 0) {
            lines.push(`${prefix}  ${subkey}: []`);
          } else if (subval.every(v => typeof v === 'string') && subval.length <= 3 && subval.join(', ').length < 60) {
            lines.push(`${prefix}  ${subkey}: [${subval.join(', ')}]`);
          } else {
            lines.push(`${prefix}  ${subkey}:`);
            for (const item of subval) {
              const sv = String(item);
              lines.push(`${prefix}    - ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
            }
          }
        } else if (typeof subval === 'object') {
          lines.push(`${prefix}  ${subkey}:`);
          for (const [subsubkey, subsubval] of Object.entries(subval)) {
            if (subsubval === null || subsubval === undefined) continue;
            const sv = String(subsubval);
            lines.push(`${prefix}    ${subsubkey}: ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
          }
        } else {
          const sv = String(subval);
          lines.push(`${prefix}  ${subkey}: ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
        }
      }
    } else {
      const sv = String(value);
      if (sv.includes(':') || sv.includes('#') || sv.startsWith('[') || sv.startsWith('{')) {
        lines.push(`${prefix}${key}: "${sv}"`);
      } else {
        lines.push(`${prefix}${key}: ${sv}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Replace frontmatter section in content with a new object.
 */
function spliceFrontmatter(content, newObj) {
  const yamlStr = reconstructFrontmatter(newObj);
  const match = content.match(/^---\n[\s\S]+?\n---/);
  if (match) {
    return `---\n${yamlStr}\n---` + content.slice(match[0].length);
  }
  return `---\n${yamlStr}\n---\n\n` + content;
}

/**
 * Strip frontmatter from content, returning only the document body.
 */
function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]+?\n---\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

/**
 * Find project root by walking up from cwd looking for .planning/
 */
function findProjectRoot() {
  let dir = process.cwd();
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    if (fs.existsSync(path.join(dir, '.planning'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Load and return config.json with defaults applied.
 */
function loadConfig() {
  const root = findProjectRoot();
  const configPath = path.join(root, '.planning', 'config.json');

  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    parallelization: true,
    depth: 'comprehensive',
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Object.assign({}, defaults, parsed, { _root: root, _configPath: configPath });
  } catch {
    return Object.assign({}, defaults, { _root: root, _configPath: configPath });
  }
}

/**
 * Convert a string to a URL-safe kebab-case slug.
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Pad a phase number to 2 digits (e.g., 1 -> "01", 12 -> "12").
 */
function padPhase(n) {
  return String(n).padStart(2, '0');
}

/**
 * Output JSON result to stdout and exit.
 */
function output(data) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

/**
 * Output error to stderr and exit with code 1.
 */
function error(msg, data = {}) {
  const result = { error: msg, ...data };
  process.stderr.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(1);
}

// ─── Command: --help ─────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
arch-tools.js — CLI utility for Architecture GSD workflow operations

USAGE
  node bin/arch-tools.js <command> [options]

All commands output JSON to stdout. Errors go to stderr.
Exit code 0 on success, 1 on error. Zero npm dependencies.

FRONTMATTER CRUD
  frontmatter get <file> [--field key]
      Extract YAML frontmatter from a markdown file as JSON.
      If --field specified, return only that field's value.

  frontmatter set <file> --field key --value jsonVal
      Update a single frontmatter field. value is parsed as JSON
      (use quotes for strings: --value '"my string"').

  frontmatter merge <file> --data '{json}'
      Shallow-merge a JSON object into existing frontmatter.

STUB DETECTION
  detect-stubs <file>
      Scan document body (not frontmatter) for stub phrases.
      Patterns: TBD, to be determined, handles gracefully, as needed,
      will be added/defined/specified later, placeholder, coming soon,
      TODO, FIXME, details to follow, specify later.

  detect-stubs --dir <directory>
      Scan all .md files in directory recursively.

STATE MANAGEMENT
  state init --phase N --name <name>
      Create phase directory at .planning/phases/{NN}-{slug}/ and
      update STATE.md to record current phase.

  state transition --from N --to M
      Record phase transition in STATE.md (update current phase).

  state status [--phase N]
      Query current phase position from STATE.md.
      If --phase N, return status for that specific phase.

CONTEXT VALIDATION
  validate-context <file>
      Validate a CONTEXT.md file has all 6 required frontmatter fields
      and that list fields are non-empty.
      Required fields: domain, actors, non-goals, constraints, scale, locked-decisions
      Non-empty lists required: actors, non-goals, constraints
      Non-empty string required: domain

NAMING VALIDATION
  validate-names <file>
      Scan file for naming convention violations:
      - Agent names (frontmatter name:): must be kebab-case /^[a-z][a-z0-9-]*$/
      - Event names (type: event or EventName patterns): must be PascalCase /^[A-Z][a-zA-Z0-9]*$/
      - Command names (type: command): must be SCREAMING_SNAKE /^[A-Z][A-Z0-9_]*$/

  validate-names --dir <directory>
      Scan all files in directory.

OPTIONS
  --help    Show this help text
`);
  process.exit(0);
}

// ─── Command: frontmatter get ─────────────────────────────────────────────────

function cmdFrontmatterGet(args) {
  const file = args[0];
  if (!file) error('Usage: frontmatter get <file> [--field key]');

  const content = safeReadFile(file);
  if (content === null) error(`Cannot read file: ${file}`, { file });

  const fm = extractFrontmatter(content);

  const fieldIdx = args.indexOf('--field');
  if (fieldIdx !== -1) {
    const fieldKey = args[fieldIdx + 1];
    if (!fieldKey) error('--field requires a key argument');
    const value = fm[fieldKey];
    output({ field: fieldKey, value: value !== undefined ? value : null, file });
  }

  output({ frontmatter: fm, file });
}

// ─── Command: frontmatter set ─────────────────────────────────────────────────

function cmdFrontmatterSet(args) {
  const file = args[0];
  if (!file) error('Usage: frontmatter set <file> --field key --value jsonVal');

  const fieldIdx = args.indexOf('--field');
  const valueIdx = args.indexOf('--value');

  if (fieldIdx === -1 || valueIdx === -1) {
    error('frontmatter set requires --field and --value');
  }

  const fieldKey = args[fieldIdx + 1];
  const rawValue = args[valueIdx + 1];

  if (!fieldKey) error('--field requires a key argument');
  if (rawValue === undefined) error('--value requires a value argument');

  let parsedValue;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    // If not valid JSON, treat as a plain string
    parsedValue = rawValue;
  }

  const content = safeReadFile(file);
  if (content === null) error(`Cannot read file: ${file}`, { file });

  const fm = extractFrontmatter(content);
  fm[fieldKey] = parsedValue;

  const newContent = spliceFrontmatter(content, fm);
  if (!safeWriteFile(file, newContent)) {
    error(`Cannot write file: ${file}`, { file });
  }

  output({ updated: true, field: fieldKey, value: parsedValue, file });
}

// ─── Command: frontmatter merge ───────────────────────────────────────────────

function cmdFrontmatterMerge(args) {
  const file = args[0];
  if (!file) error('Usage: frontmatter merge <file> --data \'{json}\'');

  const dataIdx = args.indexOf('--data');
  if (dataIdx === -1) error('frontmatter merge requires --data \'{json}\'');

  const rawData = args[dataIdx + 1];
  if (!rawData) error('--data requires a JSON string argument');

  let mergeData;
  try {
    mergeData = JSON.parse(rawData);
  } catch (e) {
    error(`--data is not valid JSON: ${e.message}`, { raw: rawData });
  }

  if (typeof mergeData !== 'object' || Array.isArray(mergeData) || mergeData === null) {
    error('--data must be a JSON object (not array or primitive)');
  }

  const content = safeReadFile(file);
  if (content === null) error(`Cannot read file: ${file}`, { file });

  const fm = extractFrontmatter(content);
  const merged = Object.assign({}, fm, mergeData);

  const newContent = spliceFrontmatter(content, merged);
  if (!safeWriteFile(file, newContent)) {
    error(`Cannot write file: ${file}`, { file });
  }

  output({ merged: true, fields: Object.keys(mergeData), file });
}

// ─── Command: detect-stubs ───────────────────────────────────────────────────

function scanFileForStubs(filePath) {
  const content = safeReadFile(filePath);
  if (content === null) return null;

  const body = stripFrontmatter(content);
  const lines = body.split('\n');
  const stubs = [];

  // Track line numbers — add frontmatter line count offset
  const fmMatch = content.match(/^---\n[\s\S]+?\n---\n?/);
  const fmLineCount = fmMatch ? fmMatch[0].split('\n').length - 1 : 0;

  lines.forEach((line, idx) => {
    for (const { pattern, label } of STUB_PATTERNS) {
      if (pattern.test(line)) {
        stubs.push({
          line: fmLineCount + idx + 1,
          text: line.trim(),
          pattern: label,
        });
        break; // Only report first matching pattern per line
      }
    }
  });

  return {
    file: filePath,
    stubs_found: stubs.length,
    stubs,
    clean: stubs.length === 0,
  };
}

function findMarkdownFiles(dir) {
  const results = [];

  function recurse(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        recurse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  recurse(dir);
  return results;
}

function cmdDetectStubs(args) {
  const dirIdx = args.indexOf('--dir');

  if (dirIdx !== -1) {
    const dir = args[dirIdx + 1];
    if (!dir) error('--dir requires a directory path');

    if (!fs.existsSync(dir)) error(`Directory not found: ${dir}`, { dir });

    const files = findMarkdownFiles(dir);
    const results = files.map(f => scanFileForStubs(f)).filter(Boolean);
    const filesWithStubs = results.filter(r => !r.clean);

    output({
      directory: dir,
      files_scanned: results.length,
      files_with_stubs: filesWithStubs.length,
      results,
    });
  } else {
    const file = args[0];
    if (!file) error('Usage: detect-stubs <file> | detect-stubs --dir <directory>');

    if (!fs.existsSync(file)) error(`File not found: ${file}`, { file });

    const result = scanFileForStubs(file);
    if (result === null) error(`Cannot read file: ${file}`, { file });

    output(result);
  }
}

// ─── Command: state init ──────────────────────────────────────────────────────

function getStateMdPath() {
  const root = findProjectRoot();
  return path.join(root, '.planning', 'STATE.md');
}

function readStateMd() {
  const statePath = getStateMdPath();
  return safeReadFile(statePath) || '';
}

function writeStateMd(content) {
  const statePath = getStateMdPath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  return safeWriteFile(statePath, content);
}

function parseStatePhase(stateContent) {
  // Extract current phase number from "Phase: N of M" line
  const match = stateContent.match(/^Phase:\s*(\d+)\s+of\s+(\d+)/m);
  if (match) {
    return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }
  return { current: 1, total: 5 };
}

function parseStatePhaseNames(stateContent) {
  // Extract phase name from "Current focus: Phase N — Name" line
  const match = stateContent.match(/\*\*Current focus:\*\*\s*Phase\s+\d+\s+[—-]+\s+(.+)/);
  if (match) return match[1].trim();

  const altMatch = stateContent.match(/Current focus:\s*Phase\s+\d+\s+[—-]+\s+(.+)/);
  if (altMatch) return altMatch[1].trim();

  return '';
}

function cmdStateInit(args) {
  const phaseIdx = args.indexOf('--phase');
  const nameIdx = args.indexOf('--name');

  if (phaseIdx === -1 || nameIdx === -1) {
    error('Usage: state init --phase N --name <name>');
  }

  const phaseNum = args[phaseIdx + 1];
  const phaseName = args[nameIdx + 1];

  if (!phaseNum || !phaseName) {
    error('--phase and --name are required');
  }

  const phaseN = parseInt(phaseNum, 10);
  if (isNaN(phaseN)) error(`Invalid phase number: ${phaseNum}`);

  const padded = padPhase(phaseN);
  const slug = generateSlug(phaseName);
  const root = findProjectRoot();
  const phaseDirName = `${padded}-${slug}`;
  const phaseDirPath = path.join(root, '.planning', 'phases', phaseDirName);

  // Create phase directory
  fs.mkdirSync(phaseDirPath, { recursive: true });

  // Update STATE.md
  let stateContent = readStateMd();
  let stateUpdated = false;

  if (stateContent) {
    // Update Phase: N of M line
    const newState = stateContent.replace(
      /^(Phase:)\s*\d+\s+(of\s+\d+)/m,
      `$1 ${phaseN} $2`
    );
    if (newState !== stateContent) {
      stateContent = newState;
      stateUpdated = true;
    }
  }

  if (!stateUpdated) {
    // Append phase info if not found
    stateContent += `\n\nPhase: ${phaseN} of 5\n`;
    stateUpdated = true;
  }

  writeStateMd(stateContent);

  output({
    phase_dir: phaseDirPath,
    phase_dir_name: phaseDirName,
    padded_phase: padded,
    slug,
    created: true,
    state_updated: stateUpdated,
  });
}

// ─── Command: state transition ────────────────────────────────────────────────

function cmdStateTransition(args) {
  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');

  if (fromIdx === -1 || toIdx === -1) {
    error('Usage: state transition --from N --to M');
  }

  const fromNum = args[fromIdx + 1];
  const toNum = args[toIdx + 1];

  if (!fromNum || !toNum) error('--from and --to are required');

  const fromN = parseInt(fromNum, 10);
  const toN = parseInt(toNum, 10);

  if (isNaN(fromN) || isNaN(toN)) error(`Invalid phase numbers: from=${fromNum}, to=${toNum}`);

  let stateContent = readStateMd();
  let transitioned = false;

  if (stateContent) {
    const newState = stateContent.replace(
      /^(Phase:)\s*\d+(\s+of\s+\d+)/m,
      `$1 ${toN}$2`
    );
    if (newState !== stateContent) {
      stateContent = newState;
      transitioned = true;
    }
  }

  if (!transitioned) {
    stateContent = (stateContent || '') + `\nPhase: ${toN} of 5\n`;
    transitioned = true;
  }

  writeStateMd(stateContent);

  output({ from: fromN, to: toN, transitioned });
}

// ─── Command: state status ────────────────────────────────────────────────────

function cmdStateStatus(args) {
  const phaseIdx = args.indexOf('--phase');
  const stateContent = readStateMd();
  const phaseInfo = parseStatePhase(stateContent);
  const phaseName = parseStatePhaseNames(stateContent);

  if (phaseIdx !== -1) {
    const phaseNum = parseInt(args[phaseIdx + 1], 10);
    if (isNaN(phaseNum)) error(`Invalid phase number: ${args[phaseIdx + 1]}`);

    let status;
    if (phaseNum < phaseInfo.current) {
      status = 'complete';
    } else if (phaseNum === phaseInfo.current) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }

    output({
      current_phase: phaseInfo.current,
      queried_phase: phaseNum,
      total_phases: phaseInfo.total,
      phase_name: phaseNum === phaseInfo.current ? phaseName : '',
      status,
    });
  } else {
    output({
      current_phase: phaseInfo.current,
      total_phases: phaseInfo.total,
      phase_name: phaseName,
      status: 'in_progress',
    });
  }
}

// ─── Command: validate-context ────────────────────────────────────────────────

function cmdValidateContext(args) {
  const file = args[0];
  if (!file) error('Usage: validate-context <file>');

  const content = safeReadFile(file);
  if (content === null) error(`Cannot read file: ${file}`, { file });

  const fm = extractFrontmatter(content);

  const missingFields = [];
  const emptyRequiredFields = [];
  const presentFields = [];

  for (const field of CONTEXT_REQUIRED_FIELDS) {
    if (!(field in fm) || fm[field] === undefined || fm[field] === null) {
      missingFields.push(field);
    } else {
      presentFields.push(field);

      // Check non-empty list fields
      if (CONTEXT_NON_EMPTY_LISTS.includes(field)) {
        const val = fm[field];
        if (!Array.isArray(val) || val.length === 0) {
          emptyRequiredFields.push(field);
        }
      }

      // Check non-empty string fields
      if (CONTEXT_NON_EMPTY_STRINGS.includes(field)) {
        const val = fm[field];
        if (typeof val !== 'string' || val.trim() === '') {
          emptyRequiredFields.push(field);
        }
      }
    }
  }

  const valid = missingFields.length === 0 && emptyRequiredFields.length === 0;

  output({
    valid,
    missing_fields: missingFields,
    empty_required_fields: emptyRequiredFields,
    present_fields: presentFields,
    file,
  });
}

// ─── Command: validate-names ─────────────────────────────────────────────────

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]*$/;
const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;
const SCREAMING_SNAKE_RE = /^[A-Z][A-Z0-9_]*$/;

function scanFileForNamingViolations(filePath) {
  const content = safeReadFile(filePath);
  if (content === null) return null;

  const violations = [];
  const fm = extractFrontmatter(content);

  // Check agent name in frontmatter (name: field)
  if (fm.name) {
    const name = String(fm.name);
    // Heuristic: if file is an agent spec (in agents/ directory or has agent-like fields)
    const isAgentSpec = filePath.includes('/agents/') ||
      fm.model !== undefined || fm.tools !== undefined ||
      fm.description !== undefined;

    if (isAgentSpec && !KEBAB_CASE_RE.test(name)) {
      violations.push({
        type: 'agent',
        name,
        rule: 'kebab-case',
        expected_pattern: '^[a-z][a-z0-9-]*$',
        example: generateSlug(name),
        location: 'frontmatter name:',
      });
    }
  }

  // Scan body for event and command naming conventions
  const body = content; // scan entire file including frontmatter for YAML blocks
  const lines = body.split('\n');

  let currentType = null;
  let inYamlBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track type: declarations (matches both "type: event" and "- type: event")
    const typeMatch = line.match(/^\s*-?\s*type:\s*(\S+)/);
    if (typeMatch) {
      currentType = typeMatch[1].toLowerCase().replace(/['"]/g, '');
    }

    // Check name: fields following type: event or type: command
    const nameMatch = line.match(/^\s*-?\s*name:\s*(\S+)/);
    if (nameMatch) {
      const nameVal = nameMatch[1].replace(/^["']|["']$/g, '');

      // Look backwards for a type: declaration within 5 lines
      let foundType = null;
      for (let j = Math.max(0, i - 5); j < i; j++) {
        const prevTypeMatch = lines[j].match(/^\s*-?\s*type:\s*(\S+)/);
        if (prevTypeMatch) {
          foundType = prevTypeMatch[1].toLowerCase().replace(/['"]/g, '');
        }
      }
      // Also look forward within 2 lines
      for (let j = i + 1; j < Math.min(lines.length, i + 3); j++) {
        const nextTypeMatch = lines[j].match(/^\s*-?\s*type:\s*(\S+)/);
        if (nextTypeMatch) {
          foundType = nextTypeMatch[1].toLowerCase().replace(/['"]/g, '');
        }
      }

      if (foundType === 'event' && nameVal && !PASCAL_CASE_RE.test(nameVal)) {
        violations.push({
          type: 'event',
          name: nameVal,
          rule: 'PascalCase',
          expected_pattern: '^[A-Z][a-zA-Z0-9]*$',
          example: nameVal.charAt(0).toUpperCase() + nameVal.slice(1),
          location: `line ${lineNum}`,
        });
      } else if (foundType === 'command' && nameVal && !SCREAMING_SNAKE_RE.test(nameVal)) {
        violations.push({
          type: 'command',
          name: nameVal,
          rule: 'SCREAMING_SNAKE',
          expected_pattern: '^[A-Z][A-Z0-9_]*$',
          example: nameVal.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          location: `line ${lineNum}`,
        });
      }
    }

    // Also detect inline event references: "- event: EventName" patterns
    const eventRefMatch = line.match(/^\s*-?\s*event:\s*(\S+)/);
    if (eventRefMatch) {
      const eventName = eventRefMatch[1].replace(/^["']|["']$/g, '');
      if (eventName && !PASCAL_CASE_RE.test(eventName)) {
        violations.push({
          type: 'event_reference',
          name: eventName,
          rule: 'PascalCase',
          expected_pattern: '^[A-Z][a-zA-Z0-9]*$',
          example: eventName.charAt(0).toUpperCase() + eventName.slice(1),
          location: `line ${lineNum}`,
        });
      }
    }
  }

  return {
    file: filePath,
    violations,
    valid: violations.length === 0,
  };
}

function cmdValidateNames(args) {
  const dirIdx = args.indexOf('--dir');

  if (dirIdx !== -1) {
    const dir = args[dirIdx + 1];
    if (!dir) error('--dir requires a directory path');

    if (!fs.existsSync(dir)) error(`Directory not found: ${dir}`, { dir });

    const files = findMarkdownFiles(dir);
    const results = files.map(f => scanFileForNamingViolations(f)).filter(Boolean);
    const filesWithViolations = results.filter(r => !r.valid);

    output({
      directory: dir,
      files_scanned: results.length,
      files_with_violations: filesWithViolations.length,
      results,
    });
  } else {
    const file = args[0];
    if (!file) error('Usage: validate-names <file> | validate-names --dir <directory>');

    if (!fs.existsSync(file)) error(`File not found: ${file}`, { file });

    const result = scanFileForNamingViolations(file);
    if (result === null) error(`Cannot read file: ${file}`, { file });

    output(result);
  }
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  showHelp();
}

const command = argv[0];
const subArgs = argv.slice(1);

switch (command) {
  case 'frontmatter': {
    const sub = subArgs[0];
    const subSubArgs = subArgs.slice(1);
    switch (sub) {
      case 'get':    cmdFrontmatterGet(subSubArgs); break;
      case 'set':    cmdFrontmatterSet(subSubArgs); break;
      case 'merge':  cmdFrontmatterMerge(subSubArgs); break;
      default:
        error(`Unknown frontmatter sub-command: ${sub}. Use: get, set, merge`);
    }
    break;
  }

  case 'detect-stubs':
    cmdDetectStubs(subArgs);
    break;

  case 'state': {
    const sub = subArgs[0];
    const subSubArgs = subArgs.slice(1);
    switch (sub) {
      case 'init':       cmdStateInit(subSubArgs); break;
      case 'transition': cmdStateTransition(subSubArgs); break;
      case 'status':     cmdStateStatus(subSubArgs); break;
      default:
        error(`Unknown state sub-command: ${sub}. Use: init, transition, status`);
    }
    break;
  }

  case 'validate-context':
    cmdValidateContext(subArgs);
    break;

  case 'validate-names':
    cmdValidateNames(subArgs);
    break;

  default:
    error(`Unknown command: ${command}. Run --help for usage.`);
}
