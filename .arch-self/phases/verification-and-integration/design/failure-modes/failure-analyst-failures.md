---
name: failure-analyst-failures
agent: failure-analyst
document_type: failure-catalog
version: "1.0"
---

# failure-analyst — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Agent Contract Not Found for Analysis

**Trigger:** failure-analyst is assigned a task to produce the failure mode catalog for agent X, but design/agents/X.md does not exist. The agent contract was not produced by arch-executor in Wave 2 (task failed or wave timing issue).

**Manifestation:** failure-analyst cannot enumerate failure modes without reading the agent's execution flow. Writing a generic failure catalog without the agent contract produces a document that fails Level 2 substantive check — sections will be vague or stub-like.

**Severity:** critical

**Recovery:**
- Immediate: 1. Check for design/agents/{agent-name}.md. 2. If not found, return { "status": "failed", "output": null, "error": "Agent contract not found: design/agents/{agent-name}.md — cannot produce failure catalog without agent contract", "message": "Re-run arch-executor for {agent-name} task before invoking failure-analyst." }. 3. Write no output.
- Escalation: Orchestrator re-queues the arch-executor task for the missing agent contract and re-invokes failure-analyst after the contract is written.

**Detection:** File existence check at Step 1 for design/agents/{agent-name}.md.

---

### FM-002: Recovery Sections Contain Banned Vague Language

**Trigger:** Under context pressure or when the failure trigger is abstract (e.g., "system failure"), failure-analyst writes recovery sections using vague non-actionable language that matches STUB_PATTERNS in detect-stubs. detect-stubs flags these as stub phrases at Step 7.

**Manifestation:** detect-stubs at Step 7 returns stubs_found > 0 for the failure catalog. The catalog fails Level 2 verification. arch-executor correction mode is required.

**Severity:** medium

**Recovery:**
- Immediate: 1. For each flagged recovery section, rewrite with numbered concrete steps: "1. Check the specific error condition (e.g., exit code, HTTP status code, field value). 2. Log the specific field values that caused the failure. 3. Return { status: 'specific-status', error: 'specific-error-message', ... }." 2. If the recovery action genuinely cannot be more specific than "log and return failed" — document WHY: "Recovery limited to logging: the triggering condition is a platform-level failure outside the agent's control." 3. Re-run detect-stubs after rewriting.
- Escalation: If stubs persist after rewriting, return gaps_found with the specific sections that remain vague. arch-verifier Level 2 will catch them.

**Detection:** detect-stubs output stubs_found > 0 at Step 7 of failure-analyst execution.

---

### FM-003: Fewer Than 3 Failure Modes Identified

**Trigger:** The agent contract being analyzed has a simple execution flow (3-4 steps with no external dependencies) and failure-analyst can only identify 2 meaningful failure modes. Adding a third would require stretching the analysis to include very low-probability failures that don't merit documented recovery procedures.

**Manifestation:** Failure mode catalog has only 2 FM-XXX entries. arch-verifier Level 2 checks the failure catalog against the templates/failure-modes.md minimum (3 failure modes required). The catalog fails the minimum content check.

**Severity:** low

**Recovery:**
- Immediate: 1. Review the agent's execution flow one more time, focusing on: external API calls (what if the API returns unexpected HTTP status?), file reads (what if the file is syntactically valid but semantically incorrect?), and structured return boundaries (what if the upstream agent returns an unexpected status value?). 2. At least one of these surfaces a third failure mode. 3. If truly only 2 exist, add a "Context Window Exhaustion" failure mode (FM-003 equivalent) — applicable to every agent and always valid.
- Escalation: Return the catalog with 3 failure modes including the context window one, and note in the structured return: "Third failure mode (context window exhaustion) added to meet minimum catalog requirements — the agent's simple execution flow only surfaces 2 domain-specific failures."

**Detection:** FM entry count < 3 after Step 3 selection in failure-analyst execution flow.

## Integration Point Failures

### INT-001: Failure Catalog Not Cross-Referenced in Agent Spec

**Trigger:** failure-analyst writes design/failure-modes/{agent}-failures.md but the corresponding agent spec in design/agents/{agent}.md does not have a cross-reference to the catalog in its failure_modes section. arch-verifier Level 3 failure_modes_linked check fails.

**Recovery:**
- Immediate: arch-executor writes the cross-reference comment in the agent spec failure_modes section: "See also: design/failure-modes/{agent}-failures.md — Complete failure mode catalog for {agent}." If arch-executor has already committed the agent spec without this reference, arch-executor is re-invoked in correction mode to add the cross-reference.

### INT-002: Failure Modes Conflict with Actual Agent Recovery in Agent Spec

**Trigger:** failure-analyst writes a recovery action for FM-001 that differs from the recovery described in the corresponding agent spec's failure_modes XML section. The two documents describe the same failure with different recovery steps.

**Recovery:**
- Immediate: The failure mode catalog is the authoritative source for detailed recovery procedures. The agent spec failure_modes section contains a summary. failure-analyst's recovery steps take precedence for detail. arch-integrator Level 4 does not currently cross-check catalog vs. spec recovery parity — this gap may be surfaced in future arch-tools.js updates.

## Residual Risks

### RISK-001: Failure Modes Describe Known Failures, Not Unknown Unknowns

failure-analyst enumerates failure modes based on reading the agent contract's execution flow. It can only identify failures that are evident from the documented steps, inputs, and outputs. Emergent failures — those arising from unexpected interactions between multiple agents running in parallel, context window saturation at specific token counts, or model API latency spikes — cannot be detected by static analysis of agent contracts. These residual unknowns require operational monitoring and observability tooling beyond the architecture design scope.
