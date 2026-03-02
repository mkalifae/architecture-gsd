---
name: discuss-system-failures
agent: discuss-system
document_type: failure-catalog
version: "1.0"
---

# discuss-system — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: CONTEXT.md Validation Fails After 2 Correction Rounds

**Trigger:** node bin/arch-tools.js validate-context .arch/CONTEXT.md returns valid: false for a missing required field after the initial write AND after 1 correction prompt — the human provided clarification but the field remains empty or structurally invalid (e.g., scale.agents provided as a string not an integer).

**Manifestation:** .arch/CONTEXT.md exists on disk but is invalid. All downstream agents (arch-researcher, arch-roadmapper, arch-planner, arch-executor) that read CONTEXT.md encounter missing fields and return failed or gaps_found status. The design pipeline cannot start.

**Severity:** critical

**Recovery:**
- Immediate: 1. Read the validate-context result to identify the specific missing_fields array. 2. Return { "status": "gaps_found", "gaps": [list of field names], "message": "CONTEXT.md validation failed after 2 correction attempts — specific fields: {list}" }. 3. Do NOT re-attempt a third correction round — return gaps_found immediately. 4. Include the last validation error detail so the human knows exactly which fields to fix.
- Escalation: new-system.md surfaces the gaps_found to the human with the explicit field names and example valid values. The human re-runs /arch-gsd:new-system with a more precise system description that addresses the specific empty fields.

**Detection:** validate-context missing_fields array is non-empty at the second correction attempt in Step 5.

---

### FM-002: Human Provides Vague or Ambiguous System Description

**Trigger:** The system description provided via the slash command argument contains no identifiable domain, no actors, and no concrete constraints. Example: "A system that helps businesses." after which the intake dialogue cannot produce a meaningful CONTEXT.md.

**Manifestation:** discuss-system produces a CONTEXT.md with domain like "Business automation system" (no specifics), actors like "User, System, Admin" (generic roles), and empty constraints list. validate-context may pass (fields are present), but downstream agents produce irrelevant architecture output that does not match the human's actual system.

**Severity:** high

**Recovery:**
- Immediate: 1. During Step 3, if any field produces a value containing fewer than 3 specific technical terms, flag it as potentially vague. 2. Present 2-3 example descriptions from similar domains: "For comparison: 'GitHub webhook → trigger-listener (Node.js) → diff-analyzer → [style-checker | logic-reviewer] (parallel fanout) → synthesis-agent → notification-agent → GitHub PR Review API.'" 3. Ask the human to re-submit with more specificity before writing CONTEXT.md.
- Escalation: If the human re-submits equally vague content after one re-prompt, write the CONTEXT.md with generic inferences and return gaps_found with guidance: "Review .arch/CONTEXT.md and manually fill the [constraints, scale.agents] fields before running execute-phase."

**Detection:** Step 3 field values for domain, constraints contain fewer than 3 domain-specific technical terms after processing the human input.

---

### FM-003: validate-context Tool Unavailable

**Trigger:** node bin/arch-tools.js validate-context .arch/CONTEXT.md returns a non-zero exit code (tool failure, not validation failure) at Step 5. The validation gate cannot run.

**Manifestation:** discuss-system cannot confirm whether CONTEXT.md is valid. Returning status: "complete" without a passing validate-context result would silently allow invalid CONTEXT.md to propagate to downstream agents.

**Severity:** high

**Recovery:**
- Immediate: 1. Inspect the stderr output from the failed arch-tools.js invocation to determine the root cause (missing bin/arch-tools.js, Node.js version error, invalid JSON output). 2. If the tool file is missing, return { "status": "failed", "error": "arch-tools.js not found at bin/arch-tools.js — run Phase 1 plan 01-02 to restore tooling" }. 3. If the tool is present but erroring, manually check CONTEXT.md for all 6 required fields (domain, actors, non-goals, constraints, scale, locked-decisions) and if all 6 are non-empty, return status: "complete" with a note: "validate-context unavailable — manual field check passed."
- Escalation: Report the arch-tools.js failure to the human with the specific error and instruct them to run Phase 1 plan 01-02 to restore the tooling before retrying.

**Detection:** arch-tools.js exit code is non-zero at Step 5. Distinguished from validate-context valid: false by the presence of stderr output or the absence of valid/missing_fields JSON structure in stdout.

## Integration Point Failures

### INT-001: discuss-system Completes but new-system.md validate-context Fails

**Trigger:** discuss-system returns status: "complete" with .arch/CONTEXT.md. new-system.md then runs its own validate-context safety check and it fails (a different validation run encounters a field that discuss-system's validation missed, possibly due to encoding issues or late file write race condition).

**Manifestation:** The design pipeline appears to succeed from discuss-system's perspective but new-system.md blocks the pipeline and reports a validation failure. The human sees an inconsistent state.

**Recovery:**
- Immediate: new-system.md re-invokes discuss-system in correction mode, passing the specific failed field names. discuss-system re-reads CONTEXT.md, edits the failed fields using the Edit tool, and re-runs validate-context.

### INT-002: context-engineer Overwrites discuss-system's locked-decisions

**Trigger:** context-engineer is invoked after discuss-system and its normalization logic removes or modifies a locked-decision from the original intake.

**Manifestation:** CONTEXT.md locked-decisions list no longer matches what discuss-system produced. Downstream agents (arch-planner, arch-executor) make wave ordering or design decisions based on incorrect locked decisions.

**Recovery:**
- Immediate: This is caught by context-engineer's own FAILURE-01 invariant check. If not caught there, arch-integrator Level 4 consistency check detects the divergence when CONTEXT.md locked-decisions do not match the design documents' stated rationale.

## Residual Risks

### RISK-001: Intake Quality Determines All Downstream Design Quality

The entire architecture package quality is bounded by the quality of discuss-system's intake dialogue. A CONTEXT.md with subtly incorrect constraints (e.g., scale.agents: 6 for an 11-agent system) produces arch-planner plans sized for 6 agents — all wave groupings are calibrated incorrectly. This risk cannot be mitigated by any downstream agent because they treat CONTEXT.md as authoritative. Only human review of CONTEXT.md before running execute-phase can catch this class of error.
