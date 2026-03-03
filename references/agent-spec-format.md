# Agent Specification Format — Reference

**Referenced by:** arch-executor (writer), arch-checker (reviewer), arch-verifier (validator)
**Purpose:** Canonical definition of what a COMPLETE agent specification requires. This
document is the rubric that arch-checker uses to determine whether an agent spec is
substantive or a stub. Every requirement here is verifiable.

**Related:** See `templates/agent-spec.md` for the scaffold format that arch-executor fills in.
**Naming rules:** See `references/naming-conventions.md` for kebab-case agent name rules.

---

## Required Frontmatter Fields

Every agent spec MUST have all five frontmatter fields. Missing any field is an automatic
Level 1 verification failure.

| Field | Type | Constraints | Example |
|-------|------|-------------|---------|
| `name` | string | kebab-case, matches filename without `.md`, pattern: `^[a-z][a-z0-9-]*$` | `arch-executor` |
| `description` | string | One sentence. Must state what the agent does AND when it is spawned. Max 200 chars. | `"Writes design documents for a single phase task. Spawned by execute-phase per task."` |
| `tools` | array | Comma-separated. Must list every tool the agent body references. At minimum: `Read`. | `Read, Write, Bash` |
| `model` | string | One of: `opus`, `sonnet`, `haiku`. Must match the model profile for this agent's role. | `sonnet` |
| `color` | string | Any CSS color name or hex. Used for display differentiation only. | `blue` |

**INCOMPLETE frontmatter example:**
```yaml
---
name: arch-executor
description: "Executes tasks"  # INCOMPLETE: does not state when spawned
tools: Read                     # INCOMPLETE: if body uses Write and Bash
model: sonnet
# MISSING: color field
---
```

**COMPLETE frontmatter example:**
```yaml
---
name: arch-executor
description: "Writes design documents for a single architecture phase task. Spawned by /AAA:execute-phase for each task in a phase plan."
tools: Read, Write, Bash
model: sonnet
color: blue
---
```

---

## Required Body Sections

The agent spec body must contain exactly these 7 sections in this order. Sections out of order
are permitted but flagged as a style issue. Missing sections are a Level 2 verification failure.

### 1. ## Role

**Required:** Yes
**Minimum content:** 3 sentences
**Must state ALL of:**
- WHO spawns this agent (which orchestrator, workflow, or agent invokes it)
- WHAT this agent's primary job is (one concrete, observable outcome)
- WHAT this agent's output domain is (what artifacts it produces and where)

**Banned phrases:** `TBD`, `to be determined`, `handles gracefully`, `as needed`,
`manages the`, `oversees the`, `coordinates the`

**INCOMPLETE example (FAILS verification):**
```markdown
## Role
This agent handles the design phase execution. It manages the process gracefully
and coordinates with other agents as needed.
```
Why it fails: "handles", "manages gracefully", "as needed" are banned. Does not state
who spawns it. Does not state what artifacts it produces. Fewer than 3 meaningful sentences.

**COMPLETE example (PASSES verification):**
```markdown
## Role
Spawned by /AAA:execute-phase for each task in a phase plan after the plan has
been approved by arch-planner. This agent reads a single task's specification from the
phase plan and writes one or more architecture documents to the design/ directory — agent
specs, event schemas, or failure mode catalogs depending on the task type. Output goes
to design/{phase-name}/{document-name}.md or .yaml; the path is determined by the task
specification and returned to the orchestrator in the structured JSON result.
```

---

### 2. ## Upstream Input

**Required:** Yes
**Minimum content:** 2 items
**Format per item:** `"Reads [artifact] from [path] -- uses [section/field] for [purpose]"`
**Must list ALL files and artifacts the agent reads.** Vague inputs like "reads context"
without specifying path and section are incomplete.

**Banned patterns:** inputs without path, inputs without stating which section is used,
grouping multiple distinct inputs into one item ("reads all reference files")

**INCOMPLETE example (FAILS verification):**
```markdown
## Upstream Input
Reads the plan file and reference documents.
```
Why it fails: No paths. No section specificity. One item when multiple inputs exist.

**COMPLETE example (PASSES verification):**
```markdown
## Upstream Input
- Reads phase plan from `.planning/phases/{NN}-{name}/{NN}-{plan}-PLAN.md` -- uses
  `<tasks>` block for step-by-step execution instructions and task file paths.
- Reads agent spec format from `references/agent-spec-format.md` -- uses
  "Required Sections" table as the rubric for what to include in each section.
- Reads existing agent stubs from `agents/{agent-name}.md` (if exists) -- uses
  frontmatter to preserve name/model/tools fields and replaces the body only.
```

---

### 3. ## Downstream Consumer

**Required:** Yes
**Minimum content:** 1 item
**Format per item:** `"[Consumer] reads [path] -- uses [section] for [purpose]"`
**Must identify ALL downstream consumers** of this agent's primary outputs.

**Banned patterns:** "orchestrator uses output", "result is consumed by the system",
consumers without specifying which section they use

**COMPLETE example:**
```markdown
## Downstream Consumer
- arch-checker reads `design/agents/{agent-name}.md` -- uses every section header
  and content to verify completeness against `references/agent-spec-format.md`.
- arch-verifier reads `design/agents/{agent-name}.md` -- uses frontmatter `name:`
  and body event references to validate cross-references against events.yaml.
```

