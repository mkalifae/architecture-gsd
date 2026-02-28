---
phase: 03-core-design-pipeline
plan: "01"
subsystem: agent-specs
tags: [arch-researcher, arch-roadmapper, agent-spec, design-pipeline, wave-based, WebFetch, Context7, RESEARCH.md, ROADMAP.md]

# Dependency graph
requires:
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: agent stub files with correct frontmatter that this plan replaces with full bodies
  - phase: 01-foundation-tooling-and-agent-scaffold
    provides: arch-tools.js with detect-stubs and frontmatter commands used for verification
provides:
  - Complete arch-researcher agent spec (319 lines, 7 XML sections) — Wave 1 researcher that produces .arch/RESEARCH.md from WebFetch + Context7 research
  - Complete arch-roadmapper agent spec (346 lines, 7 XML sections) — Wave 1 roadmapper that produces .arch/ROADMAP.md with 3/5/7-phase complexity-adaptive structure
affects: [03-02-arch-planner, 03-03-arch-checker, 03-04-arch-executor, 03-06-execute-phase-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent spec body uses XML tags (<role>, <upstream_input>, etc.) matching discuss-system.md pattern — not ## markdown headers"
    - "detect-stubs tool flags example values within failure mode descriptions — rephrase to avoid false positives"
    - "Complexity signal: scale.agents drives 3/5/7-phase roadmap structure as a core roadmapper design rule"

key-files:
  created: []
  modified:
    - agents/arch-researcher.md
    - agents/arch-roadmapper.md

key-decisions:
  - "arch-researcher surfaces options+tradeoffs only, never mandates — 'should' must always present alternatives"
  - "arch-roadmapper defaults to 5-phase when scale.agents is unparseable — balanced conservative default"
  - "arch-roadmapper FAILURE-02: missing RESEARCH.md falls back to default wave ordering, no escalation — default is safe for all domains"
  - "Agent spec XML format matches existing discuss-system.md pattern (not ## markdown headers from template)"

patterns-established:
  - "Pattern: failure mode descriptions should avoid stub-flagged words (placeholder, TBD) even in example values — use synonyms"
  - "Pattern: Wave 1 agents (arch-researcher, arch-roadmapper) are the two agents that run without dependencies in every design run"

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 3 Plan 01: arch-researcher and arch-roadmapper Agent Specs Summary

**Full Wave 1 design pipeline agents implemented: arch-researcher (WebFetch/Context7 research → RESEARCH.md) and arch-roadmapper (complexity-adaptive 3/5/7-phase derivation → ROADMAP.md)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T19:58:35Z
- **Completed:** 2026-02-28T20:05:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced arch-researcher Phase 1 stub with 319-line complete agent contract covering all 7 XML sections, including 8-step execution flow (orient → load context → derive queries → WebFetch research → version validation → synthesize 10 RESEARCH.md sections → write → return JSON)
- Replaced arch-roadmapper Phase 1 stub with 346-line complete agent contract covering all 7 XML sections, including 10-step execution flow with complexity-adaptive phase count (3/5/7 based on scale.agents), DAG validation, artifact coverage check, and wave structure computation
- Both agents now reference the correct upstream chain: arch-researcher → RESEARCH.md → arch-roadmapper → ROADMAP.md → arch-planner

## Task Commits

Each task was committed atomically:

1. **Task 1: arch-researcher agent spec** - `8538d75` (feat)
2. **Task 2: arch-roadmapper agent spec** - `8e410bd` (feat)
3. **Fix: stub-pattern false positives** - `9169319` (fix — detect-stubs flagging example values in failure modes)

## Files Created/Modified

- `agents/arch-researcher.md` — Full agent spec: reads CONTEXT.md for domain signal, executes WebFetch + Context7 research, synthesizes 10-section RESEARCH.md, returns structured JSON with confidence level
- `agents/arch-roadmapper.md` — Full agent spec: reads CONTEXT.md + RESEARCH.md, determines 3/5/7-phase count from scale.agents, validates phase DAG and actor coverage, writes ROADMAP.md, returns structured JSON

## Decisions Made

- Agent spec body format uses XML tags (`<role>`, `<upstream_input>`, etc.) matching the existing discuss-system.md pattern, not `##` markdown headers from the template — this was discovered by inspecting the discuss-system.md reference implementation
- arch-researcher does not make architectural decisions — every technology mention must present alternatives; "should" is banned in the context of mandating a choice
- arch-roadmapper defaults to 5-phase when scale.agents is unparseable — 5-phase is the balanced middle ground that arch-planner can always decompose from
- FAILURE-02 for arch-roadmapper (RESEARCH.md missing) does not escalate — the default wave ordering (schemas → agents → topology → failure modes) is universally safe

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed detect-stubs false positives in failure mode descriptions**
- **Found during:** Task 1 and Task 2 (verification step after each task)
- **Issue:** detect-stubs flagged "placeholder" (arch-researcher FAILURE-02 and FAILURE-03) and "TBD" (arch-roadmapper FAILURE-03) used as example values within the failure mode descriptions, not as actual stub markers
- **Fix:** Replaced "placeholders" → "filler entries", "placeholder text" → "skeletal text", "TBD" example value → "unspecified" in the three affected lines
- **Files modified:** agents/arch-researcher.md, agents/arch-roadmapper.md
- **Verification:** `node bin/arch-tools.js detect-stubs agents/arch-researcher.md` and `...arch-roadmapper.md` both return `"clean": true, "stubs_found": 0`
- **Committed in:** `9169319` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor rephrasing only — no behavioral change to agent specs. detect-stubs is a positive check that the project already uses; this fix ensures future runs remain clean.

## Issues Encountered

- Discovered that existing agent specs (discuss-system.md) use XML tag format (`<role>`) rather than `## Role` markdown headers from templates/agent-spec.md. Had to rewrite the first draft of arch-researcher.md to use the correct XML format before committing. This is now documented in patterns-established.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- arch-researcher and arch-roadmapper are complete and immediately usable by execute-phase workflow
- arch-planner (03-02) and arch-checker (03-03) specs already have SUMMARY.md files — those plans were executed in parallel
- Remaining: arch-executor (03-04), specialized agents (03-05), and execute-phase workflow (03-06)
- No blockers for remaining Phase 3 plans

---
*Phase: 03-core-design-pipeline*
*Completed: 2026-02-28*
