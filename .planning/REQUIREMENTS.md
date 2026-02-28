# Requirements: Architecture GSD

**Defined:** 2026-02-27
**Core Value:** Given a description of an agentic system, produce a complete, internally consistent, cross-referenced architecture package that a development team can implement without needing to make architectural decisions.

## v1 Requirements

### Foundation & Tooling

- [ ] **FOUN-01**: Plugin directory structure established (`agents/`, `workflows/`, `bin/`, `templates/`, `references/`, `plugin.json`)
- [ ] **FOUN-02**: `arch-tools.js` implements frontmatter CRUD (read/write YAML frontmatter in markdown files)
- [ ] **FOUN-03**: `arch-tools.js` implements stub detection (scans for "TBD", "to be determined", "handles gracefully", "as needed")
- [ ] **FOUN-04**: `arch-tools.js` implements phase state management (init, transition, status query)
- [ ] **FOUN-05**: Canonical naming conventions document locked (PascalCase events, kebab-case agents, SCREAMING_SNAKE commands)
- [ ] **FOUN-06**: CONTEXT.md schema defined with machine-checkable fields (domain, actors, non-goals, constraints, scale, locked-decisions)
- [ ] **FOUN-07**: Required-section templates created for all design document types (agent-spec, event-schema, failure-modes)
- [ ] **FOUN-08**: Model profiles configured (Opus for discuss-system/roadmapper/context-engineer, Sonnet for researcher/planner/executor/verifier/schema-designer/failure-analyst, Haiku for checker/integrator)
- [ ] **FOUN-09**: `references/` documents created (agent-spec-format.md, verification-patterns.md, schema-patterns.md)

### Intake & Intent

- [ ] **INTK-01**: `discuss-system` agent extracts structured system intent from natural language via adaptive questioning
- [ ] **INTK-02**: `discuss-system` produces CONTEXT.md with all schema fields populated (no empty required fields)
- [ ] **INTK-03**: `/arch-gsd:new-system` workflow scaffolds project structure and spawns `discuss-system`
- [ ] **INTK-04**: Explicit non-goals are mandatory in CONTEXT.md output (not optional)
- [ ] **INTK-05**: STATE.md initialized after intake with position, decisions, and session continuity sections

### Design Pipeline

- [ ] **PIPE-01**: `arch-researcher` researches architecture patterns relevant to the system being designed using WebSearch and Context7
- [ ] **PIPE-02**: `arch-roadmapper` derives a 5-phase design structure from CONTEXT.md + RESEARCH.md, adapting based on complexity signals
- [ ] **PIPE-03**: `arch-planner` decomposes phases into wave-assigned parallel tasks with must_haves frontmatter
- [ ] **PIPE-04**: `arch-checker` applies adversarial quality gate on plans (8 dimensions: coverage, completeness, dependency correctness, cross-reference completeness, scope sanity, verifiability, consistency, ambiguity)
- [ ] **PIPE-05**: Bounded revision loop: planner → checker cycles max 3 iterations, then escalates to human
- [ ] **PIPE-06**: `arch-executor` produces dual-format design documents (markdown prose + embedded YAML blocks)
- [ ] **PIPE-07**: `arch-executor` writes agent contracts with required sections: Role, Inputs, Outputs, State, Failure Modes, Constraints
- [ ] **PIPE-08**: `arch-executor` writes event schemas with typed payloads (field names, types, constraints) in YAML — no `any` or `object` types
- [ ] **PIPE-09**: `arch-executor` enforces canonical naming from YAML registry (events in PascalCase, agents in kebab-case)
- [ ] **PIPE-10**: `/arch-gsd:execute-phase` workflow coordinates the planner → checker → executor → verifier loop
- [ ] **PIPE-11**: Wave-based parallelization: independent design tasks within a phase run concurrently
- [ ] **PIPE-12**: Deviation rules implemented: auto-complete (Rule 1), auto-document (Rule 2), auto-flag (Rule 3), STOP for scope changes (Rule 4)

### Specialized Agents

