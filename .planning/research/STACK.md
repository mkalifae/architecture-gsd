# Stack Research

**Domain:** Multi-agent CLI tool producing agentic architecture design documents
**Researched:** 2026-02-27
**Confidence:** HIGH (core platform facts verified against official Claude Code docs; library facts verified via npm/official sources)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Claude Code CLI | Current (1.0.33+) | Host platform for all agents, commands, skills | Architecture GSD lives inside this runtime — no separate process, no build step, no server. Agents are markdown files; orchestration is the Agent/Task tool. This is the only viable host. |
| Node.js (via gsd-tools.js pattern) | 18+ LTS | CLI helper utilities invoked from agent/skill content via Bash tool | GSD itself uses a single zero-dependency Node.js file (4,500 lines) for all state manipulation, frontmatter CRUD, verification, and scaffolding. Arch-GSD should follow the same pattern. |
| Bash (POSIX) | System bash | Glue between Claude Code primitives and Node helper | Agents invoke `node arch-tools.js <command>` exactly as GSD calls `node gsd-tools.js`. Bash is the lingua franca for tool calls in agent markdown. |
| Markdown + YAML frontmatter | — | All agent specs, skills, commands, output documents | Claude Code's native format. Agents are `.md` files with YAML frontmatter. Output schemas are embedded YAML/JSON in markdown prose. No alternative format is viable here. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gray-matter` | 4.0.3 | Parse YAML frontmatter from agent spec `.md` files | Use in `arch-tools.js` whenever reading agent frontmatter to extract `name`, `description`, `tools`, `model`, etc. Industry standard (1.4M weekly downloads; used by Gatsby, Astro, VitePress, Shopify Polaris). |
| `js-yaml` | 4.x | Serialize/deserialize YAML in output schemas | Use when generating or reading YAML output documents (architecture schemas, agent topology specs). The `yaml` npm package (eemeli/yaml) is a zero-dependency alternative with YAML 1.2 support and is also acceptable. |
| `ajv` | 8.18.0 | JSON/YAML schema validation for cross-reference checking | Use in the verification layer to validate that agent output YAML/JSON conforms to defined schemas. 170M+ weekly downloads; supports JSON Schema draft-2020-12. Required for Levels 2–4 of the 4-level verification suite. |
| `ajv-formats` | 3.x | String format validators (uri, date, email) for ajv | Use alongside ajv when output schemas contain `format` fields (e.g., component identifiers, file paths). Required since ajv v7+ dropped built-in formats. |
| `toposort` | 2.0.2 | Topological sort + cycle detection for agent dependency graphs | Use to detect circular dependencies in agent orchestration topology (e.g., agent A spawns agent B which spawns A). Throws on cycles — exactly the behavior needed. Small (206 dependents), pure JS, zero deps. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `/agents` command | Manage subagent definitions interactively | Built into Claude Code. Use to create/edit/test the 11 specialized agents during development. |
| `--plugin-dir` flag | Test the tool without installing | `claude --plugin-dir ./arch-gsd` loads the plugin locally for development iteration. |
| Claude Code hooks (`PreToolUse`, `PostToolUse`) | Enforce agent constraints programmatically | Hook scripts validate that agents only write to their designated output directories, preventing cross-contamination. |
| `node arch-tools.js` | CLI helper (to be built, modeled on gsd-tools.js) | Centralizes all state management, frontmatter CRUD, cross-reference validation, schema generation. Called from agent Bash tool invocations. |

---

## Platform Integration: How Architecture GSD Fits Into Claude Code

This is the central architectural fact. Architecture GSD is not a standalone app — it is a **Claude Code plugin or `.claude/` standalone configuration**. The complete platform model is:

### Claude Code Directory Structure

