---
name: arch-integrator-failures
agent: arch-integrator
document_type: failure-catalog
version: "1.0"
---

# arch-integrator — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Circular Dependency Detected (Intentional Bounded Revision Loop)

**Trigger:** `node bin/arch-tools.js check-cycles --design-dir design/` detects a cycle in the agent dependency graph at Step 4. For Architecture GSD self-design, the most common cycle is arch-planner → arch-checker → arch-planner — the bounded revision loop. This cycle is by design (max 3 iterations) but appears as a circular dependency to the graph traversal algorithm.

**Manifestation:** arch-integrator returns human_needed with the cycle described. The verify-phase workflow halts and presents the cycle to the human. If the human does not understand that this is an intentional bounded revision loop, they may attempt to re-architect the system to eliminate it, which would destroy the adversarial review pattern.

**Severity:** low (expected for Architecture GSD self-design)

**Recovery:**
- Immediate: 1. Detect the cycle path from check-cycles output. 2. Check if the cycle path contains both "arch-planner" and "arch-checker" as adjacent nodes. 3. If yes, classify as "intentional bounded revision loop" and document in INTEGRATION-REPORT.md: "arch-planner ↔ arch-checker cycle is the intentional bounded revision loop per STATE.md decision [03-04] (max 3 iterations). This is not an architectural error." 4. Return human_needed with the specific explanation so the human can confirm rather than having to investigate.
- Escalation: Human reviews INTEGRATION-REPORT.md and confirms the cycle is the intended revision loop. Returns "confirmed: intentional" to the orchestrator, which proceeds to MANIFEST.md generation.

**Detection:** check-cycles output contains a cycle path with "arch-planner" and "arch-checker" as adjacent nodes.

---

### FM-002: Agent Contract Not Covered by CONTEXT.md Actors

**Trigger:** arch-integrator's Step 5 cross-check finds an agent contract file in design/agents/{name}.md whose name does not appear in the CONTEXT.md actors list. This indicates a design document was produced for an agent not declared in the system scope.

**Manifestation:** The architecture package contains a design for an undeclared agent. This is a scope violation: the human's system specification did not include this agent, so the design is broader than the intended scope.

**Severity:** high

**Recovery:**
- Immediate: 1. Return { "status": "gaps_found", "gaps": ["Agent contract {name}.md exists but {name} not in CONTEXT.md actors list — possible scope violation"] }. 2. Do NOT delete or modify the agent contract. 3. Include in INTEGRATION-REPORT.md: "Scope warning: {agent-name} contract exists but actor not declared in CONTEXT.md — human must confirm whether to retain or remove." 4. Provide the specific CONTEXT.md actors list and the agent name for easy comparison.
- Escalation: Human either confirms the agent was intentionally added (update CONTEXT.md to include it) or confirms it should be removed (remove the contract and re-run verify-phase).

**Detection:** Step 5: agent contract filename (without .md) does not appear in any entry in CONTEXT.md actors list.

---

### FM-003: haiku Model Context Budget Exceeded on Large Design Package

**Trigger:** The design package has 20+ documents across 5+ phases. Even with digest-first orientation (max 50 lines per DIGEST.md), reading 5 digests (250 lines) plus 20 full design documents (averaging 150 lines each) plus reference files exceeds the haiku model's effective context budget for cross-phase name resolution quality.

**Manifestation:** arch-integrator's name resolution quality degrades for later documents. Cross-phase references between Phase 4 (failure modes) and Phase 2 (agent contracts) may be missed because the Phase 2 agent names are no longer in the active context window when Phase 4 documents are analyzed.

**Severity:** high

**Recovery:**
- Immediate: 1. Confirm that digest-first pattern was applied at Step 2 (DIGEST.md files read before full documents). 2. If total document count > 20, batch the cross-phase name resolution in groups: first batch all agent contracts, then failure catalogs, then topology/context-flows. 3. Build the name registry incrementally, using arch-tools.js find-orphans and check-cycles which handle their own file reading.
- Escalation: If context pressure is severe, return { "status": "gaps_found", "gaps": ["Cross-phase name resolution may be incomplete — N documents exceed haiku context budget. Run arch-integrator again with sonnet model for this design package."] }. The orchestrator can upgrade the model for the re-run.

**Detection:** Before Step 3, calculate estimated document total: count DIGEST.md files × 50 lines + count design docs × average_lines. If total > 6000 lines estimated, trigger batch processing.

## Integration Point Failures

### INT-001: DIGEST.md Files Missing (Digest-First Pattern Fails)

**Trigger:** arch-integrator attempts digest-first orientation at Step 2 but no DIGEST.md files exist in design/digests/. This means verify-phase was not completed for prior phases (DIGEST.md is written at Step 8 of verify-phase, the final step).

**Recovery:**
- Immediate: 1. Skip digest-first orientation. 2. Proceed directly to full document reading. 3. Note in INTEGRATION-REPORT.md: "Digest-first orientation skipped — no DIGEST.md files found; proceeding with full document reads." 4. This increases context pressure but does not make integration impossible.

### INT-002: arch-tools.js find-orphans Returns Error for Large Design Packages

**Trigger:** The find-orphans command fails or times out for design packages with 20+ documents. This can occur if the YAML traversal in arch-tools.js Level 4 encounters malformed YAML blocks.

**Recovery:**
- Immediate: 1. Capture the stderr. 2. Fall back to manual Grep-based orphan detection: grep all agent names from design/agents/ against all documents in design/topology/ and design/context-flows/. 3. Record the fallback in INTEGRATION-REPORT.md with the specific error.

## Residual Risks

### RISK-001: Cross-Phase Consistency Cannot Guarantee Runtime Consistency

arch-integrator verifies that agent names resolve across documents and that no cycles exist in the static dependency graph. It cannot verify dynamic execution order, timing-dependent race conditions between parallel agents, or consistency under retry scenarios. These runtime properties require simulation or actual execution, which are outside the scope of static architecture verification.