- [ ] **SPEC-01**: `context-engineer` designs context injection strategy for the target system (what each agent receives, how state passes)
- [ ] **SPEC-02**: `schema-designer` produces fully typed event/command/data schemas with validation constraints and examples
- [ ] **SPEC-03**: `failure-analyst` enumerates failure modes per agent and integration point (trigger, manifestation, recovery — not "handles gracefully")
- [ ] **SPEC-04**: `arch-integrator` validates cross-phase consistency (event references resolve, agent references resolve, no circular dependencies)

### Verification

- [ ] **VERF-01**: Level 1 verification: design document exists on disk
- [ ] **VERF-02**: Level 2 verification: document meets min_lines, has required_sections, passes stub detection
- [ ] **VERF-03**: Level 3 verification: document is cross-referenced from dependent documents
- [ ] **VERF-04**: Level 4 verification: all event/agent names in a document resolve against the canonical YAML registry
- [ ] **VERF-05**: `arch-verifier` uses adversarial prompting ("find what's wrong, not confirm what's correct")
- [ ] **VERF-06**: `arch-verifier` produces VERIFICATION.md with structured status (passed/gaps_found/human_needed) and gap details
- [ ] **VERF-07**: `arch-tools.js` implements YAML cross-reference graph traversal for Level 3-4 checks
- [ ] **VERF-08**: Anti-pattern scanner detects: TBD sections, undefined references, circular dependencies, missing failure modes, untyped events, orphaned agents/events
- [ ] **VERF-09**: INTEGRATION-REPORT.md produced as final package validation

### State & Continuity

- [ ] **STAT-01**: STATE.md written after every plan completion (max 100 lines)
- [ ] **STAT-02**: STATE.md is mandatory pre-read for every agent
- [ ] **STAT-03**: Any agent can resume work from STATE.md + disk state without prior conversation context
- [ ] **STAT-04**: Phase-boundary DIGEST.md (max 50 lines) written after each phase to prevent context overflow
- [ ] **STAT-05**: `/arch-gsd:resume` workflow restores context from STATE.md for session continuity

### Output Package

- [ ] **OUTP-01**: `design/agents/*.md` — one agent contract per file with all required sections
- [ ] **OUTP-02**: `design/events/events.yaml` — canonical event/command registry with typed payloads
- [ ] **OUTP-03**: `design/topology/TOPOLOGY.md` — agent dependency graph and communication diagram
- [ ] **OUTP-04**: `design/context/CONTEXT-FLOWS.md` — context injection strategy per agent
- [ ] **OUTP-05**: `design/failure/FAILURE-MODES.md` — failure modes per agent and integration point
- [ ] **OUTP-06**: `design/MANIFEST.md` — index of all output documents with reading order
- [ ] **OUTP-07**: All design documents use dual-format: markdown prose + embedded YAML canonical blocks

### Validation

- [ ] **VALD-01**: Architecture GSD successfully designs a real non-trivial agentic system end-to-end
- [ ] **VALD-02**: Self-design: Architecture GSD produces a complete architecture package for itself
- [ ] **VALD-03**: Self-design output is sufficient for re-implementation from scratch (verified by human review)
- [ ] **VALD-04**: Self-design has explicit convergence criteria (prevents infinite gap-closure loop)

## v2 Requirements

### Advanced Adaptation

- **ADPT-01**: Fully adaptive phase inference — roadmapper creates entirely custom phase structures from intent (beyond 5-phase default modulation)
- **ADPT-02**: Multi-system design — Architecture GSD designs a system composed of multiple interacting agentic subsystems
- **ADPT-03**: Incremental re-design — modify existing architecture package based on changed requirements without full re-generation

### Protocol Mapping

- **PROT-01**: MCP tool definition export — generate MCP-compatible tool definitions from agent contracts
- **PROT-02**: A2A Agent Card export — generate A2A Agent Cards from agent contracts
- **PROT-03**: Protocol-specific annotations in design documents (opt-in, not default)

### Distribution

