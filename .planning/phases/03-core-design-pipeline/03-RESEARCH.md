# Phase 3: Core Design Pipeline — Research

**Researched:** 2026-02-28
**Domain:** Multi-agent architecture document production pipeline, wave-based parallel orchestration, adversarial plan checking, dual-format YAML+markdown output, bounded revision loops
**Confidence:** HIGH — all patterns sourced from direct inspection of GSD reference implementation, existing Phase 1-2 artifacts, and official Claude Code documentation; web research used only for pattern confirmation

---

## Summary

Phase 3 is the largest and most complex phase in Architecture GSD. It implements the full design pipeline: 9 agents (arch-researcher, arch-roadmapper, arch-planner, arch-checker, arch-executor, context-engineer, schema-designer, failure-analyst, plus the existing arch-verifier shell) plus the `/arch-gsd:execute-phase` workflow that coordinates them. The phase also produces the five primary output document types (`design/agents/`, `design/events/`, `design/topology/`, `design/context/`, `design/failure/`).

The reference implementation for nearly everything in Phase 3 already exists in GSD. The planner-checker-revision loop (plan-phase.md), the wave-based parallel executor (execute-phase.md), the adversarial checker framing (gsd-plan-checker.md), and the dual-format output convention (templates/agent-spec.md + templates/event-schema.yaml) are all proven GSD patterns that need domain adaptation, not invention. The only genuinely novel problems are: (1) computing wave assignments for architecture design tasks rather than code tasks (the dependency structure is different), and (2) defining the "quality gate dimensions" for an architecture plan checker that evaluates prose + YAML design documents rather than code tasks.

The blockers flag from the prior research ("Phase 3 arch-planner wave dependency design needs deeper research") is now resolved: wave assignment for architecture tasks follows the same topological-sort algorithm as GSD, but the dependency signals are different. Architecture tasks depend on artifact type (you cannot write an agent contract before its event schemas are named; you cannot write topology before agents are defined) rather than file ownership. The planner must compute these dependencies from the design phase structure, not from file paths.

**Primary recommendation:** Mirror GSD's plan-phase.md + execute-phase.md orchestration pattern exactly. Adapt the agent content (what each agent writes) and the checker dimensions (what quality means for architecture docs rather than code). Do not invent new orchestration machinery.

---

## Standard Stack

### Core (No New Dependencies Beyond Phase 1)

| Component | Version | Purpose | Why |
|-----------|---------|---------|-----|
| `arch-tools.js` (Phase 1) | Node.js built-ins | State management, stub detection, validate-names, frontmatter CRUD | All Phase 3 agents call arch-tools.js for state reads, commit, validate-context, detect-stubs. No new commands needed until Phase 4 YAML graph traversal. |
| `Task()` (Claude Code) | Current | Spawning subagents for wave execution | The execute-phase workflow spawns arch-executor subagents via Task(). GSD's execute-phase.md documents the exact pattern. |
| Markdown + YAML frontmatter | N/A | All design output documents | Dual-format (prose + embedded YAML blocks) is the mandatory output format locked in prior decisions. |
| `js-yaml` | 4.x | Phase 3 does NOT yet need this | YAML graph traversal is Phase 4. Phase 3 agents produce YAML output but don't parse it programmatically — that verification is Phase 4. |

### Supporting (Deferred to Phase 4)

| Library | When Needed | Why Deferred |
|---------|-------------|--------------|
| `js-yaml` | Phase 4, Level 4 verification | Phase 3 produces events.yaml but arch-verifier (Phase 4) parses it |
| `toposort` | Phase 4, cross-document cycle detection | Phase 3 arch-planner computes wave order logically, not via library |
| `ajv` | Phase 4, JSON Schema validation | Phase 3 validates via detect-stubs + section presence, not schema |

**Installation:**
```bash
# Phase 3: no new npm install needed
# arch-tools.js remains zero external dependencies
# All Phase 3 agents use Node.js built-ins + Phase 1 tooling
```

---

## Architecture Patterns

### Pattern 1: The Planner-Checker-Executor Chain (GSD Adaptation)

**What:** Three-agent chain where arch-planner creates a design phase plan, arch-checker adversarially reviews it (max 3 iterations), then arch-executor produces the design documents.

**Reference:** GSD's `plan-phase.md` implements this pattern exactly for code. The architecture domain adaptation replaces:
- Code task definitions (files + action + verify + done) with design task definitions (document type + required sections + naming constraints + cross-references)
- Code quality dimensions (requirement coverage, scope sanity, task completeness) with architecture quality dimensions (section coverage, dual-format completeness, canonical naming, cross-reference completeness)

**The revision loop (PIPE-05) follows GSD's proven pattern:**
```
iteration_count = 0
while iteration_count < 3:
  arch-planner writes PLAN.md files
  arch-checker reviews: returns PASSED or ISSUES_FOUND
  if PASSED: break
  if ISSUES_FOUND and iteration_count < 3:
    arch-planner revises (targeted, not full replan)
    iteration_count++
  if iteration_count == 3 and still ISSUES_FOUND:
    escalate to human with structured gap report
    STOP — do not silently proceed
```

**Key constraint from GSD:** Revision mode is "surgeon, not architect" — planner makes targeted updates to flagged sections only, does not rewrite entire plans. This keeps iterations fast and focused.

