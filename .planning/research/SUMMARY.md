# Project Research Summary

**Project:** Architecture GSD
**Domain:** Multi-agent CLI tool that produces verified architecture design packages for agentic systems
**Researched:** 2026-02-27
**Confidence:** HIGH (stack and architecture verified against live GSD source; pitfalls grounded in peer-reviewed research; feature landscape MEDIUM where no direct comparators exist)

---

## Executive Summary

Architecture GSD is a novel product with no direct competitors. It occupies whitespace between architecture diagramming tools (Structurizr, arc42, IcePanel — produce human-readable artifacts but have no concept of agent contracts or event schemas) and multi-agent orchestration frameworks (CrewAI, LangGraph, Claude Agent SDK — execute workflows but never design them). The product takes natural language system intent and produces a verified, dual-format architecture package — markdown prose for humans, YAML/JSON schemas for machines — sufficient for a team to implement a multi-agent system from scratch. The core technical approach is to repurpose GSD's proven orchestration machinery (thin orchestrator, disk-as-shared-memory, wave-based parallelization, goal-backward verification) wholesale, replacing code-domain agents with architecture-domain agents. This is the right approach: GSD's patterns are demonstrably sound, and adapting them eliminates the need to solve orchestration from scratch.

The recommended implementation path is a five-phase build: foundation and tooling first, then the discuss-system intake agent, then the core design pipeline (researcher → roadmapper → planner → checker → executor), then the verification and integration layer, and finally the self-design validation. Three decisions are non-negotiable and must be locked before writing a single agent: dual-format output (markdown + YAML) is mandatory because programmatic cross-reference verification is impossible on prose alone; the orchestrator must be the main thread (not a subagent) because Claude Code subagents cannot spawn subagents; and arch-checker and arch-verifier must be architecturally separate agents with adversarial prompting, because homogeneous agent configurations in multi-agent systems exhibit sycophancy that causes verification to rubber-stamp rather than gatekeep.

The dominant risks are three critical failure modes that research quantifies precisely: goal drift through agent handoff (accumulated across 11 agents, individually minor reinterpretations compound to describe a different system); verbosity compensation (GPT-4 at 50.40% frequency produces plausible-sounding hollow specs that pass existence checks but are unimplementable); and agent groupthink (homogeneous checker/verifier pairs approve flawed plans). All three are preventable with design decisions made during Phase 1: structured CONTEXT.md schema with machine-checkable fields, required-section templates that specify what "complete" means per section (not just section names), and adversarial framing for verification agents. Prevention cost is low; recovery cost after these pitfalls materialize is high.

---

## Key Findings

### Recommended Stack

Architecture GSD runs entirely inside Claude Code's runtime — no separate process, no build step, no server. The system is implemented as a `.claude/` directory configuration (agents, workflows, skills, bin/) that Claude Code loads natively. The single critical platform constraint discovered: subagents cannot spawn other subagents. The main thread (the slash command orchestrator) is the only entity that can spawn agents via the Task tool. This means the entry-point orchestrators (`/arch:new-system`, `/arch:execute-phase`, etc.) must live in workflow files consumed by the main thread, not in subagents.

For tooling, follow GSD's zero-dependency pattern: a single `arch-tools.js` Node.js file (model: `gsd-tools.js` at 4,503 lines, zero external dependencies) implementing all state management, frontmatter CRUD, cross-reference validation, and schema operations. Add npm dependencies only if validation complexity genuinely requires AJV — which it likely does for Level 2-4 verification. The five libraries to add if needed are: `gray-matter` (YAML frontmatter parsing), `js-yaml` (YAML serialization), `ajv@8.x` + `ajv-formats@3.x` (JSON Schema validation), and `toposort` (cycle detection in agent dependency graphs).