```
(project root)
└── .claude/
    ├── agents/                  # Subagent markdown specs
    │   ├── arch-researcher.md   # Each of the 11 specialized agents
    │   ├── arch-planner.md
    │   ├── arch-checker.md
    │   └── ... (9 more)
    ├── commands/                # Slash commands
    │   ├── arch-new.md          # /arch:new — entry point
    │   ├── arch-research.md     # /arch:research
    │   └── arch-verify.md       # /arch:verify
    ├── skills/                  # Reusable skill content loaded into agents
    │   ├── arch-patterns/
    │   │   └── SKILL.md         # GSD's 10 meta-patterns as a skill
    │   └── verification-levels/
    │       └── SKILL.md         # 4-level verification protocol
    └── hooks/                   # (optional) PreToolUse guards
```

**OR as a plugin** (for sharing/distribution):

```
arch-gsd/
├── .claude-plugin/
│   └── plugin.json              # name, version, description
├── agents/                      # Same 11 agent specs
├── commands/                    # Same slash commands (namespaced: /arch-gsd:new)
├── skills/                      # Same skills
└── bin/
    └── arch-tools.js            # CLI helper, modeled on gsd-tools.js
```

### Agent Spec Frontmatter (HIGH confidence — verified against official docs)

Each agent `.md` file uses this frontmatter:

```yaml
---
name: arch-researcher          # required, lowercase-hyphens, max 64 chars
description: >                 # required: when Claude delegates to this agent
  Researches domain-specific patterns, existing systems, and technical
  constraints for the architecture being designed. Use when the orchestrator
  needs external knowledge before design begins.
model: opus                    # sonnet | opus | haiku | inherit
tools: Read, Grep, Glob, WebSearch, WebFetch, Bash
maxTurns: 30                   # prevent runaway agents
skills:                        # inject GSD meta-patterns as context
  - arch-patterns
  - verification-levels
---

[System prompt for this agent follows here as markdown]
```

**Key constraint discovered:** Subagents cannot spawn other subagents (official docs confirmed). Only the main thread (the orchestrator) can spawn agents via the Task tool. This means the `discuss-system` orchestrator must be the main thread, not a subagent itself.

### Skill Frontmatter (HIGH confidence — verified against official docs)

```yaml
---
name: arch-patterns
description: GSD's 10 meta-patterns for agentic architecture design
user-invocable: false          # background knowledge, not a slash command
---
```

### Slash Command Frontmatter (HIGH confidence — verified against official docs)

```yaml
---
description: Start an Architecture GSD session for a new system
allowed-tools: Read, Bash, Task
argument-hint: [system-description]
---
```

---

## Disk-as-Shared-Memory Pattern (the coordination mechanism)

Architecture GSD's agents communicate via files, exactly as GSD does. The shared filesystem is the "database."

**Output directory convention:**

```
.arch/
├── context/
│   └── SYSTEM-CONTEXT.md      # discuss-system output; all agents read this
├── research/
│   ├── DOMAIN-RESEARCH.md     # arch-researcher output
│   ├── STACK-RESEARCH.md      # arch-researcher output
│   └── PATTERNS-RESEARCH.md   # arch-researcher output
├── design/
│   ├── COMPONENT-MAP.yaml     # schema-designer output
│   ├── AGENT-TOPOLOGY.yaml    # arch-planner output
│   └── FAILURE-MODES.yaml     # failure-analyst output
├── verification/
│   └── VERIFICATION-REPORT.md # arch-verifier output
└── output/
    ├── ARCHITECTURE.md        # prose document (arch-integrator)
    └── SCHEMAS.yaml           # structured schemas (arch-integrator)
```

**Tool calls use arch-tools.js (to build):**

```bash
# Agents call this from Bash tool:
node ~/.claude/get-shit-done/../arch-gsd/bin/arch-tools.js context load
node ~/.claude/get-shit-done/../arch-gsd/bin/arch-tools.js schema validate --file .arch/design/AGENT-TOPOLOGY.yaml
node ~/.claude/get-shit-done/../arch-gsd/bin/arch-tools.js graph check-cycles --file .arch/design/AGENT-TOPOLOGY.yaml
```

---

## Schema Validation Approach

The 4-level verification suite requires schema validation. The recommended approach:

