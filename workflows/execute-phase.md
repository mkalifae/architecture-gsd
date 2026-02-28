---
description: Execute a design phase
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
argument-hint: "[phase-number]"
---

<purpose>
Execute a design phase of Architecture GSD. Given a phase number, coordinate the full
pipeline: run arch-researcher (if no RESEARCH.md exists), run arch-roadmapper (if no
ROADMAP.md exists), enter the arch-planner + arch-checker bounded revision loop (max 3
iterations), then spawn arch-executor agents in parallel per wave assignment. Updates
STATE.md after every plan completion. This workflow is the single entry point for
progressing through design phases — the human runs `/arch-gsd:execute-phase N` and the
pipeline produces design documents autonomously.

Context discipline: The orchestrator must stay lean. Do NOT read full design documents in
the orchestrator context. Pass file paths to subagents — they read the files in their own
fresh 200K context windows. The orchestrator's context budget is ~15% maximum. If you need
to check a document's content, read only the first 10 lines or run detect-stubs rather than
reading the full file.
</purpose>

<process>

## Step 1: Initialize and Orient

Extract the phase number from $ARGUMENTS. If $ARGUMENTS is empty, display:

  "Usage: /arch-gsd:execute-phase [phase-number]
  Example: /arch-gsd:execute-phase 1"

And stop.

Read .arch/STATE.md to understand current position and accumulated decisions. Keep the
read focused — extract: Current Position, Last activity, and any relevant Decisions sections.
Do NOT read large design documents into orchestrator context.

Read .arch/CONTEXT.md (first 20 lines only — frontmatter fields are sufficient):

  Bash: head -20 .arch/CONTEXT.md

Validate both files exist:

- If .arch/STATE.md does not exist: display "STATE.md not found. Run /arch-gsd:new-system
  first to initialize the project." and stop.
- If .arch/CONTEXT.md does not exist: display "No CONTEXT.md found. Run /arch-gsd:new-system
  first to initialize the project." and stop.

## Step 2: Check Prerequisites

**Check for RESEARCH.md:**

  Bash: ls .arch/RESEARCH.md 2>/dev/null && echo "exists" || echo "missing"

If missing:
  Display: "No RESEARCH.md found — spawning arch-researcher..."

  Spawn arch-researcher via Task():
    model: "sonnet"
    prompt: |
      Read agents/arch-researcher.md for your complete execution instructions.
      System context file: .arch/CONTEXT.md
      Produce output file: .arch/RESEARCH.md
      Follow your execution_flow exactly and return structured status JSON.

  Wait for completion. Parse return. If status is "failed": display the error message and
  stop execution.

**Check for ROADMAP.md:**

  Bash: ls .arch/ROADMAP.md 2>/dev/null && echo "exists" || echo "missing"

If missing:
  Display: "No ROADMAP.md found — spawning arch-roadmapper..."

  Spawn arch-roadmapper via Task():
    model: "opus"
    prompt: |
      Read agents/arch-roadmapper.md for your complete execution instructions.
      System context file: .arch/CONTEXT.md
      Research file: .arch/RESEARCH.md
      Produce output file: .arch/ROADMAP.md
      Follow your execution_flow exactly and return structured status JSON.

  Wait for completion. Parse return. If status is "failed": display the error message and
  stop execution.

If both RESEARCH.md and ROADMAP.md already exist, skip this step entirely.

## Step 3: Locate Phase in Roadmap

Read .arch/ROADMAP.md. Find the phase entry matching the requested phase number. Extract:
phase name, goal, success criteria, requirements list, and artifact list.

If the requested phase number is not found in ROADMAP.md:

  Display:
  "Phase {N} not found in ROADMAP.md.
  Available phases: {list all phase numbers and names from ROADMAP.md}
  Check ROADMAP.md for the correct phase number and re-run."
  Stop.

Derive the phase slug from the phase name:
  - Lowercase all characters
  - Replace spaces and underscores with hyphens
  - Example: "Context and Roadmap" → "context-and-roadmap"

Display to human:
  "Executing Phase {N}: {phase_name}
  Goal: {goal}
  Artifacts: {count} design documents"

## Step 4: Create Phase Directory

Create the phase working directory if it does not exist:

  Bash: mkdir -p .arch/phases/{phase-slug}

No files are written to this directory by the orchestrator — arch-planner will populate it
with PLAN.md files.

## Step 5: Run arch-planner

Display: "Spawning arch-planner for Phase {N}: {phase_name}..."

