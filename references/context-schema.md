# CONTEXT.md Schema Specification

**Status:** Locked (Phase 1)
**Enforced by:** `arch-tools.js validate-context`
**Produced by:** `discuss-system` agent (Phase 2)
**Version:** 1.0

This document is the complete schema specification for CONTEXT.md files. It defines every required field, its type, nesting structure, validation rules, and content expectations. This is the contract between Phase 1 tooling and Phase 2 agent output. `discuss-system` produces against this schema; `validate-context` validates against it.

---

## Required Frontmatter Fields

All six fields are required. A CONTEXT.md missing any field fails `arch-tools.js validate-context`.

| Field | Type | Required | Non-Empty | Description |
|-------|------|----------|-----------|-------------|
| `domain` | string | yes | yes (non-blank) | What kind of system: "event-driven multi-agent", "microservices", "reactive pipeline", etc. |
| `actors` | array of strings | yes | yes (min 1 item) | Human or system actors who interact with the system |
| `non-goals` | array of strings | yes | yes (min 1 item) | Explicit list of what the system does NOT do — MUST NOT be empty |
| `constraints` | array of strings | yes | yes (min 1 item) | Technical, operational, or organizational constraints |
| `scale` | object | yes | n/a (structured object) | System scale parameters — see nested structure below |
| `locked-decisions` | array of objects | yes | n/a (may be empty array) | Architectural decisions already made before design begins |

---

## Field Specifications

### `domain` — string, required, non-blank

**What it captures:** The architectural category of the system being designed. This field helps `arch-roadmapper` select appropriate design phases and `arch-planner` choose the right patterns.

**Format:** A short descriptive string. Should name the primary architectural style.

**Valid examples:**
```yaml
domain: "event-driven multi-agent"
domain: "microservices orchestration"
domain: "reactive data pipeline"
domain: "hierarchical multi-agent with shared state"
domain: "pub/sub coordination layer"
```

**Invalid examples:**
```yaml
domain: "software"          # Too vague — does not describe the system type
domain: "web application"   # Does not name the architectural style
domain: ""                  # Empty string — fails validation
```

**Validation rule:** `domain` must be a non-empty string (not `""` or whitespace-only).

---

### `actors` — array of strings, required, min 1 item

**What it captures:** The humans and external systems that interact with the system being designed. Actors are external to the system — they initiate interactions but are not part of the system's internal design.

**Format:** Each item is a short noun phrase naming the actor and optionally their role.

**Valid examples:**
```yaml
actors:
  - "Human Architect — initiates design runs via CLI"
  - "Claude API — executes all agent tasks"
  - "File System — shared state between agents"
  - "Development Team — consumes architecture output"
```

**Invalid examples:**
```yaml
actors: []          # Empty array — fails validation
actors:             # Missing items — parsed as null — fails validation
```

**Validation rule:** `actors` must be an array with at least 1 item.

---

### `non-goals` — array of strings, required, min 1 item

**What it captures:** Explicit statements of what the system does NOT do. This field is mandatory because every system has things it explicitly excludes — undocumented non-goals cause scope creep during design.

**Format:** Each item describes one thing the system deliberately excludes, with enough specificity to prevent re-adding it.

**Valid examples:**
```yaml
non-goals:
  - "Code generation — system produces specs, not implementations"
  - "Runtime validation — verification is structural, not behavioral"
  - "Infrastructure deployment design — unless it is a component of the agentic system"
  - "Database schema design — unless it is part of the agent state model"
  - "Web or chat interface — CLI-first interaction only"
```

**Invalid examples:**
```yaml
non-goals: []                     # Empty array — fails validation (always invalid)
non-goals:
  - "things we don't do"          # Too vague — not actionable
non-goals:
  - "everything else"             # Not specific — does not prevent scope creep
```

**Validation rule:** `non-goals` must be an array with at least 1 item. An empty `non-goals` list is ALWAYS invalid — if you cannot name what the system does not do, the scope is not defined.

---

### `constraints` — array of strings, required, min 1 item