**Source:** `/home/mkali/.claude/get-shit-done/workflows/plan-phase.md` (steps 10-12), `/home/mkali/.claude/agents/gsd-planner.md` (revision_mode section). Direct source inspection — HIGH confidence.

### Pattern 2: Wave Assignment for Architecture Tasks

**What:** The arch-planner computes which design tasks can run in parallel (same wave) versus sequentially (later wave). This is the flagged research concern.

**Resolution:** Wave assignment uses the same topological-sort algorithm as GSD. The difference is what creates dependencies:

For GSD (code tasks), dependencies come from:
- File ownership (two tasks modifying the same file must be sequential)
- Type imports (task that imports types must follow task that defines types)

For Architecture GSD (design tasks), dependencies come from artifact types:
```
Wave 1 (always first, no dependencies):
  - arch-researcher (produces RESEARCH.md — no design artifact dependencies)
  - arch-roadmapper (produces design phase roadmap from CONTEXT.md)

Wave 2 (depends on Wave 1 outputs):
  - schema-designer (produces events.yaml — needs RESEARCH.md for technology choices)
  - context-engineer (produces CONTEXT-FLOWS.md — needs roadmap for agent list)

Wave 3 (depends on Wave 2 outputs):
  - arch-executor tasks for agent contracts (need events.yaml for event names)
  - failure-analyst (needs agent list from Wave 2)

Wave 4 (depends on Wave 3 outputs):
  - arch-executor tasks for topology (needs agent contracts to draw diagram)
  - arch-verifier (needs all documents to verify)
```

**The invariant:** Any document that names an event must run after schema-designer (which defines events). Any document that names an agent must run after agent contracts are drafted. Topology runs last (it aggregates).

**Wave assignment algorithm (arch-planner implements this):**
```
tasks = decompose design phase into tasks
for each task:
  deps = []
  if task writes agent contract:
    deps += [schema-designer task]   # needs event names
  if task writes topology:
    deps += [all agent contract tasks]
  if task writes failure modes:
    deps += [agent contract task for same agent]
  if task writes context flows:
    deps += [arch-roadmapper task]
  task.wave = max(deps.wave) + 1 if deps else 1
```

**Source:** GSD's `gsd-planner.md` dependency_graph + assign_waves sections (direct inspection). Architecture-domain dependency rules derived from Phase 1 template analysis (what information each document type needs). HIGH confidence.

### Pattern 3: Adversarial arch-checker Framing (PIPE-04)

**What:** arch-checker is explicitly framed as an adversary — its job is to find problems, not confirm correctness. This prevents the LLM from defaulting to validation theater (rubber-stamping plans because they look complete).

