# [Component Name] -- Failure Modes

<!-- TEMPLATE: failure-modes.md
     Used by: failure-analyst (writer), arch-checker (reviewer), arch-verifier (validator)
     Purpose: Scaffold for failure mode catalogs. Each section has content
              expectations encoded as HTML comments — these are the verification
              rules that arch-checker uses.
     Reference: See references/agent-spec-format.md for failure mode quality standards.
-->

**Component:** [agent-name OR integration-point-name — use kebab-case for agents]
**Phase:** [Which design phase produced this document — e.g., "Phase 2: Core Agents"]
**Last Updated:** [YYYY-MM-DD]

---

## Failure Mode Catalog
<!-- REQUIRED SECTION — container for all named failure modes
     min_modes: 3 per component
     Each subsection follows the ### [FM-NNN] pattern.
     Section MUST NOT be empty or contain only the subsection headers.
     BANNED: leaving any "TBD" or "handles gracefully" in recovery actions.
     Failure modes must be component-specific, not generic ("network error").
-->

### [FM-001]: [Short descriptive name — e.g., "Upstream File Not Found"]
<!-- REQUIRED: Each failure mode must include ALL five fields: Trigger, Manifestation,
     Severity, Recovery (with Immediate + Escalation), Detection.
     min_lines: 6 per failure mode (not counting this comment)
     BANNED in Trigger: vague conditions like "if something goes wrong",
                        "on error", "in an unexpected situation"
     BANNED in Recovery: "handles gracefully", "escalates as needed",
                         "retries appropriately", "manages the situation",
                         "falls back gracefully", "notifies stakeholders"
     GOOD Trigger: "Input plan file does not exist at path .planning/phases/{NN}/{NN}-{plan}-PLAN.md
     when agent reads it at execution start"
     BAD Trigger: "If there is a problem reading the input"
     GOOD Recovery: "Immediate: Write { status: 'failed', error: 'plan_not_found',
     path: '{attempted_path}' } to stdout. Escalation: Orchestrator receives
     failed status and halts phase execution, prompting user to verify plan path."
     BAD Recovery: "Handles the error gracefully and retries as needed."
-->

**Trigger:** [Specific, observable condition that causes this failure — not vague]
**Manifestation:** [What the system does or fails to do when this failure occurs]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action taken within current execution — 0-5 seconds]
- Escalation: [If immediate recovery fails or is not possible, what happens next]
**Detection:** [How to detect this failure — programmatic check, log entry, output field]

---

### [FM-002]: [Short descriptive name — e.g., "Context Window Exceeded Mid-Task"]

**Trigger:** [Specific condition]
**Manifestation:** [Observable behavior]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action]
- Escalation: [Concrete next step]
**Detection:** [Detection method]

---

### [FM-003]: [Short descriptive name — e.g., "Output Schema Validation Failure"]

**Trigger:** [Specific condition]
**Manifestation:** [Observable behavior]
**Severity:** [critical | high | medium | low]
**Recovery:**
- Immediate: [Concrete action]
- Escalation: [Concrete next step]
**Detection:** [Detection method]

---

<!-- Add more failure modes (FM-004, FM-005, etc.) as needed.
     There is no maximum — all foreseeable failure modes should be documented.
     Prioritize by severity: critical and high first, then medium, then low. -->

## Integration Point Failures
<!-- REQUIRED SECTION if this document covers an agent or system that interfaces
     with other agents. For standalone components, this section may contain
     "N/A — no direct agent-to-agent integration points" but must NOT be omitted.
     Each integration failure must have: Failure Point, Trigger, Cascade, Recovery.
     min_items: 1 (or explicit N/A)
     BANNED in Recovery: "handles gracefully", "escalates as needed"
-->

### [INT-001]: [Short integration failure name — e.g., "Consumer Agent Timeout"]
<!-- Each integration failure covers a cross-agent boundary failure.
     Failure Point: which side of the integration fails (producer or consumer side).
     Cascade: which downstream agents are affected and how.
     GOOD Cascade: "arch-verifier receives no output from arch-executor; waits
     indefinitely until timeout; Phase 3 stalls and requires manual intervention."
     BAD Cascade: "downstream effects may occur."
-->

**Failure Point:** [Which side fails — producer side OR consumer side — and why]
**Trigger:** [What causes the integration failure]
**Cascade:** [Which downstream agents are affected and what observable effect]
**Recovery:** [How the system (orchestrator or human) restores correct state — be specific]

---

## Residual Risks
<!-- REQUIRED SECTION — known risks that are accepted rather than mitigated.
     These are risks the team is AWARE of but has decided not to mitigate in v1.
     Each residual risk must have: Risk description, Mitigation strategy, Review trigger.
     min_items: 1 (or explicit "None accepted")
     BANNED: omitting this section entirely
     GOOD risk: "Race condition between concurrent arch-executor invocations writing
     to the same design/agents/ directory when wave-based parallelization runs 3+
     agents simultaneously. Mitigation: file-level locking deferred to v2; current
     mitigation is ensuring parallel tasks write to distinct file paths. Review
     trigger: any parallel execution collision detected in Phase 3 testing."
     BAD risk: "Various edge cases may cause issues in production."
-->

### [RISK-001]: [Short risk name]

**Risk:** [Specific risk description — what could go wrong and under what conditions]
**Mitigation:** [Current mitigation strategy or explicit acceptance rationale]
**Review Trigger:** [Specific condition that should prompt re-evaluation of this risk]
