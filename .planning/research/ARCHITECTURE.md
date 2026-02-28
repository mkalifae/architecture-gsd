# Architecture Research

**Domain:** CLI-based multi-agent orchestration system that produces architecture documents
**Researched:** 2026-02-27
**Confidence:** HIGH — based on direct examination of GSD source files (the reference implementation)

---

## Standard Architecture

### System Overview

Architecture GSD mirrors GSD's own structural model, verified by direct file inspection.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Claude Code CLI Layer                              │
│  /arch:new-system  /arch:discuss-system  /arch:execute-phase  ...    │
├──────────────────────────────────────────────────────────────────────┤
│                    Workflow Orchestrators                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │new-system.md │  │execute-phase │  │   verify-phase.md        │   │
│  │(new-project  │  │.md           │  │                          │   │
│  │ equivalent)  │  │              │  │                          │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                 │                      │                   │
├─────────┴─────────────────┴──────────────────────┴───────────────────┤
│                    Specialized Agents (agents/)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │arch-executor │  │arch-verifier │  │   arch-checker           │   │
│  │arch-planner  │  │arch-roadmap  │  │   arch-researcher        │   │
│  │context-engr  │  │schema-design │  │   failure-analyst        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                 │                      │                   │
├─────────┴─────────────────┴──────────────────────┴───────────────────┤
│                    Disk as Shared Memory (.planning/)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │PROJECT.md│  │ROADMAP.md│  │STATE.md  │  │  phases/XX-name/     │ │
│  │CONTEXT.md│  │REQUIREME │  │config.   │  │  {N}-{M}-PLAN.md     │ │
│  │          │  │NTS.md    │  │json      │  │  {N}-{M}-SUMMARY.md  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                    design/ Output Directory                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │agents/   │  │events/   │  │orchestr/ │  │VERIFICATION.md       │ │
│  │*.md      │  │*.yaml    │  │*.md      │  │INTEGRATION-REPORT.md │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                    CLI Tooling (bin/)                                │
│  arch-tools.js — verification engine, cross-reference parser,       │
│  frontmatter CRUD, phase operations, template fill                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implemented As |
|-----------|----------------|----------------|
| Workflow orchestrators | Coordinate phase lifecycle: spawn agents, read structured returns, route based on status | Markdown workflow files consumed by Claude Code slash commands |
| agents/ markdown specs | Domain expertise in YAML frontmatter + XML role/input/output sections | Markdown files with frontmatter; same format as GSD's own agents |
| bin/arch-tools.js | Deterministic operations: frontmatter CRUD, cross-reference validation, phase operations, state management | Node.js CLI utility; same pattern as gsd-tools.js |
| .planning/ directory | Shared memory for orchestration state (PROJECT.md, ROADMAP.md, STATE.md, phases/) | File system; same layout as GSD |
| design/ directory | Architecture output artifacts produced during execution | Separate from .planning/ to keep orchestration state distinct from deliverables |
| templates/ | Scaffold files for new phases, agent specs, schema files, verification contracts | Markdown templates; same pattern as GSD templates |
| references/ | Shared reference docs agents read for patterns, schemas, verification rules | Markdown files injected as @-references in plans |

---

## Recommended Project Structure