**Core technologies:**
- Claude Code CLI (1.0.33+): Host platform — agents are markdown files, orchestration is the Task tool, no alternative exists
- Node.js 18+ via `arch-tools.js`: All deterministic operations (cross-reference validation, frontmatter CRUD, phase state) — same zero-dependency pattern as GSD's proven gsd-tools.js
- Bash (POSIX): Glue between Claude Code primitives and Node helper — agents invoke `node arch-tools.js <command>` exactly as GSD invokes gsd-tools.js
- Markdown + YAML frontmatter: All agent specs, workflow files, output documents — Claude Code's native and only viable format
- Disk-based shared memory (`.arch/` or project-level `design/` + `.planning/`): The only inter-agent communication mechanism available; subagents share no memory, only files

**Critical version requirements:**
- Claude Code 1.0.33+ for plugin structure; prior versions support only standalone `.claude/` config
- ajv@8.x paired with ajv-formats@3.x (version pairing required; ajv-formats@2.x also works with ajv@8.x)
- gray-matter@4.x paired with js-yaml@4.x (gray-matter uses js-yaml internally; pin both to prevent conflicts)

### Expected Features

Architecture GSD's entire feature set is genuinely novel — no competitor addresses agentic system documentation as first-class features. All incumbents assume the system being documented is a traditional software application. This is both a validation challenge (no established baseline) and a market opportunity (clear whitespace).

**Must have for v1 (table stakes — validating the core concept):**
- Natural language input intake via `discuss-system` agent producing structured CONTEXT.md (not a prose transcript — a schema with explicit fields: domain, actors, non-goals, constraints, scale)
- System boundary definition: actors, external systems, integration points, explicit non-goals (must be Phase 1; all other artifacts depend on it)
- Event/command schema definitions: typed YAML/JSON schemas, not prose descriptions — without field-level types, schemas pass existence checks but are unimplementable
- Agent contract documents: role, inputs, outputs, failure modes per agent (failure modes must list specific triggers, manifestations, recovery actions — not "handles gracefully")
- Dual-format output: markdown prose + YAML schema, generated in the same pass — prose for humans, YAML for programmatic verification
- 3-level artifact verification (Exists → Substantive → Cross-Referenced) — Level 4 (Internally Consistent) is v1.x
- STATE.md with context-reset survivability — without this, complex system designs spanning multiple sessions are impractical
- Anti-stub enforcement: detect and reject "TBD", "to be determined", "handles gracefully" — analogous to GSD's stub detection in code

**Should have — add after v1 validates (v1.x):**
- Level 4 verification: cross-document reference resolution (every event name in agent contracts resolves to events.yaml — genuinely novel, requires programmatic YAML graph traversal)
- Context flow maps: what context each agent receives, how it's injected, what state passes at runtime — distinct from orchestration topology (who calls who vs. what data moves and when)
- Orchestration topology document: coordination mechanism, trigger chain, state machine definition
- Goal-backward verification: verifiable truths established first, artifacts checked for proving them (inverts normal documentation approach)
- Protocol-agnostic MCP/A2A mapping annotations: architecture package annotated for protocol mapping without being converted to protocol-specific format

**Defer to v2+ (build after P1/P2 confirm direction):**
- Full wave-based parallelization with all 11 specialized agents — requires all agent contracts to be written and tested before parallelization adds value without adding debugging surface
- Fully adaptive phase inference from system intent — start with a 5-phase structure derived from complexity signals; full intent-derived adaptation is v2
- Verification strategy document — highest-complexity output, requires all other artifacts to be complete; cap on v1.x, not v1 requirement

**Anti-features to reject (regardless of user requests):**
- Visual diagram rendering (SVG/PNG): Use Mermaid syntax embedded in markdown; diagram tools handle rendering
- Direct MCP/A2A protocol output (ready-to-deploy stubs): Architecture GSD produces design documents, not code — feed the package to GSD code mode for implementation
- Free-form conversation without structure gates: Produces unverifiable chat transcripts instead of architecture packages
- Fixed 12-section template: Intent-derived phase structure is a core differentiator; fixed templates are an explicit anti-pattern per PROJECT.md

### Architecture Approach

