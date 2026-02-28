---
name: [kebab-case-agent-name]
description: "[One sentence: what this agent does and when to spawn it]"
tools: [Read, Write, Bash]
model: sonnet
color: blue
---

<!-- TEMPLATE: agent-spec.md
     Used by: arch-executor (writer), arch-checker (reviewer), arch-verifier (validator)
     Purpose: Scaffold for agent contract documents. Every section below has
              content expectations encoded as HTML comments — these are the
              verification rules that arch-checker uses to determine whether
              a section is "substantive" vs "stub".
     Reference: See references/agent-spec-format.md for complete vs incomplete examples.
-->

# [Agent Display Name] — Agent Specification

## Role
<!-- REQUIRED SECTION
     min_lines: 3 (not counting this comment)
     min_sentences: 3
     Must state ALL of:
       1. Who spawns this agent (which orchestrator or workflow)
       2. What this agent's primary job is (one concrete outcome)
       3. What this agent's output domain is (what artifacts it produces)
     BANNED phrases: "TBD", "handles gracefully", "as needed", "will be defined",
                     "to be determined", "manages the", "oversees the"
     GOOD example: "Spawned by /arch-gsd:execute-phase when a design phase is ready
     for execution. This agent reads the phase plan, writes architecture documents
     for each task, and returns a structured JSON result to the orchestrator. Output
     domain is design documents in the project's design/ directory."
     BAD example: "This agent handles the design phase. It manages gracefully."
-->

[Role description: 3+ sentences covering who spawns, what job, what output domain]

## Upstream Input
<!-- REQUIRED SECTION
     min_items: 2
     Format for each input: "Reads [artifact] from [path] -- uses [section] for [purpose]"
     Must list ALL files and artifacts this agent reads.
     Must be specific about which section/field is used for which purpose.
     BANNED: vague inputs like "reads context", "takes input from orchestrator"
     GOOD example: "Reads phase plan from .planning/phases/{NN}-{name}/{NN}-{plan}-PLAN.md
     -- uses <tasks> block for step-by-step execution instructions."
     BAD example: "Reads the context files."
-->

- Reads [artifact name] from [path/to/file] -- uses [specific section] for [specific purpose]
- Reads [artifact name] from [path/to/file] -- uses [specific section] for [specific purpose]

## Downstream Consumer
<!-- REQUIRED SECTION
     min_items: 1
     Format for each consumer: "[Consumer name] reads [path] -- uses [section] for [purpose]"
     Must identify ALL downstream consumers of this agent's output.
     Must be specific about what they use and why.
     BANNED: "orchestrator uses output", "result is consumed by system"
     GOOD example: "arch-checker reads design/agents/{agent-name}.md -- uses ## Failure Modes
     section to verify recovery actions are concrete and not vague."
     BAD example: "The output is used by downstream agents."
-->

- [Consumer agent or workflow] reads [path/to/output] -- uses [section/field] for [purpose]

## Execution Flow
<!-- REQUIRED SECTION
     min_steps: 4
     Each step must be a CONCRETE action, not a vague description.
     Concrete means: specifies a file read, tool call, decision point, or file write.
     Steps must map to actual tool invocations (Read, Write, Bash, Task).
     BANNED vague steps: "processes the data", "analyzes the input", "handles the request",
                         "performs verification", "generates output"
     GOOD step example: "2. Read @references/agent-spec-format.md to load the Required Sections
     list and Complete/Incomplete examples."
     BAD step example: "2. Review the relevant reference documents."
     Include: file reads (step N), tool calls (step N), decision points (step N: if X then Y),
              file writes (step N), return format (last step)
-->

1. [Concrete first step — typically reading a plan or context file]
2. [Concrete second step — reading a reference document or previous design artifact]
3. [Concrete third step — producing or transforming an artifact]
4. [Concrete fourth step — writing output to disk at a specified path]
5. [Final step — returning structured JSON result to orchestrator]

## Structured Returns
<!-- REQUIRED SECTION
     Must define the EXACT JSON format returned to the orchestrator.
     Must include: status field (required values: passed | gaps_found | human_needed | complete | failed)
     Must include: output path(s) for all artifacts written
     NO prose-only returns. JSON structure must be literal (not described in words).
     BANNED: "returns a summary", "outputs the result", "provides feedback"
     GOOD example:
       {
         "status": "complete",
         "output": "design/agents/arch-executor.md",
         "sections_written": ["Role", "Upstream Input", "Execution Flow"],
         "gaps": []
       }
     BAD example: "Returns a JSON object indicating whether the task was successful."
-->

```json
{
  "status": "complete | gaps_found | human_needed | failed",
  "output": "[path/to/primary/output]",
  "gaps": ["[specific gap description if status is gaps_found]"],
  "message": "[human-readable summary for orchestrator display]"
}
```

## Failure Modes
<!-- REQUIRED SECTION
     min_modes: 3
     Each failure mode must have ALL of:
       - Trigger: specific condition that causes this failure (not "if something goes wrong")
       - Manifestation: observable behavior (what the agent does or fails to do)
       - Severity: one of critical | high | medium | low
       - Recovery: concrete action (not vague — see banned phrases)
         - Immediate: action taken within current execution (0-5 seconds)
         - Escalation: if immediate recovery fails, what happens next
       - Detection: how to detect this failure (programmatic or observational)
     BANNED in Recovery field: "handles gracefully", "escalates as needed",
                               "retries appropriately", "manages the error",
                               "falls back gracefully", "notifies the system"
     GOOD recovery: "Immediate: write partial output to disk with status=failed.
     Escalation: return { status: 'failed', error: 'context_window_exceeded',
     output: null } to orchestrator."
     BAD recovery: "Handles the error gracefully and retries as needed."
     GOOD trigger: "Input plan file does not exist at expected path when agent starts"
     BAD trigger: "If there is a problem with the input"
-->

### [FM-001]: [Short descriptive failure name]

**Trigger:** [Specific condition that causes this failure — not vague]
**Manifestation:** [Observable behavior — what happens or does not happen]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action in 0-5 seconds]
- Escalation: [If immediate fails, concrete next step]
**Detection:** [How to detect programmatically or observationally]

### [FM-002]: [Short descriptive failure name]

**Trigger:** [Specific condition]
**Manifestation:** [Observable behavior]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action]
- Escalation: [Concrete next step]
**Detection:** [Detection method]

### [FM-003]: [Short descriptive failure name]

**Trigger:** [Specific condition]
**Manifestation:** [Observable behavior]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action]
- Escalation: [Concrete next step]
**Detection:** [Detection method]

## Constraints
<!-- REQUIRED SECTION
     min_constraints: 2
     Hard limits on this agent's behavior — not guidelines.
     Examples of valid constraints: max context window usage, forbidden tools,
     scope boundaries, maximum output file size, forbidden operations.
     BANNED vague constraints: "should be efficient", "avoid unnecessary work",
                               "operate within normal parameters"
     GOOD constraints:
       - "Must not write to any path outside design/{phase-name}/ directory"
       - "Context budget: maximum 80K tokens per execution. If plan requires more,
          split execution and return status=human_needed."
     BAD constraints: "Should operate efficiently within context limits."
-->

- [Hard constraint 1: specific, measurable, enforceable]
- [Hard constraint 2: specific, measurable, enforceable]
