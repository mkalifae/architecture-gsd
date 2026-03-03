# Roadmap: AAA v1.1 GSD Tool Parity

## Overview

Close all 8 gaps identified in the GSD comparison analysis. Align agent tool assignments with GSD's proven permission boundary patterns, add internet-aware capabilities to researcher and planner agents, fix the new-system initialization workflow, and add two new specialist agents. All changes are markdown-only edits to agent spec files and slash command files.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Permission Boundaries** - Enforce write-once pattern for roadmapper, add Write to verifier and researcher (3 agents)
- [x] **Phase 2: Internet Access** - Add WebSearch, Context7, and WebFetch to arch-researcher and arch-planner
- [x] **Phase 3: Workflow Restructure** - Extend new-system to run full initialization pipeline; simplify plan-phase
- [x] **Phase 4: New Agents** - Create arch-debugger and system-analyzer agent spec files

## Phase Details

### Phase 1: Permission Boundaries
**Goal**: Each agent has exactly the file-mutation tools its role requires — roadmapper loses Edit (write-once), verifier and researcher gain Write (produce own output)
**Depends on**: Nothing (first phase)
**Requirements**: PERM-02, PERM-04, PERM-05
**Success Criteria** (what must be TRUE):
  1. arch-roadmapper agent spec lists Write without Edit in its tools section
  2. arch-verifier agent spec lists Write in its tools section (previously had none)
  3. arch-researcher agent spec lists Write in its tools section (previously had none)

> **Note:** discuss-system and arch-planner retain Edit — architecture intake refines CONTEXT.md iteratively, and planner iterates with checker in a feedback loop. This is a deliberate AAA domain adaptation, not a GSD discrepancy.
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Update tools frontmatter in 3 agent specs (roadmapper, verifier, researcher)

### Phase 2: Internet Access
**Goal**: arch-researcher and arch-planner can query live documentation and search for architecture patterns
**Depends on**: Phase 1
**Requirements**: INET-01, INET-02, INET-03, INET-04
**Success Criteria** (what must be TRUE):
  1. arch-researcher agent spec lists WebSearch in its tools section
  2. arch-researcher agent spec lists Context7 in its tools section
  3. arch-planner agent spec lists WebFetch in its tools section
  4. arch-planner agent spec lists Context7 in its tools section
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — Add internet tools to arch-researcher (WebSearch, Context7) and arch-planner (WebFetch, Context7)

### Phase 3: Workflow Restructure
**Goal**: Running `/AAA:new-system` produces CONTEXT.md, RESEARCH.md, and ROADMAP.md before the user reaches plan-phase
**Depends on**: Phase 1 (arch-researcher needs Write from PERM-05 before new-system can spawn it to write RESEARCH.md)
**Requirements**: WKFL-01, WKFL-02, WKFL-03
**Success Criteria** (what must be TRUE):
  1. `/AAA:new-system` command spec shows arch-researcher spawn step producing RESEARCH.md after intake
  2. `/AAA:new-system` command spec shows arch-roadmapper spawn step producing ROADMAP.md after research
  3. `/AAA:plan-phase` command spec assumes RESEARCH.md and ROADMAP.md exist with no fallback spawning logic
**Plans:** 1 plan

Plans:
- [x] 03-01-PLAN.md — Extend new-system with researcher/roadmapper spawn steps; simplify plan-phase prerequisite check

### Phase 4: New Agents
**Goal**: arch-debugger (verification failure diagnosis) and system-analyzer (brownfield architecture intake) agent specs exist and are installable
**Depends on**: Nothing (independent of other phases, sequenced last for logical grouping)
**Requirements**: AGNT-01, AGNT-02
**Success Criteria** (what must be TRUE):
  1. agents/arch-debugger.md exists with tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch — role focuses on diagnosing verification failures, cross-reference inconsistencies, and naming convention violations
  2. agents/system-analyzer.md exists with tools: Read, Write, Bash, Grep, Glob — role focuses on reading existing architecture documents/specs to inform new designs
  3. Both new agent specs follow the existing YAML frontmatter + XML sections format
  4. Both files are included in the npm package install manifest
**Plans:** 1 plan

Plans:
- [x] 04-01-PLAN.md — Create arch-debugger and system-analyzer agent specs; register in install manifest

## Progress

**Execution Order:**
Phases execute in order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Permission Boundaries | 1/1 | ✓ Complete | 2026-03-03 |
| 2. Internet Access | 1/1 | ✓ Complete | 2026-03-03 |
| 3. Workflow Restructure | 1/1 | ✓ Complete | 2026-03-03 |
| 4. New Agents | 1/1 | ✓ Complete | 2026-03-03 |
