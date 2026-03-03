---
description: Plan a design phase
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
argument-hint: "[phase-number]"
---

<purpose>
Plan a design phase of AAA. Given a phase number, coordinate the planning
pipeline: run arch-researcher (if no RESEARCH.md exists), run arch-roadmapper (if no
ROADMAP.md exists), enter the arch-planner + arch-checker bounded revision loop (max 3
iterations), then update STATE.md with planning completion. This workflow produces PLAN.md
files that `/AAA:execute-phase N` consumes.

The human runs `/AAA:plan-phase N` and the pipeline produces validated PLAN.md files
with wave assignments, task breakdowns, and output paths — ready for execution.

Context discipline: The orchestrator must stay lean. Do NOT read full design documents in
the orchestrator context. Pass file paths to subagents — they read the files in their own
fresh 200K context windows. The orchestrator's context budget is ~15% maximum. If you need
to check a document's content, read only the first 10 lines or run detect-stubs rather than
reading the full file.
</purpose>

<process>

## Step 1: Initialize and Orient

Extract the phase number from $ARGUMENTS. If $ARGUMENTS is empty, display:

  "Usage: /AAA:plan-phase [phase-number]
  Example: /AAA:plan-phase 1"

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
  "Planning Phase {N}: {phase_name}
  Goal: {goal}
  Artifacts: {count} design documents"

## Step 4: Create Phase Directory

Create the phase working directory if it does not exist:

  Bash: mkdir -p .arch/phases/{phase-slug}

No files are written to this directory by the orchestrator — arch-planner will populate it
with PLAN.md files.

## Step 5: Run arch-planner

**Check for existing PLAN.md files:**

  Bash: ls .arch/phases/{phase-slug}/PLAN*.md 2>/dev/null

If PLAN.md files already exist: offer the human a choice via AskUserQuestion:

  "Existing plans found in .arch/phases/{phase-slug}/. How do you want to proceed?

  1. Replan — discard existing plans and create new ones from scratch.
  2. Skip — keep existing plans and proceed to plan verification (Step 6).
  3. View — display existing plan filenames, then choose replan or skip."

  - If "Replan": continue to spawn arch-planner below.
  - If "Skip": jump to Step 6 with the existing PLAN.md files.
  - If "View": list the plan files, then present the Replan/Skip choice.

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
      # ESCALATION — do NOT silently proceed to execution
      Display structured gap report to human:

      "arch-checker found unresolved issues after {max_iterations} revision iterations.
      STOPPING — human review required before proceeding.

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
        3. Re-run /AAA:plan-phase {N}"

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

## Step 7: Update STATE.md

Read current .arch/STATE.md using the Read tool.

Update the following sections:

**Current Position:**
  Phase: {N} ({phase_name})
  Plan: All plans produced
  Status: "Phase {N} planned" (if checker passed) or "Phase {N} planned with overrides" (if max iterations reached and user forced)
  Last activity: {YYYY-MM-DD} — "Phase {N} planned: {plan_count} plans in {wave_count} waves"

**Session Continuity:**
  Last session: {YYYY-MM-DD}
  Stopped at: Phase {N} planning complete
  Resume with: /AAA:execute-phase {N} (after /clear for fresh context)

**Decisions:** Append any new locked decisions discovered during planning.
Each entry formatted as:
  - [Phase {N} planning]: {decision_summary}

**100-line limit enforcement:** Count lines in the updated STATE.md. If the total exceeds
100 lines, remove the oldest decision entries from the Decisions section until the total is
at or below 100 lines. Preserve all Current Position, Session Continuity, and recent
decisions (last 10). Trim oldest decisions first.

Write the updated .arch/STATE.md using the Write tool with all sections updated.

Commit the planning artifacts:
  Bash: git add .arch/phases/{phase-slug}/ .arch/STATE.md .arch/RESEARCH.md .arch/ROADMAP.md 2>/dev/null; git commit -m "docs: plan phase {N} — {phase_name}"

## Step 8: Report and Next Steps

Count plans and extract wave assignments for the summary:

  Bash: ls .arch/phases/{phase-slug}/PLAN*.md 2>/dev/null | wc -l

Display completion report to the human:

```
Phase {N}: {phase_name} — Planned

Plans produced: {plan_count} in {wave_count} wave(s)

| Wave | Plans | What it produces |
|------|-------|------------------|
| 1    | {plan names} | {objectives} |
| 2    | {plan names} | {objectives} |

Research:      {Completed | Used existing | Skipped}
Verification:  {Passed | Passed with overrides | Max iterations}

Next: /AAA:execute-phase {N} (after /clear for fresh context)

Also available:
  cat .arch/phases/{phase-slug}/PLAN*.md — review plans before execution
  /AAA:plan-phase {N} — replan if changes needed
```

</process>

<success_criteria>

- [ ] .arch/STATE.md and .arch/CONTEXT.md validated to exist
- [ ] RESEARCH.md produced (or already existed)
- [ ] ROADMAP.md produced (or already existed)
- [ ] Phase located in ROADMAP.md with goal and artifact list extracted
- [ ] Phase directory created
- [ ] Existing plans checked — human offered replan/skip/view if plans exist
- [ ] arch-planner spawned and PLAN.md files produced
- [ ] arch-checker spawned and bounded revision loop completed (max 3 iterations)
- [ ] Escalation to human if max iterations reached without resolution
- [ ] STATE.md updated with planning completion status
- [ ] Planning artifacts committed to git
- [ ] Human shown plan summary with wave breakdown
- [ ] Next step suggests /AAA:execute-phase {N}
- [ ] No design documents read into orchestrator context — only file paths passed to subagents

</success_criteria>
