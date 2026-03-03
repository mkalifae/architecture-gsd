# GSD vs AAA: Agent Tool Comparison & Gap Analysis

## Context

GSD (Get Shit Done) is the upstream system AAA was derived from. GSD builds software; AAA designs architectures. Both use the same orchestration patterns but assign different tools to their agents. This document captures the tool-level differences and identifies actionable gaps for AAA's next milestone.

---

## GSD Agent Tool Matrix (11 agents)

| Agent | Read | Write | Edit | Bash | Grep | Glob | WebSearch | WebFetch | Context7 |
|-------|:----:|:-----:|:----:|:----:|:----:|:----:|:---------:|:--------:|:--------:|
| gsd-planner | x | x | - | x | x | x | - | x | x |
| gsd-executor | x | x | x | x | x | x | - | - | - |
| gsd-verifier | x | x | - | x | x | x | - | - | - |
| gsd-debugger | x | x | x | x | x | x | x | - | - |
| gsd-plan-checker | x | - | - | x | x | x | - | - | - |
| gsd-phase-researcher | x | x | - | x | x | x | x | x | x |
| gsd-project-researcher | x | x | - | x | x | x | x | x | x |
| gsd-roadmapper | x | x | - | x | x | x | - | - | - |
| gsd-codebase-mapper | x | x | - | x | x | x | - | - | - |
| gsd-research-synthesizer | x | x | - | x | - | - | - | - | - |
| gsd-integration-checker | x | - | - | x | x | x | - | - | - |

## AAA Agent Tool Matrix (11 agents)

| Agent | Model | Read | Write | Edit | Bash | Grep | Glob | WebSearch | WebFetch | Context7 |
|-------|-------|:----:|:-----:|:----:|:----:|:----:|:----:|:---------:|:--------:|:--------:|
| discuss-system | opus | x | x | x | x | x | x | - | - | - |
| arch-researcher | sonnet | x | - | - | x | x | x | - | x | - |
| arch-roadmapper | opus | x | x | x | x | x | x | - | - | - |
| arch-planner | sonnet | x | x | x | x | x | x | - | - | - |
| arch-checker | haiku | x | - | - | x | x | x | - | - | - |
| arch-executor | sonnet | x | x | x | x | x | x | - | - | - |
| arch-verifier | sonnet | x | - | - | x | x | x | - | - | - |
| arch-integrator | haiku | x | - | - | x | x | x | - | - | - |
| context-engineer | opus | x | x | x | x | x | x | - | - | - |
| schema-designer | sonnet | x | x | x | x | x | x | - | - | - |
| failure-analyst | sonnet | x | x | x | x | x | x | - | - | - |

---

## Key Differences

### 1. Internet Access (WebSearch + WebFetch + Context7)

GSD gives 3 agents internet access (planner, phase-researcher, project-researcher). AAA gives only 1 agent (arch-researcher) partial access (WebFetch only, no WebSearch, no Context7).

**Impact:** AAA agents cannot look up current architecture patterns, framework documentation, or reference implementations during design. All knowledge comes from the model's training data.

### 2. Edit Tool Distribution

GSD restricts Edit to 2 agents (executor, debugger). AAA gives Edit to 7 of 11 agents.

**Impact:** GSD enforces a stricter write-once pattern — most agents create new files but don't modify existing ones. AAA allows broader document mutation, which suits iterative architecture refinement but increases the risk of unintended overwrites.

### 3. Write-Without-Edit Pattern

GSD uses Write-without-Edit for 7 agents (planner, verifier, roadmapper, mapper, both researchers, synthesizer). AAA never uses this pattern — every agent with Write also has Edit.

**Impact:** GSD agents that produce reports (verifier, synthesizer) can create output files but cannot modify design artifacts. AAA doesn't enforce this boundary.

### 4. Read-Only Agent Count

GSD has 2 read-only agents (plan-checker, integration-checker). AAA has 4 read-only agents (arch-checker, arch-verifier, arch-integrator, arch-researcher).

**Impact:** AAA enforces stronger separation between verification/analysis and document production. However, arch-researcher being read-only means it cannot write RESEARCH.md directly — the orchestrator must handle that.

### 5. Model Declaration

GSD does not declare models in agent frontmatter; model assignment is external via config profiles. AAA declares models per-agent in frontmatter (opus/sonnet/haiku).

**Impact:** AAA is more self-documenting but less flexible. Changing a model requires editing the agent spec file rather than just the config.

---

## Identified Gaps (AAA)

### Gap 1: No WebSearch capability

**Current state:** Zero AAA agents have WebSearch.
**GSD equivalent:** gsd-debugger, gsd-phase-researcher, gsd-project-researcher all have WebSearch.
**Recommendation:** Add WebSearch to arch-researcher. Architecture design benefits from searching for current patterns, anti-patterns, and real-world case studies.
**Priority:** High

### Gap 2: No Context7 (MCP documentation) integration

**Current state:** Zero AAA agents have Context7.
**GSD equivalent:** gsd-planner, gsd-phase-researcher, gsd-project-researcher all have `mcp__context7__*`.
**Recommendation:** Add Context7 to arch-researcher and arch-planner. When designing systems that integrate specific frameworks or libraries, agents should be able to pull current documentation.
**Priority:** High

### Gap 3: No Write-without-Edit enforcement for verification agents