**What it captures:** Hard limits that the architecture must honor. These are non-negotiable restrictions from platform, organizational, regulatory, or operational requirements.

**Constraints vs locked-decisions:** A constraint is something REQUIRED BY CONTEXT (e.g., "must run on existing Kubernetes cluster"). A locked-decision is something CHOSEN BY THE ARCHITECT (e.g., "use event sourcing for state management"). Both constrain the design, but for different reasons.

**Format:** Each item is a specific, measurable constraint. Vague constraints fail to guide design decisions.

**Valid examples:**
```yaml
constraints:
  - "Platform: Claude Code CLI only — no web interface, no separate server process"
  - "Model dependency: all agents execute as Claude API calls via claude-code"
  - "Zero external npm dependencies for core tooling in Phase 1"
  - "All output files must be human-readable markdown or YAML — no binary formats"
  - "STATE.md must survive context resets — no in-memory state"
```

**Invalid examples:**
```yaml
constraints: []               # Empty array — fails validation
constraints:
  - "be fast"                 # Not specific or measurable
  - "use good practices"      # Not a constraint — not actionable
  - "scalable"                # Vague adjective — fails to constrain design decisions
```

**Validation rule:** `constraints` must be an array with at least 1 item.

---

### `scale` — object, required

**What it captures:** System scale parameters that inform architecture decisions. Scale determines whether you need a single orchestrator, a distributed fanout pattern, or a pipeline with backpressure.

**Format:** Structured object with three sub-fields. Must be a YAML object, not a flat string.

**Nested structure:**
```yaml
scale:
  agents: integer or string    # Count or range (e.g., 5 or "10-20")
  throughput: string            # Rate measure (e.g., "1000 req/s", "10 designs/hour")
  latency: string              # Target latency (e.g., "< 200ms p99", "< 5 minutes per design phase")
```

**Sub-field descriptions:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `agents` | integer or string | Count of agents in the system. Use integer for exact count, string for range. |
| `throughput` | string | Rate at which the system processes work. Must include a unit. |
| `latency` | string | Target latency for the system's primary operation. Must include a unit and bound. |

**Valid examples:**
```yaml
scale:
  agents: 11
  throughput: "10 design runs per day"
  latency: "< 30 minutes per complete architecture package"
```

```yaml
scale:
  agents: "10-20"
  throughput: "1000 events/second per agent"
  latency: "< 200ms p99 event processing"
```

**Invalid examples:**
```yaml
scale: "large"          # String instead of object — fails validation
scale: large            # Same problem
scale:
  agents: "a few"       # Technically valid structure but poor content
scale: []               # Array instead of object — fails validation
```

**Validation rule:** `scale` must be a YAML object (not a string, not an array, not null). `validate-context` checks that `scale` is present and has object type. Sub-field content validation is deferred to Level 2 verification.

---

### `locked-decisions` — array of objects, required (may be empty)

**What it captures:** Architectural decisions the human architect has already made before the design pipeline begins. These decisions are non-negotiable — the design pipeline works within them, not around them.

**Format:** Array of objects. Each object has two required string fields: `decision` and `rationale`.

**Nested structure per item:**
```yaml
locked-decisions:
  - decision: string    # What was decided (noun phrase or short sentence)
    rationale: string   # Why this decision was made (reasoning)
```

**Valid examples:**
```yaml
locked-decisions:
  - decision: "Standalone system, not a GSD plugin mode"
    rationale: "Clean separation of concerns — architecture domain expertise should not pollute code-domain GSD"
  - decision: "Dual-format output (markdown + embedded YAML)"
    rationale: "Verification pipeline needs structured data; regex-on-prose is fragile for cross-reference checks"
  - decision: "Protocol-agnostic output — no MCP or A2A coupling"
    rationale: "MCP and A2A are moving targets; abstract schemas can be mapped later without redesign"
```

```yaml
locked-decisions: []    # Valid — no decisions locked at intake time
```