```
architecture-gsd/
├── agents/                          # Specialized agent specs (11 agents)
│   ├── arch-executor.md             # Executes design tasks, produces architecture docs
│   ├── arch-verifier.md             # Goal-backward verification of design output
│   ├── arch-planner.md              # Decomposes design phases into parallel tasks
│   ├── arch-checker.md              # Quality gate on plans before execution
│   ├── arch-researcher.md           # Researches architecture patterns (phase-level)
│   ├── arch-roadmapper.md           # Transforms intent into phased design roadmap
│   ├── arch-integrator.md           # Cross-phase consistency validation
│   ├── context-engineer.md          # Designs context injection strategy for target system
│   ├── schema-designer.md           # Produces typed event/command/data schemas
│   ├── failure-analyst.md           # Enumerates failure modes systematically
│   └── discuss-system.md            # Adaptive questioning to extract system intent
│
├── workflows/                       # Workflow files (slash command implementations)
│   ├── new-system.md                # /arch:new-system — full init flow
│   ├── discuss-system.md            # /arch:discuss-system — questioning phase
│   ├── execute-phase.md             # /arch:execute-phase N — run design tasks
│   ├── plan-phase.md                # /arch:plan-phase N — create phase plans
│   ├── verify-phase.md              # /arch:verify-phase N — check design quality
│   ├── progress.md                  # /arch:progress — project status
│   └── resume-project.md            # /arch:resume — continue after reset
│
├── bin/
│   └── arch-tools.js                # CLI utility: state, cross-ref validation, templates
│
├── templates/                       # Scaffold templates
│   ├── system-project/              # Top-level project templates
│   │   ├── PROJECT.md               # System intent document template
│   │   ├── CONTEXT.md               # Design context (decisions, constraints)
│   │   └── config.json              # Config template
│   ├── design/                      # Architecture output templates
│   │   ├── agent-spec.md            # Template for individual agent specifications
│   │   ├── event-schema.yaml        # Template for event/command schemas
│   │   ├── orchestration.md         # Template for orchestration design
│   │   ├── context-flow.md          # Template for context flow maps
│   │   └── failure-modes.md         # Template for failure mode catalogs
│   ├── plan.md                      # PLAN.md template for design phases
│   ├── summary.md                   # SUMMARY.md template
│   └── verification.md              # VERIFICATION.md template
│
├── references/                      # Shared reference documents
│   ├── verification-patterns.md     # Cross-reference validation rules
│   ├── schema-patterns.md           # Event schema conventions (typing, versioning)
│   ├── agent-spec-format.md         # Required sections for agent contracts
│   ├── design-completeness.md       # What "complete" means for each doc type
│   └── model-profiles.md            # Model routing (Opus/Sonnet/Haiku per agent role)
│
└── VERSION                          # Version file
```

**Output directory layout (per-project, under the project root):**

```
design/                              # Architecture output (deliverables)
├── SYSTEM-OVERVIEW.md               # System boundaries, actors, non-goals
├── agents/                          # One file per agent in the designed system
│   ├── COORDINATOR.md               # Agent contract: role, inputs, outputs, failure modes
│   └── EXECUTOR.md
├── events/                          # Typed event/command schemas
│   ├── events.yaml                  # All events with typed payloads
│   └── commands.yaml                # All commands with typed arguments
├── orchestration/                   # How agents coordinate
│   ├── ORCHESTRATION.md             # Workflow description
│   └── state-machine.yaml           # State machine definition (YAML)
├── context/                         # Context engineering decisions
│   └── CONTEXT-ENGINEERING.md       # What each agent gets in context
├── verification/                    # Verification strategy
│   └── VERIFICATION-STRATEGY.md     # Observable behaviors, health checks
└── INTEGRATION-REPORT.md            # Cross-reference consistency report
```

### Structure Rationale

- **agents/:** One file per specialized agent. Mirrors GSD's own agents/ directory. Markdown with YAML frontmatter (name, tools, color) + XML role/input/output sections. This format is the inter-agent API contract.
- **workflows/:** One file per slash command. Claude Code resolves `/arch:X` to `workflows/X.md`. Orchestrators live here; they spawn agents, never hold content.
- **bin/:** Single Node.js utility file following gsd-tools.js pattern. Centralizes all deterministic operations (cross-reference validation, frontmatter CRUD, phase operations) so they don't drift across 11 agents.
- **templates/:** Scaffold files for each document type. arch-executor uses these to produce consistent output. Separating templates from references keeps "what to produce" distinct from "how to verify."
- **references/:** Read-only reference docs injected via @-references in plans. Not agent specs, not templates — persistent shared knowledge.
- **design/:** Output directory separated from .planning/. Keeps orchestration state (PLAN.md, STATE.md) distinct from deliverables (agent specs, event schemas). This boundary matters for verification: verifier checks design/, not .planning/.

