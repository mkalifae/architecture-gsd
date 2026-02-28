# Pitfalls Research

**Domain:** Multi-agent LLM systems producing architecture design documents
**Researched:** 2026-02-27
**Confidence:** HIGH (multi-agent failure modes: HIGH via MAST taxonomy + Anthropic research; architecture documentation pitfalls: MEDIUM via practitioner sources; self-referential systems: LOW/MEDIUM, limited direct prior art)

---

## Critical Pitfalls

### Pitfall 1: Goal Drift Through Agent Handoff

**What goes wrong:**
Each agent in the pipeline slightly reinterprets the system intent. Individually, each reinterpretation is minor — but accumulated across 11 agents and multiple phases, the final architecture documents describe a subtly different system than the one the human architect intended. The drift is invisible during execution because each agent's output is internally coherent.

**Why it happens:**
Each agent receives a fresh context window and reads STATE.md + CONTEXT.md, but the act of summarizing intent into those files introduces lossy compression. Each agent's "reading" of intent is a probabilistic inference, not deterministic parsing. The MAST taxonomy (arxiv.org/abs/2503.13657) identifies FM-2.3 "Task Derailment" as one of the six inter-agent misalignment failure modes. The 2025 research found 41-86.7% failure rates across multi-agent frameworks, with inter-agent misalignment as the single most common failure category.

**How to avoid:**
- CONTEXT.md must contain structured intent that is machine-checkable: system name, scope boundaries, explicit non-goals, and enumerated constraints — not prose paragraphs
- Each phase's SUMMARY.md must close with a "Goal Fidelity Check": restating the system intent in the agent's own words, so humans can spot drift early
- arch-verifier must check that phase outputs are consistent with CONTEXT.md constraints, not just internally consistent with each other
- arch-roadmapper derives phases from intent — include a "rationale" field for each phase explicitly linking it back to a specific clause in CONTEXT.md

**Warning signs:**
- Phase summaries describe different system boundaries than CONTEXT.md
- arch-integrator finds agents that don't appear in CONTEXT.md's actor catalog
- The system being designed grows in scope with each phase without corresponding human approval

**Phase to address:** Phase 1 (System Boundaries definition, discuss-system agent), and verification contract in every subsequent phase

---

### Pitfall 2: Verbosity Compensation — Plausible-Sounding but Hollow Specs

**What goes wrong:**
Agents produce architecture documents that appear complete — correct section headings, appropriate length, fluent prose — but contain no actionable content. Agent contracts say "handles failures gracefully" without specifying what failures, how they manifest, or what recovery means. Event schemas say "includes metadata fields as needed." The system passes existence and min-lines verification but the docs are unimplementable.

**Why it happens:**
This is Verbosity Compensation (VC), formally studied in "Verbosity ≠ Veracity" (ACL 2025, aclanthology.org/2025.uncertainlp-main.14). LLMs produce verbose, hedge-filled responses when uncertain, with GPT-4 exhibiting VC at 50.40% frequency. Architecture design tasks are inherently ambiguous — agents face genuine uncertainty about design choices, and the path of least resistance is to produce plausible-sounding documents rather than making concrete commitments.

**How to avoid:**
- Required sections in arch-executor prompts must specify **what constitutes a complete answer**, not just the section name. "Failure Modes" is not enough; "List each failure mode with: trigger condition, error manifestation, recovery action, affected downstream agents" is.
- arch-checker quality gates must scan for hedge phrases: "TBD", "to be determined", "as needed", "appropriate", "handles gracefully", "as applicable" — these are stub indicators for architecture docs, equivalent to `console.log()` in code.
- Verification level 2 (Substantive) must include required content checks, not just line counts. A 200-line doc full of boilerplate is not substantive.
- Schema-designer outputs must be machine-parseable YAML/JSON — this forces concreteness because YAML can't contain vague prose.

**Warning signs:**
- Agent contracts use passive voice heavily ("requests are processed", "errors are handled")
- Event schemas lack field-level type annotations
- Failure modes sections say "system retries" without specifying retry counts, backoff strategy, or escalation path
- Documents read fluently but contain no numbers, no named entities, no concrete decisions

**Phase to address:** arch-executor prompts (Phase scaffold), arch-checker quality gates (every phase), verification pipeline design