Architecture GSD's internal structure mirrors GSD's own architecture almost exactly — this is intentional and correct. Workflow files implement slash commands as orchestrators (thin: spawn agents, read structured returns, route on status — never hold content). Eleven specialized agent specs each own one design concern. `arch-tools.js` centralizes all deterministic operations. The `.planning/` directory carries orchestration state; the `design/` directory carries deliverables — these two must stay strictly separated. The cross-reference validation architecture (dual-format output enabling YAML graph traversal for Level 3-4 verification) is the most technically novel component and requires the most careful design. The self-reference property — Architecture GSD's output format (agent spec markdown) is also its own internal format — creates both a bootstrap constraint and a fixed-point validation requirement.

**Major components:**
1. **Slash command orchestrators** (`workflows/`) — Thin coordinators that spawn agents, read structured returns, route on status; never hold design content; implement `/arch:new-system`, `/arch:execute-phase`, `/arch:verify-phase`, `/arch:progress`, `/arch:resume`
2. **Specialized agents** (`agents/`) — 11 domain-expert agents, each owning one design concern: `discuss-system` (intake), `arch-researcher` (pattern research), `arch-roadmapper` (phase derivation), `arch-planner` (task decomposition with wave assignments), `arch-checker` (adversarial plan quality gate), `arch-executor` (design document production), `arch-verifier` (cross-reference validation), `arch-integrator` (cross-phase consistency), `context-engineer` (context injection strategy), `schema-designer` (typed event/command schemas), `failure-analyst` (failure mode enumeration)
3. **`arch-tools.js`** (`bin/`) — Node.js CLI utility for all deterministic operations: frontmatter CRUD, YAML cross-reference graph traversal, cycle detection, phase state management, stub detection, template filling
4. **Disk-based shared memory** (`.planning/` for orchestration state + `design/` for deliverables) — The only viable inter-agent coordination mechanism; strict separation between orchestration state and deliverable artifacts
5. **Templates and references** (`templates/`, `references/`) — Scaffold files (agent-spec.md, event-schema.yaml, failure-modes.md) used by arch-executor; reference documents (verification-patterns.md, agent-spec-format.md, schema-patterns.md) providing persistent shared knowledge injected via @-references

**Key patterns to follow (non-negotiable):**
- Thin orchestrator: orchestrators pass file paths, never file contents; agents read their own context from disk
- Disk-as-shared-memory: all state flows via files; STATE.md (max 100 lines) carries session continuity; no agent writes STATE.md directly (orchestrator merges after wave completion)
- Dual-format output: every design document has markdown prose (rationale) + embedded YAML blocks (canonical definitions) — YAML is the source of truth for cross-reference validation, never prose
- Goal-backward verification: must_haves in PLAN.md frontmatter defines what must be TRUE, checked by arch-verifier programmatically; arch-checker and arch-verifier are separate agents with adversarial prompting
- Pre-computed wave dependencies: wave numbers assigned at plan time, not resolved at runtime; typical design dependency order: System Boundaries → Event Schemas → Agent Contracts → Orchestration → Context Engineering + Failure Analysis

### Critical Pitfalls

The following five pitfalls are all CRITICAL-severity (three are confirmed research-backed failure modes, two are architecture-design specific). Prevention must be designed in during Phase 1 — retrofitting is expensive.

1. **Goal drift through agent handoff** — Prevention: CONTEXT.md uses a strict schema with machine-checkable fields (not prose paragraphs); each phase SUMMARY closes with a Goal Fidelity Check; arch-verifier cross-checks phase outputs against CONTEXT.md constraints, not just internal consistency. Phase to address: discuss-system agent spec and CONTEXT.md schema design.

2. **Verbosity compensation — hollow specs that pass existence checks** — Prevention: required-section templates in arch-executor prompts must specify what constitutes a complete answer (not just section names); arch-checker scans for hedge phrases ("TBD", "as needed", "handles gracefully", "appropriate"); verification Level 2 (Substantive) must include content quality checks, not just line counts; YAML schemas force concreteness because YAML cannot contain vague prose. Phase to address: arch-executor and arch-checker agent design.