---

## Architectural Patterns

### Pattern 1: Thin Orchestrator

**What:** Orchestrators (workflow files) spawn agents by passing file *paths* only, never file contents. Each agent reads its own context from disk. Orchestrator stays at 10-15% context.

**When to use:** Every orchestration call in every workflow file.

**Trade-offs:** Agents make additional disk reads. Pro: orchestrator never bloats. Pro: agents always get fresh context. Pro: agents are resumable because all state is on disk.

**Example:**
```markdown
<!-- In new-system.md workflow -->
Task(prompt="Read /home/user/.claude/agents/arch-researcher.md for instructions.

Research the architecture patterns for: {system_description}

Context: @.planning/PROJECT.md

Output: Write to .planning/research/ARCHITECTURE.md",
  subagent_type="arch-researcher",
  model="{researcher_model}")
```

### Pattern 2: Disk as Shared Memory

**What:** All inter-agent communication flows through disk files. Agents read upstream outputs and write downstream outputs. No agent-to-agent return values carry state beyond structured status returns.

**When to use:** Every inter-phase handoff. All design outputs land in design/ and .planning/phases/. State lives in STATE.md.

**Trade-offs:** Requires filesystem coordination discipline. Pro: work is resumable after any reset. Pro: human can inspect state at any point. Pro: agents can run in parallel safely if they write to different files.

**Key file contracts for Architecture GSD:**

```
arch-researcher reads:  .planning/PROJECT.md, .planning/CONTEXT.md
arch-researcher writes: .planning/research/ARCHITECTURE.md

arch-planner reads:     ROADMAP.md, CONTEXT.md, research/
arch-planner writes:    .planning/phases/XX-name/{N}-{M}-PLAN.md

arch-executor reads:    PLAN.md, STATE.md, CONTEXT.md, prior phase design/
arch-executor writes:   design/agents/*.md, design/events/*.yaml, etc. + SUMMARY.md

arch-verifier reads:    PLAN.md (must_haves), design/ artifacts
arch-verifier writes:   .planning/phases/XX-name/VERIFICATION.md
```

### Pattern 3: Contract-Driven Agent Specifications

**What:** Every agent spec has the same format: YAML frontmatter (name, tools, color, model) + XML sections (role, upstream_input, downstream_consumer, structured_returns). This format is the inter-agent API contract.

**When to use:** All 11 agent specs. Enforced by arch-checker as a quality gate.

**Trade-offs:** More verbose than prose descriptions. Pro: machines can parse it. Pro: missing sections are detectable. Pro: format is GSD-compatible, so existing Claude Code infrastructure works.

**Required sections for each agent spec:**
```yaml
---
name: arch-executor
description: "One-line description for subagent_type routing"
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
color: yellow
---

<role>What this agent does. Spawned by whom. Job summary.</role>
<upstream_input>What files this agent reads, what sections it uses</upstream_input>
<downstream_consumer>What reads this agent's output and how</downstream_consumer>
<execution_flow>Step-by-step what the agent does</execution_flow>
<structured_returns>## STATUS\n{status: "passed|gaps_found|human_needed", ...}</structured_returns>
```

### Pattern 4: Cross-Reference Validation (Architecture-Specific)