**The 8 quality dimensions for architecture plan checking (adapted from GSD's 7 dimensions):**

1. **Coverage** — Does every design requirement (PIPE-01 through OUTP-07) have a task addressing it? Flag requirements with zero coverage.
2. **Completeness** — Does every design task specify: document type, output path, required sections, naming constraints, cross-references to link? Flag tasks missing these.
3. **Dependency correctness** — Are wave assignments consistent with the artifact dependency rules? Flag wave 3 tasks whose inputs come from wave 4.
4. **Cross-reference completeness** — Does every agent contract task reference the events.yaml it must use? Does every topology task reference all agent contracts? Flag missing cross-references.
5. **Scope sanity** — Does each task scope fit within arch-executor's context budget? A single task writing 5 agent contracts will exceed quality limits. Flag over-scoped tasks.
6. **Verifiability** — Can arch-verifier programmatically check the output of each task? Tasks whose output cannot be verified by detect-stubs + section presence are under-specified.
7. **Consistency** — Do agent names in one task match agent names in another? Flag naming inconsistencies (kebab-case vs snake_case, different names for same agent).
8. **Ambiguity** — Are any task descriptions vague enough that two different arch-executor instances would produce different documents? Flag ambiguous tasks.

**Key framing for arch-checker prompt:**
```
You are NOT validating that plans look complete.
You are finding the specific ways these plans will FAIL during execution.
A plan that lists all required sections but gives arch-executor no guidance
on what to PUT in those sections will produce empty or stub content.
Find that. Find the gaps. Find the vague tasks. Find the naming mismatches.
```

**Source:** GSD's `gsd-plan-checker.md` (direct inspection), adversarial prompting research (WebSearch, MEDIUM confidence). HIGH confidence on the approach; MEDIUM confidence on the exact 8 dimensions (derived from Phase 3 requirements, not from a reference implementation).

### Pattern 4: Dual-Format Output Production (PIPE-06, PIPE-07, PIPE-08)

**What:** arch-executor produces every design document in dual format — markdown prose sections plus embedded YAML blocks. The YAML blocks are canonical (machine-checkable) and the markdown prose is explanatory.

**The contract (already established in Phase 1 templates):**

For agent contracts (`design/agents/*.md`):
```markdown
## Role
[Prose: 3+ sentences, who spawns, what job, output domain]

```yaml
# Canonical block — machine-checkable
agent:
  name: agent-name  # kebab-case, matches filename
  model: sonnet     # must match config.json profile
  spawned_by: workflow-name
  output_domain: design/agents/
```

## Upstream Input
[Prose: list of files read + sections used]

```yaml
inputs:
  - artifact: CONTEXT.md
    path: .arch/CONTEXT.md
    uses: locked-decisions, scale
  - artifact: events.yaml
    path: design/events/events.yaml
    uses: all event names for cross-reference
```
```

For event schemas (`design/events/events.yaml`): pure YAML, no dual format needed — already in canonical form.

**The typing rules (from templates/event-schema.yaml, Phase 1):**
- Allowed: `string`, `integer`, `float`, `boolean`, `array<type>`, `object{field: type}`, `enum[val1, val2]`
- Banned: `any`, `object` (without named fields), `data`, `mixed`, `unknown`
- Every field requires: `name`, `type`, `constraints`, `example`, `required`
- Optional fields additionally require: `default`

**Canonical naming enforcement (PIPE-09):**
- Events: PascalCase (`TaskAssigned`, `PhaseCompleted`)
- Commands: SCREAMING_SNAKE (`ASSIGN_TASK`, `VALIDATE_CONTEXT`)
- Agents: kebab-case (`arch-executor`, `schema-designer`)
- arch-executor calls `node bin/arch-tools.js validate-names {file}` after writing each document

**Source:** `/home/mkali/Claude_Code/best-practices/templates/agent-spec.md` (direct inspection), `/home/mkali/Claude_Code/best-practices/templates/event-schema.yaml` (direct inspection). HIGH confidence.

### Pattern 5: execute-phase Workflow Orchestration (PIPE-10, PIPE-11)

**What:** `/arch-gsd:execute-phase` orchestrates the full pipeline: reads STATE.md → runs arch-researcher → arch-roadmapper → arch-planner + arch-checker loop → spawns arch-executor per wave → updates STATE.md.

**Reference pattern from GSD's execute-phase.md:**
```
1. Initialize from arch-tools.js (load config, find phase, list plans)
2. Describe what each wave will build (before spawning)
3. Spawn arch-executor agents in parallel for same-wave tasks via Task()
4. Wait for all agents in wave to complete
5. Spot-check: verify design documents written, git commits present
6. Proceed to next wave
7. After all waves: spawn arch-verifier (Phase 4 stub in Phase 3)
8. Update STATE.md + ROADMAP.md
```

**Claude Code Task() parallelization — from official docs (HIGH confidence):**
```
# Parallel wave execution in execute-phase workflow
# Spawn multiple arch-executor agents for same-wave tasks:
Task(subagent_type="arch-executor", model="sonnet", prompt="Execute task: {task1}")
Task(subagent_type="arch-executor", model="sonnet", prompt="Execute task: {task2}")
# Both spawn in parallel — Claude Code blocks until both complete
# Then wave N+1 begins
```

**Critical: orchestrator stays lean.** From GSD's execute-phase.md: "Pass paths only — executors read files themselves with their fresh 200k context. This keeps orchestrator context lean (~10-15%)." arch-executor subagents each get full context windows for writing design documents.

**Wave assignment is pre-computed at plan time** (written in PLAN.md frontmatter `wave: N`). execute-phase reads the wave number from frontmatter — it does not recompute dependencies at execution time.

**Source:** `/home/mkali/.claude/get-shit-done/workflows/execute-phase.md` (direct inspection), `https://code.claude.com/docs/en/agent-teams` (official Claude Code docs, HIGH confidence). HIGH confidence on orchestration pattern.

### Pattern 6: Specialized Agent Roles (SPEC-01, SPEC-02, SPEC-03)

**What:** Three specialized agents have focused domains within the design pipeline. They are NOT generic executors — they have domain expertise encoded in their agent specs.

**context-engineer (SPEC-01):**
- Input: CONTEXT.md (actor inventory, scale), arch-roadmapper output (agent list)
- Output: `design/context/CONTEXT-FLOWS.md` — what each agent reads, writes, passes downstream
- The design question it answers: "Where are the information bottlenecks? What data is duplicated? What context does each agent need?"
- Key constraint: must identify agents that are context-starved (need data not currently passed to them)

**schema-designer (SPEC-02):**
- Input: CONTEXT.md (scale, domain, locked-decisions), RESEARCH.md (technology patterns)
- Output: `design/events/events.yaml` — canonical registry of all events and commands
- The design question it answers: "What events flow between agents? What commands trigger agent actions? What is the typed payload of each?"
- Key constraint: NO `any` or `object` types. Every field must be fully typed with constraints and an example value. Events PascalCase, commands SCREAMING_SNAKE.
- Schema-designer runs in Wave 2 (before agent contracts) because agent contracts reference event names. Schema-designer DEFINES those names.

**failure-analyst (SPEC-03):**
- Input: agent contracts (from arch-executor Wave 3), events.yaml (from schema-designer)
- Output: `design/failure/FAILURE-MODES.md` — failure catalog per agent and integration point
- The design question it answers: "What breaks, how does it manifest, how does the system recover?"
- Key constraint: BANNED phrases: "handles gracefully", "retries as needed", "escalates appropriately". Every failure mode must have: trigger (specific), manifestation (observable), severity, recovery (immediate + escalation), detection method.
- Runs in Wave 3 or 4 (after agent contracts exist to enumerate failure points)

**Source:** Phase 3 requirements (SPEC-01, SPEC-02, SPEC-03) + Phase 1 `templates/failure-modes.md` (direct inspection) + `templates/event-schema.yaml` (direct inspection). HIGH confidence on approach; pattern is derived from requirements and existing templates.

### Pattern 7: STATE.md Write Protocol (STAT-01, STAT-02, STAT-03)

**What:** STATE.md is updated after every plan completion, stays under 100 lines, and is the mandatory first read for every agent. Any agent must be able to resume from STATE.md + disk state without prior conversation context.

**STATE.md update protocol:**
```
After each PLAN.md task completes:
1. arch-executor calls: node bin/arch-tools.js frontmatter set .arch/STATE.md
2. Updates: "Current position", "Last activity", "Decisions" (if new locked decisions discovered)
3. Never exceed 100 lines total — trim oldest decisions if approaching limit
4. Every agent spec must include in Execution Flow: "Step 1: Read .arch/STATE.md"
```

**Resume protocol (any agent can resume):**
```
Agent wakes up with no conversation context.
Step 1: Read .arch/STATE.md → understand current position, decisions, pending work
Step 2: Read .arch/CONTEXT.md → understand system being designed
Step 3: ls design/ → understand what design documents already exist
Step 4: Determine what remains → consult PLAN.md for current phase
Step 5: Continue from last incomplete task
```

**Source:** GSD's STATE.md pattern (direct inspection of project STATE.md), Phase 3 requirements STAT-01 through STAT-03. HIGH confidence.

### Recommended Project Structure (Phase 3 Outputs)

```
architecture-gsd/
├── agents/                    # Agent specs (fully implemented in Phase 3)
│   ├── arch-researcher.md     # 03-01: full body
│   ├── arch-roadmapper.md     # 03-01: full body
│   ├── arch-planner.md        # 03-02: full body
│   ├── arch-checker.md        # 03-03: full body
│   ├── arch-executor.md       # 03-04: full body
│   ├── context-engineer.md    # 03-05: full body
│   ├── schema-designer.md     # 03-05: full body
│   └── failure-analyst.md     # 03-05: full body
├── workflows/
│   └── execute-phase.md       # 03-06: full implementation
└── ...

# Per-project output (produced at runtime by agents):
<project-root>/
└── design/
    ├── agents/
    │   └── {agent-name}.md    # OUTP-01: one per agent, dual-format
    ├── events/
    │   └── events.yaml        # OUTP-02: canonical event/command registry
    ├── topology/
    │   └── TOPOLOGY.md        # OUTP-03: dependency graph + communication
    ├── context/
    │   └── CONTEXT-FLOWS.md   # OUTP-04: context injection per agent
    └── failure/
        └── FAILURE-MODES.md   # OUTP-05: failure catalog
```

### Anti-Patterns to Avoid

- **arch-checker as rubber-stamper:** If arch-checker is not explicitly adversarially framed, it will default to confirming that plans look reasonable. The framing must be: "find the specific ways these plans will fail" — not "verify these plans are complete."

- **arch-executor writing all documents in one task:** Each document type requires significant context (agent contracts are 100+ lines of dual-format). Packing 5 agent contracts into one arch-executor task will overflow context. One task = one output document.

- **Wave 1 tasks referencing Wave 2 artifacts:** If arch-planner assigns schema-designer to Wave 2 but an agent contract task (Wave 3) names specific events before schema-designer defines them, the contracts will contain guessed event names that won't match events.yaml. The plan must enforce: no event name references in agent contracts until schema-designer completes.

- **STATE.md exceeding 100 lines:** Phase 3 produces many artifacts. Without discipline, STATE.md will bloat. The 100-line limit is a hard constraint, not a guideline. Trim by removing duplicate decisions and replacing fine-grained status entries with phase-level summaries.

- **Deviation rules not implemented (PIPE-12):** The execute-phase workflow must implement deviation handling. Without it, arch-executor hits an unexpected case and stops rather than resolving it automatically. Rule 1 (auto-complete minor issues), Rule 2 (auto-document deviations), Rule 3 (auto-flag scope creep), Rule 4 (STOP for scope changes) must all be in arch-executor's deviation_rules section.

- **arch-checker and arch-verifier sharing prompting framing:** Prior decision: these must never be the same agent or share the same framing. arch-checker checks PLANS (before execution). arch-verifier checks OUTPUTS (after execution). Different subjects, different adversarial framing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Planner-checker revision loop orchestration | Custom loop logic in execute-phase | Copy GSD's plan-phase.md steps 10-12 | GSD proves max-3 iteration loop with structured issue passing works. The pattern: spawn checker, read return, spawn planner with issues, repeat. Do not reinvent. |
| Wave assignment algorithm | Novel dependency solver | Topological sort: wave = max(deps.wave) + 1 | This is the same algorithm GSD uses. Apply to architecture artifact dependencies. The algorithm is 5 lines, the insight is knowing which artifacts depend on which other artifacts. |
| Stub detection for design documents | Per-document stub checks | `node bin/arch-tools.js detect-stubs {file}` | Phase 1 built this. Covers "TBD", "handles gracefully", "as needed", all critical architecture stub phrases. arch-executor calls this after writing each document. |
| Naming validation | Per-file regex checks | `node bin/arch-tools.js validate-names {file}` | Phase 1 built this. Checks PascalCase events, kebab-case agents, SCREAMING_SNAKE commands. arch-executor calls this after writing events.yaml and agent contracts. |
| STATE.md update | Custom state management | `node bin/arch-tools.js frontmatter set` | Phase 1 built this. Use to update STATE.md position, decisions, and last-activity fields after each task. |
| Agent spec template scaffolding | Writing from blank markdown | `@references/agent-spec-format.md` + `@templates/agent-spec.md` | Phase 1 built these. arch-executor reads them as @-references and fills in sections. The templates encode verification rules as HTML comments — arch-checker reads these same templates to know what "substantive" means. |

**Key insight:** Every novel pattern in Phase 3 is an adaptation of GSD's proven patterns. The domain changes (design documents instead of code), the agent names change, and the quality criteria change — but the orchestration machinery, revision loop, wave execution, and state management are all direct GSD adaptations.

---

## Common Pitfalls

### Pitfall 1: Planner Writes Tasks at the Wrong Granularity

**What goes wrong:** arch-planner creates a single task "Write all agent contracts" or overly-fine tasks "Write the Role section of arch-executor." Neither works: the former overflows context, the latter creates coordination overhead with no benefit.

**Why it happens:** The natural decomposition for a human is by document (one task per agent contract). But the context budget matters — arch-executor writing a 150-line dual-format agent contract consumes ~20-30% context. At 3 agent contracts per task, that's 90% context for tasks alone, leaving no room for reading references.

**How to avoid:** One design document = one task. Each arch-executor invocation writes exactly one primary output document. Multiple documents in one task → split. Planning establishes this: each task in PLAN.md has exactly one file in `files_modified`.

**Warning signs:** PLAN.md has a task with multiple files in `files_modified` for the same document type (e.g., `design/agents/arch-executor.md, design/agents/arch-planner.md`).

### Pitfall 2: arch-checker Flags Things arch-executor Cannot Fix

**What goes wrong:** arch-checker flags an issue like "the agent contract for arch-executor cannot be verified until events.yaml exists, which is in Wave 2." This is a legitimate dependency gap — but if arch-planner addresses it by moving arch-executor to Wave 3, arch-checker's next pass flags a new issue. The loop spins without progress.

**Why it happens:** The checker and planner have different mental models of what wave assignment means. Checker finds a real dependency gap. Planner moves the task. Checker finds the next gap.

**How to avoid:** arch-planner must establish the canonical wave order in the FIRST pass and not change it in revision mode unless arch-checker identifies an actual ordering violation (not just a potential one). The wave order is: Wave 1 (research/roadmap) → Wave 2 (schemas/context flows) → Wave 3 (agent contracts) → Wave 4 (topology/failure modes). Revision mode adjusts task details, not wave structure.

**Warning signs:** Iteration count reaches 2 and the issues being revised are about wave numbers rather than task content.

### Pitfall 3: schema-designer Invents Event Names That Don't Match Domain

**What goes wrong:** schema-designer produces events.yaml with made-up names that don't reflect the actual system being designed. Later, arch-executor writes agent contracts that use different names. arch-verifier (Phase 4) finds mismatches.

**Why it happens:** schema-designer has no examples or constraints from the system design. It works from CONTEXT.md which describes the system at a high level but doesn't enumerate events.

**How to avoid:** schema-designer's execution flow must include: Step 1 — extract all actors and their interactions from CONTEXT.md, Step 2 — derive events from actor interactions (Actor A does X → event: X + ed = XCompleted or XFailed), Step 3 — derive commands from human-initiated triggers, Step 4 — write events.yaml. The naming must be grounded in the CONTEXT.md, not invented.

**Warning signs:** events.yaml contains generic names like "TaskStarted", "TaskCompleted" with no relationship to the specific domain described in CONTEXT.md.

### Pitfall 4: Bounded Revision Loop Escalates Silently

**What goes wrong:** After 3 iterations, the orchestrator reaches `iteration_count >= 3` but instead of escalating to the human, it silently proceeds with plans that have known blockers. The execution then produces invalid design documents, and Phase 4 verification catches issues that should have been caught at plan time.

**Why it happens:** Developers implement the iteration check but not the escalation handler. The code path for "max iterations reached" just logs and continues.

**How to avoid:** Success criterion 3 is explicit: "if arch-checker raises blockers that are not resolved in 3 iterations, the workflow escalates to the human with a structured gap report rather than silently proceeding." The execute-phase workflow must implement the escalation path as a hard STOP — return a structured gap report and wait for human input.

**Warning signs:** execute-phase has `if iteration_count >= 3: proceed` instead of `if iteration_count >= 3: escalate`.

### Pitfall 5: Agent Specs Stub Out Their Own Specifications

**What goes wrong:** Phase 3 implements 8 agent spec bodies. It's tempting to write shallow agent specs with sections that say "performs the analysis" or "produces the output" without specifying the exact steps, tools, and decision points. detect-stubs may pass (the banned phrases aren't present) but the spec is functionally a stub.

