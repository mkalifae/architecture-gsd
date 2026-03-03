# Agentic Architecture Patterns: State of the Art (2025-2026)

Comprehensive research on multi-agent system design patterns, context engineering, intent preservation, verification, event-driven schemas, and framework comparison.

---

## 1. Multi-Agent Coordination Patterns

### 1.1 Swarm Architecture

**Core concept:** Peer agents working together without centralized control, inspired by biological swarm intelligence (ant colonies, bee swarms). Coordination is decentralized and often happens through a shared memory or message space.

**OpenAI Swarm Pattern (now Agents SDK):**
- Built on two primitive abstractions: **Agents** and **Handoffs**
- A **Routine** is a set of instructions that agents follow to complete specific actions
- A **Handoff** transfers an active conversation to another agent, carrying complete knowledge of the prior conversation
- Handoffs are implemented via `transfer_to_XXX()` functions -- the model is smart enough to call these when a handoff makes sense
- The `run()` function handles agent function execution, handoffs, context variable references, and can take multiple turns before returning
- Swarm was educational/experimental; it has been superseded by the **OpenAI Agents SDK** as a production-ready evolution

**When to use swarms:**
- Tasks requiring exploration of a wide solution space
- Problems where multiple perspectives converge on better answers
- Situations where agents can work in parallel without tight coupling
- Customer service triage and routing scenarios (classic Swarm demo)

**Limitations:**
- Harder to debug (no single point of control)
- Can be unpredictable -- emergent behavior is a feature and a risk
- No single agent has the full picture

### 1.2 DAG-Based Orchestration

**Core concept:** Tasks organized as a Directed Acyclic Graph where nodes are processing steps and edges define dependencies. Enables complex dependencies and parallel execution paths.

**LangGraph as the canonical example:**
- Tasks defined as a graph where the tool to be executed at each step is predetermined
- LLM involvement is minimized, invoked only in ambiguous or decision-making nodes
- State flows through nodes linked by edges with conditional logic
- Compilation provides structure checks (no orphaned nodes) and sets up checkpointers and breakpoints
- Persistent checkpointing enables "time-travel" through execution states

**When to use DAGs:**
- Workflows with clear dependencies between steps
- Need for deterministic replay and debugging
- Production systems requiring predictability and auditability
- Complex multi-step pipelines where order matters

### 1.3 Hierarchical Team Patterns

**Core concept:** Multi-level hierarchy where a top-level executive agent breaks tasks down, passes sub-tasks to intermediate managers, which delegate to specialist agents. Results flow back up the chain.

**CrewAI's implementation:**
- Agents defined by Role, Backstory, Goals, and Tools
- **Sequential process**: agents execute tasks in defined order
- **Hierarchical process**: automatically assigns a manager agent that coordinates planning, execution, delegation, and validation
- **Flows**: event-driven framework to orchestrate complex, multi-step automations that combine regular code, single LLM calls, and multiple crews

**Key insight from research (2025):** Hybridization of hierarchical and decentralized mechanisms is a crucial strategy for achieving scalability while maintaining adaptability.

**When to use hierarchical patterns:**
- Enterprise workflows with natural delegation chains
- Tasks requiring specialized expertise at different levels
- When you need clear accountability and audit trails

### 1.4 Pub/Sub and Event-Driven Agent Communication

**Core concept:** Agents communicate asynchronously through events rather than direct calls. Components react to events in real time rather than waiting for synchronous responses.

**Four event-driven multi-agent patterns (from Confluent):**
1. **Orchestrator-Worker**: Central coordinator dispatches tasks to workers via events
2. **Hierarchical Agent**: Multi-level delegation via event streams
3. **Blackboard Pattern**: Shared knowledge base where agents post and retrieve information asynchronously, enabling collaboration without direct communication
4. **Market-Based**: Agents bid on tasks through an event marketplace

**Blackboard vs. Pub/Sub tradeoffs:**
- **Blackboard**: Tight collaboration, global visibility, all agents see full picture. Best for problems requiring incremental, multi-agent contributions
- **Pub/Sub**: Resilience, simple plug-and-play behaviors. Best for monitoring scenarios (logs, stock prices, chat activity). Tradeoff: no single agent has the full picture