**What:** The arch-verifier checks that design documents cross-reference each other correctly. Three-level verification adapted from GSD's Exists → Substantive → Wired:
1. **Exists:** File present at expected path
2. **Substantive:** Has required sections, meets min_lines, no "TBD" in primary sections
3. **Cross-Referenced:** Every event name in agent contracts appears in events.yaml; every agent name in orchestration.md has a corresponding agents/*.md file

**When to use:** arch-verifier uses this after every design phase. arch-tools.js implements it deterministically.

**Trade-offs:** Regex-based cross-reference checking has false positives. Dual-format output (markdown + YAML) reduces false positives: YAML can be parsed exactly, not regex-matched.

**Implementation in arch-tools.js:**
```javascript
// Programmatic cross-reference check
function verifyEventReferences(agentSpecPath, eventsYamlPath) {
  const agentSpec = fs.readFileSync(agentSpecPath, 'utf-8');
  const eventsYaml = yaml.parse(fs.readFileSync(eventsYamlPath, 'utf-8'));

  // Extract event names mentioned in agent spec
  const mentionedEvents = agentSpec.match(/\b[A-Z][a-zA-Z]+Event\b/g) || [];
  const definedEvents = eventsYaml.events.map(e => e.name);

  const undefinedEvents = mentionedEvents.filter(e => !definedEvents.includes(e));
  return { ok: undefinedEvents.length === 0, undefined_references: undefinedEvents };
}
```

### Pattern 5: Pre-Computed Wave Dependencies

**What:** Plans are assigned wave numbers at plan time. Execute-phase reads the pre-computed wave from PLAN frontmatter and groups plans by wave for parallel execution. No runtime dependency analysis.

**When to use:** All PLAN.md files.

**Trade-offs:** Wave numbers can go stale if plans change. Pro: execution is deterministic and fast. Pro: eliminates runtime dependency resolution overhead.

**Design phase dependency order (typical):**
```
Wave 1: System boundaries (SYSTEM-OVERVIEW.md, ACTOR-CATALOG.md)
Wave 2: Event schema (events.yaml, commands.yaml) — depends on actors being defined
Wave 3: Agent contracts (agents/*.md) — depends on events being defined
Wave 4: Orchestration (ORCHESTRATION.md) — depends on contracts being defined
Wave 5: Context engineering, failure analysis — depends on full topology being known
```

### Pattern 6: Goal-Backward Verification for Architecture Documents

**What:** must_haves in PLAN.md frontmatter defines what must be TRUE for the design phase to be complete. Adapted from GSD's code verification to architecture documents.

**When to use:** Every PLAN.md in Architecture GSD.

**Trade-offs:** Writing good must_haves requires thinking backwards from goal. Pro: catches incomplete designs before they compound.

**Example must_haves for an agent contract phase:**
```yaml
must_haves:
  truths:
    - "Every agent in the system has a complete contract"
    - "Every event referenced in agent contracts appears in events.yaml"
    - "No agent has undefined event references"
  artifacts:
    - path: design/agents/COORDINATOR.md
      min_lines: 50
      required_sections: ["Role", "Inputs", "Outputs", "Failure Modes", "State"]
    - path: design/events/events.yaml
      min_lines: 20
      contains: "events:"
  key_links:
    - from: design/agents/COORDINATOR.md
      to: design/events/events.yaml
      via: "dispatches|emits|publishes|subscribes"
      pattern: "dispatches|emits|publishes|subscribes"
```

---

## Data Flow

### Primary Design Flow

```
System Intent (natural language)
        ↓
  /arch:new-system
        ↓
  [discuss-system agent]    ← Adaptive questioning
        ↓
  .planning/CONTEXT.md      ← Structured: intent, constraints, scale, non-goals
        ↓
  [arch-researcher × 4]     ← Parallel: stack/arch/features/pitfalls
  (parallel wave)
        ↓
  .planning/research/       ← STACK.md, ARCHITECTURE.md, FEATURES.md, PITFALLS.md
        ↓
  [arch-roadmapper]         ← Phases derived from intent, not fixed template
        ↓
  .planning/ROADMAP.md      ← Phase goals, success criteria, wave assignments
  .planning/STATE.md        ← Project position, locked decisions
        ↓
  For each phase:
        ↓
  [arch-planner]            ← Decomposes phase into parallel-safe design tasks
        ↓                      with must_haves, wave assignments
  PLAN.md files
        ↓
  [arch-checker]            ← Quality gate (max 3 revision cycles)
        ↓
  [arch-executor × N]       ← Parallel within wave, produces design/...
  (wave-based parallel)
        ↓
  design/ artifacts         ← agents/*.md, events/*.yaml, orchestration/*.md
  + SUMMARY.md
        ↓
  [arch-verifier]           ← Cross-reference validation, completeness check
        ↓
  VERIFICATION.md           ← passed / gaps_found / human_needed
        ↓
  [arch-integrator]         ← Cross-phase consistency (runs after all phases)
        ↓
  INTEGRATION-REPORT.md     ← Final package validation
```

### Key Data Flows

1. **Intent → Context:** discuss-system extracts structured facts (actors, constraints, scale, non-goals) from natural language. Structured output in CONTEXT.md is the only truth source for downstream agents.

2. **Context → Research → Roadmap:** arch-researcher reads CONTEXT.md, produces ARCHITECTURE.md. arch-roadmapper reads CONTEXT.md + research/, derives phases. Research is advisory; roadmapper decides.

3. **Plan → Execute → Verify loop:** PLAN.md frontmatter carries must_haves from planner to verifier. arch-executor writes design documents. arch-verifier checks must_haves against design/ artifacts programmatically.

4. **Gaps → Fix loop:** If arch-verifier finds gaps_found, orchestrator spawns arch-planner with gap context. New gap-closure plans are created, executed, re-verified. Max 3 cycles before human escalation.

5. **Phase N → Phase N+1:** arch-executor reads prior phase design/ outputs as context when needed. State flows via STATE.md (always read first) + explicit @-references to design documents. arch-integrator runs cross-phase consistency at the end.

6. **Self-reference flow (dog-fooding):** Architecture GSD's agent specs ARE its input format AND its output format. When designing itself, arch-executor produces agent spec markdown files that follow the same format as the agent specs it was built from. This creates a fixed-point requirement: the output format must be a valid input format.

### State Management

```
STATE.md (living project memory — max 100 lines)
    ↓ (every agent reads first)
Current phase position
Locked design decisions
Open questions
Blockers
Session continuity notes
```

STATE.md is written by arch-executor after each plan completion and by the orchestrator at phase transitions. Reading STATE.md is mandatory for every agent — it's how context survives between sessions without full conversation history.

---

## Cross-Reference Validation Architecture

This is the most technically novel component — the heart of what makes Architecture GSD different from "Claude writes docs."

### The Problem

Architecture documents form a reference graph:
- Agent specs reference event names
- Orchestration docs reference agent names
- Context flow maps reference both
- Failure mode docs reference all of the above

Without programmatic checking, these references drift. Agent spec says it emits "TaskCompleted" but events.yaml has "TaskDone." The design looks complete but is internally inconsistent.

### The Solution: Dual-Format Output

Design documents are dual-format:
- **Markdown prose:** Human-readable context, rationale, narrative
- **YAML/JSON structured sections:** Machine-parseable definitions

```markdown
# COORDINATOR Agent Specification

## Role
The coordinator receives task requests and dispatches work to executor agents.

## Events Dispatched
```yaml
dispatches:
  - event: TaskAssigned
    payload:
      task_id: string
      executor_id: string
      priority: integer
  - event: TaskCancelled
    payload:
      task_id: string
      reason: string
```

## Events Subscribed
```yaml
subscribes:
  - event: TaskCompleted
    handler: onTaskCompleted
  - event: TaskFailed
    handler: onTaskFailed
```
```

arch-tools.js extracts YAML blocks and validates references:
1. Parse all `dispatches:` and `subscribes:` blocks from agent specs
2. Parse all event definitions from events.yaml
3. Check that every referenced event name exists
4. Report undefined references as structured JSON

### Verification Pipeline Steps

```
1. arch-verifier loads must_haves from PLAN.md frontmatter
2. For each artifact in must_haves.artifacts:
   a. EXISTS: Does file exist at path?
   b. SUBSTANTIVE: Does file meet min_lines? Has required_sections?
   c. No "TBD" in required sections (stub detection)
3. For each key_link in must_haves.key_links:
   a. CROSS-REFERENCED: Does from-file reference to-file via pattern?
4. arch-tools.js runs cross-reference graph validation:
   a. Extract all event names from agent specs (YAML blocks)
   b. Extract all event definitions from events.yaml
   c. Find undefined references (in agent specs but not in events.yaml)
   d. Find orphaned events (in events.yaml but not referenced by any agent)
5. Output structured report: {status, score, gaps, fix_suggestions}
```

---

## The Self-Reference Challenge (Dog-Fooding)

Architecture GSD has a unique architectural property: its output format (agent spec markdown files) is also its own internal format (the agent specs that power the system).

### Implications

**Bootstrap constraint:** Architecture GSD cannot produce a design for itself using itself before it exists. The bootstrap sequence:
1. Build Architecture GSD using standard GSD (code-building mode)
2. First validation: design a small sample system (not itself)
3. Second validation: use Architecture GSD to design itself
4. The self-design output must be sufficient to re-implement Architecture GSD from scratch

**Fixed-point requirement:** The agent spec format used internally must be identical to (or a superset of) the agent spec format Architecture GSD produces as output. If the internal format evolves, the output format must evolve with it.

**Practical implication for templates:** The `templates/design/agent-spec.md` template must match the `agents/*.md` format used by Architecture GSD's own agents. This template is both:
- A scaffold for arch-executor to use when writing agent specs for target systems
- A validation target for arch-checker ("does this spec have all required sections?")

**Verification implication:** When Architecture GSD designs itself, arch-verifier must verify that its own agent specs are complete. This means the verification pipeline can validate itself — any gap in the self-design reveals a gap in the verification rules.

### Structural Solution

Maintain a single `references/agent-spec-format.md` that defines:
1. Required YAML frontmatter fields
2. Required XML sections and their semantics
3. Minimum content per section (not just presence)
4. Examples of complete vs incomplete sections

Both arch-executor (writer) and arch-verifier (checker) reference this same document. This creates a single source of truth for what "complete agent spec" means.

---

## Anti-Patterns

### Anti-Pattern 1: Monolithic Executor

**What people do:** Write one large agent that does system boundaries, event schemas, agent contracts, and orchestration in a single pass.

**Why it's wrong:** Context bloat. By the time the agent reaches orchestration design, it has forgotten constraints from system boundary decisions. Different design tasks need different expertise and different verification — bundling them loses that differentiation.

**Do this instead:** One agent per design concern, in dependency order. Wave-based parallelization lets independent tasks run simultaneously while preserving dependency order between phases.

### Anti-Pattern 2: Prose-Only Architecture Documents

**What people do:** Write architecture in pure markdown prose without machine-parseable structure.

**Why it's wrong:** Cross-reference validation becomes regex-on-prose, which is fragile. "The coordinator dispatches a task_assigned event" is not parseable the same way as a YAML block defining `dispatches: [{event: task_assigned}]`. False positives and false negatives proliferate.

**Do this instead:** Dual-format output. Prose for rationale; YAML blocks for definitions and references. arch-tools.js parses YAML blocks, never regex-matches prose.

### Anti-Pattern 3: Verification as the Last Phase Only

**What people do:** Run cross-reference validation only at the end of the entire design project.

**Why it's wrong:** Undefined references discovered at the end require rewriting earlier documents, which may cascade to more documents. Cost compounds.

**Do this instead:** Goal-backward verification after every phase using must_haves. Cross-reference validation runs incrementally — at the end of each phase, not just the final phase. arch-integrator runs a final cross-phase check as a safety net, not the primary verification mechanism.

### Anti-Pattern 4: Design Documents as Orchestration Memory

**What people do:** Use design/ artifacts (agent specs, event schemas) as the orchestration state. The orchestrator reads agent specs to understand what to do next.

**Why it's wrong:** Conflates deliverables with execution state. When design documents are revised (as they will be during gaps closure), orchestration state becomes ambiguous.

**Do this instead:** Keep .planning/ (ROADMAP.md, STATE.md, PLAN.md, SUMMARY.md) strictly separate from design/ (the deliverables). Orchestration reads .planning/; humans read design/.

### Anti-Pattern 5: Reflexive Cross-Phase Context Chaining

**What people do:** Every plan in phase N+1 references all SUMMARY.md files from phase N.

**Why it's wrong:** Creates false context dependencies, bloats agent context with irrelevant history, and slows execution without improving quality.

**Do this instead:** Plans reference prior phase outputs only when there's a genuine dependency (need types from events.yaml, need to know what agents are defined). STATE.md carries the lightweight context needed for continuity. Design artifacts in design/ are available for explicit reference when needed.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API | All agents invoked via Task() in orchestrators | Model selection via model profiles in config.json |
| Context7 | arch-researcher uses mcp__context7__ tools | For verifying library/framework claims in architecture research |
| Web | arch-researcher uses WebSearch/WebFetch | For researching architecture patterns and prior art |
| Git | arch-tools.js commit commands | Planning docs committed atomically; design/ committed by arch-executor |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Orchestrator ↔ Agents | Task() spawn + structured return | Orchestrator passes file paths; agent reads files |
| arch-executor ↔ arch-verifier | must_haves in PLAN.md frontmatter | Written at plan time, read at verify time |
| arch-planner ↔ arch-checker | PLAN.md files on disk | arch-checker reads plans; returns PASS/FAIL + gaps |
| Phase N ↔ Phase N+1 | STATE.md + explicit design/ @-references | STATE.md is mandatory pre-read; design/ only when needed |
| arch-verifier ↔ orchestrator | VERIFICATION.md structured frontmatter | status: passed/gaps_found/human_needed routes orchestrator |
| arch-integrator ↔ orchestrator | INTEGRATION-REPORT.md | Final cross-phase check after all phases |

---

## Scaling Considerations

Architecture GSD operates at the single-project scale (one architect, one system being designed). Scaling considerations are about design complexity, not user load.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Small system (5-10 agents) | Standard 5-phase design; all waves can be small (1-2 parallel tasks per wave) |
| Medium system (20-50 agents) | Wave parallelization becomes critical; event schema phase needs its own sub-phases |
| Large system (50+ agents) | Phase 2 (event schemas) may need to be split into domain sub-phases; arch-integrator becomes the critical path |

### Scaling Priorities

1. **First bottleneck:** Context window for arch-executor on complex agent contracts. Solution: Each agent gets its own plan; no "write all agents" in one plan.
2. **Second bottleneck:** Cross-reference validation on large event graphs. Solution: arch-tools.js graph algorithm must be efficient; YAML extraction over regex ensures determinism.

---

## Sources

- Direct examination of GSD source: `/home/mkali/.claude/get-shit-done/` (HIGH confidence — authoritative source)
  - `bin/gsd-tools.js` — tooling architecture pattern
  - `agents/gsd-executor.md`, `gsd-verifier.md`, `gsd-plan-checker.md`, `gsd-roadmapper.md` — agent spec format
  - `workflows/new-project.md` — orchestrator pattern, parallel research spawning
  - `templates/phase-prompt.md` — PLAN.md schema with must_haves, wave assignments
  - `references/verification-patterns.md` — 4-level verification methodology
  - `references/planning-config.md` — config.json structure, branching strategies
- `ARCHITECT-VISION.md` — project-level architectural decisions (HIGH confidence — project source)
- `GSD-REPURPOSING-VISION.md` — agent roster, output format decisions (HIGH confidence — project source)
- `research-agentic-architecture-patterns.md` — multi-agent pattern research (HIGH confidence — research source)

---
*Architecture research for: Architecture GSD — CLI-based multi-agent architecture design system*
*Researched: 2026-02-27*