**Why it happens:** Writing thorough agent specs is the hardest content work in Phase 3. The spec must be detailed enough that a fresh Claude instance with no other context can execute it. "Performs the analysis" is not that level of detail.

**How to avoid:** Every execution flow step must reference a specific file read, Bash tool call, decision point, or file write. The test: "Could a different Claude instance executing this agent spec produce the same output without asking clarifying questions?" If not, the spec is too vague. Minimum 4 concrete steps in every Execution Flow section.

**Warning signs:** Execution Flow steps contain verbs without objects: "analyzes the input", "reviews the artifacts", "produces the output".

### Pitfall 6: execute-phase Context Overflow from Orchestrator Reading All Documents

**What goes wrong:** The execute-phase orchestrator tries to read all design documents produced by Wave 3 before spawning Wave 4. At 5 agent contracts × 150 lines each, this is 750 lines of content read into the orchestrator context before Wave 4 even begins.

**Why it happens:** The orchestrator wants to "understand" what was produced before spawning the next wave. This is the same pitfall GSD's execute-phase.md warns against.

**How to avoid:** Orchestrator stays lean — it reads SUMMARY.md files (100 lines max each) and spot-checks only 2-3 files per completed wave. Full document content is read by the arch-executor subagents in their own fresh context windows, not by the orchestrator. GSD's execute-phase.md: "Pass paths only — executors read files themselves with their fresh 200k context. This keeps orchestrator context lean (~10-15%)."

