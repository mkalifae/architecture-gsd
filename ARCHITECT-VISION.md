# ARCHITECT-VISION: GSD Repurposed as an Agentic Architecture Design System

**Status:** COMPLETE — All 7 sections finalized.

---

## Executive Summary

GSD solves one hard problem: coordinating LLM agents across long-horizon tasks without context rot. It does this through 10 meta-patterns — thin orchestration, disk-as-shared-memory, goal-backward verification, wave-based parallelization, and more. None of these patterns are code-specific. They solve the universal problem of multi-agent coordination.

**The repurposing thesis:** Keep the orchestration machinery exactly as-is. Replace the *domain expertise* embedded in each agent. Where GSD's executor today writes TypeScript files, the repurposed executor writes architecture documents. Where the verifier today checks for `import` statements and test passage, it checks for cross-references and required sections. The scaffolding stays; the cargo changes.

**The output shifts from:**
- React components, API routes, database schemas, test files

**To:**
- Agent specifications, event schemas, context flow maps, agent topology diagrams, verification contracts

---

## Section 1: GSD Patterns That Transfer Directly

These 10 patterns are domain-agnostic. They solve multi-agent coordination, not software construction. Each transfers to architecture design with zero structural change — only vocabulary shifts.

### Pattern 1: Thin Orchestrator

**What it is:** Orchestrators pass file *paths*, never file *contents*. Each spawned agent gets a fresh 200k token context and reads files independently. Orchestrator stays at 10–15% context.

**Transfer:** Identical. An orchestrator coordinating arch-planner, arch-executor, and arch-verifier faces the same context rot problem as one coordinating code agents. The solution is identical: `Task(agent, prompt="Read PLAN.md at {path}. Read CONTEXT.md at {path}.")`.

**Vocabulary change:** None.

---

### Pattern 2: Disk as Shared Memory

**What it is:** No return values carry state. Agents communicate exclusively through files on disk. PLAN.md → executor. SUMMARY.md → orchestrator. VERIFICATION.md → orchestrator. Any agent can resume work by reading the current disk state.

**Transfer:** Identical. Architecture design artifacts are the new payload:

| GSD file | Architecture equivalent |
|----------|------------------------|
| PLAN.md | PLAN.md (same schema, different task content) |
| SUMMARY.md | SUMMARY.md (same schema, "designed" instead of "built") |
| RESEARCH.md | RESEARCH.md (architecture patterns, not implementation docs) |
| VERIFICATION.md | VERIFICATION.md (same schema, different check types) |
| STATE.md | STATE.md (same schema, design decisions instead of code decisions) |
| agents/AGENT.md | `design/agents/AGENT-NAME.md` (new: agent specification output files) |
| `src/events/*.ts` | `design/events/EVENTS.md` (new: event schema output files) |
| `src/components/*.tsx` | `design/topology/TOPOLOGY.md` (new: agent topology output files) |

**Vocabulary change:** Output file domain changes. Orchestration file schema does not.

---

### Pattern 3: Contract-Driven Agent Specifications

**What it is:** Every GSD agent is specified as a markdown file with YAML frontmatter (`name`, `tools`, `color`) and XML sections (`<role>`, `<upstream_input>`, `<downstream_consumer>`, `<structured_returns>`). This is the inter-agent API contract.

**Transfer:** The spec *format* is reused exactly. New agent roles are written in the same format. Critically, this format becomes the *output format* too — what the system produces for target architectures are agent specs in this exact structure.

**Example — arch-executor agent spec:**

```markdown
---
name: arch-executor
tools: Read, Write, Glob, Grep, Bash
color: green
---

<role>
Executes architecture design tasks by writing and cross-linking specification
documents. Reads PLAN.md to understand tasks, produces design artifacts to
disk, commits each task individually, then writes SUMMARY.md.

Does not produce code. All output is specification documents.
</role>

<upstream_input>
Required reads at start:
- {phase_dir}/PLAN.md — task list, must_haves, wave assignments
- .planning/STATE.md — locked decisions, open questions, position
- .planning/CONTEXT.md — system intent, constraints, non-goals
- ROADMAP.md — phase goal and success criteria

Optional reads (as referenced in PLAN.md):
- design/events/EVENTS.md — if defining agent contracts that reference events
- design/agents/*.md — if updating existing specs
</upstream_input>

<downstream_consumer>
arch-verifier reads SUMMARY.md and all files listed in key-files.created
to verify goal achievement.

orchestrator reads SUMMARY.md frontmatter status field to determine
wave/phase completion.
</downstream_consumer>

<structured_returns>
Return via SUMMARY.md frontmatter:
{
  "status": "complete" | "partial" | "failed",
  "phase": "{phase_id}",
  "plan": "{plan_number}",
  "key_files": {
    "created": ["{path}", ...],
    "modified": ["{path}", ...]
  },
  "decisions": ["{decision text}", ...],
  "deviations": ["{deviation description}", ...]
}
</structured_returns>

<deviation_rules>
Rule 1 — AUTO-COMPLETE: If a spec references an undefined term (event name,
  agent role), add the definition inline with a note "auto-defined — review".
Rule 2 — AUTO-DOCUMENT: If a dependency is discovered not in the plan
  (e.g., agent contract requires event not in EVENTS.md), document the
  dependency and create a stub. Do not block on it.
Rule 3 — AUTO-FLAG: If a task is ambiguous (cannot determine what to write
  without more context), write a flag file at design/flags/FLAG-{task}.md
  and continue with remaining tasks.
Rule 4 — STOP: If completing a task would change the system's fundamental
  scope (add new actor, add new external integration, remove a phase's goal),
  stop and return status: "blocked" with reason.
</deviation_rules>
```

**Vocabulary change:** Role content changes. Spec format does not.

---

### Pattern 4: Pre-Computed Wave Dependencies

**What it is:** Dependency analysis happens at plan time. Plans are assigned `wave: N` in frontmatter. Execute-phase groups by wave and runs parallel plans within each wave. No runtime dependency resolution.

**Transfer:** Architecture design has strict dependency ordering:
- Can't write event schemas before defining system boundaries (what events exist?)
- Can't write agent contracts before defining event schemas (what do agents receive/emit?)
- Can't write orchestration before writing agent contracts (who is being orchestrated?)
- Can't write verification strategy before all of the above

**Wave mapping for architecture design:**

```
Wave 1: System boundaries, actor catalog, integration points
        (no dependencies — first things to define)

Wave 2: Event schemas, command schemas, data types
        (depends on: actor catalog, integration points)

Wave 3: Agent contracts
        (depends on: event schemas, command schemas)

Wave 4: Context flow maps, orchestration design
        (depends on: agent contracts)

Wave 5: Verification strategy, health checks
        (depends on: orchestration design)
```

**Vocabulary change:** Wave content changes. Wave mechanism does not.

---

### Pattern 5: Goal-Backward Verification

**What it is:** GSD's verifier asks "what must be TRUE for this phase to be complete?" not "what tasks were done?" It derives `truths` → `artifacts` → `key_links`, then verifies each level against the actual filesystem.

**Transfer:** The method transfers exactly. The check implementation changes at level 3:

| Level | Code GSD check | Architecture GSD check |
|-------|---------------|----------------------|
| 1: Exists | `fs.existsSync(path)` | `fs.existsSync(path)` — identical |
| 2: Substantive | `wc -l > min_lines` + no placeholder patterns | `wc -l > min_lines` + no TBD/placeholder patterns — identical |
| 3: Wired | `grep -r "import.*ComponentName"` | `grep -r "pattern" dependent_docs` — cross-reference instead of import |
| 4: (new) Consistent | (not applicable) | Grep for referenced names existing in their definition files |

**Example must_haves for Phase 2 (Event Schemas):**

```yaml
must_haves:
  truths:
    - "Every event has a fully typed payload with no 'any' fields"
    - "Every command has typed arguments and a defined response schema"
    - "All events referenced in actor catalog exist in EVENTS.md"
  artifacts:
    - path: design/events/EVENTS.md
      min_lines: 60
      required_sections:
        - "## Domain Events"
        - "## Command Events"
        - "## Schema Conventions"
    - path: design/events/DATA-TYPES.md
      min_lines: 30
      required_sections:
        - "## Primitive Types"
        - "## Composite Types"
  key_links:
    - from: design/actors/ACTOR-CATALOG.md
      to: design/events/EVENTS.md
      via: "emits|receives|subscribes|publishes"
    - from: design/events/EVENTS.md
      to: design/events/DATA-TYPES.md
      via: "type:|schema:|DataType\\."
```

**Anti-patterns to scan in architecture docs:**

| Pattern | Search | Severity |
|---------|--------|----------|
| TBD/placeholder | `grep -n "TBD\|to be determined\|will handle\|TODO"` | Blocker |
| Undefined reference | event name in contract not in EVENTS.md | Blocker |
| Circular dependency | agent A receives from B, B receives from A | Blocker |
| Missing failure modes | agent spec with no "## Failure Modes" section | Warning |
| Vague typing | `any\|object\|varies\|flexible` in schema | Warning |

**Vocabulary change:** Level 3 check changes from import-grep to cross-reference-grep. New level 4 (internal consistency) added.

---

### Pattern 6: Structured Returns Protocol

**What it is:** Agents write structured JSON into SUMMARY.md frontmatter. Orchestrators parse status without reading full documents. Three statuses: `complete | partial | failed`.

**Transfer:** Identical. Architecture agents use the same frontmatter return contract. The orchestrator routes identically.

**Extended for architecture — arch-verifier returns:**

```json
{
  "status": "passed" | "gaps_found" | "human_needed",
  "score": "5/7",
  "gaps": [
    {
      "truth": "Every agent contract references only defined events",
      "artifact": "design/agents/COORDINATOR.md",
      "issue": "References 'TaskAssigned' event not found in EVENTS.md",
      "severity": "blocker"
    }
  ],
  "human_items": [
    "Verify that the orchestration topology matches team's mental model",
    "Confirm that failure modes are complete for production context"
  ],
  "report_path": ".planning/phases/02/02-VERIFICATION.md"
}
```

**Vocabulary change:** Gap descriptions are architectural, not code-related. Status values identical.

---

### Pattern 7: Bounded Revision Loops

**What it is:** plan-phase runs planner → checker → planner → checker up to 3 iterations. If the plan doesn't pass quality gates after 3 cycles, escalate to human.

**Transfer:** Identical mechanism, different quality gate content. arch-checker applies 8 dimensions (see Section 4) and returns PASS/FAIL with specific gaps. arch-planner revises and resubmits. Max 3 iterations.