---

### Pitfall 3: Agent Groupthink — Verification That Doesn't Catch Errors

**What goes wrong:**
arch-checker reviews arch-executor's plan and approves it. arch-verifier reviews arch-executor's output and approves it. Neither catches a critical inconsistency — e.g., an agent contract references EventX but EventX isn't defined in EVENTS.md. This happens because both checker and verifier are the same model, with similar biases, running in similar contexts, and exhibiting the sycophantic tendency to affirm rather than critique.

**Why it happens:**
Multi-agent debate research ("Talk Isn't Always Cheap", arxiv.org/pdf/2509.05396) shows that homogeneous agent configurations suffer from sycophancy where models adopt peer outputs rather than critically evaluate them. CONSENSAGENT research (ACL 2025) demonstrates that sycophancy consistently propagates misinformation in multi-agent settings. When checker and verifier agents are given the same base model and similar prompts, they tend to agree — including when the original output is wrong.

**How to avoid:**
- arch-checker and arch-verifier must use explicitly adversarial prompting: "Your job is to find what is wrong, not to confirm what is correct. Report every gap, inconsistency, and missing element. If you find nothing wrong, say why you looked hard and found nothing."
- arch-verifier's 4-level verification must be schema-driven: the cross-reference check (level 3) must use actual name resolution against a canonical registry, not LLM judgment about "whether references seem consistent."
- arch-integrator (cross-phase) should be a separate pass with a different system prompt designed for adversarial review
- Consider using Haiku for execution and Opus for verification — different capability profiles create useful skepticism asymmetry

**Warning signs:**
- arch-checker and arch-verifier consistently produce "PASS" across diverse agent contracts without identifying any gaps
- Verification reports are short (under 50 lines for a complex phase)
- arch-checker's quality dimensions are all rated "satisfactory" without specific evidence

**Phase to address:** Agent design phase (arch-checker and arch-verifier prompts), verification pipeline design

---

### Pitfall 4: Context Window Overflow in Large Architecture Packages

**What goes wrong:**
Late-phase agents (arch-integrator, arch-verifier doing cross-phase checks) receive STATE.md + CONTEXT.md + 5 phase SUMMARYs + the current phase's artifacts. The aggregate token count approaches or exceeds context limits. The agent starts exhibiting "lost-in-the-middle" behavior — the Stanford study (cited in redis.io/blog/context-rot/) shows accuracy drops 15-20 percentage points when relevant information sits in the middle of a long context. For Architecture GSD specifically: an 11-agent system designing a complex agentic system could easily accumulate 50,000-100,000 tokens of design artifacts across phases.

**Why it happens:**
Architecture documents are verbose by nature. A complete agent contract is 200-300 lines. 11 agent contracts = 2,200-3,300 lines. Event schemas, orchestration diagrams, failure modes, verification strategies — the full architecture package for a non-trivial system will be large. STATE.md's 100-line cap prevents orchestrator overflow but doesn't protect agents that need to read multiple prior artifacts.

**How to avoid:**
- Thin orchestrator pattern (already in GSD) prevents orchestrator overflow — maintain this strictly
- Phase-boundary artifacts should be summarized: when phase N completes, arch-integrator writes a PHASE-N-DIGEST.md (max 50 lines: decisions made, key entities defined, cross-references created) — later agents read the digest, not the full phase output
- CONTEXT.md must stay under 200 lines — if it grows, arch-roadmapper must summarize, not append
- arch-verifier for cross-phase consistency reads digests first, then fetches specific artifacts on demand — not all artifacts upfront
- Verification pipeline design must specify which files each agent reads — no open-ended "read everything relevant"

**Warning signs:**
- arch-integrator outputs contradict individual phase summaries (lost context)
- Late phases produce documents that don't reference entities established in early phases
- Agents start omitting sections that were specified in plans (context crowding out instructions)

**Phase to address:** Phase scaffold design (file injection strategy), context-engineer agent design, arch-integrator spec

---

### Pitfall 5: Regex-Based Cross-Reference Verification Is Fragile

