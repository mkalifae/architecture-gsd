---
phase: 02-intake-and-intent-extraction
plan: "02"
subsystem: workflow-orchestrator
tags: [new-system, discuss-system, CONTEXT.md, STATE.md, arch-tools, validate-context, task-spawn, orchestrator]

# Dependency graph
requires:
  - phase: 02-intake-and-intent-extraction
    provides: Full discuss-system agent spec with structured returns (status/system_intent_summary/locked_decisions_count/non_goals_count), Phase 1 arch-tools.js validate-context command
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: Phase 1 stub of workflows/new-system.md with final-correct frontmatter, bin/arch-tools.js frontmatter get command
provides:
  - Full /arch-gsd:new-system workflow: directory scaffolding, discuss-system spawn via Task(), return handling (complete/human_needed/partial), STATE.md initialization, confirmation display
  - $ARGUMENTS extraction with no-argument fallback prompt
  - Existing CONTEXT.md handling: Update/View/Skip menu before spawning discuss-system
  - Safety-net validate-context call after discuss-system returns (regardless of reported status)
  - STATE.md template with all 3 required sections (Current Position, Accumulated Context > Decisions, Session Continuity) within 50-70 line limit
  - Direct git add/commit in Step 6 (not arch-tools.js commit)
affects:
  - All Architecture GSD users running /arch-gsd:new-system as entry point
  - Phase 3+ design phases that depend on .arch/STATE.md being initialized correctly

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin orchestrator pattern: new-system.md handles only scaffolding/spawning/return/STATE.md/confirmation — all conversation logic delegates to discuss-system"
    - "Dual-validation pattern: discuss-system self-validates inline, new-system.md runs safety-net validate-context regardless of reported status"
    - "Workflow-level AskUserQuestion only: new-system.md uses AskUserQuestion solely for Update/View/Skip menu — never for system content questions"
    - "STATE.md as index not copy: STATE.md records position/decisions/continuity; full content lives in CONTEXT.md — enforced by 50-70 line cap"
    - "Direct git commands in workflow: Step 6 uses git add + git commit rather than arch-tools.js commit"

key-files:
  created: []
  modified:
    - workflows/new-system.md

key-decisions:
  - "new-system.md uses mkdir -p .arch for directory scaffolding — no state init command, because arch-tools.js state init creates .planning/phases/ directories (GSD system), not .arch/ (arch system)"
  - "Safety-net validate-context runs after discuss-system returns regardless of status field — guards against discuss-system reporting complete while CONTEXT.md is actually invalid"
  - "No-argument mode uses a single freeform prompt (not an error) — improves UX for users who invoke /arch-gsd:new-system without a description"
  - "STATE.md locked-decisions section shows 'No decisions locked at intake — design pipeline has full latitude' when locked-decisions array is empty — same phrasing as discuss-system spec for consistency"

patterns-established:
  - "Workflow responsibility split: orchestrator workflow handles lifecycle, subagent handles all domain conversation"
  - "Three-option menu for existing artifacts: Update/View/Skip — avoid destructive overwrite, support incremental improvement"
  - "Return path handling: all three discuss-system return statuses (complete/human_needed/partial) have explicit handling — no silent failure"

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 2 Plan 02: new-system.md Workflow Summary

**Thin orchestrator workflow for /arch-gsd:new-system: 6-step process with mkdir scaffolding, Task() discuss-system spawn, dual-validation (inline + safety-net), and STATE.md initialization from locked-decisions extracted via arch-tools.js frontmatter get**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T18:26:30Z
- **Completed:** 2026-02-28T18:28:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced Phase 1 stub (7 lines) with complete 184-line workflow implementing the /arch-gsd:new-system entry point
- Implemented 6-step process: argument extraction + no-argument fallback, mkdir scaffolding, discuss-system Task() spawn, return parsing with safety net, STATE.md initialization, confirmation display
- Enforced responsibility boundary: AskUserQuestion only used for workflow-level Update/View/Skip decision; all system content questioning delegated to discuss-system
- Embedded complete STATE.md template in Step 5 with all 3 required sections (## Current Position, ## Accumulated Context > ### Decisions, ## Session Continuity) within 50-70 line constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement new-system.md workflow — directory scaffolding, discuss-system spawn, and return handling** - `25c8ae2` (feat)

**Plan metadata:** (docs commit — follows below)

## Files Created/Modified

- `workflows/new-system.md` — Full orchestrator workflow replacing Phase 1 stub; 184 lines, 6 steps, zero stubs detected, frontmatter preserved unchanged

## Decisions Made

- Used `mkdir -p .arch` for directory scaffolding — not `arch-tools.js state init` because state init creates `.planning/phases/` directories for the GSD system, not `.arch/` for the Architecture GSD system. The plan specification was explicit about this boundary.
- Safety-net validate-context call runs unconditionally after discuss-system returns — this ensures new-system.md never proceeds to STATE.md initialization on an invalid CONTEXT.md, even if discuss-system incorrectly reports "complete" status.
- No-argument mode presents a freeform prompt rather than an error — aligns with discuss-system's FAILURE-02 recovery pattern (handle brief descriptions gracefully, not by rejecting).
- STATE.md uses "No decisions locked at intake — design pipeline has full latitude" for empty locked-decisions — exact phrasing from discuss-system spec's Locked Decisions body section template for consistency.

## Deviations from Plan

None — plan executed exactly as written. All verification criteria from the plan's `<verify>` section passed on first attempt.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both Phase 2 plans are complete: discuss-system (02-01) and new-system.md (02-02)
- The full intake pipeline is now documented end-to-end: human runs /arch-gsd:new-system, discuss-system conducts structured intake, new-system.md reads the return, STATE.md is initialized
- Phase 3 (Architecture Roadmapping) can proceed — it reads .arch/CONTEXT.md and .arch/STATE.md which are now fully specified
- arch-tools.js validate-context is the shared validation mechanism used by both discuss-system (self-validation) and new-system.md (safety net) — already implemented in Phase 1

## Self-Check: PASSED

- FOUND: workflows/new-system.md (184 lines)
- FOUND: .planning/phases/02-intake-and-intent-extraction/02-02-SUMMARY.md
- FOUND commit: 25c8ae2

---
*Phase: 02-intake-and-intent-extraction*
*Completed: 2026-02-28*
