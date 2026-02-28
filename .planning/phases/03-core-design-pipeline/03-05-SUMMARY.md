---
phase: 03-core-design-pipeline
plan: "05"
subsystem: agents
tags: [schema-designer, context-engineer, failure-analyst, event-schema, context-flows, failure-modes, agent-spec]

# Dependency graph
requires:
  - phase: 03-core-design-pipeline
    provides: Phase 1 agent stubs with complete frontmatter; templates/event-schema.yaml, templates/failure-modes.md, references/agent-spec-format.md
provides:
  - "Full schema-designer agent spec — derives events from actor interactions, enforces PascalCase/SCREAMING_SNAKE naming, strict typing rules, produces design/events/events.yaml"
  - "Full context-engineer agent spec — maps per-agent reads/writes/emissions, dual-format output, bottleneck analysis, produces design/context/CONTEXT-FLOWS.md"
  - "Full failure-analyst agent spec — catalogs FM-NNN modes per agent with concrete triggers/recovery, INT-NNN integration failures, RISK-NNN residual risks, produces design/failure/FAILURE-MODES.md"
affects:
  - 03-06-execute-phase-workflow
  - 04-verification-and-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event derivation from actor interactions: actor actions → SCREAMING_SNAKE commands → state changes → PascalCase events"
    - "Context flow dual-format: per-agent markdown table + YAML injection map + bottleneck analysis"
    - "Failure mode catalog: FM-NNN prose + INT-NNN integration failures + RISK-NNN risks + YAML appendix"
    - "Self-cleaning stub pattern: agents describe banned phrases without triggering detect-stubs by avoiding literal banned text in the agent body"

key-files:
  created: []
  modified:
    - "agents/schema-designer.md — full 7-section agent spec replacing Phase 1 stub (153 lines)"
    - "agents/context-engineer.md — full 7-section agent spec replacing Phase 1 stub (178 lines)"
    - "agents/failure-analyst.md — full 7-section agent spec replacing Phase 1 stub (170 lines)"

key-decisions:
  - "schema-designer runs Wave 2 (before Wave 3 agent contracts) so event names exist before arch-executor references them in contract upstream/downstream sections"
  - "context-engineer handles events.yaml unavailability gracefully (FM-02): maps file-read-based flows without event edges, returns gaps_found rather than failing"
  - "failure-analyst describes banned recovery phrases by referencing the templates/failure-modes.md banned list rather than quoting them inline — avoids detect-stubs false positives on legitimate constraint documentation"
  - "All three agents enforce the detect-stubs self-check at their final step before returning — clean output is a prerequisite for returning status: complete"

patterns-established:
  - "Wave ordering derived from dependencies: schema-designer (Wave 2) before arch-executor (Wave 3) because contracts reference event names"
  - "Output format references as named sections: schema-designer references event-schema.yaml template, context-engineer and failure-analyst define explicit output format sections"
  - "Parallel execution graceful degradation: context-engineer and schema-designer can run in parallel; context-engineer handles missing events.yaml via FM-02 gap pattern"

# Metrics
duration: 10min
completed: 2026-02-28
---

# Phase 3 Plan 05: Specialized Design Agents Summary

**Three specialized domain agents fully implemented: schema-designer derives events from CONTEXT.md actors, context-engineer maps information flow with bottleneck analysis, failure-analyst catalogs failure modes with concrete recovery enforcement.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-28T19:58:52Z
- **Completed:** 2026-02-28T20:08:32Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- schema-designer agent spec: 10-step execution flow deriving events from actor interactions, strict PascalCase/SCREAMING_SNAKE naming validation, banned type enforcement, produces design/events/events.yaml as canonical event registry
- context-engineer agent spec: 9-step execution flow mapping reads/writes/emissions for every agent in the roadmap, dual-format output (markdown table + YAML injection map), information bottleneck detection with explicit remediation recommendations
- failure-analyst agent spec: 9-step execution flow enumerating FM-NNN failure modes per agent and INT-NNN integration point failures, banned phrase enforcement via detect-stubs self-check, dual-format output with YAML failure catalog appendix

## Task Commits

Each task was committed atomically:

1. **Task 1: schema-designer agent spec** - `ac16a77` (feat)
2. **Task 2: context-engineer agent spec** - `2b2cd1a` (feat)
3. **Task 3: failure-analyst agent spec** - `6cf75cb` (feat)

## Files Created/Modified

- `agents/schema-designer.md` - Full agent spec: derives events from CONTEXT.md actors, enforces PascalCase events and SCREAMING_SNAKE commands, validates naming before writing, produces design/events/events.yaml (153 lines)
- `agents/context-engineer.md` - Full agent spec: maps per-agent context flows, builds min/max context injection maps, identifies bottlenecks and context-starved agents, produces design/context/CONTEXT-FLOWS.md (178 lines)
- `agents/failure-analyst.md` - Full agent spec: catalogs failure modes per agent contract, maps integration point failures, documents residual risks, enforces concrete recovery language via detect-stubs self-check, produces design/failure/FAILURE-MODES.md (170 lines)

## Decisions Made

- schema-designer is Wave 2 (before arch-executor's Wave 3 agent contracts) so that event names exist in events.yaml before agent contracts reference them in upstream/downstream sections — orphaned event references are a Level 3 verification failure
- context-engineer handles parallel execution gracefully: events.yaml unavailability is a named failure mode (FM-02) that returns gaps_found rather than failing; the gap resolves automatically when schema-designer completes
- failure-analyst documents the banned phrase list by referencing templates/failure-modes.md rather than quoting banned phrases inline — this avoids detect-stubs false positives on the agent spec itself
- All three agents enforce detect-stubs self-check before returning, making clean: true a prerequisite for returning status: complete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] detect-stubs false positives on quoted banned phrases**
- **Found during:** Tasks 1, 2, and 3 (all three agents)
- **Issue:** The detect-stubs tool flagged legitimate content describing what phrases NOT to use (e.g., quoting "handles gracefully" in a constraint that says this phrase is forbidden). The tool scans all lines except frontmatter, so quoted examples of banned phrases in the body triggered false positives.
- **Fix:** Rephrased all three agents to describe banned phrases by reference to the templates/failure-modes.md banned list rather than by quoting them inline. Used meta-references ("see templates/failure-modes.md for the complete banned phrase list") instead of direct quotation where possible.
- **Files modified:** agents/schema-designer.md, agents/context-engineer.md, agents/failure-analyst.md
- **Verification:** `node bin/arch-tools.js detect-stubs` returned `clean: true` for all three files after rephrasing
- **Committed in:** ac16a77, 2b2cd1a, 6cf75cb (each task's commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — detect-stubs false positive pattern on quoted banned phrases)
**Impact on plan:** The fix improved agent quality: referencing the banned phrase list by path is more robust than quoting banned phrases inline (future-proof if the list changes). No scope creep.

## Issues Encountered

detect-stubs tool matched any occurrence of banned phrases in the document body, including legitimate descriptive content that explains what the banned phrases are and why they are forbidden. This required rephrasing the constraint and failure mode sections to avoid quoting banned phrases literally while still communicating the prohibition clearly. Resolution: use meta-references (referencing the file that defines the list rather than inlining the list items).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three specialized agent specs are complete and pass detect-stubs with zero false positives
- schema-designer, context-engineer, and failure-analyst can be executed by execute-phase against any CONTEXT.md-described system
- Wave ordering is established: schema-designer (Wave 2), context-engineer (Wave 2), failure-analyst (Wave 3/4)
- Plan 03-06 (execute-phase workflow) is the only remaining Wave 1 plan in Phase 3; after it completes, Phase 3 is ready for end-to-end testing

## Self-Check: PASSED

All created files exist on disk:
- FOUND: agents/schema-designer.md
- FOUND: agents/context-engineer.md
- FOUND: agents/failure-analyst.md
- FOUND: .planning/phases/03-core-design-pipeline/03-05-SUMMARY.md

All task commits exist in git history:
- FOUND: ac16a77 (schema-designer)
- FOUND: 2b2cd1a (context-engineer)
- FOUND: 6cf75cb (failure-analyst)

---
*Phase: 03-core-design-pipeline*
*Completed: 2026-02-28*
