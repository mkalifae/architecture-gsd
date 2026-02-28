---
phase: 01-foundation-tooling-and-agent-scaffold
plan: "01"
subsystem: infra
tags: [plugin, scaffold, agents, workflows, config, model-profiles]

# Dependency graph
requires: []
provides:
  - plugin.json manifest with arch-gsd name and agents/workflows paths
  - config.json with three model profiles (quality/balanced/budget) per FOUN-08
  - 11 agent stubs with final-correct frontmatter (name, description, tools, model, color)
  - 6 workflow stubs with slash command frontmatter (description, allowed-tools)
  - bin/, templates/, references/ directories tracked by git
affects:
  - 01-02-PLAN (arch-tools.js reads config.json model_profiles)
  - 01-03-PLAN (naming conventions reference agent frontmatter)
  - 01-04-PLAN (templates and references directories ready)
  - All Phase 2-5 agents (inherit frontmatter from stubs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "plugin.json: Claude Code plugin manifest with name namespace and commands/agents directories"
    - "config.json: three-tier model profiles (quality/balanced/budget) for per-agent model routing"
    - "Agent stubs: complete YAML frontmatter with placeholder XML section bodies"
    - "Workflow stubs: slash command frontmatter with allowed-tools, description, optional argument-hint"

key-files:
  created:
    - plugin.json
    - config.json
    - agents/discuss-system.md
    - agents/arch-researcher.md
    - agents/arch-roadmapper.md
    - agents/arch-planner.md
    - agents/arch-checker.md
    - agents/arch-executor.md
    - agents/arch-verifier.md
    - agents/arch-integrator.md
    - agents/context-engineer.md
    - agents/schema-designer.md
    - agents/failure-analyst.md
    - workflows/new-system.md
    - workflows/execute-phase.md
    - workflows/plan-phase.md
    - workflows/verify-phase.md
    - workflows/progress.md
    - workflows/resume.md
    - bin/.gitkeep
    - templates/.gitkeep
    - references/.gitkeep
  modified: []

key-decisions:
  - "Balanced model profile IS the FOUN-08 allocation: opus for discuss-system/arch-roadmapper/context-engineer, sonnet for 6 design agents, haiku for arch-checker/arch-integrator"
  - "Agent stubs have complete final-correct frontmatter from day 1 so Phase 2+ agents inherit correct routing without rework"
  - "Workflow stubs have correct slash command frontmatter so /arch-gsd:* commands are invocable from Phase 2 onward"
  - "Three config profiles (quality/balanced/budget) follow GSD pattern; quality and balanced have identical assignments in v1"

patterns-established:
  - "Pattern: Agent stub format — YAML frontmatter with name/description/tools/model/color + XML section placeholders"
  - "Pattern: Workflow stub format — YAML frontmatter with description/allowed-tools/optional argument-hint + one-liner body"
  - "Pattern: config.json model_profiles — flat agent-name:model-tier lookup per profile tier"

# Metrics
duration: 2min
completed: "2026-02-28"
---

# Phase 1 Plan 01: Project Scaffold and Stub Files Summary

**plugin.json + config.json + 11 agent stubs with FOUN-08 model assignments + 6 workflow stubs with slash command frontmatter + directory skeleton (bin/, templates/, references/)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T05:49:51Z
- **Completed:** 2026-02-28T05:51:59Z
- **Tasks:** 2
- **Files modified:** 22 (21 created + 0 modified)

## Accomplishments

- plugin.json manifest enabling Claude Code to load arch-gsd as a plugin with /arch-gsd:* commands
- config.json with three model profiles (quality/balanced/budget); balanced profile matches FOUN-08 exactly (opus for discuss-system, arch-roadmapper, context-engineer; sonnet for 6 design agents; haiku for arch-checker, arch-integrator)
- 11 agent stubs with complete final-correct frontmatter (name, description, tools, model, color) and XML section placeholder bodies
- 6 workflow stubs with slash command frontmatter (description, allowed-tools, argument-hint where applicable)
- bin/, templates/, references/ directories created and tracked by git

## Task Commits

Each task was committed atomically:

1. **Task 1: Create plugin manifest, config, and directory skeleton** - `46ebeb3` (feat)
2. **Task 2: Create 11 agent stubs and 6 workflow stubs with final-correct frontmatter** - `b222a07` (feat)

**Plan metadata:** _(to be committed)_

## Files Created/Modified

- `plugin.json` - Claude Code plugin manifest; name "arch-gsd" namespaces all slash commands
- `config.json` - Three-tier model profiles with FOUN-08 balanced allocation; workflow flags
- `agents/discuss-system.md` - Opus agent stub; intake and intent extraction
- `agents/arch-researcher.md` - Sonnet agent stub; research with WebFetch tool
- `agents/arch-roadmapper.md` - Opus agent stub; derives design phases from CONTEXT.md
- `agents/arch-planner.md` - Sonnet agent stub; produces PLAN.md files
- `agents/arch-checker.md` - Haiku agent stub; adversarial PLAN.md review
- `agents/arch-executor.md` - Sonnet agent stub; writes dual-format architecture documents
- `agents/arch-verifier.md` - Sonnet agent stub; four-level verification stack
- `agents/arch-integrator.md` - Haiku agent stub; cross-phase consistency validation
- `agents/context-engineer.md` - Opus agent stub; context flow map design
- `agents/schema-designer.md` - Sonnet agent stub; typed event/command schemas
- `agents/failure-analyst.md` - Sonnet agent stub; failure mode catalogs
- `workflows/new-system.md` - /arch-gsd:new-system stub
- `workflows/execute-phase.md` - /arch-gsd:execute-phase stub
- `workflows/plan-phase.md` - /arch-gsd:plan-phase stub
- `workflows/verify-phase.md` - /arch-gsd:verify-phase stub
- `workflows/progress.md` - /arch-gsd:progress stub
- `workflows/resume.md` - /arch-gsd:resume stub
- `bin/.gitkeep` - Tracks bin/ directory for arch-tools.js (Plan 01-02)
- `templates/.gitkeep` - Tracks templates/ directory for Plan 01-04
- `references/.gitkeep` - Tracks references/ directory for Plan 01-04

## Decisions Made

- **Balanced = FOUN-08 allocation:** The balanced profile in config.json is identical to FOUN-08 spec. The quality profile also uses all opus/sonnet (no haiku for verification agents) in v1 — this is intentional since quality means more powerful models, not different routing. Budget profile uses haiku more aggressively.
- **No model:inherit on any stub:** All stubs have explicit model assignments so Phase 2+ agents are routed correctly immediately without config lookup fallback.
- **Three-profile structure:** Mirrors GSD's pattern exactly. Makes model switching a config change, not a code change.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Plan 01-02: arch-tools.js implementation. The bin/ directory exists; config.json has model_profiles for arch-tools.js to read.
- Ready for Plan 01-03: Naming conventions document. The agents/ directory exists with agent names to reference.
- Ready for Plan 01-04: Templates and references. The templates/ and references/ directories exist.
- All 11 agent stub frontmatter is final-correct — Phase 2+ can implement body content without touching frontmatter.

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git log:
- `46ebeb3` feat(01-01): create plugin manifest, config, and directory skeleton — FOUND
- `b222a07` feat(01-01): create 11 agent stubs and 6 workflow stubs with final-correct frontmatter — FOUND

---
*Phase: 01-foundation-tooling-and-agent-scaffold*
*Completed: 2026-02-28*
