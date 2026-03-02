# Design Roadmap: Code Review Automation Pipeline

## Metadata

- System domain: event-driven multi-agent code review pipeline
- Phase count: 5 (5-phase structure)
- Complexity signal: scale.agents=6 -> 5-phase structure (5-15 agent range)
- Total design documents planned: 16
- RESEARCH.md confidence: HIGH
- Defaults applied: None — 5-phase structure follows complexity signal rule exactly

---

## Phase 1: Context and Schema Design

**Phase name:** context-and-schema-design
**Goal:** All data contracts between agents are fully specified — every event, command, and message payload is typed and attributed to its producer(s) and consumer(s), enabling all downstream agent design to reference canonical event names.
**Wave:** 1 (no design artifact dependencies)

**Success criteria:**
- events.yaml contains entries for all 6 events: PullRequestReceived, DiffAnalysisComplete, StyleCheckComplete, LogicReviewComplete, ReviewSynthesized, NotificationSent
- Every event in events.yaml has typed payload fields with no banned types (no `any`, `object`, `mixed`, `unknown`)
- Every event has at least one producer and at least one consumer named
- All event names follow PascalCase naming convention (validate-names passes)
- CONTEXT.md body sections are all present and non-stub (verified by arch-verifier Level 2)

**Requirements addressed:** locked-decisions (6-agent decomposition, mixed communication model), constraints (traceability — every finding must reference file and line)

**Artifacts:**
- `design/events/events.yaml` — Canonical event and command registry for the pipeline

**Dependencies:** [] (Wave 1 — no prior phase required)

---

## Phase 2: Agent Contracts

**Phase name:** agent-contracts
**Goal:** Each of the 6 agents has a complete, implementable specification covering its role, inputs, outputs, execution flow, structured returns, failure modes, and constraints — sufficient for a developer to implement each agent without making architectural decisions.
**Wave:** 2 (depends on Phase 1 event schema)

**Success criteria:**
- All 6 agent contracts exist in design/agents/: trigger-listener.md, diff-analyzer.md, style-checker.md, logic-reviewer.md, synthesis-agent.md, notification-agent.md
- Every agent contract has all 7 required sections: Role, Upstream Input, Downstream Consumer, Execution Flow, Structured Returns, Failure Modes, Constraints
- Every agent contract references event names from design/events/events.yaml by canonical name (cross-reference verified)
- No agent contract has stubs (detect-stubs passes)
- Agent names in contracts follow kebab-case naming convention (validate-names passes)

**Requirements addressed:** actors (all 6 agents from locked-decisions covered), locked-decisions (sync request/response at trigger-listener/diff-analyzer boundary; pub/sub downstream; LLM timeout/fallback for logic-reviewer; static analysis for style-checker; severity-ranked synthesis)

**Artifacts:**
- `design/agents/trigger-listener.md` — Webhook handler agent contract
- `design/agents/diff-analyzer.md` — Diff parsing and extraction agent contract
- `design/agents/style-checker.md` — Static analysis style checking agent contract
- `design/agents/logic-reviewer.md` — LLM-based logic review agent contract
- `design/agents/synthesis-agent.md` — Finding aggregation and severity-ranking agent contract
- `design/agents/notification-agent.md` — PR comment and notification delivery agent contract

**Dependencies:** ["context-and-schema-design"] (Wave 2 — requires events.yaml for event name references)

---

## Phase 3: Topology and Context Flows

**Phase name:** topology-and-context-flows
**Goal:** The complete communication architecture is documented — every agent-to-agent channel is specified with mechanism (sync or pub/sub), data type, and direction; context flow maps show what each agent reads and writes; the mixed sync/event-driven topology is explicitly encoded.
**Wave:** 3 (depends on Phase 2 agent contracts)

**Success criteria:**
- TOPOLOGY.md contains a Mermaid agent dependency graph covering all 6 agents
- TOPOLOGY.md channel table has one row per distinct communication channel (minimum 6 channels)
- TOPOLOGY.md includes dual-format YAML adjacency list
- CONTEXT-FLOWS.md has a per-agent context table for all 6 agents
- CONTEXT-FLOWS.md identifies the sync/async boundary explicitly (trigger-listener to diff-analyzer sync; downstream async)
- CONTEXT-FLOWS.md includes bottleneck analysis identifying context-starved or context-overloaded agents

**Requirements addressed:** locked-decisions (sync request/response boundary, pub/sub fanout), constraints (LLM latency budget drives parallel execution — documented in context flow)

**Artifacts:**
- `design/topology/TOPOLOGY.md` — Agent dependency graph and communication channels
- `design/context-flows/CONTEXT-FLOWS.md` — Per-agent context table and bottleneck analysis

**Dependencies:** ["agent-contracts"] (Wave 3 — requires agent contracts to draw dependency graph and enumerate context reads/writes)

---

## Phase 4: Failure Modes

