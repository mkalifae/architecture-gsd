---
Researched: 2026-03-02
Domain: Architecture GSD — Multi-Agent Architecture Design System
Confidence: HIGH
---

# Architecture GSD — Research Report

## Summary

Architecture GSD is a multi-agent design pipeline that accepts a system description and produces a complete, internally consistent, cross-referenced architecture package. The domain is "AI-native architecture design tooling" — a category that combines multi-agent orchestration, document-centric knowledge management, and adversarial verification. The system operates as a Claude Code slash-command plugin, with all agents executed as Task() calls inside a 200K-context Claude environment. This is a meta-system: it designs other systems, which makes internal consistency a first-class requirement (the output must be coherent enough to reconstruct the tool itself).

The primary recommendation is disk-as-shared-memory: all inter-agent communication via Markdown and YAML files rather than in-memory state. This is validated by the actual system: STATE.md, CONTEXT.md, RESEARCH.md, ROADMAP.md are the only shared state surfaces. The orchestrators read these files and pass paths (not content) to subagents to maintain ~15% context utilization per orchestrator.

Overall confidence is HIGH: this research is derived from direct inspection of the live system (agents/, workflows/, bin/, templates/, references/) combined with validated execution results from four prior architecture runs. All findings are drawn from authoritative source code and observed behavior.

## Standard Stack

| Component | Recommended Option | Version | Purpose | Why This Choice |
|-----------|-------------------|---------|---------|-----------------|
| Agent execution | Claude Task() calls | API v1 | Spawn subagents with independent context windows | Zero infrastructure overhead; native to Claude Code platform |
| Orchestration | Markdown workflow files | N/A | Define multi-step pipelines with branching logic | Human-readable; no DSL required; compatible with Claude Code slash commands |
| Shared state | Disk files (.md, .yaml) | N/A | Pass state between agents across context resets | Survives context resets; queryable by any agent without coordination |
| Verification tooling | arch-tools.js (Node.js) | N/A | 4-level verification, stub detection, name validation, YAML graph traversal | Zero npm dependencies for core; js-yaml for YAML parsing only |
| Schema format | YAML with typed payloads | N/A | Event schemas, canonical blocks in design docs | Machine-checkable; supports programmatic cross-reference verification |
| Document format | Markdown + embedded YAML | N/A | Dual-format output for human readability and machine checking | Prose for humans; YAML canonical blocks for arch-tools.js Level 3-4 verification |
| Model profiles | Opus (complex reasoning), Sonnet (standard), Haiku (structural tasks) | Claude API | Right-size model cost per task complexity | Context window efficiency; cost optimization |

## Architecture Patterns

1. **Disk-as-Shared-Memory** — All inter-agent communication occurs via files on disk rather than in-memory channels. Each agent reads STATE.md, CONTEXT.md, and relevant design files at startup. This enables agents to resume after context resets without losing pipeline state. Reference: demonstrated in STATE.md architecture (max 100 lines, mandatory pre-read for all agents). Confidence: HIGH.

2. **Adversarial Separation of Concerns** — arch-checker reviews PLAN.md files (pre-execution), arch-verifier reviews design documents (post-execution). These roles must never overlap. Framing is deliberately adversarial: arch-checker asks "will this plan fail?" arch-verifier asks "is this document complete and consistent?" This prevents the same failure modes from slipping through both review stages. Reference: STATE.md decision [04-01]. Confidence: HIGH.

3. **Wave-Based Parallel Execution** — Plans are grouped by wave number in frontmatter. All same-wave plans are spawned simultaneously. Next wave waits for current wave completion. This is a form of barrier synchronization for design artifact dependencies. Reference: execute-phase.md orchestration pattern. Confidence: HIGH.

4. **Goal-Backward Plan Derivation** — arch-planner derives PLAN.md must_haves by starting from the phase goal (outcome statement) and working backward to observable truths, required artifact properties, and cross-document wiring. This ensures verification criteria are traceable to the design intent. Reference: arch-planner.md execution_flow Step 9. Confidence: HIGH.

