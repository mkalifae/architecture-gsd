# GSD Repurposing Vision: From Code Builder to Agentic Architecture Designer

**Status:** DRAFT — Sections 1-4 complete from GSD architecture research. Sections 5-6 pending input from patterns-researcher (#2) and schema-analyst (#7).

**Authors:** gsd-architect (sections 1-4 draft), patterns-researcher (section 5, pending), schema-analyst (section 5 schema patterns, pending)

---

## Executive Summary

GSD (Get Shit Done) is a multi-agent orchestration system designed to build software by decomposing work into phases, plans, and tasks executed by specialized agents. Its internal architecture — context rot prevention, goal-backward verification, wave-based parallelization, contract-driven agent specs, and disk-as-shared-memory — represents transferable meta-patterns that are independent of the output domain.

**The thesis:** GSD's output today is *code*. Its architecture could equally produce *agentic system designs* — architecture documents, agent specifications, data flow schemas, verification contracts, and deployment blueprints. The orchestration machinery stays; the agents' domain expertise changes.

This document maps:
1. What GSD patterns are directly reusable
2. What must change to target architecture design instead of code
3. The proposed new workflow
4. New agent roles required
5. Event-driven swarm patterns as output artifacts (pending patterns-researcher)
6. How the system would design itself (dog-fooding)

---

## Section 1: GSD Patterns Directly Reusable

These 10 meta-patterns from GSD's architecture transfer to the repurposed system without modification. They solve universal multi-agent coordination problems, not code-specific ones.

### 1.1 Thin Orchestrator Pattern

**What it is:** Orchestrators stay at 10-15% context by passing file paths only, never content. Subagents have fresh 200k token contexts and read files themselves.

**Why it transfers:** Whether agents are writing React components or agent specification docs, the context rot problem is identical. An orchestrator coordinating architecture analysts needs the same lean footprint as one coordinating coders.

**Mechanism:** `Task(subagent_type, prompt="Read file at {path}")` — the orchestrator never holds file contents.

### 1.2 Disk as Shared Memory

**What it is:** All inter-agent communication flows through disk files (PLAN.md, SUMMARY.md, RESEARCH.md, VERIFICATION.md). Agents read/write; no return values carry state.

**Why it transfers:** Architecture design artifacts (SPEC.md, SCHEMA.md, FLOW.md, AGENT-CONTRACT.md) can be the shared medium just as readily as code. The disk-as-bus model makes agent work resumable, inspectable, and composable.

**File contract:** Each agent role has defined upstream inputs (what files it reads) and downstream outputs (what files it writes). This contract-driven model is domain-agnostic.

### 1.3 Contract-Driven Agent Specifications

**What it is:** Each agent has YAML frontmatter (`name`, `tools`, `color`) and XML sections (`<role>`, `<upstream_input>`, `<downstream_consumer>`, `<structured_returns>`). This is an inter-agent API contract in markdown.

**Why it transfers:** The spec format is powerful precisely because it doesn't encode *what* agents do, only *how* they interface. New agents for architecture design (arch-analyst, schema-designer) can use identical spec format with different role content.

**Reusable spec structure:**
```yaml
---
name: arch-analyst
tools: Read, Write, Bash, Glob, Grep, WebFetch
color: cyan
---
<role>Analyzes system intent and produces architecture decisions...</role>
<upstream_input>...</upstream_input>
<downstream_consumer>...</downstream_consumer>
<structured_returns>...</structured_returns>
```

### 1.4 Pre-Computed Wave Dependencies (Dependency DAG)

**What it is:** Plans are assigned wave numbers at plan time based on dependency analysis. Execute-phase reads the pre-computed waves and runs parallel plans within each wave without real-time dependency resolution.

**Why it transfers:** Architecture design tasks have the same dependency structure. You can't design the data schema before defining the system boundaries. You can't specify agent contracts before the data schema. Waves enforce this: Wave 1 (system boundaries) → Wave 2 (schema design) → Wave 3 (agent contracts) → Wave 4 (verification design).

**PLAN frontmatter:**
```yaml
wave: 2
depends_on: [01-01, 01-02]
```

### 1.5 Goal-Backward Verification

**What it is:** Instead of "did tasks complete?" ask "is the goal achieved?" Establish `must_haves` as observable truths → artifacts → wiring, then verify each level against reality.

**Why it transfers:** Architecture design has analogous verification needs. A truth like "The event bus design handles backpressure" requires: artifact (EVENT-BUS-SPEC.md exists, >50 lines, has backpressure section), wiring (referenced from SYSTEM-ARCH.md and AGENT-CONTRACTS.md). Three-level verification (Exists → Substantive → Referenced) applies directly.

**must_haves for architecture:**
```yaml
must_haves:
  truths:
    - "System boundary diagram captures all external integrations"
    - "Agent contracts specify typed input/output schemas"
  artifacts:
    - path: SYSTEM-BOUNDARIES.md
      min_lines: 40
      required_sections: ["External Systems", "Integration Points"]
    - path: AGENT-CONTRACTS.md
      min_lines: 60
  key_links:
    - from: SYSTEM-BOUNDARIES.md
      to: AGENT-CONTRACTS.md
      via: "references|imports|see"
```

### 1.6 Structured Returns Protocol

**What it is:** Agents return typed structured data (JSON) so orchestrators can parse status without reading full documents. Status fields: `passed | gaps_found | human_needed`.

**Why it transfers:** Architecture agents need the same reliable return contracts. An arch-verifier returning `{status: "gaps_found", missing: ["backpressure design", "failure modes"], report_path: "..."}` lets orchestrators route correctly without reading the full report.

### 1.7 Bounded Revision Loops

**What it is:** plan-phase runs a max-3-iteration planner↔checker loop. If the plan doesn't pass quality gates in 3 tries, it escalates to human rather than looping indefinitely.

**Why it transfers:** Architecture design benefits equally from quality gates with bounded loops. An arch-checker reviewing an agent specification can run 3 revision cycles before escalating to the human architect. This prevents infinite perfectionism loops.

### 1.8 Autonomous Deviation Authority (Rules 1-4)

**What it is:** Executors have explicit rules about when to deviate from plans: auto-fix bugs (Rule 1), auto-add missing critical functionality (Rule 2), auto-fix blocking issues (Rule 3), STOP for architectural changes (Rule 4).

**Why it transfers:** Architecture analysts need the same deviation authority: auto-complete obvious gaps in specs (Rule 1), note discovered dependencies not in original scope (Rule 2), flag blockers (Rule 3), but STOP for scope changes that alter the system's fundamental design (Rule 4).

### 1.9 State Survives Reset (STATE.md)

**What it is:** STATE.md is a max-100-line structured summary of project position, decisions, and blockers. Written after every plan completion. Any agent reading STATE.md can resume work without prior context.

**Why it transfers:** Architecture design sessions can span days. STATE.md ensures any agent resuming work knows: which architectural decisions are locked, which are open, what's been validated, what's deferred. The same format, same max-size constraint, same mandatory pre-read rule applies.

### 1.10 Model Profiles (Quality/Balanced/Budget)

**What it is:** config.json maps agent roles to model profiles. `quality` uses Opus for complex reasoning; `balanced` uses Sonnet for most work; `budget` uses Haiku for mechanical tasks.

**Why it transfers:** Architecture design has the same cost/quality tradeoffs. Haiku is sufficient for checking whether a file contains required sections. Opus is needed for deriving system boundaries from vague intent. The profile system maps directly.

---

## Section 2: What Must Change

While the orchestration machinery transfers directly, the **domain expertise encoded in each agent** and the **artifact schema** (what files get produced) must change substantially.

### 2.1 Output Artifacts: Architecture Docs Instead of Code

| Current GSD Output | Repurposed Output | Key Difference |
|-------------------|-------------------|----------------|
| React components (.tsx) | Agent specifications (.md) | No runtime, pure contract |
| API routes (route.ts) | Data flow diagrams (FLOW.md) | Describes behavior, not implements |
| Database schemas (schema.prisma) | Event schemas (EVENTS.md) | Typed event contracts, not DB tables |
| Test files (*.test.ts) | Verification contracts (VERIFY.md) | Describes how to verify, not test code |
| SUMMARY.md (what was built) | SUMMARY.md (what was designed) | Same format, different content domain |

### 2.2 Verification Must Change: No Code to Execute

Current GSD verification checks:
- File exists on disk
- File has substantive content (min lines)
- File is imported and used in other files

Repurposed verification must check:
- Document exists on disk ✓ (same)
- Document has substantive content ✓ (same)
- Document is **referenced** in other architecture documents (cross-reference check) — replaces "imported"
- Document is **internally consistent** (does agent spec reference an event that exists in EVENTS.md?) — new check
- Document is **complete** (required sections present) — replaces compilation/test passing

The three-level model becomes: Exists → Substantive → Cross-Referenced (instead of Wired).

**New anti-patterns to scan:**
- Placeholder architecture ("TBD", "to be determined", "will handle later")
- Undefined references (agent spec mentions EventX but EventX not in EVENTS.md)
- Circular dependencies in agent dependency graph
- Missing failure modes (agent spec with no error handling section)

### 2.3 Planning Changes: Design Decomposition Instead of Implementation Decomposition

Current plan-phase decomposes work by: what files to create, what functions to implement, what tests to write.

Repurposed plan-phase decomposes work by: what systems to scope, what contracts to define, what constraints to establish, what failure modes to analyze.

**New plan structure:**
```yaml
---
phase: 02-agent-contracts
plan: 01
wave: 1
depends_on: [01-01, 01-02]  # System boundaries must exist first
files_modified:
  - design/agents/COORDINATOR.md
  - design/agents/EXECUTOR.md
  - design/events/COMMAND-EVENTS.md
must_haves:
  truths:
    - "Coordinator agent contract specifies all command types it accepts"
    - "Executor agent contract specifies all events it emits"
  artifacts:
    - path: design/agents/COORDINATOR.md
      min_lines: 50
      required_sections: ["Role", "Inputs", "Outputs", "Failure Modes"]
  key_links:
    - from: design/agents/COORDINATOR.md
      to: design/events/COMMAND-EVENTS.md
      via: "dispatches|emits|publishes"
---
```

### 2.4 The Research Phase Changes: Domain Is Architecture, Not Implementation

Current gsd-phase-researcher: "How do I implement X with technology Y? What are the gotchas?"

Repurposed arch-researcher: "What are the established patterns for X architecture? What are the failure modes? What does the literature say about this system topology?"

Research outputs shift from "how to use library X" to "what are the tradeoffs of design pattern X."

---

## Section 3: Proposed New Workflow

### 3.1 Workflow Overview

```
System Intent (user-provided)
        ↓
  [discuss-system]          ← Adaptive questioning: clarify intent, constraints, scale
        ↓
  CONTEXT.md                ← Structured: domain, scale, constraints, non-goals
        ↓
  [arch-researcher]         ← Research relevant architecture patterns (parallel)
        ↓
  RESEARCH.md               ← Patterns, tradeoffs, pitfalls, prior art
        ↓
  [arch-roadmapper]         ← Transform intent + research into design roadmap
        ↓
  ROADMAP.md                ← Phases: Boundaries → Schemas → Contracts → Verification
        ↓
  For each phase:
    [arch-planner]          ← Decompose phase into design tasks with must_haves
        ↓
    PLAN.md                 ← Wave-grouped design tasks with cross-reference requirements
        ↓
    [arch-checker]          ← Quality gate: Are plans complete, consistent, verifiable?
        ↓  (revision loop, max 3 iterations)
    [arch-executor]         ← Execute design tasks, produce architecture documents
        ↓
    SUMMARY.md              ← What was designed, decisions made, deferred items
        ↓
    [arch-verifier]         ← Goal-backward verification: are truths achievable?
        ↓
  VERIFICATION.md           ← Status: passed / gaps_found / human_needed
        ↓
  [human validation]        ← Review architecture documents, approve or request changes
        ↓
  Final Architecture Package
```

### 3.2 Phase Structure for Architecture Design

A typical architecture design project would have these phases:

**Phase 1: System Boundaries**
- Goal: Define what the system is and is not, who uses it, what external systems it touches
- Output: SYSTEM-OVERVIEW.md, ACTOR-CATALOG.md, INTEGRATION-POINTS.md
- Success criteria: All actors named, all external dependencies listed, non-goals explicit

**Phase 2: Event Schema Design**
- Goal: Define all events, commands, and data types that flow through the system
- Output: EVENTS.md, COMMANDS.md, DATA-TYPES.md
- Success criteria: Every event has typed payload, every command has typed arguments, no undefined references

**Phase 3: Agent Contract Design**
- Goal: Define what each agent does, what it receives, what it emits, how it fails
- Output: agents/AGENT-NAME.md for each agent
- Success criteria: Every agent contract references only defined events/commands, all failure modes documented

**Phase 4: Orchestration Design**
- Goal: Define how agents coordinate, what triggers what, how state flows
- Output: ORCHESTRATION.md, WORKFLOW-DIAGRAMS.md, STATE-MACHINE.md
- Success criteria: Complete event flow traceable end-to-end, no orphaned agents

**Phase 5: Verification Design**
- Goal: Define how the system verifies it's working correctly
- Output: VERIFICATION-STRATEGY.md, OBSERVABLE-BEHAVIORS.md, HEALTH-CHECKS.md
- Success criteria: Every success criterion from phase 1 has a verification method

### 3.3 Key Workflow Differences from Code GSD

| Aspect | Code GSD | Architecture GSD |
|--------|----------|-----------------|
| Executor actions | Write code files | Write architecture documents |
| Verification | grep for imports, run tests | grep for cross-references, check completeness |
| "Stub" detection | Functions with only console.log | Sections with only "TBD" or "to be determined" |
| Blocking issues | Missing dependencies, compile errors | Undefined references, circular dependencies |
| Human checkpoints | Visual review, UX testing | Architecture review, constraint validation |
| Output commits | Code committed to git | Design docs committed to git |

---

## Section 4: New Agent Roles

### 4.1 Core Agent Roster (Repurposed)

**arch-researcher** (replaces gsd-phase-researcher)
- Role: Research architecture patterns relevant to the system being designed
- Upstream: CONTEXT.md (system intent + constraints)
- Downstream: RESEARCH.md (patterns, tradeoffs, prior art, pitfalls)
- Tools: WebFetch, WebSearch, context7, Read, Write
- Key difference: Researches *design patterns*, not *implementation techniques*

**arch-roadmapper** (replaces gsd-roadmapper)
- Role: Transform system intent and research into a phased design roadmap
- Upstream: CONTEXT.md, RESEARCH.md
- Downstream: ROADMAP.md with phases, success criteria, design dependencies
- Key difference: Phases deliver *design artifacts*, not *working features*

**arch-planner** (replaces gsd-planner)
- Role: Decompose design phases into parallel-optimized document creation tasks
- Upstream: ROADMAP.md phase details, CONTEXT.md
- Downstream: PLAN.md with wave assignments, must_haves, cross-reference requirements
- Key difference: Task outputs are documents, not code; "wiring" is cross-referencing

**arch-executor** (replaces gsd-executor)
- Role: Execute architecture design tasks — write, refine, and cross-link documents
- Upstream: PLAN.md, STATE.md, CONTEXT.md, RESEARCH.md
- Downstream: Architecture documents (EVENTS.md, agents/*, ORCHESTRATION.md, etc.), SUMMARY.md
- Deviation rules:
  - Rule 1: Auto-complete obvious gaps in specs (undefined term → add definition)
  - Rule 2: Auto-document discovered dependencies not in original scope
  - Rule 3: Flag blocking ambiguities (can't define agent contract without event schema)
  - Rule 4: STOP for scope changes (new system actor discovered, new integration required)
- Key difference: No code written; all outputs are design documents

**arch-checker** (replaces gsd-plan-checker)
- Role: Quality gate on architecture plans before execution
- Upstream: PLAN.md
- Downstream: Quality report (PASS/FAIL with specific gaps)
- 8 dimensions adapted:
  1. Coverage: Does the plan cover all aspects of the phase goal?
  2. Completeness: Are all design tasks fully specified?
  3. Dependency correctness: Are wave assignments valid?
  4. Cross-reference completeness: Are key links specified?
  5. Scope sanity: Is the plan achievable without scope creep?
  6. Verifiability: Can the must_haves be checked programmatically?
  7. Consistency: Does the plan align with prior phase decisions?
  8. Ambiguity: Are any tasks too vague to execute?

**arch-verifier** (replaces gsd-verifier)
- Role: Goal-backward verification that design phase achieved its architectural goals
- Upstream: PLAN.md (must_haves), ROADMAP.md (success criteria), design documents
- Downstream: VERIFICATION.md (passed/gaps_found/human_needed)
- Verification levels:
  1. Exists: File on disk
  2. Substantive: File meets min_lines, has required_sections
  3. Cross-referenced: File is referenced from dependent documents (replaces "wired/imported")
  4. Internally consistent: No undefined references within the document
- Key difference: Checks references and sections instead of imports and test passage

**arch-integrator** (replaces gsd-integration-checker)
- Role: Cross-phase architecture consistency verification
- Checks: Every event referenced in agent contracts exists in EVENTS.md; every agent referenced in ORCHESTRATION.md has a contract; no circular agent dependencies
- Output: INTEGRATION-REPORT.md

### 4.2 New Agent Roles (No GSD Equivalent)

**context-engineer**
- Role: Design the context injection strategy for the system being architected
- Given: Agent contracts, orchestration design
- Output: CONTEXT-ENGINEERING.md — what each agent needs in its context, how state passes between agents, what files get injected as @-references
- This agent designs *how agents in the target system will receive context* — a meta-layer that GSD handles implicitly but architecture design must make explicit

**schema-designer**
- Role: Design typed event/command/data schemas with validation constraints
- Given: High-level event list from phase 1
- Output: Fully specified schemas with field types, constraints, examples, error cases
- Produces machine-readable schema specs (YAML or JSON) that can be validated for consistency

**failure-analyst**
- Role: Systematically enumerate failure modes for each agent and integration point
- Given: Agent contracts, orchestration design
- Output: FAILURE-MODES.md — what can fail, how it manifests, how the system recovers
- Fills the gap that architecture design often skips (happy path only)

**constraint-validator**
- Role: Verify design decisions against stated constraints from CONTEXT.md
- Given: Architecture documents, CONTEXT.md (constraints section)
- Output: CONSTRAINT-VALIDATION.md — which constraints are satisfied, which are violated, which cannot be verified without implementation
- Bridges the gap between design intent and design reality

---

## Section 5: Event-Driven Swarm Design Patterns as Output

**[PLACEHOLDER — Pending input from patterns-researcher (#2) and schema-analyst (#7)]**

This section will document:
- Established event-driven swarm patterns that the system should be able to produce as output
- How GSD's own wave-based parallelization maps to known swarm coordination patterns
- DAG-based workflow patterns and how to represent them as architecture documents
- Event sourcing patterns applicable to agentic systems
- Schema patterns for typed agent communication (from schema-analyst)
- Comparison of orchestration vs choreography approaches for multi-agent systems
- Patterns for handling partial failures in agent swarms

---

## Section 6: Dog-Fooding — Designing Itself

The ultimate validation of Architecture GSD is that it can design its own agent system — the very system described in this document.

### 6.1 The Self-Design Challenge

Architecture GSD must produce, for itself:
- System boundaries: What is Architecture GSD? What does it not do?
- Event schema: What events flow between arch-researcher, arch-planner, arch-executor, arch-verifier?
- Agent contracts: Full specifications for each agent role
- Orchestration design: How does the workflow coordinate these agents?
- Verification design: How do we know the architecture is correct?

### 6.2 The Bootstrap Problem

Architecture GSD cannot design itself using itself before it exists. The bootstrap sequence is:
1. Use existing GSD (code mode) to build Architecture GSD (as a software project)
2. Use Architecture GSD (first run, manually guided) to design a sample architecture
3. Use Architecture GSD (second run) to design itself

This is analogous to how GSD itself was presumably built — using Claude Code iteratively, before GSD existed to coordinate Claude Code.

### 6.3 The Self-Consistency Requirement

For self-design to succeed, the architecture documents Architecture GSD produces must be sufficient for someone to re-implement Architecture GSD from scratch. This means:
- Every agent must have a complete contract (inputs, outputs, failure modes)
- Every event must have a complete schema (fields, types, constraints)
- The orchestration must be fully specified (who triggers what, how state flows)
- The verification strategy must be concrete (not "verify quality" but "check that required_sections are present using regex pattern X")

This self-consistency requirement is itself a design constraint that drives completeness. The architecture checker (arch-checker) should verify that every specification is implementable — not just that it exists.

### 6.4 Dog-Food Architecture Snapshot

Here is the minimal architecture self-description of Architecture GSD, as would be produced by running Phase 1 (System Boundaries) on itself:

**Actors:**
- Human architect: provides system intent, approves phase completions, resolves blocked decisions
- arch-researcher: autonomous research agent
- arch-planner: autonomous planning agent
- arch-executor: autonomous design execution agent
- arch-checker: autonomous quality gate agent
- arch-verifier: autonomous verification agent
- Orchestrator: coordinates agents, manages phases

**External Systems:**
- Web (for research): accessed by arch-researcher via WebFetch/WebSearch
- Context7 (for library docs): accessed by arch-researcher
- Git: all design artifacts committed to version control
- Claude API: executes all agents

**Non-Goals:**
- Does not produce code (that's GSD in code mode)
- Does not deploy anything
- Does not validate designs against runtime behavior
- Does not make final architectural decisions (human architect does)

**Key Invariants:**
- Every phase produces concrete, committed design documents
- No phase completes with "TBD" sections in its primary deliverables
- Every agent specification is complete enough to be implemented without clarification
- All cross-references resolve (no undefined event names, no missing agent specs)

---

## Appendix A: GSD Artifact Schema (from Architecture Research)

These are the exact file contracts that GSD uses today — they reveal the schema patterns we should replicate for architecture design artifacts.

### PLAN.md Frontmatter Schema
```yaml
---
phase: {string}          # e.g., "01-foundation"
plan: {integer}          # plan number within phase
wave: {integer}          # dependency wave (1 = no deps, N = deps on N-1)
depends_on: {string[]}   # list of plan IDs this depends on
files_modified: {string[]} # files this plan will create/modify
autonomous: {boolean}    # false = requires human checkpoint
requirements: {string[]} # REQ-XX IDs this plan satisfies
must_haves:
  truths: {string[]}     # observable behaviors when complete
  artifacts:             # concrete files to verify
    - path: {string}
      min_lines: {integer}
      exports: {string[]}     # for code: exported symbols
      required_sections: {string[]}  # for docs: section headers
  key_links:             # critical wiring to verify
    - from: {string}
      to: {string}
      via: {regex}        # pattern to search for the link
---
```

### SUMMARY.md Schema (Post-Execution)
```yaml
---
phase: {string}
plan: {string}
status: complete | failed | partial
timestamp: {ISO-8601}
---

## Objective
{What was planned}

## What Was Built/Designed
{What actually happened}

## Key Files
### Created
- {path}: {description}
### Modified
- {path}: {what changed}

## Decisions Made
{Significant choices made during execution}

## Deviations from Plan
{What differed and why}

## Self-Check
{PASSED | FAILED}: {details}
```

### STATE.md Schema (Living Project Memory)
```yaml
# Project State
## Position
- Current phase: {N}
- Last completed: {plan-id}
- Next action: {description}

## Decisions (Locked)
- {Decision}: {Rationale}

## Open Questions
- {Question}: {Status}

## Blockers
- {Blocker}: {Who must resolve}

## Session Continuity
- {Key context for resuming work}
```

### VERIFICATION.md Schema (Post-Verification)
```yaml
---
phase: {string}
timestamp: {ISO-8601}
status: passed | gaps_found | human_needed
score: {N}/{M}
---

## Goal Achievement
{Was the phase goal achieved? Evidence.}

## Artifact Status
| Artifact | Exists | Substantive | Wired/Referenced | Status |
|----------|--------|-------------|------------------|--------|

## Gaps (if gaps_found)
{Structured gap descriptions for gap-closure planning}

## Human Verification Required
{Items that need human review}

## Fix Plans (if gaps_found)
{Structured plans to close each gap}
```

---

## Appendix B: Inter-Agent Data Flow Map

```
User Intent
    │
    ▼
discuss-system ──────────────→ CONTEXT.md
    │                              │
    ▼                              │
arch-researcher ←──────────────────┤
    │                              │
    ▼                              │
RESEARCH.md                        │
    │                              │
    ▼                              ▼
arch-roadmapper ←─────────── CONTEXT.md + RESEARCH.md
    │
    ▼
ROADMAP.md
    │
    ├── Phase 1 ──→ arch-planner ──→ PLAN.md ──→ arch-checker ──→ arch-executor ──→ SUMMARY.md
    │                                                                     │
    │                                                              arch-verifier
    │                                                                     │
    │                                                           VERIFICATION.md
    │                                                                     │
    │                              ┌──────────────────────────────────────┘
    │                              │ passed? → next phase
    │                              │ gaps_found? → arch-planner (gap closure)
    │                              │ human_needed? → human review
    │
    ├── Phase 2 ──→ (same pattern)
    ├── Phase 3 ──→ (same pattern)
    ...
    │
    └── arch-integrator ──→ INTEGRATION-REPORT.md ──→ Final Package
```

**Shared memory (disk) at each phase:**
- Agents read: STATE.md (always), CONTEXT.md (always), prior phase outputs (as needed)
- Agents write: their designated output files + update STATE.md
- Orchestrator reads: SUMMARY.md status, VERIFICATION.md status
- Orchestrator writes: updates to ROADMAP.md, STATE.md (phase transitions)

---

*Document status: Sections 1-4 and appendices complete. Section 5 (event-driven swarm patterns) and full section 6 (dog-fooding with detailed event schemas) pending input from patterns-researcher and schema-analyst agents.*