**Design methodology:** Integration of Event Storming and Domain-Driven Design (DDD) provides a framework for designing multi-agent systems with enhanced domain understanding and scalable architecture using bounded contexts.

### 1.5 Pattern Selection Guide

| Pattern | Best For | Control | Scalability | Debuggability |
|---------|----------|---------|-------------|---------------|
| Swarm | Exploration, diverse perspectives | Low | High | Low |
| DAG | Deterministic workflows | High | Medium | High |
| Hierarchical | Enterprise delegation | Medium-High | Medium | Medium |
| Pub/Sub | Reactive, monitoring | Low-Medium | Very High | Medium |
| Blackboard | Collaborative problem-solving | Medium | High | Medium |
| Orchestrator-Worker | Dynamic task decomposition | High | High | High |

---

## 2. Context Engineering

### 2.1 What Is Context Engineering?

Context engineering is the discipline of designing and managing the complete information environment for LLM-based agents. It encompasses all strategies for curating and maintaining the optimal set of tokens during LLM inference.

**Key distinction from prompt engineering:**
- **Prompt engineering**: Crafting individual prompts for single-turn interactions
- **Context engineering**: Designing the full environment in which an agent operates, including prompts, memory, tools, data, and how these evolve over time across multi-step reasoning

Context engineering is now considered the new norm, superseding traditional prompt engineering. Regardless of how much smarter future models become, the challenge of filling the context window wisely will remain.

### 2.2 Four Core Strategies

1. **Write Context**: Persist information outside the context window (scratchpads, memory files, external state)
2. **Select Context**: Retrieve only relevant information (RAG, dynamic tool selection)
3. **Compress Context**: Summarize or trim to save space (auto-compaction, summarization)
4. **Isolate Context**: Separate concerns using multi-agent systems or sandboxes

### 2.3 Sliding Window and Compression Strategies

**Auto-compaction (Claude Code approach):**
- Runs "auto-compact" after exceeding 95% of the context window
- Summarizes the full trajectory of user-agent interactions
- Preserves key decisions and outcomes while discarding verbatim history

**Context Reduction techniques:**
- **Compaction**: Strips out information that is redundant because it exists in the environment (e.g., file contents that can be re-read)
- **Summarization**: Condensing conversation history into shorter narratives
- **Context Offloading**: Moving information to external systems (files, databases)
- **Context Retrieval**: Adding information dynamically via RAG when needed

### 2.4 KV Cache Optimization (Lessons from Manus)

KV-cache hit rate is the single most important metric for production-stage AI agents, directly affecting both latency and cost. With Claude Sonnet, cached vs uncached tokens show a 10x cost difference.

**Rules for KV-cache efficiency:**
- **Stable prefixes**: Even a single token difference invalidates the entire cache downstream. Avoid dynamic elements like timestamps in system prompts
- **Append-only context**: Never modify previous actions or observations. Maintain deterministic serialization (even JSON key ordering matters)
- **Tool masking over removal**: Instead of dynamically removing tools (which breaks cache), mask tool availability using logits manipulation
- **File system as ultimate context**: Treat the file system as unlimited, persistent, directly manipulable context that extends beyond the context window

These insights came from Manus AI after "four complete framework rebuilds."

### 2.5 Cross-Agent Context Handoff Protocols

**Google ADK approach:**
- Handoff behavior controlled by `include_contents` knob: `full` mode passes complete working context, `none` mode gives sub-agent no prior history
- ADK performs active translation during handoff:
  - **Narrative casting**: Re-casts prior "Assistant" messages as narrative context
  - **Action attribution**: Marks tool calls so the new agent acts on results without confusion
  - Builds a fresh Working Context from the sub-agent's point of view

**Cognition AI (Devin) approach:**
- Uses fine-tuned models for summarization at agent-agent boundaries
- Reduces token usage during knowledge handoff while preserving essential intent

### 2.6 Preserving Intent Across Context Boundaries

Key techniques:
- **Persistent goal artifacts**: Write goals and constraints to files/scratchpads that survive context resets
- **Structured handoff documents**: When transitioning between agents or sessions, create explicit handoff artifacts that capture: original intent, work completed, remaining goals, constraints, and key decisions
- **Multi-session architecture** (Anthropic approach): An initializer agent sets up the environment on the first run; a coding agent makes incremental progress per session while leaving clear artifacts for the next session

