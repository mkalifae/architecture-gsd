---
name: arch-verifier-failures
agent: arch-verifier
document_type: failure-catalog
version: "1.0"
---

# arch-verifier — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Level 3 Agent_Referenced False Positive

**Trigger:** arch-verifier's Level 3 check calls `node bin/arch-tools.js verify level3 {file} --design-dir design/` for an agent spec. The tool checks that the agent name appears in at least one workflow file in workflows/ or orchestration document in design/orchestration/. For the target system being designed (not Architecture GSD itself), the agents live in design/topology/TOPOLOGY.md and design/context-flows/CONTEXT-FLOWS.md, not in a workflows/ directory.

**Manifestation:** Level 3 returns agent_referenced: false for all agent specs in the design package. VERIFICATION.md status is set to gaps_found for all agent contracts. arch-executor is re-invoked in correction mode for agents that are not actually orphaned.

**Severity:** medium

**Recovery:**
- Immediate: 1. When agent_referenced: false is returned, inspect the TOPOLOGY.md and CONTEXT-FLOWS.md in the design directory. 2. If the agent name appears 5+ times in TOPOLOGY.md or CONTEXT-FLOWS.md, classify the finding as a false positive. 3. Mark the finding as result: "info" with note: "Agent referenced in TOPOLOGY.md/CONTEXT-FLOWS.md — Level 3 tool checks workflows/ only; false positive confirmed." 4. Set VERIFICATION.md status to passed if all other checks pass and all Level 3 agent_referenced failures are documented false positives.
- Escalation: Document the false positive pattern in VERIFICATION.md with specific evidence (line numbers and file paths where the agent is referenced). This documentation is required for human reviewer to accept the passed status despite Level 3 findings.

**Detection:** Level 3 returns agent_referenced: false AND the agent name appears 5+ times in design/topology/TOPOLOGY.md or design/context-flows/CONTEXT-FLOWS.md.

---

### FM-002: Level 4 Event Checks Skipped Due to Path Discovery Issue

**Trigger:** `node bin/arch-tools.js verify level4 --design-dir design/` cannot find events.yaml because the tool looks for design/events.yaml but the actual path is design/events/events.yaml (with subdirectory).

**Manifestation:** Level 4 event name resolution checks (event_resolves and orphaned_event_check) are skipped. Agent contracts that reference events by name cannot be validated against the schema. The VERIFICATION.md records level_4 as partially run.

**Severity:** medium

**Recovery:**
- Immediate: 1. Run Level 4 checks that do not require events.yaml: agent name resolution in documents, no circular dependencies, name-matches-filename. 2. Record in VERIFICATION.md: "Level 4 partial: event resolution checks skipped — events.yaml not found at design/events.yaml; actual path is design/events/events.yaml." 3. Manually run: find design/ -name "events.yaml" | head -1 to confirm the actual path. 4. Include levels_run: [1, 2, 3, "4-partial"] in VERIFICATION.md frontmatter.
- Escalation: Include an Open Question in VERIFICATION.md: "Recommend updating arch-tools.js verify level4 to check design/events/events.yaml in addition to design/events.yaml — fix in arch-tools.js would close this gap."

**Detection:** Glob for design/events.yaml returns no match but find design/ -name events.yaml returns a result.

---

### FM-003: arch-tools.js Command Failure on Multiple Documents

**Trigger:** `node bin/arch-tools.js verify level2 <file> --type agent` returns non-zero exit code for multiple agent spec files during Step 4. This could indicate a Node.js version incompatibility, a malformed agent spec that crashes the parser, or a tooling bug.

**Manifestation:** Multiple Level 2 checks fail with non-zero exit codes. arch-verifier cannot distinguish tooling failure from genuine document gaps. Recording all of them as verification failures would produce false ISSUES_FOUND.

**Severity:** high

**Recovery:**
- Immediate: 1. For each non-zero exit code, capture stderr and log it separately in VERIFICATION.md "Tooling Errors" section. 2. Mark affected documents as "check_skipped: tooling_error" rather than pass or fail. 3. Continue checking documents where the tool succeeds. 4. If the tool fails for > 50% of documents, return { "status": "failed", "error": "arch-tools.js Level 2 failures on N documents — tooling unavailable" }. 5. If < 50% fail, return { "status": "gaps_found", "gaps": ["Level 2 tool failure on N documents — manual review required"] }.
- Escalation: Human diagnoses arch-tools.js using the captured stderr output. Common causes: js-yaml version mismatch (run npm install in project root), Node.js version < 16 (upgrade Node.js), file encoding issues (re-save affected documents in UTF-8).

**Detection:** Non-zero exit code from arch-tools.js verify level2 at Step 4.

## Integration Point Failures

### INT-001: VERIFICATION.md Written with Incorrect Status (False Positive Pass)

**Trigger:** arch-verifier documents Level 3 agent_referenced findings as false positives and sets status: passed. But the documentation of why they are false positives is insufficient — the human reviewer cannot confirm the rationale.

**Recovery:**
- Immediate: Include specific evidence in each false positive finding: the agent name, the TOPOLOGY.md line number where it appears, and the reference count.

### INT-002: arch-integrator Cannot Proceed Because VERIFICATION.md Status is Failed

**Trigger:** arch-verifier returns status: "failed" (no design documents found or all tool calls failed). arch-integrator checks VERIFICATION.md status and cannot proceed.

**Recovery:**
- Immediate: arch-integrator returns immediately with failed status. Orchestrator surfaces the chain: arch-verifier failed → arch-integrator skipped → human must re-run arch-executor before re-running verify-phase.

## Residual Risks

### RISK-001: Structural Verification Cannot Validate Semantic Correctness

arch-verifier checks structure, cross-references, and name resolution. It cannot determine whether a system described in the design documents will actually work. An agent contract may pass all 4 verification levels while describing an incorrect algorithm, a race condition, or an impossible state transition. Semantic correctness requires human architectural review, not automated verification.
