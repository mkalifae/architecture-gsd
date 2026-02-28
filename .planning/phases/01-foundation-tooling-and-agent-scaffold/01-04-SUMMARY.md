---
phase: 01-foundation-tooling-and-agent-scaffold
plan: 04
subsystem: templates-and-references
tags: [agent-spec, event-schema, failure-modes, verification, schema-patterns, arch-checker, arch-verifier]

requires:
  - phase: 01-01
    provides: "plugin scaffold, directory structure, agent stubs with frontmatter, config.json"

provides:
  - "templates/agent-spec.md — 7-section agent contract scaffold with per-section content expectations and banned phrase rules"
  - "templates/event-schema.yaml — typed event/command schema scaffold banning any/object/data/mixed types"
  - "templates/failure-modes.md — failure mode catalog scaffold requiring concrete Immediate+Escalation recovery actions"
  - "references/agent-spec-format.md — arch-checker rubric with COMPLETE/INCOMPLETE examples for all 7 sections"
  - "references/verification-patterns.md — 4-level verification stack with exact check descriptions and result JSON format"
  - "references/schema-patterns.md — typing rules, versioning semantics, error case requirements, 10 anti-patterns"

affects:
  - "Phase 2 — arch-executor uses templates as scaffolds; arch-checker uses references as rubric"
  - "Phase 3 — arch-planner uses verification-patterns.md to understand Level 3-4 wiring requirements"
  - "Phase 4 — arch-verifier implements the 4-level stack described in verification-patterns.md"

tech-stack:
  added: []
  patterns:
    - "Content expectations encoded as HTML comments within templates — verification rules co-located with scaffold"
    - "COMPLETE/INCOMPLETE section examples in references — gives arch-checker concrete pass/fail benchmarks"
    - "Banned phrase lists per-section — machine-detectable quality gates for arch-checker and arch-tools.js detect-stubs"

key-files:
  created:
    - templates/agent-spec.md
    - templates/event-schema.yaml
    - templates/failure-modes.md
    - references/agent-spec-format.md
    - references/verification-patterns.md
    - references/schema-patterns.md
  modified: []

key-decisions:
  - "Templates encode verification rules as HTML comments within sections — co-location makes rules discoverable by arch-checker without separate lookup"
  - "References use COMPLETE/INCOMPLETE side-by-side examples rather than prose-only descriptions — arch-checker needs concrete benchmarks, not abstract principles"
  - "Verification levels defined incrementally (L1 exists, L2 substantive, L3 cross-referenced, L4 consistent) with exact check descriptions — arch-verifier Phase 4 implementation can treat this as a specification"
  - "Banned type list in event-schema.yaml is exhaustive (any, object without fields, data, mixed, unknown, arbitrary) — prevents any ambiguous typing that breaks programmatic validation"

patterns-established:
  - "Template pattern: scaffold sections contain HTML comments with min_lines, banned phrases, GOOD/BAD examples"
  - "Reference pattern: canonical spec with COMPLETE/INCOMPLETE paired examples, anti-patterns section, verification level table"
  - "Schema pattern: ALLOWED types list + BANNED types list with explicit rationale for each ban"

duration: 8min
completed: 2026-02-28
---

# Phase 1 Plan 4: Templates and Reference Documents Summary

**Three design document templates with per-section content expectations and three reference documents defining the 4-level verification stack, agent spec rubric, and schema typing contract**

## Performance

- **Duration:** 8 minutes
- **Started:** 2026-02-28T05:54:31Z
- **Completed:** 2026-02-28T06:02:00Z
- **Tasks:** 2 of 2
- **Files modified:** 6 created

## Accomplishments

