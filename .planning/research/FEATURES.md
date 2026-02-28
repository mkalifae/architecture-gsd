# Feature Research

**Domain:** Architecture design CLI tool for agentic systems (multi-agent, event-driven, verified output)
**Researched:** 2026-02-27
**Confidence:** MEDIUM-HIGH (architecture tool landscape verified via official sources; agentic-specific gaps are novel territory with LOW-MEDIUM confidence where no direct comparator exists)

---

## Ecosystem Context

Architecture GSD operates in a gap between two established but insufficient categories:

1. **Architecture diagramming tools** (Structurizr, IcePanel, C4 model tools, arc42) — produce human-readable design artifacts but have no concept of agent contracts, event schemas, or protocol-agnostic output for programmatic verification. They document static structure, not agentic behavior.

2. **Multi-agent orchestration frameworks** (CrewAI, LangGraph, AutoGen, Claude Agent SDK) — execute agent workflows but do not *design* them. They have no documentation-generation mode. They assume you already know the architecture before you run it.

Architecture GSD occupies the space neither category fills: *taking a natural language intent and producing a verified, complete, dual-format architecture package as output*. There are no direct comparators at this specificity level. Feature assessment is therefore grounded in: (a) what architecture tools do, (b) what's missing from them, (c) what practitioners document when designing agentic systems from scratch.

**Confidence note on gap assessment:** The "AI gap" in architecture diagramming tools is explicitly confirmed by the Generative Programmer article (Feb 2026): "Still searching for an AI-powered tool that converts prompts directly into architecture diagrams." The gap for agentic-system-specific architecture documentation (agent contracts, event schemas, failure modes) is inferred from practitioner literature and research papers — no direct comparator found. MEDIUM confidence.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that architecture tool users consider non-negotiable. Missing these means the output is not credible or usable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Natural language input → structured output | Any tool calling itself AI-powered is expected to accept prose intent and produce structured artifacts | MEDIUM | The single most-expected feature given the CLI premise. ChatGPT Canvas and Claude Artifacts already generate Mermaid from prompts — this sets the baseline expectation. |
| Agent contract documents | Practitioners in 2025-2026 consider typed agent specs with input/output schemas table stakes for production multi-agent systems. Amazon, Google, and Anthropic all publish this requirement. | MEDIUM | Must include: role, inputs, outputs, failure modes, communication protocol. Not optional for credibility. |
| Event/command schema definitions | Typed event schemas are "table stakes in multi-agent workflows — without them, nothing else works" (GitHub Blog, 2025). Users building agentic systems expect this as a first-class output. | MEDIUM | Must be typed (field names, types, constraints). Plain prose event descriptions are not sufficient. |
| Orchestration topology document | The orchestration pattern (hierarchical, DAG, pub/sub, swarm) must be explicitly documented. O'Reilly (2025): "You can't prompt your way out of a system-level failure" — topology choice must be visible. | MEDIUM | Should include coordination mechanism, trigger chain, state flow. |
| Human-readable markdown prose output | All architecture tool users (arc42, Structurizr, IcePanel) expect prose documentation, not just code/diagrams. Missing this makes output feel like a config file, not a design document. | LOW | Format parity: humans read markdown, tools read YAML/JSON. Both required. |
| Machine-readable structured output (YAML/JSON) | Enables programmatic verification, downstream tooling, and protocol mapping. Practitioners using MCP/A2A need structured specs, not prose. | LOW | Dual-output is confirmed pattern (Talos documentation-as-code, C4InterFlow, AsyncAPI). |
| Context flow documentation | How state, context, and data flow between agents during execution. Not having this means implementers must infer it, which introduces errors. | MEDIUM | Distinct from orchestration topology: topology = who calls who; context flow = what data moves and when. |
| Failure modes section per agent | "Architecture design often skips failure modes — happy path only" (GSD-REPURPOSING-VISION.md). Practitioners have learned this omission leads to fragile systems. | MEDIUM | Each agent spec must include: what can fail, how it manifests, recovery path. Table stakes because it's so often absent it's become an expectation to demand it. |
| System boundary definition | arc42, C4 model, every architecture template starts here. Users expect a clear "what is in scope, what is not" artifact before any detailed design. | LOW | Actors, external systems, integration points, explicit non-goals. Standard practice. |
| Verification strategy document | Defines *how to verify* the architecture is correct when implemented. Goes beyond "does the spec exist?" to "what tests prove it works?" | HIGH | High complexity because it requires reasoning about observable behaviors from design-time intent. |
| STATE.md / resumable sessions | Multi-session design work is normal — architecture doesn't happen in one context window. Users expect to be able to resume work across sessions without repeating decisions already made. | MEDIUM | Confirmed pattern from GSD: STATE.md as max-100-line structured summary of decisions, blockers, position. |
| Phase-based output structure | Delivering everything at once in one document is not credible for complex systems. Users expect phased output: boundaries first, schemas next, contracts after. | MEDIUM | Mirrors arc42's section structure and GSD's phase model. Phases should be derived from system complexity, not templated. |