Spawn arch-planner via Task():
  model: "sonnet"
  prompt: |
    Read agents/arch-planner.md for your complete execution instructions.
    Phase: {N} — {phase_name}
    Phase goal: {goal}
    Phase success criteria: {success_criteria}
    Phase requirements: {requirements_list}
    Phase artifacts: {artifact_list}
    ROADMAP path: .arch/ROADMAP.md
    CONTEXT path: .arch/CONTEXT.md
    RESEARCH path: .arch/RESEARCH.md
    Phase directory: .arch/phases/{phase-slug}/
    Produce PLAN.md files in the phase directory. Return structured status JSON.

Wait for completion. Parse return.

If status is "failed": display the error and stop. Do not proceed to Step 6.
If status is "complete": continue to Step 6 with the list of PLAN.md files created.

## Step 6: Run arch-checker (Bounded Revision Loop)

Display: "Running arch-checker to validate plans..."

```
iteration = 0
max_iterations = 3

while iteration < max_iterations:

  Spawn arch-checker via Task():
    model: "haiku"
    prompt: |
      Read agents/arch-checker.md for your complete execution instructions.
      Phase directory: .arch/phases/{phase-slug}/
      ROADMAP path: .arch/ROADMAP.md
      CONTEXT path: .arch/CONTEXT.md
      Check all PLAN.md files in the phase directory for quality issues.
      Return structured status JSON with any issues found.

  Wait for completion. Parse return.

  if status == "passed":
    Display: "Plans approved by arch-checker (iteration {iteration+1})"
    Break out of loop — proceed to Step 7.

  if status == "issues_found":
    issues_list = extract issues from arch-checker return
    iteration += 1

    if iteration >= max_iterations:
      # ESCALATION — do NOT silently proceed to plan execution
      Display structured gap report to human:

      "arch-checker found unresolved issues after {max_iterations} revision iterations.
      STOPPING execution — human review required before proceeding.

      Unresolved issues:
      {For each issue, format as:}
        Plan: {plan_name}
        Dimension: {dimension}
        Severity: {severity}
        Issue: {description}
        Fix hint: {fix_hint}

      To continue:
        1. Review the flagged PLAN.md files in .arch/phases/{phase-slug}/
        2. Manually fix the issues described above
        3. Re-run /arch-gsd:execute-phase {N}"

      STOP. Do not proceed to Step 7.

    # Not yet at max — re-invoke arch-planner in REVISION MODE
    Display: "arch-checker found issues (iteration {iteration}/{max_iterations}) — re-running arch-planner in revision mode..."

    Spawn arch-planner via Task():
      model: "sonnet"
      prompt: |
        Read agents/arch-planner.md for your complete execution instructions.
        REVISION MODE — make targeted updates only. Do not rewrite entire plans.
        Issues from arch-checker that require fixes:
        {Format each issue as YAML:}
        - plan: {plan_name}
          dimension: {dimension}
          severity: {severity}
          description: {description}
          fix_hint: {fix_hint}
        Phase directory: .arch/phases/{phase-slug}/
        ROADMAP path: .arch/ROADMAP.md
        CONTEXT path: .arch/CONTEXT.md
        Fix only the flagged issues. Return structured status JSON.

    Wait for completion. If status is "failed": display error and stop.
    Continue loop.
```

## Step 7: Execute Plans by Wave