**Phase name:** failure-modes
**Goal:** Every agent's failure modes are documented with concrete triggers, observable manifestations, severity levels, and step-by-step recovery procedures — including LLM-specific failures (timeout, hallucination, context overflow) and event-driven failures (race conditions, dead-letter queue overflow, duplicate delivery).
**Wave:** 4 (depends on Phase 2 agent contracts and Phase 3 topology)

**Success criteria:**
- Failure mode catalog exists for each of the 6 agents (6 files total)
- Each catalog has all 3 required sections: Failure Mode Catalog, Integration Point Failures, Residual Risks
- Each failure mode has: Trigger, Manifestation, Severity, Recovery (Immediate + Escalation), Detection
- logic-reviewer catalog explicitly covers LLM timeout, LLM hallucinated findings, and context window exhaustion
- synthesis-agent catalog covers race condition (missing StyleCheckComplete or LogicReviewComplete events)
- trigger-listener catalog covers duplicate webhook delivery idempotency

**Requirements addressed:** constraints (LLM latency budget — timeout failure modes), locked-decisions (severity ranking — synthesis-agent failure resolution)

**Artifacts:**
- `design/failure-modes/trigger-listener-failures.md` — Failure catalog for trigger-listener
- `design/failure-modes/diff-analyzer-failures.md` — Failure catalog for diff-analyzer
- `design/failure-modes/style-checker-failures.md` — Failure catalog for style-checker
- `design/failure-modes/logic-reviewer-failures.md` — Failure catalog for logic-reviewer
- `design/failure-modes/synthesis-agent-failures.md` — Failure catalog for synthesis-agent
- `design/failure-modes/notification-agent-failures.md` — Failure catalog for notification-agent

**Dependencies:** ["agent-contracts", "topology-and-context-flows"] (Wave 4 — requires agent contracts for failure point enumeration and topology for integration point identification)

---

## Phase 5: Verification and Integration

**Phase name:** verification-and-integration
**Goal:** The complete architecture package is verified for internal consistency — all cross-references are resolved, all agents are connected in the topology, all events have both producers and consumers, and the package is ready for developer handoff.
**Wave:** 5 (depends on all prior phases)

**Success criteria:**
- VERIFICATION.md status is "passed" or "gaps_found" (not "failed")
- INTEGRATION-REPORT.md is produced with cross-phase consistency results
- MANIFEST.md indexes all design documents with verification status
- DIGEST.md provides a phase-boundary summary for session continuity
- All design documents pass Level 1 (exists) and Level 2 (substantive) verification
- No circular agent spawning dependencies in Level 4 graph check

**Requirements addressed:** All phases — verification validates the full package

**Artifacts:**
- `design/VERIFICATION.md` — Level 1-4 verification results
- `design/INTEGRATION-REPORT.md` — Cross-phase consistency report
- `design/MANIFEST.md` — Document index with reading order
- `design/digests/phase-05-DIGEST.md` — Phase boundary digest

**Dependencies:** ["failure-modes"] (Wave 5 — runs after all design phases complete; invoked via /arch-gsd:verify-phase)

---

## Dependency Graph

```
Phase 1: context-and-schema-design (Wave 1)
  |
  v
Phase 2: agent-contracts (Wave 2)
  |
  v
Phase 3: topology-and-context-flows (Wave 3)
  |
  v
Phase 4: failure-modes (Wave 4)
  |
  v
Phase 5: verification-and-integration (Wave 5)
```

Phases 1-4 are design phases executed via /arch-gsd:execute-phase. Phase 5 is the verification phase executed via /arch-gsd:verify-phase. All phases are sequential in this system (6 agents, single-system scope — no parallel subsystem tracks needed).

---

## Artifact Index

| Document | Producing Phase |
|----------|----------------|
| design/events/events.yaml | Phase 1: context-and-schema-design |
| design/agents/trigger-listener.md | Phase 2: agent-contracts |
| design/agents/diff-analyzer.md | Phase 2: agent-contracts |
| design/agents/style-checker.md | Phase 2: agent-contracts |
| design/agents/logic-reviewer.md | Phase 2: agent-contracts |
| design/agents/synthesis-agent.md | Phase 2: agent-contracts |
| design/agents/notification-agent.md | Phase 2: agent-contracts |
| design/topology/TOPOLOGY.md | Phase 3: topology-and-context-flows |
| design/context-flows/CONTEXT-FLOWS.md | Phase 3: topology-and-context-flows |
| design/failure-modes/trigger-listener-failures.md | Phase 4: failure-modes |
| design/failure-modes/diff-analyzer-failures.md | Phase 4: failure-modes |
| design/failure-modes/style-checker-failures.md | Phase 4: failure-modes |
| design/failure-modes/logic-reviewer-failures.md | Phase 4: failure-modes |
| design/failure-modes/synthesis-agent-failures.md | Phase 4: failure-modes |
| design/failure-modes/notification-agent-failures.md | Phase 4: failure-modes |
| design/VERIFICATION.md | Phase 5: verification-and-integration |
