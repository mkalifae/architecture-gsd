---
name: manifest
phase: verification-and-integration
verification_status: passed
document_count: 27
generated_at: 2026-03-02T23:20:00Z
---

# Architecture GSD Self-Design — Document Manifest

## Reading Order

For a developer re-implementing Architecture GSD from this package:

1. **Start here:** `.arch-self/CONTEXT.md` — System scope, constraints, locked decisions
2. **Research context:** `.arch-self/RESEARCH.md` — Architecture patterns, standard stack, pitfalls
3. **Phase structure:** `.arch-self/ROADMAP.md` — 5-phase design decomposition
4. **Event contracts:** `design/events/events.yaml` — 11 inter-agent events with typed payloads
5. **Agent contracts:** `design/agents/*.md` — All 11 agent specifications (alphabetical)
6. **Communication structure:** `design/topology/TOPOLOGY.md` — Agent dependency graph, channel table
7. **Context budgets:** `design/context-flows/CONTEXT-FLOWS.md` — Per-agent context analysis
8. **Failure analysis:** `design/failure-modes/*-failures.md` — One catalog per agent
9. **Verification results:** `design/VERIFICATION.md` — Level 1-4 check results
10. **Integration results:** `design/INTEGRATION-REPORT.md` — Cross-phase consistency
11. **This manifest:** `design/MANIFEST.md`

## Document Index

### System Context (3 files)

| File | Type | Status |
|------|------|--------|
| `.arch-self/CONTEXT.md` | context | validated |
| `.arch-self/RESEARCH.md` | research | complete |
| `.arch-self/ROADMAP.md` | roadmap | complete |

### Event Schema (1 file)

| File | Events | Status |
|------|--------|--------|
| `design/events/events.yaml` | 11 | verified Level 1-2 |

### Agent Contracts (11 files)

| Agent | File | Model | Status |
|-------|------|-------|--------|
| discuss-system | `design/agents/discuss-system.md` | opus | verified |
| context-engineer | `design/agents/context-engineer.md` | sonnet | verified |
| arch-researcher | `design/agents/arch-researcher.md` | sonnet | verified |
| arch-roadmapper | `design/agents/arch-roadmapper.md` | sonnet | verified |
| arch-planner | `design/agents/arch-planner.md` | sonnet | verified |
| arch-checker | `design/agents/arch-checker.md` | opus | verified |
| arch-executor | `design/agents/arch-executor.md` | sonnet | verified |
| arch-verifier | `design/agents/arch-verifier.md` | sonnet | verified |
| arch-integrator | `design/agents/arch-integrator.md` | haiku | verified |
| schema-designer | `design/agents/schema-designer.md` | sonnet | verified |
| failure-analyst | `design/agents/failure-analyst.md` | sonnet | verified |

### Topology and Context Flows (2 files)

| File | Type | Status |
|------|------|--------|
| `design/topology/TOPOLOGY.md` | topology | verified |
| `design/context-flows/CONTEXT-FLOWS.md` | context-flows | verified |

### Failure Mode Catalogs (11 files)

| File | Agent | Failure Modes | Status |
|------|-------|---------------|--------|
| `design/failure-modes/discuss-system-failures.md` | discuss-system | 3 | verified |
| `design/failure-modes/context-engineer-failures.md` | context-engineer | 3 | verified |
| `design/failure-modes/arch-researcher-failures.md` | arch-researcher | 3 | verified |
| `design/failure-modes/arch-roadmapper-failures.md` | arch-roadmapper | 3 | verified |
| `design/failure-modes/arch-planner-failures.md` | arch-planner | 3 | verified |
| `design/failure-modes/arch-checker-failures.md` | arch-checker | 3 | verified |
| `design/failure-modes/arch-executor-failures.md` | arch-executor | 3 | verified |
| `design/failure-modes/arch-verifier-failures.md` | arch-verifier | 3 | verified |
| `design/failure-modes/arch-integrator-failures.md` | arch-integrator | 3 | verified |
| `design/failure-modes/schema-designer-failures.md` | schema-designer | 3 | verified |
| `design/failure-modes/failure-analyst-failures.md` | failure-analyst | 3 | verified |

### Verification and Integration (3 files)

| File | Status | Key Result |
|------|--------|------------|
| `design/VERIFICATION.md` | passed | Level 1-2 all pass; Level 3 false positives documented |
| `design/INTEGRATION-REPORT.md` | passed | 0 orphans, 1 intentional cycle confirmed |
| `design/MANIFEST.md` | complete | 27 documents indexed |

## Coverage Summary

| Document Type | Expected | Found | Coverage |
|--------------|----------|-------|----------|
| Agent contracts | 11 (per CONTEXT.md) | 11 | 100% |
| Failure mode catalogs | 11 (one per agent) | 11 | 100% |
| Event schemas | 1 | 1 (11 events) | 100% |
| Topology docs | 1 | 1 | 100% |
| Context-flow docs | 1 | 1 | 100% |
| Verification reports | 1 | 1 | 100% |
| Integration reports | 1 | 1 | 100% |

**Total: 27 documents covering all Architecture GSD design artifacts.**
