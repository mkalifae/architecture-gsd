---
name: arch-roadmapper-failures
agent: arch-roadmapper
document_type: failure-catalog
version: "1.0"
---

# arch-roadmapper — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Phase Structure Cannot Be Determined from Low-Confidence Research

**Trigger:** .arch/RESEARCH.md has confidence: LOW (fewer than 3 HIGH-confidence sources). The domain is novel enough that standard phase templates do not apply. arch-roadmapper cannot determine whether the system needs 3 or 6 phases.

**Manifestation:** arch-roadmapper produces a ROADMAP.md with a generic 5-phase template that may miss domain-specific design concerns. Phases may lack appropriate artifact lists for the target system.

**Severity:** medium

**Recovery:**
- Immediate: 1. Apply the standard 5-phase template: context+schema, agents, topology+context-flows, failure-modes, verification+integration. 2. Write ROADMAP.md with this template. 3. Return { "status": "gaps_found", "gaps": ["Research confidence is LOW — standard 5-phase template applied; human review of ROADMAP.md recommended before executing Phase 1"] }.
- Escalation: Human reviews ROADMAP.md and adds domain-specific phases or artifacts before running execute-phase.

**Detection:** RESEARCH.md metadata section shows Confidence: LOW.

---

### FM-002: Artifact Dependency Ordering Violation in Phase List

**Trigger:** arch-roadmapper produces a ROADMAP.md where an artifact of type B (requires type A) is listed in an earlier phase than an artifact of type A. Example: agent contracts (type B) listed in Phase 1, event schema (type A) in Phase 2. This violates ARTIFACT_DEPENDENCY_RULES.

**Manifestation:** arch-planner computes wave assignments from ROADMAP.md and detects that an artifact in Phase 1 depends on an artifact in Phase 2. Cross-phase wave assignments are impossible — arch-planner flags the ordering violation.

**Severity:** high

**Recovery:**
- Immediate: 1. Apply ARTIFACT_DEPENDENCY_RULES at Step 3: events before agents, agents before topology, failure modes after agents, verification last. 2. Re-order phases to satisfy the rules. 3. If a locked decision requires a specific ordering that contradicts the rules, document the override in ROADMAP.md.
- Escalation: Return gaps_found with the specific phase ordering conflict and the rule being violated.

**Detection:** Step 3 DFS traversal finds a phase where artifact type B appears before the phase producing type A.

---

### FM-003: Phase Count Exceeds 7 for Large System

**Trigger:** The target system is highly complex (20+ agents, mixed communication patterns), and the standard 5-phase template is insufficient. Applying domain-specific phases (e.g., separate phases for auth, API layer, event bus) produces a 9-phase ROADMAP.md.

**Manifestation:** execute-phase orchestrator's context budget is strained tracking 9 concurrent phase executions. arch-planner's wave assignments become complex.

**Severity:** medium

**Recovery:**
- Immediate: 1. Consolidate phases by combining related artifact types: merge "auth-agent-contracts" and "API-agent-contracts" into one "agent-contracts" phase. 2. Cap at 7 phases. 3. Document the consolidation rationale in ROADMAP.md.
- Escalation: Return gaps_found if consolidation cannot reduce to 7 phases without creating dependency violations.

**Detection:** Phase count after Step 2 > 7.

## Integration Point Failures

### INT-001: arch-planner Cannot Decompose a Phase (Missing Artifact List)

**Trigger:** ROADMAP.md has a phase entry with no artifact list (the array is empty or the key is missing). arch-roadmapper's write was incomplete.

**Recovery:**
- Immediate: arch-planner returns failed with the specific phase number. execute-phase orchestrator re-runs arch-roadmapper in correction mode to populate the missing artifact list.

### INT-002: ROADMAP.md Phase Goals Too Vague for must_haves Derivation

**Trigger:** Phase goals in ROADMAP.md are abstract ("design the agents") rather than outcome-specific ("produce 11 agent contracts with all 7 XML sections validated by detect-stubs"). arch-planner cannot derive specific must_haves truths from abstract goals.

**Recovery:**
- Immediate: arch-planner infers truths from the artifact list rather than the goal. arch-checker's D3 check (goal-backward derivation) will catch if truths are not genuinely derived from the goal.

## Residual Risks

### RISK-001: Phase Structure Determines Design Package Depth

The number and structure of phases directly determines the depth of the architecture package. A 3-phase ROADMAP.md (schema, agents, verification) produces a shallower package than a 5-phase ROADMAP.md (schema, agents, topology, failure-modes, verification). arch-roadmapper's phase decomposition is the primary lever for design quality. This risk cannot be mitigated by downstream agents — they execute the phases they are given, not the phases the system optimally needs.
