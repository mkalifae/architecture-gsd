---
description: Start AAA for a new system
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
argument-hint: "[system-description]"
---

<purpose>
Initialize a new AAA project — scaffold the .arch/ directory, spawn discuss-system to extract structured intent from the human architect, write .arch/STATE.md from the validated .arch/CONTEXT.md that discuss-system produces. One command takes the human from a natural language system description to a fully validated CONTEXT.md ready for the design pipeline. new-system.md is a thin orchestrator: it handles directory scaffolding, discuss-system spawning, return processing, STATE.md initialization, and user-facing confirmation. All conversation logic — domain clarification, actor extraction, non-goals questioning, scale measurement, locked-decision collection — lives exclusively in discuss-system.
</purpose>

<process>

## Step 1: Setup and Validation

Extract the system description from $ARGUMENTS. Use the full text verbatim as the description seed passed to discuss-system.

**If $ARGUMENTS is empty (no-argument mode):** Display the following prompt to the human and wait for their response:

  "Describe the agentic system you want to design. Include what it does, who uses it, what technology environment it runs in, and at what scale — any detail you can provide now will reduce clarifying questions later."

Use the human's response as the system description going forward in the workflow.

**If .arch/CONTEXT.md already exists:** Present the following three options to the human via AskUserQuestion and wait for selection:

  "An existing .arch/CONTEXT.md was found for this project. How do you want to proceed?

  1. Update it — re-run discuss-system with existing CONTEXT.md as the starting point. Useful when the system description has changed or you want to refine intake answers.
  2. View it — display the current CONTEXT.md contents, then offer the update/skip choice.
  3. Skip — use the existing CONTEXT.md as-is and jump directly to STATE.md initialization (Step 5). Use this if CONTEXT.md is already complete and validated."

  - If "Update it": continue to Step 2, discuss-system will load .arch/CONTEXT.md in update mode.
  - If "View it": Read .arch/CONTEXT.md and display it in full, then present the Update/Skip choice again. Follow the human's second selection.
  - If "Skip": jump directly to Step 5.

## Step 2: Scaffold Project Directory

Create the .arch/ directory if it does not already exist:

  Bash: mkdir -p .arch

No other initialization is needed at this step. STATE.md is written by new-system.md in Step 5 using the Write tool — not by any arch-tools.js command. The .arch/ directory structure is flat: CONTEXT.md and STATE.md are the only two files at this stage.

## Step 3: Spawn discuss-system

Display status message to the human:

  "Scaffolding complete. Spawning discuss-system to analyze your system description and conduct structured intake. discuss-system will ask you about any fields it cannot extract from your description before producing .arch/CONTEXT.md."

Use Task() to spawn discuss-system as a subagent with the following configuration:

  - model: opus (per config.json balanced profile — intake conversation requires high-quality reasoning)
  - prompt: |
      Read agents/discuss-system.md for your complete execution instructions. You are discuss-system — a structured intake agent that produces .arch/CONTEXT.md.

      System description provided by the human architect:
      "[system description from Step 1]"

      Read @references/context-schema.md to load the complete schema contract for all six required fields (domain, actors, non-goals, constraints, scale, locked-decisions).

      If .arch/CONTEXT.md already exists, read it and use its field values as your starting baseline — this is update mode. Present the current values to the human for confirmation or modification rather than deriving fresh hypotheses.

      Follow your execution_flow exactly. Conduct structured intake with the human, collect all required field values, write .arch/CONTEXT.md, validate with `node bin/arch-tools.js validate-context .arch/CONTEXT.md`, and return structured JSON status per your structured_returns spec.

discuss-system handles all conversation with the human about the system's domain, actors, non-goals, constraints, scale, and locked decisions. new-system.md does not ask any of these questions.

## Step 4: Handle discuss-system Return

Parse the structured JSON return from discuss-system. Three return statuses are possible:

**If status is "complete":**

  Run the safety-net validation regardless of discuss-system's reported status:

    Bash: node bin/arch-tools.js validate-context .arch/CONTEXT.md

  Parse the JSON output. If `valid` is `true`: continue to Step 5.

  If `valid` is `false` despite discuss-system reporting "complete": treat as "human_needed" (see below). This indicates a structural issue that survived discuss-system's own validation loop.

**If status is "human_needed":**

  Display the reason and partial context path to the human:

  "discuss-system could not produce a valid .arch/CONTEXT.md. Reason: [reason from return JSON]

  The partial context file is at: [partial_context from return JSON]

  To continue, inspect .arch/CONTEXT.md, correct the structural issues described above, then re-run /AAA:new-system. discuss-system will load the corrected file in update mode."

  Stop. Do not proceed to Step 5.

**If status is "partial":**

  Display the incomplete fields to the human:

  "discuss-system produced a partial .arch/CONTEXT.md — the conversation was incomplete. Fields not collected: [fields_missing from return JSON].

  Re-run /AAA:new-system to continue. discuss-system will load what was collected and resume from where you left off."

  Stop. Do not proceed to Step 5.

## Step 5: Initialize STATE.md

Read the locked-decisions field from CONTEXT.md:

  Bash: node bin/arch-tools.js frontmatter get .arch/CONTEXT.md --field locked-decisions

Read the domain field from CONTEXT.md:

  Bash: node bin/arch-tools.js frontmatter get .arch/CONTEXT.md --field domain

Extract `system_intent_summary` from discuss-system's return JSON (the one-sentence summary of system purpose for the STATE.md project reference line).

Write .arch/STATE.md using the Write tool with the following template (50-70 lines, three required sections — do NOT exceed 70 lines):

```
# Project State

## Project Reference

See: .arch/CONTEXT.md (produced [YYYY-MM-DD])

**Core value:** [system_intent_summary from discuss-system return]
**Current focus:** Phase 1 — [first design phase, e.g., "Context and Roadmap"]

## Current Position

Phase: 0 (Intake complete)
Plan: N/A
Status: CONTEXT.md produced and validated
Last activity: [YYYY-MM-DD] — Intake complete via discuss-system

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

[If locked-decisions is non-empty, list each as a bullet:]
- [decision]: [rationale]
[... one bullet per locked decision ...]

[If locked-decisions is empty:]
No decisions locked at intake — design pipeline has full latitude.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: [YYYY-MM-DD]
Stopped at: Intake complete
Resume with: /AAA:plan-phase 1 (after /clear for fresh context)
```

CRITICAL: STATE.md is an index document, not a copy of CONTEXT.md. Full content (actors, non-goals, constraints, scale) lives in CONTEXT.md. STATE.md must NOT duplicate CONTEXT.md content — it records position, decisions, and continuity only. Do NOT add extra sections. Do NOT exceed 70 lines.

## Step 6: Confirm and Display Next Steps

Commit both files using direct git commands:

  Bash: git add .arch/CONTEXT.md .arch/STATE.md && git commit -m "feat: initialize architecture project"

Display confirmation to the human:

  ```
  AAA -- Project Initialized

  System: [domain from CONTEXT.md]
  Context: .arch/CONTEXT.md (validated)
  State:   .arch/STATE.md (initialized)

  Locked decisions: [count from discuss-system return] decisions locked at intake
  Non-goals: [count from discuss-system return] explicit non-goals

  Next: /AAA:plan-phase 1 (after /clear for fresh context)
  ```

</process>