### 2.7 Protocols: MCP and A2A

**Model Context Protocol (MCP):**
- Open standard introduced by Anthropic (November 2024) for standardizing how AI systems integrate with external tools and data sources
- Inspired by the Language Server Protocol (LSP) -- standardizes tool integration like LSP standardized language support
- Adopted by OpenAI (March 2025), Microsoft Azure (May 2025)
- Donated to Agentic AI Foundation (AAIF) under Linux Foundation (December 2025)
- November 2025 specification expanded MCP beyond synchronous tool calling into secure, long-running, governed workflows with modern authorization and asynchronous execution
- Changes integration complexity from N*M to N+M

**Agent2Agent Protocol (A2A):**
- Introduced by Google (April 2025) with 50+ technology partners
- Allows AI agents to communicate across providers and frameworks
- Key schema components:
  - **Agent Card**: JSON document advertising capabilities, name, description, version, endpoint URL, supported modalities, auth requirements
  - **Message**: A communication turn between client and remote agent
  - **Task**: Fundamental unit of work
  - **Artifact**: Output generated by the agent
- Uses HTTP, SSE, and JSON-RPC; modality agnostic (supports audio/video streaming)
- Version 0.3 added gRPC support and signed security cards

---

## 3. Intent Engineering

### 3.1 Intent Specification for Multi-Hop Chains

The core challenge: how to specify agent intent so it survives across multiple agent handoffs without degradation.

**Levels of alignment (from research):**
1. **Instruction alignment**: Agent follows explicit instructions
2. **Intention alignment**: Agent understands the underlying goal behind instructions
3. **Preference alignment**: Agent aligns with user preferences even when unstated
4. **Value alignment**: Agent's goals, preferences, and behaviors align with human values

### 3.2 Goal Decomposition Patterns

**Planner-based decomposition:**
- A Planner Agent decomposes large tasks into smaller, manageable subtasks
- Each subtask has its own requirements, making problems more tractable
- Each subtask is assigned to the right agent for execution
- Example: VeriMAP's planner creates a DAG of subtasks with structured I/O and verification functions

**SuperAgent+ pattern:**
- Transforms user-defined natural language goals into actionable multi-agent workflows
- Breaks goals into atomic steps or modules
- Each module is independently verifiable

**RTADev alignment checking:**
- Five LLM-based agents work sequentially
- After each agent produces output, ALL previous agents verify if the new deliverable is consistent with the original requirements
- Creates a chain of alignment verification

### 3.3 Intent Verification and Drift Detection

**Goal drift** refers to when an agent's internal objectives, constraints, or evaluative criteria shift over time. Even small changes in internal evaluations can cause significant long-run divergence.

**Detection approaches:**
- **AlignmentCheck (Meta)**: Uses LLM reasoning to compare an agent's action sequence against the user's stated objective, flagging deviations that may signal covert prompt injection
- **Drift-Aware Security**: Dynamic validation of function trajectories, privilege/intention checks, and injection isolation
- **LLM "judges"**: Online detection using separate LLM instances or statistical tests, followed by regeneration or insertion of feedback/policy agents
- **Multi-agent debate**: Agents challenge each other's reasoning to surface drift

**Practical challenge:** Even with state-of-the-art methods, drift can re-emerge in systems operating for millions of tokens or steps, especially under adversarial pressure or complex objective switching.

### 3.4 Goal-Backward Analysis

Working backwards from the desired outcome:
- Define the desired end state explicitly
- Identify what conditions must be true for that end state
- Work backwards to identify the sequence of intermediate states
- Each intermediate state becomes a verifiable checkpoint
- Agents are given both the forward task and the backward verification criteria

---

## 4. Verification Layers for Multi-Agent Systems

### 4.1 VeriMAP: Verification-Aware Planning

VeriMAP is the most comprehensive named architecture for integrated verification in multi-agent systems. It consists of four modules:

1. **Planner**: Decomposes tasks into a DAG of subtasks, specifies structured/named I/O, and encodes planner-defined passing criteria as Verification Functions (VFs) in Python and natural language
2. **Executor**: Produces JSON outputs for each subtask
3. **Verifier**: Evaluates executor outputs using the generated verification functions
4. **Coordinator**: Manages contexts, retries, and replanning to ensure reliable results