**Why the bound matters for architecture:** Architecture plans can be refined indefinitely (there's always more to specify). The bound forces "good enough to execute" rather than "perfect before we start."

**Vocabulary change:** Quality gate dimensions change. Loop mechanism does not.

---

### Pattern 8: Autonomous Deviation Authority

**What it is:** Executors have 4 explicit rules encoding when to deviate vs. stop. Rules 1–3 authorize autonomous action; Rule 4 requires stopping for human.

**Transfer:** Identical mechanism. Rules are adapted to architecture domain (shown in Pattern 3 example). The key insight — agents need *explicit permission* to deviate, with *explicit escalation criteria* — transfers directly.

**Architecture Rule 4 examples (always stop):**
- Discovered a new external system not in the actor catalog
- Task would eliminate a phase from the roadmap
- Found that two agent contracts are logically contradictory (not just incomplete)
- Scope is larger than one agent can complete with substantive output

**Vocabulary change:** Rule content changes. Rule mechanism does not.

---

### Pattern 9: State Survives Reset

**What it is:** STATE.md is a max-100-line living document. Written after every plan. Mandatory pre-read for every agent. Sufficient context for any agent to resume without prior conversation.

**Transfer:** Identical. Architecture design sessions span days. STATE.md records locked design decisions, open questions, and the current position in the design roadmap.

**Example STATE.md for architecture project:**

```markdown
# Project State — Multi-Agent Order Processing System

## Position
- Current phase: 3 (Agent Contracts)
- Last completed: 03-01 (Coordinator contract)
- Next: 03-02 (Executor contract)

## Decisions (Locked)
- Event bus: Redis Streams (chosen over Kafka — scale doesn't justify Kafka complexity)
- Retry policy: Max 3 retries with exponential backoff, dead-letter queue on failure
- Agent isolation: Each agent is stateless; all state in events/Redis
- Coordinator pattern: Orchestration (not choreography) — single coordinator owns workflow

## Open Questions
- Maximum concurrent executors: Depends on infrastructure — human must decide
- Event schema versioning: Not designed yet — deferred to Phase 4

## Blockers
- None currently

## Session Continuity
- EVENTS.md complete and approved (62 events defined)
- DATA-TYPES.md complete (18 composite types)
- Coordinator contract done; references TaskAssigned, TaskCompleted, TaskFailed — all defined
- Executor contract is next — reads TaskAssigned, emits TaskCompleted or TaskFailed
```

**Vocabulary change:** Content domain changes. Format, size constraint, and mandatory-read rule do not.

---

### Pattern 10: Model Profiles

**What it is:** Three profiles (quality/balanced/budget) assign different Claude models to agent roles. Haiku for mechanical tasks; Sonnet for most work; Opus for complex reasoning.

**Transfer:** Identical. Architecture design has the same cost/quality tradeoff.

**Suggested profile mapping:**

| Agent role | Recommended tier | Rationale |
|------------|-----------------|-----------|
| discuss-system | quality (Opus) | Extracting precise intent from vague descriptions requires deep reasoning |
| arch-researcher | balanced (Sonnet) | Research + synthesis, not trivial but not deepest reasoning |
| arch-roadmapper | quality (Opus) | Decomposing system intent into coherent phases is high-stakes |
| arch-planner | balanced (Sonnet) | Decomposing phases into tasks, most work is structured |
| arch-checker | budget (Haiku) | Checking plan dimensions against rules — mechanical |
| arch-executor | balanced (Sonnet) | Writing specs requires domain knowledge, not frontier reasoning |
| arch-verifier | balanced (Sonnet) | Verification logic is systematic but requires judgment |
| context-engineer | quality (Opus) | Designing context flow is the hardest meta-cognitive task |
| schema-designer | balanced (Sonnet) | Schema design is systematic once boundaries are set |
| failure-analyst | balanced (Sonnet) | Enumeration + reasoning, not frontier |
| arch-integrator | budget (Haiku) | Cross-reference checking is mechanical |

**Vocabulary change:** Agent names change. Profile mechanism does not.

---

## Section 2: What Must Change

### 2.1 Output Artifact Mapping

The orchestration scaffolding files (PLAN.md, SUMMARY.md, STATE.md, VERIFICATION.md, ROADMAP.md) are reused with identical schemas. The *output* of execution changes:

**Current GSD execution outputs → Architecture GSD outputs:**

```
src/components/ChatInterface.tsx     →  design/agents/COORDINATOR.md
src/app/api/chat/route.ts           →  design/events/EVENTS.md
prisma/schema.prisma                →  design/schemas/DATA-TYPES.md
src/lib/messageParser.ts            →  design/topology/TOPOLOGY.md
__tests__/chat.test.ts              →  design/verification/VERIFY-CONTRACTS.md
src/hooks/useWebSocket.ts           →  design/context/CONTEXT-FLOWS.md
```

**New document types with no GSD equivalent:**

```
design/agents/AGENT-NAME.md         Agent specification (role, inputs, outputs, failure modes)
design/events/EVENTS.md             Event catalogue with typed payloads
design/events/COMMANDS.md           Command catalogue with typed arguments + response schemas
design/schemas/DATA-TYPES.md        Composite type definitions referenced by events/commands
design/topology/TOPOLOGY.md         Agent dependency graph, communication diagram
design/context/CONTEXT-FLOWS.md     What each agent receives in context, injection strategy
design/verification/OBSERVABLES.md  Observable behaviors for each success criterion
design/failure/FAILURE-MODES.md     Failure modes per agent and integration point
```

### 2.2 Plan Structure: Design Tasks vs. Implementation Tasks

A code GSD task looks like:
```xml
<task type="auto">
  <name>Create ChatInterface component</name>
  <files>src/components/ChatInterface.tsx</files>
  <action>
    Create React component with message list, input field, send button.
    Import from useWebSocket hook. Display messages from props.
  </action>
  <verify>Component renders, imports resolve, no TypeScript errors</verify>
  <done>ChatInterface.tsx exists, exports default ChatInterface, >50 lines</done>
</task>
```

An architecture GSD task looks like:
```xml
<task type="auto">
  <name>Write Coordinator agent contract</name>
  <files>design/agents/COORDINATOR.md</files>
  <action>
    Write full agent specification for the Coordinator role.
    Must include: Role description, Inputs (events received with types),
    Outputs (events emitted with types), State (what it tracks),
    Failure modes (what can go wrong and recovery), Constraints.
    Reference only events defined in design/events/EVENTS.md.
    Do not invent new event names — use only existing catalogue.
  </action>
  <verify>
    File exists >50 lines. Has sections: Role, Inputs, Outputs, State,
    Failure Modes, Constraints. All referenced event names appear in
    design/events/EVENTS.md. No "TBD" in primary sections.
  </verify>
  <done>
    design/agents/COORDINATOR.md exists, substantive (>50 lines),
    all event references resolve, sections complete
  </done>
</task>
```

### 2.3 Verification: From Wired to Cross-Referenced

The three-level artifact verification model adapts at level 3:

**Level 1 — Exists:** `fs.existsSync(path)` — identical.

**Level 2 — Substantive:** Line count + required sections + no placeholder scan — identical mechanism, different placeholder patterns.

**Level 3 — Cross-Referenced** (replaces "Wired/Imported"):
```bash
# Code GSD: check import
grep -r "import.*CoordinatorAgent" src/ --include="*.ts"

# Architecture GSD: check cross-reference
grep -r "Coordinator\|coordinator" design/ --include="*.md" | grep -v "design/agents/COORDINATOR.md"
```

**Level 4 — Internally Consistent** (new level):
```bash
# Extract all event names referenced in agent contract
REFS=$(grep -oE "[A-Z][a-zA-Z]+Event|[A-Z][a-zA-Z]+Command" design/agents/COORDINATOR.md)

# Verify each exists in EVENTS.md or COMMANDS.md
for ref in $REFS; do
  grep -q "$ref" design/events/EVENTS.md design/events/COMMANDS.md || echo "UNDEFINED: $ref"
done
```

### 2.4 Anti-Pattern Scanner Adaptations

```
GSD anti-pattern          →  Architecture equivalent
──────────────────────────────────────────────────
console.log-only function →  TBD-only section
Empty return {}           →  Placeholder section ("See Phase N")
TODO/FIXME                →  TBD/to be determined/will handle
Missing exports           →  Undefined event references
Orphaned component        →  Orphaned agent (specified but not referenced in topology)
```

New architecture-specific anti-patterns:
- **Circular agent dependency**: Agent A receives from B, B receives from A (in same synchronous flow)
- **God agent**: Single agent with >7 distinct responsibilities
- **Missing failure modes**: Agent spec with no "## Failure Modes" or "## Error Handling" section
- **Untyped events**: Event payload with `any`, `object`, or no schema
- **Orphaned event**: Event defined in EVENTS.md but not referenced in any agent contract

---

## Section 3: Proposed New Workflow

### 3.1 Lifecycle Overview

```
System Intent (natural language)
         │
         ▼
   [discuss-system]           Adaptive questioning: intent, scale, constraints,
         │                    non-goals, existing systems, team context
         ▼
   CONTEXT.md                 <domain>, <scale>, <constraints>, <non_goals>,
         │                    <existing_systems>, <decisions_already_made>
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
[arch-researcher]                              [arch-researcher]
  (patterns track)                            (pitfalls track)
         │                                              │
         ▼                                              ▼
  RESEARCH-PATTERNS.md                    RESEARCH-PITFALLS.md
         │                                              │
         └──────────────┬───────────────────────────────┘
                        ▼
              [arch-research-synthesizer]
                        │
                        ▼
                   RESEARCH.md

         ▼
   [arch-roadmapper]          Derives phases from intent + research.
         │                    Phases deliver design artifacts, not features.
         ▼
   ROADMAP.md                 Phases: Boundaries → Events → Contracts
         │                            → Topology → Context → Verification
         │
         └── For each phase:
                  │
                  ▼
            [arch-planner]         Decomposes phase into wave-grouped tasks.
                  │                Assigns must_haves with cross-ref requirements.
                  ▼
             PLAN.md
                  │
                  ▼
            [arch-checker]         8-dimension quality gate.
                  │                Max 3 revision cycles.
                  ▼
            (PLAN.md revised)
                  │
                  ▼
            [arch-executor]        Writes design documents.
                  │                One commit per task.
                  ▼
            SUMMARY.md + design/* files
                  │
                  ▼
            [arch-verifier]        Goal-backward verification.
                  │                4-level artifact checks.
                  ▼
            VERIFICATION.md
                  │
              ┌───┴─────────────────────────┐
              │ passed                      │ gaps_found
              ▼                             ▼
        next phase              [arch-planner --gaps]
                                      │
                                      ▼
                                 gap PLAN.md
                                      │
                                      ▼
                                [arch-executor]
                                      │
                                      ▼
                                [arch-verifier]
         │
         └── After all phases:
                  │
                  ▼
            [arch-integrator]      Cross-phase consistency check.
                  │                Every reference resolves. No circular deps.
                  ▼
            INTEGRATION-REPORT.md
                  │
                  ▼
         [human review]            Review architecture package.
                                   Approve or trigger revision.
```

### 3.2 Standard Phase Structure

Every architecture project runs these phases (can add/skip based on scope):

| Phase | Name | Goal | Key Outputs |
|-------|------|------|-------------|
| 1 | System Boundaries | What exists and who uses it | SYSTEM-OVERVIEW.md, ACTOR-CATALOG.md, INTEGRATION-POINTS.md |
| 2 | Event & Data Schema | All information that flows | EVENTS.md, COMMANDS.md, DATA-TYPES.md |
| 3 | Agent Contracts | What each agent does | design/agents/AGENT-NAME.md (one per agent) |
| 4 | Topology & Orchestration | How agents coordinate | TOPOLOGY.md, ORCHESTRATION.md, STATE-MACHINE.md |
| 5 | Context Engineering | How agents receive context | CONTEXT-FLOWS.md, INJECTION-STRATEGY.md |
| 6 | Failure & Recovery | What breaks and how | FAILURE-MODES.md, RECOVERY-PLAYBOOK.md |
| 7 | Verification Design | How to know it works | OBSERVABLES.md, HEALTH-CHECKS.md, VERIFICATION-STRATEGY.md |

### 3.3 Mapping to Current GSD Commands

| Current GSD command | Architecture equivalent | Same or changed? |
|--------------------|------------------------|-----------------|
| `/gsd:new-project` | `/arch:new-system` | Changed — gathers system intent, not tech stack |
| `/gsd:discuss-phase` | `/arch:discuss-system` | Changed — architecture questions, not feature questions |
| `/gsd:research-phase` | `/arch:research-patterns` | Changed — researches design patterns, not libraries |
| `/gsd:plan-phase N` | `/arch:plan-phase N` | Mostly same — task format differs |
| `/gsd:execute-phase N` | `/arch:execute-phase N` | Same orchestration, different executor domain |
| `/gsd:verify-work N` | `/arch:verify-phase N` | Changed — cross-ref checks vs. import checks |
| `/gsd:map-codebase` | `/arch:map-system` | Changed — maps existing system, not codebase |
| `/gsd:debug` | `/arch:resolve-conflict` | Changed — resolves design contradictions |
| `/gsd:audit-milestone` | `/arch:audit-package` | Same concept, different artifact domain |

---

## Section 4: New Agent Roles

### 4.1 Full Agent Roster

#### arch-researcher
```yaml
name: arch-researcher
tools: Read, Write, WebFetch, WebSearch, mcp__context7__*
color: yellow
```

**Role:** Research established patterns, known pitfalls, and relevant prior art for the architecture domain specified in CONTEXT.md.

**Upstream reads:** CONTEXT.md (domain, constraints, scale)

**Downstream writes:** RESEARCH.md

**Output structure:**
```markdown
# Architecture Research: {system name}

## Relevant Patterns
### {Pattern Name}
**When to use:** ...
**When to avoid:** ...
**Tradeoffs:** ...
**Example systems:** ...

## Known Pitfalls
### {Pitfall}
**Symptoms:** ...
**Root cause:** ...
**Prevention:** ...

## Prior Art
- {System}: {how it solved similar problems}

## Recommended Approaches for This System
1. {Concrete recommendation with rationale}
```

**Critical constraint:** Research design patterns and tradeoffs — not library documentation. "How to implement event sourcing in Redis" is wrong. "When event sourcing is the wrong choice and why" is right.

---

#### arch-roadmapper
```yaml
name: arch-roadmapper
tools: Read, Write
color: magenta
```

**Role:** Transform system intent and research into a phased design roadmap. Phases must flow from most-foundational to most-dependent.

**Upstream reads:** CONTEXT.md, RESEARCH.md

**Downstream writes:** ROADMAP.md, STATE.md (initial)

**Phase ordering rule:** Each phase's outputs must be complete before the next phase can start. Apply the dependency test: "Can Phase N start if Phase N-1 is 50% complete?" If yes, they may be the same phase. If no, they must be separate.

**Structured return:**
```json
{
  "phase_count": 7,
  "phases": [
    {
      "number": 1,
      "name": "System Boundaries",
      "goal": "Define all actors, integration points, and non-goals",
      "depends_on": [],
      "outputs": ["SYSTEM-OVERVIEW.md", "ACTOR-CATALOG.md", "INTEGRATION-POINTS.md"],
      "success_criteria": [
        "All external systems that send/receive data are named",
        "All human actors and their interaction modes are listed",
        "Non-goals explicitly exclude at least 3 scope-adjacent concerns"
      ]
    }
  ]
}
```

---

#### arch-planner
```yaml
name: arch-planner
tools: Read, Write, Glob
color: cyan
```

**Role:** Decompose a design phase into wave-grouped tasks, each producing one design artifact. Assign must_haves with cross-reference requirements.

**Upstream reads:** ROADMAP.md (phase details), CONTEXT.md, STATE.md, prior phase outputs (as needed)

**Downstream writes:** `{phase_dir}/{phase_num}-{plan_num}-PLAN.md`

**Task sizing rules:**
- Each task produces exactly one document (or one section of a document)
- Tasks within a wave may be executed in parallel
- A task is too large if it would produce >150 lines in a single file; split it
- A task is too small if it produces <20 lines; combine it

**Example PLAN.md for Phase 3, Plan 1:**

```markdown
---
phase: 03-agent-contracts
plan: 01
wave: 1
depends_on: []
files_modified:
  - design/agents/COORDINATOR.md
  - design/agents/TASK-EXECUTOR.md
autonomous: true
requirements: [REQ-07, REQ-08]
must_haves:
  truths:
    - "Coordinator contract fully specifies all events it receives and emits"
    - "TaskExecutor contract references only events defined in EVENTS.md"
    - "Both contracts have complete Failure Modes sections"
  artifacts:
    - path: design/agents/COORDINATOR.md
      min_lines: 55
      required_sections:
        - "## Role"
        - "## Inputs"
        - "## Outputs"
        - "## State"
        - "## Failure Modes"
        - "## Constraints"
    - path: design/agents/TASK-EXECUTOR.md
      min_lines: 55
      required_sections:
        - "## Role"
        - "## Inputs"
        - "## Outputs"
        - "## State"
        - "## Failure Modes"
        - "## Constraints"
  key_links:
    - from: design/agents/COORDINATOR.md
      to: design/events/EVENTS.md
      via: "TaskAssigned|TaskCompleted|TaskFailed|WorkflowStarted"
    - from: design/agents/TASK-EXECUTOR.md
      to: design/events/EVENTS.md
      via: "TaskAssigned|TaskCompleted|TaskFailed"
---

## Objective
Write complete agent contracts for the two core agent roles in the order
processing system: Coordinator and TaskExecutor.

## Context
EVENTS.md defines 14 events. Coordinator orchestrates the workflow;
TaskExecutor processes individual tasks. Both must reference only defined events.

## Tasks

<task type="auto">
  <name>Write Coordinator agent contract</name>
  <files>design/agents/COORDINATOR.md</files>
  <action>
    Write complete specification for the Coordinator agent.
    Role: receives WorkflowStarted, decomposes into tasks, assigns to executors,
    tracks completion, emits WorkflowCompleted or WorkflowFailed.
    Must specify: what events trigger it, what it decides, what it emits,
    what state it maintains between events, what happens when an executor
    times out or returns TaskFailed.
    Reference event names exactly as defined in design/events/EVENTS.md.
  </action>
  <verify>
    File exists, >55 lines, has all 6 required sections,
    all event names referenced exist in EVENTS.md
  </verify>
  <done>design/agents/COORDINATOR.md substantive and cross-references resolve</done>
</task>

<task type="auto">
  <name>Write TaskExecutor agent contract</name>
  <files>design/agents/TASK-EXECUTOR.md</files>
  <action>
    Write complete specification for the TaskExecutor agent.
    Role: receives TaskAssigned, executes the task atomically, emits
    TaskCompleted (with result) or TaskFailed (with reason + retry info).
    Must specify: what it needs in context to execute, how it handles
    task timeout, what "atomic" means for this system, max retry policy.
    Reference event names exactly as in design/events/EVENTS.md.
  </action>
  <verify>
    File exists, >55 lines, has all 6 required sections,
    all event names referenced exist in EVENTS.md
  </verify>
  <done>design/agents/TASK-EXECUTOR.md substantive and cross-references resolve</done>
</task>
```

---

#### arch-executor
*(Full spec shown in Pattern 3 above)*

**Key behaviors:**
- Writes one document per task
- Commits after each task: `git commit -m "design(03-01): write Coordinator agent contract"`
- After all tasks: writes SUMMARY.md
- Self-check before SUMMARY.md: verify must_haves manually

**What "substantive" means for architecture docs:**
- Has all required sections
- Each section has real content (>3 sentences or a schema or a list with >3 items)
- No section is purely "TBD" or "See [other doc]"
- Event/type references resolve against existing files

---

#### arch-checker
```yaml
name: arch-checker
tools: Read, Grep, Glob
color: red
```

**Role:** Quality gate on architecture plans. Returns PASS or FAIL with actionable gaps. Used in bounded revision loop (max 3 cycles).

**8 quality dimensions:**

| Dimension | Check | Blocker? |
|-----------|-------|----------|
| 1. Phase Coverage | Does the plan cover all artifacts the phase requires? | Yes |
| 2. Task Completeness | Is each task specific enough to execute without clarification? | Yes |
| 3. Wave Correctness | Do wave assignments respect dependencies? (Wave 2 can't reference Wave 3 outputs) | Yes |
| 4. Cross-Ref Completeness | Do must_haves key_links cover all critical document relationships? | Yes |
| 5. Scope Sanity | >5 tasks in a plan, or any single doc >200 lines expected? | Warning |
| 6. Verifiability | Can all must_haves be checked programmatically (grep/line count/section check)? | Yes |
| 7. Prior Consistency | Does the plan contradict any locked decisions in STATE.md? | Yes |
| 8. Ambiguity | Any task that says "and other relevant content" or "as appropriate"? | Yes |

**Structured return:**
```json
{
  "status": "PASS" | "FAIL",
  "dimensions": {
    "phase_coverage": "PASS",
    "task_completeness": "FAIL",
    "wave_correctness": "PASS",
    "cross_ref_completeness": "FAIL",
    "scope_sanity": "PASS",
    "verifiability": "PASS",
    "prior_consistency": "PASS",
    "ambiguity": "FAIL"
  },
  "blockers": [
    "Task 2 says 'write relevant failure modes' — must specify which failure modes",
    "key_links missing: COORDINATOR.md → DATA-TYPES.md (coordinator uses OrderItem type)"
  ],
  "warnings": []
}
```

---

#### arch-verifier
```yaml
name: arch-verifier
tools: Read, Grep, Glob, Bash
color: blue
```

**Role:** Goal-backward verification after phase execution. Checks truths → artifacts (4 levels) → cross-references. Produces VERIFICATION.md.

**Critical mindset:** Do not trust SUMMARY.md. The executor says what it *claimed* to do. Verify what *actually exists* on disk with *actual content*.

**Verification process:**

1. Load must_haves from PLAN.md frontmatter (or derive from ROADMAP.md success criteria)
2. For each truth: determine what must exist for the truth to hold
3. For each artifact: check all 4 levels
4. For each key_link: grep for the connecting pattern
5. Run anti-pattern scan on all files modified in this phase
6. Identify items requiring human judgment
7. Generate gap plans if gaps found
8. Write VERIFICATION.md

**Level 4 (Consistency) check example:**
```bash
# Get all event names referenced in agent contracts
EVENT_REFS=$(grep -ohE "[A-Z][a-zA-Z]+(Event|Command|Created|Assigned|Failed|Completed)" \
  design/agents/*.md | sort -u)

# Check each against EVENTS.md
for ref in $EVENT_REFS; do
  if ! grep -q "^### $ref\|^## $ref\|\"$ref\"" design/events/EVENTS.md; then
    echo "UNDEFINED_REF: $ref"
  fi
done
```

**Structured return:**
```json
{
  "status": "passed" | "gaps_found" | "human_needed",
  "score": "6/7",
  "gaps": [
    {
      "truth": "TaskExecutor contract specifies retry policy",
      "artifact": "design/agents/TASK-EXECUTOR.md",
      "level": 2,
      "issue": "## Failure Modes section exists but has only 1 line: 'TBD'",
      "severity": "blocker",
      "fix": "Complete the Failure Modes section with retry policy, timeout behavior, dead-letter handling"
    }
  ],
  "human_items": [
    "Verify that the Coordinator's state model is sufficient for your team's operational requirements",
    "Confirm retry limits (currently 3) match your SLA requirements"
  ],
  "report_path": ".planning/phases/03/03-VERIFICATION.md"
}
```

---

#### context-engineer *(new — no GSD equivalent)*
```yaml
name: context-engineer
tools: Read, Write, Glob
color: purple
```

**Role:** Design the context injection strategy for the system being architected. This is a meta-layer: it specifies *what each agent in the target system needs in its context window* at execution time.

**This is the hardest agent role.** GSD handles context injection implicitly (the execute-phase orchestrator injects `@file` references into subagent prompts). Architecture GSD makes this an explicit design artifact.

**Upstream reads:** design/agents/*.md (all agent contracts), design/events/EVENTS.md, ORCHESTRATION.md

**Downstream writes:** design/context/CONTEXT-FLOWS.md, design/context/INJECTION-STRATEGY.md

**Output CONTEXT-FLOWS.md structure:**
```markdown
# Context Flow Map: {System Name}

## Principles
1. Agents receive only what they need (minimal context)
2. State that must persist between invocations lives in events, not agent memory
3. Shared reference data is injected at invocation time, not stored per-agent

## Per-Agent Context Specification

### Coordinator
**Injected at invocation:**
- Current WorkflowStarted event payload (the triggering event)
- AGENT-CATALOG.md (to know available executors and their capabilities)
- Active workflow state from Redis (current task assignments, completion status)

**Not injected (accessed on demand):**
- Full order history
- Customer profile data

**State it must NOT maintain between invocations:**
- Which executors are currently busy (derive from Redis on each invocation)
- Previous workflow decisions (each invocation is stateless)

**Context size budget:** ~8k tokens typical, max 20k

### TaskExecutor
**Injected at invocation:**
- TaskAssigned event payload (the specific task)
- Task-type-specific tool documentation (only for the tool type in the task)
- Retry context (if this is a retry: previous attempt result, failure reason)

**Not injected:**
- Full event catalogue (too large; executor only handles one task type)
- Workflow context (executor doesn't need to know the bigger picture)

**State it must NOT maintain:**
- Results from other tasks in the same workflow
```

**Why this agent exists:** Context engineering for LLM agents is the primary architectural decision that determines whether agents perform well or hallucinate. Making it explicit — as a design artifact, with reasoning and budgets — is the core value proposition of Architecture GSD over ad-hoc system design.

---

#### schema-designer *(new — no GSD equivalent)*
```yaml
name: schema-designer
tools: Read, Write
color: orange
```

**Role:** Design fully typed event, command, and data schemas with validation constraints, examples, and error cases.

**Upstream reads:** ACTOR-CATALOG.md, INTEGRATION-POINTS.md, RESEARCH.md

**Downstream writes:** design/events/EVENTS.md, design/events/COMMANDS.md, design/schemas/DATA-TYPES.md

**Output schema format (for each event):**
```markdown
### TaskAssigned

**Type:** Domain Event
**Emitter:** Coordinator
**Receivers:** TaskExecutor (all instances)
**Trigger:** Coordinator decomposes a workflow step into an assignable task

**Payload:**
```typescript
interface TaskAssigned {
  taskId: string;           // UUID v4, globally unique
  workflowId: string;       // UUID v4, parent workflow
  taskType: TaskType;       // enum: "fetch_data" | "transform" | "validate" | "persist"
  priority: 1 | 2 | 3;     // 1=high, 2=normal, 3=low
  payload: TaskPayload;     // discriminated union by taskType
  retryCount: number;       // 0 for first attempt
  maxRetries: number;       // from workflow config, typically 3
  timeoutMs: number;        // executor must complete within this window
  assignedAt: string;       // ISO-8601
}
```

**Example:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "workflowId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "taskType": "fetch_data",
  "priority": 1,
  "payload": { "endpoint": "/orders/12345", "fields": ["status", "items"] },
  "retryCount": 0,
  "maxRetries": 3,
  "timeoutMs": 5000,
  "assignedAt": "2024-01-15T10:30:00Z"
}
```

**Validation rules:**
- `taskId` must be unique across all events in this workflow
- `retryCount` must be <= `maxRetries`
- `timeoutMs` must be > 0 and < 30000
- `payload` schema must match `taskType` (validated by discriminated union)

**Error cases:**
- Missing `taskId`: reject at bus ingestion, log as INVALID_EVENT
- `retryCount > maxRetries`: treat as dead letter immediately
```

---

#### failure-analyst *(new — no GSD equivalent)*
```yaml
name: failure-analyst
tools: Read, Write, Glob
color: red
```

**Role:** Systematically enumerate failure modes for every agent contract and every integration point. Architecture design consistently skips failure modes; this agent exists to close that gap.

**Upstream reads:** design/agents/*.md, design/events/EVENTS.md, INTEGRATION-POINTS.md

**Downstream writes:** design/failure/FAILURE-MODES.md, design/failure/RECOVERY-PLAYBOOK.md

**Enumeration method:** For each agent, ask:
1. What happens if it receives a malformed event? (validation failure)
2. What happens if it times out? (timeout failure)
3. What happens if its downstream is unavailable? (dependency failure)
4. What happens if it succeeds but the acknowledgement is lost? (at-least-once problem)
5. What happens if it's called concurrently with a duplicate event? (idempotency)

**Output format per agent:**
```markdown
## Coordinator Failure Modes

### FM-C-01: Executor assignment fails (all executors busy or unavailable)
**Trigger:** Coordinator attempts to emit TaskAssigned but no executor acknowledges within timeout
**Detection:** No TaskStarted event within 500ms of TaskAssigned
**Impact:** Workflow stalls. TaskAssigned event sits in queue.
**Recovery:** Coordinator re-emits TaskAssigned with increased priority after 30s.
  After 3 re-emits: emit WorkflowFailed with reason "executor_unavailable"
**Idempotency:** TaskAssigned carries taskId; duplicate assignment is rejected by executor

### FM-C-02: Partial workflow completion (some tasks complete, coordinator crashes)
**Trigger:** Coordinator process dies after some TaskCompleted events received
**Detection:** WorkflowStarted has no corresponding WorkflowCompleted or WorkflowFailed
  within SLA window
**Impact:** Workflow is orphaned. Completed tasks may be re-executed.
**Recovery:** Watchdog process scans for orphaned workflows. Restarts coordinator
  with current state from Redis (replay from WorkflowStarted + all completed TaskIds)
**Idempotency:** Completed tasks have taskId; executor checks before re-executing
```

---

#### arch-integrator *(replaces gsd-integration-checker)*
```yaml
name: arch-integrator
tools: Read, Grep, Glob, Bash
color: white
```

**Role:** After all phases complete, verify cross-phase consistency. Every reference must resolve. No circular dependencies. No orphaned artifacts.

**Checks:**

1. **Event reference resolution:** Every event name in every agent contract exists in EVENTS.md
2. **Agent reference resolution:** Every agent name in ORCHESTRATION.md has a contract in design/agents/
3. **Type reference resolution:** Every type name in every event schema exists in DATA-TYPES.md
4. **Topology completeness:** Every agent in design/agents/ is referenced in TOPOLOGY.md
5. **Circular dependency check:** No agent A receives from B where B receives from A in synchronous flow
6. **Failure mode coverage:** Every agent contract has a corresponding section in FAILURE-MODES.md
7. **Context coverage:** Every agent in design/agents/ has a context specification in CONTEXT-FLOWS.md

**Output INTEGRATION-REPORT.md:**
```markdown
---
status: passed | issues_found
timestamp: {ISO-8601}
phase_coverage: {N} phases checked
---

## Summary
{N}/{M} checks passed.

## Issues Found
### Issue 1: Undefined event reference
**Location:** design/agents/COORDINATOR.md, line 34
**Problem:** References 'WorkflowPaused' event not defined in EVENTS.md
**Fix:** Add WorkflowPaused to EVENTS.md or rename to existing event

## Passed Checks
- Event resolution: 47/47 references resolve
- Agent resolution: 6/6 agents referenced in topology have contracts
...
```

---

## Section 5: How the System Eats Its Own Dog Food

Architecture GSD is itself an agentic system. It should be able to describe itself using its own output format. Here is what Phase 1 (System Boundaries) would produce if Architecture GSD designed itself.

### 5.1 Self-Description: System Overview

```markdown
# Architecture GSD: System Overview

## Purpose
Architecture GSD is a multi-agent orchestration system that produces architecture
design packages for agentic systems. Input: a natural language description of a
system to design. Output: a complete, verified set of architecture documents
(agent contracts, event schemas, topology, context flows, failure modes,
verification strategy) sufficient for a team to implement the system.

## What It Is Not
- Does not produce implementation code
- Does not validate designs against runtime behavior
- Does not make final decisions (human architect approves each phase)
- Does not deploy or configure infrastructure

## Scope Boundary
IN: Any agentic system architecture (multi-agent, event-driven, or LLM-orchestrated)
OUT: Monolithic application design, infrastructure design, database design
     (unless these are components of an agentic system)
```

### 5.2 Self-Description: Actor Catalog

```markdown
# Actor Catalog: Architecture GSD

## Human Actors

### Human Architect
**Interaction mode:** Conversational (CLI or chat interface)
**Responsibilities:**
- Provides initial system intent
- Answers clarifying questions during discuss-system phase
- Reviews and approves each phase completion
- Resolves design conflicts flagged by agents (Rule 4 escalations)
- Makes final architectural decisions when agents reach conflict

**Does NOT do:**
- Write architecture documents (agents do this)
- Choose between implementation options (agents research and recommend)

## Autonomous Agent Actors

### discuss-system (orchestrator role)
Gathers system intent through adaptive questioning. Produces CONTEXT.md.

### arch-researcher
Researches architecture patterns and pitfalls. Produces RESEARCH.md.

### arch-roadmapper
Transforms intent and research into phased roadmap. Produces ROADMAP.md.

### arch-planner
Decomposes phases into wave-grouped tasks with must_haves. Produces PLAN.md.

### arch-checker
Quality gate on plans before execution. Returns PASS/FAIL.

### arch-executor
Executes design tasks, produces architecture documents. Produces SUMMARY.md + design/*.

### arch-verifier
Goal-backward verification of phase completion. Produces VERIFICATION.md.

### context-engineer
Designs context injection strategy for target system. Produces CONTEXT-FLOWS.md.

### schema-designer
Designs typed event/command schemas. Produces EVENTS.md, COMMANDS.md, DATA-TYPES.md.

### failure-analyst
Enumerates failure modes per agent and integration. Produces FAILURE-MODES.md.

### arch-integrator
Cross-phase consistency verification. Produces INTEGRATION-REPORT.md.

## External Systems

### Claude API
All agents are executed as Claude API calls. No other LLM supported.

### Git
All design artifacts are version controlled. Atomic commits after each task.

### Filesystem
Disk is the shared memory bus between agents. All communication is through files.

### Web / Context7
arch-researcher accesses web for pattern research. No other agents access web.
```

### 5.3 Self-Description: Key Events

This is what EVENTS.md would contain for Architecture GSD itself — a partial illustration:

```markdown
# Events: Architecture GSD

## Lifecycle Events

### PhaseStarted
**Emitter:** Orchestrator
**Receivers:** arch-planner
**Trigger:** Human approves previous phase or first phase begins
**Payload:**
```typescript
interface PhaseStarted {
  phaseNumber: number;
  phaseName: string;
  phaseGoal: string;
  dependsOn: number[];        // phase numbers that must be complete
  expectedOutputs: string[];  // file paths to be produced
}
```

### PhaseVerified
**Emitter:** arch-verifier
**Receivers:** Orchestrator
**Trigger:** Verification completes (any status)
**Payload:**
```typescript
interface PhaseVerified {
  phaseNumber: number;
  status: "passed" | "gaps_found" | "human_needed";
  score: string;              // e.g., "6/7"
  reportPath: string;
  gaps: Gap[];
  humanItems: string[];
}
```

### PlanRevisionRequested
**Emitter:** arch-checker
**Receivers:** arch-planner
**Trigger:** Plan fails quality gate (status: FAIL)
**Payload:**
```typescript
interface PlanRevisionRequested {
  planPath: string;
  attemptNumber: number;      // 1, 2, or 3
  blockers: string[];         // must fix before resubmit
  warnings: string[];         // should fix
  failedDimensions: string[]; // which of the 8 dimensions failed
}
```

### DeviationFlagged (Rule 4)
**Emitter:** arch-executor
**Receivers:** Human Architect (via orchestrator)
**Trigger:** Executor encounters scope-altering situation
**Payload:**
```typescript
interface DeviationFlagged {
  taskName: string;
  planPath: string;
  situation: string;          // description of what was discovered
  implication: string;        // what this means for the architecture
  options: string[];          // possible paths forward
  blockedUntil: "human_resolves";
}
```
```

### 5.4 The Bootstrap Path

Architecture GSD cannot design itself before it exists. The practical path:

```
Step 1: Build Architecture GSD as a software project
        using existing GSD (code mode) or manual development.
        Output: working CLI with agent specs and workflow files.

Step 2: First run — design a sample system
        Use Architecture GSD to design a simple, well-understood system
        (e.g., a task queue with workers). Human guides each phase.
        This validates the workflow and produces the first real output package.

Step 3: Self-design run
        Use Architecture GSD to design Architecture GSD itself.
        The output should match this document — if it does, the system works.
        Gaps between this document and the generated output = design bugs.

Step 4: Iterate
        Use the self-design output to improve the agent specs.
        The system is stable when running self-design produces the same output
        as the current version of this document (fixed-point convergence).
```

**The self-consistency test:** Run Architecture GSD on its own description. If the generated agent contracts match the contracts in this document (same sections, same event references, same failure modes), the system is internally consistent. If they diverge, the divergence reveals a gap in either the workflow or this document.

---

## Section 6: Event-Driven Swarm Pattern Catalogue

Architecture GSD should help architects choose and design from these established coordination patterns. Each becomes a **design template** the system can output.

### 6.1 The Four Confluent Patterns

These four event-driven multi-agent patterns (from Confluent's research) form the core catalogue:

| Pattern | Structure | Best For | Architecture GSD Output |
|---------|-----------|----------|------------------------|
| **Orchestrator-Worker** | Central coordinator dispatches tasks via events | Dynamic task decomposition, clear accountability | ORCHESTRATION.md with coordinator contract + worker contracts |
| **Hierarchical** | Multi-level delegation via event streams | Enterprise workflows with natural delegation chains | TOPOLOGY.md with agent hierarchy + delegation rules |
| **Blackboard** | Shared knowledge base, agents post/retrieve asynchronously | Collaborative problem-solving requiring incremental contribution | BLACKBOARD-SCHEMA.md defining shared state + contribution rules |
| **Market-Based** | Agents bid on tasks through an event marketplace | Work distribution where capability matching matters | MARKETPLACE-SPEC.md with bid schema + selection criteria |

**Pattern selection heuristic** (what the arch-researcher recommends based on CONTEXT.md):
- Need clear control + audit trail? → Orchestrator-Worker
- Need flexible scaling with specialization? → Market-Based
- Need collaborative convergence? → Blackboard
- Need delegation across capability tiers? → Hierarchical

### 6.2 Hybrid Coordination (Key Insight)

**Pure patterns are insufficient.** Research consistently shows successful production systems hybridize:

- **Orchestrator-Worker + Blackboard**: Coordinator dispatches tasks, workers post results to a shared knowledge base that other workers read (GSD does this — orchestrator dispatches to executor, executor writes to shared disk)
- **Hierarchical + Market-Based**: Manager decomposes work, but workers bid on subtasks based on capability/load
- **DAG + Swarm**: Deterministic backbone (phase ordering) with swarm-like parallelism within waves (GSD's wave model)

Architecture GSD should help architects design **hybrid topologies** by:
1. Identifying which pattern fits each subsystem (via arch-researcher)
2. Defining integration points between patterns (via arch-integrator)
3. Specifying event schemas that bridge patterns (via schema-designer)

### 6.3 The MCP + A2A Two-Layer Protocol Stack

An emerging standard for agentic interoperability:

**Layer 1 — MCP (Model Context Protocol)**: How agents access tools and data
- Tools: Functions the server exposes for agents to call
- Resources: Data the server exposes for agents to read
- Prompts: Templates the server provides for agent use
- JSON-RPC 2.0 based, transport-agnostic

**Layer 2 — A2A (Agent-to-Agent Protocol)**: How agents communicate with each other
- **Agent Card** (JSON): Capability advertisement — name, description, version, endpoint, auth requirements
- **Message**: Communication turn between agents with sender role and content parts
- **Task**: Unit of work with ID, status lifecycle, session ID
- **Artifact**: Output generated by an agent

Architecture GSD should output designs that target this stack: agent contracts specify MCP tools they consume + A2A messages they send/receive.

### 6.4 Event Sourcing for Agent Systems (ESAA)

The ESAA (Event Sourcing for Autonomous Agents) pattern provides:
- **Immutable event log**: Every agent action persisted as an immutable event
- **Structured intentions**: Agents emit intentions and change proposals validated against JSON Schema contracts
- **Replay capability**: Full audit trail enables "time-travel" debugging
- **Schema evolution**: Versioned event streams + upcasting (transform old event format to current at read time)

Architecture GSD already uses a variant of this — SUMMARY.md and git commits form an immutable log of agent actions. The schema-designer agent should formalize this pattern when designing target systems.

### 6.5 Design Templates the System Outputs

For each coordination pattern, Architecture GSD produces a specific document package:

**Orchestrator-Worker package:**
```
design/
├── agents/ORCHESTRATOR.md        # Coordinator contract
├── agents/WORKER-{TYPE}.md       # One per worker type
├── events/TASK-LIFECYCLE.md      # TaskAssigned, TaskCompleted, TaskFailed
├── topology/ORCHESTRATION.md     # Who dispatches to whom
└── failure/WORKER-FAILURES.md    # Timeout, crash, duplicate handling
```

**Blackboard package:**
```
design/
├── agents/CONTRIBUTOR-{TYPE}.md  # Agents that write to blackboard
├── agents/CONSUMER-{TYPE}.md     # Agents that read from blackboard
├── schemas/BLACKBOARD-STATE.md   # Shared state schema with merge rules
├── events/CONTRIBUTION-EVENTS.md # PostedToBlackboard, ReadFromBlackboard
└── topology/BLACKBOARD-ACCESS.md # Read/write permissions per agent
```

### 6.6 Verification Functions (VeriMAP Pattern)

From VeriMAP research: verification should be **embedded in planning, not appended after execution**. GSD already does this with `must_haves`. The formalized version for architecture output:

```yaml
verification_functions:
  - name: "all_events_typed"
    target: design/events/EVENTS.md
    check: "grep -c 'any\\|object\\|untyped' {target} == 0"
    severity: blocker

  - name: "agent_contracts_complete"
    target: design/agents/*.md
    check: "for f in {target}; do grep -q '## Failure Modes' $f || echo MISSING:$f; done"
    severity: blocker

  - name: "cross_references_resolve"
    check: |
      REFS=$(grep -ohE '[A-Z][a-zA-Z]+(Event|Command)' design/agents/*.md | sort -u)
      for ref in $REFS; do
        grep -q "$ref" design/events/EVENTS.md design/events/COMMANDS.md || echo "UNRESOLVED:$ref"
      done
    severity: blocker
```

### 6.7 Consensus Mechanisms

When multiple agents or verification paths disagree, research shows:
- **Voting beats consensus for reasoning tasks** (+13.2% improvement) — let agents propose independently, select best
- **Consensus beats voting for knowledge tasks** (+2.8%) — require agents to agree on facts
- **Collective Improvement** — agents iteratively refine each other's output (+7.4%)

Architecture GSD uses bounded revision loops (voting-like: propose → check → revise). For knowledge-heavy phases (event schema design), consider a consensus pass where schema-designer and failure-analyst must agree on event completeness.

---

## Section 7: Framework Comparison

How Architecture GSD's approach compares to existing frameworks — and what patterns from each are worth incorporating.

### 7.1 Comparison Matrix

| Dimension | Architecture GSD | Claude Agent SDK | CrewAI | LangGraph | AutoGen/AG2 | OpenAI Agents SDK |
|-----------|-----------------|-----------------|--------|-----------|-------------|-------------------|
| **Primary pattern** | Orchestrator-Worker + Blackboard (disk) | Single-threaded loop | Role-based hierarchical | State graph / DAG | Async actor model | Handoff-based swarm |
| **Context strategy** | Fresh 200k per agent, disk handoff | Auto-compact at 95% | Shared crew store | Thread-scoped checkpoints | Event-driven message passing | Full conversation handoff |
| **State management** | Filesystem (file existence = state) | In-memory + compaction | SQLite crew store | First-class serializable state | Async message queues | Function context passing |
| **Verification** | Goal-backward, 4-level, embedded in planning | Self-evaluation loop | Manager validates | Conditional edges | OpenTelemetry traces | None built-in |
| **Parallelism** | Pre-computed waves (plan time) | Sequential | Sequential or hierarchical | Graph-defined | Async native | Sequential handoffs |
| **Architecture design?** | Primary use case | Not targeted | Not targeted | Could be adapted | Could be adapted | Not targeted |

### 7.2 What to Learn From Each Framework

**From Claude Agent SDK — Code as Orchestration:**
Architecture GSD should keep orchestration logic in explicit workflow files (markdown commands), not abstract it behind a framework. The SDK's philosophy — loops, conditionals, and data transforms in code — maps to our orchestrator workflow files.

**From CrewAI — Role/Backstory/Goals Agent Definition:**
CrewAI's agent definition (Role + Backstory + Goals + Tools) is similar to our agent spec format but adds "Backstory" — the agent's domain expertise narrative. Worth adding to our `<role>` section: a brief paragraph on *why* this agent's perspective matters.

**From LangGraph — State as First-Class Citizen:**
LangGraph's strongest feature is serializable state with checkpointing and time-travel. Architecture GSD achieves this through git commits (each task committed = checkpoint, `git log` = time-travel). But we lack LangGraph's *compiled graph validation* — verifying that the workflow DAG has no orphaned nodes before execution. The arch-checker should add a "workflow completeness" dimension.

**From AutoGen/AG2 — Event-Driven + Request/Response Hybrid:**
AutoGen's v0.4 redesign shows that pure event-driven or pure request/response is insufficient. Some interactions need synchronous resolution (arch-checker returning PASS/FAIL), while others benefit from async (parallel research agents). Architecture GSD already hybridizes — structured returns (sync) + disk artifacts (async).

**From Google ADK — Narrative Casting and Action Attribution:**
When handing off context between agents, ADK re-casts prior "Assistant" messages as narrative and attributes tool calls explicitly. Architecture GSD should adopt this for the discuss-system → arch-researcher handoff: CONTEXT.md should attribute which constraints came from the human vs. which were inferred.

### 7.3 Architecture GSD's Unique Contribution

No existing framework is designed to **produce architecture designs as output**. They all target code execution, task completion, or conversation. Architecture GSD's unique position:

1. **Output domain**: Architecture documents, not code or chat responses
2. **Verification model**: Cross-reference resolution and internal consistency (no other framework checks this)
3. **Context engineering as explicit design phase**: No other system treats context flow design as a first-class deliverable
4. **Failure analysis as mandatory phase**: Most systems treat failure modes as optional; Architecture GSD makes it a required phase
5. **Self-referential consistency**: The system can design itself and verify the output matches reality (fixed-point test)

### 7.4 The Convergence Toward Architecture GSD's Patterns

The 2025-2026 landscape is converging toward patterns Architecture GSD already uses:

- **Event-driven is becoming standard** — AutoGen v0.4, CrewAI Flows, A2A protocol
- **Context engineering > prompt engineering** — universal recognition that context design is the real challenge
- **Verification embedded in planning** — VeriMAP pattern matches GSD's must_haves
- **Hybrid coordination** — no pure pattern works alone; GSD's orchestrator + blackboard (disk) hybrid is validated
- **Interoperability protocols maturing** — MCP + A2A forming a two-layer stack that Architecture GSD's output should target

---

*Document produced by architect-lab research team. Three parallel research agents (gsd-architect, patterns-researcher, schema-analyst) with synthesis by team lead. All sections complete and cross-referenced.*
