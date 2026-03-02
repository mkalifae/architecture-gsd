---
domain: "Architecture GSD — Multi-Agent Architecture Design System"
actors:
  - "Human architect (provides system description, reviews output, makes decisions)"
  - "Orchestrator workflows (new-system.md, execute-phase.md, verify-phase.md, resume.md, progress.md)"
  - "11 specialized agents (discuss-system, arch-researcher, arch-roadmapper, arch-planner, arch-checker, arch-executor, arch-verifier, arch-integrator, context-engineer, schema-designer, failure-analyst)"
  - "arch-tools.js CLI utility (frontmatter CRUD, stub detection, naming validation, context validation, 4-level verification engine, anti-pattern scanner, YAML graph traversal, digest writer)"
non-goals:
  - "Code generation from architecture documents — produces specs, not implementations"
  - "Runtime validation of designs — verification is structural, not behavioral"
  - "Infrastructure or deployment design"
  - "Coupling to specific protocols (MCP, A2A) — output is protocol-agnostic"
  - "Web or chat interface — CLI-first via Claude Code slash commands"
constraints:
  - "Claude Code CLI platform — slash commands, agent markdown specs, workflow files"
  - "All agents executed as Claude API calls via Task() with model profiles (Opus, Sonnet, Haiku)"
  - "Zero external Node.js dependencies for arch-tools.js core (js-yaml acceptable for YAML parsing)"
  - "Disk-as-shared-memory — all agent communication via files, no in-memory state"
  - "STATE.md must survive context resets — any agent resumes from disk state alone"
  - "200K context window per agent — orchestrators stay at ~15% utilization"
scale:
  agents: 11
  throughput: "One design run per session"
  context_windows: "200K per agent, orchestrators at ~15%"
locked-decisions:
  - "All 11 agents in v1 — complete architecture packages require all specializations"
  - "Plugin structure from day one — standalone first, plugin.json migration additive only"
  - "Zero external Node.js deps for arch-tools.js core"
  - "Dual-format output (markdown + YAML) mandatory for programmatic verification"
  - "Adversarial prompting for arch-checker (plans) vs arch-verifier (outputs) — separate failure domains"
  - "4-level verification: Exists -> Substantive -> Cross-Referenced -> Internally Consistent"
  - "Wave-based parallel execution — plans grouped by wave, same-wave plans spawned simultaneously"
  - "Bounded revision loops — max 3 planner-checker iterations before human escalation"
  - "STATE.md after every plan completion (max 100 lines) — mandatory pre-read for all agents"
  - "Phase-boundary DIGEST.md (max 50 lines) — prevents context overflow for cross-phase checks"
---