**What goes wrong:**
The verification pipeline checks that AGENT-CONTRACTS.md references EVENTS.md using a regex pattern like `references|imports|see`. But arch-executor writes "processes the UserCreated event" — which doesn't match. Or uses "See Events Schema" (capitalization mismatch). Or references the event inline in a table without a prose reference phrase. The verifier reports "cross-reference missing" when the link actually exists, triggering unnecessary gap-closure loops.

Conversely: the verifier checks for "EventX" appearing in AGENT-CONTRACTS.md, finds "EventXHandler", and reports the cross-reference as satisfied when EventX itself was never explicitly referenced.

**Why it happens:**
The key_links verification in GSD uses via regex patterns to find cross-references. This works well for code (import statements follow strict syntax) but fails for prose architecture documents where the same semantic relationship can be expressed in dozens of ways. Architecture GSD explicitly decided on dual-format output (markdown + YAML) to address this — but the YAML cross-reference checking still needs well-designed schema.

**How to avoid:**
- YAML/JSON schemas are the canonical cross-reference registry — the prose documents are for human readability
- arch-verifier's cross-reference check (level 3) must validate against schema registries, not prose text: "Does agent contract COORDINATOR list EventX in its `emits` field?" is deterministic; "Does COORDINATOR.md mention EventX?" is fragile
- Establish canonical naming rules in Phase 1 and enforce them: PascalCase for events, kebab-case for agent names, SCREAMING_SNAKE for commands — parseable by regex without ambiguity
- arch-executor must write cross-references using the canonical names defined in the YAML registry — not paraphrases, not aliases

**Warning signs:**
- Verification reports false positives (gaps that don't exist) or false negatives (missing gaps it doesn't catch)
- arch-executor and arch-verifier need multiple iterations to agree on whether a cross-reference is satisfied
- Event names vary by case across documents (e.g., "user-created", "UserCreated", "USER_CREATED" all appear)

**Phase to address:** Schema design phase (naming conventions), verification pipeline design, arch-executor prompts (canonical naming discipline)

---

### Pitfall 6: Self-Design Fixed-Point Failure (Dog-Fooding)

**What goes wrong:**
When Architecture GSD designs itself (the self-consistency validation), the system discovers that its own agent contracts don't fully describe its own behavior — because the agents were written by humans making implicit assumptions. This is expected and valuable. The risk is the response: the system enters a gap-closure loop trying to make its self-description perfect, discovering new gaps in each iteration, never converging to a stable self-description.

The deeper risk: if arch-executor is allowed to update CONTEXT.md during self-design (to "accurately reflect" what it discovered about itself), the scope of the design grows unboundedly with each phase.

**Why it happens:**
Self-referential systems have inherent recursion: to describe what arch-executor does, arch-executor must execute, observe itself executing, and update the description. Each execution is richer than the prior description, so the description is always incomplete. This is related to Gödel's incompleteness theorems applied to self-description — there are properties of a sufficiently complex system that the system cannot fully describe from within. Gödel Agent research (arxiv.org/abs/2410.04444) shows self-improving agents can iterate without convergence without explicit stopping criteria.

**How to avoid:**
- Self-design is validation, not a new design project — the stopping condition is "sufficiently complete for re-implementation," not "perfectly complete"
- During self-design, CONTEXT.md is locked — no agent may update it; arch-executor can only add to DEFERRED.md
- Self-design runs have a hard phase cap: if the self-description hasn't converged to a PASS in the same number of phases as a normal external design, the self-design is declared "sufficiently done" and human review is requested
- Define convergence criterion explicitly: "Architecture GSD self-design is complete when all 11 agent contracts, the event schema, and the orchestration topology are documented such that a competent engineer could re-implement the system without asking questions."

**Warning signs:**
- Self-design gap-closure produces new gaps, which produce new plans, which produce new gaps
- CONTEXT.md for self-design grows beyond original bounds
- arch-verifier keeps finding the same class of gap in successive iterations

