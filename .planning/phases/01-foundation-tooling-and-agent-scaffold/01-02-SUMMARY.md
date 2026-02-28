---
phase: 01-foundation-tooling-and-agent-scaffold
plan: 02
subsystem: tooling
tags: [cli, nodejs, frontmatter, yaml, validation, stub-detection, state-management]

requires:
  - phase: 01-01
    provides: project scaffold (bin/ dir, agents/, config.json, .planning/ structure)

provides:
  - bin/arch-tools.js CLI with frontmatter CRUD (get/set/merge)
  - Stub detection scanning document bodies for 11 patterns
  - Phase state management (init/transition/status) on .planning/STATE.md
  - CONTEXT.md validation (6 required fields, non-empty lists)
  - Naming convention validation (kebab-case agents, PascalCase events, SCREAMING_SNAKE commands)
  - loadConfig reading .planning/config.json with defaults

affects:
  - All Phase 2+ agents that invoke arch-tools.js via Bash tool calls
  - Any workflow that reads/writes frontmatter on agent specs or plan files
  - CONTEXT.md creation and validation in discuss-system agent
  - Phase state tracking throughout all phases

tech-stack:
  added: []
  patterns:
    - "Zero-dependency CLI: only fs, path, child_process built-ins"
    - "JSON-to-stdout output contract: all commands emit structured JSON, exit 0/1"
    - "YAML frontmatter round-trip: extractFrontmatter -> modify -> reconstructFrontmatter -> spliceFrontmatter"
    - "Strip-frontmatter-before-scan: stub/name detection operates on body only"
    - "findProjectRoot: walks up directory tree looking for .planning/ to support running from any subdir"

key-files:
  created:
    - bin/arch-tools.js
  modified: []

key-decisions:
  - "Frontmatter regex parser (not a YAML library) mirrors GSD pattern - zero npm dependencies, handles all patterns in agent specs"
  - "validate-names uses heuristic (agents/ path, model/tools/description frontmatter fields) to identify agent spec files vs other markdown"
  - "detect-stubs strips frontmatter before scanning - frontmatter may legitimately use placeholder values during drafting"
  - "State commands use regex-based field updates on STATE.md rather than full parse/rewrite to preserve document formatting"

patterns-established:
  - "Command output contract: { errorField: value } to stderr + exit 1; result object to stdout + exit 0"
  - "Naming detection: look back 5 lines + forward 2 lines from name: field for type: context"

duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 2: arch-tools.js CLI Utility Summary

**Regex-based YAML frontmatter CRUD CLI with stub detection, phase state management, CONTEXT.md validation, and naming convention enforcement — zero npm dependencies, JSON-to-stdout output contract**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T05:54:01Z
- **Completed:** 2026-02-28T05:57:54Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Complete `bin/arch-tools.js` (1039 lines) with all 9 Phase 1 command exports
- Frontmatter CRUD round-trips correctly on all agent spec files (handles nested YAML, inline arrays, multi-line arrays)
- Stub detection finds 11 patterns in document bodies while ignoring frontmatter
- Phase state management reads/writes `.planning/STATE.md` with regex-based field updates
- validate-context rejects CONTEXT.md with missing fields or empty required lists
- validate-names catches non-kebab-case agent names, non-PascalCase event names, non-SCREAMING_SNAKE command names

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Implement arch-tools.js (all Phase 1 commands)** - `de28d4d` (feat)

## Files Created/Modified

- `/home/mkali/Claude_Code/best-practices/bin/arch-tools.js` - Complete CLI utility with frontmatter CRUD, stub detection, state management, context and naming validation

## Decisions Made

- Used GSD's `extractFrontmatter`/`reconstructFrontmatter`/`spliceFrontmatter` pattern directly — proven approach, handles all YAML patterns in agent specs without dependencies
- Agent spec heuristic: file is treated as agent spec if it's in `agents/` directory OR has `model:`, `tools:`, or `description:` frontmatter fields — this correctly identifies all 11 agent stubs
- Naming detection uses ±5 line context window around `name:` fields to find associated `type:` declarations — handles both `type: event` + `name: X` and `- type: event` + `name: X` YAML patterns
- State management writes regex-targeted field replacements to STATE.md rather than full document rewrite — preserves existing content formatting and all surrounding context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed event type detection regex to handle list-item YAML format**
- **Found during:** Task 2 (validate-names implementation)
- **Issue:** Initial regex `/^\s*type:\s*(\S+)/` did not match `- type: event` (list item format); event naming violations were not detected
- **Fix:** Updated regex to `/^\s*-?\s*type:\s*(\S+)/` and similarly for `name:` lookups
- **Files modified:** bin/arch-tools.js
- **Verification:** `validate-names /tmp/test-event.md` correctly flags `myEventBadCase` as PascalCase violation
- **Committed in:** de28d4d (task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix for correct event naming validation. No scope creep.

## Issues Encountered

None beyond the auto-fixed regex bug above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `arch-tools.js` is ready for immediate use by Phase 2 agents via `node bin/arch-tools.js <command>`
- All 9 command groups from plan exports list are implemented and verified
- Phase 2 agents (discuss-system, context-engineer) can call `validate-context` and `validate-names` programmatically
- `frontmatter get/set/merge` supports automated frontmatter updates as agent stubs are expanded
- State management supports phase tracking as implementation progresses through phases 2-5

---
*Phase: 01-foundation-tooling-and-agent-scaffold*
*Completed: 2026-02-28*
