---
phase: 04-verification-integration-and-quality-gates
plan: "01"
subsystem: verification
tags: [arch-verifier, verification-patterns, arch-tools, VERIFICATION.md, adversarial-framing]

# Dependency graph
requires:
  - phase: 03-core-design-pipeline
    provides: arch-executor, arch-checker, execute-phase orchestrator — the pipeline that produces design documents which arch-verifier now checks
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: arch-tools.js verify commands, detect-stubs, scan-antipatterns — the programmatic check infrastructure arch-verifier calls

provides:
  - Complete arch-verifier agent spec (618 lines, all 7 XML sections populated)
  - Adversarial OUTPUT verification agent distinct from arch-checker (PLAN verifier)
  - 9-step execution pipeline calling arch-tools.js verify level1/2/3/4 and scan-antipatterns
  - VERIFICATION.md output format with frontmatter status field (passed/gaps_found/human_needed/failed)
  - 4 structured return states with literal JSON examples

affects: [04-02, 04-03, 04-04, 04-05, verify-phase workflow, arch-integrator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adversarial framing distinct from arch-checker: checks OUTPUTS not PLANS"
    - "9-step verification pipeline: orient -> locate docs -> L1 -> L2 -> L3 -> L4 -> scan-antipatterns -> write VERIFICATION.md -> return"
    - "Cumulative level exclusion: doc failing Level N excluded from Level N+1"
    - "Anti-pattern findings incorporated into VERIFICATION.md findings array (not separate report)"

key-files:
  created: []
  modified:
    - agents/arch-verifier.md  # Replaced Phase 1 stub with complete 618-line spec

key-decisions:
  - "arch-verifier checks OUTPUTS (design documents after execution); arch-checker checks PLANS (before execution) — frames must NEVER overlap"
  - "9-step execution flow: Level 1-4 checks are cumulative (failing doc excluded from next level); scan-antipatterns runs after Level 4 and results fold into VERIFICATION.md"
  - "FAILURE-04 (events.yaml missing) allows partial Level 4 run: agent-name and filename checks continue; event resolution checks skip with explicit notation in VERIFICATION.md"
  - "detect-stubs false positive (FAILURE-03) handled by context inspection of flagged line before recording as fail finding"

patterns-established:
  - "Verification agent framing: adversarial toward documents, not plans — distinct adversarial frames for distinct subjects"
  - "VERIFICATION.md frontmatter: phase, status, levels_run, timestamp — read by arch-integrator via frontmatter get command"
  - "Status values: passed, gaps_found, human_needed, failed — same 4-value constraint as arch-executor (decision [03-04])"

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 4 Plan 01: arch-verifier Agent Specification Summary

**Complete arch-verifier spec (618 lines) with adversarial OUTPUT verification framing, 9-step execution pipeline calling arch-tools.js verify commands, and VERIFICATION.md output with frontmatter status field**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T18:57:31Z
- **Completed:** 2026-03-02T19:02:52Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced Phase 1 stub (39 lines, all <!-- To be implemented --> placeholders) with complete 618-line spec
- Established adversarial framing distinct from arch-checker in first 3 sentences of role section: "These documents claim to be complete architecture artifacts — arch-verifier's job is to find every way they are NOT complete, NOT cross-referenced, and NOT internally consistent"
- Implemented 9-step execution pipeline: orient from STATE.md -> locate design/ docs -> Level 1 existence checks -> Level 2 substantive checks -> Level 3 cross-reference checks -> Level 4 graph consistency -> scan-antipatterns -> write VERIFICATION.md -> return structured JSON
- All 4 failure modes defined (no docs, tooling error, false positive, events.yaml missing) with trigger/manifestation/severity/recovery/detection fields

## Task Commits

Each task was committed atomically:

1. **Task 1: arch-verifier role, upstream_input, downstream_consumer, constraints** - `4f4ba73` (feat)
2. **Task 2: arch-verifier execution_flow, structured_returns, failure_modes** - `c61cc40` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `agents/arch-verifier.md` - Complete arch-verifier agent spec replacing Phase 1 stub; 618 lines; all 7 XML sections; adversarial OUTPUT framing; 9-step pipeline; 4 structured returns; 4 failure modes

## Decisions Made

- arch-verifier adversarial frame is deliberately distinct from arch-checker: "is this document complete and internally consistent?" vs arch-checker's "will this plan fail during execution?" — separate failure domains with separate subjects
- Level 2 agent spec section check uses XML tags (not ## headers) because STATE.md decision [03-01] established XML section format for all Phase 3+ agent specs
- events.yaml absence (FAILURE-04) allows partial Level 4 run rather than total Level 4 skip — agent-name resolution and filename checks still run without events.yaml
- scan-antipatterns results are incorporated into VERIFICATION.md findings array, not reported separately — ensures single artifact for all verification output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- arch-verifier spec is complete and ready for use by /arch-gsd:verify-phase workflow
- Phase 4 plans 04-02 through 04-05 can proceed — they implement arch-integrator, quality gates, and verification tooling
- detect-stubs returns clean: true; wc -l = 618 (well above 200-line minimum); all 7 XML sections populated

---
*Phase: 04-verification-integration-and-quality-gates*
*Completed: 2026-03-02*