3. **Agent groupthink — verification that doesn't catch errors** — Prevention: arch-checker and arch-verifier must use explicitly adversarial prompting ("your job is to find what's wrong, not confirm what's correct"); Level 3 cross-reference check must use YAML name resolution against a canonical registry, not LLM judgment; consider Haiku for execution and Opus for verification to create capability-profile skepticism asymmetry. Arch-checker and arch-verifier must never be collapsed into one agent. Phase to address: agent design for all three verification agents.

4. **Context window overflow in late-phase agents** — Prevention: phase-boundary DIGEST.md (max 50 lines: decisions, key entities, cross-references) written after each phase; arch-integrator reads digests first, fetches specific artifacts on demand; CONTEXT.md hard cap at 200 lines; each agent spec defines exactly which files it reads (no open-ended "read everything relevant"). Phase to address: context-engineer agent design and file injection strategy.

5. **Fragile regex-based cross-reference verification** — Prevention: YAML blocks in design documents (not prose) are the canonical reference registry; arch-verifier's Level 3 check validates against schema registries via YAML name resolution, not regex-on-prose; establish canonical naming rules in Phase 1 (PascalCase for events, kebab-case for agent names, SCREAMING_SNAKE for commands); arch-executor writes cross-references using canonical names from YAML registry, never paraphrases. Phase to address: schema design conventions and arch-tools.js YAML graph traversal implementation.

---

## Implications for Roadmap

The research is unambiguous about build order. Feature dependencies (FEATURES.md), the data flow through the system (ARCHITECTURE.md), and the pitfall-to-phase mapping (PITFALLS.md) all converge on the same five-phase structure. Deviating from this order is not a stylistic choice — it violates hard dependencies that cause rework.

### Phase 1: Foundation, Tooling, and Agent Scaffold

**Rationale:** Nothing else can be built before the platform is established. Three decisions must be locked before any agent is written: (1) the CONTEXT.md schema (goal drift prevention starts here), (2) the dual-format output conventions including canonical naming rules (regex verification fragility is prevented here), and (3) the arch-tools.js verification API (all agents call it; API instability causes cascading rework). This phase has no agent-to-agent dependencies and well-documented patterns — skip phase research.

**Delivers:**
- Project directory structure (`agents/`, `workflows/`, `bin/`, `templates/`, `references/`)
- `arch-tools.js` scaffolded with: frontmatter CRUD, YAML parser, stub detector, state management primitives
- CONTEXT.md schema definition (canonical fields: domain, actors, non-goals, constraints, scale, locked-decisions)
- Canonical naming rules document (PascalCase events, kebab-case agents, SCREAMING_SNAKE commands)
- `templates/design/` scaffold files: agent-spec.md, event-schema.yaml, failure-modes.md
- `references/` documents: agent-spec-format.md, verification-patterns.md, schema-patterns.md, model-profiles.md
- `config.json` with model profiles (Opus for design, Sonnet for execution, Haiku for fast passes)

**Addresses features:** Dual-format output conventions, STATE.md schema, anti-stub detection
**Avoids pitfalls:** Fragile regex verification (naming rules established here); verbosity compensation (required-section templates defined here); goal drift (CONTEXT.md schema locked here)

---

### Phase 2: Intake and Intent Extraction (discuss-system)

**Rationale:** System boundaries must be defined before any design work begins — this is not Phase 1 because tooling must exist first to scaffold the output. `discuss-system` is the hardest agent to get right (lossy compression of intent into structured facts is where goal drift originates) and must be validated in isolation before the design pipeline builds on its output. Building this second ensures that the design pipeline (Phase 3) has a trustworthy input source.

**Delivers:**
- `discuss-system` agent spec (adaptive questioning, comprehensive upfront clarification — not one-question-at-a-time)
- `/arch:new-system` workflow (entry point, spawns discuss-system, scaffolds project structure)
- `CONTEXT.md` production: structured output with explicit schema (domain, actors, non-goals, constraints, scale) — no prose dumps
- `PROJECT.md` scaffolding for the system being designed
- `STATE.md` initialization