**Level 1 — Exists:** `fs.existsSync()` in arch-tools.js
**Level 2 — Substantive:** AJV schema validation against a defined JSON Schema
**Level 3 — Cross-Referenced:** Custom graph traversal — each component reference in AGENT-TOPOLOGY.yaml must resolve to an entry in COMPONENT-MAP.yaml
**Level 4 — Internally Consistent:** Topological sort on the dependency graph; AJV cross-schema validation

```javascript
// arch-tools.js excerpt (to build)
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const toposort = require('toposort');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Level 2: validate agent topology schema
function validateAgentTopology(yamlPath) {
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const data = yaml.load(content);
  const validate = ajv.compile(AGENT_TOPOLOGY_SCHEMA);
  return { valid: validate(data), errors: validate.errors };
}

// Level 3: check cross-references
function checkCrossReferences(topologyPath, componentMapPath) { ... }

// Level 4: detect circular dependencies
function detectCycles(edges) {
  try {
    toposort(edges);
    return { hasCycles: false };
  } catch (e) {
    return { hasCycles: true, message: e.message };
  }
}
```

---

## Installation

**For development and local use (standalone):**

No npm install required for the Claude Code integration layer. The agent/skill/command markdown files work immediately in `.claude/`.

For `arch-tools.js` helper:

```bash
# Create package.json alongside arch-tools.js
npm install gray-matter js-yaml ajv ajv-formats toposort

# Or bundle everything (zero-install alternative):
# Use only Node.js built-ins + inline YAML parsing regex
# (GSD's gsd-tools.js does exactly this — zero external dependencies)
```

**Recommendation:** Follow GSD's zero-dependency pattern for `arch-tools.js`. Implement a minimal YAML parser inline using regex (for simple key:value pairs) and use Node.js `JSON.parse` for schema validation. This eliminates all installation friction. Only add npm deps if the validation complexity genuinely requires AJV.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Standalone `.claude/` config | Claude Code plugin | Use plugin structure when you want to distribute to other users via marketplace. For personal/team use, standalone is simpler (no namespacing, shorter command names like `/arch:new` vs `/arch-gsd:new`). |
| Single `arch-tools.js` (zero deps) | Multiple npm packages (ajv, gray-matter, etc.) | Use full npm stack only if validation schemas become complex enough that hand-rolled regex is error-prone. GSD's gsd-tools.js proves zero deps works at 4,500 lines. |
| `toposort` npm package | Custom DFS cycle detection | Use custom DFS if you want zero deps. `toposort` adds only ~50 lines of logic but does eliminate one class of bugs. Either is valid. |
| Disk-based shared memory (`.arch/` files) | In-memory state | Files are required. Subagents run in separate contexts — they cannot share memory. Files are the only coordination mechanism available. |
| `js-yaml` for YAML output | `yaml` (eemeli/yaml) | `yaml` package is the more modern option (YAML 1.2 spec, zero deps, better error messages). Either works. `js-yaml` has more weekly downloads and is more commonly found in existing codebases. |
| Skills for GSD meta-patterns | Embed patterns in each agent's system prompt | Skills inject content into agents without duplication. If all 11 agents need the 10 meta-patterns, a skill is the right DRY mechanism. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain / LangGraph | External orchestration framework incompatible with Claude Code's Agent tool model; adds massive complexity with no benefit inside CC | Claude Code's native Task tool for agent spawning; disk files for state |
| MCP servers for inter-agent communication | Overcomplicated; MCP is for external tool integration (databases, APIs), not agent-to-agent messaging | Disk files: agents write outputs, orchestrator reads them |
| SQLite / any database | Unnecessary for a CLI design tool; adds installation friction | Plain markdown and YAML files in `.arch/` |
| TypeScript compilation | The platform (Claude Code) does not compile TypeScript at runtime; agent files are executed as markdown, not as code | Plain JavaScript for `arch-tools.js`; markdown for everything else |
| `commander` / `yargs` for CLI parsing | `arch-tools.js` is not a user-facing CLI — it's a subprocess utility called from Bash tool invocations; simple `process.argv` switch statements suffice | Inline switch/case as in gsd-tools.js |
| Fixed 11-agent template | Forces every session through all 11 agents regardless of system complexity | Phase/agent selection based on system intent (smaller systems skip failure-analyst, context-engineer, etc.) |

