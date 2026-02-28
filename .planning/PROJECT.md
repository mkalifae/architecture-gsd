# Architecture GSD

## What This Is

A standalone multi-agent orchestration system that produces verified architecture design packages for agentic systems. It takes natural language system intent as input and outputs a complete set of architecture documents — agent contracts, typed event schemas, orchestration topology, context flow maps, failure modes, and verification strategy — sufficient for a team to implement the system from scratch. Built as a Claude Code CLI tool with slash commands, reusing GSD's 10 proven meta-patterns (thin orchestrator, disk-as-shared-memory, wave-based parallelization, goal-backward verification) with architecture-domain agents instead of code-domain agents.

## Core Value

Given a description of an agentic system, produce a complete, internally consistent, cross-referenced architecture package that a development team can implement without needing to make architectural decisions.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Human architect can describe a system in natural language and receive a structured architecture package
- [ ] System derives design phases from system intent (not a fixed template)
- [ ] 11 specialized agents collaborate to produce architecture documents (discuss-system, arch-researcher, arch-roadmapper, arch-planner, arch-checker, arch-executor, arch-verifier, arch-integrator, context-engineer, schema-designer, failure-analyst)
- [ ] Output is dual-format: markdown prose for human review + structured YAML/JSON schemas for programmatic verification
- [ ] Output is protocol-agnostic but structurally mappable to MCP/A2A
- [ ] Goal-backward verification ensures cross-reference consistency across all documents (every event reference resolves, every agent reference resolves, no circular dependencies)
- [ ] 4-level artifact verification: Exists → Substantive → Cross-Referenced → Internally Consistent
- [ ] Wave-based parallelization for design tasks within phases
- [ ] Bounded revision loops (max 3 cycles) between planner and checker
- [ ] STATE.md survives context resets — any agent can resume work from disk state
- [ ] System can design itself (self-consistency / dog-fooding test)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Code generation from architecture documents — Architecture GSD produces specs, not implementations
- Runtime validation of designs — verification is structural (cross-references, completeness), not behavioral
- Infrastructure/deployment design — unless it's a component of the agentic system being designed
- Database schema design — unless it's part of the agent state model
- Coupling to specific protocols (MCP, A2A) — output is abstract; protocol mapping is a future translation layer
- Web/chat interface — CLI-first via Claude Code slash commands
- Monolithic application architecture — system targets agentic/multi-agent/event-driven systems specifically

## Context

**Origin:** GSD (Get Shit Done) is a proven multi-agent orchestration system for building software. Its 10 meta-patterns — thin orchestration, disk-as-shared-memory, contract-driven agent specs, pre-computed wave dependencies, goal-backward verification, structured returns, bounded revision loops, autonomous deviation authority, state-survives-reset, and model profiles — solve universal multi-agent coordination problems, not code-specific ones. Architecture GSD keeps this orchestration machinery and replaces the domain expertise: agents write architecture documents instead of code.

**Research foundation:** Comprehensive research on agentic architecture patterns (2025-2026) covering multi-agent coordination (swarm, DAG, hierarchical, pub/sub, blackboard, orchestrator-worker), context engineering (sliding window, KV cache, cross-agent handoff), intent preservation (goal decomposition, drift detection, goal-backward analysis), verification (VeriMAP, dedicated verifiers, consensus mechanisms, quality gates), event-driven schemas (A2A, MCP, ESAA, schema evolution), and framework comparison (Claude Agent SDK, CrewAI, AutoGen, LangGraph, OpenAI Agents SDK).

**Key insight from research:** No existing framework targets architecture design as its output domain. They all produce code, chat responses, or task completions. Architecture GSD's unique contribution is treating context engineering, failure analysis, and cross-reference verification as first-class design phases rather than afterthoughts.

**Validation strategy:** Bootstrap path — (1) build Architecture GSD, (2) design a sample system to validate the workflow, (3) self-design to test fixed-point convergence, (4) design a real non-trivial system to prove v1 complete.

## Constraints

- **Platform**: Claude Code CLI — slash commands, agent markdown specs, workflow files (same structural model as GSD)
- **Model dependency**: All agents executed as Claude API calls (Opus, Sonnet, Haiku via model profiles)
- **Agent count**: 11 specialized agents in v1 — no deferral, all needed for complete architecture packages
- **Verification**: Must be programmatic where possible — structured schemas enable deterministic cross-reference validation over fragile regex-on-prose
- **Output format**: Dual-format mandatory — markdown alone is insufficient for reliable verification; structured sections required

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone system, not GSD mode | Clean separation of concerns; architecture domain expertise shouldn't pollute code-domain GSD | — Pending |
| All 11 agents in v1 | Complete architecture packages require all specializations; partial coverage produces incomplete designs | — Pending |
| Phases derived from intent, not fixed template | Different systems need different decompositions; fixed 7-phase template is too rigid | — Pending |
| Dual-format output (markdown + YAML/JSON) | Verification pipeline needs structured data; regex-on-prose is fragile for cross-reference checks | — Pending |
| Protocol-agnostic output | MCP and A2A are moving targets; abstract schemas can be mapped later without redesign | — Pending |
| Self-design as validation (not done criteria) | Dog-fooding proves internal consistency; "done" is designing a real external system | — Pending |
| CLI-first via Claude Code | Matches GSD's proven interaction model; web/chat is a separate concern for later | — Pending |

---
*Last updated: 2026-02-27 after initialization*