**Invalid examples:**
```yaml
locked-decisions:
  - "use event sourcing"    # String item, not object — missing rationale field
  - decision: "use Kafka"   # Missing rationale field
```

**Validation rule:** `locked-decisions` must be an array. It CAN be empty (unlike `non-goals`). If items are present, each must be an object (validate-context checks structure type; field-level validation is Level 2). Note: an empty `locked-decisions` is valid because a system can begin design with no pre-made architectural decisions.

---

## Required Body Sections

Every CONTEXT.md must contain these markdown sections in its body (after the YAML frontmatter). Section presence is validated at Level 2 verification by `arch-verifier`.

| Section Header | Required | Content Expectation |
|----------------|----------|---------------------|
| `## System Intent` | yes | Natural language description of what the system does, who it serves, and why it exists. Minimum 3 sentences. Must NOT contain "TBD" or "to be determined". |
| `## Actors` | yes | Expanded description of each actor from the frontmatter `actors` list. Each actor should have a paragraph explaining their role, what they initiate, and what they receive. |
| `## Non-Goals` | yes | Each non-goal from the frontmatter `non-goals` list explained in full. Must include the reasoning for excluding each item (why it is NOT in scope). |
| `## Constraints` | yes | Each constraint from the frontmatter `constraints` list explained with context. Must specify what design choices this rules out. |
| `## Scale` | yes | Explanation of the scale parameters with reasoning. Why these targets? What happens if they are exceeded? What architecture choices do they motivate? |
| `## Locked Decisions` | yes | Each locked decision from the frontmatter `locked-decisions` array with full rationale. If `locked-decisions` is empty, the section should state: "No decisions locked at intake — design pipeline has full latitude." |

**Section validation:** `arch-verifier` checks that all 6 sections are present in the document body. Section content depth is evaluated qualitatively during Level 2 verification.

---

## Validation Rules

`arch-tools.js validate-context <file>` enforces these rules:

| Check | Rule | Failure |
|-------|------|---------|
| Field presence | All 6 frontmatter fields must exist (not undefined/null) | Lists field in `missing_fields` |
| `domain` non-empty | Must be a non-empty string (not `""` or whitespace) | Listed in `empty_required_fields` |
| `actors` non-empty | Must be an array with >= 1 item | Listed in `empty_required_fields` |
| `non-goals` non-empty | Must be an array with >= 1 item | Listed in `empty_required_fields` |
| `constraints` non-empty | Must be an array with >= 1 item | Listed in `empty_required_fields` |
| `scale` type | Must be a YAML object (not string, not array) | Listed in `type_errors` |
| `locked-decisions` type | Must be an array (may be empty) | Listed in `type_errors` |

`validate-context` returns structured JSON:
```json
{
  "valid": false,
  "missing_fields": ["non-goals"],
  "empty_required_fields": ["actors"],
  "type_errors": [],
  "present_fields": ["domain", "constraints", "scale", "locked-decisions"],
  "file": "path/to/CONTEXT.md"
}
```

On success: `{ "valid": true, "missing_fields": [], "empty_required_fields": [], "type_errors": [], "present_fields": ["domain", "actors", "non-goals", "constraints", "scale", "locked-decisions"], "file": "..." }`

**Note on body section validation:** `validate-context` validates frontmatter only. Body section presence and content depth validation is performed by `arch-verifier` at Level 2 verification. This separation keeps `validate-context` fast and deterministic (programmatic check) while letting `arch-verifier` apply qualitative assessment.

---

## Complete Example CONTEXT.md

The following is a well-formed CONTEXT.md for a hypothetical task orchestration system. It serves as the reference format for `discuss-system`'s output.

