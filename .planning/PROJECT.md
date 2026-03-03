# AAA — Architecture Agent Assembly

## What This Is

A multi-agent architecture design system for Claude Code that produces verified architecture packages for agentic systems. Given a system description, AAA orchestrates 11 specialized agents through plan-execute-verify cycles to generate agent specifications, event schemas, topology diagrams, and failure catalogs. Distributed as `npx aaa-cc`.

## Core Value

Agent tool assignments follow principled permission boundaries — each agent has exactly the tools its role requires, no more, no less — so the system produces consistent, verifiable architecture designs without unintended side effects.

## Current Milestone: v1.1 GSD Tool Parity

**Goal:** Close all 8 gaps identified in the GSD comparison analysis. Align agent tool assignments with GSD's proven patterns, add internet-aware capabilities, and fix the initialization workflow.

**Target features:**
- Add WebSearch, Context7, and Write to arch-researcher
- Add Context7 and WebFetch to arch-planner; remove Edit
- Add Write (without Edit) to arch-verifier
- Remove Edit from discuss-system and arch-roadmapper
- Restructure `/AAA:new-system` to produce RESEARCH.md + ROADMAP.md
- Add arch-debugger agent for diagnosing verification failures
- Add system-analyzer agent for brownfield architecture analysis

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ 11 specialized agents with contract-driven specs — v1.0
- ✓ 6 slash commands (new-system, plan-phase, execute-phase, verify-phase, progress, resume) — v1.0
- ✓ 4-level verification (Exists, Substantive, Cross-Referenced, Consistent) — v1.0
- ✓ Wave-based parallel execution — v1.0
- ✓ Model profiles (quality/balanced/budget) — v1.0
- ✓ npm packaging and interactive installer — v1.0

### Active

<!-- Current scope. Building toward these. -->

- [ ] Agent tool assignments match principled permission boundaries
- [ ] Internet-aware agents (WebSearch, WebFetch, Context7)
- [ ] Write-without-Edit pattern for report-producing agents
- [ ] `/AAA:new-system` runs full initialization pipeline
- [ ] Debug agent for verification failure diagnosis
- [ ] System analyzer for brownfield architecture intake

### Out of Scope

- Multi-CLI support (OpenCode, Gemini, Codex) — AAA is Claude Code only for now
- Quick mode / ad-hoc tasks — architecture design is deliberate, not ad-hoc
- Milestone lifecycle (complete-milestone, audit-milestone) — premature for v1.1
- Phase insertion/removal — premature for v1.1

## Context

AAA was derived from GSD (Get Shit Done, 23.5k stars). GSD builds software; AAA designs architectures. The 10 meta-patterns (thin orchestrator, disk-as-shared-memory, contract-driven specs, wave parallelization, goal-backward verification) transferred directly. However, agent tool assignments diverged during the domain pivot, creating permission gaps and inconsistencies documented in `GSD-vs-AAA-tool-comparison.md`.

## Constraints

- **Backwards compatibility**: Existing agent spec format (YAML frontmatter + XML sections) must be preserved
- **No runtime code changes**: Tool changes are markdown-only (agent spec files)
- **Workflow change scope**: Only `/AAA:new-system` command needs restructuring; other commands unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tighten Edit access (remove from 3 agents) | Matches GSD's write-once pattern; prevents unintended overwrites | — Pending |
| Add WebSearch + Context7 to researcher/planner | Architecture design benefits from current docs and patterns | — Pending |
| Write-without-Edit for arch-verifier | Verifier should produce reports but not modify design artifacts | — Pending |
| Restructure new-system pipeline | plan-phase shouldn't discover missing prerequisites | — Pending |

---
*Last updated: 2026-03-03 after GSD comparison analysis*