**Key innovation:** Verification is embedded into the planning phase, not appended after execution. The planner specifies what "correct" means for each subtask before any execution begins.

### 4.2 Dedicated Verifier Agents

In swarm architectures, dedicated **Verifier Agents** exclusively monitor production agents' Chain of Thought and tool-call outputs:
- Creates a "Checks and Balances" system
- Quality issues caught in real-time by an independent AI layer
- Verifiers do not perform tasks themselves, maintaining separation of concerns

### 4.3 Consensus Mechanisms for Agent Disagreements

Research from ACL 2025 ("Voting or Consensus?") systematically evaluated seven decision protocols:

**Key findings:**
- **Voting protocols**: Improve performance by 13.2% in reasoning tasks. Allow exploration and selection from multiple reasoning paths
- **Consensus protocols**: Improve performance by 2.8% in knowledge tasks. Requirement for multiple agents to agree mitigates individual errors and enhances fact-checking
- **All-Agents Drafting (AAD)**: New method improving performance by up to 3.3%
- **Collective Improvement (CI)**: New method improving performance by up to 7.4%

**Debate-based consensus pattern:**
- Network of agent peers share proposals
- Protocol for iterative feedback/debate
- Termination condition for consensus
- Forces agents to confront disagreements, often producing better answers than any single agent's initial attempt

### 4.4 Quality Gates Between Agent Stages

**Tiered verification architecture (emerging standard):**
1. **Fast pull-request gates**: Deterministic checks (format, schema validation, basic assertions)
2. **Full regression suites**: LLM-as-judge methodology for semantic correctness
3. **Continuous production monitoring**: Alerting on drift and quality degradation

**Risk-adaptive gates:**
- Trigger human involvement when confidence is low, model disagreement is high, or blast radius is large
- Policy-as-code gates define who can do what, under what conditions
- Mandatory human confirmation for high-impact changes
- Immutable audit logs of tool calls and retrieved evidence

### 4.5 Formal vs. Empirical Verification

**Formal verification:**
- VeriMAP-style verification functions in Python -- executable assertions
- Schema validation against JSON Schema contracts
- DAG-based dependency verification (are all preconditions met?)
- Type checking of inter-agent I/O

**Empirical verification:**
- LLM-as-judge evaluation of output quality
- Multi-agent debate for fact verification
- A/B testing and statistical comparison
- Human-in-the-loop spot checks

**Emerging consensus:** Use formal verification for structural/format correctness and empirical verification for semantic quality. Layer both for production systems.

---

## 5. Event-Driven Swarm Schemas

### 5.1 Agent-to-Agent Communication Schemas

**A2A Protocol schema objects (Google):**
- **Agent Card** (JSON): name, description, version, endpoint URL, supported modalities, auth requirements
- **Message**: communication turn with sender role, content parts (text/file/data)
- **Task**: unit of work with ID, status lifecycle, session ID
- **Artifact**: output with name, parts, index
- Uses JSON-RPC over HTTP/SSE, with gRPC support in v0.3

**MCP Protocol schema (Anthropic):**
- **Tools**: Functions the server exposes for the client to call
- **Resources**: Data the server exposes for the client to read
- **Prompts**: Templates the server provides for the client to use
- JSON-RPC 2.0 based, transport-agnostic

### 5.2 Event Sourcing Patterns for Agent Systems

**ESAA (Event Sourcing for Autonomous Agents):**
- Agents emit structured intentions and change proposals compliant with an output contract validatable by JSON Schema
- Every agent action is persisted as an immutable event
- Full audit trail and replay capability
- Enables "time-travel" debugging

**Event stream as blackboard:**
- The blackboard can become a data streaming topic
- Worker agents produce and consume events to collaborate
- Each event carries structured data about what happened and what changed
- Events are immutable and ordered, providing a natural audit log

### 5.3 API Contracts Between Agents

**VeriMAP's approach:**
- Structured and Named I/O at subtask level
- JSON outputs verified by paired Verification Functions
- Input/output schemas defined at planning time

**Schema contract principles:**
- The schema is a contract; breaking it means clients lose faith in the system
- Changes must be forward or backward compatible
- Adding new fields in JSON is forward-compatible
- Removing or renaming fields is a breaking change