```markdown
---
domain: "event-driven multi-agent task orchestration"
actors:
  - "Human Operator — submits task batches and monitors execution via CLI"
  - "External Task Queue (SQS) — delivers task payloads to the orchestrator"
  - "Downstream Services — consume task results via webhook or polling"
non-goals:
  - "Task scheduling — system processes tasks on demand, not on a schedule"
  - "Task deduplication — callers must ensure tasks are unique before submission"
  - "Human-in-the-loop approvals — all execution is fully automated"
  - "Long-running tasks over 10 minutes — designed for sub-minute task completion"
constraints:
  - "Platform: AWS Lambda + SQS — all compute must be serverless"
  - "Max 5 concurrent agents per task batch — Lambda concurrency limit"
  - "No persistent database — state lives in S3 objects and SQS message attributes"
  - "All inter-agent communication via SQS — no direct agent-to-agent HTTP calls"
scale:
  agents: "3-5"
  throughput: "500 tasks/minute at peak"
  latency: "< 30 seconds p99 per task"
locked-decisions:
  - decision: "Event sourcing for task state — all state transitions are events"
    rationale: "Enables replay for debugging and audit trail compliance requirement"
  - decision: "Idempotent agents — each agent must handle duplicate events safely"
    rationale: "SQS at-least-once delivery requires idempotent consumers"
---

## System Intent

The task orchestration system processes batches of work items submitted by human operators
or upstream services, routes each task to a specialized agent best suited to handle it,
tracks execution state as a sequence of immutable events, and delivers results to downstream
consumers via webhook or polling endpoint. The system is designed for high-throughput,
sub-minute task completion with full audit trails for every state transition. Correctness
guarantees are provided by idempotent agents and event sourcing rather than distributed
locks or consensus protocols.

## Actors

**Human Operator** submits task batches via the CLI, monitors execution dashboards, and
handles escalations when tasks fail beyond the retry limit. The operator has full visibility
into the event log but does not interact with individual agents directly.

**External Task Queue (SQS)** is the entry point for all tasks. It delivers task payloads
to the orchestrator and acts as the backpressure mechanism — Lambda concurrency limits the
processing rate naturally. The queue holds up to 24 hours of unprocessed tasks.

**Downstream Services** consume task results either by polling the results API or receiving
webhooks. They are external to the orchestration system and have no visibility into internal
agent state.

## Non-Goals

**Task scheduling** is excluded because scheduling adds state complexity (cron expressions,
timezone handling, missed-fire recovery) that is not needed for the current use case. Callers
who need scheduled execution should use EventBridge Scheduler upstream of this system.

**Task deduplication** is excluded to keep the system stateless at the queue boundary.
Downstream services that need exactly-once semantics must track their own idempotency keys.

**Human-in-the-loop approvals** are excluded because the system is designed for fully
automated batch processing. Approval workflows require a different UI contract and persistence
model that would significantly complicate the architecture.

**Long-running tasks over 10 minutes** are excluded due to Lambda's 15-minute execution
limit. Tasks that run longer should be broken into checkpointed sub-tasks before submission.

## Constraints

**AWS Lambda + SQS platform** rules out persistent in-process state, long-running threads,
and direct TCP connections between agents. Every component must start from cold and complete
within Lambda's execution window.

**Max 5 concurrent agents per task batch** is a hard limit driven by Lambda reserved
concurrency allocation. The orchestrator must not schedule more than 5 parallel agent
executions per batch to avoid throttling downstream Lambdas.

**No persistent database** rules out relational or document databases as primary state
stores. All state must be reconstructable from S3 event logs. This also rules out any
architecture that needs joins across agent outputs.

**SQS-only inter-agent communication** prevents direct agent-to-agent HTTP calls, which
would create hidden coupling and circumvent the event log. Every state transition must
produce an SQS message that lands in the event log.

## Scale

The system targets 500 tasks per minute at peak throughput, driven by the largest expected
batch size (30,000 tasks over a 60-minute processing window). At 3-5 agents per task, this
requires Lambda concurrency headroom for 1,500-2,500 concurrent executions during peak.
The 30-second p99 latency target accommodates the typical sub-10-second agent execution
time plus SQS delivery latency and Lambda cold-start overhead.

## Locked Decisions

**Event sourcing for task state** was chosen because the system must produce audit trails
for compliance. Every state transition (TaskReceived, AgentAssigned, TaskCompleted,
TaskFailed) is appended to an immutable S3 event log. This enables replay for debugging
without requiring a separate audit database.

**Idempotent agents** were mandated by SQS at-least-once delivery semantics. Every agent
must check whether its output already exists before writing it, so duplicate SQS messages
do not produce duplicate task executions. This rules out any agent design that uses
auto-increment counters or generates non-deterministic IDs.
```

