# AAA - Architecture Agent Assembly

Multi-agent architecture design system for Claude Code. Given a description of an agentic system, AAA produces a complete, internally consistent, cross-referenced architecture package that development teams can implement without making architectural decisions.

## Quick Start

```bash
npx aaa-cc
```

Follow the interactive prompts to select install location and model profile, then:

```bash
cd your-project
claude
/AAA:new-system "automated PR code review pipeline with 6 agents"
```

## Installation

### Interactive (recommended)

```bash
npx aaa-cc
```

Prompts for:
1. **Model profile** - quality, balanced, or budget
2. **Install location** - global (`~/.claude/`) or local (`./.claude/`)
3. **Statusline** - replace existing or keep

### Non-interactive

```bash
# Install globally with default (balanced) profile
npx aaa-cc --global

# Install globally with quality profile
npx aaa-cc --global --profile quality

# Install locally (current project only)
npx aaa-cc --local

# Install with budget profile
npx aaa-cc --global --profile budget

# Custom config directory
npx aaa-cc --global --config-dir ~/.claude-work
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `-g, --global` | Install to `~/.claude/` (all projects) |
| `-l, --local` | Install to `./.claude/` (this project) |
| `--profile <name>` | Set model profile: `quality`, `balanced`, `budget` |
| `--force-statusline` | Replace existing statusline configuration |
| `-c, --config-dir <path>` | Custom config directory |
| `-u, --uninstall` | Remove AAA (requires `--global` or `--local`) |
| `-h, --help` | Show help |

### Uninstall

```bash
npx aaa-cc --global --uninstall
npx aaa-cc --local --uninstall
```

## Model Profiles

Control which Claude model each agent uses. Select during install or change later in `~/.claude/aaa-runtime/config.json`.

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| discuss-system | opus | opus | sonnet |
| arch-roadmapper | opus | opus | sonnet |
| context-engineer | opus | opus | sonnet |
| arch-researcher | sonnet | sonnet | haiku |
| arch-planner | sonnet | sonnet | haiku |
| arch-executor | sonnet | sonnet | sonnet |
| arch-verifier | sonnet | sonnet | haiku |
| schema-designer | sonnet | sonnet | haiku |
| failure-analyst | sonnet | sonnet | haiku |
| arch-checker | haiku | haiku | haiku |
| arch-integrator | haiku | haiku | haiku |

- **quality/balanced**: Opus for intake, roadmapping, and context engineering. Sonnet for execution and verification. Haiku for checking and integration.
- **budget**: Sonnet for high-value agents (intake, executor, roadmapper, context). Haiku for everything else.

## Commands

| Command | Description |
|---------|-------------|
| `/AAA:new-system` | Start a new architecture project. Spawns structured intake to extract system domain, actors, constraints, scale. Produces `.arch/CONTEXT.md`. |
| `/AAA:plan-phase` | Plan a design phase. Spawns researcher, roadmapper, planner, and checker. Produces `PLAN.md` with tasks and wave assignments. |
| `/AAA:execute-phase` | Execute a planned phase. Spawns executor agents for each task in wave order. Produces design artifacts (agent specs, schemas, topology). |
| `/AAA:verify-phase` | Verify a completed phase. Runs 4-level verification (exists, substantive, cross-referenced, consistent). Produces `VERIFICATION.md`. |
| `/AAA:progress` | Show current project state, phase position, accumulated decisions, and blockers. |
| `/AAA:resume` | Resume from last checkpoint after context reset. Reads `.arch/STATE.md` to determine next action. |

### Typical Workflow

```
/AAA:new-system "your system description"
  -> Structured intake conversation
  -> .arch/CONTEXT.md produced

/AAA:plan-phase --phase 1
  -> Research, roadmap, plan, review loop
  -> PLAN.md produced

/AAA:execute-phase --phase 1
  -> Executor writes design documents per plan
  -> Agent specs, event schemas, etc.

/AAA:verify-phase --phase 1
  -> 4-level verification
  -> VERIFICATION.md, INTEGRATION-REPORT.md

