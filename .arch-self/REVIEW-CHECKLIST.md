# Self-Design Review Checklist

**Reviewed by:** [human fills in]
**Date:** [human fills in]
**Overall verdict:** [PASS / FAIL / PARTIAL]

## Completeness Checks

- [ ] All 11 agents have specs in self-design output
  - [ ] arch-checker
  - [ ] arch-executor
  - [ ] arch-integrator
  - [ ] arch-planner
  - [ ] arch-researcher
  - [ ] arch-roadmapper
  - [ ] arch-verifier
  - [ ] context-engineer
  - [ ] discuss-system
  - [ ] failure-analyst
  - [ ] schema-designer

- [ ] Event schemas exist with typed payloads (no any/object types)
- [ ] Topology document describes agent communication patterns
- [ ] Context flow maps show data movement between agents
- [ ] Failure mode catalogs exist with concrete recovery actions

**Quick verification commands:**
```bash
# Count agent specs (expect 11)
find .arch-self/phases/verification-and-integration/design/agents/ -name "*.md" | wc -l

# List agent names (should match actual agents/)
ls .arch-self/phases/verification-and-integration/design/agents/ | sed 's/\.md$//' | sort
ls agents/ | sed 's/\.md$//' | sort

# Count failure catalogs (expect 11)
find .arch-self/phases/verification-and-integration/design/failure-modes/ -name "*.md" | wc -l
```

## Structural Checks

- [ ] MANIFEST.md exists with document index and reading order
- [ ] VERIFICATION.md exists with Level 1-4 results
- [ ] No agent spec has TBD or placeholder sections
- [ ] No event field uses "any" or "object" as its type
- [ ] DEFERRED.md exists (even if convergence_status is "passed")
- [ ] .arch/ was NOT modified by the self-design run (all output in .arch-self/)

**Quick verification commands:**
```bash
# Verify MANIFEST.md exists
ls .arch-self/phases/verification-and-integration/design/MANIFEST.md

# Verify VERIFICATION.md status
node bin/arch-tools.js frontmatter get \
  .arch-self/phases/verification-and-integration/design/VERIFICATION.md --field status

# Verify DEFERRED.md convergence_status
node bin/arch-tools.js frontmatter get .arch-self/DEFERRED.md --field convergence_status

# Verify .arch/ was not modified
git diff --name-only -- .arch/
```

## Sufficiency for Re-Implementation

- [ ] A developer reading ONLY the self-design package (not the actual code) could understand what each agent does
- [ ] The communication patterns between agents are clear from topology + event schemas
- [ ] Failure modes describe what happens when each agent fails, not just that it "handles errors gracefully"
- [ ] The orchestration model (who spawns whom, in what order) is documented

**Spot-check commands:**
```bash
# Read arch-planner spec (key planning agent)
cat .arch-self/phases/verification-and-integration/design/agents/arch-planner.md

# Read arch-verifier spec (key quality gate)
cat .arch-self/phases/verification-and-integration/design/agents/arch-verifier.md

# Read TOPOLOGY.md for orchestration model
cat .arch-self/phases/verification-and-integration/design/topology/TOPOLOGY.md

# Read DEFERRED.md for convergence status
cat .arch-self/DEFERRED.md
```

## Convergence

- [ ] DEFERRED.md exists (even if convergence_status is "passed")
- [ ] If gaps were deferred, remediation paths are documented
- [ ] The iteration count is recorded (max 2 correction rounds enforced)

## Notes

[Human adds observations here]

---

## VALD-02: Architecture GSD Produced Complete Architecture Package for Itself

Expected: .arch-self/ contains a complete architecture package with all 5 required document types.

Checklist:
- [ ] .arch-self/CONTEXT.md validates with validate-context
- [ ] .arch-self/RESEARCH.md exists with Standard Stack, Architecture Patterns sections
- [ ] .arch-self/ROADMAP.md exists with 5+ phases and artifact lists
- [ ] design/events/events.yaml exists with typed payloads
- [ ] design/agents/ has 11 agent contracts
- [ ] design/topology/TOPOLOGY.md exists with Mermaid graph
- [ ] design/context-flows/CONTEXT-FLOWS.md exists with per-agent table
- [ ] design/failure-modes/ has 11 catalogs
- [ ] design/VERIFICATION.md exists with status field

**VALD-02 verdict:** [PASS / FAIL]

## VALD-03: Sufficient for Re-Implementation from Scratch

The key question: "Could a new developer use this package alone (no code access) to reconstruct an equivalent Architecture GSD system?"

- [ ] Agent names match actual production agents (diff should be empty)
- [ ] Event schemas describe all inter-agent state transitions
- [ ] Orchestration model (wave execution, bounded revision loop) is documented
- [ ] Failure modes are concrete enough to implement recovery logic

**VALD-03 verdict:** [PASS / FAIL]

## VALD-04: Convergence Criteria Prevent Infinite Loop

- [ ] DEFERRED.md has convergence_status field
- [ ] If convergence_status is "passed", 0 correction rounds were needed
- [ ] If convergence_status is "deferred", iteration_count <= 2

**VALD-04 verdict:** [PASS / FAIL]
