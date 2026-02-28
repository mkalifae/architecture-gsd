# Roadmap: Architecture GSD

## Overview

Architecture GSD is a standalone multi-agent CLI tool that takes natural language system intent as input and produces a complete, cross-referenced architecture package — agent contracts, typed event schemas, orchestration topology, context flow maps, failure modes, and verification reports — sufficient for a development team to implement a multi-agent system from scratch. The build follows five natural phases derived from hard feature dependencies: foundation and tooling must precede intake, intake must precede the design pipeline, the design pipeline must precede full verification, and all of these must precede self-design validation. Each phase delivers a coherent, independently verifiable capability, and three critical pitfalls (goal drift, verbosity compensation, agent groupthink) are designed out in Phase 1 rather than patched later.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation, Tooling, and Agent Scaffold** - Establish the plugin structure, arch-tools.js utility, CONTEXT.md schema, canonical naming conventions, design document templates, and model profiles that every subsequent phase depends on
- [ ] **Phase 2: Intake and Intent Extraction** - Build the discuss-system agent and /arch-gsd:new-system workflow so a human can describe a system in natural language and receive a structured, non-prose CONTEXT.md with explicit fields and mandatory non-goals
- [ ] **Phase 3: Core Design Pipeline** - Implement the researcher → roadmapper → planner → checker → executor chain plus all three specialized agents (context-engineer, schema-designer, failure-analyst), the /arch-gsd:execute-phase workflow, wave-based parallelization, and all primary output documents
- [ ] **Phase 4: Verification, Integration, and Quality Gates** - Complete arch-verifier and arch-integrator, the full arch-tools.js verification engine with YAML graph traversal, all four verification levels, phase-boundary digests, INTEGRATION-REPORT.md, and MANIFEST.md
- [ ] **Phase 5: Self-Design Validation and CLI Polish** - Run Architecture GSD against itself to validate the complete pipeline end-to-end, confirm the output is sufficient for re-implementation from scratch, establish self-design convergence criteria, and add the /arch-gsd:resume and /arch-gsd:progress workflows

## Phase Details

### Phase 1: Foundation, Tooling, and Agent Scaffold

**Goal**: The platform is ready — directory structure, tooling API, naming contracts, and design document templates are locked so any agent written in Phase 2+ can rely on them without rework

**Depends on**: Nothing (first phase)

**Requirements**: FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-05, FOUN-06, FOUN-07, FOUN-08, FOUN-09

**Success Criteria** (what must be TRUE):
  1. Running `node bin/arch-tools.js --help` shows commands for frontmatter CRUD, stub detection, phase state management, and YAML cross-reference validation — all callable from agent prompts via bash
  2. The canonical naming conventions document exists and specifies PascalCase for events, kebab-case for agent names, and SCREAMING_SNAKE for commands — any name that violates these conventions is detectable programmatically
  3. CONTEXT.md schema is fully defined with machine-checkable required fields (domain, actors, non-goals, constraints, scale, locked-decisions) — a CONTEXT.md missing any field fails `arch-tools.js validate-context`
  4. Design document templates exist for agent-spec.md, event-schema.yaml, and failure-modes.md — each template has required sections specified with content expectations, not just section names
  5. Model profiles are configured in config.json: Opus for discuss-system, arch-roadmapper, and context-engineer; Sonnet for arch-researcher, arch-planner, arch-executor, arch-verifier, schema-designer, and failure-analyst; Haiku for arch-checker and arch-integrator

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Project directory structure, plugin.json, config.json, 11 agent stubs, 6 workflow stubs
- [x] 01-02-PLAN.md — arch-tools.js: frontmatter CRUD, stub detection, state management, validate-context, validate-names
- [x] 01-03-PLAN.md — Canonical naming conventions document and CONTEXT.md schema specification
- [x] 01-04-PLAN.md — Design document templates (agent-spec, event-schema, failure-modes) and references/ documents

---

### Phase 2: Intake and Intent Extraction

**Goal**: A human can describe any agentic system in natural language using /arch-gsd:new-system and receive a fully populated CONTEXT.md with all schema fields, explicit non-goals, and initialized STATE.md — ready for the design pipeline to consume

**Depends on**: Phase 1

**Requirements**: INTK-01, INTK-02, INTK-03, INTK-04, INTK-05