**Phase to address:** Self-design workflow design (validation phase), gap-closure termination criteria

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Prose-only architecture docs (skip YAML schemas) | Faster initial agent writing | Regex-based verification fails; cross-references unenforceable; consumers can't parse programmatically | Never — dual format is mandatory per PROJECT.md |
| Fixed phase template instead of intent-derived phases | Simpler roadmapper, faster execution | Wrong decomposition for unusual systems; forces architecture into ill-fitting boxes | Never — PROJECT.md explicitly prohibits this |
| Skip arch-checker quality gate on "obviously good" plans | Saves one agent call | Flawed plans discovered at execution time, requiring costly rework | Never — checker is the cheapest place to catch problems |
| Use single verification level (Exists only) for early phases | Faster phase completion | TBD-heavy docs pass verification; garbage-in for downstream phases | Never for primary deliverables; acceptable for supporting notes |
| Collapse arch-checker and arch-verifier into one agent | Simpler system, fewer agent calls | Same agent that generates plans reviews them; loses adversarial critique; groupthink guaranteed | Never |
| Allow STATE.md to grow beyond 100 lines | No information loss | Orchestrator context fills, triggering context rot for subsequent phases | Never — hard cap is the protection |
| Skip phase-boundary digests for "small" phases | Saves one summarization pass | Late-phase agents must read all prior artifacts; context overflow risk compounds | Acceptable for Phase 1 only (insufficient accumulated context yet) |
| Use fuzzy LLM judgment for cross-reference verification | Handles edge cases, more "intelligent" | False positives and negatives; non-deterministic; fails on same input differently | Never for schema cross-references; acceptable for semantic consistency checks |

---

## Integration Gotchas

Common mistakes when Architecture GSD connects its components.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| CONTEXT.md → all agents | Every agent gets full CONTEXT.md regardless of need | Only inject CONTEXT.md sections relevant to agent's role; context-engineer designs injection strategy per agent |
| arch-executor → arch-verifier | arch-verifier reads all executor outputs; executor waits for verifier | arch-verifier reads PLAN.md must_haves, not executor chat; structured return (passed/gaps_found/human_needed) drives routing |
| arch-checker → arch-planner | Checker reports pass/fail prose; planner tries to read it | Structured return with specific gap list enables planner to produce targeted gap-closure plans |
| YAML schemas → markdown prose | Schemas and prose drift as docs evolve | Schemas are the source of truth; prose references schemas by canonical name; prose is generated from schemas, not maintained separately |
| STATE.md ← multiple agents | Two agents in the same wave both write STATE.md | STATE.md writes are orchestrator-only; agents write SUMMARY.md; orchestrator merges into STATE.md after wave completion |
| discuss-system → CONTEXT.md | discuss-system produces long conversation transcript as "context" | discuss-system produces structured CONTEXT.md with explicit schema: domain, actors, non-goals, constraints, scale (no prose dumps) |
| arch-integrator → Final Package | arch-integrator reads everything at once | arch-integrator reads phase digests first, fetches specific artifacts on demand; reports gaps as structured list for human review |

---

## Performance Traps

Patterns that work for small designs but fail as design complexity grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All agents read all artifacts before starting | Works for 2-phase designs; adds latency for 5+ phases | Phase-boundary digests; file injection contracts per agent | When accumulated artifacts exceed ~20K tokens (approx. 3-4 phases of a complex system) |
| arch-verifier does full consistency check each phase | Works for Phase 1-2; time-consuming for Phase 4-5 | Incremental verification: check only artifacts produced in current phase plus their cross-references | When phase artifact count exceeds 10 files |
| Revision loop runs 3 iterations for every phase | Appropriate for complex phases; wasteful for simple phases | Allow 1-iteration fast-pass: if phase passes on first attempt, don't retry | When running 10+ phases |
| Schema YAML validated line-by-line | Works for small schemas; slow for large | Parse YAML as structured object; validate against schema definition | When schemas exceed 500 fields |
| arch-checker reads full plan including all background context | Works for simple plans | arch-checker reads plan frontmatter + must_haves only; fetches context on demand | When plans exceed 200 lines of context |

---

## Security Mistakes

Domain-specific issues (Architecture GSD processes potentially sensitive system designs).

| Mistake | Risk | Prevention |
|---------|------|------------|
| Architecture documents stored in world-readable locations | Competitive intelligence leaked; security architecture exposed | Design output directory structure with access controls; note this in system setup docs |
| System intent description stored verbatim in CONTEXT.md without sanitization | Prompt injection if CONTEXT.md is later injected into agent prompts | CONTEXT.md is structured (not free-form prose); discuss-system extracts structured fields, not raw user text |
| arch-executor writes files outside designated output directory | Malicious or confused agent overwrites system files | arch-executor's file write scope must be restricted to the design output directory; Bash tool scoped appropriately |
| Web research by arch-researcher returns malicious content | Prompt injection via web content | arch-researcher outputs go to RESEARCH.md with a clear "external content" prefix; arch-planner must not directly execute RESEARCH.md content as instructions |