**Warning signs:** execute-phase.md workflow reads full design documents rather than SUMMARYs. Orchestrator context usage above 40% before executing Wave 3.

---

## Code Examples

Verified patterns from GSD reference and Phase 1 artifacts (HIGH confidence — direct source inspection):

### arch-planner Wave Assignment Logic

```javascript
// Derived from gsd-planner.md dependency_graph + assign_waves sections
// Architecture domain adaptation

const ARCHITECTURE_DEPENDENCY_RULES = {
  // Document type -> what it requires to exist first
  'agent-contract': ['events.yaml'],           // Needs event names to reference
  'topology': ['agent-contract'],               // Needs all agent contracts to draw graph
  'failure-modes': ['agent-contract'],          // Needs agents to enumerate failure points
  'context-flows': ['arch-roadmapper-output'],  // Needs agent list from roadmapper
  'events.yaml': ['arch-researcher-output'],    // Needs technology research
};

function assignWaves(tasks) {
  const waves = {};
  for (const task of tasks) {
    if (task.depends_on.length === 0) {
      task.wave = 1;
    } else {
      task.wave = Math.max(...task.depends_on.map(d => waves[d] || 1)) + 1;
    }
    waves[task.id] = task.wave;
  }
  return tasks;
}

// Example wave structure for a typical design phase:
// Wave 1: arch-researcher, arch-roadmapper (no artifact dependencies)
// Wave 2: schema-designer (needs RESEARCH.md), context-engineer (needs agent list)
// Wave 3: arch-executor × N (one per agent contract, needs events.yaml from Wave 2)
// Wave 4: arch-executor (topology, failure modes — needs contracts from Wave 3)
```