Read all PLAN.md files from the phase directory:

  Bash: ls .arch/phases/{phase-slug}/*.md 2>/dev/null

For each PLAN.md file, extract the wave assignment from its frontmatter:

  Bash: node bin/arch-tools.js frontmatter get .arch/phases/{phase-slug}/{plan-file} --field wave

Group plans by wave number (ascending). Plans with no wave frontmatter field default to
wave 1.

For each wave (in ascending order):
  Display: "Wave {W}: Executing {count} plans in parallel..."

  Spawn one arch-executor agent per plan in this wave, all simultaneously via Task():
  (Do not wait for wave N to complete before spawning wave N tasks — spawn all N tasks at once)

    For each plan file in this wave:
      Spawn arch-executor via Task():
        model: "sonnet"
        prompt: |
          Read agents/arch-executor.md for your complete execution instructions.
          Execute plan: .arch/phases/{phase-slug}/{plan-filename}
          CONTEXT path: .arch/CONTEXT.md
          RESEARCH path: .arch/RESEARCH.md

          Reference spec paths (domain guidance for specialized output types):
          - Agent spec format: @references/agent-spec-format.md
          - Agent spec template: @templates/agent-spec.md
          - Event schema template: @templates/event-schema.yaml
          - Failure modes template: @templates/failure-modes.md
          - Context engineer spec: @agents/context-engineer.md
          - Schema designer spec: @agents/schema-designer.md
          - Failure analyst spec: @agents/failure-analyst.md

          After writing each output document, validate:
            node bin/arch-tools.js detect-stubs {output_file}
            node bin/arch-tools.js validate-names {output_file}
          Return structured status JSON.

  Wait for ALL arch-executor agents in this wave to complete before starting the next wave.

  For each completed arch-executor agent in this wave:
    Parse return status:

    If status is "human_needed" (deviation Rule 4 — architectural scope change required):
      Display the full error context from the return and STOP.
      "arch-executor halted on plan {plan_name}: {reason}
      Human decision required before execution can continue.
      {details from return}"
      Stop all further wave execution.

    If status is "gaps_found":
      Record the plan name and gaps list. Continue with remaining plans.
      (Gaps are reported at the end — they do not block other plans.)

    If status is "failed":
      Display: "Plan {plan_name} failed: {error}"
      Mark the plan as failed. Continue with remaining plans in this wave.

    If status is "complete":
      Record the plan name, output files produced, and any auto_flagged items.

  Spot-check 1-2 completed documents from this wave (keep orchestrator context lean):

    Bash: node bin/arch-tools.js detect-stubs {first_output_file}

  Display: "Wave {W} complete. {success_count}/{total_count} plans succeeded."

Proceed to next wave. Repeat until all waves are done.

## Step 8: Handle Deviation Flags

After all waves complete, collect results:

**Auto-flagged items** (minor issues auto-resolved by arch-executor, warrant review):

If any arch-executor returns included auto_flagged items:
  Display:
  "arch-executor auto-flagged {count} items during execution:
  {For each item:}
    Plan: {plan_name} — {auto_flag_description}
  These were addressed during execution but warrant review."

**Gaps** (issues that could not be resolved automatically):

If any plans returned status "gaps_found":
  Display:
  "Gaps detected in {count} plan(s):
  {For each gap:}
    Plan: {plan_name}
    Gap: {gap_description}
  Consider running /arch-gsd:execute-phase {N} --gaps to close them."

If no auto-flagged items and no gaps: no deviation report needed.

## Step 9: Update STATE.md

Read current .arch/STATE.md using the Read tool.

Update the following sections:

**Current Position:**
  Phase: {N} ({phase_name})
  Plan: All plans complete
  Status: "Phase {N} complete" (if no gaps/failures) or "Phase {N} partially complete" (if gaps or failures)
  Last activity: {YYYY-MM-DD} — "Phase {N} executed: {total_count} plans, {success_count} complete"

**Session Continuity:**
  Last session: {YYYY-MM-DD}
  Stopped at: Phase {N} execution complete
  Resume with: /arch-gsd:execute-phase {N+1} (after /clear for fresh context)

**Decisions:** Append any new locked decisions discovered or confirmed during execution.
Each entry formatted as:
  - [Phase {N}]: {decision_summary}

**100-line limit enforcement:** Count lines in the updated STATE.md. If the total exceeds
100 lines, remove the oldest decision entries from the Decisions section until the total is
at or below 100 lines. Preserve all Current Position, Session Continuity, and recent
decisions (last 10). Trim oldest decisions first.

Write the updated .arch/STATE.md using the Write tool with all sections updated.

Commit the updated STATE.md:
  Bash: git add .arch/STATE.md && git commit -m "docs: update STATE.md after phase {N} execution"

## Step 10: Report and Next Steps

Display completion report to the human:

```
Phase {N}: {phase_name} — {status}

Plans executed: {total_count}
  Complete: {success_count}
  Gaps:     {gap_count}
  Failed:   {failed_count}

Artifacts produced:
  {For each completed plan, list each output document written:}
  - {document_path}

{If gaps exist:}
Gaps detected:
  {list gap summaries}

{If failures exist:}
Failed plans:
  {list plan names with error summaries}

Next: /arch-gsd:execute-phase {N+1} (after /clear for fresh context)
{If gaps:}
Or: /arch-gsd:execute-phase {N} --gaps to close detected gaps
```

---

## Specialized Agent Role Clarification

**context-engineer, schema-designer, and failure-analyst are NOT directly spawned by
execute-phase.** They are reference specs consumed by arch-executor.

When arch-planner assigns a task to produce events.yaml, arch-executor reads
`agents/schema-designer.md` as domain guidance for how to produce that document (typing
rules, derivation logic, naming conventions). When assigned a CONTEXT-FLOWS.md task,
arch-executor reads `agents/context-engineer.md` for bottleneck analysis methodology.
When assigned a FAILURE-MODES.md task, arch-executor reads `agents/failure-analyst.md`
for cataloging structure and constraint enforcement rules.

The execute-phase workflow passes these spec paths to arch-executor in the Task() prompt
(Step 7) as part of the references list. This design keeps the orchestrator lean while
giving arch-executor domain-specific production guidance appropriate to the output type.
The orchestrator does NOT read these specs — it only passes their paths.

</process>