### Differentiators (Competitive Advantage)

Features that no current tool provides. These are Architecture GSD's reason to exist.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 4-level artifact verification (Exists → Substantive → Cross-Referenced → Internally Consistent) | No architecture tool today checks that a spec references events that actually exist in the event schema. This closes the loop between related documents. Current tools either have no verification (arc42, Mermaid) or only check syntax (Structurizr DSL). | HIGH | Internally Consistent check (does agent spec reference EventX that exists in EVENTS.md?) is genuinely novel. Requires cross-document reference resolution. |
| Goal-backward verification | Establishes verifiable truths first ("The event bus handles backpressure"), then checks whether artifacts prove each truth. Current tools verify presence, not achievement. | HIGH | This inverts the normal documentation approach. Most tools ask "did you write the doc?" not "does the doc prove the goal?" |
| Wave-based parallelization of design tasks | Architecture design tasks have dependency structure (can't write agent contracts before event schemas). No current tool models this as executable dependency waves. This enables 11-agent parallel design. | HIGH | DAG-based task execution is established in orchestration frameworks (LangGraph) but not in documentation tools. Novel application. |
| Protocol-agnostic output structurally mappable to MCP/A2A | MCP and A2A are becoming the industry standards for agent communication (2025-2026). An architecture package that's already structured to map to these protocols removes a translation step. Current tools have no concept of protocol targets. | HIGH | Requires understanding MCP tool definitions (tools, resources, prompts) and A2A agent cards. Output should be annotated for mapping, not converted — conversion is anti-feature. |
| Phases derived from system intent, not fixed template | arc42 has 12 fixed sections regardless of system complexity. Structurizr has fixed abstraction levels. Architecture GSD derives what phases are needed based on what the system is. A simple CRUD system needs fewer design phases than a multi-agent swarm. | HIGH | Requires an intent-analysis step before roadmap generation. Genuinely novel — no architecture tool does this. |
| Dual-audience output in one pass | Human-readable prose + machine-readable schema from the same generation pass. Current tools produce one or the other: arc42 = pure prose, OpenAPI = pure schema, C4InterFlow = pure code. Architecture GSD produces both simultaneously with same content. | MEDIUM | The Talos/documentation-as-code approach validates the pattern exists. Applying it to full architecture packages is novel. |
| Anti-stub enforcement | Detects and rejects "TBD", "to be determined", "will handle later" in architecture documents. No current architecture tool distinguishes substantive from placeholder content. This is a hard quality gate. | MEDIUM | Analogous to GSD's stub detection in code (functions with only console.log). Straightforward to implement via regex. High signal value — forces real decisions. |
| 11-agent collaborative design (specialization at scale) | Most architecture generation today is single-agent (ChatGPT → Mermaid). Using 11 specialized agents means a failure-analyst who reasons deeply about failure modes, a schema-designer who reasons deeply about type constraints, etc. Depth through specialization. | VERY HIGH | The value here is quality differentiation, not feature differentiation. Each agent produces deeper work than a generalist prompt would. Requires careful agent contract design. |
| Context flow maps as first-class artifact | What context each agent needs, how it receives it, what state passes between agents at runtime. This is the document that context engineering requires — no current architecture tool produces it. O'Reilly (2025) identifies context aggregation as revealing "fundamental architectural differences." | HIGH | Novel artifact type. Distinct from data flow diagrams. Specifically addresses the LLM context window and injection strategy problem. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but would degrade Architecture GSD's value proposition or violate its design constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Visual diagram rendering (SVG/PNG output) | Users love diagrams; Structurizr and IcePanel are popular partly because of beautiful visualizations. | Architecture GSD's differentiator is verified, complete, machine-readable specs — not pretty pictures. Adding rendering requires maintaining a diagram engine, output is static and gets out of sync with the spec, and it shifts focus from completeness to aesthetics. Also, Mermaid rendering is free via any viewer. | Output Mermaid syntax embedded in markdown. Human can paste into mermaid.js.org or use VS Code preview. Let diagram tools handle rendering. |
| Direct MCP/A2A protocol output (ready-to-deploy server stubs) | Practitioners want to go from design directly to running code. | Architecture GSD produces *design documents*, not code. Generating protocol stubs would (a) require maintaining templates per protocol version, (b) blur the design/implementation boundary, (c) make the tool a code generator — which GSD in code mode already handles. | Output is "structurally mappable" to MCP/A2A. Document the mapping explicitly. Feed the architecture package into GSD code mode for implementation. |
| Continuous synchronization with codebase | Architecture stays in sync with implementation automatically. | Sounds valuable but requires instrumentation, reverse engineering, and constant maintenance. Architecture GSD is forward-looking (design → implementation), not backward-looking (code → diagram). Reverse-engineering tools (Swark, C4InterFlow source mode) already exist for the backward direction. | Version-controlled architecture docs in git. Treat drift as a human concern, not a tool concern. |
| Team collaboration features (multi-user, real-time editing, comments) | Architecture is a team activity. IcePanel and LucidChart succeed partly due to collaboration features. | Architecture GSD is a CLI tool for a single architect or agent-driven session. Adding collaboration requires a backend service, authentication, presence, conflict resolution — a different product entirely. | Output is git-committed markdown. Use git for collaboration: branches, PRs, comments. Standard developer workflow. |
| Free-form conversation mode without structure | Users want to chat with the tool about their architecture informally. | Free-form conversation produces unverifiable output. Architecture GSD's value is verified, structured documents. If conversation is allowed without structure gates, users get chat transcripts instead of architecture packages. | Use the `discuss-system` command for clarification before structured output begins. Once design starts, output is structured. |
| Automated deployment topology generation (Kubernetes manifests, Terraform, etc.) | "Now generate the IaC for this architecture" feels like a natural next step. | IaC generation is a fully separate domain with its own toolchain (Terraform, Pulumi, CDK). Mixing it into architecture design creates scope creep, requires maintaining IaC templates, and the output quality of architecture docs degrades when the tool is also trying to generate infra. | Architecture package documents deployment topology as design intent. GSD code mode can consume the architecture package to generate IaC. |
| Opinionated technology recommendations | "Tell me which database to use for this system." | Architecture GSD designs the *structure* of systems, not the *technology stack*. Technology choice depends on team expertise, cost, operational requirements — none of which Architecture GSD can know. Opinionated recommendations create false certainty. | Document technology constraints and tradeoffs as explicitly open decisions in the architecture package. Flag decisions requiring human resolution. |
| Fixed template for all systems | "Use our standard 12-section template" (arc42 approach). | A 12-section template applied to a 2-agent proof of concept wastes time on irrelevant sections. Applied to a 50-agent enterprise system, it leaves critical sections undocumented. Architecture GSD's differentiator is intent-derived phases. | Derive phase structure from system complexity analysis. Emit only sections relevant to the system being designed. |

---

## Feature Dependencies

```
System Boundary Definition
    └──required by──> Agent Contract Documents
                          └──required by──> Context Flow Maps
                          └──required by──> Failure Modes per Agent
                          └──required by──> Orchestration Topology

Event/Command Schema Definitions
    └──required by──> Agent Contract Documents
                          └──required by──> 4-Level Artifact Verification (Internally Consistent check)
                          └──required by──> Protocol-Agnostic Mapping

Phase Structure (intent-derived)
    └──required by──> Wave-Based Parallelization
                          └──required by──> 11-Agent Collaborative Design

Goal-Backward Verification
    └──required by──> Verification Strategy Document
    └──enhanced by──> Anti-Stub Enforcement

STATE.md / Resumable Sessions
    └──enhances──> All phases (survivability across context resets)

Dual-Format Output (markdown + YAML/JSON)
    └──required by──> Machine-readable structured output
    └──required by──> Protocol-Agnostic Mapping (mapping needs structured data)
```

### Dependency Notes

- **Agent contracts require system boundaries:** You cannot write an agent contract without knowing what external systems it integrates with and what actors it serves. System boundaries must be Phase 1.
- **Event schemas required before agent contracts:** An agent contract that says "emits TaskCompleted" requires TaskCompleted to be defined in the event schema before the contract can be internally consistent. Schema must precede contracts.
- **4-level verification's Level 4 requires event schemas:** Internally Consistent verification (does agent spec reference events that exist?) cannot run until the event schema is complete.
- **Wave-based parallelization requires phase structure:** Waves are computed from the dependency DAG. The DAG cannot be built without a phase structure derived from system intent.
- **Protocol-agnostic mapping requires structured output:** Mapping architecture artifacts to MCP/A2A requires machine-readable YAML/JSON. Prose alone is unmappable programmatically.
- **Context flow maps conflict with early delivery:** Context flow maps require both agent contracts AND orchestration topology to be complete. They must be a late-wave artifact, not early. Attempting them before contracts are written produces placeholder documents.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core concept: "natural language intent → verified architecture package."

- [ ] Natural language input intake (discuss-system → CONTEXT.md) — validates the input mechanism
- [ ] System boundary definition (Phase 1 output: actors, external systems, non-goals) — validates basic architecture documentation
- [ ] Event/command schema design (typed schemas, not prose) — validates the novel output format
- [ ] Agent contract documents (role, inputs, outputs, failure modes per agent) — validates the core differentiator
- [ ] Dual-format output (markdown prose + YAML schema per artifact) — validates the machine-readable output claim
- [ ] 3-level artifact verification (Exists → Substantive → Cross-Referenced) — validates the verification mechanism (Level 4 can be v1.x)
- [ ] STATE.md with context-reset survivability — validates the multi-session capability (without this, complex systems are impractical)
- [ ] Anti-stub enforcement — validates quality gates (low complexity, high signal)

### Add After Validation (v1.x)

Features to add once core architecture package generation is working.

- [ ] Level 4 verification (Internally Consistent — cross-document reference resolution) — trigger: v1 users reporting inconsistencies between agent contracts and event schemas
- [ ] Context flow maps — trigger: v1 users asking "how does state pass between agents?"
- [ ] Orchestration topology document — trigger: v1 users asking "what's the coordination pattern?"
- [ ] Goal-backward verification — trigger: v1 users reporting that artifacts exist but goals are not achieved
- [ ] Protocol-agnostic mapping annotations (MCP/A2A) — trigger: v1 users wanting to implement the architecture

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Wave-based parallelization with full 11-agent roster — defer because: orchestrating 11 specialized agents requires all agent contracts to be written and tested; premature parallelization before single-agent quality is proven adds complexity without value
- [ ] Phases derived from system intent (full adaptive phase inference) — defer because: this requires an intent-analysis model that can accurately predict what design phases are needed; start with 5-phase structure derived from complexity signals, adapt in v2
- [ ] Verification strategy document — defer because: this is the highest-complexity output and requires all other artifacts to be complete before it can reason about observable behaviors; better as a cap on v1.x than a v1 requirement

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Natural language input → structured output | HIGH | MEDIUM | P1 |
| System boundary definition | HIGH | LOW | P1 |
| Agent contract documents | HIGH | MEDIUM | P1 |
| Event/command schema definitions | HIGH | MEDIUM | P1 |
| Dual-format output (markdown + YAML) | HIGH | LOW | P1 |
| STATE.md / resumable sessions | HIGH | MEDIUM | P1 |
| 3-level artifact verification | HIGH | MEDIUM | P1 |
| Anti-stub enforcement | HIGH | LOW | P1 |
| Failure modes per agent | HIGH | LOW | P1 |
| Context flow maps | HIGH | HIGH | P2 |
| Orchestration topology document | MEDIUM | MEDIUM | P2 |
| Goal-backward verification | HIGH | HIGH | P2 |
| Level 4 verification (internally consistent) | HIGH | HIGH | P2 |
| Phases derived from system intent | MEDIUM | HIGH | P2 |
| Protocol-agnostic MCP/A2A mapping | MEDIUM | MEDIUM | P2 |
| Verification strategy document | HIGH | VERY HIGH | P3 |
| Wave-based parallelization (11-agent) | HIGH | VERY HIGH | P3 |

**Priority key:**
- P1: Must have for launch — validates the core concept
- P2: Should have, add when P1 is stable
- P3: Defines the full product vision — build after P2 confirms direction

---

## Competitor Feature Analysis

| Feature | Structurizr | arc42 | IcePanel | C4InterFlow | Our Approach |
|---------|-------------|-------|---------|-------------|--------------|
| Input format | DSL code (Structurizr DSL) | Any (tool-agnostic template) | Drag-and-drop GUI | C#/YAML/JSON code | Natural language prose |
| Agent contracts | None | None | None | None | First-class output artifact |
| Event schemas | None | None | None | Interface/Flow definitions | Typed YAML/JSON schemas |
| Failure modes | None | Risks section (optional) | None | None | Required section, verified |
| Context flow maps | None | Runtime view (diagrams) | Interactive flows | Activity/Flow modeling | Prose + structured map |
| Multi-format output | PNG/SVG/diagrams | docx/PDF/Markdown | SVG/PNG/web | PlantUML/SVG/PNG/Markdown | Markdown prose + YAML schema |
| Artifact verification | DSL syntax check | None | None | CLI consistency checks | 4-level goal-backward |
| State persistence | None | None | None | None | STATE.md (100-line cap) |
| AI/NLP input | None | None | None | None | Primary input mechanism |
| Protocol mapping | None | None | None | None | MCP/A2A annotation |
| Phase derivation | Fixed C4 levels | Fixed 12 sections | Fixed C4 levels | Fixed C4 levels | Intent-derived phases |

**Key finding:** No competitor addresses agentic system documentation (agent contracts, event schemas, context flows, failure modes) as first-class features. All competitors assume the system being documented is a traditional software application. Architecture GSD's entire feature set exists in a whitespace that incumbents have not addressed.

---

## Sources

- IcePanel Blog: Top 9 tools for C4 model diagrams (August 2025) — https://icepanel.io/blog/2025-08-28-top-9-tools-for-c4-model-diagrams
- Generative Programmer: Architecture Diagramming Tools and the AI Gap (2025/2026) — https://generativeprogrammer.com/p/architecture-diagramming-tools-and
- arc42 Overview (Version 9.0, July 2025) — https://arc42.org/overview
- Solace: Documenting Event-Driven Architecture in 5 Steps — https://solace.com/blog/documenting-event-driven-architecture-in-5-steps/
- GitHub Blog: Multi-agent workflows often fail — https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/
- O'Reilly: Designing Effective Multi-Agent Architectures — https://www.oreilly.com/radar/designing-effective-multi-agent-architectures/
- InfoQ: Architecting Agentic MLOps: A Layered Protocol Strategy with A2A and MCP — https://www.infoq.com/articles/architecting-agentic-mlops-a2a-mcp/
- C4InterFlow GitHub — https://github.com/SlavaVedernikov/C4InterFlow
- Swark GitHub — https://github.com/swark-io/swark
- Software Architecture Tools catalog — https://softwarearchitecture.tools/
- ARCHITECT-VISION.md (project context document — HIGH confidence, first-party source)
- GSD-REPURPOSING-VISION.md (project context document — HIGH confidence, first-party source)
- research-agentic-architecture-patterns.md (project research document — HIGH confidence, first-party source)
- DataCamp: CrewAI vs LangGraph vs AutoGen comparison — https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen
- OpenAgents Blog: Open Source AI Agent Frameworks Compared 2026 — https://openagents.org/blog/posts/2026-02-23-open-source-ai-agent-frameworks-compared

---
*Feature research for: Architecture GSD — CLI tool for verified agentic system architecture design*
*Researched: 2026-02-27*