- Created three templates (agent-spec.md, event-schema.yaml, failure-modes.md) with verification rules encoded as HTML comments within each section — arch-checker can read the template to know what "substantive" means per section
- Created references/agent-spec-format.md with COMPLETE/INCOMPLETE side-by-side examples for all 7 required sections — arch-checker has a concrete rubric, not abstract guidelines
- Created references/verification-patterns.md defining all 4 levels with exact check descriptions, result JSON format, and incremental run guidance — arch-verifier Phase 4 can treat this as an implementation specification
- Created references/schema-patterns.md with exhaustive ALLOWED/BANNED type lists, versioning semantics, complete event and command examples, and 10 anti-patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create design document templates with content expectations** - `dfbb7ce` (feat)
2. **Task 2: Create three references/ documents** - `742eec2` (feat)

## Files Created/Modified

- `templates/agent-spec.md` (183 lines) — 7-section agent contract scaffold; each section has HTML comment with min_lines, banned phrases (TBD, handles gracefully, as needed), GOOD/BAD examples
- `templates/event-schema.yaml` (110 lines) — typed event/command schema scaffold; ALLOWED types list (string, integer, float, boolean, array<type>, object{fields}, enum[values]); BANNED types list (any, object, data, mixed, unknown, arbitrary)
- `templates/failure-modes.md` (125 lines) — failure mode catalog scaffold; requires 5-field structure per mode (Trigger, Manifestation, Severity, Recovery with Immediate+Escalation, Detection); bans "handles gracefully" in Recovery
- `references/agent-spec-format.md` (284 lines) — canonical rubric for agent spec completeness; frontmatter field table; per-section requirements; COMPLETE/INCOMPLETE examples for Role, Upstream Input, Execution Flow, Structured Returns; anti-patterns list
- `references/verification-patterns.md` (268 lines) — 4-level verification stack; Level 1 (exists), Level 2 (substantive: line count + required sections + no stubs + frontmatter), Level 3 (cross-referenced: orphan detection), Level 4 (internally consistent: name resolution + cycle detection); result JSON format
- `references/schema-patterns.md` (337 lines) — event/command conventions; naming rules with regex patterns; required payload field properties; ALLOWED/BANNED type table; versioning convention; event vs command distinction; error case requirements; complete examples of both types; 10 anti-patterns

## Decisions Made

- Co-located verification rules as HTML comments within templates rather than in separate docs — arch-checker reads the template comment and immediately knows the check; reduces lookup friction
- Used COMPLETE/INCOMPLETE paired examples in agent-spec-format.md — prose-only descriptions of "what good looks like" are insufficient; arch-checker needs concrete benchmarks it can compare against
- Defined banned type list as exhaustive enumeration in schema-patterns.md rather than "no vague types" — exhaustive list removes ambiguity about whether a given type is banned

## Deviations from Plan

None — plan executed exactly as written. Both tasks delivered all specified artifacts with all specified content.

## Issues Encountered

None. The references directory already contained naming-conventions.md and context-schema.md from the parallel execution of Plan 03, confirming the wave-2 parallelization worked as expected.

## Next Phase Readiness

Phase 1 Plan 04 is complete. The full set of Phase 1 templates and references are now available:
- `templates/`: agent-spec.md, event-schema.yaml, failure-modes.md
- `references/`: naming-conventions.md, context-schema.md, agent-spec-format.md, verification-patterns.md, schema-patterns.md

Phase 2 agents (arch-executor, arch-checker, arch-verifier) can now use these templates as scaffolds and references as rubrics. No blockers.

## Self-Check: PASSED

All files verified present on disk. Both task commits verified in git history.

| Check | Result |
|-------|--------|
| templates/agent-spec.md exists | FOUND |
| templates/event-schema.yaml exists | FOUND |
| templates/failure-modes.md exists | FOUND |
| references/agent-spec-format.md exists | FOUND |
| references/verification-patterns.md exists | FOUND |
| references/schema-patterns.md exists | FOUND |
| Commit dfbb7ce (Task 1) in log | FOUND |
| Commit 742eec2 (Task 2) in log | FOUND |

---
*Phase: 01-foundation-tooling-and-agent-scaffold*
*Completed: 2026-02-28*