### arch-checker 8-Dimension Issue Format

```yaml
# arch-checker structured return format
# Adapted from gsd-plan-checker.md issue_structure section

issues:
  - plan: "03-02"              # Which PLAN.md has the issue
    dimension: "cross_reference_completeness"   # One of the 8 dimensions
    severity: "blocker"        # blocker | warning | info
    description: "arch-executor task for arch-planner contract lists events.yaml
                  as an input but does not specify which event names to reference.
                  arch-executor will either omit events or invent names."
    task: 3                    # Task number within the plan
    fix_hint: "Add to task action: 'Read design/events/events.yaml and reference
               TaskAssigned and TaskCompleted events in the ## Upstream Input section'"
```

### execute-phase Parallel Wave Spawning

```markdown
<!-- In execute-phase.md workflow, Wave N execution -->
<!-- Spawns multiple arch-executor subagents in parallel -->

## Wave {N}: Agent Contracts

Spawning {count} arch-executor agents in parallel...

<!-- Parallel Task() calls — all spawn simultaneously, orchestrator waits for all -->
Task(
  subagent_type="arch-executor",
  model="sonnet",
  prompt="Read agents/arch-executor.md for instructions.
  Execute task: Write design/agents/arch-planner.md
  Phase directory: {phase_dir}
  References: @references/agent-spec-format.md @templates/agent-spec.md
  Validate after writing: node bin/arch-tools.js detect-stubs design/agents/arch-planner.md"
)
Task(
  subagent_type="arch-executor",
  model="sonnet",
  prompt="Read agents/arch-executor.md for instructions.
  Execute task: Write design/agents/arch-checker.md
  Phase directory: {phase_dir}
  References: @references/agent-spec-format.md @templates/agent-spec.md
  Validate after writing: node bin/arch-tools.js detect-stubs design/agents/arch-checker.md"
)
<!-- Both agents complete before Wave N+1 begins -->
```

### arch-executor Dual-Format Output Pattern

```markdown
<!-- arch-executor producing a design/agents/{agent}.md document -->
<!-- Pattern: markdown prose section + embedded YAML canonical block -->

## Role

Spawned by /arch-gsd:execute-phase after arch-planner produces a phase PLAN.md
and arch-checker approves it. This agent reads the PLAN.md task assigned to it,
writes the target design document in dual-format (markdown prose + embedded YAML
canonical blocks), calls detect-stubs to verify no stub phrases remain, and
returns a structured JSON result to the orchestrator. Output domain is
design/agents/, design/events/, design/topology/, design/context/, design/failure/.

```yaml
agent:
  name: arch-executor
  model: sonnet
  spawned_by: /arch-gsd:execute-phase
  output_domain: design/
  wave: varies  # assigned by arch-planner per task
```
```

### validate-names Call After Writing

