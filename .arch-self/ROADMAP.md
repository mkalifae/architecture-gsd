---
system: "Architecture GSD — Multi-Agent Architecture Design System"
phases: 5
designed_by: arch-roadmapper
date: 2026-03-02
---

# Architecture GSD — Design Roadmap

## Phase 1: Context and Schema Design

**Goal:** Produce the event schema defining all inter-agent state transitions in the Architecture GSD pipeline.

**Artifacts:**
- `.arch-self/phases/context-and-schema-design/design/events/events.yaml` — 11 inter-agent events (PlanRequested, PlanApproved, PlanRejected, DocumentWritten, VerificationComplete, ResearchComplete, RoadmapComplete, IntegrationComplete, DigestWritten, GapFound, HumanNeeded)

**Success criteria:**
- Events cover all agent handoffs (discuss-system → context-engineer → arch-researcher → arch-roadmapper → arch-planner ↔ arch-checker → arch-executor → arch-verifier/arch-integrator → failure-analyst/schema-designer)
- All events have typed payloads (no `any` or `object` types)
- Events have producers and consumers declared

**Wave:** 1 (no design artifact dependencies)

---

## Phase 2: Agent Contracts

**Goal:** Produce complete agent specifications for all 11 Architecture GSD agents with role, inputs, outputs, execution flow, structured returns, failure modes, and constraints.

**Artifacts (11 agent contracts):**
- `.arch-self/phases/agent-contracts/design/agents/discuss-system.md`
- `.arch-self/phases/agent-contracts/design/agents/context-engineer.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-researcher.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-roadmapper.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-planner.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-checker.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-executor.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-verifier.md`
- `.arch-self/phases/agent-contracts/design/agents/arch-integrator.md`
- `.arch-self/phases/agent-contracts/design/agents/schema-designer.md`
- `.arch-self/phases/agent-contracts/design/agents/failure-analyst.md`

**Success criteria:**
- All 11 agents have agent contracts with all 7 required sections using XML tags
- Each contract references events from Phase 1 events.yaml
- No agent spec contains stub phrases

**Wave:** 2 (depends on events.yaml from Phase 1)

---

## Phase 3: Topology and Context Flows

**Goal:** Produce the topology document (Mermaid graph + channel table) and context flow map showing how information moves between all 11 agents.

**Artifacts:**
- `.arch-self/phases/topology-and-context-flows/design/topology/TOPOLOGY.md`
- `.arch-self/phases/topology-and-context-flows/design/context-flows/CONTEXT-FLOWS.md`

**Success criteria:**
- TOPOLOGY.md references all 11 agents as named nodes
- Communication channels documented for all agent-to-agent relationships
- CONTEXT-FLOWS.md shows per-agent context budget (reads, writes, passes-downstream)
- Bottleneck analysis identifies context-heavy vs. context-light agents

**Wave:** 3 (depends on agent contracts from Phase 2)

---

## Phase 4: Failure Modes

**Goal:** Produce failure mode catalogs for all 11 agents — each catalog includes per-agent failure modes, integration point failures, and residual risks.

**Artifacts (11 failure mode catalogs):**
- `.arch-self/phases/failure-modes/design/failure-modes/discuss-system-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/context-engineer-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-researcher-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-roadmapper-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-planner-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-checker-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-executor-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-verifier-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/arch-integrator-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/schema-designer-failures.md`
- `.arch-self/phases/failure-modes/design/failure-modes/failure-analyst-failures.md`

**Success criteria:**
- Each catalog has 3+ named failure modes with concrete recovery actions
- No "handles gracefully" language in recovery sections
- Integration point failures cover agent-to-agent handoff failures

**Wave:** 4 (depends on agent contracts from Phase 2)

---

## Phase 5: Verification and Integration

**Goal:** Run the 4-level verification stack across all design documents, perform cross-phase integration checks, produce MANIFEST.md, write phase DIGEST.md.

**Artifacts:**
- `.arch-self/phases/verification-and-integration/design/VERIFICATION.md`
- `.arch-self/phases/verification-and-integration/design/INTEGRATION-REPORT.md`
- `.arch-self/phases/verification-and-integration/design/MANIFEST.md`
- `.arch-self/phases/verification-and-integration/design/digests/phase-05-DIGEST.md`

**Success criteria:**
- VERIFICATION.md status is "passed" or "gaps_found" with documented findings
- INTEGRATION-REPORT.md shows 0 orphaned agents, 0 circular dependencies
- MANIFEST.md indexes all design documents with verification status
- DIGEST.md summarizes the complete self-design run in ≤50 lines

**Wave:** 5 (depends on all prior phases)
