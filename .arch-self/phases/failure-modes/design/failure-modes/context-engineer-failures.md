---
name: context-engineer-failures
agent: context-engineer
document_type: failure-catalog
version: "1.0"
---

# context-engineer — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Locked-Decision Overwrite Attempted

**Trigger:** During Step 5 edit of CONTEXT.md, context-engineer's normalization logic attempts to modify, remove, or reorder an entry in the locked-decisions field. This can occur when research finds a conflicting recommendation or when ROADMAP.md uses different terminology for a locked technology choice.

**Manifestation:** If the overwrite were to proceed, downstream agents would read a different locked-decisions list than discuss-system produced during intake. arch-verifier Level 4 locked-decision compliance checks would flag design documents as violating the original locked decisions.

**Severity:** critical

**Recovery:**
- Immediate: 1. At Step 1, record the locked-decisions array as the immutable baseline. 2. Before writing any edit at Step 5, diff the proposed change against the baseline. 3. If any locked-decision entry would be removed, modified, or reordered, STOP. 4. Return { "status": "human_needed", "error": "Attempted to modify locked-decision: '{decision}' — research or ROADMAP.md conflicts with intake decision. Human must resolve conflict explicitly." }. 5. Write no changes to CONTEXT.md.
- Escalation: Human reviews the conflict between the locked decision and the conflicting recommendation. Human either confirms the locked decision stands (no change) or explicitly updates it by manually editing CONTEXT.md.

**Detection:** Pre-edit diff at Step 5 shows any item removed, modified, or reordered in the locked-decisions array.

---

### FM-002: Actor Name Inconsistency Between CONTEXT.md and ROADMAP.md

**Trigger:** ROADMAP.md references an actor name (e.g., "event-router") that is semantically equivalent to an existing CONTEXT.md actor (e.g., "event-bus") but uses different terminology. context-engineer cannot determine whether to add the new name or merge it with the existing actor.

**Manifestation:** context-engineer adds the ROADMAP.md actor as a new entry, resulting in two actors that represent the same component under different names. arch-integrator Level 4 finds that agent contracts use one name while topology documents use the other.

**Severity:** medium

**Recovery:**
- Immediate: 1. Add a constraint entry in CONTEXT.md: "Actor naming ambiguity: ROADMAP.md uses '{roadmap_name}' which may be the same as '{context_name}' in actors list. Verify naming consistency in Phase 2 agent contracts." 2. Do NOT add the ROADMAP.md name as a new actor entry until the ambiguity is resolved. 3. Return status: "complete" with refinements_applied documenting the constraint added.
- Escalation: arch-planner encounters the constraint in Phase 2 task decomposition and adds explicit agent naming guidance to the task action sections.

**Detection:** Step 4 comparison finds ROADMAP.md actor reference with Levenshtein distance < 3 from an existing CONTEXT.md actor name.

---

### FM-003: All 6 Fields Already Valid — No-Op Invocation

**Trigger:** context-engineer is invoked but validate-context already returns valid: true for the CONTEXT.md (discuss-system produced a fully valid context on the first attempt). context-engineer does not need to run.

**Manifestation:** context-engineer is a no-op — no refinements are possible or needed. This is not a failure, but an invocation that wastes a Task() spawn if the orchestrator does not check the validate-context result before spawning context-engineer.

**Severity:** low

**Recovery:**
- Immediate: 1. At Step 1, run validate-context before doing anything else. 2. If valid: true and no empty_required_fields, return immediately with { "status": "complete", "refinements_applied": [], "message": "CONTEXT.md already valid — no refinements needed" }. 3. Do not read RESEARCH.md or ROADMAP.md — unnecessary file reads waste context budget.
- Escalation: execute-phase orchestrator should check validate-context result before conditionally spawning context-engineer (spawn only if validate-context returns warnings or empty_required_fields).

**Detection:** validate-context returns valid: true with empty missing_fields and empty_required_fields arrays at Step 2.

## Integration Point Failures

### INT-001: context-engineer Refinements Invalidate Prior arch-planner Work

**Trigger:** context-engineer is invoked mid-pipeline (after arch-planner has already run for Phase 1) and its actor list refinements add new actors that Phase 1 plans do not cover. The Phase 1 PLAN.md files are now incomplete relative to the updated CONTEXT.md.

**Recovery:**
- Immediate: context-engineer's append-only constraint is designed to prevent this: adding actors does not invalidate existing plans, because arch-planner only needs to cover the actors it knew about when it ran. New actors require new plans in a subsequent phase.
- Immediate (for orchestrator): If context-engineer is invoked after any arch-planner phase has started, the orchestrator must re-evaluate whether the phase plans still cover all CONTEXT.md actors.

### INT-002: CONTEXT.md Edit Introduces YAML Syntax Error

**Trigger:** context-engineer uses Edit tool to append a constraint entry and the appended text has incorrect YAML indentation, producing a YAML syntax error that causes validate-context to fail with a parse error rather than a field validation error.

**Recovery:**
- Immediate: 1. Re-run validate-context after every edit. 2. If validate-context fails with a YAML parse error (not a field error), read the CONTEXT.md and identify the malformed section. 3. Re-apply the edit with correct YAML indentation. 4. If the edit cannot be applied correctly with the Edit tool (due to whitespace sensitivity), use Write tool to re-write the entire CONTEXT.md with the refinements applied.

## Residual Risks

### RISK-001: Append-Only Constraint Allows CONTEXT.md to Accumulate Stale Entries

context-engineer's append-only rule prevents removing actors or constraints. Over multiple correction rounds, the actors list may accumulate entries that were added speculatively but are no longer applicable. These stale entries cause arch-planner to plan tasks for non-existent agents. arch-integrator catches this with the "contract exists but not in CONTEXT.md actors" check in reverse — but "in CONTEXT.md actors but no contract" is not currently checked.
