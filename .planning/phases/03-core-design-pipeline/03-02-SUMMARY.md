---
phase: 03-core-design-pipeline
plan: "02"
subsystem: agent-specs
tags: [arch-planner, wave-assignment, topological-sort, design-pipeline, plan-decomposition]

# Dependency graph
requires:
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: templates/agent-spec.md, references/agent-spec-format.md, references/verification-patterns.md, bin/arch-tools.js
  - phase: 02-intake-and-intent-extraction
    provides: discuss-system.md as concrete reference for complete agent spec format
provides:
  - Full arch-planner agent spec with all 7 XML sections (413 lines, replacing 39-line Phase 1 stub)
  - ARCHITECTURE_DEPENDENCY_RULES wave-assignment algorithm (topological sort for design artifact types)
  - goal-backward must_haves derivation methodology documented in execution_flow
  - 4 failure modes with concrete trigger/manifestation/recovery/detection
affects: [03-core-design-pipeline, arch-checker, arch-executor, execute-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ARCHITECTURE_DEPENDENCY_RULES: event-schema -> agent-contract -> topology ordering enforced via wave assignments"
    - "goal-backward methodology: phase goal -> observable truths -> artifact properties -> key_links"
    - "Locked-decision override: honored without challenge, documented in PLAN.md action with warning in return"

key-files:
  created: []
  modified:
    - agents/arch-planner.md

key-decisions:
  - "arch-planner writes PLAN.md using GSD-compatible task XML format (<files><action><verify><done>) for compatibility with detect-stubs and arch-checker plan quality checks"
  - "Max 3 tasks per PLAN.md enforced as hard constraint to maintain arch-executor context budget within 50% utilization target"
  - "Locked decisions from CONTEXT.md are honored without challenge — override wave ordering when necessary, document override in PLAN.md action text, return warning (not error) in structured result"
  - "Wave assignment uses ARCHITECTURE_DEPENDENCY_RULES: event-schema has no deps (Wave 1), context-flows needs roadmapper output, agent-contract needs event-schema, failure-modes and topology need agent-contract"

patterns-established:
  - "ARCHITECTURE_DEPENDENCY_RULES constant: document type -> list of dependency types for computing wave numbers via topological sort"
  - "goal-backward must_haves: 4-step derivation from phase goal to truths to artifacts to key_links"
  - "Circular dependency detection: if max(wave numbers) > task count, cycle present — break by forcing same wave"

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 3 Plan 02: arch-planner Agent Spec Summary

**arch-planner agent spec with 12-step execution_flow including ARCHITECTURE_DEPENDENCY_RULES wave assignment algorithm (topological sort for design artifact types: events before agents before topology)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T19:58:49Z
- **Completed:** 2026-02-28T20:01:49Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced 39-line Phase 1 stub with a 413-line complete agent spec across all 7 XML sections
- Encoded ARCHITECTURE_DEPENDENCY_RULES: the wave assignment algorithm that enforces events.yaml before agent contracts before topology — resolving the pre-Phase-1 research concern flagged in STATE.md blockers
- Documented 12-step execution_flow including topological sort, goal-backward must_haves derivation, and GSD-compatible PLAN.md production
- Specified 4 failure modes (missing ROADMAP entry, circular dependency, oversized phase, locked-decision conflict) with concrete trigger/manifestation/recovery/detection for each

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement arch-planner role, inputs, consumers, and constraints** - `56a6796` (feat)

Note: Task 2 (execution_flow, structured_returns, failure_modes) was implemented in the same atomic write as Task 1. All 7 XML sections were written in a single Write call, resulting in one commit covering both tasks. The split was architectural for plan readability; implementation was more efficient as a single pass.

**Plan metadata:** _(created in final commit — see state updates)_

## Files Created/Modified

- `/home/mkali/Claude_Code/best-practices/agents/arch-planner.md` — Full arch-planner agent spec, 413 lines, all 7 XML sections, zero stub phrases detected

## Decisions Made

- arch-planner writes PLAN.md using the exact GSD-compatible task XML format to preserve compatibility with plan-structure verification commands
- Max 3 tasks per PLAN.md is a hard constraint (not a guideline) to maintain arch-executor context budget within the 50% target
- Locked decisions from CONTEXT.md must always be honored without challenge; violations to standard wave ordering from locked decisions are documented in PLAN.md action text and returned as warnings (not errors) in the structured result
- The ARCHITECTURE_DEPENDENCY_RULES constant encodes domain knowledge: event-schema has no design artifact dependencies (always Wave 1), context-flows needs roadmapper output, agent-contract needs event-schema, failure-modes and topology both need agent-contract

## Deviations from Plan

None — plan executed exactly as written. The single deviation in execution pattern (writing all 7 sections in one Write rather than two separate writes for Task 1 and Task 2) was an efficiency optimization with zero impact on output quality.

## Issues Encountered

None. All verification commands passed on first execution:
- `detect-stubs`: 0 stub phrases found
- `frontmatter get`: name=arch-planner, model=sonnet confirmed
- `ROADMAP.md` references: 16 occurrences (required >= 4)
- `ARCHITECTURE_DEPENDENCY_RULES` references: 11 occurrences (required >= 2)
- `<files>/<action>/<verify>/<done>` references: 25 occurrences (required >= 4)
- `must_haves/goal-backward/observable truths/key_links` references: 11 occurrences (required >= 3)
- `"status"` occurrences: 7 (required >= 3)
- Line count: 413 (required >= 200)
- validate-names: valid=true, 0 violations

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- arch-planner is now a fully executable agent spec; any Claude Sonnet instance can run it to decompose a design phase from .arch/ROADMAP.md into wave-assigned PLAN.md files
- The resolved research concern (wave dependency design for architecture tasks) is now encoded in ARCHITECTURE_DEPENDENCY_RULES with clear topological-sort algorithm
- Ready for arch-checker (03-04) and arch-executor (03-05) execution in Phase 3 Wave 1

---
*Phase: 03-core-design-pipeline*
*Completed: 2026-02-28*
