---
phase: 03-workflow-restructure
plan: 01
subsystem: commands
tags: [new-system, plan-phase, arch-researcher, arch-roadmapper, pipeline, initialization]

# Dependency graph
requires:
  - phase: 01-permission-boundaries
    provides: Write permission on arch-researcher/arch-roadmapper for output file production
  - phase: 02-internet-access
    provides: arch-researcher internet tools for research step
provides:
  - new-system produces full initialization pipeline (intake -> research -> roadmap)
  - plan-phase assumes prerequisites and focuses purely on planning
affects: [plan-phase, new-system, any documentation referencing the initialization workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pipeline consolidation: move all prerequisite generation into the initialization command"
    - "Idempotent re-run: skip-if-exists checks allow partial retry after failure"

key-files:
  created: []
  modified:
    - commands/AAA/new-system.md
    - commands/AAA/plan-phase.md

key-decisions:
  - "Move arch-researcher and arch-roadmapper spawning into new-system, making it the single owner of all foundation file production"
  - "plan-phase Step 2 becomes a hard stop with /AAA:new-system redirect instead of fallback spawning"
  - "Skip-if-exists logic in Steps 5-6 of new-system enables idempotent re-runs after partial failures"

patterns-established:
  - "Initialization pattern: one command owns full pipeline, downstream commands assume prerequisites"
  - "Skip-if-exists: re-runnable steps check for output file before spawning subagent"

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 3 Plan 1: Workflow Restructure Summary

**new-system extended to run full initialization pipeline (intake -> researcher -> roadmapper), plan-phase simplified to assume RESEARCH.md and ROADMAP.md exist**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T17:35:06Z
- **Completed:** 2026-03-03T17:37:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added Step 5 (arch-researcher spawn, model sonnet) and Step 6 (arch-roadmapper spawn, model opus) to new-system.md — renumbering old Steps 5-6 to 7-8
- Both new steps have skip-if-exists logic for idempotent re-runs after partial failures
- Both new steps have failure handling that stops execution with actionable error messages
- Step 8 git commit now includes RESEARCH.md and ROADMAP.md; confirmation display shows all four initialized files
- plan-phase Step 2 replaced with simple existence checks redirecting to /AAA:new-system if files are missing
- plan-phase purpose and success_criteria updated to reflect simplified prerequisite check

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend new-system with arch-researcher and arch-roadmapper spawn steps** - `319dc22` (feat)
2. **Task 2: Simplify plan-phase prerequisite check** - `56d9771` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `commands/AAA/new-system.md` - Added Steps 5-6 for researcher/roadmapper spawning; renumbered Steps 5-6 to 7-8; updated git commit and confirmation display in Step 8; fixed step number references in Steps 1-2
- `commands/AAA/plan-phase.md` - Replaced Step 2 fallback spawning with existence checks; updated purpose section and success_criteria

## Decisions Made

- new-system is now the single owner of CONTEXT.md, RESEARCH.md, ROADMAP.md, and STATE.md production — plan-phase is a pure planner
- Skip-if-exists pattern chosen over detecting which step failed: simpler, allows manual recovery without re-running entire pipeline
- Error messages in plan-phase direct to /AAA:new-system (not to running agents directly) to keep pipeline ownership clear

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale Step number references in new-system.md**
- **Found during:** Task 1 (after renumbering Steps 5-6 to 7-8)
- **Issue:** Step 2 still referenced "Step 5" (now Step 7) for STATE.md initialization; Step 1 "Skip" option still referenced "Step 5" in both the jump target and the option description text
- **Fix:** Updated Step 2 prose to reference Step 7; updated Step 1 "Skip" jump target from "Step 5" to "Step 7"; updated Step 1 option description from "(Step 5)" to "(Step 7)"
- **Files modified:** `commands/AAA/new-system.md`
- **Verification:** Read file after edits — all step references consistent
- **Committed in:** `319dc22` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: stale step number references)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WKFL-01, WKFL-02, WKFL-03 all satisfied
- new-system now produces the full foundation: CONTEXT.md, RESEARCH.md, ROADMAP.md, STATE.md
- plan-phase is a clean planner with no fallback spawning complexity
- Phase 3 complete — no further workflow restructure plans remain

---
*Phase: 03-workflow-restructure*
*Completed: 2026-03-03*
