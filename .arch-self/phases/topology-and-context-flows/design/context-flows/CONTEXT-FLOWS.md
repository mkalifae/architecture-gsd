---
name: Architecture GSD Context Flows
phase: topology-and-context-flows
document_type: context-flows
version: "1.0"
---

# Architecture GSD — Context Flows

## Per-Agent Context Budget

| Agent | Model | Reads | Writes | Passes Downstream | Context Risk |
|-------|-------|-------|--------|------------------|--------------|
| discuss-system | opus | system description (human input) | .arch/CONTEXT.md | CONTEXT.md path | LOW — single input |
| context-engineer | sonnet | CONTEXT.md, RESEARCH.md, ROADMAP.md | CONTEXT.md (edit) | refined CONTEXT.md | LOW — 3 short files |
| arch-researcher | sonnet | CONTEXT.md, STATE.md, WebFetch results | RESEARCH.md | RESEARCH.md path | MEDIUM — WebFetch volume varies |
| arch-roadmapper | sonnet | CONTEXT.md, RESEARCH.md, STATE.md | ROADMAP.md | ROADMAP.md path | LOW — 3 structured files |
| arch-planner | sonnet | ROADMAP.md, CONTEXT.md, RESEARCH.md, STATE.md, references/ (2 files) | PLAN.md files | PLAN.md paths | MEDIUM — 5-7 files |
| arch-checker | opus | all PLAN.md files (up to 5), CONTEXT.md, ROADMAP.md, references/ | none | structured return | HIGH — up to 7 files |
| arch-executor | sonnet | PLAN.md (1 task), templates/ (1-2), references/ (2), CONTEXT.md, RESEARCH.md, [events.yaml] | 1 design doc | design doc path | LOW — 6-7 files max |
| schema-designer | sonnet | PLAN.md (1 task), CONTEXT.md, RESEARCH.md, templates/event-schema.yaml | events.yaml | events.yaml path | LOW — 4 files |
| arch-verifier | sonnet | all design docs (up to 20), STATE.md, CONTEXT.md | VERIFICATION.md | VERIFICATION.md path | HIGH — up to 22 files |
| arch-integrator | haiku | VERIFICATION.md, all DIGEST.md files, all design docs | INTEGRATION-REPORT.md | report path | HIGH — digest-first mitigates |
| failure-analyst | sonnet | PLAN.md (1 task), agent contract (1), templates/failure-modes.md, RESEARCH.md | failure catalog | catalog path | LOW — 4 files |

## Context-Starved Agents

**context-engineer** — reads only 3 files (CONTEXT.md, RESEARCH.md, ROADMAP.md). This is
intentional: context-engineer's work is normalization and append-only refinement. It does
not need deep system understanding, only enough context to apply formatting and consistency rules.
Risk: may miss implied constraints if RESEARCH.md is long and context budget pressures truncation.

**failure-analyst** — reads only 4 files per catalog invocation. However, it is spawned once
per agent (11 times), so it operates in a clean context window each time. The per-agent focus
is a feature: failure modes are more specific when the analyst examines one agent at a time.

## Context-Heavy Agents

**arch-checker** — reads up to 5 PLAN.md files simultaneously plus 3 reference files.
For large systems (11 agents, 4+ PLAN.md files per phase), arch-checker approaches 40-50%
context utilization. Risk: if all 5 PLAN.md files have long action sections, context pressure
may reduce adversarial check quality on later dimensions (D6, D7, D8). Mitigation: orchestrator
passes plan paths, not content — arch-checker reads files on demand within its context window.

**arch-verifier** — reads all design documents in a phase (up to 20 for a standard 5-phase
run). Batching Level 1-2 checks in groups of 10 documents mitigates context pressure. Level 3-4
graph checks are single-invocation commands (arch-tools.js handles the file reading). Risk:
for very large systems (20+ design documents), Level 2 content depth evaluation may degrade
for later documents. Mitigation: Level 2 quality degradation is caught by Level 3 cross-reference
gaps, which provide a second quality signal.

**arch-integrator** — reads all DIGEST.md files plus all design documents across all phases.
Digest-first pattern (read DIGEST.md before full documents) keeps initial context utilization
to ~10 lines per phase (50 lines × N phases). Full document reads happen after digest orientation
confirms what to examine. Risk: with 5 phases × 4 documents per phase, arch-integrator reads
20+ full documents. The haiku model's context window is smaller, making digest-first critical.

