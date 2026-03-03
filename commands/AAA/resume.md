---
description: Resume Architecture GSD from saved state
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

<purpose>
Restore complete project context after a session ends. Reading only .arch/STATE.md (under
100 lines) and .arch/CONTEXT.md (head -5 for domain field), present the current project
position, progress, recent decisions, any blockers, and the exact next command from the
"Resume with:" field. No design documents are read — the orchestrator stays lean.

This workflow satisfies STAT-05: after any session ends, the user runs /AAA:resume and
immediately knows where the project stands and what to run next.
</purpose>

<process>

## Step 1: Validate Project Exists

Check that the project has been initialized:

  Bash: ls .arch/STATE.md .arch/CONTEXT.md 2>/dev/null

If neither file exists, display:

  "No Architecture GSD project found.
  Run /AAA:new-system first to initialize a project."

And stop.

If STATE.md exists but CONTEXT.md does not, note this but continue — STATE.md is the
primary source and is sufficient for resume.

## Step 2: Read STATE.md

Read .arch/STATE.md in full using the Read tool. STATE.md is enforced at under 100 lines
by the execute-phase and verify-phase update steps, so reading in full is safe.

Extract the following fields from STATE.md:

- **Project Reference**: Core value and current focus (from "## Project Reference" section)
- **Current Position**: Phase X of Y, Plan A of B, Status, Last activity
- **Progress bar**: The visual bar from "Progress:" line
- **Session Continuity**: "Last session:", "Stopped at:", "Resume with:" lines
- **Decisions**: Recent decisions list from "### Decisions" section (last 5)
- **Blockers/Concerns**: Any entries in "### Blockers/Concerns" section
- **Pending Todos**: "### Pending Todos" section content

Read .arch/CONTEXT.md (domain field only):

  Bash: head -5 .arch/CONTEXT.md

Extract the "domain:" field value — this is the project name for display.

## Step 3: Check for Incomplete Work

Check if ROADMAP.md exists:

  Bash: ls .arch/ROADMAP.md 2>/dev/null && echo "exists" || echo "missing"

If ROADMAP.md is missing, note "ROADMAP.md not yet generated — run /AAA:plan-phase 1
to start the design pipeline." Do not fail — degrade gracefully.

Check STATE.md status field for indicators of incomplete work:
- If Status contains "partially complete": flag incomplete execution
- If Status contains "gaps_found": flag gaps from last verification run
- If Status contains "human_needed": flag pending human decision

## Step 4: Present Status

Display the project status report:

```
Architecture GSD — Project Status

Project: [domain field from CONTEXT.md]
Core value: [core value from STATE.md Project Reference]

Current Position:
  Phase: [Phase N of Y] — [phase name]
  Plan:  [Plan A of B] — [status]
  Last activity: [date] — [what happened]

Progress: [progress bar from STATE.md]

[If incomplete work detected:]
WARNING: Incomplete work detected:
  Status: [status value from STATE.md Current Position]
  [For gaps_found: list gap summaries from STATE.md if present]
  [For human_needed: describe pending decision]

[If blockers/concerns exist (and are not marked RESOLVED):]
Concerns:
  - [blocker 1]
  - [blocker 2]

[If pending todos exist (non-empty section):]
Pending todos: [list or count from STATE.md Pending Todos section]

Recent decisions (last 5):
  - [decision 1]
  - [decision 2]
  [...]
```

Use plain text only. Do NOT use emoji. Do NOT read any design documents.

## Step 5: Determine Next Action and Present Continuation Format

Parse the exact command from the "Resume with:" field in STATE.md Session Continuity
section. This is the primary continuation action.

If "Resume with:" field is present and non-empty:

  Display:

  ```
  Next step:
    [exact command from "Resume with:" field]
    (/clear first for a fresh context window)

  Also available:
    /AAA:progress   — view status without continuing
    /AAA:verify-phase [N]   — run verification if phase execution is complete
  ```

If "Resume with:" field is missing or empty, fall back to determining next action from
STATE.md Current Position:

  - If Status is "Phase N planned": suggest /AAA:execute-phase N
  - If Status is "Phase N complete": suggest /AAA:verify-phase N
  - If Status is "Phase N verified": suggest /AAA:plan-phase N+1
  - If Status shows a phase in progress: suggest /AAA:execute-phase N (to continue)
  - If Status is the initial state (no phase started): suggest /AAA:plan-phase 1

Update SESSION CONTINUITY in .arch/STATE.md with the current timestamp to record that
a resume was performed:

  Read current .arch/STATE.md. Update:
    Last session: [YYYY-MM-DD of today]
    Stopped at: Session resumed — [summarize current status in one line]
  Keep "Resume with:" unchanged.

  Write the updated .arch/STATE.md using the Write tool.

</process>

<success_criteria>

- [ ] .arch/STATE.md read in full and all key fields extracted
- [ ] Project name displayed (from CONTEXT.md domain field)
- [ ] Current position (phase, plan, status) displayed
- [ ] Progress bar displayed as-is from STATE.md
- [ ] Blockers and concerns displayed if present
- [ ] "Resume with:" command displayed as primary continuation action
- [ ] Fallback next-action provided if "Resume with:" is missing
- [ ] No design documents read — only STATE.md (full) and CONTEXT.md (head -5)
- [ ] No gsd-tools.js usage — STATE.md is read directly with the Read tool
- [ ] No .continue-here file logic — AAA uses STATE.md "Resume with:" line
- [ ] Session Continuity "Last session" updated in STATE.md after display

</success_criteria>
