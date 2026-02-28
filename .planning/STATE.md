# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Given a description of an agentic system, produce a complete, internally consistent, cross-referenced architecture package that a development team can implement without needing to make architectural decisions.
**Current focus:** Phase 3 — Core Design Pipeline

## Current Position

Phase: 3 of 5 (Core Design Pipeline)
Plan: 5 of 6 in current phase (plans 01, 02, 03, 04, 05 complete; plan 06 pending)
Status: Phase 3 In Progress
Last activity: 2026-02-28 — Completed plan 03-05: full schema-designer, context-engineer, and failure-analyst agent specs (153, 178, 170 lines respectively, all with 7 XML sections and zero stub phrases)

Progress: [████████░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 3.5 min
- Total execution time: 0.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation, Tooling, and Agent Scaffold | 4/4 | 16 min | 4 min |
| 2. Intake and Intent Extraction | 2/2 | 5 min | 2.5 min |
| 3. Core Design Pipeline | 5/6 | ~38 min (03-01: 7 min, 03-04: 7 min, 03-05: 10 min) | ~7.6 min |

**Recent Trend:**
- Last 5 plans: 4 min
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: All 11 agents in v1 — complete architecture packages require all specializations
- [Pre-Phase 1]: Plugin structure from day one — build standalone first, structured so plugin.json migration is additive only
- [Pre-Phase 1]: Zero external Node.js deps for arch-tools.js core (js-yaml + toposort acceptable for Level 3-4 verification; AJV only if JSON Schema validation against external schemas is needed)
- [Pre-Phase 1]: Dual-format output (markdown + YAML) mandatory — programmatic cross-reference verification is impossible on prose alone
- [Pre-Phase 1]: Adversarial prompting for arch-checker and arch-verifier — these must never be the same agent or share the same framing
- [01-01]: Balanced profile IS the FOUN-08 allocation — quality and balanced profiles are identical in v1 (opus/sonnet/haiku per spec); budget uses haiku more broadly
- [01-01]: Agent stubs have complete final-correct frontmatter from day 1 — Phase 2+ agents inherit routing without rework
- [01-01]: Three config profiles (quality/balanced/budget) mirror GSD pattern — model switching is a config change, not code change
- [01-02]: Frontmatter regex parser (not a YAML library) mirrors GSD pattern — zero npm dependencies, handles all YAML patterns in agent specs
- [01-02]: validate-names uses heuristic (agents/ path + model/tools/description frontmatter) to identify agent spec files vs other markdown
- [01-02]: detect-stubs strips frontmatter before scanning — frontmatter may legitimately use placeholder values during drafting
- [Phase 01]: CONTEXT.md schema defines all 6 fields as complete Phase 2 contract — no revision needed when discuss-system is implemented
- [Phase 01]: scale field is structured YAML object not flat string — enables programmatic reasoning about agents/throughput/latency
- [Phase 01]: locked-decisions can be empty array unlike non-goals — a system may have no pre-made architectural decisions at intake time
- [01-04]: Templates encode verification rules as HTML comments within sections — co-location makes rules discoverable by arch-checker without separate lookup
- [01-04]: References use COMPLETE/INCOMPLETE paired examples rather than prose-only descriptions — arch-checker needs concrete benchmarks, not abstract principles
- [01-04]: Verification levels defined incrementally with exact check descriptions — arch-verifier Phase 4 implementation can treat verification-patterns.md as a specification
- [02-01]: Gray-area menu marks non-goals as pre-selected REQUIRED — human cannot deselect non-goals; enforced at UX level and pre-flight check, not just validation
- [02-01]: discuss-system self-validates with validate-context inline (correction loop up to 2 attempts) before returning — new-system.md validation call is a safety net, not primary check
- [02-01]: Confirmation menu (not clarification) used when all 6 fields extractable from description — avoids interrogating human who already provided complete information
- [02-01]: FAILURE-04 (contradictory decisions) writes both with conflict-warning YAML comment as last resort rather than hard-blocking — agent always returns something actionable
- [02-02]: new-system.md uses mkdir -p .arch for scaffolding — not arch-tools.js state init (which creates .planning/phases/ for GSD system, not .arch/ for arch system)
- [02-02]: Safety-net validate-context runs unconditionally after discuss-system returns — guards against incorrect "complete" status from discuss-system
- [02-02]: No-argument mode uses freeform prompt rather than error — graceful UX consistent with discuss-system FAILURE-02 recovery pattern
- [03-02]: arch-planner writes PLAN.md using GSD-compatible task XML format (<files><action><verify><done>) for compatibility with detect-stubs and arch-checker plan quality checks
- [03-02]: Max 3 tasks per PLAN.md enforced as hard constraint (not guideline) to maintain arch-executor context budget within 50% utilization target per plan
- [03-02]: Locked decisions from CONTEXT.md honored without challenge — wave ordering overridden when necessary, override documented in PLAN.md action text, warning returned (not error)
- [03-02]: ARCHITECTURE_DEPENDENCY_RULES encodes domain ordering: event-schema (Wave 1) -> agent-contract (after events) -> topology/failure-modes (after agents); context-flows parallels agent-contract
- [03-03]: arch-checker uses haiku model — adversarial plan analysis needs iteration speed, not opus reasoning; haiku sufficient for pattern-matching across PLAN.md structure
- [03-03]: Adversarial framing must appear in first 3 sentences of Role — cannot be buried where LLM skims past it; prominence is a design requirement
- [03-03]: arch-checker strictly read-only — PLAN.md modifications are arch-planner's responsibility in revision mode; enforced as explicit constraint
- [03-03]: Bounded revision loop capped at 3 iterations with mandatory escalate status — prevents infinite orchestration loops when blockers are unresolvable by arch-planner alone
- [03-03]: FAILURE-03 (rubber-stamp false positive) documented as framing failure — prevention is adversarial framing, detection is zero-findings on large plans (>5 tasks)
- [03-01]: Agent spec body format uses XML tags (<role> etc.) not ## markdown headers — discovered by inspecting discuss-system.md reference; template format differs from convention
- [03-01]: arch-researcher surfaces options+tradeoffs only, never mandates — "should" must always present alternatives to avoid architectural decisions in research output
- [03-01]: arch-roadmapper complexity signal rule: scale.agents < 5 → 3-phase, 5-15 → 5-phase, >15 → 7-phase; defaults to 5-phase when unparseable
- [03-01]: detect-stubs false positive pattern: example values in failure mode descriptions (e.g., "TBD", "placeholder") trigger stub detection — rephrase with synonyms
- [03-04]: arch-executor uses XML section tags (<role> etc.) not markdown ## headers — matches discuss-system.md convention; templates/agent-spec.md is what arch-executor PRODUCES, not how arch-executor itself is formatted
- [03-04]: OUTP-03 topology production requires three artifacts: Mermaid dependency graph, communication channels table (5 columns), and YAML adjacency list with nodes+edges
- [03-04]: detect-stubs gate is hard — blocks status: "complete" until zero stubs; up to 2 correction iterations before falling back to gaps_found
- [03-04]: Four status values only: complete, gaps_found, human_needed, failed — no success or error variants to prevent status drift across agents
- [03-05]: schema-designer is Wave 2 (before arch-executor Wave 3 agent contracts) so event names exist in events.yaml before agent contracts reference them — orphaned event references are a Level 3 verification failure
- [03-05]: context-engineer handles parallel execution gracefully: events.yaml unavailability is a named failure mode (FM-02) returning gaps_found rather than failing — gap resolves automatically when schema-designer completes
- [03-05]: detect-stubs false positive on quoted banned phrases — resolved by referencing templates/failure-modes.md by path rather than quoting banned phrases inline in agent body text
- [03-05]: failure-analyst describes banned recovery phrase requirement via meta-reference to templates/failure-modes.md rather than inlining the phrases — avoids detect-stubs false positives on constraint documentation

### Pending Todos

None.

### Blockers/Concerns

- [Pre-Phase 1, RESOLVED by 03-02]: Research flagged Phase 3 (arch-planner wave dependency design) as needing deeper research — RESOLVED: ARCHITECTURE_DEPENDENCY_RULES encodes the wave assignment algorithm in arch-planner.md execution_flow Step 7
- [Pre-Phase 1]: Phase 4 (Level 4 YAML graph traversal) still needs deeper research during Phase 4 planning — revisit before locking Phase 4 plans

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 03-05-PLAN.md — schema-designer (153 lines), context-engineer (178 lines), and failure-analyst (170 lines) agent specs fully implemented. All three pass detect-stubs. Plans 01/02/03/04/05 of Phase 3 complete; plan 06 (execute-phase workflow) is the final remaining plan.
Resume file: None