(repeat for phases 2-5)
```

## Agents

AAA uses 11 specialized agents, each with a defined role, upstream inputs, downstream consumers, and structured returns.

| Agent | Role |
|-------|------|
| **discuss-system** | Structured intake. Conducts conversation with human architect to extract domain, actors, non-goals, constraints, scale, locked decisions. |
| **arch-researcher** | Researches architecture patterns, technology constraints, and domain-specific practices for the target system. |
| **arch-roadmapper** | Derives design phases from system intent using research. Produces phase count, goals, success criteria, dependency graph. |
| **arch-planner** | Decomposes roadmap phases into concrete tasks with wave assignments and dependencies. |
| **arch-checker** | Reviews plans for consistency, completeness, naming conventions. Catches vague language. |
| **arch-executor** | Writes design documents for phase tasks. Produces agent specs, event schemas, topology diagrams, context flows, failure modes. |
| **arch-verifier** | Multi-level verification: Level 1 (Exists), Level 2 (Substantive), Level 3 (Cross-Referenced), Level 4 (Consistent). |
| **arch-integrator** | Cross-phase consistency checks. Verifies agents mentioned in topology exist in design. |
| **context-engineer** | Designs context engineering strategy for target system agents. Context flows, sliding windows, handoff protocols. |
| **schema-designer** | Designs event, command, and data type schemas with type safety enforcement. |
| **failure-analyst** | Analyzes failure modes per agent. Documents triggers, manifestations, severity, recovery procedures. |

## Project Structure

AAA creates an `.arch/` directory in your project:

```
.arch/
  CONTEXT.md              System intent (domain, actors, constraints)
  STATE.md                Project position and session continuity
  ROADMAP.md              Design phases with dependency graph
  RESEARCH.md             Architecture patterns and recommendations
  phases/
    01-context-and-schema-design/
      01-PLAN.md           Task decomposition
      01-SUMMARY.md        Phase completion summary
      design/
        agents/            Agent contract documents
        events/            Event/command schemas (YAML)
        topology/          Agent communication topology
        context-flows/     Per-agent context specifications
        failure-modes/     Failure catalogs per agent
        MANIFEST.md        Document index
        VERIFICATION.md    4-level verification results
        INTEGRATION-REPORT.md  Cross-phase consistency
```

## Configuration

### config.json

Located at `~/.claude/aaa-runtime/config.json`:

```json
{
  "model_profile": "balanced",
  "commit_docs": true,
  "parallelization": true,
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "model_profiles": {
    "quality": { ... },
    "balanced": { ... },
    "budget": { ... }
  }
}
```

- **model_profile**: Active profile name
- **commit_docs**: Auto-commit design documents
- **parallelization**: Enable wave-based parallel execution
- **workflow.research**: Enable research phase before planning
- **workflow.plan_check**: Enable plan review loop with arch-checker
- **workflow.verifier**: Enable verification after execution

### Changing Profile After Install

Edit `~/.claude/aaa-runtime/config.json` and change `model_profile` to `quality`, `balanced`, or `budget`.

## CLI Utility

AAA includes `arch-tools.js`, a CLI utility for verification and validation:

```bash
# Frontmatter operations
node arch-tools.js frontmatter get <file> [--field key]
node arch-tools.js frontmatter set <file> --field k --value v

# Stub detection
node arch-tools.js detect-stubs <file>
node arch-tools.js detect-stubs --dir <directory>

# State management
node arch-tools.js state init --phase N --name <name>
node arch-tools.js state status

# Validation
node arch-tools.js validate-context <file>
node arch-tools.js validate-names <file>

# 4-level verification
node arch-tools.js verify level1 <file>
node arch-tools.js verify level2 <file> --type agent
node arch-tools.js verify level3 <file> --design-dir <dir>
node arch-tools.js verify level4 --design-dir <dir>
node arch-tools.js verify run <dir> --levels 1,2,3,4
```

## Verification Levels

| Level | Name | What It Checks |
|-------|------|----------------|
| 1 | Exists | File exists at expected path |
| 2 | Substantive | Content is real, not stubs or placeholders |
| 3 | Cross-Referenced | All references to other documents resolve |
| 4 | Consistent | No circular dependencies, no orphaned agents, full graph connectivity |

## Hooks

AAA installs three lifecycle hooks:

- **Statusline**: Shows `AAA | profile | phase:status | context%` in the Claude Code header
- **Update Check**: Checks npm for newer `aaa-cc` version on session start
- **Context Monitor**: Warns when context window usage is high, suggests `/AAA:resume`

## What Gets Installed

```
~/.claude/
  commands/AAA/              6 slash commands
  agents/                    11 agent specifications
  aaa-runtime/          Runtime (bin, references, templates, config)
  hooks/                     3 lifecycle hooks (aaa-*.js)
  settings.json              Updated with hooks + statusline
  aaa-file-manifest.json     File hashes for modification detection
```

## Local Modifications

If you customize any installed file, AAA detects the change on the next install/update:

1. Modified files are backed up to `aaa-local-patches/`
2. New version is installed
3. You're prompted to manually merge your changes back

## Requirements

- Ubuntu (Linux)
- Node.js >= 18.0.0
- Claude Code CLI
