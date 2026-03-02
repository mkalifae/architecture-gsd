---
name: arch-planner-failures
agent: arch-planner
document_type: failure-catalog
version: "1.0"
---

# arch-planner — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: ROADMAP.md Phase Entry Missing or Has No Artifact List

**Trigger:** The current phase number from .arch/STATE.md Current Position does not match any entry in .arch/ROADMAP.md, OR the matching entry has no artifact list (the key is absent or the array is empty). This occurs when arch-roadmapper failed to produce a complete ROADMAP.md or when STATE.md phase counter advanced past the last ROADMAP.md entry.

**Manifestation:** arch-planner cannot decompose the phase — no artifacts to assign to tasks. Zero PLAN.md files are written. The phase directory remains empty. arch-checker cannot run. The design pipeline stalls.

**Severity:** critical

**Recovery:**
- Immediate: 1. Read STATE.md Current Position to confirm the current phase number. 2. Read ROADMAP.md to confirm no matching entry exists. 3. Return { "status": "failed", "error": "Phase N not found in ROADMAP.md or has no artifact list", "message": "Re-run arch-roadmapper to regenerate ROADMAP.md before retrying arch-planner." }. 4. Do NOT write any partial PLAN.md files.
- Escalation: execute-phase orchestrator receives the failed status and re-runs arch-roadmapper to regenerate ROADMAP.md, then re-spawns arch-planner. If arch-roadmapper also fails, escalate to human with the specific phase number and ROADMAP.md content.

**Detection:** ROADMAP.md parsing at Step 2 produces an empty entry or KeyError for the phase number from STATE.md.

---

### FM-002: Too Many Tasks — Phase Exceeds 15-Task Limit

**Trigger:** After Step 6 decomposition, the phase artifact list produces more than 15 individual tasks. For Architecture GSD self-design, the agent-contracts phase (11 agents) is at risk: 11 tasks is within the 15-task limit, but a system with 20+ agents would exceed it.

**Manifestation:** More than 5 PLAN.md files required after grouping (3 tasks per plan = 5 plans max). The execute-phase orchestrator's context budget for tracking parallel executions is strained above 5 plans.

**Severity:** medium

**Recovery:**
- Immediate: 1. Group related tasks aggressively by domain cluster (e.g., "ingestion agents", "processing agents"). 2. Apply 3-tasks-per-plan grouping. 3. If still > 5 plans after grouping, return { "status": "gaps_found", "gaps": ["Phase has N tasks — recommend splitting: 'agent-contracts-part-1 (agents A-F)' and 'agent-contracts-part-2 (agents G-K)'"] }. 4. Write the PLAN.md files for the first cluster only.
- Escalation: Human reviews the task count and either approves the split into sub-phases or confirms that the current grouping is acceptable (4+ tasks per plan is permissible if the context budget impact is acknowledged).

**Detection:** Task count after Step 6 decomposition > 15. For Architecture GSD self-design: 11 agent contracts is within bounds.

---

### FM-003: Wave Assignment Creates Circular Dependency After Locked-Decision Override

**Trigger:** A locked decision in CONTEXT.md mandates an ordering that contradicts ARCHITECTURE_DEPENDENCY_RULES. Example: if a locked decision specifies "topology before agent contracts", this inverts the standard rule (topology normally comes AFTER agent contracts). The wave assignment algorithm produces a circular dependency.

**Manifestation:** max(assigned_waves) > len(tasks) — mathematical indicator of a dependency cycle in the wave graph. arch-planner cannot produce a valid parallel execution schedule.

**Severity:** high

**Recovery:**
- Immediate: 1. Detect the cycle at Step 7 end check: if max(task.wave) > len(tasks), cycle exists. 2. Identify the conflicting task pair by tracing the dependency edges. 3. Break the cycle by forcing both conflicting tasks into the same wave (parallel execution). 4. Document the forced parallel assignment in the affected PLAN.md <action>: "Forced to same wave as {other_task} due to circular dependency — review cross-references manually." 5. Return { "status": "gaps_found", "gaps": ["Circular dependency between {taskA} (type: {typeA}) and {taskB} (type: {typeB}) — forced to same wave. Manual review required."] }.
- Escalation: arch-checker receives the PLAN.md with the forced parallel assignment and flags the wave ordering anomaly for human review (Dimension D4 of arch-checker's 8-dimension check).

**Detection:** Post-Step-7 check: max(task.wave for task in tasks) > len(tasks).

## Integration Point Failures

### INT-001: arch-checker Returns ISSUES_FOUND for 3 Consecutive Iterations

**Trigger:** arch-planner writes PLAN.md files, arch-checker reviews them, ISSUES_FOUND is returned, arch-planner corrects the plans, arch-checker reviews again — this cycle repeats 3 times without convergence.

**Recovery:**
- Immediate: execute-phase orchestrator enforces the 3-iteration cap. After the third ISSUES_FOUND, the orchestrator returns human_needed with the unresolved issue list. arch-planner's role is to produce plans and accept corrections — the iteration cap is enforced externally.

### INT-002: ROADMAP.md Phase Goal Too Vague for Goal-Backward Derivation

**Trigger:** The ROADMAP.md phase goal is written at too high an abstraction level to derive specific must_haves truths. Example: "Design the agents" (no testable outcome) rather than "Produce 11 agent contracts with all 7 required XML sections."

**Recovery:**
- Immediate: arch-planner infers specific truths from the artifact list rather than the goal: if the artifact list is [arch-planner.md, arch-checker.md, arch-executor.md], the truth is "Each of the 3 agent contracts has <role>, <upstream_input>, <downstream_consumer>, <execution_flow>, <structured_returns>, <failure_modes>, <constraints> XML sections and passes detect-stubs."

## Residual Risks

### RISK-001: Plan Action Sections Cannot Fully Specify Design Intent

arch-planner writes plan action sections that specify what arch-executor should write. However, the richness of a design document (concrete failure triggers, specific event payload types, accurate cross-references) exceeds what can be specified in a plan action. The quality gap between "plan specifies 7 required sections" and "arch-executor writes substantive 7-section document" is bridged only by arch-executor's design capability — not by the plan. This is a fundamental limitation: plans are specifications, not implementations.