---

### 4. ## Execution Flow

**Required:** Yes
**Minimum content:** 4 numbered steps
**Each step must be a CONCRETE action** mapping to an actual tool invocation or decision.

Valid step types:
- File read: `Read @path/to/file`
- Tool call: `Bash: node bin/arch-tools.js validate-names design/agents/X.md`
- Decision: `If [condition] → [branch A]; else → [branch B]`
- File write: `Write to design/agents/{name}.md`
- Return: `Return JSON { status: ..., output: ... } to orchestrator`

**Banned step patterns:** "processes the data", "analyzes the input", "handles the
request", "performs verification", "generates output" — any step that does not
specify what tool is called and on what artifact

**INCOMPLETE example (FAILS verification):**
```markdown
## Execution Flow
1. Read the relevant input files
2. Analyze the context and plan
3. Generate the appropriate output
4. Return results to orchestrator
```

**COMPLETE example (PASSES verification):**
```markdown
## Execution Flow
1. Read @.planning/phases/{NN}-{name}/{NN}-{plan}-PLAN.md and extract the
   `<tasks>` block — find the task whose `<name>` matches the task argument.
2. Read @references/agent-spec-format.md to load Required Sections table and
   COMPLETE/INCOMPLETE examples for each section.
3. Read @agents/{agent-name}.md (stub) to extract frontmatter fields; preserve
   name, model, tools, color from stub — only replace body content.
4. Write the complete agent spec to design/agents/{agent-name}.md following the
   template structure from templates/agent-spec.md with all 7 sections populated.
5. Run: `node bin/arch-tools.js detect-stubs design/agents/{agent-name}.md` —
   if stubs_found > 0, iterate on the flagged sections before returning.
6. Return `{ "status": "complete", "output": "design/agents/{agent-name}.md",
   "sections_written": [...], "gaps": [] }` to orchestrator.
```

---

### 5. ## Structured Returns

**Required:** Yes
**Must include:** `status` field (one of: `passed`, `gaps_found`, `human_needed`,
`complete`, `failed`)
**Must include:** output path(s) for all artifacts written
**Must be literal JSON** — not described in prose

**Banned returns:** prose-only returns, returns without status field, status values
outside the allowed set

**COMPLETE example:**
```markdown
## Structured Returns

```json
{
  "status": "complete | gaps_found | human_needed | failed",
  "output": "design/agents/{agent-name}.md",
  "sections_written": ["Role", "Upstream Input", "Downstream Consumer",
                       "Execution Flow", "Structured Returns",
                       "Failure Modes", "Constraints"],
  "gaps": [],
  "message": "Agent spec written. All 7 sections populated. No stubs detected."
}
```
```

---

### 6. ## Failure Modes

**Required:** Yes
**Minimum content:** 3 named failure modes
**Each failure mode must have ALL 5 fields:**
1. Trigger (specific condition, not "if something goes wrong")
2. Manifestation (observable behavior)
3. Severity (critical | high | medium | low)
4. Recovery (Immediate action + Escalation path — both concrete)
5. Detection (how to detect programmatically or observationally)

**Banned in Recovery:** `handles gracefully`, `escalates as needed`,
`retries appropriately`, `manages the error`, `falls back gracefully`

---

### 7. ## Constraints

**Required:** Yes
**Minimum content:** 2 hard limits
**Must be enforceable** — not guidelines or preferences

Examples of valid constraints:
- "Must not write to any path outside `design/{phase-name}/`"
- "Context budget: max 80K tokens per execution. If exceeded, return `status=human_needed`."
- "Must not invoke arch-checker or arch-verifier directly — that is the orchestrator's role."

Examples of invalid constraints (too vague):
- "Should be efficient"
- "Avoid unnecessary work"
- "Operate within normal parameters"

---

## Anti-Patterns

These patterns appear frequently in incomplete agent specs. All are flagged by arch-checker.

1. **Vague Role description** — "This agent manages the design process" — does not state
   who spawns it or what artifacts it produces.

2. **Prose-only Structured Returns** — "Returns a summary of the work done" — no JSON
   structure, no status field, no output path.

3. **Missing Upstream/Downstream links** — Inputs listed without paths, consumers listed
   without specifying which section they read and why.

4. **"Handles gracefully" recovery** — Explicitly banned in Failure Modes. Replace with
   specific Immediate + Escalation actions.

5. **Generic failure modes** — "Network error", "unexpected input" — too vague to be
   actionable. Failure modes must be component-specific.

6. **Steps without tool calls** — "Analyzes the context" — does not map to a tool
   invocation. Replace with "Read @path/to/context.md, extract [field]."

7. **Wrong status values** — Returning `"success"` instead of `"complete"`, or
   `"error"` instead of `"failed"`. Use only the five allowed status values.

---

## Verification Levels Applied to Agent Specs

| Level | Check | Pass Condition |
|-------|-------|----------------|
| Level 1 | File exists | `agents/{name}.md` exists at expected path |
| Level 2 | Substantive | All 5 frontmatter fields present; all 7 body sections present; no stub phrases detected; line count >= 50 |
| Level 3 | Cross-referenced | Agent name referenced in at least one workflow or orchestration doc; events in spec resolve against `events.yaml` |
| Level 4 | Internally consistent | Agent name matches filename; all event references are declared producers/consumers; no circular dependencies |