---

## UX Pitfalls

User experience issues for the human architect using Architecture GSD.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| System runs for 20 minutes, produces error, shows no intermediate output | Architect has no idea if system is running or stuck; can't course-correct | PROGRESS.md updated after each agent completes; human checkpoints at phase boundaries show what was decided |
| Error messages reference internal agent names and file paths | "arch-verifier found gaps in PLAN-02-03.yaml" is meaningless | Error messages translate to human terms: "Phase 2 (Event Schema Design) has an incomplete failure mode for the UserService agent" |
| System asks clarifying questions one at a time | 15 back-and-forth exchanges to clarify system intent | discuss-system does comprehensive upfront clarification, identifies all ambiguities, asks everything at once |
| Architecture package delivered as 15 separate files with no navigation | Human can't find the right file to review | Package includes MANIFEST.md: index of all documents with one-line descriptions and reading order |
| Gap-closure runs silently update documents without human awareness | Human reviews final docs that differ substantially from Phase 1 review | Human checkpoint required before gap-closure begins; summary of what's changing and why |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Agent contracts:** Check for failure modes section with specific failure cases — "handles errors gracefully" is not a failure mode
- [ ] **Event schemas:** Verify every field has an explicit type annotation — untyped YAML passes schema existence check but isn't implementable
- [ ] **Orchestration design:** Trace at least one complete end-to-end flow through the system — a list of agents is not an orchestration design
- [ ] **Failure modes document:** Verify each failure mode has a recovery action, not just a description — "network timeout" with no recovery strategy is incomplete
- [ ] **Agent contracts:** Cross-check every event in the `emits` list against EVENTS.md canonical registry — hallucinated event names pass prose verification
- [ ] **CONTEXT.md:** Verify non-goals are explicit — absence of non-goals means the system is implicitly unbounded
- [ ] **Verification strategy:** Check each success criterion has a concrete verification method, not just "will be tested" — unverifiable criteria are aspirational, not architectural
- [ ] **Cross-references:** Check that document A references document B AND document B references document A where reciprocal reference is expected — one-way references miss integration gaps
- [ ] **STATE.md:** Verify deferred items are explicitly listed — a STATE.md with no deferrals probably has undiscovered deferrals
- [ ] **Scope:** Count actors in final architecture vs. actors in CONTEXT.md — unexplained new actors indicate scope creep

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Goal drift discovered at arch-integrator stage | HIGH | Identify which phase introduced drift; rerun from that phase with CONTEXT.md explicitly locked and quoted in each phase prompt |
| Verbosity compensation: entire phase produces hollow docs | MEDIUM | arch-executor reruns with concrete templates showing exactly what a complete answer looks like; add examples to all required_sections specs |
| Groupthink: arch-checker approved flawed plans | MEDIUM | Rerun arch-checker with adversarial framing; if it still passes, rerun arch-verifier with explicit "find 3 things that are wrong or missing" prompt |
| Context overflow: arch-integrator produces incoherent final report | MEDIUM | Create phase digests for all completed phases; rerun arch-integrator with digests only; fetch specific artifacts on demand |
| Regex verification false positives creating loop | LOW | Switch to schema-based verification for the failing cross-reference; add canonical name to YAML registry; rerun verifier |
| Self-design divergence: gap-closure not converging | MEDIUM | Declare "convergence threshold reached"; request human review with specific open questions listed in DEFERRED.md |
| Scope creep discovered in Phase 3 | HIGH | STOP execution; have discuss-system re-clarify with human; update CONTEXT.md with explicit scope decisions; restart from Phase 1 |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Goal drift | Phase 1 (discuss-system, CONTEXT.md schema) + every phase (Goal Fidelity Check in SUMMARY) | arch-integrator cross-checks all phase outputs against CONTEXT.md |
| Verbosity compensation | Phase scaffold (agent prompt design with required_section templates) | arch-checker scans for stub phrases; arch-verifier checks content quality |
| Groupthink | Agent design phase (adversarial framing for checker/verifier) | Verification reports must include evidence, not just verdicts |
| Context window overflow | Phase scaffold (file injection strategy, digest protocol) | Monitor aggregate token counts; check phase-boundary digest exists |
| Fragile regex verification | Schema design phase (canonical naming, YAML registry) | Run verification on a known-correct test case to confirm true positive rate |
| Self-design divergence | Self-design workflow design (convergence criteria, CONTEXT.md lock) | Hard phase cap; DEFERRED.md tracks non-converged items |
| Scope creep | Phase 1 (explicit non-goals in CONTEXT.md); every phase (scope boundary check in arch-checker) | Actor count in final package matches CONTEXT.md actor catalog |
| Hollow agent contracts | Phase scaffold (required_section templates with concrete examples) | Level 2 verification includes content quality check, not just line count |
| Missing failure modes | failure-analyst agent design (mandatory for every agent contract) | arch-integrator checks every agent contract for failure modes section with minimum N entries |
| Circular agent dependencies | arch-planner wave assignment | arch-integrator checks for cycles in agent dependency graph |