```bash
# arch-executor validation sequence after writing a design document
# Source: Phase 1 arch-tools.js validate-names + detect-stubs commands

# 1. Check for stub phrases
STUB_CHECK=$(node bin/arch-tools.js detect-stubs design/agents/arch-planner.md)
CLEAN=$(echo "$STUB_CHECK" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['clean'])")
if [ "$CLEAN" != "True" ]; then
  echo "STUB DETECTED: Fix before committing"
  echo "$STUB_CHECK"
  exit 1
fi

# 2. Check naming conventions (for event schemas and agent contracts)
NAME_CHECK=$(node bin/arch-tools.js validate-names design/events/events.yaml)
VALID=$(echo "$NAME_CHECK" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['valid'])")
if [ "$VALID" != "True" ]; then
  echo "NAMING VIOLATION: Fix before committing"
  echo "$NAME_CHECK"
  exit 1
fi

# 3. Commit atomically
node bin/arch-tools.js commit "feat(03): write arch-planner agent contract" \
  --files design/agents/arch-planner.md
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-agent architecture documentation | Multi-agent specialized roles (arch-planner, arch-checker, arch-executor, schema-designer, context-engineer, failure-analyst) | Architecture GSD design decision | Each agent has a single, bounded responsibility. arch-checker is adversarial to arch-planner — same agent cannot both plan and check. |
| Sequential agent execution | Wave-based parallel execution | GSD pattern, proven 2024-2025 | Independent design tasks (e.g., writing schema-designer contract while writing context-engineer contract) complete in parallel, reducing total execution time. |
| Prose-only architecture documents | Dual-format (prose + embedded YAML) | Architecture GSD decision (prior phase) | Programmatic cross-reference verification becomes possible. arch-verifier (Phase 4) can parse YAML blocks; cannot reliably parse free prose. |
| Human plan review before execution | Adversarial LLM plan checker with bounded revision loop | Architecture GSD + GSD patterns | Catches structural gaps (missing sections, wrong wave order, vague tasks) before arch-executor burns context producing flawed documents. |
| Generic LLM writing all architecture documents | Specialized agents per document type | Architecture GSD design | schema-designer knows event naming rules deeply. failure-analyst knows failure mode format. arch-executor produces documents from approved plans rather than designing and writing simultaneously. |

**Deprecated/outdated:**
- Monolithic architecture review agent: Replaced by the planner → checker → executor chain with specialized roles.
- ad-hoc wave assignment: Replaced by deterministic topological-sort algorithm seeded by artifact type dependencies.

---

## Open Questions

1. **arch-roadmapper's phase structure — fixed 5-phase or adaptive?**
   - What we know: PIPE-02 says "derives a 5-phase design structure... adapting based on complexity signals." The system being designed may warrant fewer or more phases.
   - What's unclear: What are the "complexity signals"? How does arch-roadmapper determine whether to use 3 phases vs 5 vs 7?
   - Recommendation: For v1, implement a 5-phase default with scale-based adaptation: systems with `scale.agents < 5` use 3-phase structure (schema, agents, integration); systems with `scale.agents 5-15` use 5-phase; systems with `scale.agents > 15` use 7-phase with additional integration phases. Lock this in Plan 03-01.

2. **execute-phase workflow — where does arch-planner + arch-checker loop live?**
   - What we know: GSD has two separate workflows: `plan-phase.md` (research + plan + check) and `execute-phase.md` (wave execution). The phase description says `/arch-gsd:execute-phase` coordinates the full pipeline.
   - What's unclear: Does `/arch-gsd:execute-phase` subsume what GSD calls `/gsd:plan-phase` (research + plan + check loop)? Or are there two separate commands?
   - Recommendation: `/arch-gsd:execute-phase` subsumes the full pipeline including the planning step. When invoked, it runs: arch-researcher → arch-roadmapper → arch-planner → arch-checker loop → arch-executor waves → arch-verifier. This is simpler for the human (one command) at the cost of a longer workflow. An explicit `/arch-gsd:plan-phase` command can be added later for humans who want to review plans before execution.

3. **PLAN.md format for architecture tasks — same format as GSD or different?**
   - What we know: GSD's PLAN.md format uses `<task type="auto">` with `<files>`, `<action>`, `<verify>`, `<done>`. Architecture tasks don't have the same structure — an architecture task writes a document, not code.
   - What's unclear: Should architecture PLAN.md reuse GSD's exact task XML format, or use a domain-specific format?
   - Recommendation: Reuse GSD's task format exactly. `<files>` = the design document path, `<action>` = which template to use + which sections to write + what content to include, `<verify>` = `node bin/arch-tools.js detect-stubs {file}` + `validate-names {file}`, `<done>` = "design/{path} exists with all required sections, no stub phrases, naming conventions valid." This preserves the ability to use GSD's plan-structure verification command on arch plans.

4. **Deviation rules (PIPE-12) — what are the 4 rules for architecture domain?**
   - What we know: PIPE-12 requires: auto-complete (Rule 1), auto-document (Rule 2), auto-flag (Rule 3), STOP for scope changes (Rule 4). These mirror GSD's deviation_rules.
   - What's unclear: What constitutes "scope change" in architecture domain? In GSD, scope change = changing what feature is built. In architecture domain, scope change = designing a different system than CONTEXT.md describes.
   - Recommendation: Rule 1 — if a required section has minor ambiguity, fill it with the most specific reasonable interpretation. Rule 2 — if arch-executor makes an architectural choice not explicitly in the plan, document it in SUMMARY.md. Rule 3 — if a design requirement in CONTEXT.md is unaddressed by any task in the plan, flag it immediately (do not silently skip it). Rule 4 — if CONTEXT.md is inconsistent with the assigned task (e.g., task says to design 3 agents but CONTEXT.md says 10), STOP and return `status: human_needed`.

5. **Plan 03-07: Primary output document production — is this a separate plan or part of 03-06?**
   - What we know: The roadmap lists 03-07 as "Primary output document production (design/agents/, design/events/, design/topology/, design/context/, design/failure/)". This suggests writing the actual output documents is a plan rather than an agent task.
   - What's unclear: Does 03-07 mean: (a) implementing the templates/scripts/tooling that arch-executor uses to produce output documents, or (b) running the pipeline on a sample system to produce example output?
   - Recommendation: 03-07 means (a) — it is the implementation plan for ensuring arch-executor can produce complete, valid documents for each output type (agent contracts, event schemas, topology, context flows, failure modes). This is primarily an arch-executor spec detail plan that covers the document-type-specific production logic that 03-04 (arch-executor spec) may not fully detail. Confirm scope with the planner.

---

## Sources

### Primary (HIGH confidence)

- `/home/mkali/.claude/get-shit-done/workflows/plan-phase.md` — Direct source inspection. Planner-checker-revision loop (steps 8-12), max 3 iterations, structured issue passing between checker and planner, escalation on max iterations.
- `/home/mkali/.claude/get-shit-done/workflows/execute-phase.md` — Direct source inspection. Wave-based parallel execution via Task(), orchestrator context discipline (lean orchestrator, full context for subagents), spot-checking SUMMARY.md after each wave.
- `/home/mkali/.claude/agents/gsd-planner.md` — Direct source inspection. Wave assignment algorithm (assign_waves section), dependency graph construction (dependency_graph section), revision mode protocol (revision_mode section).
- `/home/mkali/.claude/agents/gsd-plan-checker.md` — Direct source inspection. 7 verification dimensions, adversarial framing ("find what will fail"), issue severity levels (blocker/warning/info), structured issue YAML format.
- `/home/mkali/.claude/agents/gsd-executor.md` — Direct source inspection. Deviation rules (Rule 1 auto-fix, Rule 2 auto-document, Rule 3 auto-flag, Rule 4 STOP), atomic commit protocol, context discipline.
- `/home/mkali/Claude_Code/best-practices/templates/agent-spec.md` — Phase 1 artifact, direct inspection. Dual-format template with HTML comment verification rules, 7 required sections, content expectations per section.
- `/home/mkali/Claude_Code/best-practices/templates/event-schema.yaml` — Phase 1 artifact, direct inspection. Allowed and banned YAML types, required field structure (name, type, constraints, example, required, default), naming rules.
- `/home/mkali/Claude_Code/best-practices/references/verification-patterns.md` — Phase 1 artifact, direct inspection. Level 1-4 verification stack, minimum line counts per document type, required section names.
- `/home/mkali/Claude_Code/best-practices/references/agent-spec-format.md` — Phase 1 artifact, direct inspection. Required frontmatter fields, required body sections, complete vs incomplete examples that arch-checker uses as rubric.
- `https://code.claude.com/docs/en/agent-teams` — Official Claude Code documentation, fetched 2026-02-28. Task() parallelization pattern, subagent vs agent team distinction, orchestrator spawning multiple concurrent agents.