### 5.4 Schema Evolution When Capabilities Change

**Versioned streams approach:**
- When breaking changes are needed, create versioned streams (e.g., `payments-v1` and `payments-v2`)
- Event sources can write to both streams during migration

**Upcasting:**
- Decouples API and domain model from the event stream format
- Transforms old event versions to current version at read time
- Reduces need for multiple old-versioned event handlers

**Agent capability evolution:**
- Agent Cards (A2A) advertise current capabilities -- clients query capabilities before dispatching
- Tool definitions (MCP) can evolve -- new tools added, old tools deprecated
- Logits masking (Manus approach) allows dynamic tool availability without schema changes

---

## 6. Framework Comparison

### 6.1 Claude Agent SDK (Anthropic)

**Architecture:** Single-threaded master loop with real-time steering

**Key characteristics:**
- Renamed from Claude Code SDK to reflect broader applicability
- Agentic loop: gather context -> take action -> verify work -> repeat
- Code as orchestration: loops, conditionals, data transformations are explicit in code rather than implicit in LLM reasoning
- Tool calls flow to sandboxed execution environments and return results as plain text
- Self-evaluation: agents check and improve their own output before returning
- Multi-context window management: initializer agent + coding agent pattern

**Philosophy:** Simplicity, debuggability, and transparency over complex multi-agent orchestration. Many patterns implemented in a few lines of code.

**Strengths:**
- Production-proven (powers Claude Code)
- Direct API usage -- minimal abstraction overhead
- Strong tool safety via sandboxed execution
- Built-in context compression (auto-compact at 95%)

