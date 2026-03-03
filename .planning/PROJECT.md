# AAA — Architecture Agent Assembly

## What This Is

A multi-agent architecture design system for Claude Code that produces verified architecture packages for agentic systems. Given a system description, AAA orchestrates 13 specialized agents through plan-execute-verify cycles to generate agent specifications, event schemas, topology diagrams, and failure catalogs. Distributed as `npx aaa-cc`.

## Core Value

Agent tool assignments follow principled permission boundaries — each agent has exactly the tools its role requires, no more, no less — so the system produces consistent, verifiable architecture designs without unintended side effects.

## Current State

Shipped v1.1 GSD Tool Parity. All agent tool assignments now follow principled permission boundaries. 13 agents, 6 slash commands, internet-aware researcher and planner, full initialization pipeline.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ 11 specialized agents with contract-driven specs — v1.0
- ✓ 6 slash commands (new-system, plan-phase, execute-phase, verify-phase, progress, resume) — v1.0
- ✓ 4-level verification (Exists, Substantive, Cross-Referenced, Consistent) — v1.0
- ✓ Wave-based parallel execution — v1.0
- ✓ Model profiles (quality/balanced/budget) — v1.0
- ✓ npm packaging and interactive installer — v1.0
- ✓ Agent tool assignments match principled permission boundaries — v1.1
- ✓ Internet-aware agents (WebSearch, WebFetch, Context7) — v1.1
- ✓ Write-without-Edit pattern for report-producing agents — v1.1
- ✓ `/AAA:new-system` runs full initialization pipeline — v1.1
- ✓ Debug agent for verification failure diagnosis — v1.1
- ✓ System analyzer for brownfield architecture intake — v1.1

### Active

<!-- Next milestone scope. To be defined by /gsd:new-milestone. -->

(None yet — run `/gsd:new-milestone` to define next scope)

### Out of Scope

- Multi-CLI support (OpenCode, Gemini, Codex) — AAA is Claude Code only
- Quick mode / ad-hoc tasks — architecture design is deliberate, not ad-hoc

## Context

AAA was derived from GSD (Get Shit Done, 23.5k stars). GSD builds software; AAA designs architectures. The 10 meta-patterns (thin orchestrator, disk-as-shared-memory, contract-driven specs, wave parallelization, goal-backward verification) transferred directly. v1.1 closed all 8 tool assignment gaps identified in the GSD comparison analysis.

## Constraints

- **Backwards compatibility**: Existing agent spec format (YAML frontmatter + XML sections) must be preserved
- **No runtime code changes**: Tool changes are markdown-only (agent spec files)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Edit on discuss-system and arch-planner | Architecture intake and planning are iterative — unlike GSD's code-write-once domain | ✓ Good |
| Remove Edit only from arch-roadmapper | Roadmap is written once per phase, matches GSD's write-once pattern | ✓ Good |
| Add WebSearch + Context7 to researcher/planner | Architecture design benefits from current docs and patterns | ✓ Good |
| Write-without-Edit for arch-verifier | Verifier should produce reports but not modify design artifacts | ✓ Good |
| Restructure new-system pipeline | plan-phase shouldn't discover missing prerequisites | ✓ Good |
| arch-debugger defers LOW-confidence fixes to human | Speculative fixes that introduce new inconsistencies are worse than partial fixes | ✓ Good |
| system-analyzer is read-only (no Edit) | Analysis-only; modifying artifacts crosses into design decision territory | ✓ Good |

---
*Last updated: 2026-03-03 after v1.1 milestone*
