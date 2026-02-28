---
phase: 01-foundation-tooling-and-agent-scaffold
plan: 03
subsystem: documentation
tags: [naming-conventions, context-schema, validation, arch-tools, PascalCase, kebab-case, SCREAMING_SNAKE]

requires:
  - phase: 01-01
    provides: plugin scaffold, directory structure, references/ directory

provides:
  - Canonical naming conventions document with regex patterns for PascalCase events, kebab-case agents, SCREAMING_SNAKE commands
  - Complete CONTEXT.md schema specification with all 6 required fields, nesting, validation rules, complete example, and anti-patterns
  - Machine-checkable contracts that arch-tools.js validate-names and validate-context enforce

affects:
  - 01-02 (arch-tools.js validate-names and validate-context implement these specs)
  - 02-01 (discuss-system produces CONTEXT.md against context-schema.md)
  - 03-01 (arch-executor writes agent specs against naming-conventions.md)
  - all phases (naming conventions apply to all agent names, event names, command names)

tech-stack:
  added: []
  patterns:
    - "Machine-checkable specification pattern: reference documents contain exact regex patterns and validation rules, not just prose descriptions"
    - "Schema-contract pattern: CONTEXT.md schema defined in Phase 1 as a complete contract, preventing Phase 2 revision of Phase 1 artifacts"
    - "Cross-reference pattern: reference documents explicitly cite the arch-tools.js commands that enforce their rules"

key-files:
  created:
    - references/naming-conventions.md
    - references/context-schema.md
  modified: []

key-decisions:
  - "CONTEXT.md schema defines all 6 fields as the complete Phase 2 contract — no revision needed when discuss-system is implemented"
  - "scale field is a structured YAML object (not a flat string) — enables programmatic reasoning about agents/throughput/latency"
  - "locked-decisions can be empty array (unlike non-goals) — a system may have no pre-made architectural decisions at intake time"
  - "naming-conventions.md contains exact regex patterns identical to those in arch-tools.js — document IS the spec, not a summary of it"

patterns-established:
  - "Reference document as machine contract: every spec doc must contain regex patterns or field type specs, not vague prose"
  - "Anti-patterns section: every schema document includes common invalid patterns to prevent Phase 2+ mistakes"

duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 03: Naming Conventions and CONTEXT.md Schema Summary

**Two locked machine-checkable contracts: PascalCase/kebab-case/SCREAMING_SNAKE naming conventions with regex patterns, and complete 6-field CONTEXT.md schema with nesting, validation rules, example, and anti-patterns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T05:54:00Z
- **Completed:** 2026-02-28T05:57:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `references/naming-conventions.md` — 244-line canonical contract with exact regex patterns (`^[A-Z][a-zA-Z0-9]*$` for events, `^[a-z][a-z0-9-]*$` for agents, `^[A-Z][A-Z0-9_]*$` for commands), scope rules for each convention, compound file/directory naming rules, and rationale section
- Created `references/context-schema.md` — 502-line complete Phase 2 contract defining all 6 required CONTEXT.md fields with types, nested structures, validation rules, a complete working example (task orchestration system), 6 anti-patterns with fixes, and explicit `validate-context` JSON output spec

## Task Commits

Each task was committed atomically:

1. **Task 1: Create canonical naming conventions document** - `16d71fe` (docs)
2. **Task 2: Create CONTEXT.md schema specification document** - `da1cbd0` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `references/naming-conventions.md` — Canonical naming rules with regex patterns, scope rules, compound naming, examples, and rationale. Enforced by `arch-tools.js validate-names`.
- `references/context-schema.md` — Complete CONTEXT.md field schema with types, nesting (scale object, locked-decisions items), validation rules, complete example, anti-patterns, and relationship to `arch-tools.js validate-context`.

## Decisions Made

- CONTEXT.md schema defines all 6 fields as the complete Phase 2 contract. No revision needed when `discuss-system` is implemented in Phase 2 — the schema is fully specified including edge cases (empty `locked-decisions` is valid; empty `non-goals` is always invalid).
- `scale` is a structured YAML object with three sub-fields (`agents`, `throughput`, `latency`), not a flat string. This enables `validate-context` to confirm object type and enables `arch-planner` to reason programmatically about scale parameters.
- `locked-decisions` may be an empty array (unlike `non-goals` which must have >= 1 item). Rationale: a system may legitimately have no pre-made architectural decisions at intake time; this is different from non-goals, where every system has explicit exclusions.
- Naming convention regex patterns in `naming-conventions.md` are identical to those documented in `01-RESEARCH.md` and to the patterns that `arch-tools.js validate-names` implements — the document is the spec, not a summary.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `references/naming-conventions.md` is ready for 01-02 (arch-tools.js validate-names implements these regex patterns) and all design phases (arch-executor, schema-designer write against these conventions)
- `references/context-schema.md` is ready for 01-02 (arch-tools.js validate-context implements these validation rules) and Phase 2 (discuss-system produces CONTEXT.md against this schema)
- Both documents cross-reference their enforcing commands in `arch-tools.js`, creating a clear contract between tooling and documentation

## Self-Check: PASSED

- FOUND: references/naming-conventions.md
- FOUND: references/context-schema.md
- FOUND: .planning/phases/01-foundation-tooling-and-agent-scaffold/01-03-SUMMARY.md
- FOUND commit: 16d71fe (docs(01-03): create canonical naming conventions document)
- FOUND commit: da1cbd0 (docs(01-03): create CONTEXT.md schema specification document)

---
*Phase: 01-foundation-tooling-and-agent-scaffold*
*Completed: 2026-02-28*