- **DIST-01**: Published as installable Claude Code plugin
- **DIST-02**: Plugin marketplace listing with documentation
- **DIST-03**: Configuration wizard for customizing output format

### Enhanced Verification

- **EVER-01**: Verification strategy document — automated verification contracts for the designed system
- **EVER-02**: LLM-as-judge semantic quality assessment for design documents (beyond structural checks)
- **EVER-03**: Diff-based verification — verify only changed documents after incremental edits

## Out of Scope

| Feature | Reason |
|---------|--------|
| Code generation from architecture docs | Architecture GSD produces specs, not implementations — use GSD code mode for that |
| Visual diagram rendering (SVG/PNG) | Use Mermaid syntax in markdown; diagram tools handle rendering |
| Runtime validation of designs | Verification is structural (cross-references, completeness), not behavioral |
| Web/chat interface | CLI-first via Claude Code; web interface is a separate product |
| Infrastructure/deployment design | Unless it's a component of the agentic system being designed |
| Database schema design | Unless it's part of the agent state model |
| Direct MCP/A2A protocol output | Produces abstract specs; protocol mapping is a translation layer for v2 |
| Free-form conversation without structure gates | Produces unverifiable chat transcripts, not architecture packages |
| Fixed 12-section template | Intent-derived phase structure is a core differentiator |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Pending |
| FOUN-02 | Phase 1 | Pending |
| FOUN-03 | Phase 1 | Pending |
| FOUN-04 | Phase 1 | Pending |
| FOUN-05 | Phase 1 | Pending |
| FOUN-06 | Phase 1 | Pending |
| FOUN-07 | Phase 1 | Pending |
| FOUN-08 | Phase 1 | Pending |
| FOUN-09 | Phase 1 | Pending |
| INTK-01 | Phase 2 | Pending |
| INTK-02 | Phase 2 | Pending |
| INTK-03 | Phase 2 | Pending |
| INTK-04 | Phase 2 | Pending |
| INTK-05 | Phase 2 | Pending |
| PIPE-01 | Phase 3 | Pending |
| PIPE-02 | Phase 3 | Pending |
| PIPE-03 | Phase 3 | Pending |
| PIPE-04 | Phase 3 | Pending |
| PIPE-05 | Phase 3 | Pending |
| PIPE-06 | Phase 3 | Pending |
| PIPE-07 | Phase 3 | Pending |
| PIPE-08 | Phase 3 | Pending |
| PIPE-09 | Phase 3 | Pending |
| PIPE-10 | Phase 3 | Pending |
| PIPE-11 | Phase 3 | Pending |
| PIPE-12 | Phase 3 | Pending |
| SPEC-01 | Phase 3 | Pending |
| SPEC-02 | Phase 3 | Pending |
| SPEC-03 | Phase 3 | Pending |
| SPEC-04 | Phase 4 | Pending |
| VERF-01 | Phase 4 | Pending |
| VERF-02 | Phase 4 | Pending |
| VERF-03 | Phase 4 | Pending |
| VERF-04 | Phase 4 | Pending |
| VERF-05 | Phase 4 | Pending |
| VERF-06 | Phase 4 | Pending |
| VERF-07 | Phase 4 | Pending |
| VERF-08 | Phase 4 | Pending |
| VERF-09 | Phase 4 | Pending |
| STAT-01 | Phase 3 | Pending |
| STAT-02 | Phase 3 | Pending |
| STAT-03 | Phase 3 | Pending |
| STAT-04 | Phase 4 | Pending |
| STAT-05 | Phase 5 | Pending |
| OUTP-01 | Phase 3 | Pending |
| OUTP-02 | Phase 3 | Pending |
| OUTP-03 | Phase 3 | Pending |
| OUTP-04 | Phase 3 | Pending |
| OUTP-05 | Phase 3 | Pending |
| OUTP-06 | Phase 4 | Pending |
| OUTP-07 | Phase 3 | Pending |
| VALD-01 | Phase 5 | Pending |
| VALD-02 | Phase 5 | Pending |
| VALD-03 | Phase 5 | Pending |
| VALD-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after research synthesis*
