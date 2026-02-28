---
phase: 03-core-design-pipeline
plan: "04"
subsystem: agent-spec
tags: [arch-executor, agent-spec, dual-format, topology, deviation-rules, detect-stubs, validate-names]

requires:
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: arch-executor.md stub with frontmatter, bin/arch-tools.js (detect-stubs, validate-names), templates/agent-spec.md, templates/event-schema.yaml, templates/failure-modes.md, references/agent-spec-format.md

provides:
  - Full arch-executor agent spec with all 7 XML sections populated (596 lines, no stubs)
  - Dual-format output protocol for all 5 document types (agent-contract, event-schema, topology, context-flow, failure-catalog)
  - Explicit OUTP-03 topology production logic with Mermaid diagram, channel table, and YAML adjacency list
  - 4 deviation rules (auto-complete, auto-document, auto-flag, STOP) with canonical YAML block
  - 4 failure modes with trigger/manifestation/severity/recovery/detection per mode

affects:
  - 03-core-design-pipeline (all remaining plans that invoke or reference arch-executor)
  - Phase 4 arch-verifier (uses arch-executor output format as verification target)
  - Phase 4 arch-integrator (reads YAML canonical blocks from arch-executor output)

tech-stack:
  added: []
  patterns:
    - XML section format for agent specs (matching discuss-system and other completed agents)
    - Dual-format output protocol: markdown prose + embedded YAML canonical blocks per section
    - Post-write validation gates: detect-stubs then validate-names before returning complete status
    - Deviation rules as named, numbered protocol within agent spec body

key-files:
  created: []
  modified:
    - agents/arch-executor.md  # Full implementation replacing Phase 1 stub (596 lines)

key-decisions:
  - "arch-executor uses XML section tags (<role>, <upstream_input>, etc.) matching discuss-system format — not markdown ## headers from template scaffold"
  - "Topology production for OUTP-03 includes three required artifacts: Mermaid dependency graph, communication channels table, and YAML adjacency list — all in a single topology document"
  - "detect-stubs gate prevents returning status: complete if any stub phrases remain — up to 2 correction iterations then falls back to gaps_found"
  - "Deviation rules embedded within agent spec body (not separate from it) so arch-executor instances read their own behavioral rules at execution time"
  - "Four status values only: complete, gaps_found, human_needed, failed — no success or error variants"

patterns-established:
  - "Canonical YAML blocks in every section: each prose section has a sibling YAML canonical block with machine-checkable fields"
  - "One document per invocation: arch-executor instances are task-scoped, not phase-scoped"
  - "Hard validation gates: detect-stubs and validate-names are not warnings but blockers to complete status"

duration: 7min
completed: 2026-02-28
---

# Phase 3 Plan 04: arch-executor Agent Specification Summary

**Full arch-executor agent spec with 10-step execution flow covering 5 document types in dual-format (prose + YAML), 4 deviation rules, and 4 concrete failure modes — replacing the Phase 1 stub**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T19:58:56Z
- **Completed:** 2026-02-28T20:06:44Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced Phase 1 stub body in `agents/arch-executor.md` with complete 596-line specification — all 7 XML sections populated, zero stubs detected
- Wrote dual-format output protocol for all 5 document types: agent-contract (7 sections), event-schema (pure YAML with banned types), topology (OUTP-03: Mermaid + channel table + adjacency list), context-flow (per-agent table + bottleneck analysis), failure-catalog (3 required sections)
- Implemented 4 deviation rules as a structured behavioral protocol: Rule 1 (auto-complete ambiguity), Rule 2 (auto-document choices), Rule 3 (auto-flag CONTEXT.md gaps), Rule 4 (STOP on contradictions)
- Specified 4 failure modes (FAILURE-01 through FAILURE-04) with trigger/manifestation/severity/recovery/detection
- Defined 4 structured return states with literal JSON examples: complete, gaps_found, human_needed, failed

## Task Commits

Each task was committed atomically:

1. **Task 1: arch-executor role, inputs, consumers, constraints, and deviation rules** - `2e7ae95` (feat)
2. **Task 2: arch-executor execution_flow, structured_returns, and failure_modes** - `a0ecea6` (feat)

## Files Created/Modified

- `/home/mkali/Claude_Code/best-practices/agents/arch-executor.md` — Full arch-executor agent spec, 596 lines, replacing Phase 1 stub

## Decisions Made

- **XML section format:** arch-executor uses XML tags (`<role>`, `<upstream_input>`, etc.) matching the format of `discuss-system.md` and other completed agents — NOT the markdown `##` headers from `templates/agent-spec.md`. The template is what arch-executor produces for design documents; the agent spec itself uses the XML format.
- **OUTP-03 topology production:** The topology section specifies three required artifacts: (1) Mermaid `graph TD/LR` dependency diagram, (2) communication channels table with From-Agent/To-Agent/Mechanism/Data-Type/Direction columns, and (3) dual-format YAML adjacency list with nodes and edges.
- **detect-stubs as hard gate:** detect-stubs blocks `status: "complete"` — up to 2 correction iterations before falling back to `status: "gaps_found"`. This prevents silently returning incomplete documents.
- **Four status values:** `complete`, `gaps_found`, `human_needed`, `failed` — no `success` or `error` variants to prevent status value drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Auto-Complete] Used XML section format instead of markdown headers**
- **Found during:** Task 1 (writing role, inputs, consumers)
- **Issue:** Initial write used markdown `## Role`, `## Upstream Input` headers, but checking `discuss-system.md` (the only other completed full agent spec) revealed XML tags (`<role>`, `<upstream_input>`) are the established format for agent specs in this codebase
- **Fix:** Rewrote entire document using XML section tags to match the established pattern. The plan says "7 XML sections" which confirmed the XML format is correct.
- **Files modified:** agents/arch-executor.md
- **Verification:** `grep "<role>" agents/arch-executor.md` returns match; all other XML section tags present
- **Committed in:** a0ecea6 (Task 2 commit, full rewrite)

**2. [Rule 1 - Auto-Complete] Avoided stub detector false positives in instructional content**
- **Found during:** Task 2 (writing failure modes section)
- **Issue:** Instructional text describing *banned* phrases (e.g., "do not write 'handles gracefully'") triggered detect-stubs itself
- **Fix:** Rephrased references to banned phrases as "vague escalation language" or "stub phrases that detect-stubs flags" rather than quoting them verbatim
- **Files modified:** agents/arch-executor.md
- **Verification:** `node bin/arch-tools.js detect-stubs agents/arch-executor.md` returns `clean: true`
- **Committed in:** a0ecea6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 auto-complete)
**Impact on plan:** Both auto-fixes required for format consistency and tooling compatibility. No scope creep.

## Issues Encountered

None — plan executed cleanly with format corrections handled via deviation rules.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `agents/arch-executor.md` is a complete, executable agent spec ready for Phase 4 arch-verifier validation
- arch-executor can be spawned by execute-phase orchestrator for any Phase 3 design task
- All 5 document types have production logic — arch-executor is the workhorse ready to produce design/ artifacts
- OUTP-03 topology production is explicitly specified — topology tasks assigned by arch-planner will produce the required TOPOLOGY.md

## Self-Check: PASSED

- `agents/arch-executor.md` — FOUND (596 lines)
- `.planning/phases/03-core-design-pipeline/03-04-SUMMARY.md` — FOUND
- Commit `2e7ae95` (Task 1) — FOUND in git log
- Commit `a0ecea6` (Task 2) — FOUND in git log

---
*Phase: 03-core-design-pipeline*
*Completed: 2026-02-28*
