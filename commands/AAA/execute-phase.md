---
description: Execute a design phase
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
argument-hint: "[phase-number]"
---

<purpose>
Execute the plans for a design phase of AAA. Given a phase number, validate
that PLAN.md files exist (produced by `/AAA:plan-phase N`), then spawn arch-executor agents
in parallel per wave assignment and update STATE.md after completion.

This workflow requires planning to be complete — if no PLAN.md files exist, it directs
the human to run `/AAA:plan-phase N` first. The separation ensures the human can review
plans before committing to execution.

Context discipline: The orchestrator must stay lean. Do NOT read full design documents in
the orchestrator context. Pass file paths to subagents — they read the files in their own
fresh 200K context windows. The orchestrator's context budget is ~15% maximum. If you need
to check a document's content, read only the first 10 lines or run detect-stubs rather than
reading the full file.
</purpose>

<process>

## Step 1: Initialize and Orient

Extract the phase number from $ARGUMENTS. If $ARGUMENTS is empty, display:

  "Usage: /AAA:execute-phase [phase-number]
  Example: /AAA:execute-phase 1"

And stop.

Read .arch/STATE.md to understand current position and accumulated decisions. Keep the
read focused — extract: Current Position, Last activity, and any relevant Decisions sections.
Do NOT read large design documents into orchestrator context.

Read .arch/CONTEXT.md (first 20 lines only — frontmatter fields are sufficient):

  Bash: head -20 .arch/CONTEXT.md

Validate both files exist:

- If .arch/STATE.md does not exist: display "STATE.md not found. Run /AAA:new-system
  first to initialize the project." and stop.
- If .arch/CONTEXT.md does not exist: display "No CONTEXT.md found. Run /AAA:new-system
  first to initialize the project." and stop.

## Step 2: Locate Phase and Validate Plans Exist

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

**Validate PLAN.md files exist:**

  Bash: ls .arch/phases/{phase-slug}/PLAN*.md 2>/dev/null

If no PLAN.md files found:

  Display:
  "No plans found for Phase {N}: {phase_name}.
  Run /AAA:plan-phase {N} first to produce PLAN.md files, then re-run /AAA:execute-phase {N}."
  Stop.

If PLAN.md files exist:

  Display:
  "Executing Phase {N}: {phase_name}
  Goal: {goal}
  Plans: {count} PLAN.md files found"

## Step 3: Execute Plans by Wave

Read all PLAN.md files from the phase directory:

  Bash: ls .arch/phases/{phase-slug}/PLAN*.md 2>/dev/null

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

## Step 4: Handle Deviation Flags

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
  Consider running /AAA:execute-phase {N} --gaps to close them."

If no auto-flagged items and no gaps: no deviation report needed.

## Step 5: Update STATE.md

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
  Resume with: /AAA:verify-phase {N} (after /clear for fresh context)

**Decisions:** Append any new locked decisions discovered or confirmed during execution.
Each entry formatted as:
  - [Phase {N}]: {decision_summary}

**100-line limit enforcement:** Count lines in the updated STATE.md. If the total exceeds
100 lines, remove the oldest decision entries from the Decisions section until the total is
at or below 100 lines. Preserve all Current Position, Session Continuity, and recent
decisions (last 10). Trim oldest decisions first.

Write the updated .arch/STATE.md using the Write tool with all sections updated.

Commit the updated STATE.md and design artifacts:
  Bash: git add .arch/phases/{phase-slug}/ .arch/STATE.md && git commit -m "docs: execute phase {N} — {phase_name}"

## Step 6: Report and Next Steps

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

Next: /AAA:verify-phase {N} (after /clear for fresh context)
{If gaps:}
Or: /AAA:execute-phase {N} --gaps to close detected gaps
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
(Step 3) as part of the references list. This design keeps the orchestrator lean while
giving arch-executor domain-specific production guidance appropriate to the output type.
The orchestrator does NOT read these specs — it only passes their paths.

</process>