5. **Bounded Revision Loops** — arch-planner/arch-checker iterate at most 3 times before escalating to human. arch-executor corrects stubs at most 2 times before returning gaps_found. Convergence is enforced by iteration caps, not semantic guarantees. Reference: arch-planner constraints + arch-executor FAILURE-03. Confidence: HIGH.

6. **Phase-Boundary Digest Pattern** — DIGEST.md (max 50 lines) is written at each phase boundary. arch-integrator reads digests first before full artifacts to maintain context window efficiency during cross-phase checks. Reference: STATE.md decision [04-04] + [04-05]. Confidence: HIGH.

7. **Context Window Orchestration** — Orchestrators pass file paths to subagents, not file content. Each subagent gets a fresh 200K context window. Orchestrators maintain ~15% context utilization. Reference: STATE.md decision [03-06]. Confidence: HIGH.

8. **Dual-Format Documents** — Every design document contains both markdown prose (human readability) and embedded YAML canonical blocks (machine-checkable cross-references). arch-tools.js Level 3-4 verification operates on YAML blocks; human review operates on prose. Reference: CONTEXT.md locked-decisions. Confidence: HIGH.

## Don't Hand-Roll

| Problem Domain | Don't Build | Use Instead | Why |
|---------------|------------|------------|-----|
| YAML parsing | Custom frontmatter parser | js-yaml for structural YAML | js-yaml is a proven library; frontmatter regex is acceptable for simple frontmatter-only extraction |
| Graph traversal | Custom DFS for cycle detection | In-house DFS in arch-tools.js Level 4 | DFS cycle detection is 50 lines; no library needed for this scale |
| Agent routing | Custom routing table | Claude Code frontmatter (name, model, tools, color) | Routing is handled by the platform; model profile selection via frontmatter |
| State management | In-memory session state | File-based STATE.md | Context resets kill in-memory state; disk is the only reliable persistence |
| Parallel execution | Thread pools / worker queues | Claude Task() parallel spawning | Task() handles concurrency natively; wave-based grouping handles ordering |
| Anti-pattern detection | ML-based code analysis | Regexp-based stub/pattern scanning in arch-tools.js | Pattern-based scanning is deterministic, zero false-negatives for known patterns |

## Common Pitfalls

1. **Stub Propagation** — Writing documents with placeholder text ("TBD", "handles gracefully", "as needed") that pass Level 1-2 superficial checks but fail later. Why: stub phrases are easy to write under time pressure. How to avoid: run detect-stubs after every write, enforce max 2 correction iterations before gaps_found. Warning signs: Level 2 stub checks finding "stubs_found > 0" after document is written.