**Addresses features:** Natural language input → structured output, system boundary definition, STATE.md / resumable sessions
**Avoids pitfalls:** Goal drift through agent handoff (CONTEXT.md structure is the first and most important prevention); scope creep (explicit non-goals are mandatory, not optional)

**Research flag:** SKIP phase research. Adaptive questioning patterns are well-documented (conversational agents). The CONTEXT.md schema design is first-party — defined in Phase 1.

---

### Phase 3: Core Design Pipeline (researcher → roadmapper → planner → checker → executor)

**Rationale:** This is the largest and most complex phase — the heart of the product. It must come after intake (Phase 2) because it builds on CONTEXT.md. The five agents in this pipeline have a strict dependency order (each reads the previous agent's output), so they cannot be parallelized against each other, but individual design tasks within a phase can be parallelized via wave assignments. This phase produces the primary differentiating output: agent contracts, event schemas, and orchestration design.

**Delivers:**
- `arch-researcher` agent spec (architecture pattern research, using Context7 + WebSearch)
- `arch-roadmapper` agent spec (derives phases from system intent; 5-phase structure as v1 starting point)
- `arch-planner` agent spec (decomposes phases into wave-assigned parallel tasks with must_haves frontmatter)
- `arch-checker` agent spec (adversarial plan quality gate — explicitly designed to find flaws, not confirm goodness)
- `arch-executor` agent spec (produces dual-format design documents: agent contracts, event schemas, failure modes)
- `/arch:execute-phase` workflow (coordinates the planner → checker → executor → verifier loop with max 3 revision cycles)
- `design/agents/*.md` output: one file per designed agent (role, inputs, outputs, failure modes per agent, event references in YAML blocks)
- `design/events/events.yaml` output: typed event/command schemas (PascalCase names, field-level types)
- Failure modes per agent (failure-analyst output or embedded in arch-executor with required section template)

**Addresses features:** Agent contract documents, event/command schema definitions, orchestration topology document, failure modes per agent, wave-based parallelization (partial), anti-stub enforcement
**Avoids pitfalls:** Verbosity compensation (arch-checker gates; required-section templates in arch-executor); agent groupthink (arch-checker adversarial framing); fragile cross-reference verification (canonical names enforced by arch-executor prompt)

**Research flag:** NEEDS phase research for arch-planner wave dependency design. The wave assignment algorithm (which tasks can parallelize, which are strictly ordered) for general agentic system design is not a solved problem. Research concurrent task dependency patterns in existing orchestration frameworks (LangGraph DAGs, GSD wave model) before locking arch-planner's design.

---

### Phase 4: Verification, Integration, and Quality Gates

**Rationale:** Verification is Phase 4, not earlier, because it requires the full artifact graph to exist before cross-reference validation can run. However, per-phase verification (Level 1-3) is baked into Phase 3's execution loop. Phase 4 adds: Level 4 Internally Consistent verification (cross-document YAML graph traversal), arch-integrator (cross-phase consistency), and the complete `arch-tools.js` verification engine. This is the most technically novel component of the system.

**Delivers:**
- `arch-verifier` agent spec (adversarial; schema-driven Level 1-3 verification; reads must_haves from PLAN.md frontmatter)
- `arch-integrator` agent spec (cross-phase consistency; reads phase digests first, specific artifacts on demand)
- `arch-tools.js` verification engine: YAML graph traversal for cross-reference resolution, cycle detection via toposort, stub detection, AJV schema validation for Level 2
- Level 4 verification implementation: every event name in agent contracts resolves against events.yaml canonical registry; orphaned events detected
- PHASE-N-DIGEST.md production: max 50-line phase-boundary digest (decisions, entities, cross-references) written after each phase
- `/arch:verify-phase` workflow
- VERIFICATION.md structured output (status: passed/gaps_found/human_needed)
- INTEGRATION-REPORT.md final package validation
- `design/MANIFEST.md`: index of all output documents with one-line descriptions and reading order

**Addresses features:** 3-level artifact verification, Level 4 verification (internally consistent), goal-backward verification (enhanced)
**Avoids pitfalls:** Agent groupthink (arch-verifier adversarial, schema-driven — LLM judgment explicitly excluded from cross-reference checks); context window overflow (digest protocol implemented here); fragile regex verification (YAML graph traversal replaces regex)

**Research flag:** NEEDS phase research for Level 4 YAML graph traversal implementation. The programmatic cross-reference resolver (extract event names from YAML blocks in agent specs, match against events.yaml canonical registry, detect orphaned events, detect undefined references) has no direct prior art in architecture documentation tooling. Research graph traversal algorithms applied to YAML document graphs before implementation.

---

### Phase 5: Self-Design Validation and CLI Polish

**Rationale:** Self-design is the validation gate that confirms Architecture GSD produces a complete, implementable architecture package for a real system — specifically, for itself. This comes last because it requires the entire pipeline to be working. Self-design also reveals any gaps in agent spec format requirements (if arch-executor's output, when fed back as input, fails arch-checker's quality gates, the quality gates need tightening). CLI polish (progress output, human-readable error messages, MANIFEST.md) is bundled here because it depends on knowing the final output format.

**Delivers:**
- Self-design run: Architecture GSD designs itself, producing a complete architecture package in `design/`
- Validation that the self-design output is sufficient for re-implementation from scratch
- Self-design convergence criteria and DEFERRED.md protocol (prevents fixed-point failure / infinite gap-closure loop)
- `/arch:progress` workflow (PROGRESS.md updated after each agent completes; human checkpoint at phase boundaries)
- `/arch:resume` workflow (context-reset survivability)
- Human-readable error message translation layer (not internal agent names and file paths)
- `discuss-system` comprehensive upfront clarification polish (all ambiguities surfaced at once, not one-at-a-time)
- Dog-fooding validation: the self-design output must be sufficient to re-implement Architecture GSD from scratch (this is the "done" criterion per PROJECT.md)

**Addresses features:** STATE.md / resumable sessions (final validation), context flow maps (emerges from self-design), verification strategy document (emerges from self-design)
**Avoids pitfalls:** Self-design fixed-point failure (convergence criteria locked before execution; CONTEXT.md is read-only during self-design; hard phase cap enforced)

**Research flag:** SKIP phase research. Self-design validation is first-party validation, not a new technical problem. Convergence criteria are fully specified in PITFALLS.md.

---

### Phase Ordering Rationale

The order emerges from three converging constraints:

1. **Hard feature dependencies** (from FEATURES.md): System boundaries must precede agent contracts; event schemas must precede agent contracts; agent contracts must precede context flow maps. This forces Phase 2 (intake) before Phase 3 (design pipeline) before Phase 4 (verification that cross-references across those artifacts are valid).

2. **Pitfall prevention timing** (from PITFALLS.md): Goal drift, verbosity compensation, and fragile cross-reference verification must all be prevented with design decisions in Phase 1 (naming rules, CONTEXT.md schema, required-section templates). Prevention in Phase 3 or later is too expensive — the artifacts are already written before the gates are installed.

3. **Bootstrap constraint** (from ARCHITECTURE.md): The self-reference property (output format equals internal format) means self-design validation can only run after the full pipeline is working. Phase 5 cannot move earlier.

---

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 — arch-planner wave dependency design:** The algorithm for computing wave assignments for general agentic system design tasks (which can parallelize, which have strict ordering) is not well-documented for this specific domain. Research LangGraph DAG task dependency modeling and GSD's existing wave assignment approach before locking arch-planner spec.
- **Phase 4 — Level 4 YAML graph traversal:** Programmatic cross-reference resolution across a graph of YAML documents (extract typed references, match against canonical registry, detect cycles) in the context of architecture documentation tooling has no established prior art. Research graph algorithms applied to YAML document graphs; validate that the AJV + toposort approach from STACK.md is sufficient before implementation.

**Phases with standard, well-documented patterns (skip phase research):**
- **Phase 1 — Foundation and tooling:** GSD's gsd-tools.js is the reference implementation; Claude Code docs are the platform reference. No novel research needed.
- **Phase 2 — discuss-system:** Adaptive conversational questioning patterns are well-established. CONTEXT.md schema is designed in Phase 1.
- **Phase 5 — Self-design validation:** Convergence criteria are specified in PITFALLS.md. No external research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Claude Code docs verified at official sources; gsd-tools.js inspected directly (4,503 lines); npm package versions confirmed current; the subagent-cannot-spawn-subagent constraint confirmed in official docs — this is a hard constraint, not an inference |
| Features | MEDIUM-HIGH | Architecture tool landscape verified against official sources (Structurizr, arc42, IcePanel, C4InterFlow); gap assessment ("no competitor addresses agentic documentation") confirmed by Generative Programmer Feb 2026; agentic-specific feature requirements inferred from practitioner literature (GitHub Blog, O'Reilly, InfoQ) — MEDIUM confidence on novel artifacts (context flow maps, protocol-agnostic mapping) since no direct comparators exist |
| Architecture | HIGH | Based on direct inspection of GSD source (`gsd-tools.js`, agent specs, workflow files, templates); the Architecture GSD structure mirrors GSD's structure with domain changes; the self-reference fixed-point property is a genuine architectural constraint not found in GSD, warranting careful validation during Phase 5 |
| Pitfalls | HIGH (multi-agent failure modes) / MEDIUM (self-reference) | MAST taxonomy (41-86.7% failure rates), verbosity compensation ACL 2025, context rot Stanford study, sycophancy CONSENSAGENT ACL 2025 — all peer-reviewed with quantified failure rates; self-referential system behavior (Gödel Agent arxiv) is MEDIUM confidence, limited direct prior art for the specific fixed-point failure mode |

**Overall confidence:** HIGH

The research base is exceptionally strong for this type of project because the reference implementation (GSD) exists and was directly inspected, the platform constraints (Claude Code) are documented at official sources, and the failure modes are backed by peer-reviewed research with quantified failure rates. The only genuine unknowns are in novel territory: (1) whether 11-agent parallel design produces meaningfully better output than 5-agent sequential (requires empirical validation), and (2) whether the self-design fixed-point converges reliably in practice (theoretical analysis suggests it should with the convergence criteria specified, but no prior art directly validates this).

### Gaps to Address

- **Gap: 11-agent vs. simpler roster** — FEATURES.md defers full 11-agent parallelization to v2+. The v1 build should validate the core pipeline (5-6 agents) before adding all 11. The roadmapper should treat agents beyond the core pipeline (context-engineer, schema-designer, failure-analyst as standalone agents) as optional extensions rather than hard v1 requirements, even though PROJECT.md lists all 11 as "Active" requirements. Flag this for human decision before requirements definition.

- **Gap: Phases derived from intent (v1 vs. v2)** — PROJECT.md lists "System derives design phases from system intent (not a fixed template)" as an Active requirement, but FEATURES.md explicitly defers full adaptive phase inference to v2+, recommending a 5-phase structure with complexity signals for v1. These conflict. Recommendation: implement the 5-phase v1 structure with complexity-signal modulation (simple systems skip some phases) and call it "intent-derived" — it is, just not fully general. Flag for requirements clarification.

- **Gap: arch-tools.js scope** — Should arch-tools.js be zero-dependency (like gsd-tools.js) or use AJV + toposort? The stack research recommends starting zero-dependency and adding AJV only if needed. But Level 3-4 verification almost certainly requires proper YAML parsing and graph algorithms. Recommendation: start with js-yaml and toposort (lightweight, well-tested) as the minimum dependency set; skip AJV unless JSON Schema validation against external schemas is needed. Lock this decision before Phase 4 implementation.

- **Gap: Plugin vs. standalone `.claude/` config** — STACK.md documents both options. For personal/team use (likely v1 use case), standalone `.claude/` is simpler (shorter command names, no namespacing). For distribution (v2 use case), plugin structure is required. Recommendation: build standalone first; structure the codebase so plugin migration requires only adding `plugin.json` and renaming commands. Decide distribution strategy before Phase 1 directory setup.

---

## Sources

### Primary (HIGH confidence — official docs or direct source inspection)

- Claude Code Subagents Docs (code.claude.com/docs/en/sub-agents) — Frontmatter fields, spawning constraints (subagents cannot spawn subagents), tool restrictions
- Claude Code Skills Docs (code.claude.com/docs/en/skills) — SKILL.md frontmatter, dynamic context injection
- Claude Code Plugins Docs (code.claude.com/docs/en/plugins) — Plugin structure, plugin.json schema
- Claude Agent SDK Slash Commands Docs (platform.claude.com/docs/en/agent-sdk/slash-commands) — Command file format, allowed-tools, argument-hint
- GSD source inspection (`/home/mkali/.claude/get-shit-done/`) — gsd-tools.js (4,503 lines, zero deps), agent spec format, workflow orchestrator pattern, verification patterns, template schema
- ajv (ajv.js.org) — v8.18.0 current; JSON Schema draft-2020-12 support; 170M+ weekly downloads
- gray-matter (npm + GitHub) — v4.0.3 current; 1.4M weekly downloads
- MAST Failure Taxonomy: Cemri et al., "Why Do Multi-Agent LLM Systems Fail?" (arxiv.org/abs/2503.13657) — 14 failure modes, 41-86.7% failure rates across 7 MAS frameworks
- Verbosity Compensation: ACL 2025 (aclanthology.org/2025.uncertainlp-main.14) — GPT-4 VC frequency 50.40%
- Project source documents: ARCHITECT-VISION.md, GSD-REPURPOSING-VISION.md, .planning/PROJECT.md, research-agentic-architecture-patterns.md

### Secondary (MEDIUM confidence — community sources, multiple sources agree)

- Context Rot: Redis blog (redis.io/blog/context-rot/) citing Stanford 2023 study — 15-20 point accuracy drop from positional effects
- Sycophancy in Multi-Agent Debate: "Talk Isn't Always Cheap" (arxiv.org/pdf/2509.05396); CONSENSAGENT ACL 2025 (aclanthology.org/2025.findings-acl.1141)
- Generative Programmer: Architecture Diagramming Tools and the AI Gap (Feb 2026) — confirms "still searching for AI-powered tool that converts prompts to architecture diagrams"
- GitHub Blog: Multi-agent workflows often fail (github.blog) — unstructured data exchange, ambiguous intent, loose interfaces as top failure modes
- O'Reilly Radar: Designing Effective Multi-Agent Architectures — topology choice must be visible; context aggregation reveals architectural differences
- arc42 Overview v9.0 (arc42.org) — 12 fixed sections, tool-agnostic template; confirmed no agent contract or event schema concepts
- IcePanel: Top 9 tools for C4 model diagrams (Aug 2025) — competitive landscape confirmed
- toposort (npm) — throws on cycles, zero deps, 206 dependents

### Tertiary (LOW-MEDIUM confidence — single source or inference)

- Self-Referential Systems: Gödel Agent (arxiv.org/abs/2410.04444) — self-referential agents iterate without convergence without stopping criteria; applied to Architecture GSD self-design is inference, not direct prior art
- Agentic Failure Costs: O'Reilly Radar "Hidden Cost of Agentic Failure" — 10-agent pipeline at 98% accuracy degrades to 81.7% system accuracy
- Infinite Loop Prevention: "The 4/δ Bound" (arxiv.org/pdf/2512.02080) — first formal convergence proof for LLM-verifier systems
- Coordination Failure Statistics: Galileo "Why do Multi-Agent LLM Systems Fail?" — 36.94% coordination failures (WebSearch only; verify before citing)

---

*Research completed: 2026-02-27*
*Ready for roadmap: yes*
