---
description: Show AAA progress
allowed-tools: Read, Bash, Grep, Glob
---

<purpose>
Display a read-only project status report from .arch/STATE.md and .arch/ROADMAP.md.
No state changes. No Write, Edit, or Task tool usage. Provides situational awareness
of the full project: phase breakdown, artifact count, recent decisions, and next
recommended command — without altering any project files.

Context discipline: Read only STATE.md (full, under 100 lines), ROADMAP.md (head -50),
and CONTEXT.md (head -5). Never read design documents.
</purpose>

<process>

## Step 1: Validate Project Exists

Check for STATE.md:

  Bash: ls .arch/STATE.md 2>/dev/null && echo "exists" || echo "missing"

If STATE.md is missing, display:

  "No AAA project found.
  Run /AAA:new-system first to initialize a project."

And stop.

Check for ROADMAP.md:

  Bash: ls .arch/ROADMAP.md 2>/dev/null && echo "exists" || echo "missing"

If STATE.md exists but ROADMAP.md is missing, display partial status from STATE.md
only and note:

  "ROADMAP.md not yet generated — run /AAA:plan-phase 1 to start the design pipeline."

Continue to Step 2 with ROADMAP.md marked as unavailable.

## Step 2: Read State and Roadmap

Read .arch/STATE.md in full using the Read tool. STATE.md is enforced at under 100 lines.

Extract:
- Current Position: Phase N of Y, Plan A of B, Status
- Progress bar: from "Progress:" line
- Session Continuity: "Resume with:" field
- Decisions: recent list from "### Decisions" section
- Blockers/Concerns: from "### Blockers/Concerns" section
- Performance Metrics: velocity and phase table if present

Read .arch/ROADMAP.md (first 50 lines only):

  Bash: head -50 .arch/ROADMAP.md

Extract the phase list: phase number, name, and any status markers present.

Read .arch/CONTEXT.md (domain field only):

  Bash: head -5 .arch/CONTEXT.md

Extract the "domain:" field for the project name.

## Step 3: Count Design Artifacts

Count all design artifacts produced so far across all phases:

  Bash: find .arch/phases/ -name "*.md" -o -name "*.yaml" 2>/dev/null | wc -l

This gives the total document count across all phase directories. If .arch/phases/ does
not exist, report 0 artifacts.

Also count phase directories to understand how many phases have any artifacts:

  Bash: ls -d .arch/phases/*/ 2>/dev/null | wc -l

## Step 4: Display Formatted Status Report

Display the complete status report. Use plain text markers for phase status: [DONE] for
complete phases, [ACTIVE] for the current phase, [PLANNED] for future phases. Do NOT use
emoji.

Format:

```
AAA — Project Progress

Project: [domain field from CONTEXT.md]
Progress: [progress bar from STATE.md]

Current Position:
  Phase: [Phase N of Y] — [phase name or status from STATE.md]
  Plan:  [Plan A of B] — [status]

Phase Overview:
  [For each phase found in ROADMAP.md (head -50), determine status:
    - DONE if it matches a completed phase in STATE.md Current Position history
    - ACTIVE if it matches the current phase in STATE.md Current Position
    - PLANNED if it has not started yet]

  Phase 1: [name]   [DONE | ACTIVE | PLANNED]
  Phase 2: [name]   [DONE | ACTIVE | PLANNED]
  Phase 3: [name]   [DONE | ACTIVE | PLANNED]
  [... one line per phase found in ROADMAP.md head -50]

Design Artifacts:
  Total documents: [count from find command]
  Phase directories: [count from ls command]

Recent Decisions (last 3):
  - [decision 1 from STATE.md Decisions section]
  - [decision 2]
  - [decision 3]

[If blockers/concerns exist and are not marked RESOLVED:]
Concerns:
  - [blocker 1]
  - [blocker 2]

[If ROADMAP.md missing:]
  ROADMAP.md not yet generated.
  Run /AAA:plan-phase 1 to start the design pipeline.

Next recommended command:
  [exact command from "Resume with:" field in STATE.md Session Continuity]
  (/clear first for a fresh context window)
```

Determining phase status from available data:
- Parse the "Phase: N of Y" field in STATE.md Current Position to find the current phase
- Phases with number < current phase number are [DONE]
- The phase matching the current phase number is [ACTIVE]
- Phases with number > current phase number are [PLANNED]
- If Status contains "complete" or "verified": current phase is also [DONE], and next phase
  is [ACTIVE] if it exists

This is a READ-ONLY workflow. Do NOT call Write, Edit, or Task. Do NOT update STATE.md.
Display the report and stop.

</process>

<success_criteria>

- [ ] STATE.md read in full — no design documents read
- [ ] ROADMAP.md read (head -50 only) if it exists
- [ ] CONTEXT.md read (head -5 only) for domain field
- [ ] Project name displayed from CONTEXT.md
- [ ] Progress bar displayed as-is from STATE.md
- [ ] Phase-by-phase status displayed using [DONE]/[ACTIVE]/[PLANNED] markers (no emoji)
- [ ] Total design artifact count displayed
- [ ] Recent decisions (last 3) displayed
- [ ] Blockers/concerns displayed if present and unresolved
- [ ] Next recommended command from "Resume with:" field displayed
- [ ] No state mutations performed — Read tool and Bash (read-only) only
- [ ] Graceful degradation when ROADMAP.md is missing

</success_criteria>