2. **Agent Spec Format Drift** — Using Markdown headers (## Role) instead of XML tags (<role>) for agent spec sections. This breaks Level 2 verification which checks for XML tags per STATE.md decision [03-01]. How to avoid: templates/agent-spec.md uses XML tags; arch-executor must follow the template. Warning signs: Level 2 failures on all agent specs in a phase.

3. **Context Overflow in Orchestrators** — Orchestrators reading full document content instead of passing paths. At 11 agents, this exhausts orchestrator context in Phase 3. How to avoid: pass paths not content; subagents read their own inputs. Warning signs: orchestrator responses degrading as plan count increases.

4. **Silent Gap Omission** — Verification gaps being marked as false positives without documentation. Why: false positives exist (Level 3 agent_referenced for target system agents), but undocumented dismissals make the verification report untrustworthy. How to avoid: document all false positives in VERIFICATION.md with specific rationale. Warning signs: VERIFICATION.md status: "passed" with fewer findings than documents checked.

5. **Wave Assignment Violations** — Assigning topology tasks to Wave 1 (before agent contracts). Why: topology needs agent names; agent contracts must precede topology per ARCHITECTURE_DEPENDENCY_RULES. How to avoid: apply ARCHITECTURE_DEPENDENCY_RULES consistently; never override without documenting the locked-decision exception. Warning signs: topology documents with undefined agent references.

6. **State.md Staleness** — Not updating STATE.md after each plan completion. Why: agents pre-read STATE.md to orient; stale state causes wrong decisions. How to avoid: orchestrator updates STATE.md after every plan completes (max 100 lines). Warning signs: agents making decisions that contradict accumulated decisions list.

## Code Examples

**Frontmatter extraction (arch-tools.js pattern):**
```javascript
// Source: bin/arch-tools.js frontmatter get command
// Pattern: regex-based YAML frontmatter extraction without js-yaml dependency
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}
```
HIGH confidence — derived from actual arch-tools.js source.

**Stub detection pattern (arch-tools.js):**
```javascript
// Source: bin/arch-tools.js detect-stubs command
// Pattern: literal phrase matching for known stub indicators
const STUB_PATTERNS = [
  /\bTBD\b/i, /to be determined/i, /handles gracefully/i, /as needed/i,
  /will be (added|defined|specified) later/i, /placeholder/i, /coming soon/i,
  /\bTODO\b/, /\bFIXME\b/, /details to follow/i, /specify later/i
];
```
HIGH confidence — derived from actual arch-tools.js source.

**Wave execution (execute-phase.md pattern):**
```markdown
// Pattern: wave-based parallel execution
For each wave in sorted order:
  plans_in_wave = plans where frontmatter.wave == current_wave
  Spawn all plans_in_wave as parallel Task() calls
  Await all Task() results before proceeding to next wave
```
HIGH confidence — derived from execute-phase.md orchestrator.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on Design |
|-------------|-----------------|--------------|-----------------|
| Single monolithic architecture document | Multi-document package with cross-references | Architecture GSD v1 design | Enables programmatic verification and targeted updates |
| Prose-only specifications | Dual-format (markdown + YAML canonical blocks) | Phase 1 decision | Machine-checkable verification without semantic parsing |
| Human-reviewed architecture | 4-level automated verification stack | Phase 4 implementation | Structural correctness guaranteed before human review |
| Sequential agent execution | Wave-based parallel execution | Phase 3 planning | Reduces design time proportional to wave depth, not agent count |
| In-context agent communication | Disk-as-shared-memory | Pre-Phase 1 decision | Context-reset-proof state management |

## Open Questions

1. **What is current state:** EVENT SCHEMA LEVEL 4 PATH DISCOVERY. What is unclear: arch-tools.js verify level4 looks for design/events.yaml, but actual output path is design/events/events.yaml. This causes Level 4 event checks to be skipped (FAILURE-04 in arch-verifier). Recommendation: Update arch-tools.js verify level4 to check both design/events.yaml and design/events/events.yaml, or document the expected path in verification-patterns.md.

2. **What is current state:** AGENT COUNT SCALABILITY. What is unclear: FAILURE-03 in arch-planner handles up to 15 tasks, but an 11-agent system in the agent-contracts phase produces 11 tasks, which is within bounds. Recommendation: For systems with more than 15 agents, apply domain-based grouping (3 tasks per plan = 5 plans max).

## Sources

### Primary (HIGH confidence)

- agents/arch-planner.md — Direct inspection of arch-planner execution_flow, constraints, failure_modes
- agents/arch-executor.md — Direct inspection of arch-executor execution_flow, deviation rules
- agents/arch-verifier.md — Direct inspection of verification levels, structured_returns
- agents/arch-researcher.md — Direct inspection of research methodology
- bin/arch-tools.js — Direct inspection of stub patterns, frontmatter regex, Level 1-4 implementations
- .planning/STATE.md — Accumulated decisions (pre-Phase 1 through 05-02)
- .arch/CONTEXT.md — Target system description (Code Review Automation Pipeline)
- .arch/phases/verification-and-integration/design/VERIFICATION.md — Verification run results

### Secondary (MEDIUM confidence)

- workflows/execute-phase.md — Orchestrator pattern documentation
- workflows/verify-phase.md — Verification pipeline documentation
- references/verification-patterns.md — 4-level specification

### Metadata

- HIGH: 8 sources
- MEDIUM: 3 sources
- LOW: 0 sources
- Research date: 2026-03-02
- Validity window: 12 months for architectural pattern recommendations; 3 months for tool-specific recommendations
