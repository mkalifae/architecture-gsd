---
name: arch-executor-failures
agent: arch-executor
document_type: failure-catalog
version: "1.0"
---

# arch-executor — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: detect-stubs Finds Stubs After 2 Correction Iterations

**Trigger:** arch-executor writes a design document and detect-stubs returns stubs_found > 0. arch-executor rewrites the flagged sections and re-runs detect-stubs. After 2 correction iterations, detect-stubs still returns stubs_found > 0. The most common locations: failure_modes section (vague recovery language), constraints section (placeholder entries), execution_flow section (incomplete step descriptions).

**Manifestation:** Design document exists on disk but contains stub phrases. It will fail Level 2 verification (arch-verifier detects stubs). The document is committed but flagged in the structured return as gaps_found.

**Severity:** medium

**Recovery:**
- Immediate: 1. After the second failed correction, return { "status": "gaps_found", "output": "{file}", "stubs_found": N, "gaps": ["Stub phrases remain in sections: {list} after 2 correction attempts"] }. 2. Commit the document with the gap noted in the commit message: "feat({phase}): write {doc} (gaps_found: stubs in {sections})". 3. Do NOT attempt a third correction — return gaps_found and let the orchestrator decide whether to re-invoke or proceed.
- Escalation: execute-phase orchestrator logs the gap. If the orchestrator's correction_mode is enabled (triggered by verification gaps), it may re-invoke arch-executor with explicit instruction to focus on the specific stub-containing sections.

**Detection:** detect-stubs exit code 0 but stubs_found > 0 in JSON output at Step 8 after the second correction attempt.

---

### FM-002: CONTEXT.md Contradicts Task Scope (Rule 4 Violation)

**Trigger:** The task's files field specifies writing an agent contract for N agents, but CONTEXT.md actors list specifies a different number or completely different set of agents. Example: task says "write arch-executor agent contract" but CONTEXT.md actors does not include any agent named "arch-executor."

**Manifestation:** arch-executor cannot write a document that contradicts CONTEXT.md without violating the Rule 4 constraint. If it proceeds, it produces an agent contract for an actor not in the CONTEXT.md. arch-integrator will flag this as an orphaned agent.

**Severity:** critical

**Recovery:**
- Immediate: 1. At Step 7, compare the agent name in the task files field against CONTEXT.md actors list. 2. If no match found, STOP immediately. 3. Return { "status": "human_needed", "output": null, "error": "Task scope inconsistent with CONTEXT.md: task writes '{agent}' agent contract but '{agent}' is not in CONTEXT.md actors list", "message": "STOP — Rule 4 triggered" }. 4. Write no output to disk.
- Escalation: The orchestrator surfaces the human_needed status to the human with the specific discrepancy. Human either updates CONTEXT.md actors to include the missing agent, or updates the PLAN.md task to use the correct agent name.

**Detection:** Step 7 Rule 4 check: agent name in files path does not appear in CONTEXT.md actors list.

---

### FM-003: Context Window Exhaustion Before All 7 Agent Spec Sections Written

**Trigger:** Writing a complex agent contract (200+ lines of dual-format content) combined with reading 6-7 input files (PLAN.md, two templates, two reference files, CONTEXT.md, RESEARCH.md, events.yaml) consumes enough context that later sections (failure_modes, constraints) are written with less depth than earlier sections (role, upstream_input).

**Manifestation:** The failure_modes section contains 1-2 failure modes instead of the required 3+. The constraints section has fewer than 3 items. detect-stubs may not catch these quality degradations because "technically compliant" shorter content uses no banned phrases.

**Severity:** high

**Recovery:**
- Immediate: 1. Write all 7 required sections even if later ones are shorter. 2. Run detect-stubs — it catches overt stub phrases but not content-depth issues. 3. For failure_modes: ensure at least 3 named failures with severity, trigger, and recovery (even if recovery is compressed to 2-3 sentences). 4. Return { "status": "gaps_found", "gaps": ["Sections <failure_modes>, <constraints> may be degraded due to context pressure — manual review recommended"] }.
- Escalation: arch-verifier Level 2 COMPLETE/INCOMPLETE rubric catches content-depth failures at verification time. The orchestrator may re-invoke arch-executor on degraded sections only in correction mode.

**Detection:** After writing upstream_input section, if the total context consumed exceeds 60% utilization estimate, treat remaining sections as context-pressure risk. Compress synthesis and prioritize section presence over depth.

## Integration Point Failures

### INT-001: arch-executor Writes to Wrong Path (File Ownership Violation)

**Trigger:** Two arch-executor instances run in parallel for the same wave. One instance writes to a path it does not own (misread the files field from another task in the PLAN.md).

**Recovery:**
- Immediate: arch-checker's D7 check (file ownership) should have caught this before execution. If it was missed, arch-integrator detects the path conflict during Level 4 name-file alignment checks. The incorrect file is overwritten by the correct owner's execution.

### INT-002: events.yaml Not Available for Wave 3 Agent Contracts

**Trigger:** arch-executor is invoked for an agent-contract task in Wave 3 but design/events/events.yaml was not produced in Wave 1 (schema-designer failed or was not invoked).

**Recovery:**
- Immediate: arch-executor proceeds without cross-referencing events. Returns { "status": "gaps_found", "gaps": ["events.yaml not found — agent contract written without event cross-references"] }. arch-verifier Level 3 will catch the missing cross-references.

## Residual Risks

### RISK-001: Content Depth Cannot Be Mechanically Verified

detect-stubs catches banned phrases but cannot evaluate whether a non-stub section is substantively complete. An execution_flow section with "Step 1: Read inputs. Step 2: Write output." passes detect-stubs but fails the COMPLETE/INCOMPLETE rubric. This gap is only caught by arch-verifier Level 2, which reads the section and applies the rubric — a semantic check that requires model evaluation, not just pattern matching.