**Success Criteria** (what must be TRUE):
  1. Running `/arch-gsd:new-system` scaffolds the project directory and spawns discuss-system — the human never manually creates files or calls agents directly
  2. discuss-system asks clarifying questions in a single comprehensive pass (not one question at a time) and surfaces all ambiguities before producing output
  3. The resulting CONTEXT.md has every required schema field populated with concrete values — running `arch-tools.js validate-context` returns zero missing fields
  4. Non-goals in CONTEXT.md are explicit, named, and mandatory — a CONTEXT.md with no non-goals section fails validation
  5. STATE.md is initialized with current position, locked decisions from intake, and session continuity fields — any agent starting from scratch can determine what has been done by reading STATE.md and CONTEXT.md alone

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — discuss-system agent spec: full body with 10-step adaptive questioning strategy, grouped gray-area menu, mandatory non-goals enforcement, inline validate-context
- [x] 02-02-PLAN.md — /arch-gsd:new-system workflow: directory scaffolding, discuss-system spawn, return handling, STATE.md initialization (50-70 lines)

---

### Phase 3: Core Design Pipeline

**Goal**: Given a CONTEXT.md from Phase 2, the full design pipeline produces a complete set of primary architecture documents — agent contracts, typed event schemas, orchestration topology, context flow maps, failure modes — in dual-format (markdown prose + embedded YAML) with wave-based parallel execution and a bounded planner-checker revision loop

**Depends on**: Phase 2

**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, PIPE-11, PIPE-12, SPEC-01, SPEC-02, SPEC-03, STAT-01, STAT-02, STAT-03, OUTP-01, OUTP-02, OUTP-03, OUTP-04, OUTP-05, OUTP-07

**Success Criteria** (what must be TRUE):
  1. Running `/arch-gsd:execute-phase` for any design phase produces dual-format output documents: every agent contract in `design/agents/*.md` has markdown prose sections (Role, Inputs, Outputs, State, Failure Modes, Constraints) plus embedded YAML blocks with typed definitions — no section is TBD, "handles gracefully", or "as needed"
  2. `design/events/events.yaml` contains a canonical registry where every event and command has a PascalCase or SCREAMING_SNAKE name, fully typed payload fields (no `any` or `object` types), and at least one example value per field
  3. The planner-checker revision loop terminates within 3 cycles — if arch-checker raises blockers that are not resolved in 3 iterations, the workflow escalates to the human with a structured gap report rather than silently proceeding
  4. Independent design tasks within a phase run concurrently per wave assignments computed at plan time — the execution log shows tasks in the same wave completing before the next wave begins
  5. STATE.md is updated after every plan completion (max 100 lines) and is the mandatory first read for every agent — any agent can resume a partial design run from STATE.md + disk state without prior conversation context

**Plans:** 6 plans

Plans:
- [ ] 03-01-PLAN.md — arch-researcher and arch-roadmapper agent specs: WebSearch/Context7 research pipeline, complexity-adaptive phase count (3/5/7), RESEARCH.md and ROADMAP.md output
- [ ] 03-02-PLAN.md — arch-planner agent spec: wave assignment algorithm (ARCHITECTURE_DEPENDENCY_RULES), GSD-compatible PLAN.md production, goal-backward must_haves derivation
- [ ] 03-03-PLAN.md — arch-checker agent spec: 8-dimension adversarial quality framework, structured issue YAML, blocker/warning/info severity, explicit framing distinction from arch-verifier
- [ ] 03-04-PLAN.md — arch-executor agent spec: dual-format output (markdown + YAML), 5 document types, deviation rules (auto-complete/document/flag/STOP), required-section enforcement
- [ ] 03-05-PLAN.md — context-engineer, schema-designer, and failure-analyst agent specs: context flow derivation, typed event schema production, bottleneck-first failure analysis
- [ ] 03-06-PLAN.md — /arch-gsd:execute-phase workflow: full pipeline orchestration with prerequisite checks, bounded planner-checker loop (max 3), parallel wave execution, STATE.md update

---

### Phase 4: Verification, Integration, and Quality Gates

**Goal**: The full four-level verification stack is operational — arch-verifier and arch-integrator catch cross-document inconsistencies programmatically using YAML graph traversal, anti-pattern scanning, and adversarial prompting, producing a structured VERIFICATION.md and final INTEGRATION-REPORT.md