---

## Sources

- **MAST Failure Taxonomy:** Cemri et al., "Why Do Multi-Agent LLM Systems Fail?" (arxiv.org/abs/2503.13657) — 14 failure modes, 41-86.7% failure rates across 7 MAS frameworks. HIGH confidence.
- **Context Rot:** Redis research blog (redis.io/blog/context-rot/), citing 2023 Stanford study — 15-20 point accuracy drop from positional effects alone. HIGH confidence.
- **Sycophancy in Multi-Agent Debate:** "Talk Isn't Always Cheap" (arxiv.org/pdf/2509.05396); CONSENSAGENT (aclanthology.org/2025.findings-acl.1141) — sycophancy propagates misinformation, overrides correct minorities. MEDIUM confidence.
- **Verbosity Compensation:** "Verbosity ≠ Veracity" ACL 2025 (aclanthology.org/2025.uncertainlp-main.14) — GPT-4 VC frequency 50.40%, 27.61% performance gap. HIGH confidence.
- **Agentic Failure Costs:** O'Reilly Radar "Hidden Cost of Agentic Failure" — 10-agent pipeline at 98% accuracy degrades to 81.7% system accuracy. MEDIUM confidence.
- **Infinite Loop Prevention:** "The 4/δ Bound" (arxiv.org/pdf/2512.02080) — first formal convergence proof for LLM-verifier systems; Google ADK loop agent documentation. MEDIUM confidence.
- **Schema Enforcement:** GitHub Engineering Blog "Multi-agent workflows often fail" — unstructured data exchange, ambiguous intent, loose interface enforcement as top failure modes. MEDIUM confidence.
- **Multi-agent Failure Statistics:** Galileo "Why do Multi-Agent LLM Systems Fail" — coordination failures account for 36.94% of all breakdowns. MEDIUM confidence (WebSearch only, verify before citing).
- **Self-Referential Systems:** Gödel Agent (arxiv.org/abs/2410.04444) — self-referential agents improve without convergence without stopping criteria. MEDIUM confidence.
- **Project context:** ARCHITECT-VISION.md, GSD-REPURPOSING-VISION.md, .planning/PROJECT.md — direct design decisions and constraints. HIGH confidence (first-party sources).

---

## Severity Summary

| Pitfall | Severity | Blocker? |
|---------|----------|----------|
| Goal drift through agent handoff | CRITICAL | Yes — produces an architecture for a different system than intended |
| Verbosity compensation / hollow specs | CRITICAL | Yes — unimplementable output defeats the product's purpose |
| Agent groupthink / verification that doesn't catch errors | CRITICAL | Yes — verification pipeline provides false confidence |
| Context window overflow | HIGH | Yes for complex systems; manageable for simple designs |
| Regex-based cross-reference fragility | HIGH | Yes — causes false loops and false confidence |
| Self-design fixed-point failure | MEDIUM | No — validation only, not blocking for normal use |

---
*Pitfalls research for: Architecture GSD — multi-agent system producing verified agentic architecture design packages*
*Researched: 2026-02-27*