---

## Stack Patterns by Variant

**If building for personal/team use on one machine:**
- Use standalone `.claude/` directory structure
- Short command names: `/arch:new`, `/arch:research`, `/arch:verify`
- No `plugin.json` required
- Store in `~/.claude/` for global availability

**If distributing as a shared tool:**
- Use plugin structure with `.claude-plugin/plugin.json`
- Commands become namespaced: `/arch-gsd:new`
- Distribute via GitHub repo as a plugin marketplace entry
- Use `--plugin-dir ./arch-gsd` for testing

**If the system being designed is simple (< 5 agents):**
- Skip: `failure-analyst`, `context-engineer`, `arch-roadmapper`
- Run: `discuss-system` → `arch-researcher` → `arch-planner` → `arch-checker` → `arch-integrator`
- Output: single combined ARCHITECTURE.md

**If the system being designed is complex (> 15 agents, distributed):**
- Run all 11 agents
- `schema-designer` produces explicit JSON Schema for each agent's input/output
- `failure-analyst` maps failure cascade paths across agent boundaries
- `arch-verifier` runs Level 3 and Level 4 checks across all schemas

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| ajv@8.x | ajv-formats@3.x | ajv-formats 2.x works with ajv 8.x too but 3.x is current |
| gray-matter@4.x | js-yaml@4.x | gray-matter uses js-yaml internally; pinning both prevents version conflicts |
| Node.js 18+ | All listed packages | All packages support Node 18+. Claude Code runs on whatever Node is installed. |
| Claude Code 1.0.33+ | Plugin structure | Plugin system launched in v1.0.33; prior versions only support standalone `.claude/` config. |

---

## Sources

- [Claude Code Subagents Docs](https://code.claude.com/docs/en/sub-agents) — Frontmatter fields, scoping, spawning constraints (subagents cannot spawn subagents), tool restrictions — HIGH confidence
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) — SKILL.md frontmatter, `context: fork`, `agent:` field, `disable-model-invocation`, `user-invocable`, dynamic context injection — HIGH confidence
- [Claude Code Plugins Docs](https://code.claude.com/docs/en/plugins) — Plugin directory structure, plugin.json schema, standalone vs plugin tradeoffs — HIGH confidence
- [Claude Agent SDK Slash Commands Docs](https://platform.claude.com/docs/en/agent-sdk/slash-commands) — Command file format, `allowed-tools`, `argument-hint`, argument substitution `$ARGUMENTS` — HIGH confidence
- [ajv npm](https://www.npmjs.com/package/ajv) + [ajv.js.org](https://ajv.js.org/) — v8.18.0 confirmed current; 170M+ weekly downloads; JSON Schema draft-2020-12 support — HIGH confidence
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) + [npm](https://www.npmjs.com/package/gray-matter) — v4.0.3 confirmed current; 1.4M weekly downloads; used by Gatsby, Astro, VitePress — HIGH confidence
- [toposort npm](https://www.npmjs.com/package/toposort) — Throws on cycles; zero deps; 206 dependents — MEDIUM confidence (npm listing, not official docs)
- [js-yaml GitHub](https://github.com/nodeca/js-yaml) + [yaml (eemeli)](https://eemeli.org/yaml/) — Both are viable YAML libs; eemeli/yaml is YAML 1.2 spec compliant — HIGH confidence
- GSD codebase inspection (`/home/mkali/.claude/get-shit-done/bin/gsd-tools.js`) — Confirmed zero external dependencies (only `fs`, `path`, `child_process`); 4,503 lines; model profile table; frontmatter parsing via regex; verification patterns — HIGH confidence (direct source inspection)

---

*Stack research for: Architecture GSD — multi-agent CLI tool producing agentic architecture design packages*
*Researched: 2026-02-27*