**Depends on**: Phase 3

**Requirements**: SPEC-04, VERF-01, VERF-02, VERF-03, VERF-04, VERF-05, VERF-06, VERF-07, VERF-08, VERF-09, STAT-04, OUTP-06

**Success Criteria** (what must be TRUE):
  1. Level 1-4 verification runs programmatically: Level 1 (document exists on disk), Level 2 (min_lines met, required sections present, no stub phrases), Level 3 (document is referenced by dependent documents), Level 4 (every event and agent name in any document resolves against the canonical YAML registry) — all four run without human intervention
  2. arch-verifier's VERIFICATION.md has a structured status field (`passed`, `gaps_found`, or `human_needed`) and, when gaps are found, lists each gap with the document name, the missing or unresolved reference, and a remediation suggestion
  3. arch-integrator validates cross-phase consistency: event references in Phase 2 agent contracts resolve to events defined in Phase 3 schemas; no agent referenced in one document is undefined in the agent registry — `arch-tools.js` detects and reports orphaned events and orphaned agents
  4. The anti-pattern scanner detects TBD sections, undefined references, circular agent dependencies, missing failure modes, untyped event fields, and orphaned agents or events — each detected anti-pattern produces a structured finding, not a prose description
  5. A phase-boundary DIGEST.md (max 50 lines) is written after each phase containing decisions, key entities, and cross-references — arch-integrator reads digests first and fetches specific artifacts on demand to avoid context window overflow

**Plans**: TBD

Plans:
- [ ] 04-01: arch-verifier agent spec (adversarial prompting, schema-driven Level 1-3 verification)
- [ ] 04-02: arch-tools.js verification engine — YAML graph traversal, cycle detection, AJV schema validation, anti-pattern scanner
- [ ] 04-03: Level 4 verification — cross-document YAML name resolution against canonical registry
- [ ] 04-04: arch-integrator agent spec and phase-boundary DIGEST.md protocol
- [ ] 04-05: /arch-gsd:verify-phase workflow, VERIFICATION.md output, INTEGRATION-REPORT.md, and MANIFEST.md

---

### Phase 5: Self-Design Validation and CLI Polish

**Goal**: Architecture GSD successfully designs itself end-to-end, producing an architecture package that a developer could use to re-implement the system from scratch — confirming the pipeline is complete, the output format is sufficient, and context-reset survivability is real

**Depends on**: Phase 4

**Requirements**: STAT-05, VALD-01, VALD-02, VALD-03, VALD-04

**Success Criteria** (what must be TRUE):
  1. Architecture GSD successfully designs a real non-trivial agentic system end-to-end — the output package includes all required documents (agent contracts, event schemas, topology, context flows, failure modes, manifest) and passes Level 1-4 verification
  2. Architecture GSD produces a complete architecture package for itself (self-design run) — the self-design output includes correct agent counts, agent names matching the actual agent specs, and event schemas matching the actual inter-agent state transitions
  3. A human reviewer reads the self-design output and confirms it is sufficient for re-implementation from scratch — no critical architectural decisions are left undocumented or marked TBD
  4. Self-design has explicit convergence criteria enforced during the run — the system does not enter an infinite gap-closure loop, and a DEFERRED.md is produced listing any gaps explicitly deferred rather than silently papered over
  5. Running `/arch-gsd:resume` after a simulated context reset restores working state from STATE.md — the next agent in the pipeline executes correctly without any prior conversation context

**Plans**: TBD

Plans:
- [ ] 05-01: /arch-gsd:resume and /arch-gsd:progress workflows
- [ ] 05-02: Self-design run on a real non-trivial agentic system (VALD-01)
- [ ] 05-03: Self-design run on Architecture GSD itself — convergence criteria, DEFERRED.md protocol (VALD-02, VALD-03, VALD-04)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Tooling, and Agent Scaffold | 4/4 | ✓ Complete | 2026-02-27 |
| 2. Intake and Intent Extraction | 2/2 | ✓ Complete | 2026-02-28 |
| 3. Core Design Pipeline | 0/6 | Planned | - |
| 4. Verification, Integration, and Quality Gates | 0/5 | Not started | - |
| 5. Self-Design Validation and CLI Polish | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-27*
*Coverage: 51/51 v1 requirements mapped*
*Depth: comprehensive*