## Information Bottleneck Analysis

**Critical bottleneck: CONTEXT.md** — Every single agent in the pipeline reads .arch/CONTEXT.md.
It is the single point of truth for the entire design run. Errors introduced during discuss-system
intake (missing constraints, incorrect actor count) propagate to all 11 agents. Mitigation:
validate-context is run after every CONTEXT.md write; context-engineer provides a second
refinement pass; arch-verifier Level 4 checks locked-decision compliance.

**Secondary bottleneck: STATE.md** — Multiple agents read STATE.md for accumulated decisions.
If STATE.md becomes stale (not updated after plan completion), agents make decisions without
current context. Mitigation: execute-phase orchestrator updates STATE.md after every plan
completion (max 100 lines per decision [04-05]).

**Design bottleneck: events.yaml** — All agent contracts reference events.yaml for cross-references.
If events.yaml is produced late or with missing events, agent contracts must either reference
event names speculatively or be produced without cross-references (gaps_found status). Mitigation:
schema-designer always runs in Wave 1 of any phase that includes event schema production.

```yaml
canonical:
  context_flows:
    agents:
      - name: discuss-system
        reads: [system-description-input, .arch/CONTEXT.md]
        writes: [.arch/CONTEXT.md]
        passes: [.arch/CONTEXT.md path]
        context_risk: low
      - name: context-engineer
        reads: [.arch/CONTEXT.md, .arch/RESEARCH.md, .arch/ROADMAP.md]
        writes: [.arch/CONTEXT.md]
        passes: [refined .arch/CONTEXT.md]
        context_risk: low
      - name: arch-researcher
        reads: [.arch/CONTEXT.md, .arch/STATE.md, WebFetch responses]
        writes: [.arch/RESEARCH.md]
        passes: [.arch/RESEARCH.md path]
        context_risk: medium
      - name: arch-roadmapper
        reads: [.arch/CONTEXT.md, .arch/RESEARCH.md, .arch/STATE.md]
        writes: [.arch/ROADMAP.md]
        passes: [.arch/ROADMAP.md path]
        context_risk: low
      - name: arch-planner
        reads: [.arch/ROADMAP.md, .arch/CONTEXT.md, .arch/RESEARCH.md, .arch/STATE.md, references/agent-spec-format.md, references/verification-patterns.md]
        writes: [PLAN.md files]
        passes: [PLAN.md paths]
        context_risk: medium
      - name: arch-checker
        reads: [PLAN.md files (up to 5), .arch/CONTEXT.md, .arch/ROADMAP.md, references/agent-spec-format.md]
        writes: []
        passes: [structured JSON return]
        context_risk: high
      - name: schema-designer
        reads: [PLAN.md task, .arch/CONTEXT.md, .arch/RESEARCH.md, templates/event-schema.yaml]
        writes: [design/events/events.yaml]
        passes: [events.yaml path]
        context_risk: low
      - name: arch-executor
        reads: [PLAN.md task, templates/agent-spec.md, references/agent-spec-format.md, .arch/CONTEXT.md, .arch/RESEARCH.md, design/events/events.yaml]
        writes: [design/{type}/{name}.md]
        passes: [design doc path]
        context_risk: low
      - name: failure-analyst
        reads: [PLAN.md task, design/agents/{name}.md, templates/failure-modes.md, .arch/RESEARCH.md]
        writes: [design/failure-modes/{name}-failures.md]
        passes: [catalog path]
        context_risk: low
      - name: arch-verifier
        reads: [design/ (all docs, batched 10 at a time), .arch/STATE.md, .arch/CONTEXT.md, references/verification-patterns.md]
        writes: [VERIFICATION.md]
        passes: [VERIFICATION.md path]
        context_risk: high
      - name: arch-integrator
        reads: [VERIFICATION.md, design/digests/*.md, design/ (all docs after digest), .arch/CONTEXT.md]
        writes: [INTEGRATION-REPORT.md]
        passes: [INTEGRATION-REPORT.md path]
        context_risk: high (digest-first mitigates)
```