**Current state:** Verification agents (arch-verifier, arch-integrator) are read-only. But agents that produce reports alongside verification (like writing VERIFICATION.md) need Write. GSD's verifier has Write but not Edit.
**Recommendation:** Add Write (without Edit) to arch-verifier so it can produce VERIFICATION.md directly. Keep arch-integrator and arch-checker read-only. This matches GSD's pattern where report-producing agents can create but not modify.
**Priority:** Medium

### Gap 4: arch-researcher cannot write its own output

**Current state:** arch-researcher is read-only (Read, Bash, Grep, Glob, WebFetch). It cannot write RESEARCH.md.
**GSD equivalent:** gsd-phase-researcher has Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, Context7.
**Recommendation:** Add Write to arch-researcher so it can produce RESEARCH.md directly instead of relying on the orchestrator to capture its output.
**Priority:** High

### Gap 5: Edit access — tropicalized for AAA domain

**Current state:** 7 of 11 AAA agents have Edit. GSD gives Edit to only 2 of 11.
**AAA domain analysis:** Architecture design is more iterative than code generation. discuss-system refines CONTEXT.md during conversation flow. arch-planner iterates with arch-checker in a feedback loop. These agents legitimately need Edit.
**Recommendation (tropicalized):**
- **Keep Edit** on discuss-system (iterative intake refinement)
- **Keep Edit** on arch-planner (checker feedback loop requires plan refinement)
- **Remove Edit** from arch-roadmapper (roadmap is written once per phase)
- Keep Edit on arch-executor, context-engineer, schema-designer, failure-analyst (iterative design work).
**Priority:** Medium

### Gap 6: No debug agent or workflow

**Current state:** AAA has no equivalent to GSD's gsd-debugger.
**GSD equivalent:** gsd-debugger has Read, Write, Edit, Bash, Grep, Glob, WebSearch — the broadest toolset.
**Recommendation:** Consider adding an arch-debugger agent for diagnosing verification failures and cross-reference inconsistencies. Lower priority since architecture design has fewer runtime errors than code.
**Priority:** Low

### Gap 7: No codebase-mapper equivalent

**Current state:** AAA has no way to analyze an existing codebase before designing an architecture.
**GSD equivalent:** gsd-codebase-mapper (Read, Write, Bash, Grep, Glob) explores brownfield codebases.
**Recommendation:** Consider adding an arch-scout or system-analyzer agent that reads existing codebases or architecture docs to inform new designs.
**Priority:** Low

---

## Summary: Proposed Tool Changes

| Agent | Current Tools | Proposed Changes |
|-------|--------------|-----------------|
| arch-researcher | Read, Bash, Grep, Glob, WebFetch | **Add:** Write, WebSearch, Context7 |
| arch-planner | Read, Write, Edit, Bash, Grep, Glob | **Add:** WebFetch, Context7 (keep Edit — checker loop) |
| arch-verifier | Read, Bash, Grep, Glob | **Add:** Write |
| discuss-system | Read, Write, Edit, Bash, Grep, Glob | No change (iterative intake needs Edit) |
| arch-roadmapper | Read, Write, Edit, Bash, Grep, Glob | **Remove:** Edit |
| arch-executor | Read, Write, Edit, Bash, Grep, Glob | No change |
| arch-checker | Read, Bash, Grep, Glob | No change |
| arch-integrator | Read, Bash, Grep, Glob | No change |
| context-engineer | Read, Write, Edit, Bash, Grep, Glob | No change |
| schema-designer | Read, Write, Edit, Bash, Grep, Glob | No change |
| failure-analyst | Read, Write, Edit, Bash, Grep, Glob | No change |

---

## Workflow Gaps

### Gap 8: `/AAA:new-system` does not produce RESEARCH.md or ROADMAP.md

**Current state:** `/AAA:new-system` runs structured intake (discuss-system agent) and produces only `.arch/CONTEXT.md`. When the user then runs `/AAA:plan-phase 1`, the plan-phase command discovers RESEARCH.md and ROADMAP.md are missing and has to spawn arch-researcher and arch-roadmapper itself before it can begin planning.

**GSD equivalent:** `/gsd:new-project` runs the full pipeline in one command:
1. Questions → extract requirements
2. Spawn 4 parallel research agents
3. Synthesize research into REQUIREMENTS.md
4. Spawn roadmapper → produce ROADMAP.md

By the time the user runs `/gsd:plan-phase`, all prerequisites exist.

**Impact:** AAA's plan-phase is doing work that should belong to new-system. This creates confusion (user expects to plan, but first has to wait for research + roadmapping) and breaks the separation of concerns between project initialization and phase planning.

**Recommendation:** Extend `/AAA:new-system` to run the full initialization pipeline:
1. discuss-system → CONTEXT.md (existing)
2. arch-researcher → RESEARCH.md (move from plan-phase)
3. arch-roadmapper → ROADMAP.md (move from plan-phase)

Then `/AAA:plan-phase N` can assume RESEARCH.md and ROADMAP.md exist and focus solely on decomposing the phase into tasks.

**Priority:** Critical — this is a workflow-breaking issue that confuses the user experience.

---

## Source Data

- **GSD repo:** https://github.com/gsd-build/get-shit-done (v1.22.1, 23.5k stars)
- **AAA repo:** local at `/home/mkali/Claude_Code/best-practices` (v1.0.0)
- **Analysis date:** 2026-03-03