**Composable patterns (from Anthropic's "Building Effective Agents"):**
1. **Prompt Chaining**: Sequential LLM calls where each processes the previous output
2. **Routing**: Directing tasks to appropriate models based on complexity
3. **Parallelization**: Sectioning (independent subtasks in parallel) and Voting (same task multiple times)
4. **Orchestrator-Workers**: Central LLM dynamically breaks down tasks, delegates to workers, synthesizes results
5. **Evaluator-Optimizer**: Iterative refinement loop with evaluation criteria

### 6.2 CrewAI

**Architecture:** Role-based teams with Flows orchestration layer

**Key characteristics:**
- Agents defined by Role, Backstory, Goals, and Tools
- Tasks assigned based on agent capabilities
- Two process types: Sequential and Hierarchical (with auto-assigned manager)
- **Flows**: Event-driven framework combining regular code, LLM calls, and crews via conditional logic, loops, and real-time state management
- Autonomous inter-agent delegation
- Shared crew store (typically SQLite) for cross-agent memory

**Winning production pattern:** Deterministic backbone (Flow) dictating core logic, with individual steps leveraging different levels of agents from ad-hoc LLM calls to single agents to complete Crews.

**Strengths:**
- Best balance of simplicity and power for multi-agent orchestration
- Intuitive mental model (mimics human teams)
- Strong adoption: $18M funding, 100K+ certified developers, 60% of Fortune 500
- 60M+ agent executions monthly

**Limitations:**
- Less granular control than LangGraph
- Abstraction can obscure debugging

### 6.3 AutoGen / AG2 (Microsoft)

**Architecture:** Asynchronous, event-driven, actor model with layered API

**Key characteristics:**
- v0.4 complete redesign: async message passing as the foundation
- Three API layers:
  - **AgentChat**: Quick multi-agent apps
  - **Core**: Event pipelines and scaling
  - **Extensions**: Model/tools integration
- Supports both event-driven flows (reactive agents) and request/response patterns
- Built-in OpenTelemetry integration for observability
- Conversable agents that communicate with each other, humans, and tools

**Strengths:**
- Microsoft Research backing
- Most flexible communication patterns (event-driven + request/response)
- Strong observability out of the box
- Enterprise-grade async architecture

**Limitations:**
- Steeper learning curve due to layered API
- Community split between AG2 fork and official AutoGen

### 6.4 LangGraph (LangChain)

**Architecture:** State machine / directed graph with first-class state management

**Key characteristics:**
- Agents represented as graphs of states and nodes
- State is a first-class citizen: serializable object that persists across runs
- Nodes are functions that receive and return state
- Edges define paths with conditional logic
- Compilation validates structure and sets up checkpointers
- Message-passing algorithm: nodes send messages along edges to other nodes
- Thread-scoped checkpoints for pause/resume

**Strengths:**
- Best for production deployments requiring control and reliability
- Deterministic replay and debugging via checkpointing
- Mathematical guarantees for complex workflows
- State management is the strongest of any framework
- "Time-travel" through execution states

**Limitations:**
- Higher boilerplate than simpler frameworks
- Graph-based thinking can be unfamiliar
- Can be over-engineered for simple use cases

### 6.5 OpenAI Agents SDK (successor to Swarm)

**Architecture:** Lightweight orchestration via function signatures and handoffs

**Key characteristics:**
- Minimalist: agents call shared functions, hand off context to peers
- Relies on function signatures rather than long message threads
- Production-ready (unlike educational Swarm)
- Super easy to start -- few lines of code

**Strengths:**
- Lowest barrier to entry
- Well-written, non-overwhelming docs
- Natural function-calling integration
- Good for rapid prototyping

**Limitations:**
- Less sophisticated orchestration than LangGraph or CrewAI
- Limited state management compared to LangGraph
- Less community tooling than LangChain ecosystem

### 6.6 Other Notable Frameworks

**Google ADK (Agent Development Kit):**
- Tiered storage architecture, compiled views, pipeline processing, strict scoping
- Advanced context handoff with narrative casting and action attribution
- Strong context engineering focus

**Strands Agents (AWS):**
- Four collaboration patterns: Agents as Tools, Swarms, Agent Graphs, Agent Workflows
- Designed for Amazon Nova integration

**Swarms (open-source, by Kye Gomez):**
- Enterprise-grade multi-agent orchestration
- Extensive swarm architecture catalog
- Multiple topology options

### 6.7 Framework Selection Guide

| Criterion | Claude SDK | CrewAI | AutoGen | LangGraph | OpenAI SDK |
|-----------|-----------|--------|---------|-----------|------------|
| Learning Curve | Low | Low | Medium-High | Medium | Very Low |
| Control | Medium | Medium | High | Very High | Low |
| State Mgmt | Basic | Medium | Medium | Excellent | Basic |
| Multi-Agent | Via patterns | Native | Native | Native | Via handoffs |
| Production Ready | Yes | Yes | Yes | Yes | Yes |
| Debuggability | High | Medium | Medium | Very High | Medium |
| Flexibility | High (code) | Medium | High | High | Low |
| Best For | Single-agent loops, tool use | Team-based orchestration | Event-driven, enterprise | Complex workflows, DAGs | Quick prototypes, handoffs |

---

## 7. Emerging Trends and Key Takeaways

### 7.1 Convergence Points (2025-2026)

1. **Event-driven is becoming standard**: AutoGen v0.4's async-first redesign, CrewAI Flows, A2A protocol all point to event-driven as the dominant communication paradigm
2. **Context engineering > prompt engineering**: The shift is from crafting prompts to designing information environments. This will remain critical regardless of model improvements
3. **Verification is being embedded, not appended**: VeriMAP and similar patterns show verification moving into the planning phase rather than being a post-hoc step
4. **Hybrid coordination**: Pure swarm, pure hierarchy, or pure DAG is insufficient. Successful systems hybridize patterns (hierarchical + decentralized)
5. **Interoperability protocols maturing**: MCP (tools) + A2A (agent-to-agent) forming a two-layer protocol stack for agentic systems
6. **By 2026, 40% of enterprise applications** are expected to feature task-specific AI agents, up from less than 5% in 2025

### 7.2 Design Principles That Recur Across Frameworks

- **Start simple, add complexity incrementally** (Anthropic's philosophy)
- **Code over configuration** for orchestration logic
- **State as a first-class citizen** (LangGraph, event sourcing)
- **Separation of concerns**: Planning, execution, verification as distinct phases
- **Append-only context** for cache efficiency and auditability
- **File system as extended memory** beyond context window limits
- **Schema contracts** between agents, validated formally

### 7.3 Open Problems

- **Goal drift at scale**: No reliable solution for systems operating over millions of tokens
- **Cross-framework interoperability**: MCP and A2A help but are still evolving
- **Verification of semantic quality**: Formal verification works for structure, but semantic correctness still requires empirical (LLM-as-judge) approaches
- **Context window vs. cost**: Even with 128K+ windows, filling them is expensive; compression is lossy

---

## Sources

### Multi-Agent Coordination
- [Multi-Agent collaboration patterns with Strands Agents (AWS)](https://aws.amazon.com/blogs/machine-learning/multi-agent-collaboration-patterns-with-strands-agents-and-amazon-nova/)
- [Multi-Agent Architectures - Swarms](https://docs.swarms.world/en/latest/swarms/concept/swarm_architectures/)
- [Taxonomy of Hierarchical Multi-Agent Systems (arXiv)](https://arxiv.org/html/2508.12683)
- [Four Design Patterns for Event-Driven Multi-Agent Systems (Confluent)](https://www.confluent.io/blog/event-driven-multi-agent-systems/)
- [Orchestrating Agents: Routines and Handoffs (OpenAI Cookbook)](https://cookbook.openai.com/examples/orchestrating_agents)

### Context Engineering
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Effective Context Engineering for AI Agents (Anthropic)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Context Engineering (LangChain Blog)](https://blog.langchain.com/context-engineering-for-agents/)
- [Context Engineering: Definitive 2025 Guide (FlowHunt)](https://www.flowhunt.io/blog/context-engineering/)
- [Architecting Efficient Context-Aware Multi-Agent Framework (Google)](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/)
- [Context Engineering for Coding Agents (Martin Fowler)](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)

### Intent Engineering and Goal Drift
- [Evaluating Goal Drift in Language Model Agents (AAAI)](https://arxiv.org/abs/2505.02709)
- [Agent Drift in AI Systems (Emergent Mind)](https://www.emergentmind.com/topics/agent-drift)
- [Structural Architecture for Preventing Goal Drift](https://philarchive.org/archive/ABDCAA)
- [RTADev: Intention Aligned Multi-Agent Framework (ACL 2025)](https://aclanthology.org/2025.findings-acl.80.pdf)

### Verification
- [VeriMAP: Verification-Aware Planning for Multi-Agent Systems (arXiv)](https://arxiv.org/html/2510.17109v1)
- [VeriMAP Blog Post (Megagon)](https://megagon.ai/verification-aware-planning-multi-agent-llm/)
- [Voting or Consensus? Decision-Making in Multi-Agent Debate (ACL 2025)](https://arxiv.org/abs/2502.19130)
- [The Agent That Says No: Verification Beats Generation](https://vadim.blog/verification-gate-research-to-practice)
- [Safety and Guardrails for Agentic AI Systems (2025)](https://skywork.ai/blog/agentic-ai-safety-best-practices-2025-enterprise/)

### Event-Driven Schemas and Protocols
- [A2A Protocol (Google)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A GitHub](https://github.com/a2aproject/A2A)
- [MCP Specification (November 2025)](https://modelcontextprotocol.io/specification/2025-11-25)
- [ESAA: Event Sourcing for Autonomous Agents (arXiv)](https://arxiv.org/html/2602.23193)
- [Event-Driven Multi-Agent Design (Sean Falconer)](https://seanfalconer.medium.com/ai-agents-must-act-not-wait-a-case-for-event-driven-multi-agent-design-d8007b50081f)

### Framework Comparisons
- [14 AI Agent Frameworks Compared (Softcery)](https://softcery.com/lab/top-14-ai-agent-frameworks-of-2025-a-founders-guide-to-building-smarter-systems)
- [OpenAI Agents SDK vs LangGraph vs Autogen vs CrewAI (Composio)](https://composio.dev/blog/openai-agents-sdk-vs-langgraph-vs-autogen-vs-crewai)
- [AI Agent Framework Comparison (Langfuse)](https://langfuse.com/blog/2025-03-19-ai-agent-comparison)
- [AutoGen vs CrewAI vs LangGraph (Galileo)](https://galileo.ai/blog/autogen-vs-crewai-vs-langgraph-vs-openai-agents-framework)
- [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- [Building Agents with Claude Agent SDK (Anthropic)](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Detailed Comparison of Top 6 AI Agent Frameworks 2026 (Turing)](https://www.turing.com/resources/ai-agent-frameworks)