---

## Anti-Patterns

These patterns are invalid and will fail `validate-context` or Level 2 verification.

### Anti-Pattern 1: Empty non-goals

```yaml
non-goals: []
```

**Why invalid:** Every system has things it explicitly does NOT do. An empty `non-goals` list means the scope has not been defined. This causes scope creep during design — `arch-planner` will make decisions about what to include that should have been made explicit at intake.

**Fix:** List at least one thing the system does not do, with reasoning.

---

### Anti-Pattern 2: Vague domain

```yaml
domain: "software"
```

**Why invalid:** Does not describe the system type. `arch-roadmapper` uses `domain` to select appropriate design phases. A vague domain produces a generic design instead of one tailored to the architectural style.

**Fix:** Describe the architectural category: `"event-driven multi-agent"`, `"microservices with saga pattern"`, `"reactive data pipeline"`.

---

### Anti-Pattern 3: Vague constraints

```yaml
constraints:
  - "be fast"
  - "be reliable"
  - "scalable"
```

**Why invalid:** These are adjectives, not constraints. They do not rule out any design decision. A constraint must be specific enough that it says "therefore we cannot use X" or "therefore we must use Y".

**Fix:** `"< 200ms p99 response time for all API endpoints"` or `"must survive a single availability zone failure"`.

---

### Anti-Pattern 4: Flat string for scale

```yaml
scale: "large"
```

**Why invalid:** `scale` must be a structured object so `validate-context` and `arch-planner` can reason about specific parameters. A flat string cannot be parsed programmatically.

**Fix:**
```yaml
scale:
  agents: 50
  throughput: "10,000 events/second"
  latency: "< 100ms p99"
```

---

### Anti-Pattern 5: locked-decisions with string items

```yaml
locked-decisions:
  - "use event sourcing"
  - "use Kafka"
```

**Why invalid:** String items in `locked-decisions` lose the rationale. Without rationale, `arch-planner` cannot know if a decision is truly locked or if it can be revisited.

**Fix:**
```yaml
locked-decisions:
  - decision: "use event sourcing"
    rationale: "Required for compliance audit trail — non-negotiable"
  - decision: "use Kafka"
    rationale: "Organization has existing Kafka ops expertise; switching to SQS would require retraining"
```

---

### Anti-Pattern 6: Missing non-goals section in body

A CONTEXT.md that has `non-goals` frontmatter but no `## Non-Goals` section in the body fails Level 2 verification. The frontmatter list provides machine-checkable values; the body section provides human-readable reasoning.

---

## Relationship to validate-context

`arch-tools.js validate-context <file>` implements the validation rules in the "Validation Rules" section above. It checks:

1. All 6 frontmatter fields are present
2. `domain`, `actors`, `non-goals`, and `constraints` are non-empty (string non-blank, arrays have >= 1 item)
3. `scale` is a YAML object
4. `locked-decisions` is an array

`validate-context` does NOT check:
- Body section presence (Level 2 — `arch-verifier`)
- Content quality of any field (Level 2 — `arch-verifier`)
- Cross-references to other documents (Level 3 — `arch-integrator`)
- Internal consistency of decisions vs constraints (Level 4 — `arch-verifier` with YAML graph traversal)

---

## Cross-References

- Schema enforced by: `bin/arch-tools.js` via the `validate-context` command
- Schema produced by: `agents/discuss-system.md` (Phase 2)
- Schema consumed by: `agents/arch-roadmapper.md`, `agents/arch-planner.md`, `agents/context-engineer.md`
- Level 2+ validation performed by: `agents/arch-verifier.md`
- Naming conventions for field values: `references/naming-conventions.md` (agent names in actors follow kebab-case; event names follow PascalCase)
