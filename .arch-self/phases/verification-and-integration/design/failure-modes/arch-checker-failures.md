---
name: arch-checker-failures
agent: arch-checker
document_type: failure-catalog
version: "1.0"
---

# arch-checker — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: No PLAN.md Files Found in Phase Directory

**Trigger:** arch-checker is invoked for a phase but the phase directory contains no PLAN.md files — arch-planner failed silently, was not invoked, or wrote plans to the wrong path.

**Manifestation:** arch-checker cannot run any of the 8 quality dimensions — no subject to review. Returning PASSED with no plans reviewed would be a false positive that allows arch-executor to run with no planning substrate.

**Severity:** critical

**Recovery:**
- Immediate: 1. Glob the phase directory for *.md files. 2. If zero results, return { "status": "ISSUES_FOUND", "issues": [{ "plan": "none", "dimension": "D0-precondition", "severity": "critical", "detail": "No PLAN.md files found in .arch/phases/{phase}/ — arch-planner must run successfully before arch-checker", "remediation": "Re-invoke arch-planner for phase {phase} and confirm PLAN.md files exist before re-invoking arch-checker." }] }. 3. Do not attempt any dimension checks.
- Escalation: execute-phase orchestrator surfaces the ISSUES_FOUND with the D0-precondition issue to the human. Human confirms arch-planner was invoked and checks for path configuration errors.

**Detection:** Glob of phase directory returns zero PLAN.md files at the start of Step 2.

---

### FM-002: arch-checker Dimension Check Quality Degrades Under Context Pressure

**Trigger:** The phase has 5+ PLAN.md files with long action sections. arch-checker reads all plans plus reference documents (agent-spec-format.md, CONTEXT.md, ROADMAP.md) — total context approaches 40-50% utilization. Dimension D7 (file ownership) and D8 (locked-decision compliance) are checked last and receive degraded attention.

**Manifestation:** arch-checker returns PASSED for dimension D7 or D8 when those dimensions have actual issues. This allows defective plans to proceed to arch-executor, resulting in design documents with missing cross-references or locked-decision violations that arch-verifier must catch later.

**Severity:** medium

**Recovery:**
- Immediate: 1. Check dimension D8 (locked-decision compliance) FIRST, before reading full plan content, by extracting locked-decisions from CONTEXT.md and scanning plan action sections for conflicting text. 2. Check D7 (file ownership) SECOND by comparing the files_modified frontmatter list against the task files fields (mechanical check, low context cost). 3. Proceed with D1-D6 for plan content quality. This reorders checks by context cost rather than logical order.
- Escalation: If context pressure is severe (plan files total > 8000 lines), return ISSUES_FOUND with advisory: "Plans reviewed under context pressure — D1-D6 checks may be degraded. Recommend splitting plans into smaller groups (max 3 PLAN.md files per arch-checker invocation)."

**Detection:** Total line count of all PLAN.md files read at Step 2 exceeds 8000 lines (empirical context pressure threshold for sonnet model used in parallel).

---

### FM-003: Bounded Revision Loop Does Not Converge

**Trigger:** arch-checker returns ISSUES_FOUND 3 consecutive times for the same phase. arch-planner attempts corrections after each review but the same dimension (commonly D3: goal-backward derivation, or D5: anti-patterns) continues to fail.

**Manifestation:** The planner-checker iteration cap is reached. The execute-phase orchestrator escalates to human_needed. The human must manually review the PLAN.md and resolve the specific dimension failure that is preventing convergence.

**Severity:** high

**Recovery:**
- Immediate: arch-checker's role is to report accurately — the convergence cap is enforced by the execute-phase orchestrator, not by arch-checker. arch-checker must continue returning ISSUES_FOUND with specific remediation guidance for the failing dimension on every iteration, even the third.
- Escalation: On the third iteration, include in the ISSUES_FOUND response: "Note: This is iteration 3 of 3 — execute-phase will escalate to human_needed after this response. The human will need to manually address dimension {D_N} issue: {specific detail}."

**Detection:** execute-phase orchestrator tracks iteration count; arch-checker's own ISSUES_FOUND response includes iteration count in a note when it exceeds 2.

## Integration Point Failures

### INT-001: arch-checker Approves Plan That arch-executor Cannot Execute

**Trigger:** arch-checker's 8-dimension check does not catch an underspecification in a task action section that makes arch-executor unable to produce a concrete document. Example: a task action says "write the Role section" without specifying which agent, what spawner, or what model.

**Recovery:**
- Immediate: arch-executor returns human_needed when it detects a CONTEXT.md contradiction (Rule 4) or gaps_found when it cannot produce a complete document without additional specification. arch-verifier catches the resulting stub or incomplete document.

### INT-002: arch-checker Misidentifies Intentional Pattern as Dimension Failure

**Trigger:** A plan correctly honors a locked decision that appears to violate a standard pattern. Example: context-engineer is listed as Wave 0 (before arch-researcher's Wave 1) due to a locked decision, but arch-checker flags this as a D4 wave ordering violation.

**Recovery:**
- Immediate: arch-checker must read CONTEXT.md locked-decisions BEFORE running D4 checks. If a wave ordering deviation matches a locked decision, mark D4 as PASSED with a note: "Wave deviation matches locked decision: {decision text}."

## Residual Risks

### RISK-001: Plan Quality Cannot Guarantee Design Document Quality

arch-checker can only verify that plans are well-structured and cover all required artifacts. It cannot verify that the plan's action instructions will produce high-quality design documents when arch-executor runs them. The quality gap between "plan passes 8 dimensions" and "design document passes Level 2 substantive check" is bridged by arch-executor's implementation quality, which arch-checker cannot pre-evaluate.