### Secondary (MEDIUM confidence)

- WebSearch: "multi-agent LLM planner checker revision loop bounded iterations 2025" — Confirmed: 3-iteration bounded loops are industry standard, 96.5% of cases converge in ≤3 iterations per Nature paper citation. MEDIUM: web source, single paper.
- WebSearch: "wave-based task parallelization dependency graph topological sort 2025" — Confirmed: topological sort for wave assignment is the standard algorithm for DAG-based task scheduling. HIGH for algorithm, MEDIUM for web source.
- `/home/mkali/Claude_Code/best-practices/.planning/STATE.md` — Project state. Confirmed prior decisions: adversarial framing for arch-checker, dual-format mandatory, all 11 agents in v1, phase 3 wave dependency design flagged for research.
- `/home/mkali/Claude_Code/best-practices/.planning/ROADMAP.md` — Phase 3 success criteria and plans list. Confirmed all 7 plans and their scopes.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tooling from Phase 1 verified by direct inspection
- Orchestration patterns (wave execution, planner-checker loop): HIGH — directly adapted from GSD reference implementation; all source files inspected
- Agent content patterns (dual-format output, 8 checker dimensions, specialized agent roles): HIGH for format/structure (from Phase 1 templates); MEDIUM for quality criteria (derived from requirements, not from reference implementation)
- Wave assignment for architecture tasks: HIGH for algorithm (topological sort from GSD); MEDIUM for dependency rules (derived from document type analysis, not from prior implementation)
- Bounded revision loop escalation: HIGH — confirmed by GSD's plan-phase.md implementation and web research on iteration bounds

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable domain — GSD patterns, Claude Code Task() API, and YAML/markdown tooling are stable; 30-day validity conservative)

**The flagged blocker is resolved:** "Phase 3 arch-planner wave dependency design needs deeper research" — research confirms the algorithm is topological sort (same as GSD) with architecture-domain artifact type dependencies substituted for code file ownership dependencies. The dependency rules are: events.yaml before agent contracts before topology. Context-engineer before topology. Failure-analyst after agent contracts. This is deterministic and plannable.
